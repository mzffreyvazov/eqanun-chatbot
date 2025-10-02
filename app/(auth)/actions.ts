'use server';

import { z } from 'zod';
import { AuthError } from 'next-auth';

import { createUser, getUser } from '@/lib/db/queries';

import { signIn } from './auth';

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    // Call signIn - it will redirect on success or throw on error
    await signIn('credentials', {
      ...validatedData,
      redirectTo: '/',
    });

    // This line is never reached due to redirect
    return { status: 'success' };
  } catch (error: any) {
    // NextAuth throws AuthError on failed credentials
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { status: 'failed' };
        default:
          return { status: 'failed' };
      }
    }

    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    // Re-throw to allow Next.js to handle redirects
    // NEXT_REDIRECT is not an error, it's how Next.js implements server-side redirects
    throw error;
  }
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data';
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const [user] = await getUser(validatedData.email);

    if (user) {
      return { status: 'user_exists' } as RegisterActionState;
    }
    
    await createUser(validatedData.email, validatedData.password);
    
    // Sign in after registration - will redirect on success
    await signIn('credentials', {
      ...validatedData,
      redirectTo: '/',
    });

    return { status: 'success' };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    if (error instanceof AuthError) {
      return { status: 'failed' };
    }

    // Re-throw to allow Next.js to handle redirects
    throw error;
  }
};
