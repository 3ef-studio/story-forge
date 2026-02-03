import { NextRequest, NextResponse } from 'next/server';
import { handlers } from '@/app/lib/auth';
import {
  getClientMeta,
  getRequestId,
  checkRateLimit,
  AUTH_RATE_LIMITS,
  logAuthEvent,
} from '@/app/lib/auth-helpers';

/**
 * Wrap Auth.js POST handler with rate limiting for credentials signin.
 * Rate limiting only applies to the credentials callback action.
 */
async function wrappedPOST(request: NextRequest) {
  const action = request.nextUrl.pathname.split('/').pop();

  // Only rate limit the callback/credentials action (actual login attempt)
  if (action === 'callback' || request.nextUrl.searchParams.get('action') === 'callback') {
    const clientMeta = getClientMeta(request);
    const rateLimitKey = clientMeta.ipHash ?? 'unknown';
    const rateLimit = checkRateLimit(`login:${rateLimitKey}`, AUTH_RATE_LIMITS.login);

    if (!rateLimit.allowed) {
      const reqId = getRequestId();
      logAuthEvent({
        reqId,
        route: 'login',
        method: 'POST',
        clientMeta: {
          uaShort: clientMeta.userAgentShort,
          isMobile: clientMeta.isMobile,
          isIOS: clientMeta.isIOS,
          ipHash: clientMeta.ipHash,
        },
        ts: new Date().toISOString(),
        reasonCode: 'RATE_LIMITED',
      });

      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }
  }

  // Delegate to Auth.js handler
  return handlers.POST(request);
}

export const GET = handlers.GET;
export const POST = wrappedPOST;
