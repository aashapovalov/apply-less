import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { useLoginMutation } from '@/services/auth.ts';
import type { LoginForm } from '@/types';
import { getErrorMessage } from '@/utils';

export function Login() {
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      await login(data).unwrap();
      navigate('/');
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    }
  };

  return (
    <div className="bg-card rounded-xl p-8 shadow-sm">
      <h1 className="text-primary text-center text-2xl font-semibold">Welcome Back</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        {/* Error message */}
        {error && (
          <div className="bg-error-bg border-b-error-border text-error-text rounded-lg border p-3 text-sm">
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
            className="border-border text-primary placeholder:text-muted focus: focus:ring-accent w-full rounded-lg border px-4 py-2.5 outline-none focus:border-transparent focus:ring-2"
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
        {/* Password */}
        <div>
          <label htmlFor="password" className="text-primary mb-1.5 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="border-border text-primary placeholder:text-muted focus: focus:ring-accent w-full rounded-lg border px-4 py-2.5 outline-none focus:border-transparent focus:ring-2"
            placeholder="••••••••"
            {...register('password', {
              required: 'Password is required',
            })}
          />
          {errors.password && (
            <p className="text-error-text mt-1 text-sm">{errors.password.message}</p>
          )}
        </div>
        {/* Forgot password link */}
        <div className="text-right">
          <Link to="/forgot-password" className="text-accent text-sm hover:underline">
            Forgot password?
          </Link>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="bg-accent hover:bg-accent-hover w-full rounded-lg py-2.5 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Login'}
        </button>
      </form>

      {/* Register link */}
      <p className="text-secondary mt-6 text-center text-sm">
        Don't have an account?{' '}
        <Link to="/register" className="text-accent hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
