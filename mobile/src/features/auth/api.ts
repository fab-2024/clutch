import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { supabase } from '@/src/lib/supabase';

import type { ClutchProfile } from './types';

const authCodeExchanges = new Map<string, Promise<Session>>();

export class ClutchProfileMissingError extends Error {
  constructor() {
    super('Le profil GRIFF associé à cette session reste introuvable.');
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

export async function signUpWithPassword({
  email,
  password,
  pseudo,
  minimumAgeConfirmed,
  emailRedirectTo,
}: {
  email: string;
  password: string;
  pseudo: string;
  minimumAgeConfirmed: boolean;
  emailRedirectTo: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        pseudo: pseudo.trim(),
        age_minimum_confirme: minimumAgeConfirmed,
        age_minimum_version: '2026-08-22',
      },
      emailRedirectTo,
    },
  });
  if (error) throw error;
  return { confirmationRequired: !data.session };
}

export async function sendPasswordResetEmail(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw error;
}

export async function exchangeAuthCodeForSession(code: string): Promise<Session> {
  const normalizedCode = code.trim();
  const pendingExchange = authCodeExchanges.get(normalizedCode);
  if (pendingExchange) return pendingExchange;

  const exchange = (async () => {
    const { data, error } = await supabase.auth.exchangeCodeForSession(normalizedCode);
    if (error) throw error;
    return data.session;
  })();

  authCodeExchanges.set(normalizedCode, exchange);
  try {
    const session = await exchange;
    setTimeout(() => {
      if (authCodeExchanges.get(normalizedCode) === exchange) {
        authCodeExchanges.delete(normalizedCode);
      }
    }, 60_000);
    return session;
  } catch (error) {
    authCodeExchanges.delete(normalizedCode);
    throw error;
  }
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
