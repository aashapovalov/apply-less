import type { Job, JobQueryParams, JobResponse } from '@/types';

import { api } from './api.ts';

export const jobsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getJobs: builder.query<JobResponse, JobQueryParams>({
      query: (params) => ({
        url: '/jobs',
        params: {
          limit: params.limit,
          offset: params.offset,
          location: params.location,
          company: params.company,
        },
      }),
      providesTags: ['Jobs'],
    }),

    getJob: builder.query<{ job: Job }, number>({
      query: (id) => `jobs/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Jobs', id }],
    }),
  }),
});

export const { useGetJobsQuery, useGetJobQuery } = jobsApi;
