import type { ReactNode } from 'react';

import type { ViewMode } from '@/types';
import { cn } from '@/utils';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  hasProfile: boolean;
  isAuthenticated: boolean;
  favoritesCount: number;
}

export function ViewToggle({
  value,
  onChange,
  hasProfile,
  isAuthenticated,
  favoritesCount,
}: ViewToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-secondary text-sm">View:</span>
      <div className="bg-secondary/10 flex rounded-lg p-1">
        <ToggleButton active={value === 'all'} onClick={() => onChange('all')}>
          All Jobs
        </ToggleButton>
        <ToggleButton
          active={value === 'matches'}
          onClick={() => onChange('matches')}
          disabled={!hasProfile}
          title={
            !isAuthenticated
              ? 'Login to see matches'
              : !hasProfile
                ? 'Create profile to see matches'
                : 'Jobs matched to your profile'
          }
        >
          Matches
        </ToggleButton>
        <ToggleButton
          active={value === 'favorites'}
          onClick={() => onChange('favorites')}
          disabled={!isAuthenticated}
          title={!isAuthenticated ? 'Login to see favorites' : 'View saved jobs'}
        >
          Favorites
          {isAuthenticated && favoritesCount > 0 && (
            <span className="bg-favorite/20 text-favorite ml-1.5 rounded-full px-1.5 py-0.5 text-xs">
              {favoritesCount}
            </span>
          )}
        </ToggleButton>
      </div>
    </div>
  );
}

interface ToggleButtonProps {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
}

function ToggleButton({ active, onClick, disabled, title, children }: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-card text-primary shadow-sm' : 'text-secondary hover:text-primary',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {children}
    </button>
  );
}
