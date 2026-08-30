import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing, typography } from '@/src/theme';

import type { PublicAchievementBadge } from '../types';

const TROPHY_ASSET = require('../../../../../assets/showcase/showcase-trophy-v1.png');
const TROPHY_SLOT_COUNT = 4;

type ShowcaseTrophyCollectionProps = {
  badges: readonly PublicAchievementBadge[];
};

export default function ShowcaseTrophyCollection({ badges }: ShowcaseTrophyCollectionProps) {
  const trophies = badges.filter((badge) => badge.obtained).slice(0, TROPHY_SLOT_COUNT);
  const slots = Array.from(
    { length: TROPHY_SLOT_COUNT },
    (_, index) => trophies[index] ?? null,
  );

  return (
    <View style={styles.root}>
      <View style={styles.intro}>
        <Text style={styles.introEyebrow}>VITRINE // TROPHÉES</Text>
        <Text style={styles.introTitle}>{trophies.length} / {TROPHY_SLOT_COUNT} EXPOSÉS</Text>
        <Text style={styles.introText}>
          Chaque accomplissement obtenu révèle un trophée permanent dans ta collection.
        </Text>
      </View>

      <View style={styles.grid}>
        {slots.map((badge, index) => badge ? (
          <View
            accessible
            accessibilityLabel={`Trophée ${badge.name}, obtenu`}
            key={badge.id}
            style={[styles.card, { borderColor: `${badge.accent}55` }]}
            testID={`showcase-trophy-${badge.id}`}
          >
            <View style={styles.visual}>
              <View style={[styles.glow, { backgroundColor: badge.accent }]} />
              <Image resizeMode="contain" source={TROPHY_ASSET} style={styles.image} />
              <View style={[styles.accent, { backgroundColor: badge.accent }]} />
              <Text style={styles.serial}>0{index + 1}</Text>
            </View>
            <Text style={[styles.rarity, { color: badge.accent }]}>{rarityLabel(badge.rarity)}</Text>
            <Text numberOfLines={2} style={styles.name}>{badge.name}</Text>
            <Text numberOfLines={2} style={styles.condition}>{badge.condition}</Text>
          </View>
        ) : (
          <View
            accessible
            accessibilityLabel={`Emplacement de trophée ${index + 1}, verrouillé`}
            key={`locked-${index}`}
            style={[styles.card, styles.cardLocked]}
            testID={`showcase-trophy-locked-${index}`}
          >
            <View style={styles.visual}>
              <Image resizeMode="contain" source={TROPHY_ASSET} style={[styles.image, styles.imageLocked]} tintColor="#6D7881" />
              <Text style={styles.lock}>?</Text>
              <Text style={styles.serial}>0{index + 1}</Text>
            </View>
            <Text style={styles.lockedEyebrow}>À DÉBLOQUER</Text>
            <Text style={styles.nameLocked}>TROPHÉE SCELLÉ</Text>
            <Text style={styles.condition}>Obtiens un nouvel accomplissement pour révéler cet emplacement.</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function rarityLabel(rarity: PublicAchievementBadge['rarity']) {
  if (rarity === 'legendary') return 'LÉGENDAIRE';
  if (rarity === 'epic') return 'ÉPIQUE';
  if (rarity === 'rare') return 'RARE';
  if (rarity === 'secret') return 'MYSTÈRE';
  return 'COMMUN';
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  intro: { marginHorizontal: spacing.md, padding: spacing.md, borderRadius: 22, backgroundColor: '#0A1015', borderWidth: 1, borderColor: '#27333C' },
  introEyebrow: { ...typography.eyebrow, color: '#D09A50', letterSpacing: 0.65 },
  introTitle: { marginTop: 5, color: colors.text, fontFamily: fonts.display, fontSize: 25, lineHeight: 26 },
  introText: { ...typography.body, maxWidth: 460, marginTop: 7, color: colors.textMuted },
  grid: { marginHorizontal: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', minHeight: 292, padding: 11, borderRadius: 22, backgroundColor: '#0A0F14', borderWidth: 1 },
  cardLocked: { borderColor: '#242F37' },
  visual: { position: 'relative', height: 142, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#070B0E' },
  glow: { position: 'absolute', width: 92, height: 92, borderRadius: 46, opacity: 0.14 },
  image: { width: 98, height: 124 },
  imageLocked: { opacity: 0.18 },
  accent: { position: 'absolute', right: 28, bottom: 10, left: 28, height: 2, borderRadius: 2 },
  serial: { ...typography.label, position: 'absolute', top: 8, right: 9, color: '#6D7881' },
  lock: { position: 'absolute', color: '#8A959E', fontFamily: fonts.display, fontSize: 27 },
  rarity: { ...typography.eyebrow, marginTop: 10, letterSpacing: 0.45 },
  lockedEyebrow: { ...typography.eyebrow, marginTop: 10, color: '#6D7881', letterSpacing: 0.45 },
  name: { ...typography.bodyStrong, minHeight: 38, marginTop: 4, color: colors.text },
  nameLocked: { ...typography.bodyStrong, minHeight: 38, marginTop: 4, color: '#78838C' },
  condition: { ...typography.caption, marginTop: 3, color: colors.textMuted },
});
