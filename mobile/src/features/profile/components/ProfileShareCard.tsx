import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import type { EquippedCosmetic } from '@/src/features/shop/types';
import { publicAppUrl } from '@/src/config/release';
import { colors, fonts, radius, spacing, typography } from '@/src/theme';

type ProfileShareCardProps = {
  accuracy: number;
  cosmetic: EquippedCosmetic | null | undefined;
  frags: number;
  grade: string;
  profileTitle: string;
  pseudo: string;
  publicProfile: boolean;
  rank: number | null;
  teamTag: string;
};

export default function ProfileShareCard({
  accuracy,
  cosmetic,
  frags,
  grade,
  profileTitle,
  pseudo,
  publicProfile,
  rank,
  teamTag,
}: ProfileShareCardProps) {
  const [sharing, setSharing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const palette = profileCardPalette(cosmetic?.styleKey, cosmetic?.accent);

  async function shareCard() {
    if (sharing || !publicProfile) return;
    setSharing(true);
    setFeedback(null);

    const url = publicAppUrl(`/u/${encodeURIComponent(pseudo)}`);
    if (!url) {
      setFeedback('LIEN HTTPS À CONFIGURER');
      setSharing(false);
      return;
    }
    const title = `${pseudo} sur Clutch`;
    const message = `${pseudo} · ${grade} · ${formatNumber(frags)} Frags · ${accuracy}% de réussite\n${url}`;

    try {
      if (
        Platform.OS === 'web'
        && typeof navigator !== 'undefined'
        && typeof navigator.share !== 'function'
        && navigator.clipboard
      ) {
        await navigator.clipboard.writeText(message);
        setFeedback('LIEN COPIÉ');
      } else {
        await Share.share({ message, title, url });
        setFeedback('CARTE PARTAGÉE');
      }
    } catch {
      setFeedback('PARTAGE ANNULÉ');
    } finally {
      setSharing(false);
    }
  }

  return (
    <View style={[styles.shell, { borderColor: palette.border }]}>
      <LinearGradient colors={palette.gradient} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.glow, { backgroundColor: palette.accent }]} />
      <Text style={[styles.watermark, { color: palette.accent }]}>C</Text>

      <View style={styles.topline}>
        <View style={styles.brand}>
          <View style={[styles.brandMark, { backgroundColor: palette.accent }]}><Text style={styles.brandGlyph}>C</Text></View>
          <View><Text style={styles.eyebrow}>CARTE DE PROFIL</Text><Text style={[styles.skinName, { color: palette.accent }]}>{cosmetic?.name?.toUpperCase() || 'CARTE NOIRE'}</Text></View>
        </View>
        <Text style={[styles.team, { color: palette.accent }]}>{teamTag || 'CLUTCH'}</Text>
      </View>

      <View style={styles.identity}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.pseudo}>{pseudo}</Text>
        <Text numberOfLines={1} style={[styles.profileTitle, { color: palette.accent }]}>{profileTitle.toUpperCase()}</Text>
      </View>

      <View style={styles.metrics}>
        <Metric label="GRADE" value={grade.toUpperCase()} />
        <View style={styles.divider} />
        <Metric label="FRAGS" value={formatNumber(frags)} />
        <View style={styles.divider} />
        <Metric label="RÉUSSITE" value={`${accuracy}%`} />
        <View style={styles.divider} />
        <Metric label="RANG" value={rank ? `#${rank}` : '—'} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.signature}>CLUTCH // PRENDS POSITION</Text>
        <Pressable
          accessibilityLabel={publicProfile ? `Partager la carte de ${pseudo}` : 'Profil privé, partage indisponible'}
          accessibilityRole="button"
          accessibilityState={{ disabled: sharing || !publicProfile }}
          disabled={sharing || !publicProfile}
          onPress={() => void shareCard()}
          style={({ pressed }) => [
            styles.share,
            { backgroundColor: publicProfile ? palette.accent : '#303841' },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.shareText, !publicProfile && styles.shareTextDisabled]}>
            {sharing ? 'PARTAGE…' : publicProfile ? 'PARTAGER ↗' : 'PROFIL PRIVÉ'}
          </Text>
        </Pressable>
      </View>
      {feedback ? <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: palette.accent }]}>{feedback}</Text> : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function profileCardPalette(styleKey?: string | null, accent?: string | null) {
  const resolvedAccent = /^#[0-9a-f]{6}$/i.test(accent ?? '') ? String(accent).toUpperCase() : colors.volt;
  if (styleKey === 'card-signal') return { accent: resolvedAccent, border: `${resolvedAccent}88`, gradient: ['#182009', '#0B110C', '#070A0D'] as const };
  if (styleKey === 'card-scoreboard') return { accent: resolvedAccent, border: `${resolvedAccent}88`, gradient: ['#101E2B', '#0A1119', '#070A0D'] as const };
  if (styleKey === 'card-nocturne') return { accent: resolvedAccent, border: `${resolvedAccent}88`, gradient: ['#21152E', '#100E19', '#070A0D'] as const };
  return { accent: resolvedAccent, border: '#35404A', gradient: ['#151B21', '#0B1015', '#070A0D'] as const };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

const styles = StyleSheet.create({
  shell: { position: 'relative', overflow: 'hidden', minHeight: 286, marginHorizontal: spacing.md, padding: 18, borderRadius: 28, borderWidth: 1, gap: 18 },
  glow: { position: 'absolute', width: 220, height: 220, right: -105, top: -110, borderRadius: 110, opacity: .17, boxShadow: '0 0 70px rgba(232,255,61,.14)' },
  watermark: { position: 'absolute', right: -5, top: 38, fontFamily: fonts.display, fontSize: 154, lineHeight: 160, opacity: .055 },
  topline: { zIndex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  brand: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandGlyph: { color: '#080A0C', fontFamily: fonts.display, fontSize: 23, lineHeight: 25 },
  eyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .7 },
  skinName: { ...typography.label, marginTop: 2, letterSpacing: .55 },
  team: { fontFamily: fonts.display, fontSize: 20, letterSpacing: .5 },
  identity: { zIndex: 1 },
  pseudo: { maxWidth: '92%', color: colors.text, fontFamily: fonts.display, fontSize: 42, lineHeight: 44, letterSpacing: -1.2 },
  profileTitle: { ...typography.bodyStrong, marginTop: 2, letterSpacing: .2 },
  metrics: { zIndex: 1, minHeight: 63, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, borderRadius: radius.lg, backgroundColor: 'rgba(3,7,10,.62)', borderWidth: 1, borderColor: '#29323A' },
  metric: { flex: 1, minWidth: 0, alignItems: 'center' },
  metricValue: { width: '100%', color: colors.text, fontFamily: fonts.display, fontSize: 19, textAlign: 'center' },
  metricLabel: { ...typography.label, marginTop: 3, color: colors.textMuted, fontSize: 8, letterSpacing: .3 },
  divider: { width: 1, height: 28, backgroundColor: '#303840' },
  footer: { zIndex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  signature: { ...typography.label, flex: 1, color: colors.textMuted, letterSpacing: .4 },
  share: { minHeight: 42, minWidth: 116, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  shareText: { ...typography.action, color: '#080A0C', letterSpacing: .3 },
  shareTextDisabled: { color: '#8A949E' },
  feedback: { ...typography.label, zIndex: 1, marginTop: -9, textAlign: 'right', letterSpacing: .45 },
  pressed: { opacity: .78, transform: [{ scale: .985 }] },
});
