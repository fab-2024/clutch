import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ChartNoAxesColumnIncreasing from 'lucide-react-native/icons/chart-no-axes-column-increasing';
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { useReducedMotion, useSharedValue } from 'react-native-reanimated';

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
              colors={['#172013', '#11180F', '#0C120C']}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={styles.rallySurface}
            >
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
          <Text style={styles.sectionEyebrow}>CLASSEMENT DES FACTIONS</Text>
          <Text style={styles.sectionTitle}>LES FACTIONS EN TÊTE</Text>
        </View>
        <View style={styles.periodPill}><Text style={styles.periodText}>7 J</Text></View>
      </View>
      <View style={styles.warList}>
        {rows.map((faction, index) => (
          <FactionRankRow
            faction={faction}
            isLast={index === rows.length - 1}
            key={faction.equipe_id}
            mine={mine}
            rank={index + 1}
          />
        ))}
      </View>
    </View>
  );
}

function FactionRankRow({
  faction,
  isLast,
  mine,
  rank,
}: {
  faction: CommunityFaction;
  isLast: boolean;
  mine: CommunityFaction | null;
  rank: number;
}) {
  const selected = faction.equipe_id === mine?.equipe_id;
  const accent = factionAccent(faction, rank);
  const supporterLabel = faction.membres === 1 ? 'supporter' : 'supporters';

  return (
    <View
      accessible
      accessibilityLabel={`${rank}. ${faction.nom}, ${faction.membres} ${supporterLabel}, ${signed(faction.croissance_7j)} en sept jours${selected ? ', ma faction' : ''}`}
      accessibilityRole="summary"
      style={[
        styles.warRankRow,
        !isLast && styles.warRankRowDivider,
        selected && styles.warRankRowMine,
      ]}
    >
      <Text style={[styles.warRank, rank === 1 && styles.warRankFirst]}>#{rank}</Text>
      <TeamLogo accent={accent} name={faction.nom} size={40} tag={faction.tag} uri={faction.logo} />
      <View style={styles.warRankCopy}>
        <View style={styles.warRankIdentity}>
          <Text numberOfLines={1} style={styles.warRankName}>{faction.nom}</Text>
          {selected ? <Text style={styles.warMineLabel}>TA FACTION</Text> : null}
        </View>
        <Text style={styles.warRankMeta}>{faction.tag} · {formatNumber(faction.membres)} {supporterLabel}</Text>
      </View>
      <View style={styles.warGrowthBlock}>
        <Text style={[styles.warGrowth, faction.croissance_7j < 0 && styles.warGrowthNegative]}>{signed(faction.croissance_7j)}</Text>
        <Text style={styles.warGrowthLabel}>SUR 7 J</Text>
      </View>
    </View>
  );
}

function factionAccent(faction: CommunityFaction, rank: number) {
  if (rank === 2) return '#AAB7BD';
  if (rank === 3) return '#A68B5D';
  const tag = faction.tag.trim().toUpperCase();
  if (tag === 'FNC') return '#FF6A21';
  if (tag === 'KC' || tag === 'KCORP') return '#38A0FF';
  if (tag === 'G2') return '#5A9CFF';
  if (tag === 'VIT') return '#F5C542';
  return colors.volt;
}

export function FactionMemberRanking({ faction, me }: { faction: CommunityFaction; me: CommunityMe }) {
  const person = me.top_activite.find((activity) => activity.user_id === me.user_id) ?? fallbackActivity(me);
  const hasWeeklyActivity = me.pronos_7j > 0 || me.gagnes_7j > 0 || me.delta_frags_7j !== 0;
  const placement = me.rang_activite && me.total_activite
    ? `#${me.rang_activite} / ${me.total_activite}`
    : 'EN PLACEMENT';

  return (
    <View style={styles.memberSection}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionEyebrow}>DANS TA FACTION</Text>
          <Text style={styles.sectionTitle}>TON CLASSEMENT {faction.tag}</Text>
        </View>
        <Text style={styles.memberPlacement}>{hasWeeklyActivity ? placement : '7 J'}</Text>
      </View>

      {hasWeeklyActivity ? (
        <View style={styles.memberPanel}>
          <FactionMemberRow person={person} />
          <View style={styles.memberPanelDivider} />
          <View style={styles.memberStats}>
            <MemberStat label="CALLS" value={String(me.pronos_7j)} />
            <View style={styles.memberStatDivider} />
            <MemberStat label="VALIDÉS" value={String(me.gagnes_7j)} />
            <View style={styles.memberStatDivider} />
            <MemberStat label="FRAGS" value={signed(me.delta_frags_7j)} featured />
          </View>
        </View>
      ) : (
        <MemberEmptyState faction={faction} />
      )}
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

function MemberEmptyState({ faction }: { faction: CommunityFaction }) {
  return (
    <View style={styles.memberEmpty}>
      <View style={styles.memberEmptyIcon}>
        <ChartNoAxesColumnIncreasing color={colors.volt} size={22} strokeWidth={2} />
      </View>
      <View style={styles.memberEmptyCopy}>
        <Text style={styles.memberEmptyTitle}>ENTRE DANS LE CLASSEMENT.</Text>
        <Text style={styles.memberEmptyText}>Fais ton premier call cette semaine pour apparaître dans le classement {faction.tag}.</Text>
      </View>
      <Pressable
        accessibilityLabel="Faire mon premier call"
        accessibilityRole="button"
        onPress={() => router.push('/(tabs)/matches')}
        style={({ pressed }) => [styles.memberEmptyAction, pressed && styles.pressed]}
      >
        <Text style={styles.memberEmptyActionText}>FAIRE MON PREMIER CALL</Text>
        <ArrowRight color="#080B0D" size={17} strokeWidth={2.2} />
      </Pressable>
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
