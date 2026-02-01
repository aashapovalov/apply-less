import type { ViewMode } from '@/types';

export function getJobsHeaderText(viewMode: ViewMode, total: number) {
  switch (viewMode) {
    case 'favorites':
      return {
        title: 'My Favorites',
        subtitle: total ? `${total} saved job${total !== 1 ? 's' : ''}` : 'No saved jobs yet',
      };
    case 'matches':
      return {
        title: 'Job Matches',
        subtitle: total ? `${total.toLocaleString()} jobs ranked by relevance` : 'No matches found',
      };
    default:
      return {
        title: 'Browse Jobs',
        subtitle: total ? `${total.toLocaleString()} jobs` : 'Find your next opportunity',
      };
  }
}
