import { Link, useParams } from 'react-router-dom';

import { JobFetchError, JobSkeleton, SafeHtml } from '@/components/jobs/job-page';
import { Button } from '@/components/ui';
import { useGetJobQuery } from '@/services/jobs.ts';
import { getTimeAgo } from '@/utils';

export function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading, isError } = useGetJobQuery(Number(id));

  if (isLoading) {
    return <JobSkeleton />;
  }

  if (isError || !job) {
    return <JobFetchError />;
  }

  const timeAgo = getTimeAgo(job.posted_date);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back link */}
      <Link
        to="/jobs"
        className="text-secondary hover:text-primary mb-6 inline-flex items-center gap-1 text-sm"
      >
        ← Back to jobs
      </Link>

      {/* Job header */}
      <div className="bg-card rounded-xl p-8 shadow-sm">
        <h1 className="text-primary text-3xl font-semibold">{job.title}</h1>

        <div className="text-secondary mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="font-medium">{job.company_name}</span>
          {job.location && (
            <>
              <span className="text-muted">•</span>
              <span>📍 {job.location}</span>
            </>
          )}
          <span className="text-muted">•</span>
          <span>📅 {timeAgo}</span>
        </div>

        {/* Department */}
        {job.department && (
          <div className="mt-4">
            <span className="bg-background text-secondary rounded-lg px-3 py-1 text-sm">
              {job.department}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={job.url} target="_blank" rel="noopener noreferrer">
            <Button className="w-auto px-6">Apply on Site →</Button>
          </a>
        </div>
      </div>

      {/* Skills/Tags */}
      {job.tags.length > 0 && (
        <div className="bg-card mt-6 rounded-xl p-8 shadow-sm">
          <h2 className="text-primary text-lg font-medium">Skills</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {job.tags.map((tag) => (
              <span
                key={tag}
                className="bg-background text-secondary rounded-lg px-3 py-1.5 text-sm font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {job.description && (
        <div className="bg-card mt-6 rounded-xl p-8 shadow-sm">
          <h2 className="text-primary text-lg font-medium">About the Role</h2>
          <SafeHtml
            html={job.description}
            className="job-description text-secondary mt-4 leading-relaxed"
          />
        </div>
      )}

      {/* Requirements */}
      {job.requirements && (
        <div className="bg-card mt-6 rounded-xl p-8 shadow-sm">
          <h2 className="text-primary text-lg font-medium">Requirements</h2>
          <SafeHtml
            html={job.requirements}
            className="job-description text-secondary mt-4 leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}
