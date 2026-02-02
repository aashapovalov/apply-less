import type { CVCompareResponse } from '@/types';

export function RequirementsAnalysis({
  compareData,
  gapCount,
}: {
  compareData: CVCompareResponse;
  gapCount: number;
}) {
  const coveredMandatory = compareData.job_requirements.mandatory.filter((r) => r.covered);
  const coveredPreferred = compareData.job_requirements.preferred.filter((r) => r.covered);
  const gapMandatory = compareData.job_requirements.mandatory.filter((r) => !r.covered);
  const gapPreferred = compareData.job_requirements.preferred.filter((r) => !r.covered);

  const hasCovered = coveredMandatory.length > 0 || coveredPreferred.length > 0;
  const hasGaps = gapMandatory.length > 0 || gapPreferred.length > 0;

  return (
    <div className="flex flex-col overflow-hidden">
      <h3 className="text-primary mb-3 font-medium">Requirements Analysis</h3>
      <div className="bg-background flex-1 overflow-y-auto rounded-xl p-4">
        {/* Covered */}
        {hasCovered && (
          <div className="mb-6">
            <p className="text-success-text mb-2 flex items-center gap-2 font-medium">
              <span>✅</span> Covered ({compareData.summary.covered_count})
            </p>
            <ul className="space-y-1 pl-6">
              {coveredMandatory.map((requirement) => (
                <li key={requirement.skill} className="text-primary text-sm">
                  {requirement.skill}
                </li>
              ))}
              {coveredPreferred.map((requirement) => (
                <li key={requirement.skill} className="text-secondary text-sm">
                  {requirement.skill} (preferred)
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Gaps */}
        {hasGaps && (
          <div className="mb-6">
            <p className="text-warning-text mb-2 flex items-center gap-2 font-medium">
              <span>⚠️</span> Gaps ({gapCount})
            </p>
            <ul className="space-y-1 pl-6">
              {gapMandatory.map((requirement) => (
                <li key={requirement.skill} className="text-primary text-sm">
                  {requirement.skill}
                </li>
              ))}
              {gapPreferred.map((requirement) => (
                <li key={requirement.skill} className="text-secondary text-sm">
                  {requirement.skill} (preferred)
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tip */}
        <div className="bg-card mt-4 rounded-lg p-3">
          <p className="text-secondary text-sm">
            💡 <strong>Tip:</strong> Address skill gaps in your cover letter or prepare to discuss
            them in the interview.
          </p>
        </div>
      </div>
    </div>
  );
}
