import { useState, useEffect, useRef } from 'react';
import { useGetCompaniesQuery } from '@/services/jobs';

interface CompanySearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CompanySearch({ value, onChange, className = '' }: CompanySearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isFetching } = useGetCompaniesQuery(
    { search: debouncedSearch, limit: 15 },
    { skip: !isOpen }
  );

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

  const handleSelect = (companyName: string) => {
    onChange(companyName);
    setSearch('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearch('');
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-card border-border text-primary focus:border-accent flex h-12 w-full items-center justify-between rounded-xl border px-4 text-left text-sm outline-none"
      >
        <span className={value ? 'text-primary' : 'text-secondary'}>
          {value || 'All Companies'}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="bg-card border-border absolute z-50 mt-1 w-full rounded-xl border shadow-lg">
          {/* Search input */}
          <div className="border-border border-b p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="bg-background text-primary placeholder:text-secondary w-full rounded-lg px-3 py-2 text-sm outline-none"
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            {/* Clear option */}
            {value && (
              <button
                onClick={handleClear}
                className="text-secondary hover:bg-accent/10 w-full px-4 py-2 text-left text-sm"
              >
                ✕ Clear selection
              </button>
            )}

            {/* Loading */}
            {isFetching && (
              <div className="text-secondary px-4 py-3 text-center text-sm">Loading...</div>
            )}

            {/* Companies list */}
            {!isFetching && data?.companies?.map((company) => (
              <button
                key={company.company_name}
                onClick={() => handleSelect(company.company_name)}
                className={`hover:bg-accent/10 w-full px-4 py-2 text-left text-sm ${
                  value === company.company_name ? 'bg-accent/10 text-accent' : 'text-primary'
                }`}
              >
                {company.company_name}
                <span className="text-secondary ml-2">({company.count})</span>
              </button>
            ))}

            {/* No results */}
            {!isFetching && data?.companies?.length === 0 && (
              <div className="text-secondary px-4 py-3 text-center text-sm">
                No companies found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
