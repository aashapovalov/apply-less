import { Link, Outlet } from 'react-router-dom';

import { logoTitleSvg } from '@/assets';

export function AuthLayout() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header */}
      <header className="bg-card border-border border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
          <Link to="/">
            <img src={logoTitleSvg} alt="ApplyLess logo" className="h-8" />
          </Link>
        </div>
      </header>

      {/* Centered content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
