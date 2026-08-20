import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { supabase } from '@/src/lib/supabase';

import type { ClutchProfile } from './types';

export class ClutchProfileMissingError extends Error {
  constructor() {
    super('Le profil Clutch associé à cette session reste introuvable.');
    this.name = 'ClutchProfileMissingError';
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function subscribeToAuthStateChange(listener: (event: AuthChangeEvent, session: Session | null) => void) {
  let active = true;
  const pendingListeners = new Set<ReturnType<typeof setTimeout>>();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    // A Supabase request made from inside this callback can deadlock the client.
    const pendingListener = setTimeout(() => {
      pendingListeners.delete(pendingListener);
      if (active) listener(event, session);
    }, 0);
    pendingListeners.add(pendingListener);
  });

  return {
    unsubscribe() {
      active = false;
      pendingListeners.forEach(clearTimeout);
      pendingListeners.clear();
      subscription.unsubscribe();
    },
  };
}

export async function loadClutchProfile(userId: string): Promise<ClutchProfile> {
  const first = await fetchClutchProfile(userId);
  if (first) return first;

  const { data: repaired, error: repairError } = await supabase.rpc('clutch_assurer_mon_profil_v1');
  if (repairError) throw repairError;
  if (repaired !== true) throw new ClutchProfileMissingError();

  const recovered = await fetchClutchProfile(userId);
  if (!recovered) throw new ClutchProfileMissingError();
  return recovered;
}

async function fetchClutchProfile(userId: string): Promise<ClutchProfile | null> {
  const { data, error } = await supabase
    .from('profils')
    .select('id,pseudo,email,est_admin,equipe_favorite_id,jeux_suivis,profil_public')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    ...(data as Omit<ClutchProfile, 'jeux_suivis'> & { jeux_suivis?: string[] | null }),
    est_admin: Boolean(data.est_admin),
    jeux_suivis: Array.isArray(data.jeux_suivis) ? data.jeux_suivis : [],
    profil_public: data.profil_public !== false,
  };
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
