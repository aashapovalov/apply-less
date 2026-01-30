import { useEffect, useState } from 'react';

import { cn } from '@/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  debounceMs = 300,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  return (
    <div className={cn('relative', className)}>
      <span className="text-muted pointer-events-none absolute top-1/2 left-4 -translate-y-1/2">
        🔍
      </span>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="border-border text-primary placeholder:text-muted focus:ring-accent w-full rounded-lg border py-2.5 pr-4 pl-11 outline-none focus:border-transparent focus:ring-2"
      />
    </div>
  );
}
