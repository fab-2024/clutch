import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '@/src/theme';

import { signInWithPassword, signUpWithPassword } from '../api';
import { authErrorMessage } from '../messages';
import { accountConfirmationRedirect } from '../redirects';
import AuthShell from './AuthShell';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const canSubmit = Boolean(
    email.trim()
    && password
    && (mode === 'signin'
      || (pseudo.trim().length >= 3 && password.length >= 8 && password === passwordConfirmation)),
  );

  function selectMode(nextMode: Mode) {
    if (loading || nextMode === mode) return;
    setMode(nextMode);
    setError(null);
    setConfirmationSent(false);
    setPassword('');
    setPasswordConfirmation('');
  }

  async function submit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    setConfirmationSent(false);

    try {
      if (mode === 'signin') {
        await signInWithPassword(email, password);
        return;
      }

      const result = await signUpWithPassword({
        email,
        password,
        pseudo,
        emailRedirectTo: accountConfirmationRedirect(),
      });
      if (result.confirmationRequired) {
        setConfirmationSent(true);
        setPassword('');
        setPasswordConfirmation('');
      }
    } catch (caught) {
      setError(authErrorMessage(
        caught,
        mode === 'signin' ? 'Connexion impossible pour le moment.' : 'Création du compte impossible pour le moment.',
      ));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow={mode === 'signin' ? 'RETOUR DANS L’ARENA' : 'NOUVEAU CHALLENGER'}
      subtitle={mode === 'signin'
        ? 'Retrouve tes pronostics, tes duels et ta faction.'
        : 'Crée ton identité Clutch. Tu choisiras ensuite tes jeux et ton équipe.'}
      title={mode === 'signin' ? 'Reprends ta place.' : 'Entre dans le game.'}
    >
      <View style={styles.modeSwitch}>
        <ModeButton active={mode === 'signin'} label="CONNEXION" onPress={() => selectMode('signin')} />
        <ModeButton active={mode === 'signup'} label="CRÉER UN COMPTE" onPress={() => selectMode('signup')} />
      </View>

      {confirmationSent ? (
        <View style={styles.successCard}>
          <Text style={styles.successEyebrow}>EMAIL ENVOYÉ</Text>
          <Text style={styles.successTitle}>Confirme ton inscription.</Text>
          <Text style={styles.successCopy}>
            Ouvre le lien reçu à {email.trim()}. Il te ramènera dans Clutch pour terminer ton profil.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => selectMode('signin')}>
            <Text style={styles.inlineAction}>REVENIR À LA CONNEXION →</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          {mode === 'signup' ? (
            <AuthField label="PSEUDO">
              <TextInput
                accessibilityLabel="Pseudo"
                autoCapitalize="none"
                autoComplete="username-new"
                maxLength={32}
                onChangeText={setPseudo}
                placeholder="Ton pseudo"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={pseudo}
              />
            </AuthField>
          ) : null}

          <AuthField label="EMAIL">
            <TextInput
              accessibilityLabel="Adresse email"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="toi@exemple.fr"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={email}
            />
          </AuthField>

          <AuthField
            action={passwordVisible ? 'MASQUER' : 'AFFICHER'}
            label="MOT DE PASSE"
            onAction={() => setPasswordVisible((visible) => !visible)}
          >
            <TextInput
              accessibilityLabel="Mot de passe"
              autoCapitalize="none"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              onChangeText={setPassword}
              onSubmitEditing={mode === 'signin' ? () => void submit() : undefined}
              placeholder={mode === 'signup' ? '8 caractères minimum' : '••••••••'}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!passwordVisible}
              style={styles.input}
              value={password}
            />
          </AuthField>

          {mode === 'signup' ? (
            <AuthField label="CONFIRMER LE MOT DE PASSE">
              <TextInput
                accessibilityLabel="Confirmation du mot de passe"
                autoCapitalize="none"
                autoComplete="new-password"
                onChangeText={setPasswordConfirmation}
                onSubmitEditing={() => void submit()}
                placeholder="Retape ton mot de passe"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!passwordVisible}
                style={styles.input}
                value={passwordConfirmation}
              />
            </AuthField>
          ) : null}

          {mode === 'signin' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/auth/forgot-password')}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>MOT DE PASSE OUBLIÉ ?</Text>
            </Pressable>
          ) : null}

          {mode === 'signup' && passwordConfirmation && password !== passwordConfirmation ? (
            <Text style={styles.error}>Les mots de passe ne correspondent pas.</Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit || loading}
            onPress={() => void submit()}
            style={({ pressed }) => [styles.button, (!canSubmit || loading) && styles.disabled, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>
              {loading
                ? (mode === 'signin' ? 'CONNEXION…' : 'CRÉATION…')
                : (mode === 'signin' ? 'ENTRER DANS CLUTCH' : 'CRÉER MON COMPTE')}
            </Text>
          </Pressable>
        </View>
      )}
    </AuthShell>
  );
}

function ModeButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.modeButton, active && styles.modeButtonActive]}
    >
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </Pressable>
  );
}

function AuthField({
  label,
  action,
  onAction,
  children,
}: {
  label: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {action && onAction ? (
          <Pressable accessibilityRole="button" onPress={onAction}>
            <Text style={styles.fieldAction}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  modeSwitch: { flexDirection: 'row', padding: 4, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  modeButton: { flex: 1, minHeight: 42, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: colors.volt },
  modeText: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  modeTextActive: { color: '#080B0F' },
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  labelRow: { minHeight: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  fieldAction: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  input: { minHeight: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: spacing.md, fontSize: 16 },
  forgotButton: { alignSelf: 'flex-end', minHeight: 30, justifyContent: 'center' },
  forgotText: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  error: { color: '#FF8B8B', fontSize: 12, lineHeight: 18 },
  button: { minHeight: 56, borderRadius: radius.md, backgroundColor: colors.volt, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  buttonText: { color: '#080B0F', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  successCard: { padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#45551E' },
  successEyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  successTitle: { color: colors.text, fontSize: 24, lineHeight: 28, fontWeight: '900' },
  successCopy: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  inlineAction: { marginTop: spacing.sm, color: colors.volt, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
});
