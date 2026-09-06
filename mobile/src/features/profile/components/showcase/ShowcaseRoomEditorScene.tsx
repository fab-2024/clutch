import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import type { ShowcaseRoomDefinition } from '@/src/features/shop/showcaseRoomCatalog';
import type { ShowcaseRankDisplayDefinition } from '@/src/features/shop/showcaseRankDisplayCatalog';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import { colors, typography } from '@/src/theme';

import type { ProfileTeam } from '../../types';
import ShowcaseAtmosphereLayer from './ShowcaseAtmosphereLayer';
import ShowcasePlaceableArtwork from './ShowcasePlaceableArtwork';
import type {
  ShowcaseAtmospherePerformanceReport,
  ShowcaseAtmosphereQuality,
} from './showcaseAtmosphere';
import {
  SHOWCASE_ROOM_SLOTS,
  showcasePlaceableKindLabel,
  type ShowcasePlaceableKind,
  type ShowcaseRoomAssignments,
  type ShowcaseRoomPedestalPlacements,
  type ShowcaseRoomSlotDefinition,
  type ShowcaseRoomSlotId,
} from './roomEditor';
import { SHOWCASE_LIGHTING_VISUALS } from './showcaseLighting';
import { SHOWCASE_PALETTE } from './showcasePalette';
import {
  resolveShowcaseSlotPerspective,
  showcasePedestalAssetGeometry,
} from './showcaseRoomPerspective';
import { showcaseSceneLayout, type ShowcaseSceneFrame } from './showcaseSceneLayout';
import type { ShowcaseLighting, ShowcaseRoomTheme } from './types';

type ShowcaseRoomEditorSceneProps = {
  assignments: ShowcaseRoomAssignments;
  atmosphereActive?: boolean;
  atmosphereQuality?: ShowcaseAtmosphereQuality;
  cosmetics?: EquippedCosmetics | null;
  favoriteTeam?: ProfileTeam | null;
  lighting: ShowcaseLighting;
  onAtmospherePerformanceReport?: (report: ShowcaseAtmospherePerformanceReport) => void;
  onSlotPress: (slotId: ShowcaseRoomSlotId) => void;
  pedestalPlacements?: ShowcaseRoomPedestalPlacements;
  rankAccent?: string;
  rankDisplay?: Pick<ShowcaseRankDisplayDefinition, 'id' | 'name' | 'overlayImage'> | null;
  rankOrder?: number | null;
  reduceMotion?: boolean;
  room: Pick<ShowcaseRoomDefinition, 'accent' | 'id' | 'image' | 'name'> & {
    sceneFrame?: ShowcaseSceneFrame;
  };
  slots?: readonly ShowcaseRoomSlotDefinition[];
  theme?: ShowcaseRoomTheme;
};

const THEME_WASH: Record<ShowcaseRoomTheme, readonly [string, string, string]> = {
  graphite: ['rgba(5,9,13,.04)', 'rgba(4,8,12,.01)', 'rgba(2,5,8,.12)'],
  steel: ['rgba(138,151,162,.10)', 'rgba(24,29,33,.02)', 'rgba(102,116,127,.10)'],
  museum: ['rgba(55,34,21,.09)', 'rgba(10,10,11,.01)', 'rgba(38,23,14,.11)'],
  carbon: ['rgba(5,7,9,.10)', 'rgba(18,22,25,.01)', 'rgba(1,3,5,.16)'],
  azure: ['rgba(5,27,42,.10)', 'rgba(5,12,18,.01)', 'rgba(3,30,48,.13)'],
};

const PEDESTAL_SOURCE_ASPECT_RATIO = 1.5;

const ARTWORK_BOTTOM_INSET: Partial<Record<ShowcasePlaceableKind, number>> = {
  banner: 0.02,
  core: 0.02,
  jersey: 0.025,
  rank: 0.096,
  ring: 0.03,
  trophy: 0.025,
};

type ShowcaseRoomSlotComposition = {
  artworkLean: number;
  artworkSize: number;
  artworkTranslateY: number;
  artworkYaw: number;
  groundOffset: number;
  pedestalBottomInset: number;
  pedestalHeight: number;
  pedestalWidth: number;
  pedestalYaw: number;
  shadowHeight: number;
  shadowWidth: number;
};

export function resolveShowcaseRoomSlotComposition({
  canvasHeight,
  canvasWidth,
  itemKind,
  pedestalId,
  roomId,
  slot,
}: {
  canvasHeight: number;
  canvasWidth: number;
  itemKind?: ShowcasePlaceableKind;
  pedestalId?: string;
  roomId: string;
  slot: ShowcaseRoomSlotDefinition;
}): ShowcaseRoomSlotComposition {
  const slotWidth = canvasWidth * Number.parseFloat(slot.width) / 100;
  const slotHeight = canvasHeight * Number.parseFloat(slot.height) / 100;
  const artworkSize = Math.max(16, Math.min(slotWidth, slotHeight - 20) * 0.88);
  const artworkLift = canvasHeight * (slot.artworkLift ?? 0) / 100;
  const perspective = resolveShowcaseSlotPerspective(roomId, slot);

  if (!pedestalId) {
    return {
      artworkLean: 0,
      artworkSize,
      artworkTranslateY: -artworkLift,
      artworkYaw: 0,
      groundOffset: 0,
      pedestalBottomInset: 0,
      pedestalHeight: 0,
      pedestalWidth: 0,
      pedestalYaw: 0,
      shadowHeight: 0,
      shadowWidth: 0,
    };
  }

  const geometry = showcasePedestalAssetGeometry(pedestalId);
  const opaquePedestalWidth = canvasWidth * perspective.pedestalWidth / 100;
  const pedestalWidth = opaquePedestalWidth / geometry.opaqueWidthRatio;
  const pedestalHeight = pedestalWidth
    / PEDESTAL_SOURCE_ASPECT_RATIO
    * perspective.pedestalInclination;
  const pedestalBottomInset = pedestalHeight * geometry.bottomInset;
  const groundOffset = canvasHeight * perspective.groundOffset / 100;
  const seatLift = pedestalHeight * (1 - geometry.bottomInset - geometry.seatY);
  const artworkBottomInset = artworkSize * (ARTWORK_BOTTOM_INSET[itemKind ?? 'badge'] ?? 0);

  return {
    artworkLean: perspective.artworkLean,
    artworkSize,
    artworkTranslateY: groundOffset - seatLift + artworkBottomInset,
    artworkYaw: perspective.artworkYaw,
    groundOffset,
    pedestalBottomInset,
    pedestalHeight,
    pedestalWidth,
    pedestalYaw: perspective.pedestalYaw,
    shadowHeight: Math.max(2, pedestalHeight * 0.055),
    shadowWidth: opaquePedestalWidth * 0.84,
  };
}

export default function ShowcaseRoomEditorScene({
  assignments,
  atmosphereActive = true,
  atmosphereQuality = 'auto',
  cosmetics,
  favoriteTeam,
  lighting,
  onAtmospherePerformanceReport,
  onSlotPress,
  pedestalPlacements = {},
  rankAccent = '#B87845',
  rankDisplay,
  rankOrder,
  reduceMotion = false,
  room,
  slots = SHOWCASE_ROOM_SLOTS,
  theme = 'graphite',
}: ShowcaseRoomEditorSceneProps) {
  const [viewport, setViewport] = useState({ height: 390, width: 844 });
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const next = {
      height: Math.max(1, Math.round(event.nativeEvent.layout.height)),
      width: Math.max(1, Math.round(event.nativeEvent.layout.width)),
    };
    setViewport((current) => (
      current.height === next.height && current.width === next.width ? current : next
    ));
  }, []);
  const layout = showcaseSceneLayout(viewport, room.sceneFrame);
  const lightingVisual = SHOWCASE_LIGHTING_VISUALS[lighting];
  const rankSlot = slots.find((slot) => slot.id === 'rank');
  const rankComposition = rankSlot ? resolveShowcaseRoomSlotComposition({
    canvasHeight: layout.canvas.height,
    canvasWidth: layout.canvas.width,
    itemKind: assignments.rank?.kind,
    pedestalId: pedestalPlacements.rank?.id,
    roomId: room.id,
    slot: rankSlot,
  }) : null;

  return (
    <View
      accessibilityLabel={`${room.name}, ${slots.length} emplacements personnalisables`}
      onLayout={handleLayout}
      style={styles.viewport}
      testID="showcase-room-editor"
    >
      <View style={[styles.canvas, layout.canvas]} testID="showcase-room-canvas">
        <Image
          resizeMode="stretch"
          source={room.image}
          style={[styles.background, layout.image]}
          testID={`showcase-room-background-${room.id}`}
        />
        <LinearGradient
          colors={['rgba(2,5,8,.04)', `${room.accent}0B`, 'rgba(2,5,8,.18)']}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={THEME_WASH[theme]}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
          testID={`showcase-room-theme-${theme}`}
        />
        <LinearGradient
          colors={lightingVisual.wash}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
          start={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
          testID={`showcase-room-lighting-${lighting}`}
        />
        {lightingVisual.horizontalWash ? (
          <LinearGradient
            colors={lightingVisual.horizontalWash}
            end={{ x: 1, y: 0.5 }}
            pointerEvents="none"
            start={{ x: 0, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <ShowcaseAtmosphereLayer
          active={atmosphereActive}
          cosmetics={cosmetics}
          favoriteTeam={favoriteTeam}
          height={layout.canvas.height}
          lightingAccent={lightingVisual.glow}
          onPerformanceReport={onAtmospherePerformanceReport}
          quality={atmosphereQuality}
          rankAccent={rankAccent}
          rankOrder={rankOrder}
          reduceMotion={reduceMotion}
          width={layout.canvas.width}
        />
        {rankDisplay && rankSlot && rankComposition && assignments.rank?.kind === 'rank' ? (
          <>
            <View
              pointerEvents="none"
              style={[styles.rankDisplayLayer, {
                height: rankSlot.height,
                left: rankSlot.left,
                top: rankSlot.top,
                transform: [
                  { perspective: Math.max(600, layout.canvas.width * 1.8) },
                  { translateY: rankComposition.artworkTranslateY },
                  { rotateY: `${rankComposition.artworkYaw}deg` },
                  { rotateZ: `${rankComposition.artworkLean}deg` },
                ],
                width: rankSlot.width,
              }]}
              testID={`showcase-rank-display-${rankDisplay.id}`}
            >
              <Image
                accessibilityLabel={`Écrin de rang ${rankDisplay.name}`}
                accessible
                resizeMode="contain"
                source={rankDisplay.overlayImage}
                style={styles.rankDisplayOverlay}
              />
            </View>
          </>
        ) : null}
        {slots.map((slot) => {
          const item = assignments[slot.id];
          const pedestalPlacement = pedestalPlacements[slot.id];
          const composition = resolveShowcaseRoomSlotComposition({
            canvasHeight: layout.canvas.height,
            canvasWidth: layout.canvas.width,
            itemKind: item?.kind,
            pedestalId: pedestalPlacement?.id,
            roomId: room.id,
            slot,
          });
          return (
            <Pressable
              accessibilityHint={item ? 'Changer ou retirer cet objet' : 'Ajouter un objet de ta collection'}
              accessibilityLabel={`${slot.label}${item ? `, ${showcasePlaceableKindLabel(item.kind)} ${item.name}` : ', vide'}`}
              accessibilityRole="button"
              accessibilityState={{ selected: Boolean(item) }}
              key={slot.id}
              onPress={() => onSlotPress(slot.id)}
              style={({ pressed }) => [
                styles.slot,
                {
                  height: slot.height,
                  left: slot.left,
                  top: slot.top,
                  width: slot.width,
                },
                pressed && styles.slotPressed,
              ]}
              testID={`showcase-room-slot-${slot.id}`}
            >
              <View style={styles.slotSelection}>
                {pedestalPlacement ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.pedestalLayer,
                      { transform: [{ translateY: composition.groundOffset }] },
                    ]}
                  >
                    <View
                      style={[styles.pedestalContactShadow, {
                        bottom: -composition.shadowHeight / 2,
                        height: composition.shadowHeight,
                        left: (layout.canvas.width * Number.parseFloat(slot.width) / 100
                          - composition.shadowWidth) / 2,
                        width: composition.shadowWidth,
                      }]}
                      testID={`showcase-room-pedestal-shadow-${slot.id}`}
                    />
                    <Image
                      accessibilityIgnoresInvertColors
                      accessible={false}
                      resizeMode="stretch"
                      source={pedestalPlacement.image}
                      style={[styles.pedestalArtwork, {
                        bottom: -composition.pedestalBottomInset,
                        height: composition.pedestalHeight,
                        left: (layout.canvas.width * Number.parseFloat(slot.width) / 100
                          - composition.pedestalWidth) / 2,
                        transform: [
                          { perspective: Math.max(600, layout.canvas.width * 1.8) },
                          { rotateY: `${composition.pedestalYaw}deg` },
                        ],
                        width: composition.pedestalWidth,
                      }]}
                      testID={`showcase-room-pedestal-${slot.id}-${pedestalPlacement.id}`}
                    />
                  </View>
                ) : null}
                {item ? (
                  <View style={[
                    styles.slotArtifact,
                    { transform: [
                      { perspective: Math.max(600, layout.canvas.width * 1.8) },
                      { translateY: composition.artworkTranslateY },
                      { rotateY: `${composition.artworkYaw}deg` },
                      { rotateZ: `${composition.artworkLean}deg` },
                    ] },
                  ]}>
                    <ShowcasePlaceableArtwork
                      item={item}
                      size={composition.artworkSize}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.emptySlot,
                      { transform: [{ translateY: composition.artworkTranslateY }] },
                    ]}
                    testID={`showcase-room-empty-${slot.id}`}
                  >
                    <Text style={styles.emptySlotPlus}>+</Text>
                    <Text numberOfLines={1} style={styles.emptySlotText}>AJOUTER</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: SHOWCASE_PALETTE.graphiteDeep,
  },
  rankDisplayLayer: {
    position: 'absolute',
  },
  rankDisplayOverlay: {
    width: '100%',
    height: '100%',
    opacity: 0.96,
  },
  canvas: {
    position: 'absolute',
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
  },
  slot: {
    position: 'absolute',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  slotPressed: {
    opacity: 0.65,
  },
  slotSelection: {
    position: 'relative',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pedestalLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  pedestalContactShadow: {
    position: 'absolute',
    zIndex: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 2, 4, .36)',
    opacity: 0.68,
  },
  pedestalArtwork: {
    position: 'absolute',
    zIndex: 1,
  },
  slotArtifact: {
    position: 'absolute',
    zIndex: 2,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  emptySlot: {
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 48,
    paddingBottom: 6,
  },
  emptySlotPlus: {
    color: colors.volt,
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 32,
    textShadowColor: 'rgba(0,0,0,.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  emptySlotText: {
    ...typography.eyebrow,
    marginTop: 2,
    color: colors.text,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
});
