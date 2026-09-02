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
import { colors, fonts, typography } from '@/src/theme';

import type { ProfileTeam } from '../../types';
import ShowcaseAtmosphereLayer from './ShowcaseAtmosphereLayer';
import ShowcasePlaceableArtwork from './ShowcasePlaceableArtwork';
import type {
  ShowcaseAtmospherePerformanceReport,
  ShowcaseAtmosphereQuality,
} from './showcaseAtmosphere';
import {
  SHOWCASE_ROOM_SLOTS,
  showcasePlaceableGlyph,
  showcasePlaceableKindLabel,
  type ShowcaseRoomAssignments,
  type ShowcaseRoomSlotDefinition,
  type ShowcaseRoomSlotId,
} from './roomEditor';
import { SHOWCASE_LIGHTING_VISUALS } from './showcaseLighting';
import { SHOWCASE_PALETTE } from './showcasePalette';
import { showcaseSceneLayout, type ShowcaseSceneFrame } from './showcaseSceneLayout';
import type { ShowcaseLighting } from './types';

type ShowcaseRoomEditorSceneProps = {
  assignments: ShowcaseRoomAssignments;
  atmosphereActive?: boolean;
  atmosphereQuality?: ShowcaseAtmosphereQuality;
  cosmetics?: EquippedCosmetics | null;
  favoriteTeam?: ProfileTeam | null;
  lighting: ShowcaseLighting;
  onAtmospherePerformanceReport?: (report: ShowcaseAtmospherePerformanceReport) => void;
  onSlotPress: (slotId: ShowcaseRoomSlotId) => void;
  rankAccent?: string;
  rankDisplay?: Pick<ShowcaseRankDisplayDefinition, 'id' | 'name' | 'overlayImage'> | null;
  rankOrder?: number | null;
  reduceMotion?: boolean;
  room: Pick<ShowcaseRoomDefinition, 'accent' | 'id' | 'image' | 'name'> & {
    sceneFrame?: ShowcaseSceneFrame;
  };
  slots?: readonly ShowcaseRoomSlotDefinition[];
};

export default function ShowcaseRoomEditorScene({
  assignments,
  atmosphereActive = true,
  atmosphereQuality = 'auto',
  cosmetics,
  favoriteTeam,
  lighting,
  onAtmospherePerformanceReport,
  onSlotPress,
  rankAccent = '#B87845',
  rankDisplay,
  rankOrder,
  reduceMotion = false,
  room,
  slots = SHOWCASE_ROOM_SLOTS,
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
          colors={lightingVisual.wash}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
          start={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
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
        {rankDisplay && rankSlot && assignments.rank?.kind === 'rank' ? (
          <>
            <View
              pointerEvents="none"
              style={[styles.rankDisplayLayer, {
                height: rankSlot.height,
                left: rankSlot.left,
                top: rankSlot.top,
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
              {item ? (
                <View style={styles.slotSelection}>
                  <View style={styles.slotArtifact}>
                    <ShowcasePlaceableArtwork
                      item={item}
                      size={Math.max(16, Math.min(
                        layout.canvas.width * Number.parseFloat(slot.width) / 100,
                        layout.canvas.height * Number.parseFloat(slot.height) / 100 - 20,
                      ) * 0.88)}
                    />
                  </View>
                  <View style={styles.slotCaption}>
                    <Text style={[styles.slotGlyph, { color: item.accent }]}>{showcasePlaceableGlyph(item.kind)}</Text>
                    <Text numberOfLines={1} style={styles.slotItemName}>{item.name.toUpperCase()}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.emptySlot} testID={`showcase-room-empty-${slot.id}`}>
                  <Text style={styles.emptySlotPlus}>+</Text>
                  <Text numberOfLines={1} style={styles.emptySlotText}>AJOUTER</Text>
                </View>
              )}
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
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  slotArtifact: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slotCaption: {
    width: '100%',
    minHeight: 20,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(3,7,10,.66)',
    borderRadius: 4,
  },
  slotGlyph: {
    fontFamily: fonts.display,
    fontSize: 13,
    lineHeight: 15,
  },
  slotItemName: {
    ...typography.eyebrow,
    flex: 1,
    color: colors.text,
    fontSize: 8,
    lineHeight: 10,
  },
  emptySlot: {
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
