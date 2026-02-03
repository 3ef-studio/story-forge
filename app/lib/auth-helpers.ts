import { createHash, randomUUID } from 'crypto';

// ============================================================================
// Request ID & Client Metadata
// ============================================================================

/** Generate a unique request ID for tracing */
export function getRequestId(): string {
  return randomUUID();
}

/** Client metadata extracted from request */
export interface ClientMeta {
  userAgent: string;
  userAgentShort: string;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  ipHash: string | null;
}

/** Extract client metadata from request for logging */
export function getClientMeta(request: Request): ClientMeta {
  const userAgent = request.headers.get('user-agent') ?? '';
  const userAgentLower = userAgent.toLowerCase();

  // Detect mobile
  const isMobile = /mobile|android|iphone|ipad|ipod|webos|blackberry|opera mini|iemobile/i.test(userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  const isAndroid = /android/i.test(userAgent);

  // Short UA for logging (first 50 chars, sanitized)
  const userAgentShort = userAgent.slice(0, 50).replace(/[^\w\s./()-]/g, '');

  // Hash IP for privacy-safe logging
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() ?? realIp ?? null;
  const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 12) : null;

  return {
    userAgent,
    userAgentShort,
    isMobile,
    isIOS,
    isAndroid,
    ipHash,
  };
}

// ============================================================================
// Email & Password Normalization
// ============================================================================

/** Normalize email: trim whitespace, lowercase */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Detect if email had normalization applied */
export function emailNormalizationFlags(rawEmail: string): {
  hadWhitespace: boolean;
  hadUppercase: boolean;
} {
  const trimmed = rawEmail.trim();
  return {
    hadWhitespace: rawEmail !== trimmed,
    hadUppercase: trimmed !== trimmed.toLowerCase(),
  };
}

/**
 * Normalize password with Unicode NFKC normalization.
 * Does NOT trim - whitespace in passwords is intentional.
 * Returns normalized password and flags for logging.
 */
export function normalizePassword(password: string): {
  normalized: string;
  hasLeadingWhitespace: boolean;
  hasTrailingWhitespace: boolean;
} {
  // Apply Unicode NFKC normalization (handles composed characters)
  const normalized = password.normalize('NFKC');

  return {
    normalized,
    hasLeadingWhitespace: password.length > 0 && password[0] !== password.trimStart()[0],
    hasTrailingWhitespace: password.length > 0 && password[password.length - 1] !== password.trimEnd()[password.trimEnd().length - 1],
  };
}

// ============================================================================
// Privacy-Safe Logging Helpers
// ============================================================================

/** Mask email for logging: keep first 2 chars and domain */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  const maskedLocal = local.length <= 2 ? '*'.repeat(local.length) : local.slice(0, 2) + '*'.repeat(Math.min(local.length - 2, 5));
  return `${maskedLocal}@${domain}`;
}

/** Hash email for logging (first 12 chars of sha256) */
export function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 12);
}

// ============================================================================
// Rate Limiting (In-Memory)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limit store (cleared on server restart)
// Key: ipHash or fallback identifier
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanupRateLimitStore() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  maxRequests: number;  // Max requests per window
  windowMs: number;     // Window duration in ms
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (typically ipHash).
 * Returns whether request is allowed and remaining quota.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupRateLimitStore();

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No entry or expired - create new window
  if (!entry || entry.resetAt <= now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Within window - check limit
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Default rate limit configs
export const AUTH_RATE_LIMITS = {
  login: { maxRequests: 10, windowMs: 60_000 },   // 10 per minute
  signup: { maxRequests: 5, windowMs: 60_000 },   // 5 per minute
} as const;

// ============================================================================
// Structured Logging
// ============================================================================

/** Reason codes for auth failures */
export type AuthReasonCode =
  // Validation
  | 'INVALID_JSON'
  | 'MISSING_EMAIL'
  | 'MISSING_PASSWORD'
  | 'INVALID_EMAIL_FORMAT'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_HAS_EDGE_WHITESPACE'
  // Signup
  | 'EMAIL_TAKEN'
  | 'DB_ERROR_USER_CREATE'
  // Login
  | 'USER_NOT_FOUND'
  | 'PASSWORD_MISMATCH'
  | 'DB_ERROR_USER_LOOKUP'
  // Rate limiting
  | 'RATE_LIMITED'
  // Success
  | 'OK';

export interface AuthLogEntry {
  reqId: string;
  route: 'login' | 'signup';
  method: string;
  clientMeta: {
    uaShort: string;
    isMobile: boolean;
    isIOS?: boolean;
    ipHash: string | null;
  };
  ts: string;
  reasonCode?: AuthReasonCode;
  userId?: string;
  emailHash?: string;
  emailFlags?: {
    hadWhitespace?: boolean;
    hadUppercase?: boolean;
  };
  passwordFlags?: {
    hasLeadingWhitespace?: boolean;
    hasTrailingWhitespace?: boolean;
  };
  fieldsPresent?: {
    email: boolean;
    password: boolean;
  };
  durationMs?: number;
}

/** Log an auth event with structured data */
export function logAuthEvent(entry: AuthLogEntry): void {
  // Build log line with key=value format for easy parsing
  const parts: string[] = [
    `[AUTH]`,
    `reqId=${entry.reqId}`,
    `route=${entry.route}`,
    `reason=${entry.reasonCode ?? 'UNKNOWN'}`,
  ];

  if (entry.userId) {
    parts.push(`userId=${entry.userId}`);
  }

  if (entry.emailHash) {
    parts.push(`emailHash=${entry.emailHash}`);
  }

  parts.push(`mobile=${entry.clientMeta.isMobile}`);

  if (entry.clientMeta.isIOS) {
    parts.push(`iOS=true`);
  }

  if (entry.clientMeta.ipHash) {
    parts.push(`ipHash=${entry.clientMeta.ipHash}`);
  }

  if (entry.emailFlags?.hadWhitespace) {
    parts.push(`emailWhitespace=true`);
  }

  if (entry.emailFlags?.hadUppercase) {
    parts.push(`emailUppercase=true`);
  }

  if (entry.passwordFlags?.hasLeadingWhitespace || entry.passwordFlags?.hasTrailingWhitespace) {
    parts.push(`passwordEdgeWS=true`);
  }

  if (entry.durationMs !== undefined) {
    parts.push(`durationMs=${entry.durationMs}`);
  }

  parts.push(`ts=${entry.ts}`);
  parts.push(`ua="${entry.clientMeta.uaShort}"`);

  // Use appropriate log level based on reason
  const logLine = parts.join(' ');

  if (entry.reasonCode === 'OK') {
    console.log(logLine);
  } else if (entry.reasonCode === 'RATE_LIMITED') {
    console.warn(logLine);
  } else {
    // Validation errors and failures
    console.log(logLine);
  }
}

// ============================================================================
// JSON Parsing Helper
// ============================================================================

export type ParseJsonResult<T> =
  | { success: true; data: T }
  | { success: false; error: 'INVALID_JSON' | 'CONTENT_TYPE_MISMATCH' };

/**
 * Safely parse JSON from request, handling mobile edge cases.
 * Returns typed result or error code.
 */
export async function parseJsonBody<T>(request: Request): Promise<ParseJsonResult<T>> {
  const contentType = request.headers.get('content-type') ?? '';

  // Accept various JSON content types (mobile sometimes sends odd headers)
  const isJsonContentType = contentType.includes('application/json') ||
    contentType.includes('text/json') ||
    contentType === '' ||  // Some mobile clients don't set content-type
    contentType.includes('text/plain');  // Some autofill tools

  if (!isJsonContentType && contentType !== '') {
    // Only reject if explicitly non-JSON (not empty)
    return { success: false, error: 'CONTENT_TYPE_MISMATCH' };
  }

  try {
    const data = await request.json() as T;
    return { success: true, data };
  } catch {
    return { success: false, error: 'INVALID_JSON' };
  }
}
