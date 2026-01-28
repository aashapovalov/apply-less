import { Link, Outlet } from 'react-router-dom';

import logoSvg from '@/assets/logo.svg';

export function MainLayout() {
  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="bg-card border-border border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          {/* Logo */}
          <Link to="/">
            <img src={logoSvg} alt="Apply-less logo" className="h-8" />
          </Link>
          {/* Navigation */}
          <nav className="text-secondary flex items-center gap-6 text-sm">
            <Link to="/jobs" className="hover:text-primary">
              Browse Jobs
            </Link>
            <span className="text-border">|</span>
            <Link to="/login" className="hover:text-primary">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
