import { useSearchParams } from 'react-router-dom';

import { JobsSkeleton } from '@/components/jobs';
import { JobCard, Pagination, SearchInput } from '@/components/jobs';
import { useGetJobsQuery } from '@/services/jobs';

const LIMIT = 20;

export function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('search') || '';

  const offset = (page - 1) * LIMIT;

  const { data, isLoading, isError } = useGetJobsQuery({
    limit: LIMIT,
    offset,
    location: search || undefined,
    company: search || undefined,
  });

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-primary text-3xl font-semibold">Browse Jobs</h1>
        <p className="text-secondary mt-2">
          {data?.total
            ? `${data.total.toLocaleString()} jobs available`
            : 'Find your next opportunity'}
        </p>
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={handleSearchChange}
        placeholder="Search by location or company..."
        className="mb-8"
      />

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
              <p className="text-secondary mt-2">Try adjusting your search terms</p>
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
