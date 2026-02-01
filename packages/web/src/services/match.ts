import type { MatchRequest, MatchResponse } from '@/types';

import { api } from './api';

export const matchApi = api.injectEndpoints({
  endpoints: (builder) => ({
    matchJobs: builder.query<MatchResponse, MatchRequest>({
      query: (body) => ({
        url: '/match',
        method: 'POST',
        body,
      }),
      providesTags: ['Match'],
    }),
  }),
});

export const { useMatchJobsQuery } = matchApi;
