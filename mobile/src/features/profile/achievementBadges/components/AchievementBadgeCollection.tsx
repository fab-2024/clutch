import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing, typography } from '@/src/theme';

import type { AchievementBadgeSlots } from '../equipment';
import { isLockedSecretBadge } from '../publicView';
import type { AchievementBadgeCategory, BadgeId, PublicAchievementBadge } from '../types';
import AchievementBadgeArtwork from './AchievementBadgeArtwork';
import AchievementBadgeDetailSheet from './AchievementBadgeDetailSheet';

export type BadgeCollectionFilter = 'all' | AchievementBadgeCategory;

type AchievementBadgeCollectionProps = {
  badges: readonly PublicAchievementBadge[];
  equipment: AchievementBadgeSlots;
  initialFilter?: BadgeCollectionFilter;
  initialSelectedId?: BadgeId | null;
  onEquip: (slotIndex: number, badgeId: BadgeId | null) => Promise<void>;
};

const FILTERS: readonly { id: BadgeCollectionFilter; label: string }[] = [
  { id: 'all', label: 'TOUS' },
  { id: 'calls', label: 'CALLS' },
  { id: 'social', label: 'SOCIAL' },
  { id: 'faction', label: 'FACTION' },
  { id: 'season', label: 'SAISON' },
  { id: 'secret', label: 'MYSTÈRE' },
];

export default function AchievementBadgeCollection({
  badges,
  equipment,
  initialFilter = 'all',
  initialSelectedId = null,
  onEquip,
}: AchievementBadgeCollectionProps) {
  const [filter, setFilter] = useState<BadgeCollectionFilter>(initialFilter);
  const [selectedId, setSelectedId] = useState<BadgeId | null>(initialSelectedId);

  useEffect(() => setFilter(initialFilter), [initialFilter]);
  useEffect(() => setSelectedId(initialSelectedId), [initialSelectedId]);

  const visible = useMemo(
    () => filter === 'all' ? badges : badges.filter((badge) => badge.category === filter),
    [badges, filter],
  );
  const selected = badges.find((badge) => badge.id === selectedId) ?? null;
  const obtainedCount = badges.filter((badge) => badge.obtained).length;

  return (
    <View style={styles.root}>
      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryEyebrow}>ACCOMPLISSEMENTS</Text>
          <Text style={styles.summaryTitle}>{obtainedCount} / {badges.length} OBTENUS</Text>
        </View>
        <Text style={styles.summaryPromise}>JAMAIS ACHETABLES</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((item) => {
          const active = item.id === filter;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={item.id}
              onPress={() => setFilter(item.id)}
              style={({ pressed }) => [styles.filter, active && styles.filterActive, pressed && styles.pressed]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.grid}>
        {visible.map((badge) => (
          <BadgeCard
            badge={badge}
            equipped={equipment.includes(badge.id)}
            key={badge.id}
            onPress={() => setSelectedId(badge.id)}
          />
        ))}
      </View>

      <AchievementBadgeDetailSheet
        badge={selected}
        equipment={equipment}
        onClose={() => setSelectedId(null)}
        onEquip={onEquip}
      />
    </View>
  );
}

function BadgeCard({
  badge,
  equipped,
  onPress,
}: {
  badge: PublicAchievementBadge;
  equipped: boolean;
  onPress: () => void;
}) {
  const secretLocked = isLockedSecretBadge(badge);
  const progress = !secretLocked && badge.progress
    ? Math.max(0, Math.min(1, badge.progress.current / Math.max(1, badge.progress.target)))
    : 0;
  const detail = secretLocked
    ? badge.clue
    : badge.dataAvailable
      ? badge.condition
      : 'Donnée nécessaire non synchronisée.';

  return (
    <Pressable
      accessibilityLabel={`${badge.name}, ${badge.obtained ? 'obtenu' : 'verrouillé'}. ${detail}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, badge.obtained && { borderColor: `${badge.accent}60` }, pressed && styles.pressed]}
      testID={`achievement-badge-card-${badge.id}`}
    >
      <View style={styles.artwork}>
        <View style={[styles.cardGlow, { backgroundColor: badge.accent }]} />
        <AchievementBadgeArtwork badge={badge} muted={!badge.obtained && !secretLocked} size={96} />
        {equipped ? <View style={styles.equipped}><Text style={styles.equippedText}>EXPOSÉ</Text></View> : null}
      </View>
      <View style={styles.cardTopline}>
        <Text style={[styles.rarity, { color: rarityColor(badge.rarity) }]}>{rarityLabel(badge.rarity)}</Text>
        <Text style={styles.state}>{badge.obtained ? 'OBTENU' : secretLocked ? 'SCELLÉ' : 'À DÉBLOQUER'}</Text>
      </View>
      <Text numberOfLines={2} style={styles.name}>{badge.name}</Text>
      <Text numberOfLines={3} style={styles.detail}>{detail}</Text>
      {!secretLocked && !badge.obtained && badge.progress ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { backgroundColor: badge.accent, width: `${Math.max(2, progress * 100)}%` }]} /></View>
          <Text style={styles.progressText}>{formatProgress(badge.progress.current)} / {formatProgress(badge.progress.target)}</Text>
        </View>
      ) : null}
      {badge.obtained && badge.unlockedAt ? <Text style={styles.date}>OBTENU LE {formatDate(badge.unlockedAt)}</Text> : null}
    </Pressable>
  );
}

function rarityLabel(rarity: PublicAchievementBadge['rarity']) {
  if (rarity === 'legendary') return 'LÉGENDAIRE';
  if (rarity === 'epic') return 'ÉPIQUE';
  if (rarity === 'rare') return 'RARE';
  if (rarity === 'secret') return 'MYSTÈRE';
  return 'COMMUN';
}

function rarityColor(rarity: PublicAchievementBadge['rarity']) {
  if (rarity === 'legendary') return '#E5C07B';
  if (rarity === 'epic') return '#A982FF';
  if (rarity === 'rare') return '#63B8FF';
  if (rarity === 'secret') return '#C7D0D7';
  return '#AAB4BE';
}

function formatProgress(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR');
}

export function badgeFilterFromParam(value?: string | string[]): BadgeCollectionFilter {
  const normalized = Array.isArray(value) ? value[0] : value;
  return FILTERS.some((filter) => filter.id === normalized)
    ? normalized as BadgeCollectionFilter
    : 'all';
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  summary: { minHeight: 74, marginHorizontal: spacing.md, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderRadius: 21, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  summaryEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 },
  summaryTitle: { marginTop: 3, color: colors.text, fontFamily: fonts.display, fontSize: 23, lineHeight: 24 },
  summaryPromise: { ...typography.label, color: '#798590', textAlign: 'right' },
  filters: { gap: 7, paddingHorizontal: spacing.md },
  filter: { minHeight: 44, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#30414E' },
  filterActive: { backgroundColor: '#19210F', borderColor: '#596725' },
  filterText: { ...typography.label, color: colors.textMuted, letterSpacing: .3 },
  filterTextActive: { color: colors.volt },
  grid: { marginHorizontal: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { position: 'relative', width: '47%', minHeight: 340, padding: 11, borderRadius: 22, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  artwork: { position: 'relative', height: 116, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 17, backgroundColor: '#0B1218' },
  cardGlow: { position: 'absolute', width: 85, height: 85, borderRadius: 43, opacity: .1, boxShadow: '0 0 28px rgba(49,215,226,.12)' },
  equipped: { position: 'absolute', top: 7, right: 7, minHeight: 28, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.volt },
  equippedText: { ...typography.label, color: '#080A0C' },
  cardTopline: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  rarity: { ...typography.eyebrow, flex: 1, letterSpacing: .45 },
  state: { ...typography.label, color: colors.textMuted },
  name: { ...typography.bodyStrong, minHeight: 38, marginTop: 5, color: colors.text },
  detail: { ...typography.caption, minHeight: 45, marginTop: 3, color: colors.textMuted },
  progressBlock: { marginTop: 'auto', paddingTop: 9 },
  progressTrack: { height: 5, overflow: 'hidden', borderRadius: 3, backgroundColor: '#152633' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { ...typography.label, marginTop: 4, color: '#89959F', textAlign: 'right' },
  date: { ...typography.label, marginTop: 'auto', paddingTop: 9, color: '#87939D' },
  pressed: { opacity: .72, transform: [{ scale: .992 }] },
});
