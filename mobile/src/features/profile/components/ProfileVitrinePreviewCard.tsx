import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { EquippedCosmetics } from '@/src/features/shop/types';
import {
  adaptShowcaseRingStats,
  resolveEquippedShowcaseRing,
} from '@/src/features/profile/showcaseRings/progression';
import { useShowcaseRingEquipment } from '@/src/features/profile/showcaseRings/useShowcaseRingEquipment';
import { colors, typography } from '@/src/theme';

import type { ProfileData } from '../types';
import ShowcaseRoomScene from './showcase/ShowcaseRoomScene';
import { SHOWCASE_PALETTE } from './showcase/showcasePalette';

type ProfileVitrinePreviewCardProps = {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  loading: boolean;
  onOpenShowcase: () => void;
  onOpenVisitor: () => void;
  preview?: boolean;
  pseudo: string;
  rankAccent: string;
  rankLabel: string;
};

export default function ProfileVitrinePreviewCard({
  cosmetics,
  data,
  loading,
  onOpenShowcase,
  onOpenVisitor,
  preview = false,
  pseudo,
  rankAccent,
  rankLabel,
}: ProfileVitrinePreviewCardProps) {
  const ringEquipment = useShowcaseRingEquipment(
    preview ? `preview-${pseudo}` : pseudo,
    preview ? 'rank' : null,
  );
  const ringStats = useMemo(() => adaptShowcaseRingStats(data), [data]);
  const equippedRing = useMemo(
    () => resolveEquippedShowcaseRing(ringStats, ringEquipment.family),
    [ringEquipment.family, ringStats],
  );
  const level = loading ? '—' : data?.level.level ?? '—';
  const displayedRank = loading ? '—' : rankLabel;
  const publicProfile = !loading && Boolean(data?.publicProfile);
  const visitorDisabled = loading || !data || !data.publicProfile;
  const visibleBadges = loading ? [] : (data?.pinnedBadges ?? []).filter((badge) => badge.obtained);
  const trophies = loading ? [] : (data?.badges ?? []).filter((badge) => badge.obtained);
  const status = loading ? '—' : publicProfile ? 'EN LIGNE' : 'PRIVÉE';
  const statusColor = publicProfile ? colors.success : '#FFB84D';

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View accessible accessibilityLabel={`Ma Vitrine de ${data?.pseudo || pseudo}`} style={styles.headingCopy}>
          <Text style={styles.title}>MA VITRINE</Text>
          <Text style={styles.eyebrow}>APERÇU PUBLIC</Text>
        </View>
        <View style={[styles.status, !loading && { borderColor: alpha(statusColor, '66') }]}>
          <View style={[styles.statusDot, { backgroundColor: loading ? '#59636D' : statusColor }]} />
          <Text style={[styles.statusText, !loading && { color: statusColor }]}>{status}</Text>
        </View>
      </View>

      <ShowcaseRoomScene
        cosmetics={cosmetics}
        data={data}
        equippedRing={equippedRing}
        loading={loading}
        mode="preview"
        rankAccent={rankAccent}
        rankLabel={displayedRank}
        style={styles.scene}
      />

      <View style={styles.summary}>
        <SummaryStat label={displayedRank} value={loading ? '—' : `NIV. ${level}`} valueColor={rankAccent} />
        <View style={styles.summaryDivider} />
        <SummaryStat label="BADGES" value={loading ? '—' : visibleBadges.length} valueColor="#54D9FF" />
        <View style={styles.summaryDivider} />
        <SummaryStat label="TROPHÉES" value={loading ? '—' : trophies.length} valueColor="#C98B58" />
      </View>

      <Pressable
        accessibilityLabel="Ouvrir ma Vitrine en paysage"
        accessibilityRole="button"
        onPress={onOpenShowcase}
        style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
      >
        <LandscapeModeIcon />
        <Text style={styles.primaryActionText}>OUVRIR EN PAYSAGE</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={visitorDisabled ? 'Voir comme visiteur, indisponible pour un profil privé' : 'Voir ma Vitrine comme visiteur'}
        accessibilityRole="button"
        accessibilityState={{ disabled: visitorDisabled }}
        disabled={visitorDisabled}
        onPress={onOpenVisitor}
        style={({ pressed }) => [styles.secondaryAction, visitorDisabled && styles.disabled, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryActionText}>VOIR COMME VISITEUR</Text>
      </Pressable>
    </View>
  );
}

function LandscapeModeIcon() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.landscapeIcon}>
      <View style={[styles.landscapeScreen, styles.landscapeScreenBack]} />
      <View style={[styles.landscapeScreen, styles.landscapeScreenFront]}>
        <View style={styles.landscapeScreenStand} />
      </View>
    </View>
  );
}

function SummaryStat({ label, value, valueColor }: { label: string; value: number | string; valueColor: string }) {
  return <View style={styles.summaryStat}><Text style={[styles.summaryValue, { color: valueColor }]}>{value}</Text><Text numberOfLines={1} style={styles.summaryLabel}>{label}</Text></View>;
}

function alpha(color: string, opacity: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${opacity}` : color;
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', marginHorizontal: 16, padding: 9, borderRadius: 19, backgroundColor: SHOWCASE_PALETTE.graphite, borderWidth: 1, borderColor: '#2A353E' },
  heading: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  headingCopy: { flex: 1, minWidth: 0 },
  title: { ...typography.sectionTitle, color: colors.text, fontSize: 18, lineHeight: 20 },
  eyebrow: { ...typography.eyebrow, marginTop: 1, color: colors.volt, fontSize: 8, letterSpacing: 0.65 },
  status: { minHeight: 23, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 7, backgroundColor: '#080C10', borderWidth: 1, borderColor: '#273139' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...typography.label, color: colors.textMuted, fontSize: 8, letterSpacing: 0.3 },
  scene: { marginTop: 5 },
  summary: { minHeight: 36, flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#090E13', borderWidth: 1, borderTopWidth: 0, borderColor: '#222D35', borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  summaryStat: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { ...typography.bodyStrong, fontSize: 14 },
  summaryLabel: { ...typography.label, maxWidth: '94%', marginTop: -1, color: colors.textMuted, fontSize: 6, textAlign: 'center' },
  summaryDivider: { width: 1, marginVertical: 8, backgroundColor: '#2A343D' },
  primaryAction: { minHeight: 38, marginTop: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 9, backgroundColor: colors.volt, boxShadow: '0 8px 20px rgba(232,255,61,.08)' },
  landscapeIcon: { position: 'relative', width: 22, height: 16 },
  landscapeScreen: { position: 'absolute', width: 15, height: 10, borderRadius: 2, borderWidth: 1.4, borderColor: '#080A0C', backgroundColor: colors.volt },
  landscapeScreenBack: { top: 1, left: 1, opacity: 0.58, transform: [{ rotate: '-7deg' }] },
  landscapeScreenFront: { right: 0, bottom: 1 },
  landscapeScreenStand: { position: 'absolute', right: 4, bottom: -3, width: 6, height: 2, borderTopWidth: 1, borderTopColor: '#080A0C' },
  primaryActionText: { ...typography.action, color: '#080A0C', fontSize: 10, letterSpacing: 0.55 },
  secondaryAction: { minHeight: 29, marginTop: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#080D11', borderWidth: 1, borderColor: '#252F37' },
  secondaryActionText: { ...typography.action, color: '#8C98A3', fontSize: 8, letterSpacing: 0.3 },
  disabled: { opacity: 0.34 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.995 }] },
});
