import { useGetMeQuery } from '@/services/auth.ts';
import { useGetProfileQuery } from '@/services/profile.ts';

export function useAuthStatus() {
  const token = localStorage.getItem('accessToken');
  const { data: userData, isLoading: isLoadingUser } = useGetMeQuery(undefined, { skip: !token });

  const isAuthenticated = !!token && !!userData?.user;

  const { data: profileData, isLoading: isLoadingProfile } = useGetProfileQuery(undefined, {
    skip: !isAuthenticated,
  });

  const hasProfile = !!profileData?.profile?.profileText;

  return {
    isAuthenticated,
    hasProfile,
    user: userData?.user || null,
    profileText: profileData?.profile?.profileText || null,
    isLoading: isLoadingProfile || isLoadingUser,
  };
}
