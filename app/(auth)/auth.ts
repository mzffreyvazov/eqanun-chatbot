import { compare } from 'bcrypt-ts';
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { createGuestUser, getUser } from '@/lib/db/queries';
import { authConfig } from './auth.config';
import { DUMMY_PASSWORD } from '@/lib/constants';
import type { DefaultJWT } from 'next-auth/jwt';
import {
  ensureSupabaseUser,
  refreshSupabaseSession,
  signInWithSupabasePassword,
  type SupabaseSessionTokens,
} from '@/lib/supabase/server';

export type UserType = 'guest' | 'regular';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
    } & DefaultSession['user'];
    supabase?: {
      accessToken: string;
      expiresAt: number;
    };
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
    supabaseAccessToken?: string;
    supabaseRefreshToken?: string;
    supabaseExpiresAt?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
    supabaseAccessToken?: string;
    supabaseRefreshToken?: string;
    supabaseExpiresAt?: number;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        if (typeof email !== 'string' || typeof password !== 'string') {
          return null;
        }

        const users = await getUser(email);

        if (users.length === 0) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const [user] = users;

        if (!user.password) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const passwordsMatch = await compare(password, user.password);

        if (!passwordsMatch) return null;

        const { password: _password, ...userWithoutPassword } = user;

        let supabaseTokens: SupabaseSessionTokens | null = null;

        // Only attempt Supabase sync if all required credentials are present
        const hasSupabaseConfig = process.env.SUPABASE_URL && 
                                   process.env.SUPABASE_ANON_KEY && 
                                   process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (hasSupabaseConfig) {
          try {
            await ensureSupabaseUser(email, password);
            supabaseTokens = await signInWithSupabasePassword(email, password);
          } catch (error) {
            // Silently continue with login if Supabase sync fails
            // This is expected in development without full Supabase configuration
            if (process.env.NODE_ENV === 'development') {
              console.log('[Dev Mode] Continuing login without Supabase Auth (this is normal)');
            }
          }
        }

        // Allow login even without Supabase tokens (for development/standalone mode)
        return {
          ...userWithoutPassword,
          type: 'regular',
          supabaseAccessToken: supabaseTokens?.accessToken,
          supabaseRefreshToken: supabaseTokens?.refreshToken,
          supabaseExpiresAt: supabaseTokens?.expiresAt,
        };
      },
    }),
    Credentials({
      id: 'guest',
      credentials: {},
      async authorize() {
        const [guestUser] = await createGuestUser();

        if (!guestUser) {
          return null;
        }

        const { rawPassword, ...guestWithoutPassword } = guestUser as {
          rawPassword?: string;
          id: string;
          email: string;
        };

        if (!rawPassword) {
          return null;
        }

        let supabaseTokens: SupabaseSessionTokens | null = null;

        // Only attempt Supabase sync if all required credentials are present
        const hasSupabaseConfig = process.env.SUPABASE_URL && 
                                   process.env.SUPABASE_ANON_KEY && 
                                   process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (hasSupabaseConfig) {
          try {
            await ensureSupabaseUser(guestWithoutPassword.email, rawPassword);
            supabaseTokens = await signInWithSupabasePassword(
              guestWithoutPassword.email,
              rawPassword,
            );
          } catch (error) {
            // Silently continue with guest login if Supabase sync fails
            // This is expected in development without full Supabase configuration
            if (process.env.NODE_ENV === 'development') {
              console.log('[Dev Mode] Continuing guest login without Supabase Auth (this is normal)');
            }
          }
        }

        // Allow guest login even without Supabase tokens (for development/standalone mode)
        return {
          ...guestWithoutPassword,
          type: 'guest',
          supabaseAccessToken: supabaseTokens?.accessToken,
          supabaseRefreshToken: supabaseTokens?.refreshToken,
          supabaseExpiresAt: supabaseTokens?.expiresAt,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.type = user.type;
        token.supabaseAccessToken = user.supabaseAccessToken;
        token.supabaseRefreshToken = user.supabaseRefreshToken;
        token.supabaseExpiresAt = user.supabaseExpiresAt;
      }

      const expiresAt = token.supabaseExpiresAt;
      const refreshToken = token.supabaseRefreshToken;

      const shouldRefresh =
        typeof expiresAt === 'number' &&
        expiresAt > 0 &&
        typeof refreshToken === 'string' &&
        expiresAt - 60 < Math.floor(Date.now() / 1000);

      if (shouldRefresh) {
        try {
          const refreshedTokens = await refreshSupabaseSession(refreshToken);
          token.supabaseAccessToken = refreshedTokens.accessToken;
          token.supabaseRefreshToken = refreshedTokens.refreshToken;
          token.supabaseExpiresAt = refreshedTokens.expiresAt;
        } catch (error) {
          console.error('Failed to refresh Supabase session', error);
          token.supabaseAccessToken = undefined;
          token.supabaseRefreshToken = undefined;
          token.supabaseExpiresAt = undefined;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
      }

      if (token.supabaseAccessToken && token.supabaseExpiresAt) {
        session.supabase = {
          accessToken: token.supabaseAccessToken,
          expiresAt: token.supabaseExpiresAt,
        };
      } else {
        session.supabase = undefined;
      }

      return session;
    },
  },
});
