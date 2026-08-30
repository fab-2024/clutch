import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

import { FEATURE_STATE_COPY, FeatureStateView } from '@/src/components/ui/FeatureStateView';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { publicAppUrl } from '@/src/config/release';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import CollectiveRelic from '@/src/features/social/faction/components/CollectiveRelic';
import FactionEvolutionRail from '@/src/features/social/faction/components/FactionEvolutionRail';
import {
  resolveRelicInstability,
  type RelicDiagnostics,
  type SupporterContributionPresentation,
} from '@/src/features/social/faction/relicState';
import type {
  CommunityActivity,
  CommunityFaction,
  CommunityMe,
  CommunityMutationPresentation,
  FactionProgress,
} from '@/src/features/social/faction/types';
import { factionProgress, gameLabel } from '@/src/features/social/faction/utils';
import { colors } from '@/src/theme';

import { styles } from './SocialHomeScreen.styles';

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

  return (
    <View style={styles.warSection}>
      <View style={[styles.sectionHeading, styles.warSectionHeading]}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionEyebrow}>CLASSEMENT DES FACTIONS</Text>
          <Text style={[styles.sectionTitle, styles.warSectionTitle, compact && styles.warSectionTitleCompact]}>QUI DOMINE LE TERRAIN ?</Text>
        </View>
        <View style={styles.warPeriod}>
          <View style={styles.warPeriodDot} />
          <Text style={styles.warPeriodText}>24 H</Text>
        </View>
      </View>
      <LinearGradient
        colors={['#0B151D', '#081119', '#060D13']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.warBoard}
        testID="faction-ranking-board"
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.warTableHeader, compact && styles.warTableHeaderCompact]}
        >
          <Text style={[styles.warTableHeading, compact && styles.warTableHeadingCompact, styles.warTableRankHeading, compact && styles.warTableRankHeadingCompact]}>RANG</Text>
          <Text style={[styles.warTableHeading, compact && styles.warTableHeadingCompact, styles.warTableFactionHeading]}>FACTION</Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={[styles.warTableHeading, compact && styles.warTableHeadingCompact, styles.warTableSupportersHeading, compact && styles.warTableSupportersHeadingCompact]}>SUPPORTERS</Text>
        </View>
        {leaders.map((faction, index) => (
          <FactionTableRow
            compact={compact}
            faction={faction}
            isLast={index === leaders.length - 1}
            key={faction.equipe_id}
            mine={mine}
            rank={index + 1}
          />
        ))}
      </LinearGradient>
    </View>
  );
}

function FactionTableRow({
  compact,
  faction,
  isLast,
  mine,
  rank,
}: {
  compact: boolean;
  faction: CommunityFaction;
  isLast: boolean;
  mine: CommunityFaction | null;
  rank: number;
}) {
  const selected = faction.equipe_id === mine?.equipe_id;
  const accent = factionRankAccent(rank);
  const supporterLabel = faction.membres === 1 ? 'SUPPORTER' : 'SUPPORTERS';

  return (
    <LinearGradient
      accessible
      accessibilityLabel={`${rank}. ${faction.nom}, ${faction.membres} ${supporterLabel.toLowerCase()}${selected ? ', ma faction' : ''}`}
      accessibilityRole="summary"
      colors={selected ? ['#261508', '#160D08', '#0A1015'] : ['#0A141C', '#081119', '#071018']}
      end={{ x: 1, y: .8 }}
      start={{ x: 0, y: .2 }}
      style={[
        styles.warTableRow,
        compact && styles.warTableRowCompact,
        !isLast && styles.warTableRowDivider,
        selected && styles.warTableRowMine,
      ]}
    >
      <View style={[styles.warTableRail, { backgroundColor: accent }]} />
      <Text style={[styles.warTableRank, compact && styles.warTableRankCompact, { color: accent }]}>#{rank}</Text>
      <FactionRankingShield compact={compact} faction={faction} rank={rank} />
      <View style={styles.warTableIdentity}>
        <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={[styles.warTableName, compact && styles.warTableNameCompact]}>
          {faction.nom}
        </Text>
        {selected ? <Text numberOfLines={1} style={[styles.warTableMine, compact && styles.warTableMineCompact]}>MA FACTION</Text> : null}
      </View>
      <View style={[styles.warTableSupporters, compact && styles.warTableSupportersCompact]}>
        <Text style={[styles.warTableSupporterValue, compact && styles.warTableSupporterValueCompact]}>{formatNumber(faction.membres)}</Text>
        <Text numberOfLines={1} style={[styles.warTableSupporterLabel, compact && styles.warTableSupporterLabelCompact]}>{supporterLabel}</Text>
      </View>
    </LinearGradient>
  );
}

function FactionRankingShield({
  compact,
  faction,
  rank,
}: {
  compact: boolean;
  faction: CommunityFaction;
  rank: number;
}) {
  const size = compact ? 40 : 56;
  const [metalDark, metalLight] = podiumMetalGradient(rank);
  const gradientId = `faction-ranking-shield-${faction.equipe_id}`;
  const teamAccent = factionAccent(faction, 0);
  const normalizedTag = faction.tag.trim().toUpperCase();
  const logoScale = normalizedTag === 'G2' ? 1.28 : 1.02;
  const logoTint = normalizedTag === 'KC' || normalizedTag === 'KCORP' ? teamAccent : undefined;

  return (
    <View style={[styles.warTableShield, { height: size * 1.08, width: size }]}>
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
      <View style={styles.warTableShieldLogo}>
        <TeamLogo
          accent={teamAccent}
          contentScale={logoScale}
          frameless
          name={faction.nom}
          size={compact ? 26 : 36}
          tag={faction.tag}
          tintColor={logoTint}
          uri={faction.logo}
        />
      </View>
    </View>
  );
}

function podiumMetalGradient(rank: number): [string, string] {
  if (rank === 1) return ['#8F7116', '#FFE25A'];
  if (rank === 2) return ['#6F7A84', '#E1E7EC'];
  return ['#476B80', '#9EC9E4'];
}

function factionRankAccent(rank: number) {
  if (rank === 3) return '#20A9E8';
  return colors.volt;
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
  const compact = useWindowDimensions().width <= 340;
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
        colors={['#161018', '#100D13', '#090D12']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.memberIdentityCard}
        testID="faction-member-identity"
      >
        <View style={styles.memberIdentityTopRule} />
        <FactionMemberRow accent={accent} compact={compact} person={person} />
      </LinearGradient>
      <LinearGradient
        colors={['#0B1720', '#08131B', '#070E14']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.memberStatsPanel}
        testID="faction-member-stats"
      >
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

function FactionMemberRow({ accent, compact, person }: { accent: string; compact: boolean; person: CommunityActivity }) {
  return (
    <View
      accessible
      accessibilityLabel={`Rang ${person.rang}, ${person.pseudo}, toi`}
      accessibilityRole="summary"
      style={[styles.memberRow, compact && styles.memberRowCompact, styles.memberRowMine]}
    >
      <Text style={[styles.memberRowRank, compact && styles.memberRowRankCompact, styles.memberRowRankMine]}>#{person.rang}</Text>
      <View style={[styles.memberIdentityDivider, compact && styles.memberIdentityDividerCompact]} />
      <View style={[styles.memberAvatar, compact && styles.memberAvatarCompact, { borderColor: accent }]}><Text style={styles.memberAvatarText}>{initials(person.pseudo)}</Text></View>
      <View style={styles.memberCopy}>
        <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={[styles.memberName, compact && styles.memberNameCompact]}>{person.pseudo}</Text>
        <Text style={styles.memberMeta}>Toi</Text>
      </View>
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
