import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { useReducedMotion, useSharedValue } from 'react-native-reanimated';
import Svg, { Path as SvgPath } from 'react-native-svg';

import { publicAppUrl } from '@/src/config/release';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { relicSignatureTheme } from '@/src/features/shop/components/CosmeticRenderer';
import CollectiveRelic, { type RelicAnimationPreset } from '@/src/features/social/faction/components/CollectiveRelic';
import FactionEvolutionRail from '@/src/features/social/faction/components/FactionEvolutionRail';
import {
  resolveRelicInstability,
  type RelicMotionDiagnostics,
  type RelicMotionCommand,
  type RelicMotionPreview,
  type SupporterContributionBatch,
  type SupporterContributionPresentation,
} from '@/src/features/social/faction/relicMotion';
import {
  SupporterArrivalOverlay,
  SupporterCounterPulse,
  type RelicScenePoint,
} from '@/src/features/social/faction/components/SupporterArrivalOverlay';
import type {
  CommunityActivity,
  CommunityFaction,
  CommunityMe,
  CommunityMutationPresentation,
  FactionProgress,
} from '@/src/features/social/faction/types';
import { factionProgress, gameLabel } from '@/src/features/social/faction/utils';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors } from '@/src/theme';

import { styles } from './SocialHomeScreen.styles';

export function FactionRelicHero({
  faction,
  me,
  mutationInterruptSignal,
  mutationOverride,
  mutationPreviewMs,
  relicAnimationPreset,
  relicLabMode,
  relicMotionCommand,
  relicProgressOverride,
  instabilityPreviewOverride,
  motionPreviewOverride,
  onRelicDiagnosticsChange,
  onMutationPresented,
  onSupporterContributionPresented,
  reduceMotionOverride,
  supporterContribution,
}: {
  faction: CommunityFaction | null;
  me: CommunityMe | null;
  mutationInterruptSignal?: number;
  mutationOverride?: CommunityMutationPresentation | null;
  mutationPreviewMs?: number | null;
  relicAnimationPreset?: RelicAnimationPreset;
  relicLabMode?: boolean;
  relicMotionCommand?: RelicMotionCommand | null;
  relicProgressOverride?: FactionProgress;
  instabilityPreviewOverride?: { charge: number; objective: number };
  motionPreviewOverride?: RelicMotionPreview;
  onRelicDiagnosticsChange?: (diagnostics: RelicMotionDiagnostics) => void;
  onMutationPresented?: (eventId: string) => Promise<void> | void;
  onSupporterContributionPresented?: (contributionId: string) => Promise<void> | void;
  reduceMotionOverride?: boolean;
  supporterContribution?: SupporterContributionPresentation | null;
}) {
  const systemReduceMotion = useReducedMotion();
  const { equipped } = useCosmetics();
  const progress = relicProgressOverride ?? factionProgress(faction?.membres ?? 0, faction?.niveau_atteint);
  const instability = resolveRelicInstability(
    instabilityPreviewOverride?.charge ?? progress.charge,
    instabilityPreviewOverride?.objective ?? progress.objective,
  );
  const pct = Math.round(progress.progress * 100);
  const title = faction ? 'PORTE TES COULEURS.' : 'CHOISIS TES COULEURS.';
  const actionTitle = progress.max
    ? 'FAIRE RAYONNER LA FACTION'
    : instability.tier === 'mutationReady'
      ? 'MUTATION PRÊTE'
    : `RALLIER ${formatNumber(progress.remaining)} SUPPORTER${progress.remaining > 1 ? 'S' : ''}`;
  const signature = relicSignatureTheme(equipped.factionEffect);
  const effectAccent = signature.accent;
  const mutation = mutationOverride === undefined ? me?.mutation_a_presenter : mutationOverride;
  const supporterArrivalPhase = useSharedValue(0);
  const [identityLayout, setIdentityLayout] = useState<LayoutRectangle | null>(null);
  const [supporterLayout, setSupporterLayout] = useState<LayoutRectangle | null>(null);
  const [liquidTarget, setLiquidTarget] = useState<RelicScenePoint | null>(null);
  const [activeSupporterAmount, setActiveSupporterAmount] = useState(0);
  const reduceMotion = reduceMotionOverride ?? systemReduceMotion;
  const handleSupporterArrivalStart = (batch: SupporterContributionBatch) => {
    setActiveSupporterAmount(batch.amount);
  };
  const supporterAnchor = identityLayout && supporterLayout ? {
    x: identityLayout.x + supporterLayout.x + supporterLayout.width / 2,
    y: identityLayout.y + supporterLayout.y + supporterLayout.height / 2,
  } : null;

  async function rallySupporters() {
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
      // The system share sheet can be dismissed without changing the faction state.
    }
  }

  return (
    <View style={styles.factionHero}>
      <LinearGradient colors={['#07131D', '#061018', '#04090E', '#050A0D']} end={{ x: .8, y: 1 }} start={{ x: .1, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.heroAura, { backgroundColor: signature.aura, boxShadow: signature.glow }]} />
      <View style={styles.heroAuraCold} />
      <View style={styles.heroGridLineA} />
      <View style={styles.heroGridLineB} />

      <View style={styles.heroTop}>
        <View style={styles.heroHeading}>
          <Text style={styles.heroEyebrow}>QG SOCIAL // FACTION</Text>
          <Text style={styles.heroTitle}>{title}</Text>
        </View>
        <View style={styles.levelPill}>
          <View style={styles.levelDot} />
          <Text style={styles.levelText}>{progress.awakened ? 'CŒUR ÉVEILLÉ' : instability.tier === 'mutationReady' ? 'MUTATION PRÊTE' : progress.level > 0 ? `FORME ${progress.current.code}` : 'DORMANT'}</Text>
        </View>
      </View>

      <CollectiveRelic
        accent={effectAccent}
        animationPreset={relicAnimationPreset}
        faction={faction}
        instabilityPreviewOverride={instabilityPreviewOverride}
        mutation={mutation}
        mutationInterruptSignal={mutationInterruptSignal}
        mutationPreviewMs={mutationPreviewMs}
        labMode={relicLabMode}
        motionCommand={relicMotionCommand}
        motionPreviewOverride={motionPreviewOverride}
        onDiagnosticsChange={onRelicDiagnosticsChange}
        onLiquidTargetLayout={setLiquidTarget}
        onMutationPresented={onMutationPresented}
        onSupporterArrivalComplete={() => setActiveSupporterAmount(0)}
        onSupporterArrivalStart={handleSupporterArrivalStart}
        onSupporterContributionPresented={onSupporterContributionPresented}
        progress={progress}
        reduceMotionOverride={reduceMotionOverride}
        supporterArrivalPhase={supporterArrivalPhase}
        supporterContribution={supporterContribution}
      />

      <View
        onLayout={(event) => setIdentityLayout(event.nativeEvent.layout)}
        style={styles.factionIdentity}
      >
        <View style={styles.factionSeal}>
          {faction ? (
            <TeamLogo accent={colors.volt} name={faction.nom} size={34} tag={faction.tag} uri={faction.logo} />
          ) : (
            <Text style={styles.relicQuestion}>?</Text>
          )}
        </View>
        <View style={styles.factionIdentityCopy}>
          <Text style={styles.factionName}>{faction?.nom.toUpperCase() ?? 'AUCUNE FACTION'}</Text>
          <Text style={styles.factionMeta}>{faction ? `${gameLabel(faction.jeu)} · ${formatNumber(progress.charge)} MEMBRE${progress.charge > 1 ? 'S' : ''}` : 'UNE RELIQUE ATTEND TES COULEURS'}</Text>
        </View>
        {faction ? (
          <View
            onLayout={(event) => setSupporterLayout(event.nativeEvent.layout)}
            style={styles.factionGrowthBlock}
          >
            <Text style={styles.factionGrowthLabel}>SUPPORTERS ·</Text>
            <SupporterCounterPulse phase={supporterArrivalPhase}>
              <Text style={styles.factionGrowth}>{signed(faction.croissance_7j)}</Text>
            </SupporterCounterPulse>
          </View>
        ) : null}
      </View>

      {faction ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressHeadline}>
            <Text style={styles.relicForm}>{progress.max ? 'ÉVEIL TOTAL' : progress.current.name.toUpperCase()}</Text>
            <Text style={styles.progressValue}>{progress.max ? '10 000+' : `${formatNumber(progress.charge)} / ${formatNumber(progress.objective)}`}</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress.max ? 100 : pct}%` }]} /></View>
          <View style={styles.progressFoot}>
            <Text style={styles.progressNext}>{progress.max ? 'CŒUR ÉVEILLÉ' : `PROCHAINE MUTATION · ${progress.next?.name.toUpperCase()}`}</Text>
          </View>
          <FactionEvolutionRail progress={progress} />
          <Pressable
            accessibilityHint={`Partage une invitation à rejoindre ${faction.nom}`}
            accessibilityLabel={actionTitle}
            accessibilityRole="button"
            onPress={() => void rallySupporters()}
            style={({ pressed }) => [styles.rallyButton, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={['#EEF933', '#D8E91D', '#B8CC12']}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={styles.rallySurface}
            >
              <View pointerEvents="none" style={[styles.rallyFacet, styles.rallyFacetLeft]} />
              <View pointerEvents="none" style={[styles.rallyFacet, styles.rallyFacetRight]} />
              <View style={styles.rallyIcon}><SupporterGroupIcon /></View>
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.rallyText}>{actionTitle}</Text>
            </LinearGradient>
          </Pressable>
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

export function FactionWar({ factions, mine }: { factions: CommunityFaction[]; mine: CommunityFaction | null }) {
  const rows = factions.slice(0, 3);

  return (
    <View style={styles.warSection}>
      <View style={[styles.sectionHeading, styles.warSectionHeading]}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionEyebrow}>LA GUERRE DES FACTIONS</Text>
          <Text style={styles.sectionTitle}>QUI DOMINE LE TERRAIN ?</Text>
        </View>
        <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>24 H</Text></View>
      </View>
      <LinearGradient colors={['#101A13', '#0A110E', '#05090A']} end={{ x: .5, y: 1 }} start={{ x: .5, y: 0 }} style={styles.warArena}>
        <View pointerEvents="none" style={styles.warArcTop} />
        <View pointerEvents="none" style={styles.warArcBottom} />
        <View style={styles.warPodiumRow}>
          {rows[1] ? <PodiumFaction faction={rows[1]} mine={mine} rank={2} /> : <View style={styles.warPodiumPlaceholder} />}
          {rows[0] ? <PodiumFaction faction={rows[0]} mine={mine} rank={1} /> : <View style={styles.warPodiumPlaceholder} />}
          {rows[2] ? <PodiumFaction faction={rows[2]} mine={mine} rank={3} /> : <View style={styles.warPodiumPlaceholder} />}
        </View>
      </LinearGradient>
    </View>
  );
}

function PodiumFaction({
  faction,
  mine,
  rank,
}: {
  faction: CommunityFaction;
  mine: CommunityFaction | null;
  rank: 1 | 2 | 3;
}) {
  const selected = faction.equipe_id === mine?.equipe_id;
  const primary = rank === 1;
  const accent = podiumAccent(faction, rank);
  const supporterLabel = faction.membres === 1 ? 'supporter' : 'supporters';

  return (
    <View
      accessible
      accessibilityLabel={`${rank}. ${faction.nom}, ${faction.membres} ${supporterLabel}, ${signed(faction.croissance_7j)} en sept jours${selected ? ', ma faction' : ''}`}
      accessibilityRole="summary"
      style={[styles.warPodiumItem, primary ? styles.warPodiumFirst : styles.warPodiumSide, rank === 3 && styles.warPodiumThird]}
    >
      <Text style={[styles.warPodiumRank, primary && styles.warPodiumRankFirst, { color: primary ? colors.volt : accent }]}>#{rank}</Text>
      <View style={[styles.warOrbitalGlow, primary && styles.warOrbitalGlowFirst, { borderColor: withAlpha(accent, '30'), backgroundColor: withAlpha(accent, '0B') }]}>
        <View style={[styles.warOrbital, primary && styles.warOrbitalFirst, { borderColor: accent }]}>
          <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.warPodiumTag, primary && styles.warPodiumTagFirst, { color: accent }]}>{faction.tag}</Text>
        </View>
        {primary ? <View style={styles.warCrown}><CrownIcon /></View> : null}
      </View>
      <PodiumTrophyIcon color={accent} />
      <Text numberOfLines={2} style={styles.warPodiumName}>{faction.nom}</Text>
      <Text style={styles.warPodiumSupporters}><Text style={styles.warPodiumMembers}>{formatNumber(faction.membres)}</Text> {supporterLabel}</Text>
      {selected ? (
        <Text style={styles.warPodiumMine}>MA FACTION · {signed(faction.croissance_7j)}</Text>
      ) : (
        <Text style={[styles.warPodiumGrowth, faction.croissance_7j < 0 && styles.warGrowthNegative]}>{signed(faction.croissance_7j)} · 7 J</Text>
      )}
    </View>
  );
}

function CrownIcon() {
  return (
    <Svg height={18} pointerEvents="none" viewBox="0 0 24 18" width={24}>
      <SvgPath d="M2 3.5 7 9l5-7 5 7 5-5.5-2 11H4Z" fill="none" stroke="#07100B" strokeLinejoin="round" strokeWidth="2" />
      <SvgPath d="M5 16h14" fill="none" stroke="#07100B" strokeLinecap="round" strokeWidth="2" />
    </Svg>
  );
}

function PodiumTrophyIcon({ color }: { color: string }) {
  return (
    <Svg height={22} pointerEvents="none" viewBox="0 0 24 24" width={22}>
      <SvgPath d="M8 3h8v5c0 3-1.6 5-4 5s-4-2-4-5Zm0 2H4v2c0 2.4 1.5 4 4.1 4M16 5h4v2c0 2.4-1.5 4-4.1 4M12 13v5m-4 3h8m-6-3h4" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </Svg>
  );
}

function podiumAccent(faction: CommunityFaction, rank: 1 | 2 | 3) {
  if (rank === 2) return '#AAB7BD';
  if (rank === 3) return '#A68B5D';
  const tag = faction.tag.trim().toUpperCase();
  if (tag === 'FNC') return '#FF6A21';
  if (tag === 'KC' || tag === 'KCORP') return '#38A0FF';
  if (tag === 'G2') return '#5A9CFF';
  if (tag === 'VIT') return '#F5C542';
  return colors.volt;
}

function withAlpha(color: string, alpha: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;
}

export function FactionMemberRanking({ faction, me }: { faction: CommunityFaction; me: CommunityMe }) {
  const person = me.top_activite.find((activity) => activity.user_id === me.user_id) ?? fallbackActivity(me);
  const placement = me.rang_activite && me.total_activite
    ? `#${me.rang_activite}/${me.total_activite}`
    : 'EN PLACEMENT';

  return (
    <View style={styles.memberSection}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionEyebrow}>DANS TA FACTION</Text>
          <Text style={styles.sectionTitle}>TON CLASSEMENT {faction.tag}</Text>
        </View>
        <Text style={styles.memberPlacement}>{placement}</Text>
      </View>

      <View style={styles.memberList}>
        <FactionMemberRow person={person} />
      </View>

      <View style={styles.memberStats}>
        <MemberStat label="calls · 7 j" value={String(me.pronos_7j)} />
        <MemberStat label="validés" value={String(me.gagnes_7j)} />
        <MemberStat label="frags · 7 j" value={signed(me.delta_frags_7j)} featured />
      </View>
    </View>
  );
}

function MemberStat({ featured = false, label, value }: { featured?: boolean; label: string; value: string }) {
  return (
    <View style={styles.memberStat}>
      <Text style={[styles.memberStatValue, featured && styles.memberStatValueFeatured]}>{value}</Text>
      <Text style={styles.memberStatLabel}>{label}</Text>
    </View>
  );
}

function SupporterGroupIcon() {
  return (
    <View pointerEvents="none" style={styles.supporterGlyph}>
      <View style={[styles.supporterHead, styles.supporterHeadLeft]} />
      <View style={[styles.supporterHead, styles.supporterHeadCenter]} />
      <View style={[styles.supporterHead, styles.supporterHeadRight]} />
      <View style={[styles.supporterShoulder, styles.supporterShoulderLeft]} />
      <View style={[styles.supporterShoulder, styles.supporterShoulderCenter]} />
      <View style={[styles.supporterShoulder, styles.supporterShoulderRight]} />
    </View>
  );
}

function FactionMemberRow({ person }: { person: CommunityActivity }) {
  return (
    <View
      accessible
      accessibilityLabel={`Rang ${person.rang}, ${person.pseudo}, toi`}
      accessibilityRole="summary"
      style={[styles.memberRow, styles.memberRowMine]}
    >
      <Text style={[styles.memberRowRank, styles.memberRowRankMine]}>#{person.rang}</Text>
      <View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{initials(person.pseudo)}</Text></View>
      <View style={styles.memberCopy}>
        <Text numberOfLines={1} style={styles.memberName}>{person.pseudo}</Text>
        <Text style={styles.memberMeta}>Toi</Text>
      </View>
      <Text style={styles.memberPrecision}>−</Text>
    </View>
  );
}

export function EmptyFactions() {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyMark}>✦</Text>
      <Text style={styles.emptyTitle}>LA GUERRE N’A PAS ENCORE COMMENCÉ.</Text>
      <Text style={styles.emptyText}>Les factions et leur classement apparaîtront ici dès que les premières équipes seront actives.</Text>
    </View>
  );
}

export function FactionHeroSkeleton() {
  return <View style={styles.heroSkeleton}><View style={styles.skeletonTitle} /><View style={styles.skeletonRelic} /><View style={styles.skeletonLine} /></View>;
}

function fallbackActivity(me: CommunityMe): CommunityActivity {
  return {
    user_id: me.user_id,
    pseudo: me.pseudo,
    pronos_7j: me.pronos_7j,
    gagnes_7j: me.gagnes_7j,
    rang: me.rang_activite ?? 1,
  };
}

function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(value); }
function signed(value: number) { return `${value >= 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`; }
function initials(value: string) {
  const parts = value.trim().split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase();
}
