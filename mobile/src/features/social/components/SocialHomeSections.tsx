import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Crown from 'lucide-react-native/icons/crown';
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { useReducedMotion, useSharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

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
  const podium = [
    { faction: factions[1] ?? null, rank: 2 },
    { faction: factions[0] ?? null, rank: 1 },
    { faction: factions[2] ?? null, rank: 3 },
  ];
  const trailing = factions.slice(3, 5);

  return (
    <View style={styles.warSection}>
      <View style={[styles.sectionHeading, styles.warSectionHeading]}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionEyebrow}>LA GUERRE DES FACTIONS</Text>
          <Text style={[styles.sectionTitle, styles.warSectionTitle]}>QUI DOMINE LE TERRAIN ?</Text>
        </View>
        <View style={styles.warPeriod}>
          <View style={styles.warPeriodDot} />
          <Text style={styles.warPeriodText}>24 H</Text>
        </View>
      </View>
      <LinearGradient
        colors={['#0C1711', '#09120E', '#070D0B']}
        end={{ x: .9, y: 1 }}
        start={{ x: .1, y: 0 }}
        style={styles.warBoard}
      >
        <View style={styles.warBoardAura} />
        <View style={styles.warPodium}>
          {podium.map((entry) => (
            <FactionPodiumEntry
              faction={entry.faction}
              key={entry.rank}
              mine={mine}
              rank={entry.rank}
            />
          ))}
        </View>

        {trailing.length ? (
          <View style={styles.warTrailingList}>
            {trailing.map((faction, index) => (
              <FactionRankRow
                faction={faction}
                isLast={index === trailing.length - 1}
                key={faction.equipe_id}
                mine={mine}
                rank={index + 4}
              />
            ))}
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

function FactionPodiumEntry({
  faction,
  mine,
  rank,
}: {
  faction: CommunityFaction | null;
  mine: CommunityFaction | null;
  rank: number;
}) {
  if (!faction) return <View style={styles.podiumSlot} />;
  const selected = faction.equipe_id === mine?.equipe_id;
  const accent = podiumMetal(rank);
  const supporterLabel = faction.membres === 1 ? 'SUPPORTER' : 'SUPPORTERS';

  return (
    <View
      accessible
      accessibilityLabel={`${rank}. ${faction.nom}, ${faction.membres} ${supporterLabel.toLowerCase()}${selected ? ', ma faction' : ''}`}
      accessibilityRole="summary"
      style={[styles.podiumSlot, rank === 1 && styles.podiumSlotLeader]}
    >
      <Text style={[styles.podiumRank, rank === 1 && styles.podiumRankLeader, rank === 3 && styles.podiumRankBronze]}>#{rank}</Text>
      <FactionShield faction={faction} mine={selected} rank={rank} />
      <View style={[styles.podiumBase, rank === 1 && styles.podiumBaseLeader]}>
        <View style={[styles.podiumLip, { backgroundColor: accent }]} />
        <Text numberOfLines={2} style={[styles.podiumName, rank === 1 && styles.podiumNameLeader]}>{faction.nom}</Text>
        {selected ? <Text style={styles.podiumMine}>MA FACTION</Text> : <View style={styles.podiumMineSpacer} />}
        <View style={styles.podiumDivider} />
        <Text style={[styles.podiumSupporters, rank === 1 && styles.podiumSupportersLeader]}>{formatNumber(faction.membres)}</Text>
        <Text style={styles.podiumSupporterLabel}>{supporterLabel}</Text>
      </View>
    </View>
  );
}

function FactionShield({
  faction,
  mine,
  rank,
}: {
  faction: CommunityFaction;
  mine: boolean;
  rank: number;
}) {
  const leader = rank === 1;
  const size = leader ? 122 : 94;
  const [metalDark, metalLight] = podiumMetalGradient(rank);
  const gradientId = `faction-shield-${faction.equipe_id}`;
  const teamAccent = factionAccent(faction, 0);
  const normalizedTag = faction.tag.trim().toUpperCase();
  const logoScale = normalizedTag === 'G2' ? 1.38 : 1.05;
  const logoTint = normalizedTag === 'KC' || normalizedTag === 'KCORP' ? teamAccent : undefined;

  return (
    <View style={[styles.factionShield, { height: size * 1.08, width: size }]}>
      <Svg height="100%" viewBox="0 0 100 110" width="100%">
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor={metalLight} />
            <Stop offset="0.48" stopColor={metalDark} />
            <Stop offset="1" stopColor={metalLight} />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M50 4C62 13 75 18 89 20L85 60C82 79 68 94 50 104C32 94 18 79 15 60L11 20C25 18 38 13 50 4Z"
          fill="#030709"
          opacity={0.72}
          stroke="#010203"
          strokeWidth={8}
          transform="translate(0 3)"
        />
        <Path
          d="M50 4C62 13 75 18 89 20L85 60C82 79 68 94 50 104C32 94 18 79 15 60L11 20C25 18 38 13 50 4Z"
          fill="#080D10"
          stroke={`url(#${gradientId})`}
          strokeLinejoin="round"
          strokeWidth={6}
        />
        <Path
          d="M50 12C61 19 70 23 80 25L77 57C75 71 65 83 50 92C35 83 25 71 23 57L20 25C30 23 39 19 50 12Z"
          fill="#070C0F"
          stroke={metalDark}
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
      </Svg>
      <View style={styles.factionShieldLogo}>
        <TeamLogo
          accent={teamAccent}
          contentScale={logoScale}
          frameless
          name={faction.nom}
          size={leader ? 76 : 57}
          tag={faction.tag}
          tintColor={logoTint}
          uri={faction.logo}
        />
      </View>
      {mine ? (
        <View style={styles.factionCrown}>
          <Crown color="#101508" size={21} strokeWidth={2.5} />
        </View>
      ) : null}
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
      accessibilityLabel={`${rank}. ${faction.nom}, ${faction.membres} ${supporterLabel}${selected ? ', ma faction' : ''}`}
      accessibilityRole="summary"
      style={[
        styles.warRankRow,
        !isLast && styles.warRankRowDivider,
        selected && styles.warRankRowMine,
      ]}
    >
      <Text style={styles.warRank}>#{rank}</Text>
      <View style={[styles.warRankBadge, { borderColor: accent }]}>
        <TeamLogo accent={accent} contentScale={1} frameless name={faction.nom} size={38} tag={faction.tag} uri={faction.logo} />
      </View>
      <View style={styles.warRankCopy}>
        <View style={styles.warRankIdentity}>
          <Text numberOfLines={1} style={styles.warRankName}>{faction.nom}</Text>
          {selected ? <Text style={styles.warMineLabel}>MA FACTION</Text> : null}
        </View>
      </View>
      <View style={styles.warSupporterBlock}>
        <Text style={styles.warSupporterValue}>{formatNumber(faction.membres)}</Text>
        <Text style={styles.warSupporterLabel}>{supporterLabel.toUpperCase()}</Text>
        <Text style={styles.warRowArrow}>›</Text>
      </View>
    </View>
  );
}

function podiumMetal(rank: number) {
  if (rank === 1) return '#D8B72E';
  if (rank === 2) return '#ABB5BE';
  return '#B77E53';
}

function podiumMetalGradient(rank: number): [string, string] {
  if (rank === 1) return ['#8F7116', '#FFE25A'];
  if (rank === 2) return ['#6F7A84', '#E1E7EC'];
  return ['#70472D', '#D6A071'];
}

function factionAccent(faction: CommunityFaction, rank: number) {
  if (rank === 2) return '#AAB7BD';
  if (rank === 3) return '#A68B5D';
  const tag = faction.tag.trim().toUpperCase();
  if (tag === 'FNC') return '#FF6A21';
  if (tag === 'KC' || tag === 'KCORP') return '#38A0FF';
  if (tag === 'G2') return '#5A9CFF';
  if (tag === 'VIT') return '#F5C542';
  if (tag === 'T1') return '#F04B55';
  return colors.volt;
}

export function FactionMemberRanking({ faction, me }: { faction: CommunityFaction; me: CommunityMe }) {
  const person = me.top_activite.find((activity) => activity.user_id === me.user_id) ?? fallbackActivity(me);
  const rankingLabel = me.rang_activite && me.total_activite
    ? `#${me.rang_activite}/${me.total_activite}`
    : 'NON CLASSÉ';
  const accent = factionAccent(faction, 0);

  return (
    <View style={styles.memberSection}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionEyebrow}>DANS TA FACTION</Text>
          <Text style={styles.sectionTitle}>TON CLASSEMENT {faction.tag}</Text>
        </View>
        <Text style={styles.memberPlacement}>{rankingLabel}</Text>
      </View>

      <LinearGradient
        colors={['#101A11', '#0B130D', '#080E0B']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.memberPanel}
      >
        <FactionMemberRow accent={accent} person={person} />
        <View style={styles.memberPanelDivider} />
        <View style={styles.memberStats}>
          <MemberStat label="CALLS · 7 J" value={String(me.pronos_7j)} />
          <View style={styles.memberStatDivider} />
          <MemberStat label="VALIDÉS" value={String(me.gagnes_7j)} />
          <View style={styles.memberStatDivider} />
          <MemberStat label="FRAGS · 7 J" value={signed(me.delta_frags_7j)} featured />
        </View>
      </LinearGradient>
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

function FactionMemberRow({ accent, person }: { accent: string; person: CommunityActivity }) {
  return (
    <View
      accessible
      accessibilityLabel={`Rang ${person.rang}, ${person.pseudo}, toi`}
      accessibilityRole="summary"
      style={[styles.memberRow, styles.memberRowMine]}
    >
      <Text style={[styles.memberRowRank, styles.memberRowRankMine]}>#{person.rang}</Text>
      <View style={[styles.memberAvatar, { borderColor: accent }]}><Text style={styles.memberAvatarText}>{initials(person.pseudo)}</Text></View>
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
