import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, typography } from '@/src/theme';

import { showcaseRingMetricLabel } from '../progression';
import type {
  ShowcaseRingFamily,
  ShowcaseRingProgress,
  ShowcaseRingStats,
} from '../types';
import ShowcaseRingDetailSheet from './ShowcaseRingDetailSheet';

type ShowcaseRingCollectionProps = {
  onEquip: (family: ShowcaseRingFamily | null) => void | Promise<void>;
  progressions: ShowcaseRingProgress[];
  stats: ShowcaseRingStats;
};

export default function ShowcaseRingCollection({
  onEquip,
  progressions,
  stats,
}: ShowcaseRingCollectionProps) {
  const [selectedFamily, setSelectedFamily] = useState<ShowcaseRingFamily | null>(null);
  const selected = progressions.find(({ family }) => family === selectedFamily) ?? null;

  return (
    <>
      <View style={styles.intro}>
        <Text style={styles.introEyebrow}>OBJETS GRATUITS // ACCOMPLISSEMENTS</Text>
        <Text style={styles.introTitle}>CINQ TRACES. UNE VITRINE.</Text>
        <Text style={styles.introText}>
          Chaque anneau évolue automatiquement vers le plus haut palier débloqué. Aucun achat, aucun avantage compétitif.
        </Text>
      </View>

      <View style={styles.list}>
        {progressions.map((progress) => (
          <RingFamilyCard
            equipped={progress.availability === 'equipped'}
            key={progress.family}
            metricSource={stats[progress.family].source}
            onOpen={() => setSelectedFamily(progress.family)}
            progress={progress}
          />
        ))}
      </View>

      <ShowcaseRingDetailSheet
        onClose={() => setSelectedFamily(null)}
        onEquip={onEquip}
        progress={selected}
        visible={Boolean(selected)}
      />
    </>
  );
}

function RingFamilyCard({
  equipped,
  metricSource,
  onOpen,
  progress,
}: {
  equipped: boolean;
  metricSource: ShowcaseRingStats[ShowcaseRingFamily]['source'];
  onOpen: () => void;
  progress: ShowcaseRingProgress;
}) {
  const { definition, display } = progress;
  const locked = progress.availability === 'locked';
  const sourceMissing = metricSource === 'missing' && progress.family !== 'rank';

  return (
    <Pressable
      accessibilityHint="Ouvre la fiche de progression et les options d’équipement"
      accessibilityLabel={`${definition.name}, ${display.name}, ${progress.unlockedStages} paliers sur 5${equipped ? ', équipé' : ''}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        { borderColor: equipped ? `${definition.accent}A6` : `${definition.accent}3D` },
        pressed && styles.pressed,
      ]}
      testID={`showcase-ring-family-${progress.family}`}
    >
      <LinearGradient
        colors={[`${definition.accent}15`, 'rgba(8,12,16,.93)', '#080C10']}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.cardTop}>
        <View style={[styles.heroVisual, { borderColor: `${definition.accent}36` }]}>
          <View style={[styles.heroGlow, { backgroundColor: `${definition.accent}20` }]} />
          <Image
            resizeMode="contain"
            source={display.assets.full}
            style={[styles.heroImage, locked && styles.lockedImage]}
            tintColor={locked ? '#77838D' : undefined}
          />
          {locked ? <Text style={styles.heroLock}>◇</Text> : null}
        </View>

        <View style={styles.cardCopy}>
          <View style={styles.cardHeading}>
            <View style={styles.cardHeadingCopy}>
              <Text style={[styles.family, { color: definition.accent }]}>{definition.name.toUpperCase()}</Text>
              <Text style={styles.stage}>{display.name.toUpperCase()}</Text>
            </View>
            <View style={[styles.state, equipped && { borderColor: `${definition.accent}78`, backgroundColor: `${definition.accent}14` }]}>
              <View style={[styles.stateDot, { backgroundColor: equipped ? definition.accent : locked ? '#56616B' : colors.success }]} />
              <Text style={[styles.stateText, equipped && { color: definition.accent }]}>
                {equipped ? 'ÉQUIPÉ' : locked ? 'VERROUILLÉ' : 'DÉBLOQUÉ'}
              </Text>
            </View>
          </View>

          <Text numberOfLines={2} style={styles.description}>{definition.description}</Text>
          <View style={styles.metricRow}>
            <View>
              <Text style={styles.metricLabel}>PROGRESSION</Text>
              <Text style={styles.metricValue}>{showcaseRingMetricLabel(progress.family, progress.value)}</Text>
            </View>
            <Text style={[styles.stageCount, { color: definition.accent }]}>{progress.unlockedStages}/5</Text>
          </View>
        </View>
      </View>

      <View style={styles.evolution}>
        {definition.stages.map((stage) => {
          const unlocked = stage.stage <= progress.unlockedStages;
          const current = stage.stage === progress.current?.stage;
          return (
            <View key={stage.stage} style={styles.evolutionStep} testID={`showcase-ring-${progress.family}-stage-${stage.stage}`}>
              <View style={[
                styles.thumb,
                current && { borderColor: definition.accent, backgroundColor: `${definition.accent}11` },
              ]}>
                <Image
                  resizeMode="contain"
                  source={stage.assets.thumbnail}
                  style={[styles.thumbImage, !unlocked && styles.futureImage]}
                  tintColor={!unlocked ? '#69747E' : undefined}
                />
                {!unlocked ? <View style={styles.futureVeil}><Text style={styles.futureGlyph}>?</Text></View> : null}
              </View>
              <View style={[styles.stepLine, unlocked && { backgroundColor: definition.accent }]} />
              <Text numberOfLines={1} style={[styles.stepLabel, current && { color: definition.accent }]}>{stage.stage}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.nextRow}>
        <View style={styles.nextCopy}>
          <Text style={styles.nextLabel}>{progress.next ? 'PROCHAIN PALIER' : 'ÉVOLUTION COMPLÈTE'}</Text>
          <Text numberOfLines={2} style={styles.nextValue}>
            {progress.next?.condition.label ?? 'Toutes les couronnes sont révélées.'}
          </Text>
          {sourceMissing ? (
            <Text style={styles.missing}>DONNÉE EN ATTENTE DE SYNCHRONISATION</Text>
          ) : null}
        </View>
        <Text style={[styles.open, { color: definition.accent }]}>VOIR →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  intro: { marginHorizontal: 16, padding: 17, borderRadius: 22, backgroundColor: '#0A1015', borderWidth: 1, borderColor: '#27333C' },
  introEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .65 },
  introTitle: { marginTop: 5, color: colors.text, fontFamily: fonts.display, fontSize: 25, lineHeight: 26 },
  introText: { ...typography.body, maxWidth: 480, marginTop: 7, color: colors.textMuted },
  list: { paddingHorizontal: 16, gap: 13 },
  card: { position: 'relative', overflow: 'hidden', padding: 13, gap: 13, borderRadius: 24, backgroundColor: '#090E13', borderWidth: 1 },
  cardTop: { minHeight: 145, flexDirection: 'row', alignItems: 'stretch', gap: 13 },
  heroVisual: { position: 'relative', overflow: 'hidden', width: 132, minHeight: 145, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#05080B', borderWidth: 1 },
  heroGlow: { position: 'absolute', width: 104, height: 104, borderRadius: 52 },
  heroImage: { width: 128, height: 128 },
  lockedImage: { opacity: .18 },
  heroLock: { position: 'absolute', color: '#9AA5AE', fontFamily: fonts.display, fontSize: 28 },
  cardCopy: { flex: 1, minWidth: 0, paddingVertical: 2 },
  cardHeading: { alignItems: 'flex-start' },
  cardHeadingCopy: { width: '100%', minWidth: 0 },
  family: { ...typography.eyebrow, letterSpacing: .7 },
  stage: { marginTop: 2, color: colors.text, fontFamily: fonts.display, fontSize: 21, lineHeight: 22 },
  state: { minHeight: 22, marginTop: 5, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 11, backgroundColor: '#11171D', borderWidth: 1, borderColor: '#303A43' },
  stateDot: { width: 5, height: 5, borderRadius: 3 },
  stateText: { ...typography.label, color: '#85919C', fontSize: 7 },
  description: { ...typography.caption, marginTop: 7, color: colors.textMuted },
  metricRow: { marginTop: 'auto', paddingTop: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  metricLabel: { ...typography.label, color: '#65727D', fontSize: 8 },
  metricValue: { ...typography.bodyStrong, marginTop: 2, color: colors.text },
  stageCount: { fontFamily: fonts.display, fontSize: 23, lineHeight: 24 },
  evolution: { minHeight: 70, flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  evolutionStep: { position: 'relative', flex: 1, minWidth: 0, alignItems: 'center' },
  thumb: { position: 'relative', width: '100%', aspectRatio: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#080C10', borderWidth: 1, borderColor: '#222C34' },
  thumbImage: { width: '100%', height: '100%' },
  futureImage: { opacity: .09 },
  futureVeil: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  futureGlyph: { color: '#69747E', fontFamily: fonts.display, fontSize: 16 },
  stepLine: { position: 'absolute', right: '-8%', bottom: 8, left: '58%', height: 1, backgroundColor: '#2C363F' },
  stepLabel: { ...typography.label, marginTop: 3, color: '#6D7983', fontSize: 7 },
  nextRow: { minHeight: 48, paddingTop: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#202A32' },
  nextCopy: { flex: 1, minWidth: 0 },
  nextLabel: { ...typography.eyebrow, color: '#687580', fontSize: 8 },
  nextValue: { ...typography.bodyStrong, marginTop: 2, color: colors.text },
  missing: { ...typography.label, marginTop: 4, color: '#C7A65C', fontSize: 7 },
  open: { ...typography.action, fontSize: 9 },
  pressed: { opacity: .76, transform: [{ scale: .995 }] },
});
