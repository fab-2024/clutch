import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { RankEmblem } from '@/src/features/ranking/components/RankEmblem';
import { isZeroRank } from '@/src/features/ranking/grades';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import ShowcaseAchievementBadge from '@/src/features/profile/achievementBadges/components/ShowcaseAchievementBadge';
import type { PublicAchievementBadge } from '@/src/features/profile/achievementBadges/types';
import ShowcaseRingArtifact from '@/src/features/profile/showcaseRings/components/ShowcaseRingArtifact';
import type { EquippedShowcaseRing } from '@/src/features/profile/showcaseRings/types';
import { colors, fonts, typography } from '@/src/theme';
import { teamHue } from '@/src/utils/teams';

import type { ProfileBadge, ProfileData } from '../../types';
import LockedDisplaySlot from './LockedDisplaySlot';
import ShowcasePhysicalObject, {
  type ShowcasePhysicalObjectKind,
  type ShowcasePhysicalObjectModel,
} from './ShowcasePhysicalObject';
import { SHOWCASE_PALETTE } from './showcasePalette';
import type {
  ShowcaseJerseyPresentation,
  ShowcaseLighting,
  ShowcasePedestalSkin,
  ShowcaseRoomTheme,
  ShowcaseSection,
} from './types';

type ShowcaseRoomSceneProps = {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  equippedBadges?: readonly (PublicAchievementBadge | null)[];
  equippedRing?: EquippedShowcaseRing | null;
  focus?: ShowcaseSection;
  jerseyPresentation?: ShowcaseJerseyPresentation;
  lighting?: ShowcaseLighting;
  loading: boolean;
  mode: 'preview' | 'full';
  onRingPress?: () => void;
  pedestal?: ShowcasePedestalSkin;
  rankAccent: string;
  rankLabel: string;
  style?: StyleProp<ViewStyle>;
  theme?: ShowcaseRoomTheme;
};

const ROOM_ASSET = require('../../../../../assets/showcase/showcase-room-empty-v1.png');
const JERSEY_ASSET = require('../../../../../assets/showcase/showcase-jersey-base-v1.png');
const TROPHY_ASSET = require('../../../../../assets/showcase/showcase-trophy-v1.png');
const PEDESTAL_ASSET = require('../../../../../assets/rank/rank-tier-pedestal-v1.png');

const LIGHTING: Record<ShowcaseLighting, { glow: string; wash: readonly [string, string, string] }> = {
  acid: { glow: '#E8FF3D', wash: ['rgba(7,9,1,.03)', 'rgba(114,135,13,.10)', 'rgba(3,5,4,.16)'] },
  cyan: { glow: '#31D7E2', wash: ['rgba(1,8,12,.03)', 'rgba(20,105,138,.09)', 'rgba(1,5,8,.16)'] },
  violet: { glow: '#9A6BFF', wash: ['rgba(5,3,12,.04)', 'rgba(80,43,143,.09)', 'rgba(2,4,8,.17)'] },
  amber: { glow: '#E2B25D', wash: ['rgba(10,6,2,.03)', 'rgba(118,75,24,.09)', 'rgba(3,4,7,.17)'] },
  white: { glow: '#F1F4F4', wash: ['rgba(8,10,12,.02)', 'rgba(196,207,214,.08)', 'rgba(2,4,6,.15)'] },
};

const THEME_WASH: Record<ShowcaseRoomTheme, readonly [string, string, string]> = {
  graphite: ['rgba(5,9,13,.04)', 'rgba(4,8,12,.01)', 'rgba(2,5,8,.12)'],
  steel: ['rgba(138,151,162,.10)', 'rgba(24,29,33,.02)', 'rgba(102,116,127,.10)'],
  museum: ['rgba(55,34,21,.09)', 'rgba(10,10,11,.01)', 'rgba(38,23,14,.11)'],
  carbon: ['rgba(5,7,9,.10)', 'rgba(18,22,25,.01)', 'rgba(1,3,5,.16)'],
  azure: ['rgba(5,27,42,.10)', 'rgba(5,12,18,.01)', 'rgba(3,30,48,.13)'],
};

const PEDESTAL_ACCENT: Record<ShowcasePedestalSkin, string> = {
  obsidian: '#596977',
  bronze: '#C17D4E',
  steel: '#9AAAB7',
};

const TOP_LOCKED_KINDS: readonly ShowcasePhysicalObjectKind[] = ['frame', 'title', 'core', 'banner'];
const MIDDLE_LOCKED_KINDS: readonly ShowcasePhysicalObjectKind[] = ['badge', 'core', 'badge', 'frame'];
const BOTTOM_LOCKED_KINDS: readonly ShowcasePhysicalObjectKind[] = ['banner', 'core', 'frame'];

const METRICS = {
  preview: {
    badgeSize: 17,
    jerseyHeight: 91,
    jerseyLogo: 14,
    pedestalHeight: 50,
    pedestalWidth: 100,
    rankSize: 64,
    ringSize: 48,
    tokenSize: 18,
    trophyHeight: 44,
    trophyWidth: 30,
  },
  full: {
    badgeSize: 52,
    jerseyHeight: 164,
    jerseyLogo: 28,
    pedestalHeight: 70,
    pedestalWidth: 144,
    rankSize: 98,
    ringSize: 88,
    tokenSize: 42,
    trophyHeight: 82,
    trophyWidth: 56,
  },
} as const;

export default function ShowcaseRoomScene({
  cosmetics,
  data,
  equippedBadges,
  equippedRing,
  focus = 'showcase',
  jerseyPresentation = 'locker',
  lighting = 'cyan',
  loading,
  mode,
  onRingPress,
  pedestal = 'obsidian',
  rankAccent,
  rankLabel,
  style,
  theme = 'graphite',
}: ShowcaseRoomSceneProps) {
  const compact = mode === 'preview';
  const metrics = METRICS[mode];
  const level = data?.level.level ?? 0;
  const badgeSlots = resolveBadgeSlots(loading, equippedBadges, data?.pinnedBadges);
  const visibleBadges = badgeSlots.filter((badge) => Boolean(badge?.obtained));
  const trophies = loading ? [] : (data?.badges ?? []).filter((badge) => badge.obtained);
  const starting = !loading && isZeroRank(data?.ranking.frags);
  const team = data?.favoriteTeam;
  const teamAccent = team ? `hsl(${teamHue(team.tag, team.nom)}, 72%, 58%)` : '#71808B';
  const light = LIGHTING[lighting];
  const pedestalAccent = PEDESTAL_ACCENT[pedestal];
  const tokens = cosmeticTokens(cosmetics);
  const topTokens = tokens.slice(0, 3);
  const bottomTokens = tokens.slice(3, 5);
  const visibleTrophies = trophies.slice(0, compact ? 2 : 4);

  const leftOpacity = sectionOpacity(focus, 'left');
  const centerOpacity = sectionOpacity(focus, 'center');
  const rightOpacity = sectionOpacity(focus, 'right');
  const description = loading
    ? 'Showroom en cours d’installation'
    : `Showroom de ${data?.pseudo ?? 'Supporter'}, rang ${rankLabel}, ${visibleBadges.length} badges visibles et ${trophies.length} trophées${equippedRing ? `, anneau ${equippedRing.familyName} ${equippedRing.name}` : ''}`;

  return (
    <View
      accessible={!onRingPress}
      accessibilityLabel={description}
      style={[styles.viewport, compact ? styles.viewportPreview : styles.viewportFull, style]}
      testID={`showcase-room-${mode}`}
    >
      <View style={styles.room}>
        <Image resizeMode="stretch" source={ROOM_ASSET} style={styles.roomBackdrop} />
        <LinearGradient colors={THEME_WASH[theme]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={light.wash} end={{ x: 0.5, y: 1 }} pointerEvents="none" start={{ x: 0.5, y: 0 }} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[styles.edgeShade, compact && styles.edgeShadePreview]} />

        <View
          pointerEvents={onRingPress ? 'box-none' : 'none'}
          style={[
            styles.leftCabinet,
            compact && styles.leftCabinetPreview,
            { opacity: leftOpacity },
          ]}
        >
          <ShowcaseShelfRow compact={compact} style={styles.shelfTop}>
            {topTokens.map((token) => (
              <ShowcasePhysicalObject compact={compact} key={token.id} model={token} showName={token.kind === 'title'} size={metrics.tokenSize} />
            ))}
            <LockedSlots
              count={Math.max(0, 4 - topTokens.length)}
              group="top"
              kinds={TOP_LOCKED_KINDS}
              size={metrics.tokenSize}
            />
          </ShowcaseShelfRow>
          <ShowcaseShelfRow compact={compact} style={styles.shelfMiddle}>
            {badgeSlots.map((badge, index) => badge ? (
              <ShowcaseBadge compact={compact} badge={badge} key={`badge-slot-${index}-${badge.key}`} size={metrics.badgeSize} />
            ) : (
              <LockedDisplaySlot
                key={`locked-middle-${index}`}
                kind={MIDDLE_LOCKED_KINDS[index % MIDDLE_LOCKED_KINDS.length]}
                size={metrics.badgeSize}
                testID={`locked-display-middle-${index}`}
              />
            ))}
          </ShowcaseShelfRow>
          <ShowcaseShelfRow compact={compact} style={styles.shelfBottom}>
            {bottomTokens.map((token) => (
              <ShowcasePhysicalObject compact={compact} key={token.id} model={token} showName={token.kind === 'title'} size={metrics.tokenSize} />
            ))}
            {equippedRing ? (
              <ShowcaseRingArtifact
                compact={compact}
                onPress={onRingPress}
                ring={equippedRing}
                size={metrics.ringSize}
              />
            ) : null}
            <LockedSlots
              count={Math.max(0, 3 - bottomTokens.length - Number(Boolean(equippedRing)))}
              group="bottom"
              kinds={BOTTOM_LOCKED_KINDS}
              size={metrics.tokenSize}
            />
          </ShowcaseShelfRow>
        </View>

        <View
          pointerEvents="none"
          style={[
            styles.rankStage,
            compact && styles.rankStagePreview,
            { opacity: centerOpacity },
          ]}
        >
          <View style={[styles.rankBeam, { backgroundColor: light.glow }]} />
          {!loading ? <View style={[styles.rankHalo, { borderColor: rankAccent }]} /> : null}
          {loading ? (
            <View style={[styles.rankPlaceholder, { height: metrics.rankSize * 0.72, width: metrics.rankSize * 0.72 }]} />
          ) : (
            <View style={styles.rankObject} testID="rank-emblem-artifact">
              <RankEmblem grade={data?.ranking.grade} size={metrics.rankSize} starting={starting} />
            </View>
          )}
          <Image
            resizeMode="contain"
            source={PEDESTAL_ASSET}
            style={{ height: metrics.pedestalHeight, marginTop: compact ? -22 : -30, width: metrics.pedestalWidth }}
          />
          <View style={[styles.rankPlate, compact && styles.rankPlatePreview, { borderColor: pedestalAccent }]}>
            <Text style={[styles.rankLevel, compact && styles.rankLevelPreview]}>NIVEAU {loading ? '—' : level}</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.rankName, compact && styles.rankNamePreview, { color: rankAccent }]}>{loading ? '—' : rankLabel}</Text>
          </View>
        </View>

        <View
          pointerEvents="none"
          style={[
            styles.rightCabinet,
            compact && styles.rightCabinetPreview,
            { opacity: rightOpacity },
          ]}
        >
          <View
            accessible
            accessibilityLabel={team ? `Maillot de ${team.nom}` : 'Emplacement de maillot vide'}
            style={[
              styles.jerseyStage,
              compact && styles.jerseyStagePreview,
              jerseyPresentation === 'gallery' && styles.jerseyStageGallery,
              jerseyPresentation === 'podium' && styles.jerseyStagePodium,
            ]}
          >
            {team ? (
              <>
                {jerseyPresentation === 'gallery' ? <View style={[styles.jerseyGalleryFrame, compact && styles.jerseyGalleryFramePreview]} /> : null}
                {jerseyPresentation === 'podium' ? <View style={[styles.jerseyPodiumBase, compact && styles.jerseyPodiumBasePreview]} /> : null}
                <Image
                  resizeMode="contain"
                  source={JERSEY_ASSET}
                  style={[
                    { height: metrics.jerseyHeight, width: metrics.jerseyHeight * 0.76 },
                    jerseyPresentation === 'gallery' && styles.jerseyImageGallery,
                    jerseyPresentation === 'podium' && styles.jerseyImagePodium,
                  ]}
                />
                <View style={[
                  styles.jerseyLogo,
                  compact && styles.jerseyLogoPreview,
                  jerseyPresentation === 'gallery' && styles.jerseyLogoGallery,
                  jerseyPresentation === 'podium' && styles.jerseyLogoPodium,
                ]}>
                  <TeamLogo
                    accent={teamAccent}
                    contentScale={0.92}
                    frameless
                    name={team.nom}
                    size={metrics.jerseyLogo}
                    tag={team.tag}
                    uri={team.logo}
                  />
                </View>
              </>
            ) : (
              <View style={[styles.emptyJersey, compact && styles.emptyJerseyPreview]}>
                <View style={styles.emptyHangerHook} />
                <View style={styles.emptyHangerShoulder} />
                <View style={styles.emptyHangerLeft} />
                <View style={styles.emptyHangerRight} />
              </View>
            )}
          </View>

          <View style={[styles.trophyShelf, compact && styles.trophyShelfPreview]}>
            {visibleTrophies.map((badge) => (
              <View accessible accessibilityLabel={`Trophée ${badge.name}`} key={badge.key} style={styles.trophySlot}>
                <Image resizeMode="contain" source={TROPHY_ASSET} style={{ height: metrics.trophyHeight, width: metrics.trophyWidth }} />
                <View style={[styles.trophyAccent, { backgroundColor: badgeAccent(badge) }]} />
              </View>
            ))}
            {Array.from({ length: Math.max(0, (compact ? 2 : 4) - visibleTrophies.length) }, (_, index) => (
              <LockedTrophySlot
                height={metrics.trophyHeight}
                key={`locked-trophy-${index}`}
                testID={`locked-trophy-${index}`}
                width={metrics.trophyWidth}
              />
            ))}
          </View>
        </View>

        {!compact && focus === 'season' ? (
          <View pointerEvents="none" style={styles.seasonPlaque}>
            <Text style={styles.seasonEyebrow}>SAISON ACTIVE</Text>
            <Text numberOfLines={1} style={styles.seasonName}>{data?.ranking.saison_nom?.toUpperCase() ?? 'AUCUNE SAISON'}</Text>
          </View>
        ) : null}

      </View>
    </View>
  );
}

function ShowcaseShelfRow({ children, compact, style }: { children: ReactNode; compact: boolean; style: StyleProp<ViewStyle> }) {
  return <View style={[styles.shelfRow, compact && styles.shelfRowPreview, style]}>{children}</View>;
}

function LockedSlots({
  count,
  group,
  kinds,
  size,
}: {
  count: number;
  group: string;
  kinds: readonly ShowcasePhysicalObjectKind[];
  size: number;
}) {
  return Array.from({ length: count }, (_, index) => (
    <LockedDisplaySlot
      key={`locked-${group}-${index}`}
      kind={kinds[index % kinds.length]}
      size={size}
      testID={`locked-display-${group}-${index}`}
    />
  ));
}

function LockedTrophySlot({ height, testID, width }: { height: number; testID: string; width: number }) {
  return (
    <View
      accessibilityElementsHidden
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.trophySlot}
      testID={testID}
    >
      <Image
        resizeMode="contain"
        source={TROPHY_ASSET}
        style={{ height, opacity: 0.22, tintColor: SHOWCASE_PALETTE.lockedSteel, width }}
      />
    </View>
  );
}

function ShowcaseBadge({ badge, compact, size }: { badge: ProfileBadge; compact: boolean; size: number }) {
  return <ShowcaseAchievementBadge badge={badge} compact={compact} size={size} />;
}

function resolveBadgeSlots(
  loading: boolean,
  equippedBadges?: readonly (PublicAchievementBadge | null)[],
  fallback: readonly ProfileBadge[] = [],
) {
  if (loading) return [null, null, null, null] as const;
  const source = equippedBadges ?? fallback.filter((badge) => badge.obtained);
  return Array.from({ length: 4 }, (_, index) => {
    const badge = source[index];
    return badge?.obtained ? badge : null;
  });
}

function cosmeticTokens(cosmetics?: EquippedCosmetics | null): ShowcasePhysicalObjectModel[] {
  const items: (ShowcasePhysicalObjectModel | null)[] = [
    cosmetics?.frame ? { accent: cosmetics.frame.accent, id: cosmetics.frame.id, kind: 'frame', name: cosmetics.frame.name } : null,
    cosmetics?.title ? { accent: cosmetics.title.accent, id: cosmetics.title.id, kind: 'title', name: cosmetics.title.name } : null,
    cosmetics?.core ? { accent: cosmetics.core.accent, id: cosmetics.core.id, kind: 'core', name: cosmetics.core.name } : null,
    cosmetics?.profileCard ? { accent: cosmetics.profileCard.accent, id: cosmetics.profileCard.id, kind: 'banner', name: cosmetics.profileCard.name } : null,
  ];
  return items.filter((item): item is ShowcasePhysicalObjectModel => Boolean(item));
}

function sectionOpacity(focus: ShowcaseSection, target: 'left' | 'center' | 'right') {
  if (focus === 'showcase') return 1;
  if (focus === 'collection') return target === 'left' ? 1 : 0.42;
  if (focus === 'rank') return target === 'center' ? 1 : 0.4;
  if (focus === 'trophies') return target === 'right' ? 1 : 0.4;
  return target === 'right' ? 0.58 : 1;
}

function badgeAccent(badge: ProfileBadge) {
  if (badge.rarity === 'legendary') return '#FFB84D';
  if (badge.rarity === 'secret') return '#D1D7DC';
  if (badge.rarity === 'epic') return '#A982FF';
  if (badge.rarity === 'rare') return '#63B8FF';
  return '#AAB4BE';
}

function alpha(color: string, opacity: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${opacity}` : color;
}

const styles = StyleSheet.create({
  viewport: { position: 'relative', overflow: 'hidden', width: '100%', backgroundColor: SHOWCASE_PALETTE.graphiteDeep, borderWidth: 1, borderColor: '#202B33' },
  viewportPreview: { aspectRatio: 1.84, borderRadius: 12 },
  viewportFull: { flex: 1, minHeight: 0, borderWidth: 0, borderRadius: 0 },
  room: { flex: 1, position: 'relative', overflow: 'hidden' },
  roomBackdrop: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.98 },
  edgeShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderWidth: 18, borderColor: 'rgba(2,4,7,.26)' },
  edgeShadePreview: { borderWidth: 7 },
  leftCabinet: { position: 'absolute', left: '5.2%', top: '10%', width: '22%', height: '73%' },
  leftCabinetPreview: { left: '2.5%', top: '10%', width: '28%', height: '74%' },
  rightCabinet: { position: 'absolute', right: '4.5%', top: '9%', width: '23%', height: '74%' },
  rightCabinetPreview: { right: '1.5%', top: '8%', width: '29%', height: '76%' },
  shelfRow: { position: 'absolute', left: '3%', right: '3%', minHeight: 53, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', gap: 2 },
  shelfRowPreview: { minHeight: 27 },
  shelfTop: { top: '8%' },
  shelfMiddle: { top: '38%' },
  shelfBottom: { top: '66%' },
  rankStage: { position: 'absolute', left: '35%', top: '12%', width: '30%', height: '56%', alignItems: 'center', justifyContent: 'flex-end' },
  rankStagePreview: { left: '32%', top: '8%', width: '36%', height: '62%' },
  rankBeam: { position: 'absolute', top: '2%', width: '16%', height: '72%', borderRadius: 90, opacity: 0.028 },
  rankHalo: { position: 'absolute', bottom: '20%', width: '34%', aspectRatio: 1, borderRadius: 999, borderWidth: 1, opacity: 0.055 },
  rankPlaceholder: { borderWidth: 1, borderColor: '#4D5B67', backgroundColor: '#111920', transform: [{ rotate: '45deg' }] },
  rankObject: { alignItems: 'center', justifyContent: 'center' },
  rankPlate: { position: 'absolute', bottom: '-3%', minWidth: 98, minHeight: 31, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,8,11,.92)', borderWidth: 1, borderRadius: 6 },
  rankPlatePreview: { bottom: '-6%', minWidth: 66, minHeight: 22, paddingHorizontal: 5, borderRadius: 4 },
  rankLevel: { ...typography.label, color: colors.volt, fontSize: 7, letterSpacing: 0.35 },
  rankLevelPreview: { fontSize: 4, lineHeight: 5 },
  rankName: { marginTop: 1, maxWidth: 92, color: colors.text, fontFamily: fonts.display, fontSize: 16, lineHeight: 17 },
  rankNamePreview: { maxWidth: 60, fontSize: 10, lineHeight: 11 },
  jerseyStage: { position: 'absolute', left: '1%', top: '0%', width: '57%', height: '76%', alignItems: 'center', justifyContent: 'flex-start' },
  jerseyStagePreview: { left: '1%', top: '2%', width: '56%', height: '74%' },
  jerseyStageGallery: { justifyContent: 'center' },
  jerseyStagePodium: { justifyContent: 'center' },
  jerseyGalleryFrame: { position: 'absolute', top: '4%', right: '7%', bottom: '4%', left: '7%', borderWidth: 2, borderColor: 'rgba(157,170,179,.42)', backgroundColor: 'rgba(4,7,9,.22)', boxShadow: '0 0 8px rgba(185,199,209,.12)' },
  jerseyGalleryFramePreview: { borderWidth: 1 },
  jerseyPodiumBase: { position: 'absolute', right: '16%', bottom: '2%', left: '16%', height: '18%', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(167,116,78,.42)', backgroundColor: '#080B0D', transform: [{ scaleY: 0.44 }] },
  jerseyPodiumBasePreview: { bottom: '4%', height: '16%' },
  jerseyImageGallery: { transform: [{ scale: 0.88 }] },
  jerseyImagePodium: { transform: [{ translateY: 5 }, { scale: 0.91 }] },
  jerseyLogo: { position: 'absolute', top: '32%', left: '50%', marginLeft: -14 },
  jerseyLogoPreview: { top: '32%', marginLeft: -7 },
  jerseyLogoGallery: { top: '36%' },
  jerseyLogoPodium: { top: '39%' },
  emptyJersey: { position: 'relative', width: 72, height: 112, marginTop: 12, alignItems: 'center', justifyContent: 'flex-start', opacity: 0.48 },
  emptyJerseyPreview: { width: 36, height: 58, marginTop: 6 },
  emptyHangerHook: { width: '15%', height: '14%', marginTop: '8%', borderTopWidth: 1, borderRightWidth: 1, borderColor: '#687580', borderTopRightRadius: 999, transform: [{ rotate: '-18deg' }] },
  emptyHangerShoulder: { width: '64%', height: 1, marginTop: '8%', backgroundColor: '#687580' },
  emptyHangerLeft: { position: 'absolute', top: '29%', left: '18%', width: '34%', height: 1, backgroundColor: '#687580', transform: [{ rotate: '-30deg' }] },
  emptyHangerRight: { position: 'absolute', top: '29%', right: '18%', width: '34%', height: 1, backgroundColor: '#687580', transform: [{ rotate: '30deg' }] },
  trophyShelf: { position: 'absolute', right: '1%', top: '12%', width: '43%', height: '67%', flexDirection: 'row', flexWrap: 'wrap', alignContent: 'space-around', justifyContent: 'space-around', gap: 2 },
  trophyShelfPreview: { top: '15%', height: '62%' },
  trophySlot: { position: 'relative', width: '46%', height: '47%', alignItems: 'center', justifyContent: 'flex-end' },
  trophyAccent: { position: 'absolute', bottom: '4%', width: '48%', height: 2, borderRadius: 5, opacity: 0.72 },
  seasonPlaque: { position: 'absolute', top: 9, left: '39%', right: '39%', minHeight: 34, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,8,11,.78)', borderWidth: 1, borderColor: '#3A4752' },
  seasonEyebrow: { ...typography.label, color: '#83909B', fontSize: 6 },
  seasonName: { ...typography.eyebrow, marginTop: 2, color: colors.text, fontSize: 8 },
});
