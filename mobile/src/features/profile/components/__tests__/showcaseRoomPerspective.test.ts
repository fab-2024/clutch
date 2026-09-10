/// <reference types="jest" />

import { SHOWCASE_PRESENTER_CATALOG } from '@/src/features/shop/showcasePresenterCatalog';
import { SHOWCASE_ROOM_CATALOG } from '@/src/features/shop/showcaseRoomCatalog';
import { ORIGINAL_PACK_CATALOG } from '@/src/features/shop/teamPackCatalog';

import type { ShowcaseRoomSlotDefinition, ShowcaseRoomSlotId } from '@/src/features/profile/showcase/roomEditor';
import { showcaseSceneLayout } from '../showcase/showcaseSceneLayout';
import { resolveShowcaseRoomSlotComposition } from '../showcase/ShowcaseRoomEditorScene';
import {
  SHOWCASE_ROOM_PERSPECTIVES,
  hasShowcaseRoomPerspective,
  hasShowcasePedestalAssetGeometry,
  resolveShowcaseSlotPerspective,
  showcasePedestalAssetGeometry,
} from '../showcase/showcaseRoomPerspective';

const LEFT_SLOT = {
  height: '35%',
  id: 'left-free',
  label: 'Gauche',
  left: '2%',
  preferredKind: 'trophy',
  top: '35%',
  width: '12%',
} as const satisfies ShowcaseRoomSlotDefinition;

const RIGHT_SLOT = {
  ...LEFT_SLOT,
  id: 'right-free',
  label: 'Droite',
  left: '86%',
} as const satisfies ShowcaseRoomSlotDefinition;

const ORIGINAL_PACK_IDS = new Set(ORIGINAL_PACK_CATALOG.map((pack) => pack.id));
const ACTIVE_AUDITED_SCENES = [
  ...SHOWCASE_ROOM_CATALOG,
  ...SHOWCASE_PRESENTER_CATALOG.filter((presenter) => (
    !presenter.packId || ORIGINAL_PACK_IDS.has(presenter.packId)
  )),
];

describe('showcase room perspective doctrine', () => {
  it.each([
    { width: 844, height: 390 },
    { width: 1690, height: 780 },
    { width: 390, height: 844 },
  ])('places Forge objects on all eight visible seats at $width × $height', (viewport) => {
    const forge = SHOWCASE_PRESENTER_CATALOG.find((room) => room.id === 'mythes-forge-magma-pedestals')!;
    const layout = showcaseSceneLayout(viewport, forge.sceneFrame);
    // Usable contact areas measured in the original 1672 × 941 room artwork.
    const seats: Partial<Record<ShowcaseRoomSlotId, [number, number, number, number]>> = {
      'left-free': [180, 563, 270, 587],
      'left-extra': [300, 690, 415, 730],
      ring: [470, 505, 570, 526],
      jersey: [760, 749, 900, 790],
      'right-extra': [780, 500, 880, 515],
      trophy: [1080, 505, 1190, 526],
      badge: [1240, 690, 1350, 730],
      'right-free': [1390, 563, 1480, 587],
    };
    expect(layout.image).toEqual({ ...viewport, left: 0, top: 0 });
    expect(forge.slots.map((slot) => slot.id).sort()).toEqual(Object.keys(seats).sort());
    for (const slot of forge.slots) {
      const composition = resolveShowcaseRoomSlotComposition({
        canvasHeight: viewport.height, canvasWidth: viewport.width,
        itemKind: 'trophy', itemId: 'cosmetic:serment-du-givre-summit-egg',
        roomId: forge.id, slot,
      });
      const [left, top, right, bottom] = seats[slot.id]!;
      const x = (parseFloat(slot.left) + parseFloat(slot.width) / 2 + composition.horizontalOffset) / 100 * 1672;
      const contactY = viewport.height * (parseFloat(slot.top) + parseFloat(slot.height)) / 100
        + composition.artworkTranslateY - composition.artworkSize * 15 / 768;
      const y = contactY / viewport.height * 941;
      expect(x).toBeGreaterThanOrEqual(left);
      expect(x).toBeLessThanOrEqual(right);
      expect(y).toBeGreaterThanOrEqual(top);
      expect(y).toBeLessThanOrEqual(bottom);
    }
  });

  it.each([
    { width: 844, height: 390 },
    { width: 1690, height: 780 },
    { width: 390, height: 844 },
  ])('anchors the bronze tip to the baked-in central seat at $width × $height', (canvas) => {
    const scenes = [
      SHOWCASE_ROOM_CATALOG.find((room) => room.id === 'obsidian-gallery')!,
      SHOWCASE_PRESENTER_CATALOG.find((room) => room.id === 'supports_gallery')!,
    ];
    for (const room of scenes) {
      const slot = room.slots.find((item) => item.id === 'rank')!;
      const composition = resolveShowcaseRoomSlotComposition({
        canvasHeight: canvas.height,
        canvasWidth: canvas.width,
        itemId: 'rank:bronze',
        itemKind: 'rank',
        roomId: room.id,
        slot,
      });
      const bottom = canvas.height * (parseFloat(slot.top) + parseFloat(slot.height)) / 100;
      // The source bronze image has 49 transparent rows below its tip (512 × 512).
      const visibleTip = bottom + composition.artworkTranslateY - composition.artworkSize * 49 / 512;
      expect(visibleTip).toBeCloseTo(canvas.height * 0.557, 0);
      expect(bottom + composition.artworkContactY).toBeCloseTo(canvas.height * 0.557);
      expect(parseFloat(slot.left) + parseFloat(slot.width) / 2 + composition.horizontalOffset).toBeCloseTo(49.9);
    }
  });

  it('requires an explicit perspective profile for every selectable room and presenter', () => {
    SHOWCASE_ROOM_CATALOG.forEach((room) => {
      expect(hasShowcaseRoomPerspective(room.id)).toBe(true);
    });
    SHOWCASE_PRESENTER_CATALOG.forEach((presenter) => {
      expect(hasShowcaseRoomPerspective(presenter.id)).toBe(true);
    });
  });

  it('turns side pedestals and their objects toward each room vanishing point', () => {
    const left = resolveShowcaseSlotPerspective(
      'conclave-arcanique-rosette-pedestal',
      LEFT_SLOT,
    );
    const right = resolveShowcaseSlotPerspective(
      'conclave-arcanique-rosette-pedestal',
      RIGHT_SLOT,
    );

    expect(left.pedestalYaw).toBeGreaterThan(0);
    expect(left.artworkYaw).toBeGreaterThan(0);
    expect(right.pedestalYaw).toBeLessThan(0);
    expect(right.artworkYaw).toBeLessThan(0);
    expect(left.pedestalInclination).toBeCloseTo(right.pedestalInclination);
  });

  it('keeps room-specific floor depth instead of sharing a universal projection', () => {
    const arcane = resolveShowcaseSlotPerspective(
      'conclave-arcanique-rosette-pedestal',
      LEFT_SLOT,
    );
    const orbital = resolveShowcaseSlotPerspective('orbital-station', LEFT_SLOT);

    expect(arcane.pedestalInclination).not.toBe(orbital.pedestalInclination);
    expect(arcane.groundOffset).not.toBe(orbital.groundOffset);
  });

  it('normalizes the transparent margins and seat line of each pedestal artwork', () => {
    const rosette = showcasePedestalAssetGeometry('conclave-arcanique-rosette-pedestal');
    const drop = showcasePedestalAssetGeometry('chute-libre-drop-pedestal');
    const aero = showcasePedestalAssetGeometry('circuit-zero-aero-pedestals');
    const vector = showcasePedestalAssetGeometry('neon-protocol-vector-pedestals');

    expect(rosette.opaqueWidthRatio).not.toBe(drop.opaqueWidthRatio);
    expect(drop.bottomInset).toBeGreaterThan(rosette.bottomInset);
    expect(aero.seatY).toBe(0.19);
    expect(aero.opaqueWidthRatio).toBe(0.9557);
    expect(rosette.seatWidthRatio).toBeGreaterThan(0.9);
    expect(vector.seatY).toBeLessThan(rosette.seatY);
    expect(vector.heightScale).toBeLessThan(1);
  });

  it('preserves legacy pedestal geometry after removing pedestals from the packs', () => {
    const pedestalIds = ORIGINAL_PACK_CATALOG.flatMap((pack) => pack.items)
      .filter((item) => item.slot === 'vitrine_supports')
      .map((item) => item.id);

    expect(pedestalIds).toHaveLength(0);
    expect(Object.keys(SHOWCASE_ROOM_PERSPECTIVES).filter(hasShowcasePedestalAssetGeometry)).toHaveLength(9);
  });

  it('allows a calibrated room slot to override only its floor contact point', () => {
    const calibrated = resolveShowcaseSlotPerspective('orbital-station', {
      ...LEFT_SLOT,
      pedestalGroundOffset: 8.25,
    });

    expect(calibrated.groundOffset).toBe(8.25);
    expect(calibrated.pedestalInclination).toBeGreaterThan(0);
  });

  it('keeps every audited room above the workshop dock and inside the side margins', () => {
    ACTIVE_AUDITED_SCENES.forEach((room) => {
      room.slots.forEach((slot) => {
        const perspective = resolveShowcaseSlotPerspective(room.id, slot);
        const center = Number.parseFloat(slot.left)
          + Number.parseFloat(slot.width) / 2
          + perspective.horizontalOffset;
        const floor = Number.parseFloat(slot.top)
          + Number.parseFloat(slot.height)
          + perspective.groundOffset;

        expect(floor).toBeLessThanOrEqual(80);
        expect(center - perspective.pedestalWidth / 2).toBeGreaterThanOrEqual(2);
        expect(center + perspective.pedestalWidth / 2).toBeLessThanOrEqual(98);
      });
    });
  });

  it('keeps every object box proportional to the usable pedestal seat', () => {
    ACTIVE_AUDITED_SCENES.forEach((room) => {
      room.slots.forEach((slot) => {
        const pedestalId = hasShowcasePedestalAssetGeometry(room.id)
          ? room.id
          : 'supports_gallery';
        const composition = resolveShowcaseRoomSlotComposition({
          canvasHeight: 853,
          canvasWidth: 1844,
          itemKind: slot.preferredKind,
          pedestalId,
          roomId: room.id,
          slot,
        });
        const geometry = showcasePedestalAssetGeometry(pedestalId);
        const seatWidth = composition.pedestalFootprintWidth * geometry.seatWidthRatio;

        expect(composition.artworkSize / seatWidth).toBeLessThanOrEqual(1.450001);
      });
    });
  });

  it('applies per-item calibration to both catalog and cosmetic-prefixed ids', () => {
    const circuit = SHOWCASE_PRESENTER_CATALOG.find(
      (presenter) => presenter.id === 'circuit-zero-aero-pedestals',
    );
    const slot = circuit?.slots.find((candidate) => candidate.id === 'jersey');
    if (!circuit || !slot) throw new Error('Missing Circuit Zero center slot');
    const options = {
      canvasHeight: 853,
      canvasWidth: 1844,
      itemKind: 'jersey' as const,
      pedestalId: circuit.id,
      roomId: circuit.id,
      slot,
    };
    const raw = resolveShowcaseRoomSlotComposition({
      ...options,
      itemId: 'circuit-zero-kairos-6',
    });
    const prefixed = resolveShowcaseRoomSlotComposition({
      ...options,
      itemId: 'cosmetic:circuit-zero-kairos-6',
    });

    expect(prefixed.artworkSize).toBeCloseTo(raw.artworkSize);
    expect(prefixed.artworkTranslateY).toBeCloseTo(raw.artworkTranslateY);
  });

  it('uses the room artwork anchors when pedestals are integrated in the background', () => {
    const withFallbackPedestal = resolveShowcaseRoomSlotComposition({
      canvasHeight: 853,
      canvasWidth: 1844,
      itemKind: 'trophy',
      pedestalId: 'unregistered-pedestal',
      roomId: 'conclave-arcanique-rosette-pedestal',
      slot: LEFT_SLOT,
    });
    const withoutPedestal = resolveShowcaseRoomSlotComposition({
      canvasHeight: 853,
      canvasWidth: 1844,
      itemKind: 'trophy',
      roomId: 'conclave-arcanique-rosette-pedestal',
      slot: LEFT_SLOT,
    });

    expect(withoutPedestal.artworkContactY).toBeCloseTo(withoutPedestal.artworkTranslateY - withoutPedestal.artworkSize * 0.025);
    expect(withFallbackPedestal.artworkContactY).toBeCloseTo(withFallbackPedestal.artworkTranslateY - withFallbackPedestal.artworkSize * 0.025);
    expect(withoutPedestal.artworkSize).toBeGreaterThan(16);
    expect(withoutPedestal.artworkSize).not.toBeCloseTo(withFallbackPedestal.artworkSize);
    expect(withoutPedestal).toMatchObject({
      artworkLean: 0,
      artworkYaw: 0,
      groundOffset: 0,
      horizontalOffset: 0,
      pedestalBottomInset: 0,
      pedestalFootprintWidth: 0,
      pedestalHeight: 0,
      pedestalWidth: 0,
      shadowHeight: 0,
      shadowWidth: 0,
    });
  });

  it('sizes objects from their pedestal footprint and brings the frost focal statue forward', () => {
    const frost = SHOWCASE_PRESENTER_CATALOG.find(
      (presenter) => presenter.id === 'serment-du-givre-ice-sheet-pedestal',
    );
    if (!frost) throw new Error('Missing frost showcase');
    const centerSlot = frost.slots.find((slot) => slot.id === 'rank');
    const sideSlot = frost.slots.find((slot) => slot.id === 'jersey');
    if (!centerSlot || !sideSlot) throw new Error('Missing frost showcase slots');

    const center = resolveShowcaseRoomSlotComposition({
      canvasHeight: 853,
      canvasWidth: 1844,
      itemKind: 'jersey',
      pedestalId: 'serment-du-givre-ice-sheet-pedestal',
      roomId: frost.id,
      slot: centerSlot,
    });
    const side = resolveShowcaseRoomSlotComposition({
      canvasHeight: 853,
      canvasWidth: 1844,
      itemKind: 'jersey',
      pedestalId: 'serment-du-givre-ice-sheet-pedestal',
      roomId: frost.id,
      slot: sideSlot,
    });

    expect(center.groundOffset).toBeGreaterThan(side.groundOffset);
    expect(center.artworkSize / center.pedestalWidth).toBeGreaterThan(
      side.artworkSize / side.pedestalWidth,
    );
    expect(center.artworkSize).toBeGreaterThan(side.artworkSize * 2);
    expect(center.pedestalFootprintWidth / side.pedestalFootprintWidth).toBeLessThan(2.35);
  });
});
