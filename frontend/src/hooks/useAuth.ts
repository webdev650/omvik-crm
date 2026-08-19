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

  const logoutUser = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      queryClient.setQueryData(['authUser'], null);
      storeLogout();
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
