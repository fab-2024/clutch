import { LinearGradient } from 'expo-linear-gradient';
import FlipHorizontal from 'lucide-react-native/icons/flip-horizontal-2';
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
  showcaseIntegratedSeatContact,
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
  pedestalLayerEnabled?: boolean;
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
const MAX_ARTWORK_SEAT_SCALE = 1.45;

const ARTWORK_PEDESTAL_SCALE: Record<ShowcasePlaceableKind, number> = {
  badge: 1.12,
  banner: 1.18,
  core: 1.14,
  frame: 1.1,
  jersey: 1.35,
  rank: 0.9,
  ring: 1.08,
  title: 1,
  trophy: 1.28,
};

const ARTWORK_ITEM_SCALE: Readonly<Record<string, number>> = {
  'circuit-zero-kairos-6': 0.74,
  'conclave-arcanique-bloom-banner': 0.94,
  'conclave-arcanique-brumousse': 0.94,
  'conclave-arcanique-conclave-seal': 0.94,
  'dernier-round-sentinel-helmet': 0.94,
  'dernier-round-squad-banner': 0.9,
  'dernier-round-vector-carbine': 0.84,
  'sang-des-titans-eclipse-axe': 1.06,
  'sang-des-titans-oath-armor': 1.05,
  'sang-des-titans-rift-bearer-badge': 0.94,
  'sang-des-titans-three-voices-totem': 0.8,
};

const ARTWORK_BOTTOM_INSET: Partial<Record<ShowcasePlaceableKind, number>> = {
  banner: 0.02,
  core: 0.02,
  jersey: 0.025,
  rank: 0.096,
  ring: 0.03,
  trophy: 0.025,
};

const ARTWORK_ITEM_BOTTOM_INSET: Readonly<Record<string, number>> = {
  'serment-du-givre-summit-egg': 0.01953,
  // Insets are measured from the alpha contact row / longest source dimension.
  'circuit-zero-kairos-6': 0.069,
  'conclave-arcanique-bloom-banner': 0.04427,
  'conclave-arcanique-brumousse': 0.02474,
  'conclave-arcanique-bud-totem': 0.02865,
  'conclave-arcanique-conclave-seal': 0.03125,
  'conclave-arcanique-guardian-badge': 0.0286,
  'conclave-arcanique-trellis-frame': 0.0052,
  'dernier-round-scout-drone': 0.01823,
  'dernier-round-operator-badge': 0.052,
  'dernier-round-sentinel-helmet': 0.01042,
  'dernier-round-squad-banner': 0,
  'dernier-round-vector-carbine': 0.0,
  'sang-des-titans-oath-armor': 0.01432,
  'sang-des-titans-eclipse-axe': 0.01562,
  'sang-des-titans-three-voices-totem': 0.01953,
  'sang-des-titans-rift-bearer-badge': 0.015,
  'chute-libre-falcon-jetpack': 0.01042,
  'chute-libre-loot-capsule': 0.01432,
  'chute-libre-summit-beacon': 0.00391,
  'serment-du-givre-veyr-dragon': 0.01562,
  'serment-du-givre-snow-compass': 0.0013,
  'serment-du-givre-oath-banner': 0.03385,
  'turbo-arena-comet-car': 0.03385,
  'turbo-arena-orbital-ball': 0.03255,
  'turbo-arena-aerial-trophy': 0.00911,
  'circuit-zero-zero-glyph': 0.01172,
  'circuit-zero-sector-banner': 0.01823,
  'circuit-zero-delta-totem': 0.01042,
  'circuit-zero-pilot-badge': 0.02604,
  'mythes-forge-armor-orea': 0.01953,
  'mythes-forge-ember-sigil': 0.01693,
  'mythes-forge-basalt-totem': 0.05208,
  'neon-protocol-armor-vega': 0.01562,
  'neon-protocol-glyph-node': 0.04167,
  'neon-protocol-null-totem': 0.03385,
};

type ShowcaseRoomSlotComposition = {
  artworkContactY: number;
  artworkLean: number;
  artworkSize: number;
  artworkTranslateY: number;
  artworkYaw: number;
  groundOffset: number;
  horizontalOffset: number;
  pedestalBottomInset: number;
  pedestalFootprintWidth: number;
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
  itemId,
  pedestalId,
  roomId,
  slot,
}: {
  canvasHeight: number;
  canvasWidth: number;
  itemKind?: ShowcasePlaceableKind;
  itemId?: string;
  pedestalId?: string;
  roomId: string;
  slot: ShowcaseRoomSlotDefinition;
}): ShowcaseRoomSlotComposition {
  const slotWidth = canvasWidth * Number.parseFloat(slot.width) / 100;
  const slotHeight = canvasHeight * Number.parseFloat(slot.height) / 100;
  const artworkLift = canvasHeight * (slot.artworkLift ?? 0) / 100;
  const catalogItemId = itemId?.replace(/^cosmetic:/, '');
  const itemScale = catalogItemId === 'serment-du-givre-veyr-dragon' && slot.id === 'rank'
    ? 1.4
    : catalogItemId ? ARTWORK_ITEM_SCALE[catalogItemId] ?? 1 : 1;
  const kindBottomInset = ARTWORK_BOTTOM_INSET[itemKind ?? 'badge'] ?? 0;

  if (!pedestalId) {
    const seat = showcaseIntegratedSeatContact(roomId, slot.id);
    const slotBottom = Number.parseFloat(slot.top) + Number.parseFloat(slot.height);
    const slotCenter = Number.parseFloat(slot.left) + Number.parseFloat(slot.width) / 2;
    const contactY = seat ? canvasHeight * (seat.y - slotBottom) / 100 : -artworkLift;
    const artworkSize = Math.max(
      16,
      Math.min(slotWidth, slotHeight - 20) * 0.88 * itemScale * (slot.artworkScale ?? 1),
    );
    const artworkBottomInset = artworkSize * (
      catalogItemId
        ? ARTWORK_ITEM_BOTTOM_INSET[catalogItemId] ?? kindBottomInset
        : kindBottomInset
    );

    return {
      artworkContactY: contactY,
      artworkLean: 0,
      artworkSize,
      artworkTranslateY: contactY + artworkBottomInset,
      artworkYaw: 0,
      groundOffset: 0,
      horizontalOffset: seat ? seat.x - slotCenter : 0,
      pedestalBottomInset: 0,
      pedestalFootprintWidth: 0,
      pedestalHeight: 0,
      pedestalWidth: 0,
      pedestalYaw: 0,
      shadowHeight: 0,
      shadowWidth: 0,
    };
  }

  const perspective = resolveShowcaseSlotPerspective(roomId, slot);
  const geometry = showcasePedestalAssetGeometry(pedestalId);
  const opaquePedestalWidth = canvasWidth * perspective.pedestalWidth / 100;
  const pedestalWidth = opaquePedestalWidth / geometry.opaqueWidthRatio;
  const pedestalHeight = pedestalWidth
    / PEDESTAL_SOURCE_ASPECT_RATIO
    * perspective.pedestalInclination
    * geometry.heightScale;
  const pedestalBottomInset = pedestalHeight * geometry.bottomInset;
  const groundOffset = canvasHeight * perspective.groundOffset / 100;
  const seatLift = pedestalHeight * (1 - geometry.bottomInset - geometry.seatY);
  const kindScale = ARTWORK_PEDESTAL_SCALE[itemKind ?? 'badge'];
  const perspectiveScale = perspective.artworkScale;
  const seatWidth = opaquePedestalWidth * geometry.seatWidthRatio;
  const artworkSize = Math.max(16, Math.min(
    seatWidth * kindScale * perspectiveScale * itemScale,
    seatWidth * MAX_ARTWORK_SEAT_SCALE,
    slotHeight * Math.max(1.04, perspectiveScale),
  ));
  const artworkBottomInset = artworkSize * (
    catalogItemId
      ? ARTWORK_ITEM_BOTTOM_INSET[catalogItemId] ?? kindBottomInset
      : kindBottomInset
  );

  return {
    artworkContactY: groundOffset - seatLift,
    artworkLean: perspective.artworkLean * 0.35,
    artworkSize,
    artworkTranslateY: groundOffset - seatLift + artworkBottomInset,
    artworkYaw: perspective.artworkYaw * 0.65,
    groundOffset,
    horizontalOffset: perspective.horizontalOffset,
    pedestalBottomInset,
    pedestalFootprintWidth: opaquePedestalWidth,
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
  pedestalLayerEnabled = false,
  pedestalPlacements = {},
  rankAccent = '#B87845',
  rankDisplay,
  rankOrder,
  reduceMotion = false,
  room,
  slots = SHOWCASE_ROOM_SLOTS,
  theme = 'graphite',
}: ShowcaseRoomEditorSceneProps) {
  const [mirroredItems, setMirroredItems] = useState<Record<string, boolean>>({});
  const orientationKey = (slotId: string, itemId?: string) => `${slotId}:${itemId ?? ''}`;
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
    itemId: assignments.rank?.id,
    pedestalId: pedestalLayerEnabled ? pedestalPlacements.rank?.id : undefined,
    roomId: room.id,
    slot: rankSlot,
  }) : null;
  const rankSlotWidth = rankSlot
    ? layout.canvas.width * Number.parseFloat(rankSlot.width) / 100
    : 0;
  const rankDisplaySize = rankComposition ? rankComposition.artworkSize * 1.5 : 0;

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
                left: layout.canvas.width * (
                  Number.parseFloat(rankSlot.left) + rankComposition.horizontalOffset
                ) / 100,
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
                style={[styles.rankDisplayOverlay, {
                  bottom: (rankComposition.artworkSize - rankDisplaySize) / 2,
                  height: rankDisplaySize,
                  left: (rankSlotWidth - rankDisplaySize) / 2,
                  width: rankDisplaySize,
                }]}
              />
            </View>
          </>
        ) : null}
        {slots.map((slot) => {
          const item = assignments[slot.id];
          const pedestalPlacement = pedestalLayerEnabled ? pedestalPlacements[slot.id] : undefined;
          const composition = resolveShowcaseRoomSlotComposition({
            canvasHeight: layout.canvas.height,
            canvasWidth: layout.canvas.width,
            itemKind: item?.kind,
            itemId: item?.id,
            pedestalId: pedestalPlacement?.id,
            roomId: room.id,
            slot,
          });
          return (
            <View
              key={slot.id}
              style={[
                styles.slot,
                {
                  height: slot.height,
                  left: layout.canvas.width * (
                    Number.parseFloat(slot.left) + composition.horizontalOffset
                  ) / 100,
                  top: slot.top,
                  width: slot.width,
                  zIndex: Math.round(
                    layout.canvas.height * (
                      Number.parseFloat(slot.top) + Number.parseFloat(slot.height)
                    ) / 100 + composition.groundOffset,
                  ),
                },
              ]}
            >
              <View style={styles.slotSelection}>
                <Pressable
                  accessibilityHint={item ? 'Changer ou retirer cet objet' : 'Ajouter un objet de ta collection'}
                  accessibilityLabel={`${slot.label}${item ? `, ${showcasePlaceableKindLabel(item.kind)} ${item.name}` : ', vide'}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: Boolean(item) }}
                  onPress={() => onSlotPress(slot.id)}
                  style={styles.slotHitArea}
                  testID={`showcase-room-slot-${slot.id}`}
                />
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
                  <>
                    <View
                      pointerEvents="none"
                      style={[styles.artworkContactShadow, {
                        width: Math.min(composition.artworkSize * 0.42, layout.canvas.width * Number.parseFloat(slot.width) / 100 * 0.72),
                        height: Math.max(2, composition.artworkSize * 0.035),
                        transform: [{ translateY: composition.artworkContactY }],
                      }]}
                    />
                    <View pointerEvents="none" testID={`showcase-room-artwork-${slot.id}`} style={[
                      styles.slotArtifact,
                      { transform: [
                        { perspective: Math.max(600, layout.canvas.width * 1.8) },
                        { translateY: composition.artworkTranslateY },
                        { rotateY: `${composition.artworkYaw}deg` },
                        { rotateZ: `${composition.artworkLean}deg` },
                        { scaleX: mirroredItems[orientationKey(slot.id, item.id)] ? -1 : 1 },
                      ] },
                    ]}>
                      <ShowcasePlaceableArtwork
                        item={item}
                        size={composition.artworkSize}
                      />
                    </View>
                    <Pressable
                      accessibilityLabel={`Inverser ${item.name}`}
                      accessibilityHint="Retourner horizontalement l’image"
                      accessibilityState={{ selected: Boolean(mirroredItems[orientationKey(slot.id, item.id)]) }}
                      accessibilityRole="button"
                      onPress={() => {
                        const key = orientationKey(slot.id, item.id);
                        setMirroredItems((current) => ({ ...current, [key]: !current[key] }));
                      }}
                      style={({ pressed }) => [styles.mirrorButton, {
                        bottom: composition.artworkSize * 0.9 - composition.artworkTranslateY + 6,
                      }, pressed && styles.slotPressed]}
                      testID={`showcase-room-mirror-${slot.id}`}
                    >
                      <FlipHorizontal color={mirroredItems[orientationKey(slot.id, item.id)] ? colors.volt : colors.text} size={18} />
                    </Pressable>
                  </>
                ) : (
                  <View
                    pointerEvents="none"
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
            </View>
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
    transformOrigin: '50% 100%',
    position: 'absolute',
    overflow: 'visible',
  },
  rankDisplayOverlay: {
    position: 'absolute',
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
    backgroundColor: 'rgba(0, 2, 4, .48)',
    opacity: 0.78,
  },
  pedestalArtwork: {
    position: 'absolute',
    zIndex: 1,
  },
  slotHitArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 3,
  },
  mirrorButton: {
    position: 'absolute',
    zIndex: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 13, 18, .85)',
    borderWidth: 1,
    borderColor: 'rgba(160, 190, 207, .35)',
  },
  artworkContactShadow: {
    position: 'absolute',
    bottom: -1,
    zIndex: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 2, 4, .3)',
    boxShadow: '0 1px 4px rgba(0, 2, 4, .22)',
  },
  slotArtifact: {
    transformOrigin: '50% 100%',
    position: 'absolute',
    zIndex: 2,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
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
