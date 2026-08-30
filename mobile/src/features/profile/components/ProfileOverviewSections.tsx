import Award from 'lucide-react-native/icons/award';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Shirt from 'lucide-react-native/icons/shirt';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Trophy from 'lucide-react-native/icons/trophy';
import UsersRound from 'lucide-react-native/icons/users-round';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { GriffProgress } from '@/src/components/ui/GriffProgress';
import { Surface } from '@/src/components/ui/Surface';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { RankEmblem } from '@/src/features/ranking/components/RankEmblem';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import { colors, radius, spacing, typography } from '@/src/theme';
import { teamHue } from '@/src/utils/teams';

import type { ProfileData } from '../types';
import { adaptShowcaseRingStats, resolveAllShowcaseRings } from '../showcaseRings/progression';

type ProfileOverviewSectionsProps = {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  loading: boolean;
  onModify: () => void;
  onOpenActivations: () => void;
  onOpenBadges: () => void;
  onOpenFaction: () => void;
  onOpenJerseys: () => void;
  onOpenRank: () => void;
  onOpenTrophies: () => void;
  rankAccent: string;
  rankLabel: string;
};

export default function ProfileOverviewSections({
  cosmetics,
  data,
  loading,
  onModify,
  onOpenActivations,
  onOpenBadges,
  onOpenFaction,
  onOpenJerseys,
  onOpenRank,
  onOpenTrophies,
  rankAccent,
  rankLabel,
}: ProfileOverviewSectionsProps) {
  return (
    <View style={styles.sections}>
      <ProgressSection
        data={data}
        loading={loading}
        onPress={onOpenRank}
        rankAccent={rankAccent}
        rankLabel={rankLabel}
      />
      <ProfileCollectionSection
        cosmetics={cosmetics}
        data={data}
        loading={loading}
        onOpenBadges={onOpenBadges}
        onOpenJerseys={onOpenJerseys}
        onOpenTrophies={onOpenTrophies}
      />
      <SocialSection
        data={data}
        loading={loading}
        onModify={onModify}
        onOpenActivations={onOpenActivations}
        onOpenFaction={onOpenFaction}
      />
    </View>
  );
}

function ProgressSection({
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
  const level = data?.level.level ?? 0;
  const xp = data?.level.xp ?? 0;
  const remaining = data?.level.remaining ?? 0;
  const progress = Math.max(0, Math.min(1, data?.level.progress ?? 0));
  const progressValue = Math.round(progress * 100);
  const frags = data?.ranking.frags ?? 0;
  const levelLabel = loading ? 'NIVEAU —' : `NIVEAU ${level} · ${formatNumber(xp)} XP`;
  const description = loading
    ? 'Progression en cours de synchronisation'
    : `Rang ${rankLabel}, ${formatNumber(frags)} Frags, niveau ${level}, ${formatNumber(remaining)} XP avant le niveau suivant`;

  return (
    <Pressable
      accessibilityHint="Ouvre le classement et le prochain palier"
      accessibilityLabel={description}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.sectionPressable, pressed && styles.pressed]}
      testID="profile-section-progression"
    >
      <Surface border="subtle" padding="md" radius="lg" tone="low">
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionLabel}>RANKED</Text>
            <View style={styles.inlineAction}>
              <Text style={styles.inlineActionText}>VOIR LE CLASSEMENT</Text>
              <ChevronRight color={colors.volt} size={18} strokeWidth={2.2} />
            </View>
          </View>

          <View style={styles.progressIdentity}>
            <RankEmblem grade={data?.ranking.grade} size={60} />
            <View style={styles.rankCopy}>
              <Text numberOfLines={1} style={[styles.rankName, { color: rankAccent }]}>
                {loading ? 'SYNCHRO' : rankLabel}
              </Text>
              <Text style={styles.rankSeason}>{data?.ranking.saison_nom?.toUpperCase() || 'SAISON ACTIVE'}</Text>
            </View>
            <View style={styles.fragsMetric}>
              <Text style={styles.fragsValue}>{loading ? '—' : formatNumber(frags)}</Text>
              <View style={styles.fragsLabelRow}>
                <CurrencyIcon kind="frags" size={12} />
                <Text style={styles.fragsLabel}>FRAGS</Text>
              </View>
            </View>
          </View>

          <View style={styles.levelTop}>
            <Text style={styles.levelLabel}>{levelLabel}</Text>
            <Text style={styles.levelRemaining}>{loading ? 'SYNCHRO…' : `${formatNumber(remaining)} XP RESTANTS`}</Text>
          </View>
          <GriffProgress
            accessibilityLabel={`Progression du niveau ${level}`}
            max={100}
            value={loading ? 0 : progressValue}
          />
        </View>
      </Surface>
    </Pressable>
  );
}

function ProfileCollectionSection({
  cosmetics,
  data,
  loading,
  onOpenBadges,
  onOpenJerseys,
  onOpenTrophies,
}: {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  loading: boolean;
  onOpenBadges: () => void;
  onOpenJerseys: () => void;
  onOpenTrophies: () => void;
}) {
  const unlockedBadges = loading ? 0 : (data?.badges ?? []).filter((badge) => badge.obtained).length;
  const trophyProgressions = resolveAllShowcaseRings(adaptShowcaseRingStats(data));
  const unlockedTrophies = loading ? 0 : trophyProgressions.filter((progress) => progress.current).length;
  const jersey = cosmetics?.showcase.jersey;

  return (
    <View style={[styles.section, styles.collectionSection]} testID="profile-section-collection">
      <View style={styles.collectionHeading}>
        <Text style={styles.sectionLabel}>PALMARÈS & COLLECTION</Text>
        <Text style={styles.sectionTitle}>TON PROFIL, EN TROIS ESPACES.</Text>
      </View>

      <View style={styles.profileLinks}>
        <ProfileCollectionLink
          accessibilityLabel={`Ouvrir mes badges, ${loading ? 'synchronisation' : `${unlockedBadges} débloqués`}`}
          accent={colors.info}
          icon={Award}
          label="BADGES"
          meta={loading ? 'SYNCHRONISATION' : `${unlockedBadges} DÉBLOQUÉ${unlockedBadges === 1 ? '' : 'S'}`}
          onPress={onOpenBadges}
        />
        <ProfileCollectionLink
          accessibilityLabel={`Ouvrir mes trophées, ${loading ? 'synchronisation' : `${unlockedTrophies} sur ${trophyProgressions.length} débloqués`}`}
          accent="#E2A04D"
          icon={Trophy}
          label="TROPHÉES"
          meta={loading ? 'SYNCHRONISATION' : `${unlockedTrophies}/${trophyProgressions.length} DÉBLOQUÉS`}
          onPress={onOpenTrophies}
        />
        <ProfileCollectionLink
          accessibilityLabel={`Ouvrir mes maillots, ${loading ? 'synchronisation' : jersey?.name || 'aucun maillot équipé'}`}
          accent="#31D7E2"
          icon={Shirt}
          label="MAILLOTS"
          meta={loading ? 'SYNCHRONISATION' : jersey?.name.toUpperCase() || 'AUCUN ÉQUIPÉ'}
          onPress={onOpenJerseys}
        />
      </View>
    </View>
  );
}

function ProfileCollectionLink({
  accessibilityLabel,
  accent,
  icon: Icon,
  label,
  meta,
  onPress,
}: {
  accessibilityLabel: string;
  accent: string;
  icon: LucideIcon;
  label: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.profileLink, pressed && styles.pressed]}
    >
      <View style={[styles.profileLinkIcon, { borderColor: `${accent}55`, backgroundColor: `${accent}12` }]}>
        <Icon color={accent} size={21} strokeWidth={2} />
      </View>
      <View style={styles.profileLinkCopy}>
        <Text style={styles.profileLinkLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.profileLinkMeta}>{meta}</Text>
      </View>
      <ChevronRight color={accent} size={19} strokeWidth={2.2} />
    </Pressable>
  );
}

function SocialSection({
  data,
  loading,
  onModify,
  onOpenActivations,
  onOpenFaction,
}: {
  data: ProfileData | null;
  loading: boolean;
  onModify: () => void;
  onOpenActivations: () => void;
  onOpenFaction: () => void;
}) {
  const team = data?.favoriteTeam;
  const accent = team ? `hsl(${teamHue(team.tag, team.nom)}, 72%, 58%)` : colors.textMuted;
  const supporterLabel = team ? `${formatNumber(team.supporters)} supporter${team.supporters === 1 ? '' : 's'}` : '';
  const factionLabel = loading
    ? 'Faction en cours de synchronisation'
    : team
      ? `Ouvrir ma faction ${team.nom}, relique forme ${roman(team.relique_niveau)}, ${supporterLabel}`
      : 'Choisir mon équipe favorite et rejoindre une faction';

  return (
    <View style={styles.section} testID="profile-section-social">
      <Surface border="subtle" padding="none" radius="lg" tone="low">
        <Text style={[styles.sectionLabel, styles.socialHeading]}>SOCIAL</Text>
        <Pressable
          accessibilityHint={team ? 'Ouvre la relique et la progression de ta faction' : 'Ouvre les paramètres du profil'}
          accessibilityLabel={factionLabel}
          accessibilityRole="button"
          disabled={loading}
          onPress={team ? onOpenFaction : onModify}
          style={({ pressed }) => [styles.socialRow, pressed && styles.pressed]}
        >
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.socialRowContent}>
            {team ? (
              <TeamLogo accent={accent} name={team.nom} size={48} tag={team.tag} uri={team.logo} />
            ) : (
              <View style={styles.socialIcon}>
                <UsersRound color={colors.textSecondary} size={21} strokeWidth={2} />
              </View>
            )}
            <View style={styles.socialCopy}>
              <Text style={styles.socialEyebrow}>{loading ? 'MA FACTION' : team ? `RELIQUE · FORME ${roman(team.relique_niveau)}` : 'MA FACTION'}</Text>
              <Text numberOfLines={1} style={styles.socialTitle}>{loading ? 'SYNCHRONISATION' : team?.nom || 'CHOISIS TA COULEUR'}</Text>
              <Text numberOfLines={1} style={styles.socialMeta}>{loading ? '—' : team ? supporterLabel : 'Équipe, relique et défis communs'}</Text>
            </View>
            <ChevronRight color={colors.volt} size={20} strokeWidth={2.2} />
          </View>
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          accessibilityHint="Ouvre les événements et récompenses partenaires"
          accessibilityLabel="Ouvrir les activations"
          accessibilityRole="button"
          disabled={loading}
          onPress={onOpenActivations}
          style={({ pressed }) => [styles.activationRow, pressed && styles.pressed]}
        >
          <Sparkles color={colors.frag} size={20} strokeWidth={2.1} />
          <View style={styles.socialCopy}>
            <Text style={styles.activationTitle}>ACTIVATIONS</Text>
            <Text style={styles.socialMeta}>Nova Week et partenaires</Text>
          </View>
          <ChevronRight color={colors.textSecondary} size={20} strokeWidth={2.1} />
        </Pressable>
      </Surface>
    </View>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

function roman(level: number) {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][Math.max(0, Math.min(6, Number(level || 1) - 1))];
}

const styles = StyleSheet.create({
  sections: {
    marginHorizontal: spacing.md,
    gap: spacing.md,
  },
  section: {
    width: '100%',
  },
  collectionSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sectionPressable: {
    width: '100%',
  },
  sectionHeading: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.control,
    color: colors.volt,
    letterSpacing: 0.75,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    marginTop: 2,
    color: colors.text,
  },
  inlineAction: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  inlineActionText: {
    ...typography.control,
    color: colors.volt,
  },
  progressIdentity: {
    minHeight: 70,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rankCopy: {
    flex: 1,
    minWidth: 0,
  },
  rankName: {
    ...typography.displaySmall,
  },
  rankSeason: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.textSecondary,
  },
  fragsMetric: {
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  fragsValue: {
    ...typography.metric,
    color: colors.text,
  },
  fragsLabelRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fragsLabel: {
    ...typography.metadata,
    color: colors.textSecondary,
  },
  levelTop: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  levelLabel: {
    ...typography.control,
    flex: 1,
    color: colors.text,
  },
  levelRemaining: {
    ...typography.metadata,
    flexShrink: 1,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  collectionHeading: {
    minWidth: 0,
  },
  profileLinks: {
    gap: spacing.xs,
  },
  profileLink: {
    minHeight: 70,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  profileLinkIcon: {
    width: 42,
    height: 42,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
  },
  profileLinkCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileLinkLabel: {
    ...typography.control,
    color: colors.text,
    letterSpacing: 0.55,
  },
  profileLinkMeta: {
    ...typography.metadata,
    marginTop: 3,
    color: colors.textSecondary,
  },
  socialHeading: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  socialRow: {
    minHeight: 88,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  socialRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  socialIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  socialCopy: {
    flex: 1,
    minWidth: 0,
  },
  socialEyebrow: {
    ...typography.metadata,
    color: colors.textSecondary,
  },
  socialTitle: {
    ...typography.cardTitle,
    marginTop: 2,
    color: colors.text,
  },
  socialMeta: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.md,
    backgroundColor: colors.borderSubtle,
  },
  activationRow: {
    minHeight: 62,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activationTitle: {
    ...typography.control,
    color: colors.text,
  },
  pressed: {
    opacity: 0.76,
  },
});
