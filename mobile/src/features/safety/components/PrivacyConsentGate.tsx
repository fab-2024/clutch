import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { signOut } from '@/src/features/auth/api';
import { privacyDocument, termsDocument } from '@/src/features/legal/documents';
import { colors, radius, spacing, typography } from '@/src/theme';

import { loadPrivacyPreferences, savePrivacyPreferences } from '../api';
import type { PrivacyPreferences } from '../types';

export default function PrivacyConsentGate({ userId }: { userId?: string }) {
  const [preferences, setPreferences] = useState<PrivacyPreferences | null>(null);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setPreferences(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await loadPrivacyPreferences();
      setPreferences(next);
      setAnalyticsAllowed(next.analyticsAllowed);
    } catch {
      setError('Impossible de charger tes choix de confidentialité.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      setPreferences(await savePrivacyPreferences({
        analyticsAllowed,
        minimumAgeConfirmed: true,
      }));
    } catch {
      setError('Tes choix n’ont pas été enregistrés. Réessaie.');
    } finally {
      setSaving(false);
    }
  }

  async function leave() {
    await signOut();
  }

  if (!userId || preferences?.minimumAgeConfirmed) return null;

  const document = legalView === 'privacy' ? privacyDocument : legalView === 'terms' ? termsDocument : null;

  return (
    <Modal animationType="fade" onRequestClose={() => undefined} transparent visible>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {document ? (
            <>
              <View style={styles.legalTop}><Text style={styles.eyebrow}>{document.eyebrow}</Text><Pressable accessibilityRole="button" onPress={() => setLegalView(null)} style={styles.legalBack}><Text style={styles.legalBackText}>FERMER</Text></Pressable></View>
              <Text style={styles.legalTitle}>{document.title}</Text>
              <ScrollView contentContainerStyle={styles.legalContent} style={styles.legalScroll}>
                <Text style={styles.copy}>{document.introduction}</Text>
                {document.sections.map((section) => <View key={section.title} style={styles.legalSection}><Text style={styles.choiceTitle}>{section.title}</Text>{section.paragraphs.map((paragraph) => <Text key={paragraph} style={styles.choiceText}>{paragraph}</Text>)}</View>)}
              </ScrollView>
            </>
          ) : loading ? (
            <View style={styles.loading}><ActivityIndicator color={colors.volt} /><Text style={styles.copy}>Chargement de tes choix…</Text></View>
          ) : (
            <>
              <View style={styles.mark}><Text style={styles.markText}>15+</Text></View>
              <Text style={styles.eyebrow}>CLUTCH // CONFIDENTIALITÉ</Text>
              <Text style={styles.title}>Avant d’entrer.</Text>
              <Text style={styles.copy}>Clutch est réservé aux personnes de 15 ans ou plus. Nous ne demandons pas ta date de naissance : seulement cette déclaration.</Text>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: analyticsAllowed }}
                onPress={() => setAnalyticsAllowed((current) => !current)}
                style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
              >
                <View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Mesure d’usage facultative</Text><Text style={styles.choiceText}>Aide à mesurer onboarding, calls, résultats et Rank. Aucun identifiant publicitaire, suivi inter-apps ou métadonnée libre.</Text></View>
                <View style={[styles.switchTrack, analyticsAllowed && styles.switchTrackActive]}><View style={[styles.switchThumb, analyticsAllowed && styles.switchThumbActive]} /></View>
              </Pressable>
              {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => void confirm()} style={({ pressed }) => [styles.primary, (pressed || saving) && styles.pressed]}><Text style={styles.primaryText}>{saving ? 'ENREGISTREMENT…' : 'J’AI 15 ANS OU PLUS'}</Text></Pressable>
              <View style={styles.links}>
                <Pressable accessibilityRole="link" onPress={() => setLegalView('privacy')}><Text style={styles.link}>Confidentialité</Text></Pressable>
                <Text style={styles.separator}>·</Text>
                <Pressable accessibilityRole="link" onPress={() => setLegalView('terms')}><Text style={styles.link}>Conditions</Text></Pressable>
              </View>
              <Pressable accessibilityRole="button" onPress={() => void leave()}><Text style={styles.leave}>Je n’ai pas 15 ans — quitter</Text></Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(3,6,9,.94)' },
  card: { width: '100%', maxWidth: 430, padding: 22, gap: 13, borderRadius: 28, backgroundColor: '#0A0F13', borderWidth: 1, borderColor: '#3F4A20' },
  mark: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  markText: { ...typography.cardTitle, color: '#080A0C' },
  eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 },
  title: { ...typography.displayMedium, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
  loading: { minHeight: 110, alignItems: 'center', justifyContent: 'center', gap: 12 },
  choice: { minHeight: 126, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.lg, backgroundColor: '#10161C', borderWidth: 1, borderColor: '#29333C' },
  choiceCopy: { flex: 1, minWidth: 0 }, choiceTitle: { ...typography.bodyStrong, color: colors.text }, choiceText: { ...typography.caption, marginTop: 5, color: colors.textMuted },
  switchTrack: { width: 52, height: 30, padding: 3, borderRadius: 16, justifyContent: 'center', backgroundColor: '#28323B' }, switchTrackActive: { backgroundColor: colors.volt }, switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#71808C' }, switchThumbActive: { alignSelf: 'flex-end', backgroundColor: '#080A0C' },
  primary: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.volt }, primaryText: { ...typography.action, color: '#080A0C' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 8 }, link: { ...typography.caption, color: colors.textSubtle, textDecorationLine: 'underline' }, separator: { ...typography.caption, color: '#56616A' },
  legalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, legalBack: { minHeight: 36, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#39434C' }, legalBackText: { ...typography.action, color: colors.text }, legalTitle: { ...typography.cardTitle, color: colors.text }, legalScroll: { maxHeight: 520 }, legalContent: { gap: 15, paddingBottom: 8 }, legalSection: { gap: 7, paddingTop: 13, borderTopWidth: 1, borderTopColor: '#222B33' },
  leave: { ...typography.caption, color: '#8D979F', textAlign: 'center', textDecorationLine: 'underline' }, error: { ...typography.body, color: '#FF9AA2' }, pressed: { opacity: .72 },
});
