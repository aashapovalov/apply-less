import { CompanySearch } from '@/components/jobs';
import { DateFilter, RegionFilter, RoleInput } from '@/components/jobs/filters';
import { REGION_LABELS } from '@/constants';
import type { JobFilters, RegionCount } from '@/types';
import { getDateLabel } from '@/utils';

interface JobsFiltersProps {
  filters: JobFilters;
  regions: RegionCount[];
  hasActiveFilters: boolean;
  onFilterChange: (key: keyof JobFilters, value: string) => void;
  onClearFilters: () => void;
}

export function JobsFilters({
  filters,
  regions,
  hasActiveFilters,
  onFilterChange,
  onClearFilters,
}: JobsFiltersProps) {
  return (
    <div className="mb-6">
      {/* Filter inputs */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <RoleInput
            value={filters.title}
            onChange={(v) => onFilterChange('title', v)}
            className="flex-1"
          />
          <CompanySearch
            value={filters.company}
            onChange={(v) => onFilterChange('company', v)}
            className="sm:w-64"
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <RegionFilter
            value={filters.region}
            onChange={(v) => onFilterChange('region', v)}
            regions={regions}
            className="flex-1"
          />
          <DateFilter
            value={filters.postedAfter}
            onChange={(v) => onFilterChange('postedAfter', v)}
            className="sm:w-48"
          />
        </div>
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.title && (
            <FilterPill
              label={`Role: ${filters.title}`}
              onRemove={() => onFilterChange('title', '')}
            />
          )}
          {filters.company && (
            <FilterPill
              label={`Company: ${filters.company}`}
              onRemove={() => onFilterChange('company', '')}
            />
          )}
          {filters.region && (
            <FilterPill
              label={`Region: ${REGION_LABELS[filters.region] || filters.region}`}
              onRemove={() => onFilterChange('region', '')}
            />
          )}
          {filters.postedAfter && (
            <FilterPill
              label={`Posted: ${getDateLabel(filters.postedAfter)}`}
              onRemove={() => onFilterChange('postedAfter', '')}
            />
          )}
          <button
            onClick={onClearFilters}
            className="text-secondary hover:text-primary text-sm underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

interface FilterPillProps {
  label: string;
  onRemove: () => void;
}

function FilterPill({ label, onRemove }: FilterPillProps) {
  return (
    <span className="bg-accent/10 text-accent inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm">
      {label}
      <button onClick={onRemove} className="hover:bg-accent/20 ml-1 rounded-full p-0.5">
        ×
      </button>
    </span>
  );
}
