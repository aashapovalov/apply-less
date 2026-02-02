import type { Job, JobMatch, ViewMode } from '@/types';

import { JobCard } from './job-card.tsx';
import { JobsSkeleton } from './jobs-skeleton.tsx';

interface JobsListProps {
  jobs: (Job | JobMatch)[];
  viewMode: ViewMode;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  favoriteJobIds: Set<number>;
  isAuthenticated: boolean;
  profileWordCount: number;
  onFavoriteChange: () => void;
  onBrowseJobs: () => void;
}

export function JobsList({
  jobs,
  viewMode,
  isLoading,
  isError,
  error,
  favoriteJobIds,
  isAuthenticated,
  profileWordCount,
  onFavoriteChange,
  onBrowseJobs,
}: JobsListProps) {
  if (isLoading) {
    return <JobsSkeleton />;
  }

  if (isError) {
    return (
      <div className="bg-error-bg border-error-border text-error-text rounded-xl border p-6 text-center">
        {error || 'Failed to load jobs. Please try again later.'}
      </div>
    );
  }

  // Empty state for favorites
  if (viewMode === 'favorites' && jobs.length === 0) {
    return (
      <div className="bg-card rounded-xl p-8 text-center">
        <span className="text-5xl">💜</span>
        <h2 className="text-primary mt-4 text-xl font-medium">No favorites yet</h2>
        <p className="text-secondary mx-auto mt-2 max-w-md">
          Browse jobs and click the heart icon to save positions you're interested in.
        </p>
        <button
          onClick={onBrowseJobs}
          className="bg-accent hover:bg-accent/90 mt-6 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors"
        >
          Browse Jobs
        </button>
      </div>
    );
  }

  // Empty state for other views
  if (jobs.length === 0) {
    return (
      <div className="py-12 text-center">
        <span className="text-5xl">🔍</span>
        <h2 className="text-primary mt-4 text-xl font-medium">No jobs found</h2>
        <p className="text-secondary mt-2">
          {viewMode === 'matches'
            ? 'Try updating your profile with more details'
            : 'Try adjusting your filters'}
        </p>
      </div>
    );
  }

  const showGenerateCV = viewMode === 'matches' || viewMode === 'favorites';

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <JobCard
          key={job.job_id}
          job={job}
          showScore={viewMode === 'matches'}
          isFavorite={favoriteJobIds.has(job.job_id)}
          showGenerateCV={showGenerateCV}
          profileWordCount={profileWordCount}
          isAuthenticated={isAuthenticated}
          onFavoriteChange={onFavoriteChange}
        />
      ))}
    </div>
  );
}
