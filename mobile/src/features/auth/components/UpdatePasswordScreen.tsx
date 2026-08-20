import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radius, spacing } from '@/src/theme';

import { exchangeAuthCodeForSession, updatePassword } from '../api';
import { authErrorMessage } from '../messages';
import AuthShell from './AuthShell';

export default function UpdatePasswordScreen() {
  const params = useLocalSearchParams<{ code?: string | string[]; error_description?: string | string[] }>();
  const { profile, status } = useAuth();
  const startedRef = useRef(false);
  const [linkReady, setLinkReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const code = firstParam(params.code);
  const providerError = firstParam(params.error_description);
  const canSubmit = password.length >= 8 && password === confirmation && !saving;

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (providerError || !code) {
      setError('Ce lien de récupération est invalide ou a expiré. Demande un nouveau lien.');
      return;
    }

    exchangeAuthCodeForSession(code)
      .then(() => setLinkReady(true))
      .catch((caught) => setError(authErrorMessage(caught, 'Impossible de valider ce lien de récupération.')));
  }, [code, providerError]);

  async function savePassword() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await updatePassword(password);
      setChanged(true);
      setPassword('');
      setConfirmation('');
    } catch (caught) {
      setError(authErrorMessage(caught, 'Impossible de modifier le mot de passe pour le moment.'));
    } finally {
      setSaving(false);
    }
  }

  function enterClutch() {
    const needsOnboarding = Boolean(profile && (!profile.jeux_suivis.length || !profile.equipe_favorite_id));
    router.replace(needsOnboarding ? '/onboarding' : '/(tabs)');
  }

  return (
    <AuthShell
      eyebrow="SÉCURITÉ DU COMPTE"
      subtitle={changed
        ? 'Ton accès est de nouveau sécurisé.'
        : 'Choisis un mot de passe unique que tu n’utilises pas ailleurs.'}
      title={changed ? 'Mot de passe modifié.' : 'Nouveau mot de passe.'}
    >
      {error && !linkReady ? (
        <View style={styles.errorCard}>
          <Text style={styles.error}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/auth/forgot-password')} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>DEMANDER UN NOUVEAU LIEN</Text>
          </Pressable>
        </View>
      ) : !linkReady ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.volt} />
          <Text style={styles.loadingText}>Vérification du lien…</Text>
        </View>
      ) : changed ? (
        <View style={styles.successCard}>
          <View style={styles.successMark}><Text style={styles.successMarkText}>✓</Text></View>
          <Text style={styles.successTitle}>C’est bon.</Text>
          <Text style={styles.successCopy}>Tu peux reprendre exactement là où tu t’étais arrêté.</Text>
          <Pressable
            accessibilityRole="button"
            disabled={status === 'loading'}
            onPress={enterClutch}
            style={[styles.primaryButton, status === 'loading' && styles.disabled]}
          >
            <Text style={styles.primaryText}>{status === 'loading' ? 'PRÉPARATION…' : 'REVENIR DANS CLUTCH'}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>NOUVEAU MOT DE PASSE</Text>
              <Pressable accessibilityRole="button" onPress={() => setPasswordVisible((visible) => !visible)}>
                <Text style={styles.showText}>{passwordVisible ? 'MASQUER' : 'AFFICHER'}</Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Nouveau mot de passe"
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={setPassword}
              placeholder="8 caractères minimum"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!passwordVisible}
              style={styles.input}
              value={password}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>CONFIRMER LE MOT DE PASSE</Text>
            <TextInput
              accessibilityLabel="Confirmation du nouveau mot de passe"
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={setConfirmation}
              onSubmitEditing={() => void savePassword()}
              placeholder="Retape ton mot de passe"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!passwordVisible}
              style={styles.input}
              value={confirmation}
            />
          </View>
          {confirmation && password !== confirmation ? <Text style={styles.error}>Les mots de passe ne correspondent pas.</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={() => void savePassword()}
            style={({ pressed }) => [styles.primaryButton, !canSubmit && styles.disabled, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>{saving ? 'MISE À JOUR…' : 'ENREGISTRER LE MOT DE PASSE'}</Text>
          </Pressable>
        </View>
      )}
    </AuthShell>
  );
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  labelRow: { minHeight: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  showText: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  input: { minHeight: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: spacing.md, fontSize: 16 },
  error: { color: '#FF8B8B', fontSize: 12, lineHeight: 18 },
  errorCard: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#6D353B' },
  loadingCard: { padding: spacing.xl, gap: spacing.md, alignItems: 'center', borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  loadingText: { color: colors.textMuted, fontSize: 12 },
  successCard: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#45551E' },
  successMark: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  successMarkText: { color: '#080B0F', fontSize: 22, fontWeight: '900' },
  successTitle: { color: colors.text, fontSize: 25, fontWeight: '900' },
  successCopy: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  primaryButton: { minHeight: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  primaryText: { color: '#080B0F', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  secondaryButton: { minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.text, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
});
