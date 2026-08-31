import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/src/theme';

import { blockUser, loadProfileSafetyState, reportUser } from '../api';
import { REPORT_REASON_LABELS, REPORT_REASONS, type ReportReason } from '../types';

export default function ProfileSafetyActions({ pseudo, onBlocked }: { pseudo: string; onBlocked: () => void }) {
  const [open, setOpen] = useState<'report' | 'block' | null>(null);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadProfileSafetyState(pseudo)
      .then((state) => {
        if (!active) return;
        setHidden(Boolean(state?.isMe));
        if (state?.iBlock || state?.blocksMe) onBlocked();
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [onBlocked, pseudo]);

  async function report(reason: ReportReason) {
    if (busy) return;
    setBusy(true); setMessage(null);
    try {
      await reportUser(pseudo, reason);
      setMessage('SIGNALEMENT REÇU · MERCI.');
      setOpen(null);
    } catch { setMessage('Le signalement n’a pas abouti.'); }
    finally { setBusy(false); }
  }

  async function block() {
    if (busy) return;
    setBusy(true); setMessage(null);
    try {
      await blockUser(pseudo);
      onBlocked();
    } catch { setMessage('Le blocage n’a pas abouti.'); }
    finally { setBusy(false); }
  }

  if (hidden) return null;

  return (
    <View style={styles.card}>
      <View><Text style={styles.eyebrow}>SÉCURITÉ</Text><Text style={styles.title}>Garde le contrôle.</Text></View>
      <View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => setOpen((value) => value === 'report' ? null : 'report')} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>SIGNALER</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setOpen((value) => value === 'block' ? null : 'block')} style={({ pressed }) => [styles.danger, pressed && styles.pressed]}><Text style={styles.dangerText}>BLOQUER</Text></Pressable></View>
      {open === 'report' ? <View style={styles.panel}><Text style={styles.panelTitle}>Quel est le problème ?</Text><View style={styles.reasons}>{REPORT_REASONS.map((reason) => <Pressable key={reason} accessibilityRole="button" disabled={busy} onPress={() => void report(reason)} style={({ pressed }) => [styles.reason, pressed && styles.pressed]}><Text style={styles.reasonText}>{REPORT_REASON_LABELS[reason]}</Text></Pressable>)}</View></View> : null}
      {open === 'block' ? <View style={styles.panel}><Text style={styles.panelTitle}>Bloquer {pseudo} ?</Text><Text style={styles.panelText}>Vos demandes d’amis et duels directs seront coupés. Tu pourras le débloquer dans les paramètres.</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => void block()} style={styles.confirm}><Text style={styles.confirmText}>{busy ? 'BLOCAGE…' : 'CONFIRMER LE BLOCAGE'}</Text></Pressable></View> : null}
      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 15, gap: 11, borderRadius: radius.lg, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' }, eyebrow: { ...typography.eyebrow, color: colors.textMuted }, title: { ...typography.cardTitle, marginTop: 3, color: colors.text }, actions: { flexDirection: 'row', gap: 9 }, secondary: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#30414E' }, secondaryText: { ...typography.action, color: colors.text }, danger: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#35151C', borderWidth: 1, borderColor: '#6D2C38' }, dangerText: { ...typography.action, color: '#FF9AA6' }, panel: { padding: 12, gap: 9, borderRadius: 16, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#30414E' }, panelTitle: { ...typography.bodyStrong, color: colors.text }, panelText: { ...typography.body, color: colors.textMuted }, reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, reason: { minHeight: 36, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 12, backgroundColor: '#111A22' }, reasonText: { ...typography.label, color: colors.textSubtle }, confirm: { minHeight: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#E85066' }, confirmText: { ...typography.action, color: '#16070A' }, message: { ...typography.label, color: colors.volt }, pressed: { opacity: .72 },
});
