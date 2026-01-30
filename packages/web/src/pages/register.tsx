import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { Alert, Button, Input, PasswordStrength } from '@/components/ui';
import { useRegisterMutation } from '@/services/auth.ts';
import type { RegisterForm } from '@/types';
import { getErrorMessage } from '@/utils';

export function Register() {
  const navigate = useNavigate();
  const [registerUser, { isLoading }] = useRegisterMutation();
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
        {error && <Alert>{error}</Alert>}

        <Input
          id="email"
          type="email"
          label="Email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
        />

        <div>
          <Input
            id="password"
            type="password"
            label="Password"
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
          Register
        </Button>
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
