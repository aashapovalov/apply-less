import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { cn } from '@/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className, ...props }, ref) => {
    return (
      <div>
        <label htmlFor={id} className="text-primary mb-1.5 block text-sm font-medium">
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          className={cn(
            'border-border text-primary placeholder:text-muted focus:ring-accent w-full rounded-lg border px-4 py-2.5 outline-none focus:border-transparent focus:ring-2',
            error && 'border-error-text focus:ring-error-text',
            className
          )}
          {...props}
        />
        {error && <p className="text-error-text mt-1 text-sm">{error}</p>}
      </div>
    );
  }
);
