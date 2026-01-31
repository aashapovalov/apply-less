import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useGetMeQuery } from '@/services/auth.ts';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const token = localStorage.getItem('accessToken');

  const { isLoading, isError } = useGetMeQuery(undefined, {
    skip: !token,
  });

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="border-accent h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  //Token invalid - redirect to login
  if (isError) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
