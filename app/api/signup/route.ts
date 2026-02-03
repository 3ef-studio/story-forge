import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/app/lib/db';
import {
  getRequestId,
  getClientMeta,
  normalizeEmail,
  emailNormalizationFlags,
  normalizePassword,
  hashEmail,
  checkRateLimit,
  AUTH_RATE_LIMITS,
  logAuthEvent,
  parseJsonBody,
  type AuthLogEntry,
  type AuthReasonCode,
} from '@/app/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SignupBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const reqId = getRequestId();
  const clientMeta = getClientMeta(request);
  const ts = new Date().toISOString();

  // Helper to build and log auth event
  const buildLogEntry = (
    reasonCode: AuthReasonCode,
    extra?: Partial<AuthLogEntry>
  ): AuthLogEntry => ({
    reqId,
    route: 'signup',
    method: 'POST',
    clientMeta: {
      uaShort: clientMeta.userAgentShort,
      isMobile: clientMeta.isMobile,
      isIOS: clientMeta.isIOS,
      ipHash: clientMeta.ipHash,
    },
    ts,
    reasonCode,
    durationMs: Date.now() - startTime,
    ...extra,
  });

  try {
    // Rate limiting
    const rateLimitKey = clientMeta.ipHash ?? 'unknown';
    const rateLimit = checkRateLimit(`signup:${rateLimitKey}`, AUTH_RATE_LIMITS.signup);

    if (!rateLimit.allowed) {
      logAuthEvent(buildLogEntry('RATE_LIMITED'));
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    // Parse JSON body with mobile-friendly handling
    const parseResult = await parseJsonBody<SignupBody>(request);

    if (!parseResult.success) {
      logAuthEvent(buildLogEntry(parseResult.error === 'INVALID_JSON' ? 'INVALID_JSON' : 'INVALID_JSON'));
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { email: rawEmail, password: rawPassword } = parseResult.data;

    // Check required fields
    const fieldsPresent = {
      email: typeof rawEmail === 'string' && rawEmail.length > 0,
      password: typeof rawPassword === 'string' && rawPassword.length > 0,
    };

    if (!fieldsPresent.email) {
      logAuthEvent(buildLogEntry('MISSING_EMAIL', { fieldsPresent }));
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!fieldsPresent.password) {
      logAuthEvent(buildLogEntry('MISSING_PASSWORD', { fieldsPresent }));
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const emailFlags = emailNormalizationFlags(rawEmail!);
    const email = normalizeEmail(rawEmail!);
    const emailHashVal = hashEmail(email);

    // Normalize password (NFKC, detect edge whitespace)
    const passwordResult = normalizePassword(rawPassword!);
    const password = passwordResult.normalized;

    // Log warning if password has edge whitespace (common mobile autofill issue)
    const passwordFlags = {
      hasLeadingWhitespace: passwordResult.hasLeadingWhitespace,
      hasTrailingWhitespace: passwordResult.hasTrailingWhitespace,
    };

    if (passwordFlags.hasLeadingWhitespace || passwordFlags.hasTrailingWhitespace) {
      // Log but don't reject - user may have intentional whitespace
      logAuthEvent(buildLogEntry('PASSWORD_HAS_EDGE_WHITESPACE', {
        emailHash: emailHashVal,
        emailFlags,
        passwordFlags,
      }));
      // Continue processing - this is just a warning log
    }

    // Validate password length
    if (password.length < 8) {
      logAuthEvent(buildLogEntry('PASSWORD_TOO_SHORT', {
        emailHash: emailHashVal,
        emailFlags,
      }));
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Validate email format (RFC 5322 simplified pattern)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
    if (!emailRegex.test(email)) {
      logAuthEvent(buildLogEntry('INVALID_EMAIL_FORMAT', {
        emailHash: emailHashVal,
        emailFlags,
      }));
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email },
      });
    } catch (dbError) {
      console.error('[AUTH] DB error checking existing user:', dbError);
      logAuthEvent(buildLogEntry('DB_ERROR_USER_CREATE', {
        emailHash: emailHashVal,
        emailFlags,
      }));
      return NextResponse.json(
        { error: 'An error occurred. Please try again.' },
        { status: 500 }
      );
    }

    if (existingUser) {
      logAuthEvent(buildLogEntry('EMAIL_TAKEN', {
        emailHash: emailHashVal,
        emailFlags,
      }));
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    // Create user atomically
    let user;
    try {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
        },
      });
    } catch (createError) {
      // Handle race condition where email was taken between check and create
      if (
        createError instanceof Error &&
        createError.message.includes('Unique constraint')
      ) {
        logAuthEvent(buildLogEntry('EMAIL_TAKEN', {
          emailHash: emailHashVal,
          emailFlags,
        }));
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        );
      }

      console.error('[AUTH] DB error creating user:', createError);
      logAuthEvent(buildLogEntry('DB_ERROR_USER_CREATE', {
        emailHash: emailHashVal,
        emailFlags,
      }));
      return NextResponse.json(
        { error: 'An error occurred. Please try again.' },
        { status: 500 }
      );
    }

    // Success - log with userId
    logAuthEvent(buildLogEntry('OK', {
      userId: user.id,
      emailHash: emailHashVal,
      emailFlags,
      passwordFlags: passwordFlags.hasLeadingWhitespace || passwordFlags.hasTrailingWhitespace
        ? passwordFlags
        : undefined,
    }));

    return NextResponse.json(
      { message: 'User created successfully', userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('[AUTH] Unexpected signup error:', error);
    logAuthEvent(buildLogEntry('DB_ERROR_USER_CREATE'));
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
