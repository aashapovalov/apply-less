import { CVPreview, RequirementsAnalysis, ScoreBadge } from '@/components/cv';
import type { CVCompareResponse, CVGenerateResponse, CVJob } from '@/types';

interface Props {
  job: CVJob;
  cvData: CVGenerateResponse;
  compareData: CVCompareResponse;
  onRegenerate: () => void;
  onDownload: () => void;
}

export function CVModalSuccess({ job, cvData, compareData, onRegenerate, onDownload }: Props) {
  const gapCount = compareData.summary.total_count - compareData.summary.covered_count;

  return (
    <div className="flex max-h-[90vh] flex-col">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b p-6">
        <div>
          <h2 className="text-primary text-xl font-semibold">Your Tailored CV</h2>
          <p className="text-secondary text-sm">
            For: {job.title} at {job.company_name}
          </p>
        </div>
        <ScoreBadge score={compareData.score} />
      </div>

      {/* Content - Split view */}
      <div className="grid flex-1 grid-cols-2 gap-6 overflow-hidden p-6">
        <CVPreview markdown={cvData.cv_markdown} />
        <RequirementsAnalysis compareData={compareData} gapCount={gapCount} />
      </div>

      {/* Footer */}
      <div className="border-border flex items-center justify-between border-t p-6">
        <button onClick={onRegenerate} className="text-secondary hover:text-primary text-sm">
          🔄 Regenerate
        </button>
        <button
          onClick={onDownload}
          className="bg-accent hover:bg-accent-hover rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors"
        >
          ⬇ Download PDF
        </button>
      </div>
    </div>
  );
}
