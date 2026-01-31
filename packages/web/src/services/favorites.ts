import type { AddFavoriteResponse, FavoritesResponse, IsFavoriteResponse } from '@/types';

import { api } from './api';

export const favoritesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFavorites: builder.query<FavoritesResponse, void>({
      query: () => '/favorites',
      providesTags: ['Favorites'],
    }),

    checkFavorite: builder.query<IsFavoriteResponse, number>({
      query: (jobId) => `/favorites/${jobId}`,
      providesTags: (_result, _error, jobId) => [{ type: 'Favorites', id: jobId }],
    }),

    addFavorite: builder.mutation<AddFavoriteResponse, number>({
      query: (jobId) => ({
        url: `/favorites/${jobId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Favorites'],
    }),

    removeFavorite: builder.mutation<{ message: string }, number>({
      query: (jobId) => ({
        url: `favorites/${jobId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Favorites'],
    }),
  }),
});

export const {
  useGetFavoritesQuery,
  useCheckFavoriteQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} = favoritesApi;
