import type { MatchRequest, MatchResponse } from '@/types';

import { api } from './api';

export const matchApi = api.injectEndpoints({
  endpoints: (builder) => ({
    matchJobs: builder.mutation<MatchResponse, MatchRequest>({
      query: (body) => ({
        url: '/match',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useMatchJobsMutation } = matchApi;
