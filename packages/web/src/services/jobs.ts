import type { JobDetail, JobsQueryParams, JobsResponse } from '@/types';

import { api } from './api';

export const jobsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getJobs: builder.query<JobsResponse, JobsQueryParams>({
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

    getJob: builder.query<JobDetail, number>({
      query: (id) => `/jobs/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Jobs', id }],
    }),
  }),
});

export const { useGetJobsQuery, useGetJobQuery } = jobsApi;
