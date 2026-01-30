import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useResetPasswordMutation } from '@/services/auth.ts';
import type { ResetPasswordForm } from '@/types';
import { getErrorMessage } from '@/utils';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>();

  const password = watch('password', '');

  // Password validation rules
  const passwordRules = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;

    try {
      setError(null);
      await resetPassword({ token, password: data.password }).unwrap();
      navigate('/login', { state: { message: 'Password reset successfully. Please login.' } });
    } catch (error) {
      setError(getErrorMessage(error));
    }
  };

  if (!token) {
    return (
      <div className="bg-card rounded-xl p-8 text-center shadow-sm">
        <span className="text-5xl">⚠️</span>
        <h1 className="text-primary mt-4 text-2xl font-semibold">Invalid Link</h1>
        <p className="text-secondary mt-4">This password reset link is invalid or has expired.</p>
        <Link
          to="/forgot-password"
          className="bg-accent hover:bg-accent-hover mt-6 inline-block rounded-lg px-6 py-2.5 font-medium text-white transition-colors"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-8 shadow-sm">
      <h1 className="text-primary text-center text-2xl font-semibold">Reset Password</h1>
      <p className="text-secondary mt-2 text-center text-sm">Enter your new password below.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        {error && (
          <div className="border-error-border bg-error-bg text-error-text rounded-lg border p-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="text-primary mb-1.5 block text-sm font-medium">
            New Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="border-border text-primary placeholder:text-muted focus:ring-accent w-full rounded-lg border px-4 py-2.5 focus:border-transparent focus:ring-2 focus:outline-none"
            placeholder="••••••••"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Minimum 8 characters' },
              validate: {
                hasUppercase: (v) => /[A-Z]/.test(v) || 'Need uppercase letter',
                hasLowercase: (v) => /[a-z]/.test(v) || 'Need lowercase letter',
                hasNumber: (v) => /\d/.test(v) || 'Need a number',
                hasSpecial: (v) => /[!@#$%^&*(),.?":{}|<>]/.test(v) || 'Need special character',
              },
            })}
          />

          <div className="mt-2 space-y-1 text-sm">
            <p className={passwordRules.minLength ? 'text-success-text' : 'text-muted'}>
              {passwordRules.minLength ? '✓' : '○'} 8+ characters
            </p>
            <p className={passwordRules.hasUppercase ? 'text-success-text' : 'text-muted'}>
              {passwordRules.hasUppercase ? '✓' : '○'} 1 uppercase letter
            </p>
            <p className={passwordRules.hasLowercase ? 'text-success-text' : 'text-muted'}>
              {passwordRules.hasLowercase ? '✓' : '○'} 1 uppercase letter
            </p>
            <p className={passwordRules.hasNumber ? 'text-success-text' : 'text-muted'}>
              {passwordRules.hasNumber ? '✓' : '○'} 1 number
            </p>
            <p className={passwordRules.hasSpecial ? 'text-success-text' : 'text-muted'}>
              {passwordRules.hasSpecial ? '✓' : '○'} 1 special character
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="text-primary mb-1.5 block text-sm font-medium"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="border-border text-primary placeholder:text-muted focus:ring-accent w-full rounded-lg border px-4 py-2.5 focus:border-transparent focus:ring-2 focus:outline-none"
            placeholder="••••••••"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === password || 'Passwords do not match',
            })}
          />
          {errors.confirmPassword && (
            <p className="text-error-text mt-1 text-sm">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-accent hover:bg-accent-hover w-full rounded-lg py-2.5 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}
