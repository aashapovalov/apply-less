import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { PasswordStrength } from '@/components/auth';
import { Alert, Button, Input } from '@/components/ui';
import { useResetPasswordMutation } from '@/services/auth.ts';
import type { RegisterForm, ResetPasswordForm } from '@/types';
import { getErrorMessage } from '@/utils';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = useWatch({
    control,
    name: 'password',
    defaultValue: '',
  });

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
        {error && <Alert>{error}</Alert>}

        <div>
          <Input
            id="password"
            type="password"
            label="New Password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.password?.message}
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
          <PasswordStrength password={password} />
        </div>

        <Input
          id="confirmPassword"
          type="password"
          label="Confirm Password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (value) => value === password || 'Passwords do not match',
          })}
        />

        <Button type="submit" isLoading={isLoading}>
          Reset Password
        </Button>
      </form>
    </div>
  );
}
