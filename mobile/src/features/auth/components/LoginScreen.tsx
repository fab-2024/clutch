import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import GriffCore from '@/src/components/visual/GriffCore';
import { errorFeedback, impactFeedback, selectionFeedback, successFeedback } from '@/src/lib/feedback';
import { colors, radius, spacing, typography } from '@/src/theme';

import { signInWithPassword, signUpWithPassword } from '../api';
import { authErrorMessage } from '../messages';
import { accountConfirmationRedirect } from '../redirects';
import { rememberPendingRoute, safePendingRoute } from '../pendingRoute';
import AuthShell from './AuthShell';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ next?: string | string[] }>();
  const requestedRoute = safePendingRoute(Array.isArray(params.next) ? params.next[0] : params.next);
  const [mode, setMode] = useState<Mode>('signin');
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [minimumAgeConfirmed, setMinimumAgeConfirmed] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const canSubmit = Boolean(
    email.trim()
    && password
    && (mode === 'signin'
      || (pseudo.trim().length >= 3
        && password.length >= 8
        && password === passwordConfirmation
        && minimumAgeConfirmed)),
  );

  useEffect(() => {
    if (requestedRoute) void rememberPendingRoute(requestedRoute);
  }, [requestedRoute]);

  function selectMode(nextMode: Mode) {
    if (loading || nextMode === mode) return;
    setMode(nextMode);
    setError(null);
    setConfirmationSent(false);
    setPassword('');
    setPasswordConfirmation('');
    setMinimumAgeConfirmed(false);
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
        minimumAgeConfirmed,
        emailRedirectTo: accountConfirmationRedirect(requestedRoute),
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
        : 'Crée ton identité GRIFF. Tu choisiras ensuite tes jeux et ton équipe.'}
      title={mode === 'signin' ? 'Reprends ta place.' : 'Entre en jeu.'}
      visual={<GriffCore compact label="ACCÈS // PRÊT" size={170} />}
    >
      <View style={styles.authContent}>
        <View style={styles.modeSwitch}>
          <ModeButton active={mode === 'signin'} label="Connexion" onPress={() => selectMode('signin')} />
          <ModeButton active={mode === 'signup'} label="Créer un compte" onPress={() => selectMode('signup')} />
        </View>

        {confirmationSent ? (
          <View style={styles.successCard}>
            <Text style={styles.successEyebrow}>E-mail envoyé</Text>
            <Text style={styles.successTitle}>Confirme ton inscription.</Text>
            <Text style={styles.successCopy}>
              Ouvre le lien reçu à {email.trim()}. Il te ramènera dans GRIFF pour terminer ton profil.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => selectMode('signin')}>
              <Text style={styles.inlineAction}>Revenir à la connexion →</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            {mode === 'signup' ? (
              <AuthField label="Pseudo">
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

            <AuthField label="E-mail">
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
              action={passwordVisible ? 'Masquer' : 'Afficher'}
              label="Mot de passe"
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
              <>
                <AuthField label="Confirmer le mot de passe">
                  <TextInput
                    accessibilityLabel="Confirmation du mot de passe"
                    autoCapitalize="none"
                    autoComplete="new-password"
                    onChangeText={setPasswordConfirmation}
                    onBlur={() => setFocusedField(null)}
                    onFocus={() => setFocusedField('confirmation')}
                    placeholder="Retape ton mot de passe"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!passwordVisible}
                    style={[styles.input, focusedField === 'confirmation' && styles.inputFocused]}
                    value={passwordConfirmation}
                  />
                </AuthField>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: minimumAgeConfirmed }}
                  onPress={() => setMinimumAgeConfirmed((current) => !current)}
                  style={({ pressed }) => [styles.ageChoice, pressed && styles.pressed]}
                >
                  <View style={[styles.ageCheck, minimumAgeConfirmed && styles.ageCheckActive]}><Text style={styles.ageCheckText}>{minimumAgeConfirmed ? '✓' : ''}</Text></View>
                  <Text style={styles.ageText}>Je confirme avoir 15 ans ou plus et accepter les Conditions d’utilisation.</Text>
                </Pressable>
              </>
            ) : null}

            {mode === 'signin' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => { selectionFeedback(); router.push('/auth/forgot-password'); }}
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
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
                    ? (mode === 'signin' ? 'Connexion…' : 'Création…')
                    : (mode === 'signin' ? 'Entrer dans GRIFF' : 'Créer mon compte')}
                </Text>
                <Text style={styles.buttonArrow}>→</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        <View style={styles.trustRow}>
          <TrustItem label="Données en direct" />
          <TrustItem label="Sans mise" />
          <TrustItem label="Compte privé" />
        </View>
        <View accessibilityLabel="Informations légales" style={styles.legalRow}>
          <LegalLink label="Confidentialité" route="/legal/privacy" />
          <Text style={styles.legalSeparator}>·</Text>
          <LegalLink label="Conditions" route="/legal/terms" />
          <Text style={styles.legalSeparator}>·</Text>
          <LegalLink label="Support" route="/support" />
        </View>
      </View>
    </AuthShell>
  );
}

function LegalLink({ label, route }: { label: string; route: '/legal/privacy' | '/legal/terms' | '/support' }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(route)}>
      <Text style={styles.legalText}>{label}</Text>
    </Pressable>
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
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={[styles.modeButton, active && styles.modeButtonActive, focused && styles.modeButtonFocused]}
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
  modeButton: { flex: 1, minHeight: 42, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', outlineStyle: 'solid', outlineWidth: 2, outlineColor: 'transparent' },
  modeButtonActive: { backgroundColor: colors.volt },
  modeButtonFocused: { outlineColor: colors.focus, outlineOffset: 2 },
  modeText: { ...typography.action, color: colors.textMuted, letterSpacing: 0.3 },
  modeTextActive: { color: '#080B0F' },
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  labelRow: { minHeight: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...typography.label, color: colors.textMuted, letterSpacing: .35 },
  fieldAction: { ...typography.action, color: colors.volt, letterSpacing: 0.3 },
  input: { ...typography.bodyStrong, minHeight: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: '#111A22', color: colors.text, paddingHorizontal: spacing.md },
  inputFocused: { borderColor: '#71851E', backgroundColor: '#0D120D', boxShadow: '0 0 10px rgba(224,255,59,.12)' },
  ageChoice: { minHeight: 58, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: radius.md, backgroundColor: '#111A22', borderWidth: 1, borderColor: colors.border },
  ageCheck: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#30414E' }, ageCheckActive: { backgroundColor: colors.volt, borderColor: colors.volt }, ageCheckText: { ...typography.label, color: '#080A0C' }, ageText: { ...typography.caption, flex: 1, color: colors.textMuted },
  forgotButton: { alignSelf: 'flex-end', minHeight: 30, justifyContent: 'center' },
  forgotText: { ...typography.action, color: colors.volt, letterSpacing: 0.3 },
  error: { ...typography.body, color: '#FF8B8B' },
  buttonFrame: { minHeight: 58, marginTop: spacing.xs, borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 15px rgba(224,255,59,.22)' },
  button: { flex: 1, minHeight: 58, paddingHorizontal: 18, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttonText: { ...typography.action, color: '#080B0F', letterSpacing: 0.3 },
  buttonArrow: { color: '#080B0F', fontSize: 22 },
  successCard: { padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#45551E' },
  successEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 },
  successTitle: { ...typography.cardTitle, color: colors.text },
  successCopy: { ...typography.body, color: colors.textMuted },
  inlineAction: { ...typography.action, marginTop: spacing.sm, color: colors.volt, letterSpacing: 0.3 },
  trustRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingTop: 2 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.volt },
  trustText: { ...typography.caption, color: '#6E7A84' },
  legalRow: { minHeight: 28, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 7 },
  legalText: { ...typography.caption, color: '#8F9AA3', textDecorationLine: 'underline' },
  legalSeparator: { ...typography.caption, color: '#4E5962' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
});
