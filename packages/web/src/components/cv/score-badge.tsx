import { cn } from '@/utils';

export function ScoreBadge({ score }: { score: number }) {
  const percentage = Math.round(score * 100);

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-secondary text-xs">Match Score</p>
        <p className="text-primary text-2xl font-bold">{percentage}%</p>
      </div>
      <div className="bg-border h-10 w-24 overflow-hidden rounded-full">
        <div
          className={cn(
            'h-full transition-all',
            score >= 0.7 && 'bg-success-text',
            score >= 0.5 && score < 0.7 && 'bg-warning-text',
            score < 0.5 && 'bg-muted'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
