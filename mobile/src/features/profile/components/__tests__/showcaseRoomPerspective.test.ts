/// <reference types="jest" />

import { SHOWCASE_PRESENTER_CATALOG } from '@/src/features/shop/showcasePresenterCatalog';
import { SHOWCASE_ROOM_CATALOG } from '@/src/features/shop/showcaseRoomCatalog';

import type { ShowcaseRoomSlotDefinition } from '../showcase/roomEditor';
import {
  hasShowcaseRoomPerspective,
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

describe('showcase room perspective doctrine', () => {
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
    const vector = showcasePedestalAssetGeometry('neon-protocol-vector-pedestals');

    expect(rosette.opaqueWidthRatio).not.toBe(drop.opaqueWidthRatio);
    expect(drop.bottomInset).toBeGreaterThan(rosette.bottomInset);
    expect(vector.seatY).toBeLessThan(rosette.seatY);
  });

  it('allows a calibrated room slot to override only its floor contact point', () => {
    const calibrated = resolveShowcaseSlotPerspective('orbital-station', {
      ...LEFT_SLOT,
      pedestalGroundOffset: 11.25,
    });

    expect(calibrated.groundOffset).toBe(11.25);
    expect(calibrated.pedestalInclination).toBeGreaterThan(0);
  });
});
