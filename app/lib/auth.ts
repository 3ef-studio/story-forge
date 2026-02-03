import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './db';
import {
  getRequestId,
  normalizeEmail,
  emailNormalizationFlags,
  normalizePassword,
  hashEmail,
  type AuthReasonCode,
} from './auth-helpers';

// Track the last authorize call for logging context
// (Auth.js doesn't pass Request to authorize, so we use this workaround)
let lastAuthorizeContext: {
  reqId: string;
  emailHash: string;
  emailFlags: { hadWhitespace: boolean; hadUppercase: boolean };
  passwordFlags: { hasLeadingWhitespace: boolean; hasTrailingWhitespace: boolean };
  reasonCode: AuthReasonCode;
  userId?: string;
} | null = null;

/** Log login auth event */
function logLoginEvent(
  reasonCode: AuthReasonCode,
  context: {
    reqId: string;
    emailHash?: string;
    emailFlags?: { hadWhitespace?: boolean; hadUppercase?: boolean };
    passwordFlags?: { hasLeadingWhitespace?: boolean; hasTrailingWhitespace?: boolean };
    userId?: string;
    characterId?: string;
  }
): void {
  const parts: string[] = [
    `[AUTH]`,
    `reqId=${context.reqId}`,
    `route=login`,
    `reason=${reasonCode}`,
  ];

  if (context.userId) {
    parts.push(`userId=${context.userId}`);
  }

  if (context.characterId) {
    parts.push(`characterId=${context.characterId}`);
  }

  if (context.emailHash) {
    parts.push(`emailHash=${context.emailHash}`);
  }

  if (context.emailFlags?.hadWhitespace) {
    parts.push(`emailWhitespace=true`);
  }

  if (context.emailFlags?.hadUppercase) {
    parts.push(`emailUppercase=true`);
  }

  if (context.passwordFlags?.hasLeadingWhitespace || context.passwordFlags?.hasTrailingWhitespace) {
    parts.push(`passwordEdgeWS=true`);
  }

  parts.push(`ts=${new Date().toISOString()}`);

  const logLine = parts.join(' ');

  if (reasonCode === 'OK') {
    console.log(logLine);
  } else {
    console.log(logLine);
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const reqId = getRequestId();

        // Validate credentials exist
        if (!credentials?.email || !credentials?.password) {
          const reasonCode = !credentials?.email ? 'MISSING_EMAIL' : 'MISSING_PASSWORD';
          logLoginEvent(reasonCode, { reqId });
          lastAuthorizeContext = null;
          return null;
        }

        const rawEmail = credentials.email as string;
        const rawPassword = credentials.password as string;

        // Normalize email
        const emailFlags = emailNormalizationFlags(rawEmail);
        const email = normalizeEmail(rawEmail);
        const emailHashVal = hashEmail(email);

        // Normalize password (NFKC)
        const passwordResult = normalizePassword(rawPassword);
        const password = passwordResult.normalized;
        const passwordFlags = {
          hasLeadingWhitespace: passwordResult.hasLeadingWhitespace,
          hasTrailingWhitespace: passwordResult.hasTrailingWhitespace,
        };

        // Log warning if password has edge whitespace
        if (passwordFlags.hasLeadingWhitespace || passwordFlags.hasTrailingWhitespace) {
          logLoginEvent('PASSWORD_HAS_EDGE_WHITESPACE', {
            reqId,
            emailHash: emailHashVal,
            emailFlags,
            passwordFlags,
          });
        }

        // Look up user
        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email },
            include: { character: true },
          });
        } catch (dbError) {
          console.error('[AUTH] DB error looking up user:', dbError);
          logLoginEvent('DB_ERROR_USER_LOOKUP', {
            reqId,
            emailHash: emailHashVal,
            emailFlags,
          });
          lastAuthorizeContext = {
            reqId,
            emailHash: emailHashVal,
            emailFlags,
            passwordFlags,
            reasonCode: 'DB_ERROR_USER_LOOKUP',
          };
          return null;
        }

        if (!user) {
          logLoginEvent('USER_NOT_FOUND', {
            reqId,
            emailHash: emailHashVal,
            emailFlags,
          });
          lastAuthorizeContext = {
            reqId,
            emailHash: emailHashVal,
            emailFlags,
            passwordFlags,
            reasonCode: 'USER_NOT_FOUND',
          };
          return null;
        }

        // Verify password
        const { compare } = await import('bcryptjs');
        const isPasswordValid = await compare(password, user.passwordHash);

        if (!isPasswordValid) {
          logLoginEvent('PASSWORD_MISMATCH', {
            reqId,
            emailHash: emailHashVal,
            emailFlags,
            userId: user.id,
          });
          lastAuthorizeContext = {
            reqId,
            emailHash: emailHashVal,
            emailFlags,
            passwordFlags,
            reasonCode: 'PASSWORD_MISMATCH',
            userId: user.id,
          };
          return null;
        }

        // Success
        logLoginEvent('OK', {
          reqId,
          emailHash: emailHashVal,
          emailFlags,
          userId: user.id,
          characterId: user.character?.id,
          passwordFlags: passwordFlags.hasLeadingWhitespace || passwordFlags.hasTrailingWhitespace
            ? passwordFlags
            : undefined,
        });

        lastAuthorizeContext = {
          reqId,
          emailHash: emailHashVal,
          emailFlags,
          passwordFlags,
          reasonCode: 'OK',
          userId: user.id,
        };

        return {
          id: user.id,
          email: user.email,
          hasCharacter: !!user.character,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.hasCharacter = user.hasCharacter;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.hasCharacter = token.hasCharacter as boolean;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Export helper to get last authorize context (for route-level logging)
export function getLastAuthorizeContext() {
  const ctx = lastAuthorizeContext;
  lastAuthorizeContext = null;
  return ctx;
}
