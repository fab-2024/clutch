import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Image,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  type ImageSourcePropType,
  useWindowDimensions,
  View,
} from 'react-native';

import { FEATURE_STATE_COPY, FeatureStateView } from '@/src/components/ui/FeatureStateView';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { publicAppUrl } from '@/src/config/release';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import PlayerAvatar from '@/src/features/profile/avatars/PlayerAvatar';
import CollectiveRelic from '@/src/features/social/faction/components/CollectiveRelic';
import FactionEvolutionRail from '@/src/features/social/faction/components/FactionEvolutionRail';
import {
  resolveRelicInstability,
  type RelicDiagnostics,
  type SupporterContributionPresentation,
} from '@/src/features/social/faction/relicState';
import type {
  CommunityFaction,
  CommunityMe,
  CommunityMutationPresentation,
  FactionProgress,
} from '@/src/features/social/faction/types';
import { factionProgress, gameLabel } from '@/src/features/social/faction/utils';
import { colors } from '@/src/theme';

import { styles } from './SocialHomeScreen.styles';

const FACTION_RANKING_ARTWORK: Record<string, ImageSourcePropType> = {
  M8: require('../../../../assets/shop/team-packs/m8/items/m8-crest-3d.png'),
  GM8: require('../../../../assets/shop/team-packs/m8/items/m8-crest-3d.png'),
};

export function FactionRelicHero({
  faction,
  me,
  mutationOverride,
  relicProgressOverride,
  instabilityPreviewOverride,
  onRelicDiagnosticsChange,
  onMutationPresented,
  onSupporterContributionPresented,
  supporterContribution,
}: {
  faction: CommunityFaction | null;
  me: CommunityMe | null;
  mutationOverride?: CommunityMutationPresentation | null;
  relicProgressOverride?: FactionProgress;
  instabilityPreviewOverride?: { charge: number; objective: number };
  onRelicDiagnosticsChange?: (diagnostics: RelicDiagnostics) => void;
  onMutationPresented?: (eventId: string) => Promise<void> | void;
  onSupporterContributionPresented?: (contributionId: string) => Promise<void> | void;
  supporterContribution?: SupporterContributionPresentation | null;
}) {
  const progress = relicProgressOverride ?? factionProgress(faction?.membres ?? 0, faction?.niveau_atteint);
  const instability = resolveRelicInstability(
    instabilityPreviewOverride?.charge ?? progress.charge,
    instabilityPreviewOverride?.objective ?? progress.objective,
  );
  const pct = Math.round(progress.progress * 100);
  const title = faction ? 'PORTE TES COULEURS.' : 'CHOISIS TES COULEURS.';
  const actionTitle = progress.max
    ? 'INVITER DES SUPPORTERS'
    : instability.tier === 'mutationReady'
      ? 'MUTATION PRÊTE'
    : `RALLIER ${formatNumber(progress.remaining)} SUPPORTER${progress.remaining > 1 ? 'S' : ''}`;
  const mutation = mutationOverride === undefined ? me?.mutation_a_presenter : mutationOverride;

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
        faction={faction}
        instabilityPreviewOverride={instabilityPreviewOverride}
        mutation={mutation}
        onDiagnosticsChange={onRelicDiagnosticsChange}
        onMutationPresented={onMutationPresented}
        onSupporterContributionPresented={onSupporterContributionPresented}
        progress={progress}
        supporterContribution={supporterContribution}
      />

      <View style={styles.factionIdentity}>
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
          <View style={styles.factionGrowthBlock}>
            <Text style={styles.factionGrowthLabel}>SUPPORTERS ·</Text>
            <Text style={styles.factionGrowth}>{signed(faction.croissance_7j)}</Text>
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
            <View style={styles.rallySurface}>
              <View style={styles.rallyIcon}><SupporterGroupIcon /></View>
              <Text numberOfLines={2} style={styles.rallyText}>{actionTitle}</Text>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function FactionWar({ factions, mine }: { factions: CommunityFaction[]; mine: CommunityFaction | null }) {
  const compact = useWindowDimensions().width <= 340;
  const leaders = factions.slice(0, 3);
  const leader = leaders[0];

  return (
    <View style={styles.warSection}>
      <View style={[styles.sectionHeading, styles.warSectionHeading]}>
        <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={[styles.warSectionTitle, compact && styles.warSectionTitleCompact]}>CLASSEMENT DES FACTIONS</Text>
        <View style={styles.warPeriod}>
          <View style={styles.warPeriodDot} />
          <Text style={styles.warPeriodText}>24 H</Text>
        </View>
      </View>
      <View style={styles.warBoard} testID="faction-ranking-board">
        {leader ? <FactionLeaderCard compact={compact} faction={leader} mine={mine} /> : null}
        {leaders.slice(1).map((faction, index) => (
          <FactionPodiumRow
            compact={compact}
            faction={faction}
            key={faction.equipe_id}
            mine={mine}
            rank={index + 2}
          />
        ))}
      </View>
    </View>
  );
}

function FactionLeaderCard({
  compact,
  faction,
  mine,
}: {
  compact: boolean;
  faction: CommunityFaction;
  mine: CommunityFaction | null;
}) {
  const selected = faction.equipe_id === mine?.equipe_id;
  const palette = factionRankingPalette(faction, 1);
  const supporterLabel = faction.membres === 1 ? 'SUPPORTER' : 'SUPPORTERS';

  return (
    <LinearGradient
      accessible
      accessibilityLabel={`1. ${faction.nom}, ${faction.membres} ${supporterLabel.toLowerCase()}, progression ${signed(faction.croissance_24h)} sur 24 heures${selected ? ', ma faction' : ''}`}
      accessibilityRole="summary"
      colors={palette.gradient}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.factionLeaderCard, compact && styles.factionLeaderCardCompact, { borderColor: palette.border }]}
      testID="faction-ranking-leader"
    >
      <View style={[styles.factionLeaderBeam, { backgroundColor: palette.accent }]} />
      <View style={[styles.factionLeaderBeam, styles.factionLeaderBeamSecondary, { backgroundColor: palette.accent }]} />
      <View style={styles.factionLeaderVisual}>
        <Text style={[styles.factionLeaderRank, compact && styles.factionLeaderRankCompact]}>#1</Text>
        <FactionRankingLogo compact={compact} faction={faction} hero />
      </View>
      <View style={[styles.factionLeaderInfo, compact && styles.factionLeaderInfoCompact]}>
        <Text adjustsFontSizeToFit minimumFontScale={0.62} numberOfLines={2} style={[styles.factionLeaderName, compact && styles.factionLeaderNameCompact]}>
          {faction.nom.toUpperCase()}
        </Text>
        <View style={styles.factionLeaderMetaRow}>
          <Text style={styles.factionLeaderTag}>{faction.tag.toUpperCase()}</Text>
          {selected ? (
            <>
              <Text style={styles.factionLeaderBullet}>•</Text>
              <Text style={styles.factionLeaderMine}>MA FACTION</Text>
            </>
          ) : null}
        </View>
        <View style={styles.factionRankingDivider} />
        <Text style={[styles.factionLeaderSupporters, compact && styles.factionLeaderSupportersCompact]}>{formatNumber(faction.membres)}</Text>
        <Text style={styles.factionLeaderSupporterLabel}>{supporterLabel}</Text>
        <View style={styles.factionRankingDivider} />
        <Text style={styles.factionLeaderGrowth}>
          {signed(faction.croissance_24h)} <Text style={styles.factionLeaderGrowthPeriod}>· 24 H</Text>
        </Text>
      </View>
    </LinearGradient>
  );
}

function FactionPodiumRow({
  compact,
  faction,
  mine,
  rank,
}: {
  compact: boolean;
  faction: CommunityFaction;
  mine: CommunityFaction | null;
  rank: number;
}) {
  const selected = faction.equipe_id === mine?.equipe_id;
  const palette = factionRankingPalette(faction, rank);
  const supporterLabel = faction.membres === 1 ? 'SUPPORTER' : 'SUPPORTERS';

  return (
    <LinearGradient
      accessible
      accessibilityLabel={`${rank}. ${faction.nom}, ${faction.membres} ${supporterLabel.toLowerCase()}, progression ${signed(faction.croissance_24h)} sur 24 heures${selected ? ', ma faction' : ''}`}
      accessibilityRole="summary"
      colors={palette.gradient}
      end={{ x: 1, y: .5 }}
      start={{ x: 0, y: .5 }}
      style={[styles.factionPodiumRow, compact && styles.factionPodiumRowCompact, { borderColor: palette.border }]}
      testID={`faction-ranking-row-${rank}`}
    >
      <View style={[styles.factionPodiumGlow, { backgroundColor: palette.accent }]} />
      <Text style={[styles.factionPodiumRank, compact && styles.factionPodiumRankCompact]}>#{rank}</Text>
      <View style={[styles.factionPodiumLogo, compact && styles.factionPodiumLogoCompact]}>
        <FactionRankingLogo compact={compact} faction={faction} />
      </View>
      <View style={styles.factionPodiumIdentity}>
        <Text adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={1} style={[styles.factionPodiumName, compact && styles.factionPodiumNameCompact]}>
          {faction.nom.toUpperCase()}
        </Text>
        <View style={styles.factionPodiumMetaRow}>
          <Text style={styles.factionPodiumTag}>{faction.tag.toUpperCase()}</Text>
          {selected ? <Text style={styles.factionPodiumMine}>MA FACTION</Text> : null}
        </View>
      </View>
      <View style={[styles.factionPodiumMetrics, compact && styles.factionPodiumMetricsCompact]}>
        <Text style={[styles.factionPodiumSupporters, compact && styles.factionPodiumSupportersCompact]}>{formatNumber(faction.membres)}</Text>
        <Text style={styles.factionPodiumSupporterLabel}>{supporterLabel}</Text>
        <View style={styles.factionPodiumDivider} />
        <Text style={styles.factionPodiumGrowth}>{signed(faction.croissance_24h)} <Text style={styles.factionPodiumPeriod}>· 24 H</Text></Text>
      </View>
    </LinearGradient>
  );
}

function FactionRankingLogo({ compact, faction, hero = false }: { compact: boolean; faction: CommunityFaction; hero?: boolean }) {
  const tag = faction.tag.trim().toUpperCase();
  const artwork = FACTION_RANKING_ARTWORK[tag];
  const size = hero ? (compact ? 124 : 148) : (compact ? 58 : 72);
  const accent = factionAccent(faction, 0);

  if (artwork) {
    return (
      <View style={[styles.factionRankingArtworkBlend, { height: size, width: size }]}>
        <Image accessibilityIgnoresInvertColors resizeMode="contain" source={artwork} style={styles.factionRankingArtwork} />
      </View>
    );
  }

  return (
    <TeamLogo
      accent={accent}
      contentScale={hero ? 1 : 1.08}
      frameless
      name={faction.nom}
      size={size}
      tag={faction.tag}
      uri={faction.logo}
    />
  );
}

function factionRankingPalette(faction: CommunityFaction, rank: number) {
  const tag = faction.tag.trim().toUpperCase();
  if (tag === 'KC' || tag === 'KCORP') {
    return { accent: '#247DFF', border: '#237CFF', gradient: ['#0A3B99', '#071E4C', '#07121D'] as const };
  }
  if (tag === 'M8' || tag === 'GM8') {
    return { accent: '#B9D2E8', border: '#87A6BF', gradient: ['#587289', '#1D2E3D', '#09121A'] as const };
  }
  if (tag === 'FNC') {
    return { accent: '#FF6A00', border: '#D35A08', gradient: ['#9B410A', '#351709', '#0B0F12'] as const };
  }
  if (rank === 2) {
    return { accent: '#C5D3DD', border: '#7891A4', gradient: ['#40566A', '#172631', '#081119'] as const };
  }
  if (rank === 3) {
    return { accent: '#D67925', border: '#A85318', gradient: ['#66300D', '#2A170B', '#081016'] as const };
  }
  return { accent: factionAccent(faction, rank), border: '#2778E5', gradient: ['#0B367A', '#0A1F42', '#07121D'] as const };
}

function factionAccent(faction: CommunityFaction, rank: number) {
  if (rank === 2) return '#AAB7BD';
  if (rank === 3) return '#A68B5D';
  const tag = faction.tag.trim().toUpperCase();
  if (tag === 'FNC') return '#FF6A21';
  if (tag === 'KC' || tag === 'KCORP') return '#38A0FF';
  if (tag === 'M8' || tag === 'GM8') return '#D5E2EC';
  if (tag === 'G2') return '#5A9CFF';
  if (tag === 'VIT') return '#F5C542';
  if (tag === 'T1') return '#F04B55';
  return colors.volt;
}

export function FactionMemberRanking({
  avatarId,
  faction,
  me,
}: {
  avatarId?: string | null;
  faction: CommunityFaction;
  me: CommunityMe;
}) {
  const compact = useWindowDimensions().width <= 340;
  const palette = factionRankingPalette(faction, 1);
  const accent = palette.accent;
  const ranking = memberRankingState(me);

  return (
    <View style={styles.memberSection}>
      <View style={styles.memberHeading}>
        <Text style={styles.sectionEyebrow}>DANS TA FACTION</Text>
        <Text style={styles.sectionTitle}>TON CLASSEMENT {faction.tag.toUpperCase()}</Text>
      </View>

      <LinearGradient
        accessible
        accessibilityLabel={me.rang_activite && me.total_activite
          ? `Rang ${me.rang_activite} sur ${me.total_activite}, ${me.pseudo}, toi`
          : `${me.pseudo}, non classé`}
        accessibilityRole="summary"
        colors={palette.gradient}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.memberIdentityCard, { borderColor: accent }]}
        testID="faction-member-identity"
      >
        <View style={[styles.memberIdentityGlow, { backgroundColor: accent }]} />
        <View style={[styles.memberIdentityBody, compact && styles.memberIdentityBodyCompact]}>
          <View style={[styles.memberAvatar, compact && styles.memberAvatarCompact]}>
            <PlayerAvatar avatarId={avatarId} label={me.pseudo} size={compact ? 62 : 72} />
          </View>
          <View style={styles.memberRankingBody}>
            <View style={styles.memberRankingHeadline}>
              <View style={styles.memberCopy}>
                <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={[styles.memberName, compact && styles.memberNameCompact]}>{me.pseudo}</Text>
                <Text style={styles.memberMeta}>TOI</Text>
              </View>
              <View style={styles.memberRankGroup}>
                <Text style={[styles.memberRankPrimary, compact && styles.memberRankPrimaryCompact]}>{ranking.rankLabel}</Text>
                {ranking.totalLabel ? <Text style={[styles.memberRankTotal, compact && styles.memberRankTotalCompact]}>/ {ranking.totalLabel}</Text> : null}
              </View>
            </View>
            <View
              accessibilityLabel={`Progression vers ${ranking.goalLabel}`}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(ranking.progress * 100) }}
              style={styles.memberProgressTrack}
              testID="faction-member-progress"
            >
              <View style={[styles.memberProgressFill, { width: `${Math.round(ranking.progress * 100)}%` as `${number}%` }]} />
              <View style={[styles.memberProgressMarker, styles.memberProgressMarkerFirst]} />
              <View style={[styles.memberProgressMarker, styles.memberProgressMarkerSecond]} />
              <View style={[styles.memberProgressMarker, styles.memberProgressMarkerThird]} />
            </View>
            <Text numberOfLines={1} style={[styles.memberProgressHint, compact && styles.memberProgressHintCompact]}>{ranking.hint}</Text>
          </View>
        </View>
      </LinearGradient>
      <LinearGradient
        colors={['#0B1720', '#08131B', '#070E14']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.memberStatsPanel}
        testID="faction-member-stats"
      >
        <View style={styles.memberStats}>
          <MemberStat label="CALLS" value={String(me.pronos_7j)} />
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

export function EmptyFactions() {
  return (
    <FeatureStateView compact domain="social" testID="social-empty-state" variant="empty" />
  );
}

export function SocialHomeSkeleton() {
  return (
    <SkeletonGroup label={FEATURE_STATE_COPY.social.loading.title} style={styles.socialSkeleton} testID="social-home-loading">
      <View style={styles.heroSkeleton}>
        <View style={styles.heroSkeletonTop}>
          <View style={styles.heroSkeletonHeading}>
            <Skeleton height={9} radius="pill" width={118} />
            <Skeleton height={30} radius="sm" width={205} />
          </View>
          <Skeleton height={27} radius="pill" width={96} />
        </View>
        <Skeleton height={226} radius="pill" style={styles.skeletonRelic} width={226} />
        <View style={styles.heroSkeletonIdentity}>
          <Skeleton height={42} radius="md" width={42} />
          <View style={styles.heroSkeletonIdentityCopy}>
            <Skeleton height={13} radius="pill" width="56%" />
            <Skeleton height={8} radius="pill" tone="subtle" width="76%" />
          </View>
          <Skeleton height={18} radius="pill" width={62} />
        </View>
        <View style={styles.heroSkeletonProgress}>
          <View style={styles.heroSkeletonProgressTop}>
            <Skeleton height={8} radius="pill" width={92} />
            <Skeleton height={10} radius="pill" width={74} />
          </View>
          <Skeleton height={4} radius="pill" width="100%" />
          <Skeleton height={8} radius="pill" tone="subtle" width="64%" />
        </View>
        <Skeleton height={44} radius="md" tone="highlight" width="100%" />
      </View>

      <View style={styles.warSkeletonSection}>
        <View style={styles.skeletonSectionHeading}>
          <View style={styles.skeletonSectionCopy}>
            <Skeleton height={9} radius="pill" width={136} />
            <Skeleton height={24} radius="sm" width={224} />
          </View>
          <Skeleton height={10} radius="pill" width={42} />
        </View>
        <View style={styles.warSkeletonBoard}>
          <View style={styles.warSkeletonHeader}>
            <Skeleton height={9} radius="pill" width={38} />
            <Skeleton height={9} radius="pill" width="34%" />
            <Skeleton height={9} radius="pill" width={68} />
          </View>
          {[0, 1, 2].map((item) => (
            <View key={item} style={styles.warSkeletonRow}>
              <Skeleton height={30} radius="sm" width={38} />
              <Skeleton height={64} radius="lg" width={58} />
              <View style={styles.warSkeletonRowCopy}>
                <Skeleton height={14} radius="pill" width="84%" />
                {item === 0 ? <Skeleton height={8} radius="pill" tone="subtle" width="58%" /> : null}
              </View>
              <Skeleton height={34} radius="md" width={56} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.memberSkeletonSection}>
        <View style={styles.skeletonSectionHeading}>
          <View style={styles.skeletonSectionCopy}>
            <Skeleton height={9} radius="pill" width={104} />
            <Skeleton height={24} radius="sm" width={198} />
          </View>
          <Skeleton height={12} radius="pill" width={52} />
        </View>
        <View style={styles.memberSkeletonPanel}>
          <View style={styles.memberSkeletonRow}>
            <Skeleton height={28} radius="sm" width={42} />
            <Skeleton height={54} radius="sm" width={1} />
            <Skeleton height={54} radius="pill" width={54} />
            <View style={styles.memberSkeletonCopy}>
              <Skeleton height={16} radius="pill" width="58%" />
              <Skeleton height={9} radius="pill" tone="subtle" width="28%" />
            </View>
          </View>
        </View>
        <View style={styles.memberSkeletonStatsPanel}>
          <View style={styles.memberSkeletonStats}>
            {[0, 1, 2].map((item) => <Skeleton height={48} key={item} radius="md" width="29%" />)}
          </View>
        </View>
      </View>
    </SkeletonGroup>
  );
}

function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(value); }
function signed(value: number) { return `${value >= 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`; }

function memberRankingState(me: CommunityMe) {
  const rank = Number(me.rang_activite ?? 0);
  const total = Number(me.total_activite ?? 0);

  if (rank <= 0 || total <= 0) {
    return {
      goalLabel: 'le classement',
      hint: 'JOUE UN CALL POUR ENTRER AU CLASSEMENT',
      progress: 0,
      rankLabel: '—',
      totalLabel: '',
    };
  }

  if (rank === 1) {
    return {
      goalLabel: 'la première place',
      hint: 'PREMIER DE TA FACTION',
      progress: 1,
      rankLabel: '#1',
      totalLabel: formatNumber(total),
    };
  }

  const { baseline, target } = memberRankGoal(rank, total);
  const places = Math.max(1, rank - target);
  const progress = Math.max(0, Math.min(1, (baseline - rank) / Math.max(1, baseline - target)));
  const goalLabel = target === 1 ? 'la première place' : `le top ${target}`;
  const goalCopy = target === 1 ? 'LA #1' : `LE TOP ${target}`;

  return {
    goalLabel,
    hint: `${places} PLACE${places > 1 ? 'S' : ''} AVANT ${goalCopy}`,
    progress,
    rankLabel: `#${formatNumber(rank)}`,
    totalLabel: formatNumber(total),
  };
}

function memberRankGoal(rank: number, total: number) {
  if (rank > 100) return { baseline: Math.max(rank, total), target: 100 };
  if (rank > 50) return { baseline: 100, target: 50 };
  if (rank > 25) return { baseline: 50, target: 25 };
  if (rank > 10) return { baseline: 25, target: 10 };
  if (rank > 3) return { baseline: 10, target: 3 };
  return { baseline: 3, target: 1 };
}
