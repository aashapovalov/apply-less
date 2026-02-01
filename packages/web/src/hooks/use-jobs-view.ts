import { useSearchParams } from 'react-router-dom';

import { JOBS_PER_PAGE, MAX_MATCHES } from '@/constants';
import { useAuthStatus } from '@/hooks/use-auth-status.ts';
import { useGetFavoritesQuery } from '@/services/favorites.ts';
import { useGetJobsQuery, useGetRegionsQuery } from '@/services/jobs.ts';
import { useMatchJobsQuery } from '@/services/match.ts';
import type { Job, JobFilters, JobMatch, ViewMode } from '@/types';
import { transformFavoriteToJob } from '@/utils';

export function useJobsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, hasProfile, isLoading: isAuthLoading } = useAuthStatus();

  // Parse URL params
  const page = Number(searchParams.get('page')) || 1;
  const filters: JobFilters = {
    region: searchParams.get('region') || '',
    company: searchParams.get('company') || '',
    title: searchParams.get('title') || '',
    postedAfter: searchParams.get('postedAfter') || '',
  };
  const offset = (page - 1) * JOBS_PER_PAGE;

  // Determine view mode
  const viewParam = searchParams.get('view') as ViewMode | null;
  const viewMode: ViewMode =
    viewParam === 'favorites' && isAuthenticated
      ? 'favorites'
      : viewParam === 'matches' && hasProfile
        ? 'matches'
        : 'all';

  // Data queries
  const favoriteQuery = useGetFavoritesQuery(undefined, { skip: !isAuthenticated });
  const jobsQuery = useGetJobsQuery(
    {
      limit: JOBS_PER_PAGE,
      offset,
      region: filters.region || undefined,
      company: filters.company || undefined,
      title: filters.title || undefined,
      postedAfter: filters.postedAfter || undefined,
    },
    { skip: viewMode !== 'all' }
  );
  const matchQuery = useMatchJobsQuery(
    { limit: MAX_MATCHES, offset: 0 },
    { skip: viewMode !== 'matches' || !hasProfile || isAuthLoading }
  );
  const regionsQuery = useGetRegionsQuery();

  // Compute derived state
  const favoriteJobIds = new Set(
    favoriteQuery.data?.favorites?.map((favorite) => favorite.jobId) || []
  );
  const favoriteJobs = (favoriteQuery.data?.favorites || []).map(transformFavoriteToJob);

  // Helper function for client-side filtering
  const applyFilters = (jobList: (Job | JobMatch)[]): (Job | JobMatch)[] => {
    return jobList.filter((job) => {
      if (filters.title && !job.title.toLowerCase().includes(filters.title.toLowerCase())) {
        return false;
      }
      if (
        filters.company &&
        !job.company_name.toLowerCase().includes(filters.company.toLowerCase())
      ) {
        return false;
      }
      if (filters.region && job.region !== filters.region) {
        return false;
      }
      if (filters.postedAfter && job.posted_date) {
        const postedDate = new Date(job.posted_date);
        const filterDate = new Date(filters.postedAfter);
        if (postedDate < filterDate) {
          return false;
        }
      }
      return true;
    });
  };

  const { jobs, total, isLoading, isError, error } = ((): {
    jobs: (Job | JobMatch)[];
    total: number;
    isLoading: boolean;
    isError: boolean;
    error: string | null;
  } => {
    switch (viewMode) {
      case 'favorites': {
        const filtered = applyFilters(favoriteJobs);
        return {
          jobs: filtered.slice(offset, offset + JOBS_PER_PAGE),
          total: filtered.length,
          isLoading: favoriteQuery.isLoading,
          isError: false,
          error: null,
        };
      }
      case 'matches': {
        const allMatches = matchQuery.data?.matches || [];
        const filtered = applyFilters(allMatches);
        return {
          jobs: filtered.slice(offset, offset + JOBS_PER_PAGE),
          total: filtered.length,
          isLoading: matchQuery.isLoading || isAuthLoading,
          isError: matchQuery.isError,
          error:
            (matchQuery.error as { data?: { error?: string } })?.data?.error ||
            'Failed to find matches',
        };
      }
      default:
        return {
          jobs: jobsQuery.data?.jobs || [],
          total: jobsQuery.data?.total || 0,
          isLoading: jobsQuery.isLoading,
          isError: jobsQuery.isError,
          error: 'Failed to load jobs',
        };
    }
  })();

  const hasActiveFilters = !!(
    filters.region ||
    filters.company ||
    filters.title ||
    filters.postedAfter
  );

  // Actions
  const setViewMode = (mode: ViewMode) => {
    setSearchParams((prev) => {
      if (mode === 'all') prev.delete('view');
      else prev.set('view', mode);
      prev.set('page', '1');
      return prev;
    });
  };

  const setPage = (newPage: number) => {
    setSearchParams((prev) => {
      prev.set('page', String(newPage));
      return prev;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setFilter = (key: keyof JobFilters, value: string) => {
    setSearchParams((prev) => {
      if (value) prev.set(key, value);
      else prev.delete(key);
      prev.set('page', '1');
      return prev;
    });
  };

  const clearFilters = () => {
    setSearchParams((prev) => {
      const view = prev.get('view');
      const newParams = new URLSearchParams();
      if (view) newParams.set('view', view);
      newParams.set('page', '1');
      return newParams;
    });
  };

  return {
    // State
    viewMode,
    page,
    filters,
    hasActiveFilters,
    jobs,
    total,
    totalPages: Math.ceil(total / JOBS_PER_PAGE),
    isLoading,
    isError,
    error,
    // Auth
    isAuthenticated,
    hasProfile,
    // Favorites
    favoriteJobIds,
    favoritesCount: favoriteJobs.length,
    refetchFavorites: favoriteQuery.refetch,
    // Regions
    regions: regionsQuery.data?.regions || [],
    // Actions
    setViewMode,
    setPage,
    setFilter,
    clearFilters,
  };
}
