import { JobsFilters, JobsHeader, ViewToggle } from '@/components/jobs/filters';
import { JobsList, Pagination } from '@/components/jobs/job-list';
import { useJobsView } from '@/hooks';

export function Jobs() {
  const {
    viewMode,
    page,
    filters,
    hasActiveFilters,
    jobs,
    total,
    totalPages,
    isLoading,
    isError,
    error,
    isAuthenticated,
    hasProfile,
    favoriteJobIds,
    favoritesCount,
    refetchFavorites,
    regions,
    setViewMode,
    setPage,
    setFilter,
    clearFilters,
  } = useJobsView();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <JobsHeader viewMode={viewMode} total={total} />
        <ViewToggle
          value={viewMode}
          onChange={setViewMode}
          hasProfile={hasProfile}
          isAuthenticated={isAuthenticated}
          favoritesCount={favoritesCount}
        />
      </div>

      {/* Profile prompt */}
      {viewMode === 'all' && isAuthenticated && !hasProfile && (
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

      {/* Filters - only for "All Jobs" view */}
      {viewMode === 'all' && (
        <JobsFilters
          filters={filters}
          regions={regions}
          hasActiveFilters={hasActiveFilters}
          onFilterChange={setFilter}
          onClearFilters={clearFilters}
        />
      )}

      {/* Jobs list */}
      <JobsList
        jobs={jobs}
        viewMode={viewMode}
        isLoading={isLoading}
        isError={isError}
        error={error}
        favoriteJobIds={favoriteJobIds}
        isAuthenticated={isAuthenticated}
        onFavoriteChange={refetchFavorites}
        onBrowseJobs={() => setViewMode('all')}
      />

      {/* Pagination */}
      {!isLoading && !isError && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-8" />
      )}
    </div>
  );
}
