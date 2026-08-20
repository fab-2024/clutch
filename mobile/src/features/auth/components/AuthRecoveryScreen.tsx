import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radius, spacing } from '@/src/theme';

import { signOut } from '../api';

export default function AuthRecoveryScreen() {
  const { error, retry, session, status } = useAuth();
  const [busyAction, setBusyAction] = useState<'retry' | 'signout' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const missingProfile = status === 'profile_missing';
  const sessionFailure = error?.scope === 'session';
  const title = missingProfile
    ? 'ON RÉPARE TON PROFIL.'
    : sessionFailure
      ? 'RECONNECTONS CLUTCH.'
      : 'TON COMPTE NE RÉPOND PAS.';
  const copy = missingProfile
    ? 'Ton compte est bien connecté. Il reste seulement à récupérer ton profil Clutch.'
    : sessionFailure
      ? 'La session enregistrée ne répond plus. Une nouvelle tentative suffit généralement.'
      : 'Tes données sont toujours là, mais elles sont momentanément indisponibles.';

  async function retryAuth() {
    if (busyAction) return;
    setBusyAction('retry');
    setActionError(null);
    try {
      await retry();
    } catch {
      setActionError('La nouvelle tentative n’a pas abouti.');
    } finally {
      setBusyAction(null);
    }
  }

  async function leaveSession() {
    if (busyAction) return;
    setBusyAction('signout');
    setActionError(null);
    try {
      await signOut();
    } catch {
      setActionError('Impossible de fermer la session pour le moment.');
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <Screen>
      <View style={styles.shell}>
        <View style={styles.brandRow}>
          <View style={styles.logo}><Text style={styles.logoText}>C</Text></View>
          <Text style={styles.brand}>CLUTCH<Text style={styles.brandDot}>.</Text></Text>
        </View>

        <View style={styles.signal}>
          <View style={styles.signalRing} />
          <View style={styles.signalDot} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>CONNEXION</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{copy}</Text>
          {actionError ? <Text style={styles.detail}>{actionError}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityLabel="Réessayer la synchronisation"
            accessibilityRole="button"
            disabled={Boolean(busyAction)}
            onPress={() => void retryAuth()}
            style={({ pressed }) => [styles.primary, busyAction && styles.disabled, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>{busyAction === 'retry' ? 'SYNCHRONISATION…' : 'RÉESSAYER'}</Text>
          </Pressable>

          {session ? (
            <Pressable
              accessibilityLabel="Se déconnecter"
              accessibilityRole="button"
              disabled={Boolean(busyAction)}
              onPress={() => void leaveSession()}
              style={({ pressed }) => [styles.secondary, busyAction && styles.disabled, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>{busyAction === 'signout' ? 'DÉCONNEXION…' : 'SE DÉCONNECTER'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  logoText: { color: '#06090C', fontSize: 24, lineHeight: 27, fontWeight: '900', letterSpacing: -2 },
  brand: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  brandDot: { color: colors.volt },
  signal: { position: 'relative', width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  signalRing: { position: 'absolute', width: 104, height: 104, borderRadius: 52, borderWidth: 1, borderColor: '#46551E' },
  signalDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.volt },
  copy: { gap: spacing.sm },
  eyebrow: { color: colors.volt, fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  title: { maxWidth: 390, color: colors.text, fontSize: 39, lineHeight: 40, fontWeight: '900', letterSpacing: -1.6 },
  body: { maxWidth: 380, color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  detail: { color: '#FF9AA2', fontSize: 11, lineHeight: 17 },
  actions: { gap: spacing.sm },
  primary: { minHeight: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  primaryText: { color: '#080B0F', fontSize: 12, fontWeight: '900', letterSpacing: 0.9 },
  secondary: { minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.text, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.78 },
});
