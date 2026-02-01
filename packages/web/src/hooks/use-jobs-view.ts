import { useSearchParams } from 'react-router-dom';

import { JOBS_PER_PAGE } from '@/constants';
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
    { limit: JOBS_PER_PAGE, offset },
    { skip: viewMode !== 'matches' || !hasProfile || isAuthLoading }
  );
  const regionsQuery = useGetRegionsQuery();

  // Compute derived state
  const favoritesJobsIds = new Set(
    favoriteQuery.data?.favorites?.map((favorite) => favorite.jobId) || []
  );
  const favoriteJobs = (favoriteQuery.data?.favorites || []).map(transformFavoriteToJob);

  const { jobs, total, isLoading, isError, error } = ((): {
    jobs: (Job | JobMatch)[];
    total: number;
    isLoading: boolean;
    isError: boolean;
    error: string | null;
  } => {
    switch (viewMode) {
      case 'favorites':
        return {
          jobs: favoriteJobs.slice(offset, offset + JOBS_PER_PAGE),
          total: favoriteJobs.length,
          isLoading: favoriteQuery.isLoading,
          isError: false,
          error: null,
        };
      case 'matches':
        return {
          jobs: matchQuery.data?.matches || [],
          total: matchQuery.data?.total || 0,
          isLoading: matchQuery.isLoading || isAuthLoading,
          isError: matchQuery.isError,
          error:
            (matchQuery.error as { data?: { error?: string } })?.data?.error ||
            'Failed to find matches',
        };
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
    favoritesJobsIds,
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
