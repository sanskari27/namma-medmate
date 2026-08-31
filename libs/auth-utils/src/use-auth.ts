import { useMemo } from 'react';

export interface AuthView {
  isAuthenticated: boolean;
  subject?: string;
}

export function useAuth(session: { authenticated: boolean; sub?: string } | undefined): AuthView {
  return useMemo(() => {
    if (!session || !session.authenticated || !session.sub) {
      return { isAuthenticated: false };
    }
    return { isAuthenticated: true, subject: session.sub };
  }, [session]);
}

export function usePermission(_permission: string, session: AuthView): boolean {
  return session.isAuthenticated;
}
