import type { ParseFileResponse, ProfileResponse, SaveProfileResponse } from '@/types';

import { api } from './api';

export const profileApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<ProfileResponse, void>({
      query: () => '/profile',
      providesTags: ['Profile'],
    }),

    saveProfile: builder.mutation<SaveProfileResponse, { profileText: string }>({
      query: (body) => ({
        url: '/profile',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Profile'],
    }),

    deleteProfile: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/profile',
        method: 'DELETE',
      }),
      invalidatesTags: ['Profile'],
    }),

    parseFile: builder.mutation<ParseFileResponse, FormData>({
      query: (FormData) => ({
        url: 'profile/parse',
        method: 'POST',
        body: FormData,
      }),
    }),
  }),
});

export const {
  useGetProfileQuery,
  useSaveProfileMutation,
  useDeleteProfileMutation,
  useParseFileMutation,
} = profileApi;
