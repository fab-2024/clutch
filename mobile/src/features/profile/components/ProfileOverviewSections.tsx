import { LinearGradient } from 'expo-linear-gradient';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Crosshair from 'lucide-react-native/icons/crosshair';
import Headphones from 'lucide-react-native/icons/headphones';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Swords from 'lucide-react-native/icons/swords';
import type { LucideIcon } from 'lucide-react-native';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { RankEmblem } from '@/src/features/ranking/components/RankEmblem';
import type { SeasonalGradeSummary } from '@/src/features/ranking/grades';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import { colors, radius, spacing, typography } from '@/src/theme';
import { adaptShowcaseRingStats, resolveAllShowcaseRings } from '../showcaseRings/progression';
import type { ProfileData } from '../types';
import { toNumber } from '../utils';

type ProfileOverviewSectionsProps = {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  loading: boolean;
  onOpenBadges: () => void;
  onOpenJerseys: () => void;
  onOpenRank: () => void;
  onOpenRings: () => void;
  onOpenShowcase: () => void;
  onOpenTrophies: () => void;
  rankAccent: string;
  rankLabel: string;
};

type CollectionEntry = {
  accent: string;
  accessibilityLabel: string;
  asset: ImageSourcePropType;
  label: string;
  meta: string;
  onPress: () => void;
};

const COLLECTION_ASSETS = {
  badge: require('../../../../assets/showcase/collectibles/showcase-badge-v1.png'),
  jersey: require('../../../../assets/showcase/showcase-jersey-base-v1.png'),
  ring: require('../../../../assets/showcase/rings/thumbs/ring-rank-01-thumb.webp'),
  trophy: require('../../../../assets/showcase/showcase-trophy-v1.png'),
} satisfies Record<string, ImageSourcePropType>;

export default function ProfileOverviewSections({
  cosmetics,
  data,
  loading,
  onOpenBadges,
  onOpenJerseys,
  onOpenRank,
  onOpenRings,
  onOpenShowcase,
  onOpenTrophies,
  rankAccent,
  rankLabel,
}: ProfileOverviewSectionsProps) {
  return (
    <View style={styles.sections}>
      <RankSection
        data={data}
        loading={loading}
        onPress={onOpenRank}
        rankAccent={rankAccent}
        rankLabel={rankLabel}
      />
      <StatsSection data={data} loading={loading} />
      <ProfileCollectionSection
        cosmetics={cosmetics}
        data={data}
        loading={loading}
        onOpenAll={onOpenShowcase}
        onOpenBadges={onOpenBadges}
        onOpenJerseys={onOpenJerseys}
        onOpenRings={onOpenRings}
        onOpenTrophies={onOpenTrophies}
      />
    </View>
  );
}

function RankSection({
  data,
  loading,
  onPress,
  rankAccent,
  rankLabel,
}: {
  data: ProfileData | null;
  loading: boolean;
  onPress: () => void;
  rankAccent: string;
  rankLabel: string;
}) {
  const grade = data?.ranking.grade;
  const level = data?.level.level ?? 0;
  const xp = Math.max(0, data?.level.xp ?? 0);
  const remaining = Math.max(0, data?.level.remaining ?? 0);
  const xpGoal = Math.max(1, xp + remaining);
  const xpProgress = loading ? 0 : Math.max(0, Math.min(100, Math.round((xp / xpGoal) * 100)));
  const frags = Math.max(0, data?.ranking.frags ?? 0);
  const nextGrade = grade?.prochaine_cle ? {
    cle: grade.prochaine_cle,
    libelle: grade.prochain_libelle || 'Palier suivant',
    minimum: grade.prochain_minimum ?? frags,
    ordre: (grade.ordre ?? 0) + 1,
  } satisfies SeasonalGradeSummary : null;
  const description = loading
    ? 'Progression en cours de synchronisation'
    : `Rang ${rankLabel}, ${formatNumber(frags)} Frags, niveau ${level}, ${formatNumber(remaining)} XP avant le niveau suivant`;

  return (
    <Pressable
      accessibilityHint="Ouvre le classement et le prochain palier"
      accessibilityLabel={description}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.rankPressable, pressed && styles.pressed]}
      testID="profile-section-progression"
    >
      <LinearGradient
        colors={['#24170D', '#100D0A', '#06090C']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.rankCard}
      >
        <View pointerEvents="none" style={styles.rankAtmosphere} />
        <View style={styles.rankTopRow}>
          <Text style={styles.rankCardLabel}>RANKED</Text>
          <View style={styles.inlineAction}>
            <Text style={styles.inlineActionText}>VOIR LE CLASSEMENT</Text>
            <ChevronRight color={colors.volt} size={18} strokeWidth={2.2} />
          </View>
        </View>

        <View style={styles.rankContent}>
          <RankEmblem decorative grade={grade} size={126} />
          <View style={styles.rankCopy}>
            <Text style={styles.rankEyebrow}>RANG ACTUEL</Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              style={[styles.rankName, { color: rankAccent }]}
            >
              {loading ? 'SYNCHRO' : rankLabel}
            </Text>
            <Text numberOfLines={1} style={styles.rankSeason}>
              {data?.ranking.saison_nom?.toUpperCase() || 'SAISON ACTIVE'}
            </Text>

            <View style={styles.xpValueRow}>
              <Text style={styles.xpValueCurrent}>{loading ? '—' : formatNumber(xp)}</Text>
              <Text style={styles.xpValueGoal}> / {loading ? '—' : formatNumber(xpGoal)} XP</Text>
            </View>
            <View style={styles.xpRailRow}>
              <View style={styles.xpTrack}>
                <LinearGradient
                  colors={['#A9530C', '#FFB04B', '#C96B18']}
                  end={{ x: 1, y: 0 }}
                  start={{ x: 0, y: 0 }}
                  style={[styles.xpTrackFill, { width: `${Math.max(2, xpProgress)}%` }]}
                />
              </View>
              {nextGrade ? (
                <View style={styles.nextGrade}>
                  <RankEmblem decorative grade={nextGrade} size={34} />
                  <Text numberOfLines={1} style={styles.nextGradeLabel}>{nextGrade.libelle.toUpperCase()}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function StatsSection({ data, loading }: { data: ProfileData | null; loading: boolean }) {
  const calls = Math.max(0, data?.ranking.pronostics_regles ?? 0);
  const validated = Math.max(0, data?.ranking.pronostics_gagnes ?? 0);
  const duelWins = recapMetric(data?.recap, ['duels_gagnes', 'duels_remportes', 'duel_wins', 'defis_gagnes']);
  const frags = Math.max(0, data?.ranking.frags ?? 0);
  const metrics = [
    { accent: '#29B6FF', Icon: Headphones, key: 'calls', label: 'CALLS', value: calls },
    { accent: '#A5F20A', Icon: ShieldCheck, key: 'validated', label: 'VALIDÉS', value: validated },
    { accent: '#FF9F0A', Icon: Swords, key: 'duels', label: 'DUELS GAGNÉS', value: duelWins },
    { accent: '#D58BFF', Icon: Crosshair, key: 'frags', label: 'FRAGS', value: frags },
  ];

  return (
    <View
      accessibilityLabel={loading ? 'Statistiques en cours de synchronisation' : `${calls} Calls, ${validated} validés, ${duelWins} duels gagnés, ${frags} Frags`}
      accessible
      style={styles.statsCard}
      testID="profile-stats-card"
    >
      <Text style={styles.statsTitle}>TES STATS</Text>
      <View style={styles.statsRow}>
        {metrics.map((metric, index) => (
          <StatMetric
            accent={metric.accent}
            Icon={metric.Icon}
            key={metric.key}
            label={metric.label}
            loading={loading}
            separated={index > 0}
            value={metric.value}
          />
        ))}
      </View>
    </View>
  );
}

function StatMetric({
  accent,
  Icon,
  label,
  loading,
  separated,
  value,
}: {
  accent: string;
  Icon: LucideIcon;
  label: string;
  loading: boolean;
  separated: boolean;
  value: number;
}) {
  return (
    <View style={[styles.statMetric, separated && styles.statMetricSeparated]}>
      <Icon color={accent} size={25} strokeWidth={2} />
      <Text numberOfLines={1} style={styles.statValue}>{loading ? '—' : formatNumber(value)}</Text>
      <Text numberOfLines={2} style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProfileCollectionSection({
  cosmetics,
  data,
  loading,
  onOpenAll,
  onOpenBadges,
  onOpenJerseys,
  onOpenRings,
  onOpenTrophies,
}: {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  loading: boolean;
  onOpenAll: () => void;
  onOpenBadges: () => void;
  onOpenJerseys: () => void;
  onOpenRings: () => void;
  onOpenTrophies: () => void;
}) {
  const unlockedBadges = loading ? 0 : (data?.badges ?? []).filter((badge) => badge.obtained).length;
  const unlockedTrophies = Math.min(4, unlockedBadges);
  const ringProgressions = resolveAllShowcaseRings(adaptShowcaseRingStats(data));
  const unlockedRings = loading ? 0 : ringProgressions.filter((progress) => progress.current).length;
  const equippedJerseys = loading ? 0 : cosmetics?.showcase.jersey ? 1 : 0;
  const entries: CollectionEntry[] = [
    {
      accent: '#28B7F6',
      accessibilityLabel: `Ouvrir mes badges, ${loading ? 'synchronisation' : `${unlockedBadges} débloqués`}`,
      asset: COLLECTION_ASSETS.badge,
      label: 'BADGES',
      meta: loading ? 'SYNCHRONISATION' : `${unlockedBadges} DÉBLOQUÉ${unlockedBadges === 1 ? '' : 'S'}`,
      onPress: onOpenBadges,
    },
    {
      accent: '#FF970F',
      accessibilityLabel: `Ouvrir mes anneaux, ${loading ? 'synchronisation' : `${unlockedRings} sur ${ringProgressions.length}`}`,
      asset: COLLECTION_ASSETS.ring,
      label: 'ANNEAUX',
      meta: loading ? 'SYNCHRONISATION' : `${unlockedRings} / ${ringProgressions.length}`,
      onPress: onOpenRings,
    },
    {
      accent: '#C98B45',
      accessibilityLabel: `Ouvrir mes trophées, ${loading ? 'synchronisation' : `${unlockedTrophies} sur 4`}`,
      asset: COLLECTION_ASSETS.trophy,
      label: 'TROPHÉES',
      meta: loading ? 'SYNCHRONISATION' : `${unlockedTrophies} / 4`,
      onPress: onOpenTrophies,
    },
    {
      accent: '#25D4D0',
      accessibilityLabel: `Ouvrir mes maillots, ${loading ? 'synchronisation' : `${equippedJerseys} équipé`}`,
      asset: COLLECTION_ASSETS.jersey,
      label: 'MAILLOTS',
      meta: loading ? 'SYNCHRONISATION' : equippedJerseys ? `${equippedJerseys} ÉQUIPÉ` : 'AUCUN ÉQUIPÉ',
      onPress: onOpenJerseys,
    },
  ];

  return (
    <View style={styles.collectionSection} testID="profile-section-collection">
      <View style={styles.collectionHeading}>
        <Text style={styles.collectionTitle}>TA COLLECTION</Text>
        <Pressable
          accessibilityLabel="Ouvrir ma Vitrine en paysage"
          accessibilityRole="button"
          onPress={onOpenAll}
          style={({ pressed }) => [styles.inlineAction, pressed && styles.pressed]}
        >
          <Text style={styles.inlineActionText}>TOUT VOIR</Text>
          <ChevronRight color={colors.volt} size={18} strokeWidth={2.2} />
        </Pressable>
      </View>
      <View style={styles.profileLinks}>
        {entries.map((entry) => <ProfileCollectionLink entry={entry} key={entry.label} />)}
      </View>
    </View>
  );
}

function ProfileCollectionLink({ entry }: { entry: CollectionEntry }) {
  return (
    <Pressable
      accessibilityLabel={entry.accessibilityLabel}
      accessibilityRole="button"
      onPress={entry.onPress}
      style={({ pressed }) => [styles.profileLink, pressed && styles.pressed]}
    >
      <View style={[styles.collectionAccent, { backgroundColor: entry.accent }]} />
      <Image resizeMode="contain" source={entry.asset} style={styles.collectionArtwork} />
      <View style={styles.profileLinkCopy}>
        <Text style={[styles.profileLinkLabel, { color: entry.accent }]}>{entry.label}</Text>
        <Text numberOfLines={1} style={styles.profileLinkMeta}>{entry.meta}</Text>
      </View>
      <ChevronRight color={colors.text} size={22} strokeWidth={2.2} />
    </Pressable>
  );
}

function recapMetric(recap: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!recap) return 0;
  for (const key of keys) {
    if (recap[key] != null) return Math.max(0, Math.trunc(toNumber(recap[key])));
  }
  return 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

const styles = StyleSheet.create({
  sections: {
    marginHorizontal: spacing.md,
    gap: spacing.md,
  },
  rankPressable: {
    width: '100%',
    borderRadius: radius.lg,
  },
  rankCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 220,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#A45823',
  },
  rankAtmosphere: {
    position: 'absolute',
    top: -54,
    left: -24,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(177,74,14,.16)',
    boxShadow: '0 0 44px rgba(185,75,14,.24)',
  },
  rankTopRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rankCardLabel: {
    ...typography.control,
    color: '#D99155',
    letterSpacing: 0.55,
  },
  inlineAction: {
    minHeight: 32,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  inlineActionText: {
    ...typography.control,
    color: colors.volt,
  },
  rankContent: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rankCopy: {
    flex: 1,
    minWidth: 0,
  },
  rankEyebrow: {
    ...typography.control,
    color: '#D99155',
    letterSpacing: 0.6,
  },
  rankName: {
    ...typography.displayLarge,
    marginTop: 2,
  },
  rankSeason: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  xpValueRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  xpValueCurrent: {
    ...typography.metricSmall,
    color: '#32D5E4',
  },
  xpValueGoal: {
    ...typography.control,
    color: colors.textSecondary,
  },
  xpRailRow: {
    minHeight: 42,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  xpTrack: {
    height: 10,
    flex: 1,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: '#121A21',
    borderWidth: 1,
    borderColor: '#2B3741',
  },
  xpTrackFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  nextGrade: {
    width: 64,
    flexShrink: 0,
    alignItems: 'center',
  },
  nextGradeLabel: {
    ...typography.label,
    marginTop: -2,
    color: colors.textSecondary,
  },
  statsCard: {
    minHeight: 160,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#080D11',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  statsTitle: {
    ...typography.control,
    color: colors.text,
    letterSpacing: 0.55,
  },
  statsRow: {
    minHeight: 104,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statMetric: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statMetricSeparated: {
    borderLeftWidth: 1,
    borderLeftColor: colors.borderSubtle,
  },
  statValue: {
    ...typography.metric,
    marginTop: 8,
    color: colors.text,
  },
  statLabel: {
    ...typography.label,
    minHeight: 30,
    marginTop: 3,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  collectionSection: {
    gap: spacing.sm,
  },
  collectionHeading: {
    minHeight: 40,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  collectionTitle: {
    ...typography.cardTitle,
    color: colors.text,
  },
  profileLinks: {
    gap: 0,
  },
  profileLink: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 96,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#090E12',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  collectionAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
  },
  collectionArtwork: {
    width: 76,
    height: 76,
    flexShrink: 0,
  },
  profileLinkCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileLinkLabel: {
    ...typography.cardTitle,
    letterSpacing: 0.2,
  },
  profileLinkMeta: {
    ...typography.cardTitle,
    marginTop: 3,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.76,
  },
});
