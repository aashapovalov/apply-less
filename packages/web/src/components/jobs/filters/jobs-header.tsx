import type { ViewMode } from '@/types';
import { getJobsHeaderText } from '@/utils';

interface JobsHeaderProps {
  viewMode: ViewMode;
  total: number;
}

export function JobsHeader({ viewMode, total }: JobsHeaderProps) {
  const { title, subtitle } = getJobsHeaderText(viewMode, total);

  return (
    <div>
      <h1 className="text-primary, text-3xl font-semibold">{title}</h1>
      <p className="text-secondary mt-2">{subtitle}</p>
    </div>
  );
}
