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
import { colors, fonts, typography } from '@/src/theme';

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
import type { ShowcaseLighting } from './types';

type ShowcaseRoomEditorSceneProps = {
  assignments: ShowcaseRoomAssignments;
  lighting: ShowcaseLighting;
  onSlotPress: (slotId: ShowcaseRoomSlotId) => void;
  rankDisplay?: Pick<ShowcaseRankDisplayDefinition, 'id' | 'name' | 'overlayImage'> | null;
  room: Pick<ShowcaseRoomDefinition, 'accent' | 'id' | 'image' | 'name'>;
  slots?: readonly ShowcaseRoomSlotDefinition[];
};

const ROOM_REFERENCE = {
  height: 853,
  sceneBottom: 676,
  sceneTop: 87,
  width: 1844,
} as const;

export default function ShowcaseRoomEditorScene({
  assignments,
  lighting,
  onSlotPress,
  rankDisplay,
  room,
  slots = SHOWCASE_ROOM_SLOTS,
}: ShowcaseRoomEditorSceneProps) {
  const [viewport, setViewport] = useState({ height: 276, width: 844 });
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const next = {
      height: Math.max(1, Math.round(event.nativeEvent.layout.height)),
      width: Math.max(1, Math.round(event.nativeEvent.layout.width)),
    };
    setViewport((current) => (
      current.height === next.height && current.width === next.width ? current : next
    ));
  }, []);
  const sceneHeightRatio = (ROOM_REFERENCE.sceneBottom - ROOM_REFERENCE.sceneTop) / ROOM_REFERENCE.height;
  const imageHeight = viewport.height / sceneHeightRatio;
  const imageWidth = imageHeight * (ROOM_REFERENCE.width / ROOM_REFERENCE.height);
  const imageLeft = (viewport.width - imageWidth) / 2;
  const imageTop = -imageHeight * (ROOM_REFERENCE.sceneTop / ROOM_REFERENCE.height);
  const lightingVisual = SHOWCASE_LIGHTING_VISUALS[lighting];

  return (
    <View
      accessibilityLabel={`${room.name}, ${slots.length} emplacements personnalisables`}
      onLayout={handleLayout}
      style={styles.viewport}
      testID="showcase-room-editor"
    >
      <Image
        resizeMode="stretch"
        source={room.image}
        style={{
          height: imageHeight,
          left: imageLeft,
          position: 'absolute',
          top: imageTop,
          width: imageWidth,
        }}
        testID={`showcase-room-background-${room.id}`}
      />
      {rankDisplay ? (
        <>
          <View pointerEvents="none" style={styles.rankDisplayMask} />
          <View
            pointerEvents="none"
            style={styles.rankDisplayLayer}
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
      <View pointerEvents="none" style={styles.instructions}>
        <View style={[styles.roomDot, { backgroundColor: room.accent }]} />
        <View style={styles.instructionCopy}>
          <Text numberOfLines={1} style={styles.roomName}>{room.name.toUpperCase()}</Text>
          <Text numberOfLines={1} style={styles.instructionText}>TOUCHE UN EMPLACEMENT POUR L’ÉQUIPER</Text>
        </View>
      </View>

      {slots.map((slot) => {
        const item = assignments[slot.id];
        return (
          <Pressable
            accessibilityHint="Ouvre les objets disponibles dans ta collection"
            accessibilityLabel={`${slot.label}${item ? `, ${showcasePlaceableKindLabel(item.kind)} ${item.name}` : ', vide'}`}
            accessibilityRole="button"
            accessibilityState={{ selected: Boolean(item) }}
            hitSlop={slots.length > 8 ? 6 : undefined}
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
              slots.length > 8 && styles.slotDense,
              slot.id === 'rank' && styles.rankSlot,
              item && { borderColor: `${item.accent}A8` },
              pressed && styles.slotPressed,
            ]}
            testID={`showcase-room-slot-${slot.id}`}
          >
            {item ? (
              <View style={styles.slotSelection}>
                <View style={styles.slotArtifact}>
                  <View style={[styles.slotArtifactGlow, { backgroundColor: `${item.accent}24` }]} />
                  {item.image ? (
                    <Image resizeMode="contain" source={item.image} style={styles.slotArtifactImage} />
                  ) : (
                    <Text style={[styles.slotArtifactGlyph, { color: item.accent }]}>
                      {showcasePlaceableGlyph(item.kind)}
                    </Text>
                  )}
                </View>
                <View style={styles.slotCaption}>
                  <Text style={[styles.slotGlyph, { color: item.accent }]}>{showcasePlaceableGlyph(item.kind)}</Text>
                  <Text numberOfLines={1} style={styles.slotItemName}>{item.name.toUpperCase()}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptySlot}>
                <Text style={styles.emptySlotPlus}>+</Text>
                <Text numberOfLines={1} style={styles.emptySlotText}>AJOUTER</Text>
              </View>
            )}
          </Pressable>
        );
      })}
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
    top: 0,
    bottom: 0,
    left: '20%',
    right: '20%',
  },
  rankDisplayMask: {
    position: 'absolute',
    top: '12%',
    bottom: '7%',
    left: '38%',
    right: '38%',
    borderRadius: 999,
    backgroundColor: '#03070A',
  },
  rankDisplayOverlay: {
    width: '100%',
    height: '100%',
    opacity: 0.96,
  },
  instructions: {
    position: 'absolute',
    top: 9,
    left: 12,
    maxWidth: '42%',
    minHeight: 36,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(111,128,140,.48)',
    backgroundColor: 'rgba(4,8,11,.82)',
  },
  roomDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  instructionCopy: {
    flex: 1,
    minWidth: 0,
  },
  roomName: {
    ...typography.label,
    color: colors.text,
  },
  instructionText: {
    ...typography.eyebrow,
    marginTop: 1,
    color: colors.volt,
    fontSize: 8,
    lineHeight: 10,
  },
  slot: {
    position: 'absolute',
    minWidth: 44,
    minHeight: 44,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(166,180,190,.38)',
    backgroundColor: 'rgba(3,7,10,.06)',
  },
  slotPressed: {
    backgroundColor: 'rgba(232,255,61,.13)',
    borderColor: colors.volt,
  },
  rankSlot: {
    overflow: 'hidden',
    borderRadius: 18,
  },
  slotDense: {
    minWidth: 32,
    minHeight: 36,
    padding: 2,
  },
  slotSelection: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(3,7,10,.52)',
    borderWidth: 1,
    borderColor: 'rgba(140,154,164,.42)',
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
  slotArtifactGlow: {
    position: 'absolute',
    width: '72%',
    aspectRatio: 1,
    borderRadius: 999,
  },
  slotArtifactImage: {
    width: '88%',
    height: '88%',
  },
  slotArtifactGlyph: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 30,
  },
  slotCaption: {
    width: '100%',
    minHeight: 23,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(3,7,10,.88)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(140,154,164,.38)',
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
    minHeight: 38,
  },
  emptySlotPlus: {
    color: colors.volt,
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 22,
  },
  emptySlotText: {
    ...typography.eyebrow,
    marginTop: 1,
    color: colors.textSecondary,
    fontSize: 7,
    lineHeight: 9,
  },
});
