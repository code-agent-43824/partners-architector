import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type AuthUser,
  changePassword,
  fetchMe,
  login,
  logout,
  updatePreferences,
} from '../api/auth';

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

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { guidedMode: boolean }) => updatePreferences(vars.guidedMode),
    // Optimistic: a settings toggle must flip instantly; roll back on error.
    onMutate: (vars) => {
      const previous = queryClient.getQueryData<AuthUser>(ME_KEY);
      if (previous) {
        queryClient.setQueryData<AuthUser>(ME_KEY, { ...previous, guidedMode: vars.guidedMode });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ME_KEY, context.previous);
      }
    },
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  });
}
