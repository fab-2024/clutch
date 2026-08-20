import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '@/src/theme';

import { sendPasswordResetEmail } from '../api';
import { authErrorMessage } from '../messages';
import { passwordRecoveryRedirect } from '../redirects';
import AuthShell from './AuthShell';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    if (!email.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(email, passwordRecoveryRedirect());
      setSent(true);
    } catch (caught) {
      setError(authErrorMessage(caught, 'Impossible d’envoyer le lien pour le moment.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      backLabel="Connexion"
      eyebrow="ACCÈS AU COMPTE"
      onBack={() => router.back()}
      subtitle="Entre ton email. Tu recevras un lien sécurisé pour choisir un nouveau mot de passe."
      title="Récupère ton accès."
    >
      {sent ? (
        <View style={styles.statusCard}>
          <View style={styles.statusDot} />
          <Text style={styles.statusEyebrow}>VÉRIFIE TA BOÎTE MAIL</Text>
          <Text style={styles.statusTitle}>Le lien est parti.</Text>
          <Text style={styles.statusCopy}>
            Si un compte correspond à {email.trim()}, le message arrivera dans quelques instants. Pense aux indésirables.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setSent(false)} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>RENVOYER UN LIEN</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              accessibilityLabel="Adresse email du compte"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              onSubmitEditing={() => void sendLink()}
              placeholder="toi@exemple.fr"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={email}
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={!email.trim() || loading}
            onPress={() => void sendLink()}
            style={({ pressed }) => [styles.primaryButton, (!email.trim() || loading) && styles.disabled, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>{loading ? 'ENVOI…' : 'RECEVOIR LE LIEN'}</Text>
          </Pressable>
        </View>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  input: { minHeight: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: spacing.md, fontSize: 16 },
  error: { color: '#FF8B8B', fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  primaryText: { color: '#080B0F', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  statusCard: { padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#45551E' },
  statusDot: { width: 12, height: 12, marginBottom: spacing.sm, borderRadius: 6, backgroundColor: colors.volt },
  statusEyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  statusTitle: { color: colors.text, fontSize: 25, lineHeight: 29, fontWeight: '900' },
  statusCopy: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  secondaryButton: { minHeight: 46, marginTop: spacing.sm, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.text, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
});
