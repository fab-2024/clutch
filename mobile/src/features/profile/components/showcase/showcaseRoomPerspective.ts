import type { ShowcaseRoomSlotDefinition, ShowcaseRoomSlotId } from './roomEditor';

// Contact points on the tops of the baked-in pedestals, in full scene percentages.
// Keep these independent of the selection boxes and collectible dimensions.
const OBSIDIAN_SEAT_CONTACTS: Partial<Record<ShowcaseRoomSlotId, { x: number; y: number }>> = {
  'left-free': { x: 6.5, y: 62.5 },
  jersey: { x: 18.7, y: 61.2 },
  trophy: { x: 31.5, y: 59.5 },
  rank: { x: 49.9, y: 55.7 },
  badge: { x: 64.5, y: 59.5 },
  title: { x: 74.6, y: 61.2 },
  ring: { x: 83.6, y: 62.7 },
  'right-free': { x: 93.4, y: 63.2 },
};

export function showcaseIntegratedSeatContact(roomId: string, slotId: ShowcaseRoomSlotId) {
  return roomId === 'obsidian-gallery' || roomId === 'supports_gallery'
    ? OBSIDIAN_SEAT_CONTACTS[slotId]
    : undefined;
}

export type ShowcaseRoomPerspective = {
  artworkLean: number;
  artworkYaw: number;
  centerArtworkScale: number;
  centerGroundOffset: number;
  centerPedestalInclination: number;
  centerPedestalWidth: number;
  edgeGroundDrop: number;
  edgePedestalGrowth: number;
  horizontalCompression: number;
  pedestalInclination: number;
  pedestalYaw: number;
  safeBottom: number;
  sideArtworkScale: number;
  sideGroundOffset: number;
  sidePedestalWidth: number;
  vanishingPointX: number;
};

export type ResolvedShowcaseSlotPerspective = {
  artworkLean: number;
  artworkScale: number;
  artworkYaw: number;
  groundOffset: number;
  horizontalOffset: number;
  isCenter: boolean;
  pedestalInclination: number;
  pedestalWidth: number;
  pedestalYaw: number;
};

export type ShowcasePedestalAssetGeometry = {
  bottomInset: number;
  heightScale: number;
  opaqueWidthRatio: number;
  seatY: number;
  seatWidthRatio: number;
};

const SAFE_HORIZONTAL_INSET = 2;

const DEFAULT_ROOM_PERSPECTIVE: ShowcaseRoomPerspective = {
  artworkLean: 0.7,
  artworkYaw: 2.4,
  centerArtworkScale: 1.3,
  centerGroundOffset: 7,
  centerPedestalInclination: 0.64,
  centerPedestalWidth: 15.5,
  edgeGroundDrop: 3,
  edgePedestalGrowth: 0.7,
  horizontalCompression: 1,
  pedestalInclination: 0.58,
  pedestalYaw: 4,
  safeBottom: 80,
  sideArtworkScale: 1,
  sideGroundOffset: 3.5,
  sidePedestalWidth: 7,
  vanishingPointX: 50,
};

function roomPerspective(
  overrides: Partial<ShowcaseRoomPerspective>,
): ShowcaseRoomPerspective {
  return { ...DEFAULT_ROOM_PERSPECTIVE, ...overrides };
}

const OBSIDIAN_GALLERY_PERSPECTIVE = roomPerspective({
  centerGroundOffset: 7.2,
  centerPedestalInclination: 0.66,
  centerPedestalWidth: 15.5,
  edgeGroundDrop: 2.6,
  edgePedestalGrowth: 0.35,
  horizontalCompression: 0.99,
  pedestalInclination: 0.5,
  pedestalYaw: 3,
  sideGroundOffset: 3,
  sidePedestalWidth: 7.2,
});

const BRONZE_SANCTUM_PERSPECTIVE = roomPerspective({
  centerGroundOffset: 7.6,
  centerPedestalInclination: 0.67,
  centerPedestalWidth: 15.5,
  edgeGroundDrop: 2.8,
  edgePedestalGrowth: 0.42,
  pedestalInclination: 0.54,
  pedestalYaw: 3.2,
  sideGroundOffset: 3.2,
  sidePedestalWidth: 7,
});

const AZURE_HORIZON_PERSPECTIVE = roomPerspective({
  artworkYaw: 2.8,
  centerGroundOffset: 7.4,
  centerPedestalInclination: 0.65,
  centerPedestalWidth: 15.5,
  edgeGroundDrop: 3.4,
  edgePedestalGrowth: 0.54,
  horizontalCompression: 1.02,
  pedestalInclination: 0.56,
  pedestalYaw: 4.5,
  sideGroundOffset: 3.1,
  sidePedestalWidth: 6.9,
});

const ORBITAL_STATION_PERSPECTIVE = roomPerspective({
  artworkLean: 0.45,
  centerGroundOffset: 7.2,
  centerPedestalInclination: 0.64,
  centerPedestalWidth: 15.5,
  edgeGroundDrop: 2.7,
  edgePedestalGrowth: 0.42,
  pedestalInclination: 0.51,
  pedestalYaw: 3.4,
  sideGroundOffset: 3,
  sidePedestalWidth: 7.15,
});

const NEON_HANGAR_PERSPECTIVE = roomPerspective({
  artworkYaw: 2.6,
  centerGroundOffset: 7.4,
  centerPedestalInclination: 0.65,
  centerPedestalWidth: 15.5,
  edgeGroundDrop: 3.1,
  edgePedestalGrowth: 0.5,
  pedestalInclination: 0.54,
  pedestalYaw: 4.2,
  sideGroundOffset: 3.2,
  sidePedestalWidth: 7.1,
});

const VOLCANIC_FORGE_PERSPECTIVE = roomPerspective({
  artworkLean: 0.55,
  centerGroundOffset: 7.1,
  centerPedestalInclination: 0.67,
  centerPedestalWidth: 15.5,
  edgeGroundDrop: 2.5,
  edgePedestalGrowth: 0.42,
  horizontalCompression: 0.99,
  pedestalInclination: 0.57,
  pedestalYaw: 3.2,
  sideGroundOffset: 3.3,
  sidePedestalWidth: 7.2,
});

// Compatibility presenters reuse the room artwork but keep their denser legacy slot grids.
const BRONZE_SUPPORTS_PERSPECTIVE = roomPerspective({
  ...BRONZE_SANCTUM_PERSPECTIVE,
  sidePedestalWidth: 6.2,
});

const AZURE_SUPPORTS_PERSPECTIVE = roomPerspective({
  ...AZURE_HORIZON_PERSPECTIVE,
  centerPedestalWidth: 13,
  sidePedestalWidth: 4.75,
});

const NEON_PROTOCOL_PERSPECTIVE = roomPerspective({
  artworkLean: 0.5,
  artworkYaw: 3,
  centerGroundOffset: 7.8,
  centerPedestalInclination: 0.61,
  centerPedestalWidth: 18,
  edgeGroundDrop: 4,
  edgePedestalGrowth: 0.66,
  pedestalInclination: 0.51,
  pedestalYaw: 5,
  sideGroundOffset: 3.5,
  sidePedestalWidth: 6.6,
});

const MYTHS_FORGE_PERSPECTIVE = roomPerspective({
  artworkYaw: 2.8,
  centerGroundOffset: 8.2,
  centerPedestalInclination: 0.64,
  centerPedestalWidth: 16,
  edgeGroundDrop: 4.2,
  edgePedestalGrowth: 0.7,
  pedestalInclination: 0.57,
  pedestalYaw: 4.5,
  sideGroundOffset: 3.8,
  sidePedestalWidth: 7.15,
});

const CIRCUIT_ZERO_PERSPECTIVE = roomPerspective({
  artworkLean: 0.45,
  artworkYaw: 2.7,
  centerGroundOffset: 7.6,
  centerPedestalInclination: 0.59,
  centerPedestalWidth: 22,
  edgeGroundDrop: 3.2,
  edgePedestalGrowth: 0.6,
  pedestalInclination: 0.5,
  pedestalYaw: 4,
  sideGroundOffset: 3.3,
  sidePedestalWidth: 7.15,
});

const TITANS_PERSPECTIVE = roomPerspective({
  artworkYaw: 2.6,
  centerGroundOffset: 9.5,
  centerPedestalInclination: 0.62,
  centerPedestalWidth: 16,
  edgeGroundDrop: 4.6,
  edgePedestalGrowth: 0.76,
  pedestalInclination: 0.55,
  pedestalYaw: 4,
  sideGroundOffset: 3.5,
  sidePedestalWidth: 6.9,
});

const FREEFALL_PERSPECTIVE = roomPerspective({
  artworkLean: 0.5,
  artworkYaw: 2.8,
  centerGroundOffset: 8,
  centerPedestalInclination: 0.6,
  centerPedestalWidth: 15,
  edgeGroundDrop: 3.5,
  edgePedestalGrowth: 0.62,
  horizontalCompression: 1.05,
  pedestalInclination: 0.5,
  pedestalYaw: 4.2,
  sideGroundOffset: 3.2,
  sidePedestalWidth: 6.5,
});

const FROST_PERSPECTIVE = roomPerspective({
  artworkYaw: 2.5,
  centerArtworkScale: 1.45,
  centerGroundOffset: 12.5,
  centerPedestalInclination: 0.63,
  centerPedestalWidth: 17,
  edgeGroundDrop: 8.5,
  edgePedestalGrowth: 1,
  pedestalInclination: 0.63,
  pedestalYaw: 4,
  sideGroundOffset: 3.7,
  sidePedestalWidth: 7.06,
});

const ARCANE_PERSPECTIVE = roomPerspective({
  artworkLean: 0.8,
  artworkYaw: 3,
  centerGroundOffset: 9.5,
  centerPedestalInclination: 0.65,
  centerPedestalWidth: 15.5,
  edgeGroundDrop: 3,
  edgePedestalGrowth: 0.72,
  pedestalInclination: 0.62,
  pedestalYaw: 5,
  sideGroundOffset: 4.5,
  safeBottom: 77.5,
  sidePedestalWidth: 7.05,
});

const TURBO_PERSPECTIVE = roomPerspective({
  artworkLean: 0.55,
  artworkYaw: 2.8,
  centerGroundOffset: 7.7,
  centerPedestalInclination: 0.62,
  centerPedestalWidth: 19,
  edgeGroundDrop: 3.8,
  edgePedestalGrowth: 0.74,
  pedestalInclination: 0.53,
  pedestalYaw: 4.5,
  sideGroundOffset: 3.4,
  sidePedestalWidth: 7.1,
});

const LAST_ROUND_PERSPECTIVE = roomPerspective({
  artworkLean: 0.45,
  artworkYaw: 2.8,
  centerGroundOffset: 8,
  centerPedestalInclination: 0.63,
  centerPedestalWidth: 15.8,
  edgeGroundDrop: 4.2,
  edgePedestalGrowth: 0.82,
  pedestalInclination: 0.55,
  pedestalYaw: 4.5,
  sideGroundOffset: 3.5,
  safeBottom: 79.5,
  sidePedestalWidth: 7.05,
});

const FNATIC_PERSPECTIVE = roomPerspective({
  artworkYaw: 2.8,
  centerGroundOffset: 7.8,
  centerPedestalInclination: 0.64,
  centerPedestalWidth: 18,
  edgeGroundDrop: 3.7,
  edgePedestalGrowth: 0.8,
  pedestalInclination: 0.52,
  pedestalYaw: 4.5,
  sideGroundOffset: 3.3,
  sidePedestalWidth: 6.8,
});

const KC_PERSPECTIVE = roomPerspective({
  artworkYaw: 3,
  centerGroundOffset: 7.6,
  centerPedestalInclination: 0.63,
  centerPedestalWidth: 18,
  edgeGroundDrop: 3.8,
  edgePedestalGrowth: 0.8,
  pedestalInclination: 0.51,
  pedestalYaw: 4.8,
  sideGroundOffset: 3.2,
  sidePedestalWidth: 6.7,
});

const M8_PERSPECTIVE = roomPerspective({
  artworkLean: 0.5,
  artworkYaw: 2.7,
  centerGroundOffset: 7.7,
  centerPedestalInclination: 0.65,
  centerPedestalWidth: 18,
  edgeGroundDrop: 3.6,
  edgePedestalGrowth: 0.7,
  pedestalInclination: 0.53,
  pedestalYaw: 4.3,
  sideGroundOffset: 3.3,
  sidePedestalWidth: 6.8,
});

const LEAGUE_COLLECTION_PERSPECTIVE = roomPerspective({
  artworkYaw: 2.5,
  centerGroundOffset: 8.4,
  centerPedestalInclination: 0.63,
  centerPedestalWidth: 21,
  edgeGroundDrop: 4.1,
  edgePedestalGrowth: 0.8,
  pedestalInclination: 0.55,
  pedestalYaw: 4,
  sideGroundOffset: 3.5,
  sidePedestalWidth: 7,
});

const VALORANT_COLLECTION_PERSPECTIVE = roomPerspective({
  artworkLean: 0.55,
  artworkYaw: 2.7,
  centerGroundOffset: 8.2,
  centerPedestalInclination: 0.62,
  centerPedestalWidth: 21,
  edgeGroundDrop: 4,
  edgePedestalGrowth: 0.8,
  pedestalInclination: 0.54,
  pedestalYaw: 4.2,
  sideGroundOffset: 3.4,
  sidePedestalWidth: 7,
});

const ROCKET_COLLECTION_PERSPECTIVE = roomPerspective({
  artworkLean: 0.5,
  artworkYaw: 2.6,
  centerGroundOffset: 8.5,
  centerPedestalInclination: 0.65,
  centerPedestalWidth: 21.5,
  edgeGroundDrop: 4.2,
  edgePedestalGrowth: 0.9,
  pedestalInclination: 0.57,
  pedestalYaw: 4.2,
  sideGroundOffset: 3.6,
  sidePedestalWidth: 7.1,
});

export const SHOWCASE_ROOM_PERSPECTIVES: Readonly<Record<string, ShowcaseRoomPerspective>> = {
  'obsidian-gallery': OBSIDIAN_GALLERY_PERSPECTIVE,
  supports_gallery: OBSIDIAN_GALLERY_PERSPECTIVE,
  'bronze-sanctum': BRONZE_SANCTUM_PERSPECTIVE,
  supports_forge: BRONZE_SUPPORTS_PERSPECTIVE,
  'azure-horizon': AZURE_HORIZON_PERSPECTIVE,
  supports_halo: AZURE_SUPPORTS_PERSPECTIVE,
  'orbital-station': ORBITAL_STATION_PERSPECTIVE,
  supports_crystal: ORBITAL_STATION_PERSPECTIVE,
  'neon-hangar': NEON_HANGAR_PERSPECTIVE,
  supports_vault: NEON_HANGAR_PERSPECTIVE,
  'volcanic-forge': VOLCANIC_FORGE_PERSPECTIVE,
  supports_champagne: VOLCANIC_FORGE_PERSPECTIVE,
  'neon-protocol-vector-pedestals': NEON_PROTOCOL_PERSPECTIVE,
  'mythes-forge-magma-pedestals': MYTHS_FORGE_PERSPECTIVE,
  'circuit-zero-aero-pedestals': CIRCUIT_ZERO_PERSPECTIVE,
  'sang-des-titans-monolith-pedestal': TITANS_PERSPECTIVE,
  'chute-libre-drop-pedestal': FREEFALL_PERSPECTIVE,
  'serment-du-givre-ice-sheet-pedestal': FROST_PERSPECTIVE,
  'conclave-arcanique-rosette-pedestal': ARCANE_PERSPECTIVE,
  'turbo-arena-kickoff-pedestal': TURBO_PERSPECTIVE,
  'dernier-round-extraction-pedestal': LAST_ROUND_PERSPECTIVE,
  'fnatic-pedestals': FNATIC_PERSPECTIVE,
  'kc-pedestals': KC_PERSPECTIVE,
  'm8-pedestals': M8_PERSPECTIVE,
  'lol-jinx-fishbones-gallery': LEAGUE_COLLECTION_PERSPECTIVE,
  'valorant-jett-gallery': VALORANT_COLLECTION_PERSPECTIVE,
  'rocket-league-octane-gallery': ROCKET_COLLECTION_PERSPECTIVE,
};

const DEFAULT_PEDESTAL_GEOMETRY: ShowcasePedestalAssetGeometry = {
  bottomInset: 0.06,
  heightScale: 1,
  opaqueWidthRatio: 0.92,
  seatY: 0.3,
  seatWidthRatio: 0.88,
};

const SHOWCASE_PEDESTAL_GEOMETRIES: Readonly<Record<string, ShowcasePedestalAssetGeometry>> = {
  'chute-libre-drop-pedestal': { bottomInset: 0.1582, heightScale: 1.13, opaqueWidthRatio: 0.9219, seatY: 0.36, seatWidthRatio: 0.87 },
  'circuit-zero-aero-pedestals': { bottomInset: 0.0742, heightScale: 1.02, opaqueWidthRatio: 0.9557, seatY: 0.19, seatWidthRatio: 0.914 },
  'conclave-arcanique-rosette-pedestal': { bottomInset: 0.0508, heightScale: 0.95, opaqueWidthRatio: 0.8607, seatY: 0.33, seatWidthRatio: 0.93 },
  'dernier-round-extraction-pedestal': { bottomInset: 0.0938, heightScale: 1.03, opaqueWidthRatio: 0.9453, seatY: 0.29, seatWidthRatio: 0.944 },
  'mythes-forge-magma-pedestals': { bottomInset: 0.0645, heightScale: 1, opaqueWidthRatio: 0.9688, seatY: 0.22, seatWidthRatio: 0.712 },
  'neon-protocol-vector-pedestals': { bottomInset: 0.0234, heightScale: 0.86, opaqueWidthRatio: 0.7604, seatY: 0.13, seatWidthRatio: 0.966 },
  'sang-des-titans-monolith-pedestal': { bottomInset: 0.0508, heightScale: 0.97, opaqueWidthRatio: 0.9193, seatY: 0.25, seatWidthRatio: 0.831 },
  'serment-du-givre-ice-sheet-pedestal': { bottomInset: 0.0508, heightScale: 0.98, opaqueWidthRatio: 0.9258, seatY: 0.335, seatWidthRatio: 0.945 },
  'turbo-arena-kickoff-pedestal': { bottomInset: 0.1152, heightScale: 1.08, opaqueWidthRatio: 0.9427, seatY: 0.365, seatWidthRatio: 0.957 },
};

export function showcaseRoomPerspectiveById(id: string) {
  return SHOWCASE_ROOM_PERSPECTIVES[id] ?? DEFAULT_ROOM_PERSPECTIVE;
}

export function hasShowcaseRoomPerspective(id: string) {
  return Boolean(SHOWCASE_ROOM_PERSPECTIVES[id]);
}

export function showcasePedestalAssetGeometry(id: string) {
  return SHOWCASE_PEDESTAL_GEOMETRIES[id] ?? DEFAULT_PEDESTAL_GEOMETRY;
}

export function hasShowcasePedestalAssetGeometry(id: string) {
  return Boolean(SHOWCASE_PEDESTAL_GEOMETRIES[id]);
}

export function resolveShowcaseSlotPerspective(
  roomId: string,
  slot: ShowcaseRoomSlotDefinition,
): ResolvedShowcaseSlotPerspective {
  const profile = showcaseRoomPerspectiveById(roomId);
  const slotCenterX = Number.parseFloat(slot.left) + Number.parseFloat(slot.width) / 2;
  const projectedCenterX = profile.vanishingPointX
    + (slotCenterX - profile.vanishingPointX) * profile.horizontalCompression;
  const sideSpan = projectedCenterX < profile.vanishingPointX
    ? profile.vanishingPointX
    : 100 - profile.vanishingPointX;
  const lateral = Math.max(-1, Math.min(
    1,
    (projectedCenterX - profile.vanishingPointX) / Math.max(1, sideSpan),
  ));
  const edge = Math.abs(lateral) ** 3;
  const isCenter = Math.abs(lateral) <= 0.16;
  const requestedGroundOffset = slot.pedestalGroundOffset ?? (isCenter
    ? profile.centerGroundOffset
    : profile.sideGroundOffset + profile.edgeGroundDrop * edge);
  const slotBottom = Number.parseFloat(slot.top) + Number.parseFloat(slot.height);
  const groundOffset = Math.min(requestedGroundOffset, profile.safeBottom - slotBottom);
  const desiredPedestalWidth = isCenter
    ? profile.centerPedestalWidth
    : profile.sidePedestalWidth + profile.edgePedestalGrowth * edge;
  const maximumPedestalWidth = 2 * Math.max(1, Math.min(
    projectedCenterX - SAFE_HORIZONTAL_INSET,
    100 - SAFE_HORIZONTAL_INSET - projectedCenterX,
  ));

  return {
    artworkLean: -lateral * profile.artworkLean,
    artworkScale: isCenter ? profile.centerArtworkScale : profile.sideArtworkScale,
    artworkYaw: -lateral * profile.artworkYaw,
    groundOffset,
    horizontalOffset: projectedCenterX - slotCenterX,
    isCenter,
    pedestalInclination: isCenter
      ? profile.centerPedestalInclination
      : profile.pedestalInclination,
    pedestalWidth: Math.min(desiredPedestalWidth, maximumPedestalWidth),
    pedestalYaw: -lateral * profile.pedestalYaw,
  };
}
