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

export function DateFilter({ value, onChange, className = '' }: DateFilterProps) {
  const handleChange = (bucket: string) => {
    onChange(getDateValue(bucket));
  };

  // Determine current bucket from value
  const getCurrentBucket = (): string => {
    if (!value) return '';
    
    const date = new Date(value);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return 'today';
    if (diffDays <= 7) return 'week';
    if (diffDays <= 30) return 'month';
    return '';
  };

  return (
    <select
      value={getCurrentBucket()}
      onChange={(e) => handleChange(e.target.value)}
      className={`bg-card border-border text-primary focus:border-accent h-12 rounded-xl border px-4 text-sm outline-none ${className}`}
    >
      {DATE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
