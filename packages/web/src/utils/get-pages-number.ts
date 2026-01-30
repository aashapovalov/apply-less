export function getPagesNumber(page: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  const showEllipsisStart = page > 3;
  const showEllipsisEnd = page < totalPages - 2;

  pages.push(1);

  if (showEllipsisStart) {
    pages.push('...');
  }

  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
    if (!pages.includes(i)) {
      pages.push(i);
    }
  }

  if (showEllipsisEnd) {
    pages.push('...');
  }

  if (totalPages > 1 && !pages.includes(totalPages)) {
    pages.push(totalPages);
  }

  return pages;
}
