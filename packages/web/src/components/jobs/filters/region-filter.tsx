import { useState, useRef, useEffect } from 'react';

interface RegionFilterProps {
  value: string;
  onChange: (value: string) => void;
  regions: { region: string; count: number }[];
  className?: string;
}

const REGION_LABELS: Record<string, string> = {
  central: 'Central',
  north: 'North',
  south: 'South',
  jerusalem: 'Jerusalem',
  remote: 'Remote',
  other: 'Other',
};

export function RegionFilter({ value, onChange, regions, className = '' }: RegionFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = (regionValue: string) => {
    onChange(regionValue);
    setIsOpen(false);
  };

  const displayLabel = value 
    ? REGION_LABELS[value] || value 
    : 'All Regions';

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-card border-border text-primary focus:border-accent flex h-12 w-full items-center justify-between rounded-xl border px-4 text-left text-sm outline-none"
      >
        <span className={value ? 'text-primary' : 'text-secondary'}>
          {displayLabel}
        </span>
        <svg
          className={`h-4 w-4 text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
            {/* All Regions option */}
            <button
              onClick={() => handleSelect('')}
              className={`hover:bg-accent/10 w-full px-4 py-2 text-left text-sm ${
                !value ? 'bg-accent/10 text-accent' : 'text-primary'
              }`}
            >
              All Regions
            </button>

            {/* Region options */}
            {regions.map((r) => (
              <button
                key={r.region}
                onClick={() => handleSelect(r.region)}
                className={`hover:bg-accent/10 w-full px-4 py-2 text-left text-sm ${
                  value === r.region ? 'bg-accent/10 text-accent' : 'text-primary'
                }`}
              >
                {REGION_LABELS[r.region] || r.region}
                <span className="text-secondary ml-2">({r.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
