import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { useRegisterMutation } from '@/services/auth.ts';
import type { RegisterForm } from '@/types';
import { getErrorMessage } from '@/utils';

export function Register() {
  const navigate = useNavigate();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password', '');

  // Password validation rules
  const passwordRules = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError(null);
      await registerUser({ email: data.email, password: data.password }).unwrap();
      navigate('/verify-email', { state: { email: data.email } });
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    }
  };

  return (
    <div className="bg-card rounded-xl p-8 shadow-sm">
      <h1 className="text-primary text-center text-2xl font-semibold">Create Account</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        {/* Error message */}
        {error && (
          <div className="text-error-text rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
            {error}
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="text-primary mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="border-border text-primary placeholder:text-muted focus:ring-accent w-full rounded-lg border px-4 py-2.5 focus:border-transparent focus:ring-2 focus:outline-none"
            placeholder="you@example.com"
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

        {/* Password */}
        <div>
          <label htmlFor="password" className="text-primary mb-1.5 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="border-border text-primary text-success- placeholder:text-muted focus:ring-accent w-full rounded-lg border px-4 py-2.5 focus:border-transparent focus:ring-2 focus:outline-none"
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

          {/* Password requirements */}
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

        {/* Confirm Password */}
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

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="bg-accent hover:bg-accent-hover w-full rounded-lg py-2.5 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Creating account...' : 'Register'}
        </button>
      </form>
      {/* Login link */}
      <p className="text-secondary mt-6 text-center text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-accent hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}
