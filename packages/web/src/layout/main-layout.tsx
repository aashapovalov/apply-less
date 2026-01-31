import { Link, Outlet, useNavigate } from 'react-router-dom';

import { logoTitleSvg } from '@/assets';
import { AnimatedGrid } from '@/components/ui';
import { useGetMeQuery, useLogoutMutation } from '@/services/auth';

export function MainLayout() {
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');
  const { data: userData, isLoading } = useGetMeQuery(undefined, {
    skip: !token,
  });
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const isAuthenticated = !!token && !!userData?.user;

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // Clear tokens even if API fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    navigate('/');
  };

  return (
    <div className="bg-background relative min-h-screen">
      <AnimatedGrid />

      {/* Header */}
      <header className="bg-card border-border relative z-10 border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          {/* Logo */}
          <Link to="/">
            <img src={logoTitleSvg} alt="Apply-less logo" className="h-8" />
          </Link>

          {/* Navigation */}
          <nav className="text-secondary flex items-center gap-6 text-sm">
            <Link to="/jobs" className="hover:text-primary">
              Browse Jobs
            </Link>

            {isLoading ? (
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
            ) : isAuthenticated ? (
              <>
                <span className="text-border">|</span>
                <Link to="/profile" className="hover:text-primary">
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="hover:text-primary disabled:opacity-50"
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </>
            ) : (
              <>
                <span className="text-border">|</span>
                <Link to="/login" className="hover:text-primary">
                  Login
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
