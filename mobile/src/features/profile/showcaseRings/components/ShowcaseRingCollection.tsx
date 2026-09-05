import { LinearGradient } from 'expo-linear-gradient';
import Lock from 'lucide-react-native/icons/lock';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

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
        <Text style={styles.introTitle}>TREIZE SIGNATURES. UNE VITRINE.</Text>
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
  const sourceMissing = metricSource === 'missing';
  const previousUnlockedStages = useRef(progress.unlockedStages);
  const [unlockPulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const previous = previousUnlockedStages.current;
    previousUnlockedStages.current = progress.unlockedStages;
    if (progress.unlockedStages <= previous) return undefined;

    const animation = Animated.sequence([
      Animated.timing(unlockPulse, {
        duration: 180,
        easing: Easing.out(Easing.quad),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(unlockPulse, {
        duration: 420,
        easing: Easing.inOut(Easing.quad),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [progress.unlockedStages, unlockPulse]);

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
          <Animated.View
            pointerEvents="none"
            style={[
              styles.corePulse,
              {
                borderColor: definition.accent,
                opacity: unlockPulse,
                transform: [{ scale: unlockPulse.interpolate({ inputRange: [0, 1], outputRange: [.72, 1.7] }) }],
              },
            ]}
            testID={`showcase-ring-unlock-pulse-${progress.family}`}
          />
          {locked ? (
            <View style={styles.heroLock} testID={`showcase-ring-core-lock-${progress.family}`}>
              <Lock color="#AAB3BB" size={13} strokeWidth={2} />
            </View>
          ) : null}
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
              <Text style={styles.metricValue}>
                {sourceMissing ? '—' : showcaseRingMetricLabel(progress.family, progress.value)}
              </Text>
            </View>
            <Text style={[styles.stageCount, { color: definition.accent }]}>{progress.unlockedStages}/5</Text>
          </View>
        </View>
      </View>

      <View style={styles.evolution}>
        {definition.stages.map((stage) => {
          const unlocked = stage.stage <= progress.unlockedStages;
          const current = stage.stage === progress.current?.stage;
          const next = !unlocked && stage.stage === progress.next?.stage;
          return (
            <View
              key={stage.stage}
              style={styles.evolutionStep}
              testID={next
                ? `showcase-ring-${progress.family}-next-stage`
                : `showcase-ring-${progress.family}-stage-${stage.stage}`}
            >
              <View style={[
                styles.thumb,
                current && { borderColor: definition.accent, backgroundColor: `${definition.accent}11` },
                next && styles.nextThumb,
              ]}>
                <Image
                  resizeMode="contain"
                  source={stage.assets.thumbnail}
                  style={[styles.thumbImage, !unlocked && (next ? styles.nextImage : styles.futureImage)]}
                  tintColor={!unlocked ? '#69747E' : undefined}
                />
                {next ? (
                  <View style={styles.nextLock}>
                    <Lock color="#B5BEC5" size={9} strokeWidth={2} />
                  </View>
                ) : null}
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
  intro: { marginHorizontal: 16, padding: 17, borderRadius: 22, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#30414E' },
  introEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .65 },
  introTitle: { marginTop: 5, color: colors.text, fontFamily: fonts.display, fontSize: 25, lineHeight: 26 },
  introText: { ...typography.body, maxWidth: 480, marginTop: 7, color: colors.textMuted },
  list: { paddingHorizontal: 16, gap: 13 },
  card: { position: 'relative', overflow: 'hidden', padding: 13, gap: 13, borderRadius: 24, backgroundColor: '#0B1218', borderWidth: 1 },
  cardTop: { minHeight: 145, flexDirection: 'row', alignItems: 'stretch', gap: 13 },
  heroVisual: { position: 'relative', overflow: 'hidden', width: 132, minHeight: 145, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#0B1218', borderWidth: 1 },
  heroGlow: { position: 'absolute', width: 104, height: 104, borderRadius: 52 },
  heroImage: { width: 128, height: 128 },
  lockedImage: { opacity: .5 },
  corePulse: { position: 'absolute', width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  heroLock: { position: 'absolute', width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: 'rgba(8,12,16,.86)', borderWidth: 1, borderColor: '#68747E' },
  cardCopy: { flex: 1, minWidth: 0, paddingVertical: 2 },
  cardHeading: { alignItems: 'flex-start' },
  cardHeadingCopy: { width: '100%', minWidth: 0 },
  family: { ...typography.eyebrow, letterSpacing: .7 },
  stage: { marginTop: 2, color: colors.text, fontFamily: fonts.display, fontSize: 21, lineHeight: 22 },
  state: { minHeight: 28, marginTop: 5, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  stateDot: { width: 5, height: 5, borderRadius: 3 },
  stateText: { ...typography.label, color: '#85919C' },
  description: { ...typography.caption, marginTop: 7, color: colors.textMuted },
  metricRow: { marginTop: 'auto', paddingTop: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  metricLabel: { ...typography.label, color: colors.textMuted },
  metricValue: { ...typography.bodyStrong, marginTop: 2, color: colors.text },
  stageCount: { fontFamily: fonts.display, fontSize: 23, lineHeight: 24 },
  evolution: { minHeight: 84, flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  evolutionStep: { position: 'relative', flex: 1, minWidth: 0, alignItems: 'center' },
  thumb: { position: 'relative', width: '100%', aspectRatio: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#30414E' },
  thumbImage: { width: '100%', height: '100%' },
  nextThumb: { borderColor: '#7A8791', backgroundColor: '#10171D' },
  nextImage: { opacity: .52 },
  futureImage: { opacity: .18 },
  nextLock: { position: 'absolute', width: 17, height: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: 'rgba(8,12,16,.88)', borderWidth: 1, borderColor: '#69747E' },
  stepLine: { position: 'absolute', right: '-8%', bottom: 8, left: '58%', height: 1, backgroundColor: '#152633' },
  stepLabel: { ...typography.label, marginTop: 3, color: colors.textMuted },
  nextRow: { minHeight: 56, paddingTop: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#30414E' },
  nextCopy: { flex: 1, minWidth: 0 },
  nextLabel: { ...typography.eyebrow, color: colors.textMuted },
  nextValue: { ...typography.bodyStrong, marginTop: 2, color: colors.text },
  missing: { ...typography.label, marginTop: 4, color: '#C7A65C' },
  open: { ...typography.action },
  pressed: { opacity: .76, transform: [{ scale: .995 }] },
});
