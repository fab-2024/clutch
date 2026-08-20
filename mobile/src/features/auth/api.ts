import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/src/lib/supabase';

import type { ClutchProfile } from './types';

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function subscribeToAuthStateChange(listener: (session: Session | null) => void) {
  let active = true;
  const pendingListeners = new Set<ReturnType<typeof setTimeout>>();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    // A Supabase request made from inside this callback can deadlock the client.
    const pendingListener = setTimeout(() => {
      pendingListeners.delete(pendingListener);
      if (active) listener(session);
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
  const { data, error } = await supabase
    .from('profils')
    .select('id,pseudo,email,equipe_favorite_id,jeux_suivis')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return {
    ...(data as Omit<ClutchProfile, 'jeux_suivis'> & { jeux_suivis?: string[] | null }),
    jeux_suivis: Array.isArray(data.jeux_suivis) ? data.jeux_suivis : [],
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
