import type { Session } from '@supabase/supabase-js';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import {
  getCurrentSession,
  loadClutchProfile,
  subscribeToAuthStateChange,
} from '@/src/features/auth/api';
import type { AuthContextValue, ClutchProfile } from '@/src/features/auth/types';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ClutchProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId?: string) {
    const id = userId ?? session?.user.id;
    if (!id) {
      setProfile(null);
      return;
    }

    setProfile(await loadClutchProfile(id));
  }

  useEffect(() => {
    let mounted = true;

    getCurrentSession()
      .then(async (initialSession) => {
        if (!mounted) return;
        setSession(initialSession);
        if (initialSession) {
          try {
            await fetchProfile(initialSession.user.id);
          } catch (error) {
            console.error('Impossible de charger le profil Clutch', error);
          }
        }
        if (mounted) setLoading(false);
      })
      .catch((error) => {
        console.error('Impossible de restaurer la session Clutch', error);
        if (mounted) setLoading(false);
      });

    const subscription = subscribeToAuthStateChange((nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      fetchProfile(nextSession.user.id)
        .catch((error) => console.error('Impossible de charger le profil Clutch', error))
        .finally(() => setLoading(false));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      refreshProfile: async () => fetchProfile(),
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return context;
}
