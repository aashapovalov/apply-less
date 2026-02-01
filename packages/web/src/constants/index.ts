import type { LoadingStep } from '@/types';

export const JOBS_PER_PAGE = 20;
export const MAX_MATCHES = 500;

export const REGION_LABELS: Record<string, string> = {
  central: 'Central',
  north: 'North',
  south: 'South',
  jerusalem: 'Jerusalem',
  remote: 'Remote',
  other: 'Other',
};

export const INITIAL_STEPS: LoadingStep[] = [
  { label: 'Analyzing job requirements', status: 'pending' },
  { label: 'Identifying skill gaps', status: 'pending' },
  { label: 'Tailoring your experience', status: 'pending' },
  { label: 'Comparing CV with position', status: 'pending' },
  { label: 'Calculating match score', status: 'pending' },
];

export const MIN_PROFILE_WORDS = 100;
