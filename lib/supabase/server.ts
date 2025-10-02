import 'server-only';

import {
  AuthApiError,
  createClient,
  type SupabaseClient,
  type User as SupabaseUser,
} from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase configuration is missing. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set.'
  );
}

const baseOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};

let cachedClient: SupabaseClient | null = null;
let cachedServiceClient: SupabaseClient | null = null;

const handleAdminApiError = (error: unknown): never => {
  if (error instanceof AuthApiError && error.status === 403) {
    if (error.code === 'not_admin') {
      const err = new Error(
        'Supabase admin API denied access. Confirm SUPABASE_SERVICE_ROLE_KEY is set to the service_role key from your project settings.'
      );
      err.name = 'SupabaseConfigError';
      throw err;
    }

    const err = new Error(
      `Supabase admin API returned status 403 (${
        error.code ?? 'unknown'
      }). Verify the service role key and that the request is allowed.`
    );
    err.name = 'SupabaseAuthError';
    throw err;
  }

  const err = error instanceof Error
    ? error
    : new Error('Unexpected error while calling Supabase admin API.');
  err.name = 'SupabaseError';
  throw err;
};

const findSupabaseUserByEmail = async (email: string) => {
  const admin = getSupabaseServiceClient();
  const normalizedEmail = email.toLowerCase();
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      handleAdminApiError(error);
    }

    const users = (data?.users ?? []) as SupabaseUser[];
    const match = users.find((user) =>
      user.email?.toLowerCase() === normalizedEmail
    );

    if (match) {
      return match;
    }

    if (!users.length || users.length < perPage) {
      return null;
    }

    page += 1;
  }
};

export const getSupabaseClient = () => {
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, baseOptions);
  }

  return cachedClient;
};

export const getSupabaseServiceClient = () => {
  if (!supabaseServiceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for server-side user management.'
    );
  }

  if (!cachedServiceClient) {
    cachedServiceClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      baseOptions
    );
  }

  return cachedServiceClient;
};

// Helper function to add timeout to async operations
const withTimeout = <T>(promiseFactory: () => Promise<T>, timeoutMs: number = 5000): Promise<T> => {
  return Promise.race([
    promiseFactory(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
};

export interface SupabaseSessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch seconds
}

export const ensureSupabaseUser = async (email: string, password: string) => {
  return withTimeout(async () => {
    const admin = getSupabaseServiceClient();
    const existingUser = await findSupabaseUserByEmail(email);

    if (!existingUser) {
      const { data: createdUser, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (createError) {
        handleAdminApiError(createError);
      }

      return createdUser.user;
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(
      existingUser.id,
      { password }
    );

    if (updateError) {
      handleAdminApiError(updateError);
    }

    return existingUser;
  }, 8000); // 8 second timeout for user creation/update
};

export const signInWithSupabasePassword = async (
  email: string,
  password: string
): Promise<SupabaseSessionTokens> => {
  return withTimeout(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error('Supabase session is missing from sign-in response.');
    }

    const { access_token, refresh_token, expires_at, expires_in } = data.session;

    if (!access_token || !refresh_token) {
      throw new Error('Incomplete Supabase session tokens received.');
    }

    const expiresAt =
      expires_at ?? Math.floor(Date.now() / 1000) + (expires_in ?? 3600);

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt,
    };
  }, 8000); // 8 second timeout for sign in
};

export const refreshSupabaseSession = async (
  refreshToken: string
): Promise<SupabaseSessionTokens> => {
  return withTimeout(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error('Supabase session is missing from refresh response.');
    }

    const { access_token, refresh_token, expires_at, expires_in } = data.session;

    if (!access_token || !refresh_token) {
      throw new Error('Incomplete Supabase session tokens received.');
    }

    const expiresAt =
      expires_at ?? Math.floor(Date.now() / 1000) + (expires_in ?? 3600);

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt,
    };
  }, 8000); // 8 second timeout for refresh
};
