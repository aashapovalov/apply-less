import { cn, getPagesNumber } from '@/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="text-secondary hover:text-primary rounded-lg px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        ← Prev
      </button>
      {getPagesNumber(page, totalPages).map((pageNum, index) =>
        pageNum === '...' ? (
          <span key={`ellipsis-${index}`} className="text-muted px-2">
            ...
          </span>
        ) : (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum as number)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm transition-colors',
              page === pageNum
                ? 'bg-accent text-white'
                : 'text-secondary hover:bg-background hover:text-primary'
            )}
          >
            {pageNum}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="text-secondary hover:text-primary rounded-lg px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next →
      </button>
    </div>
  );
}
