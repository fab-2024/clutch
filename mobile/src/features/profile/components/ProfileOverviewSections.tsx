import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Layers2 from 'lucide-react-native/icons/layers-2';
import ShoppingBag from 'lucide-react-native/icons/shopping-bag';
import Sparkles from 'lucide-react-native/icons/sparkles';
import UsersRound from 'lucide-react-native/icons/users-round';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { GriffProgress } from '@/src/components/ui/GriffProgress';
import { Surface } from '@/src/components/ui/Surface';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import LevelFrame from '@/src/features/profile/levelFrames/components/LevelFrame';
import { LEVEL_FRAME_CATALOG } from '@/src/features/profile/levelFrames/catalog';
import type { LevelFrameVariant } from '@/src/features/profile/levelFrames/types';
import { RankEmblem } from '@/src/features/ranking/components/RankEmblem';
import { isZeroRank } from '@/src/features/ranking/grades';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import { colors, radius, spacing, typography } from '@/src/theme';
import { teamHue } from '@/src/utils/teams';

import type { ProfileData } from '../types';
import { ProfileRelicThumbnail } from './ProfileShowcaseCard';
import ShowcasePhysicalObject from './showcase/ShowcasePhysicalObject';

type ProfileOverviewSectionsProps = {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  levelFrameVariant: LevelFrameVariant;
  loading: boolean;
  onModify: () => void;
  onOpenActivations: () => void;
  onOpenFaction: () => void;
  onOpenLocker: () => void;
  onOpenRank: () => void;
  onOpenShop: () => void;
  pseudo: string;
  rankAccent: string;
  rankLabel: string;
};

export default function ProfileOverviewSections({
  cosmetics,
  data,
  levelFrameVariant,
  loading,
  onModify,
  onOpenActivations,
  onOpenFaction,
  onOpenLocker,
  onOpenRank,
  onOpenShop,
  pseudo,
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
      <CollectionSection
        cosmetics={cosmetics}
        data={data}
        levelFrameVariant={levelFrameVariant}
        loading={loading}
        onOpenLocker={onOpenLocker}
        onOpenShop={onOpenShop}
        pseudo={pseudo}
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
  const starting = !loading && isZeroRank(frags);
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
            <Text style={styles.sectionLabel}>PROGRESSION</Text>
            <View style={styles.inlineAction}>
              <Text style={styles.inlineActionText}>VOIR LE CLASSEMENT</Text>
              <ChevronRight color={colors.volt} size={18} strokeWidth={2.2} />
            </View>
          </View>

          <View style={styles.progressIdentity}>
            <RankEmblem grade={data?.ranking.grade} size={60} starting={starting} />
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

function CollectionSection({
  cosmetics,
  data,
  levelFrameVariant,
  loading,
  onOpenLocker,
  onOpenShop,
  pseudo,
}: {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  levelFrameVariant: LevelFrameVariant;
  loading: boolean;
  onOpenLocker: () => void;
  onOpenShop: () => void;
  pseudo: string;
}) {
  const equippedCount = signatureEquippedCount(cosmetics);
  const unlockedCount = loading ? 0 : (data?.badges ?? []).filter((badge) => badge.obtained).length;
  const exposedCount = loading ? 0 : data?.pinnedBadges.filter((badge) => badge.obtained).length ?? 0;
  const frameName = cosmetics?.frame?.name ?? 'Origine';
  const titleName = cosmetics?.title?.name ?? 'Origine';
  const bannerName = cosmetics?.profileCard?.name ?? 'Origine';
  const relicName = cosmetics?.factionEffect?.name ?? 'Origine';
  const levelFrameName = LEVEL_FRAME_CATALOG[levelFrameVariant].name;

  return (
    <View style={[styles.section, styles.collectionSection]} testID="profile-section-collection">
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionLabel}>COLLECTION</Text>
            <Text style={styles.sectionTitle}>{loading ? 'SYNCHRONISATION' : `${equippedCount} ÉQUIPÉ${equippedCount === 1 ? '' : 'S'}`}</Text>
          </View>
          <Text style={styles.sectionMeta}>{loading ? '—' : `${exposedCount} EXPOSÉS · ${unlockedCount} DÉBLOQUÉS`}</Text>
        </View>

        <View style={styles.artifacts}>
          <CollectionArtifact accessibilityLabel={`Cadre de niveau, ${levelFrameName}`}>
            <LevelFrame level={data?.level.level ?? 0} size={42} variant={levelFrameVariant} />
          </CollectionArtifact>
          <CollectionArtifact
            accessibilityLabel={`Cadre d’avatar, ${loading ? 'chargement' : cosmetics?.frame ? frameName : 'emplacement vide'}`}
            empty={!loading && !cosmetics?.frame}
          >
            {loading || cosmetics?.frame ? (
              <ShowcasePhysicalObject
                compact
                model={{ accent: cosmetics?.frame?.accent ?? colors.textMuted, id: cosmetics?.frame?.id ?? 'frame-loading', kind: 'frame', name: loading ? 'Chargement' : frameName || pseudo }}
                size={34}
              />
            ) : <Text style={styles.emptyArtifact}>—</Text>}
          </CollectionArtifact>
          <CollectionArtifact
            accessibilityLabel={`Titre, ${loading ? 'chargement' : cosmetics?.title ? titleName : 'emplacement vide'}`}
            empty={!loading && !cosmetics?.title}
          >
            {loading || cosmetics?.title ? (
              <ShowcasePhysicalObject
                compact
                model={{ accent: cosmetics?.title?.accent ?? colors.textMuted, id: cosmetics?.title?.id ?? 'title-loading', kind: 'title', name: loading ? 'Chargement' : titleName }}
                size={36}
              />
            ) : <Text style={styles.emptyArtifact}>—</Text>}
          </CollectionArtifact>
          <CollectionArtifact
            accessibilityLabel={`Bannière de profil, ${loading ? 'chargement' : cosmetics?.profileCard ? bannerName : 'emplacement vide'}`}
            empty={!loading && !cosmetics?.profileCard}
          >
            {loading || cosmetics?.profileCard ? (
              <ShowcasePhysicalObject
                compact
                model={{ accent: cosmetics?.profileCard?.accent ?? colors.textMuted, id: cosmetics?.profileCard?.id ?? 'banner-loading', kind: 'banner', name: loading ? 'Chargement' : bannerName }}
                size={34}
              />
            ) : <Text style={styles.emptyArtifact}>—</Text>}
          </CollectionArtifact>
          <CollectionArtifact
            accessibilityLabel={`Relique, ${loading ? 'chargement' : cosmetics?.factionEffect ? relicName : 'emplacement vide'}`}
            empty={!loading && !cosmetics?.factionEffect}
          >
            {loading || cosmetics?.factionEffect ? (
              <ProfileRelicThumbnail
                accent={cosmetics?.factionEffect?.accent ?? colors.frag}
                compact
                level={data?.favoriteTeam?.relique_niveau ?? 1}
                name={relicName}
                size={38}
              />
            ) : <Text style={styles.emptyArtifact}>—</Text>}
          </CollectionArtifact>
        </View>

        <View style={styles.collectionActions}>
          <View style={styles.collectionAction}>
            <Button
              accessibilityLabel="Ouvrir mes objets dans le Locker"
              disabled={loading}
              fullWidth
              label="GÉRER"
              leading={<Layers2 color={colors.text} size={17} strokeWidth={2.1} />}
              onPress={onOpenLocker}
              size="compact"
              variant="secondary"
            />
          </View>
          <View style={styles.collectionAction}>
            <Button
              accessibilityLabel="Ouvrir le catalogue de la Boutique"
              disabled={loading}
              fullWidth
              label="ATELIER"
              leading={<ShoppingBag color={colors.text} size={17} strokeWidth={2.1} />}
              onPress={onOpenShop}
              size="compact"
              variant="ghost"
            />
          </View>
        </View>
    </View>
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

function CollectionArtifact({
  accessibilityLabel,
  children,
  empty = false,
}: {
  accessibilityLabel: string;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={[styles.artifact, empty && styles.artifactEmpty]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {children}
      </View>
    </View>
  );
}

export function signatureEquippedCount(cosmetics?: EquippedCosmetics | null) {
  if (!cosmetics) return 1;
  return 1 + [cosmetics.frame, cosmetics.title, cosmetics.profileCard, cosmetics.factionEffect].filter(Boolean).length;
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
  sectionMeta: {
    ...typography.metadata,
    flexShrink: 1,
    color: colors.textSecondary,
    textAlign: 'right',
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
  artifacts: {
    minHeight: 66,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  artifact: {
    flex: 1,
    minWidth: 0,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  artifactEmpty: {
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  emptyArtifact: {
    ...typography.cardTitle,
    color: colors.textDisabled,
  },
  collectionActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  collectionAction: {
    flex: 1,
    minWidth: 0,
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
