import { router, useSegments } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/src/providers/AuthProvider';

import { loadNextUnseenMatchResult } from '../api';

export default function ResultRevealGate() {
  const { profile, session, status } = useAuth();
  const segments = useSegments();
  const segmentsRef = useRef<readonly string[]>(segments);
  const busyRef = useRef(false);
  const lastPushedIdRef = useRef<string | null>(null);
  const userId = session?.user.id;
  const profileReady = Boolean(profile?.id && profile.jeux_suivis.length && profile.equipe_favorite_id);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  const checkForResult = useCallback(async () => {
    const firstSegment = segmentsRef.current[0];
    if (
      status !== 'ready'
      || !userId
      || !profileReady
      || busyRef.current
      || firstSegment === 'result'
      || firstSegment === 'onboarding'
      || firstSegment === 'auth'
      || firstSegment === 'login'
    ) return;

    busyRef.current = true;
    try {
      const next = await loadNextUnseenMatchResult();
      if (!next || next.id === lastPushedIdRef.current) return;
      lastPushedIdRef.current = next.id;
      router.push({ pathname: '/result/[id]', params: { id: next.match_id } });
    } catch (caught) {
      console.warn('Révélation après-match indisponible', caught);
    } finally {
      busyRef.current = false;
    }
  }, [profileReady, status, userId]);

  useEffect(() => {
    void checkForResult();
  }, [checkForResult]);

  useEffect(() => {
    function handleAppState(nextState: AppStateStatus) {
      if (nextState !== 'active') {
        lastPushedIdRef.current = null;
        return;
      }
      void checkForResult();
    }

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [checkForResult]);

  return null;
}
