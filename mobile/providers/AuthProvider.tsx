import type { Session } from '@supabase/supabase-js';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/src/lib/supabase';

type ClutchProfile = {
  id: string;
  pseudo: string;
  email: string | null;
  equipe_favorite_id: string | null;
  jeux_suivis: string[];
};

type AuthContextValue = {
  session: Session | null;
  profile: ClutchProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

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

    const { data, error } = await supabase
      .from('profils')
      .select('id,pseudo,email,equipe_favorite_id,jeux_suivis')
      .eq('id', id)
      .single();

    if (error) throw error;
    setProfile({
      ...(data as Omit<ClutchProfile, 'jeux_suivis'> & { jeux_suivis?: string[] | null }),
      jeux_suivis: Array.isArray(data.jeux_suivis) ? data.jeux_suivis : [],
    });
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        try {
          await fetchProfile(data.session.user.id);
        } catch (error) {
          console.error('Impossible de charger le profil Clutch', error);
        }
      }
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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
