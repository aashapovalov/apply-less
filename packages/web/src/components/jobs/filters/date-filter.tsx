import { useEffect, useRef, useState } from 'react';

interface DateFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const DATE_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

function getDateValue(bucket: string): string {
  const now = new Date();

  switch (bucket) {
    case 'today': {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return today.toISOString();
    }
    case 'week': {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      return weekAgo.toISOString();
    }
    case 'month': {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      monthAgo.setHours(0, 0, 0, 0);
      return monthAgo.toISOString();
    }
    default:
      return '';
  }
}

function getBucketFromValue(value: string): string {
  if (!value) return '';

  const date = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return 'today';
  if (diffDays <= 7) return 'week';
  if (diffDays <= 30) return 'month';
  return '';
}

export function DateFilter({ value, onChange, className = '' }: DateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentBucket = getBucketFromValue(value);
  const currentLabel = DATE_OPTIONS.find((o) => o.value === currentBucket)?.label || 'Any time';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (bucket: string) => {
    onChange(getDateValue(bucket));
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-card border-border text-primary focus:border-accent flex h-12 w-full items-center justify-between rounded-xl border px-4 text-left text-sm outline-none"
      >
        <span className={value ? 'text-primary' : 'text-secondary'}>{currentLabel}</span>
        <svg
          className={`text-secondary h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="bg-card border-border absolute z-50 mt-1 w-full rounded-xl border shadow-lg">
          <div className="max-h-60 overflow-y-auto">
            {DATE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`hover:bg-accent/10 w-full px-4 py-2 text-left text-sm ${
                  currentBucket === option.value ? 'bg-accent/10 text-accent' : 'text-primary'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
