import { useSearchParams } from 'react-router-dom';

import { JobsSkeleton } from '@/components/jobs';
import { JobCard, Pagination, SearchInput } from '@/components/jobs';
import { useGetJobsQuery, useGetRegionsQuery } from '@/services/jobs';

const LIMIT = 20;

const REGION_LABELS: Record<string, string> = {
  central: 'Central',
  north: 'North',
  south: 'South',
  jerusalem: 'Jerusalem',
  remote: 'Remote',
  other: 'Other',
};

export function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('search') || '';
  const region = searchParams.get('region') || '';

  const offset = (page - 1) * LIMIT;

  const { data, isLoading, isError } = useGetJobsQuery({
    limit: LIMIT,
    offset,
    search: search || undefined,
    region: region || undefined,
  });

  const { data: regionsData } = useGetRegionsQuery();

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      prev.set('page', String(newPage));
      return prev;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (value: string) => {
    setSearchParams((prev) => {
      if (value) {
        prev.set('search', value);
      } else {
        prev.delete('search');
      }
      prev.set('page', '1');
      return prev;
    });
  };

  const handleRegionChange = (value: string) => {
    setSearchParams((prev) => {
      if (value) {
        prev.set('region', value);
      } else {
        prev.delete('region');
      }
      prev.set('page', '1');
      return prev;
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-primary text-3xl font-semibold">Browse Jobs</h1>
        <p className="text-secondary mt-2">
          {data?.total
            ? `${data.total.toLocaleString()} jobs in Israel`
            : 'Find your next opportunity'}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        {/* Search */}
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search jobs or companies..."
          className="flex-1"
        />

        {/* Region filter */}
        <select
          value={region}
          onChange={(e) => handleRegionChange(e.target.value)}
          className="bg-card border-border text-primary focus:border-accent h-12 rounded-xl border px-4 text-sm outline-none"
        >
          <option value="">All Regions</option>
          {regionsData?.regions.map((r) => (
            <option key={r.region} value={r.region}>
              {REGION_LABELS[r.region] || r.region} ({r.count})
            </option>
          ))}
        </select>
      </div>

      {/* Active filters */}
      {(search || region) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {search && (
            <span className="bg-accent/10 text-accent inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm">
              Search: {search}
              <button
                onClick={() => handleSearchChange('')}
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
                onClick={() => handleRegionChange('')}
                className="hover:bg-accent/20 ml-1 rounded-full p-0.5"
              >
                ×
              </button>
            </span>
          )}
          <button
            onClick={() => {
              handleSearchChange('');
              handleRegionChange('');
            }}
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
          Failed to load jobs. Please try again later.
        </div>
      )}

      {/* Jobs list */}
      {data && (
        <>
          {data.jobs.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-5xl">🔍</span>
              <h2 className="text-primary mt-4 text-xl font-medium">No jobs found</h2>
              <p className="text-secondary mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.jobs.map((job) => (
                <JobCard key={job.job_id} job={job} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            className="mt-8"
          />
        </>
      )}
    </div>
  );
}
