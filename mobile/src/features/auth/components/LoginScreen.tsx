import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import ClutchCore from '@/src/components/visual/ClutchCore';
import { errorFeedback, impactFeedback, selectionFeedback, successFeedback } from '@/src/lib/feedback';
import { colors, fonts, radius, spacing } from '@/src/theme';

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
  const [focusedField, setFocusedField] = useState<string | null>(null);
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
    selectionFeedback();
  }

  async function submit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    setConfirmationSent(false);
    impactFeedback();

    try {
      if (mode === 'signin') {
        await signInWithPassword(email, password);
        successFeedback();
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
      successFeedback();
    } catch (caught) {
      errorFeedback();
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
      visual={<ClutchCore compact label="AUTH // READY" size={170} />}
    >
      <View style={styles.authContent}>
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
                  onBlur={() => setFocusedField(null)}
                  onFocus={() => setFocusedField('pseudo')}
                  placeholder="Ton pseudo"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, focusedField === 'pseudo' && styles.inputFocused]}
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
                onBlur={() => setFocusedField(null)}
                onFocus={() => setFocusedField('email')}
                placeholder="toi@exemple.fr"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, focusedField === 'email' && styles.inputFocused]}
                value={email}
              />
            </AuthField>

            <AuthField
              action={passwordVisible ? 'MASQUER' : 'AFFICHER'}
              label="MOT DE PASSE"
              onAction={() => { selectionFeedback(); setPasswordVisible((visible) => !visible); }}
            >
              <TextInput
                accessibilityLabel="Mot de passe"
                autoCapitalize="none"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                onChangeText={setPassword}
                onBlur={() => setFocusedField(null)}
                onFocus={() => setFocusedField('password')}
                onSubmitEditing={mode === 'signin' ? () => void submit() : undefined}
                placeholder={mode === 'signup' ? '8 caractères minimum' : '••••••••'}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!passwordVisible}
                style={[styles.input, focusedField === 'password' && styles.inputFocused]}
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
                  onBlur={() => setFocusedField(null)}
                  onFocus={() => setFocusedField('confirmation')}
                  onSubmitEditing={() => void submit()}
                  placeholder="Retape ton mot de passe"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!passwordVisible}
                  style={[styles.input, focusedField === 'confirmation' && styles.inputFocused]}
                  value={passwordConfirmation}
                />
              </AuthField>
            ) : null}

            {mode === 'signin' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => { selectionFeedback(); router.push('/auth/forgot-password'); }}
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>MOT DE PASSE OUBLIÉ ?</Text>
              </Pressable>
            ) : null}

            {mode === 'signup' && passwordConfirmation && password !== passwordConfirmation ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                Les mots de passe ne correspondent pas.
              </Text>
            ) : null}
            {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit || loading, busy: loading }}
              disabled={!canSubmit || loading}
              onPress={() => void submit()}
              style={({ pressed }) => [styles.buttonFrame, (!canSubmit || loading) && styles.disabled, pressed && styles.pressed]}
            >
              <LinearGradient colors={['#F4FF9A', colors.volt, '#BED31C']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.button}>
                <Text style={styles.buttonText}>
                  {loading
                    ? (mode === 'signin' ? 'CONNEXION…' : 'CRÉATION…')
                    : (mode === 'signin' ? 'ENTRER DANS CLUTCH' : 'CRÉER MON COMPTE')}
                </Text>
                <Text style={styles.buttonArrow}>→</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        <View style={styles.trustRow}>
          <TrustItem label="LIVE DATA" />
          <TrustItem label="SANS MISE" />
          <TrustItem label="COMPTE PRIVÉ" />
        </View>
      </View>
    </AuthShell>
  );
}

function TrustItem({ label }: { label: string }) {
  return (
    <View style={styles.trustItem}>
      <View style={styles.trustDot} />
      <Text style={styles.trustText}>{label}</Text>
    </View>
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
  authContent: { gap: 14 },
  modeSwitch: { flexDirection: 'row', padding: 4, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  modeButton: { flex: 1, minHeight: 42, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: colors.volt },
  modeText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 0.8 },
  modeTextActive: { color: '#080B0F' },
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  labelRow: { minHeight: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.4 },
  fieldAction: { color: colors.volt, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 0.8 },
  input: { minHeight: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: '#090D12', color: colors.text, paddingHorizontal: spacing.md, fontFamily: fonts.medium, fontSize: 14 },
  inputFocused: { borderColor: '#71851E', backgroundColor: '#0D120D', boxShadow: '0 0 10px rgba(224,255,59,.12)' },
  forgotButton: { alignSelf: 'flex-end', minHeight: 30, justifyContent: 'center' },
  forgotText: { color: colors.volt, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 0.9 },
  error: { color: '#FF8B8B', fontFamily: fonts.medium, fontSize: 11, lineHeight: 17 },
  buttonFrame: { minHeight: 58, marginTop: spacing.xs, borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 15px rgba(224,255,59,.22)' },
  button: { flex: 1, minHeight: 58, paddingHorizontal: 18, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttonText: { color: '#080B0F', fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8 },
  buttonArrow: { color: '#080B0F', fontFamily: fonts.display, fontSize: 22 },
  successCard: { padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#45551E' },
  successEyebrow: { color: colors.volt, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.4 },
  successTitle: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 30 },
  successCopy: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 },
  inlineAction: { marginTop: spacing.sm, color: colors.volt, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.8 },
  trustRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingTop: 2 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.volt },
  trustText: { color: '#6E7A84', fontFamily: fonts.bold, fontSize: 6, letterSpacing: 0.7 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
});
