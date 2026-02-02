import type { LoadingStep } from '@/types';
import { cn } from '@/utils';

interface Props {
  steps: LoadingStep[];
}

export function CVModalLoading({ steps }: Props) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-primary text-xl font-semibold">Generating Your CV...</h2>

      <div className="border-accent mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />

      <div className="mt-8 space-y-3 text-left">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            {step.status === 'done' && <span className="text-success-text">✓</span>}
            {step.status === 'active' && (
              <span className="border-accent h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
            )}
            {step.status === 'pending' && <span className="text-muted">○</span>}
            <span
              className={cn(
                'text-sm',
                step.status === 'done' && 'text-primary',
                step.status === 'active' && 'text-accent',
                step.status === 'pending' && 'text-secondary'
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <p className="text-secondary mt-6 text-sm">This may take 20-30 seconds</p>
    </div>
  );
}
