import type {
  CitiesResponse,
  CompaniesResponse,
  JobDetail,
  JobsQueryParams,
  JobsResponse,
  RegionsResponse,
} from '@/types';

import { api } from './api';

export const jobsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getJobs: builder.query<JobsResponse, JobsQueryParams>({
      query: (params) => ({
        url: '/jobs',
        params: {
          limit: params.limit,
          offset: params.offset,
          search: params.search,
          location: params.location,
          region: params.region,
          city: params.city,
          company: params.company,
          title: params.title,
          postedAfter: params.postedAfter,
        },
      }),
      providesTags: ['Jobs'],
    }),

    getJob: builder.query<JobDetail, number>({
      query: (id) => `/jobs/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Jobs', id }],
    }),

    getRegions: builder.query<RegionsResponse, void>({
      query: () => '/jobs/regions',
      providesTags: ['Regions'],
    }),

    getCities: builder.query<CitiesResponse, string | void>({
      query: (region) => ({
        url: '/jobs/cities',
        params: region ? { region } : undefined,
      }),
      providesTags: ['Cities'],
    }),

    getCompanies: builder.query<CompaniesResponse, { search?: string; limit?: number }>({
      query: (params) => ({
        url: '/jobs/companies',
        params: {
          search: params.search,
          limit: params.limit || 20,
        },
      }),
      providesTags: ['Companies'],
    }),
  }),
});

export const {
  useGetJobsQuery,
  useGetJobQuery,
  useGetRegionsQuery,
  useGetCitiesQuery,
  useGetCompaniesQuery,
} = jobsApi;
