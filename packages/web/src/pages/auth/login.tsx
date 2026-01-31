import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Alert, Button, Input } from '@/components/ui';
import { useLoginMutation } from '@/services/auth.ts';
import type { LoginForm } from '@/types';
import { getErrorMessage } from '@/utils';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      await login(data).unwrap();

      // Check where to redirect
      const from = (location.state as any)?.from?.pathname;
      if (from && from !== '/login' && from !== '/register') {
        navigate(from, { replace: true });
      } else {
        // Smart redirect: check if profile exists
        setCheckingProfile(true);
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/profile`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              },
            }
          );
          if (response.ok) {
            const profileData = await response.json();
            if (profileData.profile?.profileText) {
              // TODO: Change to '/matches' when matches page is ready
              navigate('/profile', { replace: true });
            } else {
              navigate('/profile', { replace: true });
            }
          } else {
            navigate('/profile', { replace: true });
          }
        } catch {
          navigate('/profile', { replace: true });
        }
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error));
      setCheckingProfile(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-8 shadow-sm">
      <h1 className="text-primary text-center text-2xl font-semibold">Welcome Back</h1>

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

        <Input
          id="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
          })}
        />

        <div className="text-right">
          <Link to="/forgot-password" className="text-accent text-sm hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" isLoading={isLoading || checkingProfile}>
          {checkingProfile ? 'Redirecting...' : 'Login'}
        </Button>
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
