import { useSearchParams } from 'react-router-dom';

import { JobsSkeleton } from '@/components/jobs';
import { CompanySearch, DateFilter, JobCard, Pagination, RoleInput } from '@/components/jobs';
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
  const region = searchParams.get('region') || '';
  const company = searchParams.get('company') || '';
  const title = searchParams.get('title') || '';
  const postedAfter = searchParams.get('postedAfter') || '';

  const offset = (page - 1) * LIMIT;

  const { data, isLoading, isError } = useGetJobsQuery({
    limit: LIMIT,
    offset,
    region: region || undefined,
    company: company || undefined,
    title: title || undefined,
    postedAfter: postedAfter || undefined,
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

  const clearAllFilters = () => {
    setSearchParams({ page: '1' });
  };

  const hasActiveFilters = region || company || title || postedAfter;

  // Get date bucket label for display
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
      <div className="mb-8">
        <h1 className="text-primary text-3xl font-semibold">Browse Jobs</h1>
        <p className="text-secondary mt-2">
          {data?.total
            ? `${data.total.toLocaleString()} jobs in Israel`
            : 'Find your next opportunity'}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Row 1: Role and Company */}
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

        {/* Row 2: Region and Date */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <select
            value={region}
            onChange={(e) => updateFilter('region', e.target.value)}
            className="bg-card border-border text-primary focus:border-accent h-12 flex-1 rounded-xl border px-4 text-sm outline-none"
          >
            <option value="">All Regions</option>
            {regionsData?.regions.map((r) => (
              <option key={r.region} value={r.region}>
                {REGION_LABELS[r.region] || r.region} ({r.count})
              </option>
            ))}
          </select>

          <DateFilter
            value={postedAfter}
            onChange={(v) => updateFilter('postedAfter', v)}
            className="sm:w-48"
          />
        </div>
      </div>

      {/* Active filters */}
      {hasActiveFilters && (
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
