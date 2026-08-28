import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
} from 'react-native';
import { useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { publicAppUrl } from '@/src/config/release';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { relicSignatureTheme } from '@/src/features/shop/components/CosmeticRenderer';
import CollectiveRelic, { type RelicAnimationPreset } from '@/src/features/social/faction/components/CollectiveRelic';
import FactionEvolutionRail from '@/src/features/social/faction/components/FactionEvolutionRail';
import {
  SupporterArrivalOverlay,
  SupporterCounterPulse,
  type RelicScenePoint,
} from '@/src/features/social/faction/components/SupporterArrivalOverlay';
import {
  resolveRelicInstability,
  type RelicMotionCommand,
  type RelicMotionDiagnostics,
  type RelicMotionPreview,
  type SupporterContributionBatch,
  type SupporterContributionPresentation,
} from '@/src/features/social/faction/relicMotion';
import type {
  CommunityFaction,
  CommunityMe,
  CommunityMutationPresentation,
  FactionProgress,
} from '@/src/features/social/faction/types';
import { factionProgress, gameLabel } from '@/src/features/social/faction/utils';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors, typography } from '@/src/theme';

type FactionRelicHeroV2Props = {
  faction: CommunityFaction | null;
  instabilityPreviewOverride?: { charge: number; objective: number };
  me: CommunityMe | null;
  motionPreviewOverride?: RelicMotionPreview;
  mutationInterruptSignal?: number;
  mutationOverride?: CommunityMutationPresentation | null;
  mutationPreviewMs?: number | null;
  relicAnimationPreset?: RelicAnimationPreset;
  onMutationPresented?: (eventId: string) => Promise<void> | void;
  onRelicDiagnosticsChange?: (diagnostics: RelicMotionDiagnostics) => void;
  onSupporterContributionPresented?: (contributionId: string) => Promise<void> | void;
  reduceMotionOverride?: boolean;
  relicLabMode?: boolean;
  relicMotionCommand?: RelicMotionCommand | null;
  relicProgressOverride?: FactionProgress;
  relicSceneActive?: boolean;
  supporterContribution?: SupporterContributionPresentation | null;
};

export default function FactionRelicHeroV2({
  faction,
  instabilityPreviewOverride,
  me,
  motionPreviewOverride,
  mutationInterruptSignal,
  mutationOverride,
  mutationPreviewMs,
  relicAnimationPreset = 'skia',
  onMutationPresented,
  onRelicDiagnosticsChange,
  onSupporterContributionPresented,
  reduceMotionOverride,
  relicLabMode,
  relicMotionCommand,
  relicProgressOverride,
  relicSceneActive,
  supporterContribution,
}: FactionRelicHeroV2Props) {
  const systemReduceMotion = useReducedMotion();
  const { equipped } = useCosmetics();
  const progress = relicProgressOverride ?? factionProgress(faction?.membres ?? 0, faction?.niveau_atteint);
  const instability = resolveRelicInstability(
    instabilityPreviewOverride?.charge ?? progress.charge,
    instabilityPreviewOverride?.objective ?? progress.objective,
  );
  const signature = relicSignatureTheme(equipped.factionEffect);
  const mutation = mutationOverride === undefined ? me?.mutation_a_presenter : mutationOverride;
  const supporterArrivalPhase = useSharedValue(0);
  const [identityLayout, setIdentityLayout] = useState<LayoutRectangle | null>(null);
  const [supporterLayout, setSupporterLayout] = useState<LayoutRectangle | null>(null);
  const [liquidTarget, setLiquidTarget] = useState<RelicScenePoint | null>(null);
  const [activeSupporterAmount, setActiveSupporterAmount] = useState(0);
  const reduceMotion = reduceMotionOverride ?? systemReduceMotion;
  const pct = Math.round(progress.progress * 100);
  const supporterAnchor = identityLayout && supporterLayout ? {
    x: identityLayout.x + supporterLayout.x + supporterLayout.width / 2,
    y: identityLayout.y + supporterLayout.y + supporterLayout.height / 2,
  } : null;
  const status = progress.awakened
    ? 'CŒUR ÉVEILLÉ'
    : instability.tier === 'mutationReady'
      ? 'MUTATION PRÊTE'
      : progress.level > 0
        ? `FORME ${progress.current.code}`
        : 'DORMANT';

  async function inviteSupporters() {
    if (!faction) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    }
    const url = publicAppUrl('/') ?? '';
    const message = `Rejoins la faction ${faction.nom} sur GRIFF et aide notre relique à atteindre la forme ${progress.next?.name ?? 'ultime'}.`;
    const shareText = url ? `${message} ${url}` : message;
    try {
      if (Platform.OS === 'web' && globalThis.navigator?.clipboard) {
        await globalThis.navigator.clipboard.writeText(shareText);
      } else {
        await Share.share({ message: shareText, ...(url ? { url } : {}) });
      }
    } catch {
      // Dismissing the system share sheet must not alter faction state.
    }
  }

  return (
    <View style={styles.hero}>
      <LinearGradient
        colors={['#03090E', '#02070B', '#010407', '#020508']}
        end={{ x: .8, y: 1 }}
        start={{ x: .1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.heroAura, { backgroundColor: signature.aura, boxShadow: signature.glow }]} />
      <View style={styles.coldAura} />

      <View style={styles.heroTop}>
        <View style={styles.heroHeading}>
          <Text style={styles.heroEyebrow}>QG SOCIAL · FACTION</Text>
        </View>
        <View style={styles.levelPill}>
          <View style={styles.levelDot} />
          <Text style={styles.levelText}>{status}</Text>
        </View>
      </View>

      <CollectiveRelic
        accent={signature.accent}
        animationPreset={relicAnimationPreset}
        compact
        faction={faction}
        instabilityPreviewOverride={instabilityPreviewOverride}
        labMode={relicLabMode}
        motionCommand={relicMotionCommand}
        motionPreviewOverride={motionPreviewOverride}
        mutation={mutation}
        mutationInterruptSignal={mutationInterruptSignal}
        mutationPreviewMs={mutationPreviewMs}
        onDiagnosticsChange={onRelicDiagnosticsChange}
        onLiquidTargetLayout={setLiquidTarget}
        onMutationPresented={onMutationPresented}
        onSupporterArrivalComplete={() => setActiveSupporterAmount(0)}
        onSupporterArrivalStart={(batch: SupporterContributionBatch) => setActiveSupporterAmount(batch.amount)}
        onSupporterContributionPresented={onSupporterContributionPresented}
        progress={progress}
        reduceMotionOverride={reduceMotionOverride}
        sceneActive={relicSceneActive}
        supporterArrivalPhase={supporterArrivalPhase}
        supporterContribution={supporterContribution}
      />

      <View onLayout={(event) => setIdentityLayout(event.nativeEvent.layout)} style={styles.identity}>
        <View style={styles.factionSeal}>
          {faction ? (
            <TeamLogo accent={colors.volt} name={faction.nom} size={34} tag={faction.tag} uri={faction.logo} />
          ) : (
            <Text style={styles.relicQuestion}>?</Text>
          )}
        </View>
        <View style={styles.identityCopy}>
          <Text numberOfLines={1} style={styles.factionName}>{faction?.nom.toUpperCase() ?? 'AUCUNE FACTION'}</Text>
          <Text numberOfLines={1} style={styles.factionMeta}>
            {faction
              ? `${gameLabel(faction.jeu)} · ${formatNumber(progress.charge)} MEMBRE${progress.charge > 1 ? 'S' : ''}`
              : 'UNE RELIQUE ATTEND TES COULEURS'}
          </Text>
        </View>
        {faction ? (
          <View onLayout={(event) => setSupporterLayout(event.nativeEvent.layout)} style={styles.growthBlock}>
            <Text style={styles.growthLabel}>ÉVOLUTION · 7 J</Text>
            <SupporterCounterPulse phase={supporterArrivalPhase}>
              <Text style={styles.growthValue}>{signed(faction.croissance_7j)}</Text>
            </SupporterCounterPulse>
          </View>
        ) : null}
      </View>

      {faction ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressHeading}>
            <Text style={styles.relicForm}>RELIQUE · {progress.current.name.toUpperCase()}</Text>
            <Text style={styles.progressValue}>
              {progress.max ? '10 000+' : `${formatNumber(progress.charge)} / ${formatNumber(progress.objective)}`}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress.max ? 100 : pct}%` }]} />
          </View>
          <View style={styles.thresholdRow}>
            <Text style={styles.thresholdValue}>{progress.max ? 'MAX' : formatNumber(progress.remaining)}</Text>
            <Text style={styles.thresholdLabel}>
              {progress.max ? 'FORME TERMINALE' : `AVANT ${progress.next?.name.toUpperCase()}`}
            </Text>
          </View>

          <Pressable
            accessibilityHint={`Partage une invitation à rejoindre ${faction.nom}`}
            accessibilityLabel="Inviter des supporters"
            accessibilityRole="button"
            onPress={() => void inviteSupporters()}
            style={({ pressed }) => [styles.inviteButton, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={['#EEF933', '#D8E91D', '#B8CC12']}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={styles.inviteSurface}
            >
              <SupporterInviteIcon />
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.inviteText}>INVITER DES SUPPORTERS</Text>
            </LinearGradient>
          </Pressable>

          <FactionEvolutionRail comfortable progress={progress} />
        </View>
      ) : null}

      <View pointerEvents="none" style={styles.supporterArrivalOverlay}>
        <SupporterArrivalOverlay
          amount={activeSupporterAmount}
          end={liquidTarget}
          phase={supporterArrivalPhase}
          reduceMotion={reduceMotion}
          start={supporterAnchor}
        />
      </View>
    </View>
  );
}

function SupporterInviteIcon() {
  return (
    <View pointerEvents="none" style={styles.inviteGlyph}>
      <View style={[styles.inviteHead, styles.inviteHeadLeft]} />
      <View style={[styles.inviteHead, styles.inviteHeadCenter]} />
      <View style={[styles.inviteHead, styles.inviteHeadRight]} />
      <View style={[styles.inviteShoulder, styles.inviteShoulderLeft]} />
      <View style={[styles.inviteShoulder, styles.inviteShoulderCenter]} />
      <View style={[styles.inviteShoulder, styles.inviteShoulderRight]} />
    </View>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function signed(value: number) {
  return `${value >= 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`;
}

const styles = StyleSheet.create({
  hero: {
    position: 'relative',
    overflow: 'hidden',
    padding: 12,
    borderRadius: 24,
    backgroundColor: '#02070B',
    borderWidth: 1,
    borderColor: '#1D2C34',
  },
  heroAura: {
    position: 'absolute',
    width: 330,
    height: 330,
    left: 30,
    top: 62,
    borderRadius: 165,
    opacity: .42,
  },
  coldAura: {
    position: 'absolute',
    width: 330,
    height: 360,
    left: -90,
    top: 90,
    borderRadius: 180,
    backgroundColor: 'rgba(23,123,145,.035)',
    boxShadow: '0 0 84px rgba(32,140,162,.055)',
  },
  heroTop: {
    zIndex: 6,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroHeading: { flex: 1, minWidth: 0 },
  heroEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .9 },
  levelPill: {
    flexShrink: 0,
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(5,10,14,.84)',
    borderWidth: 1,
    borderColor: '#30414B',
  },
  levelDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.volt },
  levelText: { ...typography.label, color: '#D6DCE0', letterSpacing: .3 },
  relicQuestion: { ...typography.metricSmall, color: colors.volt },
  identity: {
    zIndex: 4,
    minHeight: 54,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1B2A33',
  },
  factionSeal: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#060A0D',
    borderWidth: 1,
    borderColor: '#687A2B',
  },
  identityCopy: { flex: 1, minWidth: 0 },
  factionName: { ...typography.bodyStrong, color: '#F6F7F5', letterSpacing: .1 },
  factionMeta: { ...typography.caption, marginTop: 2, color: '#8D99A2' },
  growthBlock: { flexShrink: 0, alignItems: 'flex-end' },
  growthLabel: { ...typography.label, color: colors.textMuted, letterSpacing: .15 },
  growthValue: { ...typography.metricSmall, marginTop: 1, color: colors.volt },
  progressBlock: { zIndex: 4, marginTop: 10 },
  progressHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  relicForm: { ...typography.eyebrow, flex: 1, color: colors.volt, letterSpacing: .55 },
  progressValue: { ...typography.label, color: '#F0F2F2' },
  progressTrack: {
    height: 4,
    marginTop: 7,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: '#172029',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.volt },
  thresholdRow: {
    minHeight: 26,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
  },
  thresholdValue: { ...typography.metricSmall, color: colors.volt },
  thresholdLabel: { ...typography.label, color: '#A4AFB6', letterSpacing: .2 },
  inviteButton: {
    minHeight: 50,
    marginTop: 6,
    marginBottom: 7,
    padding: 2,
    overflow: 'hidden',
    borderRadius: 13,
    backgroundColor: '#69760E',
    borderWidth: 1,
    borderColor: '#C8DC21',
    boxShadow: '0 0 16px rgba(232,255,61,.18)',
  },
  inviteSurface: {
    flex: 1,
    width: '100%',
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
  },
  inviteText: {
    ...typography.cardTitle,
    flexShrink: 1,
    color: '#090C0E',
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: .1,
    textAlign: 'center',
  },
  inviteGlyph: { position: 'relative', width: 27, height: 23 },
  inviteHead: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#090C0E' },
  inviteHeadLeft: { left: 2, top: 4 },
  inviteHeadCenter: { left: 10.5, top: 0 },
  inviteHeadRight: { right: 2, top: 4 },
  inviteShoulder: { position: 'absolute', height: 9, borderWidth: 2, borderColor: '#090C0E', borderBottomWidth: 0 },
  inviteShoulderLeft: { width: 9, left: 0, bottom: 1, borderTopLeftRadius: 7, borderTopRightRadius: 4 },
  inviteShoulderCenter: { width: 12, left: 7.5, bottom: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  inviteShoulderRight: { width: 9, right: 0, bottom: 1, borderTopLeftRadius: 4, borderTopRightRadius: 7 },
  supporterArrivalOverlay: {
    position: 'absolute',
    zIndex: 5,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'visible',
  },
  pressed: { opacity: .76, transform: [{ scale: .992 }] },
});
