import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { CVGeneratorModal } from '@/components/cv';
import { useAddFavoriteMutation, useRemoveFavoriteMutation } from '@/services/favorites.ts';
import type { Job, JobMatch } from '@/types';
import { cn, getScoreClasses, getTimeAgo } from '@/utils';

interface JobCardProps {
  job: Job | JobMatch;
  className?: string;
  showScore?: boolean;
  isFavorite?: boolean;
  isAuthenticated?: boolean;
  showGenerateCV?: boolean;
  profileWordCount?: number;
  onFavoriteChange?: () => void;
}

export function JobCard({
  job,
  className,
  showScore = false,
  isFavorite = false,
  isAuthenticated = false,
  showGenerateCV = false,
  profileWordCount = 0,
  onFavoriteChange,
}: JobCardProps) {
  const navigate = useNavigate();
  const [localFavorite, setLocalFavorite] = useState(isFavorite);
  const [showCVModal, setShowCVModal] = useState(false);
  const [addFavorite, { isLoading: isAdding }] = useAddFavoriteMutation();
  const [removeFavorite, { isLoading: isRemoving }] = useRemoveFavoriteMutation();

  const timeAgo = getTimeAgo(job.posted_date!);
  const score = 'score' in job ? job.score : undefined;

  const handleFavoriteClick = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/jobs' } } });
      return;
    }

    try {
      if (localFavorite) {
        await removeFavorite(job.job_id).unwrap();
        setLocalFavorite(false);
      } else {
        await addFavorite(job.job_id).unwrap();
        setLocalFavorite(true);
      }
      onFavoriteChange?.();
    } catch (error) {
      console.error('Failed to update favorite:', error);
    }
  };

  const handleGenerateCVClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setShowCVModal(true);
  };

  const isUpdating = isAdding || isRemoving;

  return (
    <>
      <div
        className={cn(
          'bg-card relative rounded-xl p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
          className
        )}
      >
        <Link to={`/jobs/${job.job_id}`} className="block">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-primary truncate text-lg font-medium">{job.title}</h3>
                {showScore && score !== undefined && (
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                      getScoreClasses(score)
                    )}
                  >
                    {Math.round(score * 100)}% match
                  </span>
                )}
              </div>
              <p className="text-secondary mt-1 text-sm">
                {job.company_name}
                {job.location && <span className="text-muted"> • {job.location}</span>}
                <span className="text-muted"> • {timeAgo}</span>
              </p>
            </div>
          </div>

          {job.tags && job.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {job.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="bg-background text-secondary rounded-md px-2.5 py-1 text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
              {job.tags.length > 5 && (
                <span className="text-muted px-2.5 py-1 text-xs">+{job.tags.length - 5} more</span>
              )}
            </div>
          )}
        </Link>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {/* Generate CV button */}
          {showGenerateCV && (
            <button
              onClick={handleGenerateCVClick}
              className="text-secondary hover:text-accent hover:bg-accent/10 rounded-full p-2 transition-colors"
              title="Generate tailored CV"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>
          )}

          {/* Favorite button */}
          <button
            onClick={handleFavoriteClick}
            disabled={isUpdating}
            className={cn(
              'rounded-full p-2 transition-colors',
              localFavorite
                ? 'text-favorite hover:bg-favorite/10'
                : 'text-secondary hover:bg-secondary/10 hover:text-favorite',
              isUpdating && 'opacity-50'
            )}
            title={localFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isUpdating ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg
                className="h-5 w-5"
                fill={localFavorite ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* CV Generator Modal */}
      {showGenerateCV && (
        <CVGeneratorModal
          job={{
            job_id: job.job_id,
            title: job.title,
            company_name: job.company_name,
            location: job.location,
          }}
          isOpen={showCVModal}
          onClose={() => setShowCVModal(false)}
          profileWordCount={profileWordCount}
        />
      )}
    </>
  );
}
