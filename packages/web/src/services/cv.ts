import type {
  CVCompareRequest,
  CVCompareResponse,
  CVGenerateRequest,
  CVGenerateResponse,
} from '@/types';

import { api } from './api';

export const cvApi = api.injectEndpoints({
  endpoints: (builder) => ({
    generateCV: builder.mutation<CVGenerateResponse, CVGenerateRequest>({
      query: (body) => ({
        url: '/cv/generate',
        method: 'POST',
        body,
      }),
    }),

    compareCV: builder.mutation<CVCompareResponse, CVCompareRequest>({
      query: (body) => ({
        url: '/cv/compare',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useGenerateCVMutation, useCompareCVMutation } = cvApi;
