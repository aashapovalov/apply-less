import { Link, useParams } from 'react-router-dom';

import { JobFetchError, JobSkeleton } from '@/components/jobs';
import { Button } from '@/components/ui';
import { useGetJobQuery } from '@/services/jobs.ts';
import { getTimeAgo } from '@/utils';

export function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useGetJobQuery(Number(id));

  if (isLoading) {
    return <JobSkeleton />;
  }

  if (isError || !data) {
    return <JobFetchError />;
  }

  const { job } = data;
  const timeAgo = getTimeAgo(job.postedAt);

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
          <span className="font-medium">{job.company}</span>
          {job.location && (
            <>
              <span className="text-muted">•</span>
              <span>📍 {job.location}</span>
            </>
          )}
          <span className="text-muted">•</span>
          <span>📅 {timeAgo}</span>
        </div>

        {/* Meta info */}
        <div className="mt-4 flex flex-wrap gap-3">
          {job.jobType && (
            <span className="bg-background text-secondary rounded-lg px-3 py-1 text-sm">
              {job.jobType}
            </span>
          )}
          {job.experienceLevel && (
            <span className="bg-background text-secondary rounded-lg px-3 py-1 text-sm">
              {job.experienceLevel}
            </span>
          )}
          {job.salary && (
            <span className="bg-background text-secondary rounded-lg px-3 py-1 text-sm">
              💰 {job.salary}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
            <Button className="w-auto px-6">Apply on Site →</Button>
          </a>
        </div>
      </div>

      {/* Skills */}
      {job.skills.length > 0 && (
        <div className="bg-card mt-6 rounded-xl p-8 shadow-sm">
          <h2 className="text-primary text-lg font-medium">Skills</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <span
                key={skill}
                className="bg-background text-secondary rounded-lg px-3 py-1.5 text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="bg-card mt-8 rounded-xl p-8 shadow-sm">
        <h2 className="text-primary text-lg font-medium">About the Role</h2>
        <div className="text-secondary loading-relaxed mt-4 whitespace-pre-wrap">
          {job.description}
        </div>
      </div>

      {/* Requirements */}
      {job.requirements && (
        <div className="bg-card mt-6 rounded-xl p-8 shadow-sm">
          <h2 className="text-primary text-lg font-medium">Requirements</h2>
          <div className="text-secondary mt-4 leading-relaxed whitespace-pre-wrap">
            {job.requirements}
          </div>
        </div>
      )}
    </div>
  );
}
