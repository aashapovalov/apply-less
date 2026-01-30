import type { ReactNode } from 'react';

import { cn } from '@/utils';

type AlertVariant = 'error' | 'success' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
}

export function Alert({ variant = 'error', children, className }: AlertProps) {
  const variants: Record<AlertVariant, string> = {
    error: 'bg-error-bg border-error-border text-error-text',
    success: 'bg-success-bg border-success-border text-success-text',
    info: 'bg-info-bg border-info-border text-info-text',
  };

  return (
    <div className={cn('rounded-lg border p-3 text-sm', variants[variant], className)}>
      {children}
    </div>
  );
}
