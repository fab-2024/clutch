import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing } from '@/src/theme';

import { signInWithPassword } from '../api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);

    try {
      await signInWithPassword(email, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <View style={styles.shell}>
        <Text style={styles.brand}>CLUTCH</Text>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>RETOUR DANS L'ARENA</Text>
          <Text style={styles.title}>Reprends ta place.</Text>
          <Text style={styles.subtitle}>
            Connecte-toi avec le même compte que sur Clutch Web.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="toi@exemple.fr"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={email}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>MOT DE PASSE</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              onSubmitEditing={signIn}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={loading || !email.trim() || !password}
            onPress={signIn}
            style={({ pressed }) => [
              styles.button,
              (loading || !email.trim() || !password) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>{loading ? 'CONNEXION…' : 'ENTRER DANS CLUTCH'}</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>Supabase Auth · session persistante mobile</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xl,
  },
  brand: { color: colors.volt, fontSize: 24, fontWeight: '900', letterSpacing: 1.5 },
  hero: { gap: spacing.sm },
  eyebrow: { color: colors.volt, fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: colors.text, fontSize: 42, lineHeight: 44, fontWeight: '900', letterSpacing: -1.4 },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  input: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  error: { color: '#FF8B8B', fontSize: 13, lineHeight: 18 },
  button: {
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.82 },
  buttonText: { color: '#080B0F', fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  hint: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
});
