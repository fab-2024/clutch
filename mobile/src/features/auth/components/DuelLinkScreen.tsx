import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppAtmosphere } from '@/src/components/layout/AppAtmosphere';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, typography } from '@/src/theme';

import { rememberPendingRoute, safePendingRoute } from '../pendingRoute';

export default function DuelLinkScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const { session, status } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const destination = useMemo(() => safePendingRoute(token ? `/duel/${token}` : null), [token]);

  useEffect(() => {
    if (!destination || status === 'loading') return;
    if (session) {
      router.replace(destination as never);
      return;
    }
    rememberPendingRoute(destination)
      .then(() => router.replace({ pathname: '/login', params: { next: destination } }))
      .catch(() => setError('Impossible de conserver cette invitation sur cet appareil.'));
  }, [destination, session, status]);

  return (
    <View style={styles.root}>
      <AppAtmosphere />
      {error || !destination ? <Text style={styles.error}>{error ?? 'Cette invitation est invalide.'}</Text> : <><ActivityIndicator color={colors.volt} /><Text style={styles.text}>OUVERTURE DU DUEL…</Text></>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 13, padding: 24, backgroundColor: colors.atmosphereBottom },
  text: { ...typography.label, color: colors.textMuted },
  error: { ...typography.body, color: '#FF9AA2', textAlign: 'center' },
});
