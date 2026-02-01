import { useSearchParams } from 'react-router-dom';

import {
  CompanySearch,
  DateFilter,
  JobCard,
  JobsSkeleton,
  Pagination,
  RegionFilter,
  RoleInput,
} from '@/components/jobs/job-list';
import { JOBS_PER_PAGE, REGION_LABELS } from '@/constants';
import { useAuthStatus } from '@/hooks';
import { useGetFavoritesQuery } from '@/services/favorites';
import { useGetJobsQuery, useGetRegionsQuery } from '@/services/jobs';
import { useMatchJobsQuery } from '@/services/match';
import type { Job, JobMatch } from '@/types';

type SortOption = 'date' | 'relevance';

export function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const region = searchParams.get('region') || '';
  const company = searchParams.get('company') || '';
  const title = searchParams.get('title') || '';
  const postedAfter = searchParams.get('postedAfter') || '';
  const sortParam = searchParams.get('sort') as SortOption | null;

  const offset = (page - 1) * JOBS_PER_PAGE;

  // Auth & profile state
  const { isAuthenticated, hasProfile, isLoading: isAuthLoading } = useAuthStatus();

  // Favorites state
  const { data: favoritesData, refetch: refetchFavorites } = useGetFavoritesQuery(undefined, {
    skip: !isAuthenticated,
  });
  const favoriteJobIds = new Set(favoritesData?.favorites?.map((f) => f.jobId) || []);

  // Determine sort option
  const sort: SortOption = sortParam === 'relevance' && hasProfile ? 'relevance' : 'date';

  // Jobs query (for date sort)
  const {
    data: jobsData,
    isLoading: isLoadingJobs,
    isError: isJobsError,
  } = useGetJobsQuery(
    {
      limit: JOBS_PER_PAGE,
      offset,
      region: region || undefined,
      company: company || undefined,
      title: title || undefined,
      postedAfter: postedAfter || undefined,
    },
    { skip: sort === 'relevance' }
  );

  // Match query (for relevance sort) - RTK Query handles refetching automatically
  const {
    data: matchData,
    isLoading: isMatching,
    isError: isMatchError,
    error: matchQueryError,
  } = useMatchJobsQuery(
    {
      limit: JOBS_PER_PAGE,
      offset,
    },
    { skip: sort !== 'relevance' || !hasProfile || isAuthLoading }
  );

  const matchedJobs = matchData?.matches || [];
  const matchTotal = matchData?.total || 0;
  const matchError = isMatchError
    ? (matchQueryError as { data?: { error?: string } })?.data?.error || 'Failed to find matches'
    : null;

  const { data: regionsData } = useGetRegionsQuery();

  // Determine current data source
  const jobs: (Job | JobMatch)[] = sort === 'relevance' ? matchedJobs : jobsData?.jobs || [];
  const total = sort === 'relevance' ? matchTotal : jobsData?.total || 0;
  const isLoading = sort === 'relevance' ? isMatching || isAuthLoading : isLoadingJobs;
  const isError = sort === 'relevance' ? isMatchError : isJobsError;
  const totalPages = Math.ceil(total / JOBS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      prev.set('page', String(newPage));
      return prev;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      if (value) {
        prev.set(key, value);
      } else {
        prev.delete(key);
      }
      prev.set('page', '1');
      return prev;
    });
  };

  const handleSortChange = (newSort: SortOption) => {
    setSearchParams((prev) => {
      if (newSort === 'relevance') {
        prev.set('sort', 'relevance');
      } else {
        prev.delete('sort');
      }
      prev.set('page', '1');
      return prev;
    });
  };

  const clearAllFilters = () => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams();
      newParams.set('page', '1');
      if (prev.get('sort')) {
        newParams.set('sort', prev.get('sort')!);
      }
      return newParams;
    });
  };

  const hasActiveFilters = region || company || title || postedAfter;

  const getDateLabel = () => {
    if (!postedAfter) return '';
    const date = new Date(postedAfter);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 'Today';
    if (diffDays <= 7) return 'This week';
    if (diffDays <= 30) return 'This month';
    return 'Custom date';
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-primary text-3xl font-semibold">Browse Jobs</h1>
          <p className="text-secondary mt-2">
            {total ? `${total.toLocaleString()} jobs` : 'Find your next opportunity'}
            {sort === 'relevance' && ' ranked by relevance'}
          </p>
        </div>

        {/* Sort toggle */}
        <div className="flex items-center gap-2">
          <span className="text-secondary text-sm">Sort by:</span>
          <div className="bg-secondary/10 flex rounded-lg p-1">
            <button
              onClick={() => handleSortChange('date')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                sort === 'date'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Date
            </button>
            <button
              onClick={() => handleSortChange('relevance')}
              disabled={!hasProfile}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                sort === 'relevance'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              } ${!hasProfile ? 'cursor-not-allowed opacity-50' : ''}`}
              title={
                !isAuthenticated
                  ? 'Login to sort by relevance'
                  : !hasProfile
                    ? 'Create profile to sort by relevance'
                    : 'Sort by match to your profile'
              }
            >
              Relevance
            </button>
          </div>
        </div>
      </div>

      {/* Profile prompt */}
      {sort === 'date' && isAuthenticated && !hasProfile && (
        <div className="bg-warning-bg border-warning-border mb-6 rounded-xl border p-4">
          <p className="text-warning-text text-sm">
            <strong>Want personalized matches?</strong>{' '}
            <a href="/profile" className="underline hover:no-underline">
              Create your profile
            </a>{' '}
            to see jobs ranked by relevance to your skills.
          </p>
        </div>
      )}

      {/* Filters - only show for date sort */}
      {sort === 'date' && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <RoleInput
              value={title}
              onChange={(v) => updateFilter('title', v)}
              className="flex-1"
            />
            <CompanySearch
              value={company}
              onChange={(v) => updateFilter('company', v)}
              className="sm:w-64"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <RegionFilter
              value={region}
              onChange={(v) => updateFilter('region', v)}
              regions={regionsData?.regions || []}
              className="flex-1"
            />
            <DateFilter
              value={postedAfter}
              onChange={(v) => updateFilter('postedAfter', v)}
              className="sm:w-48"
            />
          </div>
        </div>
      )}

      {/* Active filters */}
      {hasActiveFilters && sort === 'date' && (
        <div className="mb-6 flex flex-wrap gap-2">
          {title && (
            <span className="bg-accent/10 text-accent inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm">
              Role: {title}
              <button
                onClick={() => updateFilter('title', '')}
                className="hover:bg-accent/20 ml-1 rounded-full p-0.5"
              >
                ×
              </button>
            </span>
          )}
          {company && (
            <span className="bg-accent/10 text-accent inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm">
              Company: {company}
              <button
                onClick={() => updateFilter('company', '')}
                className="hover:bg-accent/20 ml-1 rounded-full p-0.5"
              >
                ×
              </button>
            </span>
          )}
          {region && (
            <span className="bg-accent/10 text-accent inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm">
              Region: {REGION_LABELS[region] || region}
              <button
                onClick={() => updateFilter('region', '')}
                className="hover:bg-accent/20 ml-1 rounded-full p-0.5"
              >
                ×
              </button>
            </span>
          )}
          {postedAfter && (
            <span className="bg-accent/10 text-accent inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm">
              Posted: {getDateLabel()}
              <button
                onClick={() => updateFilter('postedAfter', '')}
                className="hover:bg-accent/20 ml-1 rounded-full p-0.5"
              >
                ×
              </button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-secondary hover:text-primary text-sm underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <JobsSkeleton />}

      {/* Error state */}
      {isError && (
        <div className="bg-error-bg border-error-border text-error-text rounded-xl border p-6 text-center">
          {matchError || 'Failed to load jobs. Please try again later.'}
        </div>
      )}

      {/* Jobs list */}
      {!isLoading && !isError && (
        <>
          {jobs.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-5xl">🔍</span>
              <h2 className="text-primary mt-4 text-xl font-medium">No jobs found</h2>
              <p className="text-secondary mt-2">
                {sort === 'relevance'
                  ? 'Try updating your profile with more details'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <JobCard
                  key={job.job_id}
                  job={job}
                  showScore={sort === 'relevance'}
                  isFavorite={favoriteJobIds.has(job.job_id)}
                  isAuthenticated={isAuthenticated}
                  onFavoriteChange={refetchFavorites}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              className="mt-8"
            />
          )}
        </>
      )}
    </div>
  );
}
