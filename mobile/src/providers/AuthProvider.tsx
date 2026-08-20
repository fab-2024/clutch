import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ClutchProfileMissingError,
  getCurrentSession,
  loadClutchProfile,
  subscribeToAuthStateChange,
} from '@/src/features/auth/api';
import type {
  AuthContextValue,
  AuthFailure,
  AuthStatus,
  ClutchProfile,
} from '@/src/features/auth/types';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ClutchProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<AuthFailure | null>(null);

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const sessionRef = useRef<Session | null>(null);
  const profileRef = useRef<ClutchProfile | null>(null);
  const statusRef = useRef<AuthStatus>('loading');

  const updateStatus = useCallback((nextStatus: AuthStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const updateSessionOnly = useCallback((nextSession: Session) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  const hydrateSession = useCallback(async (nextSession: Session | null, showLoading = true) => {
    const requestId = ++requestIdRef.current;
    sessionRef.current = nextSession;
    setSession(nextSession);
    setError(null);

    if (!nextSession) {
      profileRef.current = null;
      setProfile(null);
      updateStatus('signed_out');
      return null;
    }

    if (showLoading) updateStatus('loading');

    try {
      const nextProfile = await loadClutchProfile(nextSession.user.id);
      if (!mountedRef.current || requestId !== requestIdRef.current) return null;
      profileRef.current = nextProfile;
      setProfile(nextProfile);
      updateStatus('ready');
      return nextProfile;
    } catch (caught) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return null;
      profileRef.current = null;
      setProfile(null);

      if (caught instanceof ClutchProfileMissingError) {
        setError({
          scope: 'profile',
          message: 'La réparation automatique du profil n’a pas abouti.',
        });
        updateStatus('profile_missing');
        return null;
      }

      setError({
        scope: 'profile',
        message: 'Le profil Clutch ne peut pas être synchronisé pour le moment.',
      });
      updateStatus('error');
      return null;
    }
  }, [updateStatus]);

  const restoreSession = useCallback(async () => {
    updateStatus('loading');
    setError(null);
    try {
      await hydrateSession(await getCurrentSession());
    } catch {
      if (!mountedRef.current) return;
      ++requestIdRef.current;
      sessionRef.current = null;
      profileRef.current = null;
      setSession(null);
      setProfile(null);
      setError({
        scope: 'session',
        message: 'La session enregistrée ne peut pas être vérifiée.',
      });
      updateStatus('error');
    }
  }, [hydrateSession, updateStatus]);

  const refreshProfile = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) return null;
    const nextProfile = await hydrateSession(currentSession, false);
    if (!nextProfile) throw new Error('Le profil Clutch n’a pas pu être actualisé.');
    return nextProfile;
  }, [hydrateSession]);

  const retry = useCallback(async () => {
    if (sessionRef.current) {
      await hydrateSession(sessionRef.current);
      return;
    }
    await restoreSession();
  }, [hydrateSession, restoreSession]);

  useEffect(() => {
    mountedRef.current = true;
    let active = true;
    let initialHandled = false;

    function handleInitial(nextSession: Session | null) {
      if (!active || initialHandled) return;
      initialHandled = true;
      void hydrateSession(nextSession);
    }

    function handleAuthChange(event: AuthChangeEvent, nextSession: Session | null) {
      if (!active) return;
      if (event === 'INITIAL_SESSION') {
        handleInitial(nextSession);
        return;
      }

      initialHandled = true;

      if (!nextSession) {
        void hydrateSession(null);
        return;
      }

      const sameUser = sessionRef.current?.user.id === nextSession.user.id;
      const profileReady = Boolean(profileRef.current) && statusRef.current === 'ready';
      const profileLoading = sameUser && statusRef.current === 'loading';

      if (sameUser && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && (profileReady || profileLoading)) {
        updateSessionOnly(nextSession);
        return;
      }

      void hydrateSession(nextSession);
    }

    const subscription = subscribeToAuthStateChange(handleAuthChange);
    getCurrentSession()
      .then(handleInitial)
      .catch(() => {
        if (!active || initialHandled || !mountedRef.current) return;
        initialHandled = true;
        void restoreSession();
      });

    return () => {
      active = false;
      mountedRef.current = false;
      ++requestIdRef.current;
      subscription.unsubscribe();
    };
  }, [hydrateSession, restoreSession, updateSessionOnly]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      status,
      error,
      loading: status === 'loading',
      refreshProfile,
      retry,
    }),
    [error, profile, refreshProfile, retry, session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return context;
}
