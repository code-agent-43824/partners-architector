import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type AuthUser, changePassword, fetchMe, login, logout } from '../api/auth';

const ME_KEY = ['me'] as const;

export function useMe() {
  return useQuery<AuthUser>({ queryKey: ME_KEY, queryFn: fetchMe, retry: false });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { email: string; password: string }) => login(vars.email, vars.password),
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.removeQueries({ queryKey: ME_KEY }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (vars: { currentPassword: string; newPassword: string }) =>
      changePassword(vars.currentPassword, vars.newPassword),
  });
}
