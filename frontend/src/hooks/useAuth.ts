import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

export function useAuth() {
  const queryClient = useQueryClient();
  const { user, setUser, logout: storeLogout } = useAuthStore();

  const query = useQuery({
    queryKey: ['authUser'],
    queryFn: async () => {
      try {
        const response = await api.get('/auth/me');
        return response.data?.user || null;
      } catch (error) {
        return null;
      }
    },
    retry: false,
    staleTime: Infinity
  });

  useEffect(() => {
    if (!query.isPending) {
      if (query.data) {
        setUser(query.data);
      } else {
        storeLogout();
      }
    }
  }, [query.isPending, query.data, setUser, storeLogout]);

  const loginUser = (userData: any) => {
    queryClient.setQueryData(['authUser'], userData);
    setUser(userData);
  };

  const logoutUser = async (onComplete?: () => void) => {
    try {
      const res = await api.post('/auth/logout');
      if (res.data?.farewell && user?.nudgesEnabled !== false) {
        window.dispatchEvent(
          new CustomEvent('omvik_mascot_nudge', {
            detail: { message: res.data.farewell, isFarewell: true }
          })
        );
        // Brief ~2s delay so user reads the mascot farewell message
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      queryClient.setQueryData(['authUser'], null);
      storeLogout();
      if (onComplete) onComplete();
    }
  };

  return {
    user,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    login: loginUser,
    logout: logoutUser,
    refetch: query.refetch
  };
}

export default useAuth;
