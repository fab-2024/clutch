import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { publicAppUrl, supportEmail, supportMailto } from '@/src/config/release';
import { signInWithPassword } from '@/src/features/auth/api';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radius, spacing, typography } from '@/src/theme';

import { deleteCurrentAccount } from '../api';

const CONFIRMATION = 'SUPPRIMER';

export default function AccountSettingsScreen() {
  const { session } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const email = session?.user.email ?? '';
  const canDelete = Boolean(email && password && confirmation.trim().toUpperCase() === CONFIRMATION && !deleting);

  async function requestDataAccess() {
    const url = supportMailto(
      'Demande d’accès à mes données GRIFF',
      `Bonjour,\n\nJe souhaite recevoir une copie des données associées à mon compte ${email}.\n\nMerci.`,
    );
    if (url) await Linking.openURL(url);
  }

  async function deleteAccount() {
    if (!canDelete) return;
    setDeleting(true);
    setError(null);
    try {
      // A successful password sign-in refreshes last_sign_in_at. The Edge
      // Function independently requires that recent proof before deletion.
      await signInWithPassword(email, password);
      await deleteCurrentAccount();
      router.replace('/login');
    } catch (caught) {
      setError(deletionMessage(caught));
      setDeleting(false);
    }
  }

  const webDeletionUrl = publicAppUrl('/account-deletion');

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Revenir aux paramètres" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>← PARAMÈTRES</Text></Pressable>
        </View>
        <View style={styles.intro}><Text style={styles.eyebrow}>MOI // COMPTE & DONNÉES</Text><Text style={styles.title}>TU GARDES LE CONTRÔLE.</Text><Text style={styles.subtitle}>Consulte les règles de GRIFF, exerce tes droits ou supprime définitivement ton compte.</Text></View>

        <View style={styles.links}>
          <SettingsLink label="Politique de confidentialité" onPress={() => router.push('/legal/privacy')} />
          <SettingsLink label="Conditions d’utilisation" onPress={() => router.push('/legal/terms')} />
          <SettingsLink label="Support" onPress={() => router.push('/support')} />
        </View>

        <View style={styles.dataCard}>
          <Text style={styles.cardEyebrow}>ACCÈS AUX DONNÉES</Text>
          <Text style={styles.cardTitle}>Demande une copie lisible.</Text>
          <Text style={styles.cardCopy}>{supportEmail ? `La demande sera préparée à partir du compte ${email}.` : 'Le contact de support doit être configuré avant la publication.'}</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: !supportEmail }} disabled={!supportEmail} onPress={() => void requestDataAccess()} style={({ pressed }) => [styles.secondary, !supportEmail && styles.disabled, pressed && styles.pressed]}><Text style={styles.secondaryText}>DEMANDER MES DONNÉES</Text></Pressable>
        </View>

        <View style={styles.dangerCard}>
          <Text style={styles.dangerEyebrow}>ZONE DÉFINITIVE</Text>
          <Text style={styles.dangerTitle}>Supprimer mon compte.</Text>
          <Text style={styles.dangerCopy}>Cette action supprime ton profil, tes calls, ta progression, tes relations sociales, tes tokens push, ton inventaire et les données RevenueCat associées. Elle ne peut pas être annulée.</Text>
          <Text style={styles.email}>{email}</Text>
          <TextInput accessibilityLabel="Mot de passe actuel" autoCapitalize="none" autoComplete="current-password" onChangeText={setPassword} placeholder="Mot de passe actuel" placeholderTextColor="#6D7278" secureTextEntry style={styles.input} value={password} />
          <TextInput accessibilityLabel={`Écrire ${CONFIRMATION} pour confirmer`} autoCapitalize="characters" autoCorrect={false} onChangeText={setConfirmation} placeholder={`Écris ${CONFIRMATION}`} placeholderTextColor="#6D7278" style={styles.input} value={confirmation} />
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canDelete, busy: deleting }} disabled={!canDelete} onPress={() => void deleteAccount()} style={({ pressed }) => [styles.deleteButton, !canDelete && styles.disabled, pressed && styles.pressed]}><Text style={styles.deleteText}>{deleting ? 'SUPPRESSION EN COURS…' : 'SUPPRIMER DÉFINITIVEMENT'}</Text></Pressable>
          {webDeletionUrl ? <Text selectable style={styles.webLink}>DEPUIS LE WEB · {webDeletionUrl}</Text> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function SettingsLink({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}><Text style={styles.linkLabel}>{label}</Text><Text style={styles.linkArrow}>→</Text></Pressable>;
}

function deletionMessage(caught: unknown) {
  const message = caught instanceof Error ? caught.message : '';
  if (message === 'recent_authentication_required') return 'Reconnecte-toi avec ton mot de passe puis réessaie.';
  if (message === 'revenuecat_cleanup_not_configured') return 'La suppression coordonnée doit encore être configurée côté serveur. Contacte le support.';
  if (message === 'invalid_session') return 'Ta session a expiré. Reconnecte-toi puis réessaie.';
  if (/invalid login|credentials/i.test(message)) return 'Le mot de passe actuel est incorrect.';
  return 'La suppression coordonnée n’a pas abouti. Réessaie ; si le problème persiste, contacte le support.';
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: spacing.md, paddingBottom: 72, gap: 22 },
  header: { minHeight: 72, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#171D23' }, back: { minHeight: 38, alignSelf: 'flex-start', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#28313A' }, backText: { ...typography.action, color: colors.text },
  intro: { gap: 8 }, eyebrow: { ...typography.eyebrow, color: colors.volt }, title: { ...typography.displayMedium, color: colors.text }, subtitle: { ...typography.body, color: colors.textMuted },
  links: { overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }, linkRow: { minHeight: 58, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0B1015', borderBottomWidth: 1, borderBottomColor: '#1B232B' }, linkLabel: { ...typography.bodyStrong, color: colors.text }, linkArrow: { color: colors.volt, fontSize: 19 },
  dataCard: { padding: 18, gap: 9, borderRadius: radius.lg, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#3D491D' }, cardEyebrow: { ...typography.eyebrow, color: colors.volt }, cardTitle: { ...typography.cardTitle, color: colors.text }, cardCopy: { ...typography.body, color: colors.textMuted }, secondary: { minHeight: 48, marginTop: 6, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: '#596826' }, secondaryText: { ...typography.action, color: colors.volt },
  dangerCard: { padding: 18, gap: 10, borderRadius: radius.lg, backgroundColor: '#170C10', borderWidth: 1, borderColor: '#5B2731' }, dangerEyebrow: { ...typography.eyebrow, color: '#FF8F9D' }, dangerTitle: { ...typography.sectionTitle, color: colors.text }, dangerCopy: { ...typography.body, color: '#C59CA4' }, email: { ...typography.label, color: colors.textMuted }, input: { ...typography.bodyStrong, minHeight: 52, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: '#0B090B', borderWidth: 1, borderColor: '#4D2B32', color: colors.text }, deleteButton: { minHeight: 52, marginTop: 4, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: '#E85066' }, deleteText: { ...typography.action, color: '#17070A' }, error: { ...typography.body, color: '#FF9AA2' }, webLink: { ...typography.caption, marginTop: 3, color: '#8E6870' },
  disabled: { opacity: 0.4 }, pressed: { opacity: 0.72 },
});
