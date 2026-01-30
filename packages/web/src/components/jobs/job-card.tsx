import { Link } from 'react-router-dom';

import type { Job } from '@/types';
import { cn, getTimeAgo } from '@/utils';

interface JobCardProps {
  job: Job;
  className?: string;
}

export function JobCard({ job, className }: JobCardProps) {
  const timeAgo = getTimeAgo(job.postedAt);

  return (
    <Link
      to={`/jobs/${job.id}`}
      className={cn(
        'bg-card block rounded-xl p-6 shadow-sm transition-all hover:translate-y-0 hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-primary truncate text-lg font-medium">{job.title}</h3>
          <p className="text-secondary mt-1 text-sm">
            {job.company}
            {job.location && <span className="text-muted"> • {job.location}</span>}
            <span className="text-muted"> • {timeAgo}</span>
          </p>
        </div>
      </div>

      {job.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {job.skills.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className="bg-background text-secondary rounded-md px-2.5 py-1 text-xs font-medium"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 5 && (
            <span className="text-muted px-2.5 py-1 text-xs">+{job.skills.length - 5}</span>
          )}
        </div>
      )}
    </Link>
  );
}
