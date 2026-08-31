import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fonts, layout, typography } from '@/src/theme';

import type { AchievementBadgeSlots } from '../equipment';
import { isLockedSecretBadge } from '../publicView';
import type { BadgeId, BadgeRarity, PublicAchievementBadge } from '../types';
import AchievementBadgeArtwork from './AchievementBadgeArtwork';

type AchievementBadgeDetailSheetProps = {
  badge: PublicAchievementBadge | null;
  equipment: AchievementBadgeSlots;
  onClose: () => void;
  onEquip: (slotIndex: number, badgeId: BadgeId | null) => Promise<void>;
};

export default function AchievementBadgeDetailSheet({
  badge,
  equipment,
  onClose,
  onEquip,
}: AchievementBadgeDetailSheetProps) {
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPendingSlot(null);
    setError(null);
  }, [badge?.id]);

  async function handleSlot(slotIndex: number) {
    if (!badge?.obtained || pendingSlot != null) return;
    setPendingSlot(slotIndex);
    setError(null);
    try {
      await onEquip(slotIndex, equipment[slotIndex] === badge.id ? null : badge.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de modifier la Vitrine.');
    } finally {
      setPendingSlot(null);
    }
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={Boolean(badge)}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Fermer le détail du badge" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
        {badge ? (
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.topline}>
                <View style={styles.titleCopy}>
                  <Text style={styles.eyebrow}>{badge.isSecret ? 'ARCHIVE SCELLÉE' : 'ACCOMPLISSEMENT'}{' // '}{categoryLabel(badge.category)}</Text>
                  <Text style={styles.title}>{badge.name.toUpperCase()}</Text>
                </View>
                <Pressable accessibilityLabel="Fermer" accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
                  <Text style={styles.closeText}>×</Text>
                </Pressable>
              </View>

              <View style={styles.artworkStage}>
                <View style={[styles.artworkGlow, { backgroundColor: badge.accent }]} />
                <AchievementBadgeArtwork badge={badge} size={154} />
              </View>

              <View style={styles.tags}>
                <Tag color={rarityColor(badge.rarity)} label={rarityLabel(badge.rarity)} />
                <Tag color={badge.obtained ? colors.success : '#77838D'} label={badge.obtained ? 'OBTENU' : 'VERROUILLÉ'} />
                {badge.seasonId ? <Tag color="#8FA2B1" label={badge.seasonId.toUpperCase()} /> : null}
              </View>

              {isLockedSecretBadge(badge) ? (
                <View style={styles.secretPanel} testID="locked-secret-public-detail">
                  <Text style={styles.secretLabel}>INDICE PUBLIC</Text>
                  <Text style={styles.secretClue}>{badge.clue}</Text>
                  <Text style={styles.secretPromise}>Le nom, la condition exacte et le mécanisme ouvert resteront cachés jusqu’au déblocage.</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.description}>{badge.description}</Text>
                  <View style={styles.conditionPanel}>
                    <Text style={styles.conditionLabel}>CONDITION</Text>
                    <Text style={styles.condition}>{badge.condition}</Text>
                  </View>
                  {badge.unlockedAt ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>OBTENU LE</Text>
                      <Text style={styles.detailValue}>{formatDate(badge.unlockedAt)}</Text>
                    </View>
                  ) : null}
                </>
              )}

              {badge.obtained ? (
                <View style={styles.exposure}>
                  <Text style={styles.exposureEyebrow}>VITRINE // 4 EMPLACEMENTS</Text>
                  <Text style={styles.exposureTitle}>CHOISIS SON SOCLE.</Text>
                  <View style={styles.slotGrid}>
                    {equipment.map((equippedId, index) => {
                      const selected = equippedId === badge.id;
                      const occupied = Boolean(equippedId && !selected);
                      return (
                        <Pressable
                          accessibilityLabel={`${selected ? 'Retirer du' : 'Exposer sur le'} socle ${index + 1}`}
                          accessibilityRole="button"
                          accessibilityState={{ busy: pendingSlot === index, selected }}
                          key={`badge-slot-${index}`}
                          onPress={() => void handleSlot(index)}
                          style={({ pressed }) => [styles.slot, selected && styles.slotSelected, pressed && styles.pressed]}
                        >
                          {pendingSlot === index ? <ActivityIndicator color={selected ? colors.volt : colors.text} size="small" /> : (
                            <>
                              <Text style={[styles.slotNumber, selected && styles.slotNumberSelected]}>{index + 1}</Text>
                              <Text style={[styles.slotState, selected && styles.slotStateSelected]}>{selected ? 'EXPOSÉ' : occupied ? 'REMPLACER' : 'LIBRE'}</Text>
                            </>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function Tag({ color, label }: { color: string; label: string }) {
  return <View style={[styles.tag, { borderColor: `${color}72`, backgroundColor: `${color}12` }]}><Text style={[styles.tagText, { color }]}>{label}</Text></View>;
}

function categoryLabel(category: PublicAchievementBadge['category']) {
  if (category === 'calls') return 'CALLS';
  if (category === 'social') return 'SOCIAL';
  if (category === 'faction') return 'FACTION';
  if (category === 'season') return 'SAISON';
  return 'MYSTÈRE';
}

function rarityLabel(rarity: BadgeRarity) {
  if (rarity === 'legendary') return 'LÉGENDAIRE';
  if (rarity === 'epic') return 'ÉPIQUE';
  if (rarity === 'rare') return 'RARE';
  if (rarity === 'secret') return 'SECRET';
  return 'COMMUN';
}

function rarityColor(rarity: BadgeRarity) {
  if (rarity === 'legendary') return '#E5C07B';
  if (rarity === 'epic') return '#A982FF';
  if (rarity === 'rare') return '#63B8FF';
  if (rarity === 'secret') return '#D1D7DC';
  return '#AAB4BE';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR');
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,5,7,.82)' },
  sheet: { width: '100%', maxWidth: layout.contentMaxWidth, maxHeight: '92%', alignSelf: 'center', borderTopLeftRadius: 31, borderTopRightRadius: 31, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  handle: { width: 42, height: 4, marginTop: 9, alignSelf: 'center', borderRadius: 2, backgroundColor: '#46515A' },
  content: { padding: 18, paddingBottom: 30, gap: 13 },
  topline: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleCopy: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .65 },
  title: { marginTop: 4, color: colors.text, fontFamily: fonts.display, fontSize: 31, lineHeight: 32 },
  close: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  closeText: { color: colors.text, fontSize: 25, lineHeight: 26 },
  artworkStage: { position: 'relative', minHeight: 180, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 24, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#30414E' },
  artworkGlow: { position: 'absolute', top: 20, width: 150, height: 120, borderRadius: 75, opacity: .12, boxShadow: '0 0 48px rgba(49,215,226,.12)' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: { minHeight: 27, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1 },
  tagText: { ...typography.label, letterSpacing: .35 },
  description: { ...typography.body, color: '#C3CBD1' },
  conditionPanel: { padding: 13, borderRadius: 17, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  conditionLabel: { ...typography.eyebrow, color: colors.volt, letterSpacing: .6 },
  condition: { ...typography.bodyStrong, marginTop: 6, color: colors.text },
  secretPanel: { padding: 15, borderRadius: 19, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  secretLabel: { ...typography.eyebrow, color: '#AEB8C0', letterSpacing: .7 },
  secretClue: { marginTop: 7, color: colors.text, fontFamily: fonts.display, fontSize: 24, lineHeight: 26 },
  secretPromise: { ...typography.caption, marginTop: 8, color: colors.textMuted },
  detailRow: { minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 14, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#30414E' },
  detailLabel: { ...typography.label, color: colors.textMuted },
  detailValue: { ...typography.bodyStrong, color: colors.text },
  exposure: { paddingTop: 4 },
  exposureEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 },
  exposureTitle: { marginTop: 3, color: colors.text, fontFamily: fonts.display, fontSize: 22, lineHeight: 24 },
  slotGrid: { marginTop: 10, flexDirection: 'row', gap: 7 },
  slot: { flex: 1, minWidth: 0, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  slotSelected: { backgroundColor: '#18200F', borderColor: '#657428' },
  slotNumber: { color: colors.text, fontFamily: fonts.display, fontSize: 20 },
  slotNumberSelected: { color: colors.volt },
  slotState: { ...typography.label, marginTop: 2, color: colors.textMuted },
  slotStateSelected: { color: colors.volt },
  error: { ...typography.caption, padding: 9, color: '#FF9AA2', borderRadius: 12, backgroundColor: '#1A1012' },
  pressed: { opacity: .72, transform: [{ scale: .99 }] },
});
