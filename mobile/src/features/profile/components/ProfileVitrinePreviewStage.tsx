import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';

import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { RankEmblem } from '@/src/features/ranking/components/RankEmblem';
import { isZeroRank } from '@/src/features/ranking/grades';
import { colors, radius, spacing, typography } from '@/src/theme';
import { teamHue } from '@/src/utils/teams';

import AchievementBadgeArtwork from '../achievementBadges/components/AchievementBadgeArtwork';
import type { ProfileData } from '../types';

type Props = {
  data: ProfileData | null;
  loading: boolean;
  rankAccent: string;
  rankLabel: string;
};

const JERSEY_ASSET = require('../../../../assets/showcase/showcase-jersey-base-v1.png');
const PEDESTAL_ASSET = require('../../../../assets/rank/rank-tier-pedestal-v1.png');

export default function ProfileVitrinePreviewStage({
  data,
  loading,
  rankAccent,
  rankLabel,
}: Props) {
  const badge = data?.pinnedBadges.find((item) => item.obtained)
    ?? data?.badges.find((item) => item.obtained)
    ?? null;
  const team = data?.favoriteTeam ?? null;
  const teamAccent = team ? `hsl(${teamHue(team.tag, team.nom)}, 72%, 58%)` : colors.textMuted;
  const starting = Boolean(!loading && data && isZeroRank(data.ranking.frags));
  const description = loading
    ? 'Aperçu de la Vitrine en cours de chargement'
    : `Aperçu Vitrine de ${data?.pseudo ?? 'Supporter'}. Badge ${badge?.name ?? 'à débloquer'}, rang ${rankLabel}, équipe ${team?.nom ?? 'à choisir'}.`;

  return (
    <View accessible accessibilityLabel={description} style={styles.stage} testID="profile-vitrine-stage">
      <LinearGradient
        colors={['#071118', '#0A0E13', '#080B0F']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.rankWash, { backgroundColor: rankAccent }]} />
      <View style={[styles.teamWash, { backgroundColor: teamAccent }]} />
      <View style={styles.horizon} />

      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.artifacts}>
        <ArtifactSlot label="BADGE" testID="profile-vitrine-artifact-badge">
          {badge ? (
            <AchievementBadgeArtwork badge={badge} showStand={false} size={60} />
          ) : (
            <ArtifactPlaceholder mark="◆" />
          )}
          <Text numberOfLines={1} style={styles.artifactName}>{loading ? '—' : badge?.name ?? 'À DÉBLOQUER'}</Text>
        </ArtifactSlot>

        <ArtifactSlot center label="RANG" testID="profile-vitrine-artifact-rank">
          {loading ? (
            <View style={[styles.rankPlaceholder, { borderColor: rankAccent }]} />
          ) : (
            <RankEmblem decorative grade={data?.ranking.grade} size={78} starting={starting} />
          )}
          <Image resizeMode="contain" source={PEDESTAL_ASSET} style={styles.pedestal} />
          <Text numberOfLines={1} style={[styles.artifactName, { color: rankAccent }]}>{loading ? '—' : rankLabel}</Text>
        </ArtifactSlot>

        <ArtifactSlot label="ÉQUIPE" testID="profile-vitrine-artifact-team">
          {team ? (
            <View style={styles.jersey}>
              <Image resizeMode="contain" source={JERSEY_ASSET} style={styles.jerseyImage} />
              <View style={styles.teamLogo}>
                <TeamLogo
                  accent={teamAccent}
                  contentScale={0.92}
                  frameless
                  name={team.nom}
                  size={25}
                  tag={team.tag}
                  uri={team.logo}
                />
              </View>
            </View>
          ) : (
            <ArtifactPlaceholder mark="⌁" />
          )}
          <Text numberOfLines={1} style={styles.artifactName}>{loading ? '—' : team?.tag ?? 'À CHOISIR'}</Text>
        </ArtifactSlot>
      </View>
    </View>
  );
}

function ArtifactSlot({
  center = false,
  children,
  label,
  testID,
}: {
  center?: boolean;
  children: React.ReactNode;
  label: string;
  testID: string;
}) {
  return (
    <View style={[styles.slot, center && styles.slotCenter]} testID={testID}>
      <Text style={styles.slotLabel}>{label}</Text>
      <View style={styles.object}>{children}</View>
    </View>
  );
}

function ArtifactPlaceholder({ mark }: { mark: string }) {
  return <View style={styles.placeholder}><Text style={styles.placeholderMark}>{mark}</Text></View>;
}

const styles = StyleSheet.create({
  stage: {
    position: 'relative',
    minHeight: 184,
    marginTop: spacing.md,
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: '#080C10',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rankWash: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '35%',
    width: '30%',
    opacity: 0.06,
  },
  teamWash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '34%',
    opacity: 0.05,
  },
  horizon: {
    position: 'absolute',
    right: 0,
    bottom: 42,
    left: 0,
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  artifacts: {
    flex: 1,
    minHeight: 184,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  slot: {
    flex: 1,
    minWidth: 0,
    height: 164,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  slotCenter: {
    flex: 1.16,
  },
  slotLabel: {
    ...typography.metadata,
    marginBottom: 'auto',
    color: colors.textMuted,
    letterSpacing: 0.7,
  },
  object: {
    width: '100%',
    minHeight: 126,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  artifactName: {
    ...typography.metadata,
    maxWidth: '92%',
    marginTop: 1,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pedestal: {
    width: 88,
    height: 36,
    marginTop: -25,
  },
  rankPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    opacity: 0.42,
  },
  jersey: {
    position: 'relative',
    width: 70,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jerseyImage: {
    width: 70,
    height: 92,
  },
  teamLogo: {
    position: 'absolute',
    top: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 58,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  placeholderMark: {
    color: colors.textMuted,
    fontSize: 22,
  },
});
