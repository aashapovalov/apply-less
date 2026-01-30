import { Link } from 'react-router-dom';

import type { Job } from '@/types';
import { cn, getTimeAgo } from '@/utils';

interface JobCardProps {
  job: Job;
  className?: string;
}

export function JobCard({ job, className }: JobCardProps) {
  const timeAgo = getTimeAgo(job.posted_date);

  return (
    <Link
      to={`/jobs/${job.job_id}`}
      className={cn(
        'bg-card block rounded-xl p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-primary truncate text-lg font-medium">{job.title}</h3>
          <p className="text-secondary mt-1 text-sm">
            {job.company_name}
            {job.location && <span className="text-muted"> • {job.location}</span>}
            <span className="text-muted"> • {timeAgo}</span>
          </p>
        </div>
      </div>

      {job.tags.length > 0 && (
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
  );
}
