import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { RankEmblem } from '@/src/features/ranking/components/RankEmblem';
import {
  gradeAccent,
  gradeDefinition,
  type GradeTransition,
} from '@/src/features/ranking/grades';
import { colors, fonts, radius, typography } from '@/src/theme';

type PromotionAscensionProps = {
  announce?: boolean;
  delta: number;
  fragsAfter: number;
  fragsBefore: number;
  rankAfter: number | null;
  rankBefore: number | null;
  transition: GradeTransition;
};

type PromotionCeremonyProps = Pick<
  PromotionAscensionProps,
  'delta' | 'fragsAfter' | 'fragsBefore' | 'transition'
> & {
  progress: SharedValue<number>;
};

const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR');

export function PromotionAscensionCard({
  announce = false,
  delta,
  fragsAfter,
  rankAfter,
  rankBefore,
  transition,
}: PromotionAscensionProps) {
  const accent = gradeAccent(transition.after);
  const reward = gradeDefinition(transition.after);
  const beforeLabel = transition.before?.libelle ?? 'Palier précédent';
  const afterLabel = transition.after?.libelle ?? reward?.label ?? 'Nouveau palier';
  const threshold = transition.after?.minimum ?? reward?.minimum ?? fragsAfter;
  const rewardLabel = reward ? `${reward.rewardType} · ${reward.rewardName}` : null;
  const accessibilityLabel = [
    `Promotion de ${beforeLabel} vers ${afterLabel}.`,
    `${formatNumber(fragsAfter)} Frags, ${signed(delta)}.`,
    `Seuil de ${formatNumber(threshold)} Frags franchi.`,
    rewardLabel ? `Récompense de fin de saison améliorée : ${rewardLabel}.` : null,
  ].filter(Boolean).join(' ');

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion={announce ? 'polite' : undefined}
      style={[styles.card, { borderColor: `${accent}72` }]}
      testID="promotion-ascension-card"
    >
      <LinearGradient
        colors={[`${accent}18`, 'rgba(11,16,21,.98)', '#0B1015']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.cardHero}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.emblemSlot}>
          <View style={[styles.emblemHalo, { backgroundColor: accent }]} />
          <RankEmblem decorative grade={transition.after} size={92} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={[styles.eyebrow, { color: accent }]}>PALIER FRANCHI</Text>
          <Text numberOfLines={1} style={styles.gradeTitle}>{afterLabel.toUpperCase()}</Text>
          <Text style={styles.gradeRoute}>{beforeLabel} → {afterLabel}</Text>
          <View style={[styles.thresholdPill, { borderColor: `${accent}55`, backgroundColor: `${accent}12` }]}>
            <Text style={[styles.thresholdText, { color: accent }]}>SEUIL {formatNumber(threshold)} FRAGS</Text>
          </View>
        </View>
      </View>

      <View style={styles.rankFlow}>
        <RankValue label="AVANT" rank={rankBefore} />
        <View style={styles.rankDivider} />
        <RankValue accent={accent} label="APRÈS" rank={rankAfter} />
      </View>

      {reward ? (
        <View style={[styles.reward, { borderTopColor: `${accent}38` }]}>
          <View style={[styles.rewardMark, { borderColor: `${accent}55`, backgroundColor: `${accent}10` }]}>
            <Text style={[styles.rewardGlyph, { color: accent }]}>◆</Text>
          </View>
          <View style={styles.rewardCopy}>
            <Text style={styles.rewardEyebrow}>FIN DE SAISON AMÉLIORÉE</Text>
            <Text style={styles.rewardTitle}>{rewardLabel}</Text>
            <Text style={styles.rewardDetail}>{reward.rewardDetail}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function PromotionCeremony({
  delta,
  fragsAfter,
  fragsBefore,
  progress,
  transition,
}: PromotionCeremonyProps) {
  const accent = gradeAccent(transition.after);
  const beforeLabel = transition.before?.libelle ?? 'Palier précédent';
  const afterLabel = transition.after?.libelle ?? 'Nouveau palier';
  const threshold = transition.after?.minimum ?? gradeDefinition(transition.after)?.minimum ?? fragsAfter;

  const overlayMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, .1, .16, .94, 1], [0, 0, 1, 1, 0], Extrapolation.CLAMP),
  }));
  const verdictMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [.1, .16, .28, .36], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [.1, .2, .36], [.96, 1, 1.02], Extrapolation.CLAMP) }],
  }));
  const fragsMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [.28, .36, .52, .61], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.value, [.28, .38, .61], [8, 0, -4], Extrapolation.CLAMP) }],
  }));
  const trackMotion = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [.33, .56], [8, 100], Extrapolation.CLAMP)}%`,
  }));
  const thresholdMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [.5, .57, .68, .75], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [.5, .61, .75], [.94, 1.035, 1], Extrapolation.CLAMP) }],
  }));
  const emblemMotion = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [.65, .72, .95, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [.65, .76, 1], [10, 0, -2], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [.65, .76, .9], [.9, 1.035, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.overlay, overlayMotion]}
      testID="promotion-ceremony"
    >
      <LinearGradient colors={['rgba(5,8,11,.97)', '#080C10', 'rgba(5,8,11,.99)']} style={StyleSheet.absoluteFill} />
      <View style={[styles.overlayGlow, { backgroundColor: accent }]} />
      <View style={styles.ceremonyStage}>
        <Animated.View style={[styles.ceremonyScene, verdictMotion]}>
          <Text style={[styles.ceremonyEyebrow, { color: colors.success }]}>VERDICT SCELLÉ</Text>
          <Text style={styles.verdictTitle}>CALL VALIDÉ.</Text>
          <Text style={styles.ceremonyMeta}>Le rating saisonnier se met à jour.</Text>
        </Animated.View>

        <Animated.View style={[styles.ceremonyScene, fragsMotion]}>
          <Text style={styles.ceremonyEyebrow}>FRAGS SAISONNIERS</Text>
          <View style={styles.fragDelta}>
            <CurrencyIcon color={accent} kind="frags" size={21} />
            <Text style={[styles.fragDeltaText, { color: accent }]}>{signed(delta)}</Text>
          </View>
          <Text style={styles.fragRoute}>{formatNumber(fragsBefore)} → {formatNumber(fragsAfter)}</Text>
          <View style={styles.ceremonyTrack}>
            <Animated.View style={[styles.ceremonyTrackFill, { backgroundColor: accent }, trackMotion]} />
            <View style={[styles.thresholdNotch, { backgroundColor: accent }]} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.ceremonyScene, thresholdMotion]}>
          <View style={[styles.thresholdSeal, { borderColor: accent, backgroundColor: `${accent}14` }]}>
            <Text style={[styles.thresholdSealGlyph, { color: accent }]}>◆</Text>
          </View>
          <Text style={[styles.ceremonyEyebrow, { color: accent }]}>SEUIL FRANCHI</Text>
          <Text style={styles.thresholdValue}>{formatNumber(threshold)} FRAGS</Text>
        </Animated.View>

        <Animated.View style={[styles.ceremonyScene, emblemMotion]}>
          <View style={styles.ceremonyEmblem}>
            <View style={[styles.ceremonyEmblemHalo, { backgroundColor: accent }]} />
            <RankEmblem decorative grade={transition.after} size={124} />
          </View>
          <Text style={[styles.ceremonyEyebrow, { color: accent }]}>ASCENSION</Text>
          <Text style={styles.ascensionTitle}>{afterLabel.toUpperCase()}</Text>
          <Text style={styles.ceremonyMeta}>{beforeLabel} → {afterLabel}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function RankValue({ accent, label, rank }: { accent?: string; label: string; rank: number | null }) {
  return (
    <View style={styles.rankMetric}>
      <Text style={styles.rankLabel}>{label}</Text>
      <Text style={[styles.rankValue, accent ? { color: accent } : null]}>
        {rank == null ? '—' : `#${formatNumber(rank)}`}
      </Text>
    </View>
  );
}

function signed(value: number) {
  return `${value >= 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`;
}

function formatNumber(value: number) {
  return NUMBER_FORMATTER.format(Number(value || 0));
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    minHeight: 300,
    overflow: 'hidden',
    padding: 17,
    gap: 15,
    borderRadius: 26,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
  },
  cardHero: {
    minHeight: 110,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  emblemSlot: {
    width: 102,
    height: 102,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemHalo: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    opacity: .13,
  },
  cardCopy: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.eyebrow, letterSpacing: .9 },
  gradeTitle: {
    marginTop: 2,
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 35,
    letterSpacing: -.6,
  },
  gradeRoute: { ...typography.metadata, marginTop: 2, color: colors.textMuted },
  thresholdPill: {
    minHeight: 25,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 9,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  thresholdText: { ...typography.eyebrow, letterSpacing: .45 },
  rankFlow: {
    minHeight: 70,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 18,
    backgroundColor: '#080C10',
    borderWidth: 1,
    borderColor: '#222B34',
  },
  rankMetric: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  rankLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .5 },
  rankValue: { ...typography.metric, color: colors.text, fontVariant: ['tabular-nums'] },
  rankDivider: { width: 1, marginHorizontal: 11, backgroundColor: '#27313A' },
  reward: {
    minHeight: 76,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderTopWidth: 1,
  },
  rewardMark: {
    width: 42,
    height: 42,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  rewardGlyph: { fontSize: 17 },
  rewardCopy: { flex: 1, minWidth: 0 },
  rewardEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .55 },
  rewardTitle: { ...typography.bodyStrong, marginTop: 2, color: colors.text },
  rewardDetail: { ...typography.caption, marginTop: 2, color: colors.textMuted },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 22,
  },
  overlayGlow: {
    position: 'absolute',
    width: 310,
    height: 310,
    borderRadius: 155,
    opacity: .12,
  },
  ceremonyStage: {
    width: '100%',
    maxWidth: 360,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ceremonyScene: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ceremonyEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: 1.35 },
  verdictTitle: {
    marginTop: 6,
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 48,
    lineHeight: 47,
    letterSpacing: -1,
  },
  ceremonyMeta: { ...typography.metadata, marginTop: 6, color: colors.textMuted, textAlign: 'center' },
  fragDelta: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fragDeltaText: {
    fontFamily: fonts.display,
    fontSize: 54,
    lineHeight: 55,
    letterSpacing: -1.4,
    fontVariant: ['tabular-nums'],
  },
  fragRoute: { ...typography.bodyStrong, color: colors.text, fontVariant: ['tabular-nums'] },
  ceremonyTrack: {
    position: 'relative',
    width: '78%',
    height: 5,
    marginTop: 17,
    overflow: 'visible',
    borderRadius: radius.pill,
    backgroundColor: '#27313A',
  },
  ceremonyTrackFill: { height: '100%', borderRadius: radius.pill },
  thresholdNotch: {
    position: 'absolute',
    left: '62%',
    top: -4,
    width: 3,
    height: 13,
    borderRadius: 2,
  },
  thresholdSeal: {
    width: 58,
    height: 58,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
  },
  thresholdSealGlyph: { fontSize: 21 },
  thresholdValue: {
    marginTop: 4,
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 42,
    lineHeight: 43,
    letterSpacing: -.8,
    fontVariant: ['tabular-nums'],
  },
  ceremonyEmblem: {
    width: 142,
    height: 142,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ceremonyEmblemHalo: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    opacity: .18,
  },
  ascensionTitle: {
    marginTop: 4,
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 46,
    lineHeight: 46,
    letterSpacing: -.8,
  },
});
