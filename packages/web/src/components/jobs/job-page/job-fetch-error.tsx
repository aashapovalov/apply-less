import { Link } from 'react-router-dom';

export function JobFetchError() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="bg-error-bg border-error-border text-error-text rounded-xl border p-6 text-center">
        <span className="text-4xl">⚠️</span>
        <h2 className="mt-4 text-xl font-medium">Job not found</h2>
        <p className="mt-2">This job may have been removed or doesn't exist.</p>
        <Link to="/jobs" className="text-accent mt-4 inline-block hover:underline">
          ← Back to jobs
        </Link>
      </div>
    </div>
  );
}
