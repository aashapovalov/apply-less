import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'applyless_role_history';
const MAX_HISTORY = 5;

interface RoleInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function RoleInput({ value, onChange, className = '' }: RoleInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Save to history
  const saveToHistory = useCallback((term: string) => {
    if (!term.trim()) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let current: string[] = stored ? JSON.parse(stored) : [];

      // Remove duplicate if exists
      current = current.filter((h) => h.toLowerCase() !== term.toLowerCase());

      // Add to front
      current.unshift(term.trim());

      // Keep only MAX_HISTORY items
      current = current.slice(0, MAX_HISTORY);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      setHistory(current);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

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

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (trimmed && trimmed !== value) {
      saveToHistory(trimmed);
    }
    onChange(trimmed);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleHistorySelect = (term: string) => {
    setInputValue(term);
    onChange(term);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setIsOpen(false);
  };

  const filteredHistory = history.filter((h) => h.toLowerCase().includes(inputValue.toLowerCase()));

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(handleSubmit, 150)}
          placeholder="Search role..."
          className="bg-card border-border text-primary placeholder:text-secondary focus:border-accent h-12 w-full rounded-xl border px-4 pr-10 text-sm outline-none"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="text-secondary hover:text-primary absolute top-1/2 right-3 -translate-y-1/2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* History dropdown */}
      {isOpen && filteredHistory.length > 0 && (
        <div className="bg-card border-border absolute z-50 mt-1 w-full rounded-xl border shadow-lg">
          <div className="text-secondary px-4 py-2 text-xs">Recent searches</div>
          {filteredHistory.map((term, index) => (
            <button
              key={index}
              onClick={() => handleHistorySelect(term)}
              className="text-primary hover:bg-accent/10 flex w-full items-center gap-2 px-4 py-2 text-left text-sm"
            >
              <svg
                className="text-secondary h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {term}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
