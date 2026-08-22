import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { colors, radius, spacing, typography } from '@/src/theme';

import {
  loadBlockedUsers,
  loadPrivacyPreferences,
  savePrivacyPreferences,
  unblockUser,
} from '../api';
import type { BlockedUser, PrivacyPreferences } from '../types';

const RULES = [
  'Respecter les autres supporters, même en cas de rivalité.',
  'Aucun harcèlement, propos haineux, menace ou usurpation.',
  'Aucun spam ni détournement des fonctions sociales.',
  'Les signalements sont examinés ; les abus répétés peuvent suspendre le compte.',
];

export default function SafetySettingsScreen() {
  const [preferences, setPreferences] = useState<PrivacyPreferences | null>(null);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [nextPreferences, nextBlocked] = await Promise.all([
        loadPrivacyPreferences(),
        loadBlockedUsers(),
      ]);
      setPreferences(nextPreferences);
      setBlocked(nextBlocked);
    } catch {
      setMessage('Impossible de charger la confidentialité et la sécurité.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggleAnalytics() {
    if (!preferences || busy) return;
    setBusy('analytics'); setMessage(null);
    try {
      const next = await savePrivacyPreferences({
        analyticsAllowed: !preferences.analyticsAllowed,
        minimumAgeConfirmed: true,
      });
      setPreferences(next);
      setMessage(next.analyticsAllowed ? 'MESURE D’USAGE ACTIVÉE.' : 'MESURE D’USAGE DÉSACTIVÉE.');
    } catch {
      setMessage('Ce choix n’a pas pu être enregistré.');
    } finally { setBusy(null); }
  }

  async function unblock(pseudo: string) {
    if (busy) return;
    setBusy(pseudo); setMessage(null);
    try {
      await unblockUser(pseudo);
      setBlocked((current) => current.filter((user) => user.pseudo !== pseudo));
      setMessage(`${pseudo.toUpperCase()} EST DÉBLOQUÉ.`);
    } catch { setMessage('Le déblocage n’a pas abouti.'); }
    finally { setBusy(null); }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>← PARAMÈTRES</Text></Pressable></View>
        <View style={styles.intro}><Text style={styles.eyebrow}>MOI // CONFIDENTIALITÉ & SÉCURITÉ</Text><Text style={styles.title}>TU GARDES LA MAIN.</Text><Text style={styles.subtitle}>Tes choix de mesure, les règles de communauté et les comptes bloqués sont réunis ici.</Text></View>
        {message ? <View style={styles.message}><Text style={styles.messageText}>{message}</Text></View> : null}

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>01 // DONNÉES</Text><Text style={styles.sectionTitle}>MESURE FACULTATIVE.</Text>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: preferences?.analyticsAllowed ?? false, busy: busy === 'analytics' }} disabled={loading || busy === 'analytics'} onPress={() => void toggleAnalytics()} style={({ pressed }) => [styles.preference, pressed && styles.pressed]}>
            <View style={styles.preferenceCopy}><Text style={styles.preferenceTitle}>Analytics produit</Text><Text style={styles.preferenceText}>Événements prédéfinis uniquement. Aucun identifiant publicitaire, suivi inter-apps ou donnée libre.</Text></View>
            <View style={[styles.switchTrack, preferences?.analyticsAllowed && styles.switchTrackActive]}><View style={[styles.switchThumb, preferences?.analyticsAllowed && styles.switchThumbActive]} /></View>
          </Pressable>
          <View style={styles.ageCard}><Text style={styles.ageValue}>15+</Text><View style={styles.ageCopy}><Text style={styles.preferenceTitle}>Âge minimum confirmé</Text><Text style={styles.preferenceText}>Aucune date de naissance n’est conservée.</Text></View></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>02 // MODÉRATION</Text><Text style={styles.sectionTitle}>RÈGLES DU CERCLE.</Text>
          <View style={styles.rules}>{RULES.map((rule) => <View key={rule} style={styles.rule}><View style={styles.ruleDot} /><Text style={styles.ruleText}>{rule}</Text></View>)}</View>
          <Pressable accessibilityRole="link" onPress={() => router.push('/support')}><Text style={styles.support}>CONTACTER LE SUPPORT →</Text></Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>03 // COMPTES BLOQUÉS</Text><Text style={styles.sectionTitle}>{blocked.length ? `${blocked.length} COMPTE${blocked.length > 1 ? 'S' : ''}.` : 'LISTE VIDE.'}</Text>
          <View style={styles.blockedList}>
            {blocked.map((user) => <View key={user.id} style={styles.blockedRow}><View><Text style={styles.blockedPseudo}>{user.pseudo}</Text><Text style={styles.blockedDate}>{formatDate(user.blockedAt)}</Text></View><Pressable accessibilityRole="button" disabled={Boolean(busy)} onPress={() => void unblock(user.pseudo)} style={({ pressed }) => [styles.unblock, pressed && styles.pressed]}><Text style={styles.unblockText}>{busy === user.pseudo ? '…' : 'DÉBLOQUER'}</Text></Pressable></View>)}
            {!blocked.length && !loading ? <Text style={styles.empty}>Les comptes bloqués ne peuvent plus t’ajouter ni te défier directement.</Text> : null}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'DATE INCONNUE' : `BLOQUÉ LE ${date.toLocaleDateString('fr-FR')}`;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: spacing.md, paddingBottom: 72, gap: 23 },
  header: { minHeight: 72, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#171D23' }, back: { minHeight: 38, alignSelf: 'flex-start', paddingHorizontal: 12, justifyContent: 'center', borderRadius: 13, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#28313A' }, backText: { ...typography.action, color: colors.text },
  intro: { gap: 8 }, eyebrow: { ...typography.eyebrow, color: colors.volt }, title: { ...typography.displayMedium, color: colors.text }, subtitle: { ...typography.body, color: colors.textMuted },
  message: { padding: 12, borderRadius: radius.md, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#3D491D' }, messageText: { ...typography.label, color: colors.volt },
  section: { gap: 11 }, sectionEyebrow: { ...typography.eyebrow, color: colors.volt }, sectionTitle: { ...typography.sectionTitle, color: colors.text },
  preference: { minHeight: 122, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, preferenceCopy: { flex: 1, minWidth: 0 }, preferenceTitle: { ...typography.bodyStrong, color: colors.text }, preferenceText: { ...typography.caption, marginTop: 5, color: colors.textMuted },
  switchTrack: { width: 52, height: 30, padding: 3, borderRadius: 16, justifyContent: 'center', backgroundColor: '#28323B' }, switchTrackActive: { backgroundColor: colors.volt }, switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#71808C' }, switchThumbActive: { alignSelf: 'flex-end', backgroundColor: '#080A0C' },
  ageCard: { minHeight: 84, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: radius.lg, backgroundColor: '#10160D', borderWidth: 1, borderColor: '#39451C' }, ageValue: { ...typography.metric, color: colors.volt }, ageCopy: { flex: 1 },
  rules: { overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }, rule: { minHeight: 60, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0B1015', borderBottomWidth: 1, borderBottomColor: '#1B232B' }, ruleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt }, ruleText: { ...typography.body, flex: 1, color: colors.textMuted }, support: { ...typography.action, color: colors.volt },
  blockedList: { overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }, blockedRow: { minHeight: 70, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#0B1015', borderBottomWidth: 1, borderBottomColor: '#1B232B' }, blockedPseudo: { ...typography.bodyStrong, color: colors.text }, blockedDate: { ...typography.caption, marginTop: 3, color: colors.textMuted }, unblock: { minHeight: 38, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#4A5625' }, unblockText: { ...typography.label, color: colors.volt }, empty: { ...typography.body, padding: 15, color: colors.textMuted, backgroundColor: '#0B1015' }, pressed: { opacity: .72 },
});
