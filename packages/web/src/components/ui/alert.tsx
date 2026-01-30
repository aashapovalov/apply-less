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
    success: 'bg-green-50 border-green-200 text-success-text',
    info: 'bg-blue-50 border-blue-200 text-accent',
  };

  return (
    <div className={cn('rounded-lg border p-3 text-sm', variants[variant], className)}>
      {children}
    </div>
  );
}
