import type { FavoriteJob, Job } from '@/types';

export function transformFavoriteToJob(fav: FavoriteJob): Job {
  return {
    job_id: fav.jobId,
    title: fav.title,
    company_name: fav.companyName,
    location: fav.location,
    region: null,
    city: null,
    tags: fav.tags || [],
    url: fav.url,
    posted_date: fav.postedDate || fav.savedAt,
  };
}
