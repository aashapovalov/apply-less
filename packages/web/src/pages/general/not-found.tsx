import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <div className="text-accent/20 text-8xl font-bold">404</div>
        <h1 className="text-primary mt-4 text-2xl font-semibold">Page not found</h1>
        <p className="text-secondary mx-auto mt-3 max-w-md">
          Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't
          exist.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            to="/"
            className="bg-card text-primary border-border hover:bg-background rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors"
          >
            Go Home
          </Link>
          <Link
            to="/jobs"
            className="bg-accent hover:bg-accent-hover rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Browse Jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
