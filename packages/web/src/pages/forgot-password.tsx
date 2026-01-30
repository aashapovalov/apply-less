import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { useForgotPasswordMutation } from '@/services/auth.ts';
import type { ForgotPasswordForm } from '@/types';
import { getErrorMessage } from '@/utils';

export function ForgotPassword() {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>();

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setError(null);
      await forgotPassword(data).unwrap();
      setSubmitted(true);
    } catch (error) {
      setError(getErrorMessage(error));
    }
  };

  if (submitted) {
    return (
      <div className="bg-card rounded-xl p-8 text-center shadow-sm">
        <span className="text-5xl">✉️</span>
        <h1 className="text-primary mt-4 text-2xl font-semibold">Check Your Email</h1>
        <p className="text-secondary mt-4">
          If an account exists with that email, we've sent a password reset link.
        </p>
        <Link to="/login" className="text-accent mt-6 inline-block hover:underline">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-8 shadow-sm">
      <h1 className="text-primary text-center text-2xl font-semibold">Forgot Password</h1>
      <p className="text-secondary mt-2 text-center text-sm">
        Enter your email and we'll send you a reset link
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        {error && (
          <div className="bg-error-bg border-error-border text-error-tex rounded-lg border p-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="text-primary mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="border-border text-primary placeholder:text-muted focus:ring-accent w-full rounded-lg border px-4 py-2.5 focus:border-transparent focus:ring-2 focus:outline-none"
            placeholder="your@example.email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
          />
          {errors.email && <p className="text-error-text mt-1 text-sm">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-accent hover:bg-accent-hover w-full rounded-lg py-2.5 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
      <p className="text-secondary mt-6 text-center text-sm">
        Remember your password?{' '}
        <Link to="/login" className="text-accent hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}
