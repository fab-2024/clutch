import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radius, spacing, typography } from '@/src/theme';

import { exchangeAuthCodeForSession } from '../api';
import { authErrorMessage } from '../messages';
import { rememberPendingRoute, safePendingRoute } from '../pendingRoute';
import AuthShell from './AuthShell';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string | string[]; error_description?: string | string[]; next?: string | string[] }>();
  const { profile, session, status } = useAuth();
  const startedRef = useRef(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const code = firstParam(params.code);
  const providerError = firstParam(params.error_description);
  const requestedRoute = safePendingRoute(firstParam(params.next));

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (providerError || !code) {
      setError('Ce lien de confirmation est invalide ou a expiré. Recommence depuis la connexion.');
      return;
    }

    if (requestedRoute) void rememberPendingRoute(requestedRoute);
    exchangeAuthCodeForSession(code)
      .then(() => setConfirmed(true))
      .catch((caught) => setError(authErrorMessage(caught, 'La confirmation du compte a échoué.')));
  }, [code, providerError, requestedRoute]);

  useEffect(() => {
    if (!confirmed || !session || !profile || status !== 'ready') return;
    const needsOnboarding = !profile.jeux_suivis.length || !profile.equipe_favorite_id;
    router.replace(needsOnboarding ? '/onboarding' : '/(tabs)');
  }, [confirmed, profile, session, status]);

  return (
    <AuthShell
      eyebrow="VALIDATION DU COMPTE"
      subtitle="GRIFF vérifie le lien et prépare ton profil."
      title={error ? 'Lien non valide.' : 'Dernière vérification.'}
    >
      <View style={[styles.card, error && styles.errorCard]}>
        {error ? (
          <>
            <Text style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/login')} style={styles.button}>
              <Text style={styles.buttonText}>Revenir à la connexion</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.volt} />
            <Text style={styles.cardTitle}>{confirmed ? 'Profil en préparation…' : 'Confirmation en cours…'}</Text>
            <Text style={styles.copy}>Ne ferme pas cette page, cela ne prend que quelques secondes.</Text>
          </>
        )}
      </View>
    </AuthShell>
  );
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.md, alignItems: 'center', borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  errorCard: { alignItems: 'stretch', borderColor: '#6D353B' },
  cardTitle: { ...typography.cardTitle, color: colors.text, textAlign: 'center' },
  copy: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  error: { ...typography.body, color: '#FF9AA2' },
  button: { minHeight: 52, marginTop: spacing.sm, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  buttonText: { ...typography.action, color: '#080B0F', letterSpacing: .3 },
});
