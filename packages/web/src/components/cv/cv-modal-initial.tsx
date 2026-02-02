import type { CVJob } from '@/types';

interface Props {
  job: CVJob;
  onGenerate: () => void;
}

export function CVModalInitial({ job, onGenerate }: Props) {
  return (
    <div className="p-8">
      <h2 className="text-primary text-xl font-semibold">Generate Tailored CV</h2>

      <div className="bg-background mt-6 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <p className="text-primary font-medium">{job.title}</p>
            <p className="text-secondary text-sm">
              {job.company_name}
              {job.location && ` • ${job.location}`}
            </p>
          </div>
        </div>
      </div>

      <p className="text-secondary mt-6 text-sm">
        We'll analyze the job requirements and create a CV highlighting your most relevant
        experience.
      </p>

      <button
        onClick={onGenerate}
        className="bg-accent hover:bg-accent-hover mt-6 w-full rounded-lg py-3 text-sm font-medium text-white transition-colors"
      >
        Generate CV
      </button>
    </div>
  );
}
