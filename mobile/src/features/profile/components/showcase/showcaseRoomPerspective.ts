import type { ShowcaseRoomSlotDefinition } from './roomEditor';

export type ShowcaseRoomPerspective = {
  artworkLean: number;
  artworkYaw: number;
  centerGroundOffset: number;
  centerPedestalInclination: number;
  centerPedestalWidth: number;
  edgeGroundDrop: number;
  edgePedestalGrowth: number;
  pedestalInclination: number;
  pedestalYaw: number;
  sideGroundOffset: number;
  sidePedestalWidth: number;
  vanishingPointX: number;
};

export type ResolvedShowcaseSlotPerspective = {
  artworkLean: number;
  artworkYaw: number;
  groundOffset: number;
  isCenter: boolean;
  pedestalInclination: number;
  pedestalWidth: number;
  pedestalYaw: number;
};

export type ShowcasePedestalAssetGeometry = {
  bottomInset: number;
  opaqueWidthRatio: number;
  seatY: number;
};

const DEFAULT_ROOM_PERSPECTIVE: ShowcaseRoomPerspective = {
  artworkLean: 0.7,
  artworkYaw: 2.4,
  centerGroundOffset: 7,
  centerPedestalInclination: 0.64,
  centerPedestalWidth: 18,
  edgeGroundDrop: 3,
  edgePedestalGrowth: 4.5,
  pedestalInclination: 0.58,
  pedestalYaw: 4,
  sideGroundOffset: 3.5,
  sidePedestalWidth: 7.8,
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
  centerPedestalWidth: 17.5,
  edgeGroundDrop: 2.6,
  edgePedestalGrowth: 3.5,
  pedestalInclination: 0.5,
  pedestalYaw: 3,
  sideGroundOffset: 3,
  sidePedestalWidth: 8.1,
});

const BRONZE_SANCTUM_PERSPECTIVE = roomPerspective({
  centerGroundOffset: 7.6,
  centerPedestalInclination: 0.67,
  centerPedestalWidth: 18,
  edgeGroundDrop: 2.8,
  edgePedestalGrowth: 3.8,
  pedestalInclination: 0.54,
  pedestalYaw: 3.2,
  sideGroundOffset: 3.2,
  sidePedestalWidth: 8,
});

const AZURE_HORIZON_PERSPECTIVE = roomPerspective({
  artworkYaw: 2.8,
  centerGroundOffset: 7.4,
  centerPedestalInclination: 0.65,
  centerPedestalWidth: 18,
  edgeGroundDrop: 3.4,
  edgePedestalGrowth: 4.4,
  pedestalInclination: 0.56,
  pedestalYaw: 4.5,
  sideGroundOffset: 3.1,
  sidePedestalWidth: 7.8,
});

const ORBITAL_STATION_PERSPECTIVE = roomPerspective({
  artworkLean: 0.45,
  centerGroundOffset: 7.2,
  centerPedestalInclination: 0.64,
  centerPedestalWidth: 17.5,
  edgeGroundDrop: 2.7,
  edgePedestalGrowth: 3.8,
  pedestalInclination: 0.51,
  pedestalYaw: 3.4,
  sideGroundOffset: 3,
  sidePedestalWidth: 8,
});

const NEON_HANGAR_PERSPECTIVE = roomPerspective({
  artworkYaw: 2.6,
  centerGroundOffset: 7.4,
  centerPedestalInclination: 0.65,
  centerPedestalWidth: 18,
  edgeGroundDrop: 3.1,
  edgePedestalGrowth: 4.2,
  pedestalInclination: 0.54,
  pedestalYaw: 4.2,
  sideGroundOffset: 3.2,
  sidePedestalWidth: 7.8,
});

const VOLCANIC_FORGE_PERSPECTIVE = roomPerspective({
  artworkLean: 0.55,
  centerGroundOffset: 7.1,
  centerPedestalInclination: 0.67,
  centerPedestalWidth: 18.5,
  edgeGroundDrop: 2.5,
  edgePedestalGrowth: 3.8,
  pedestalInclination: 0.57,
  pedestalYaw: 3.2,
  sideGroundOffset: 3.3,
  sidePedestalWidth: 8,
});

const NEON_PROTOCOL_PERSPECTIVE = roomPerspective({
  artworkLean: 0.5,
  artworkYaw: 3,
  centerGroundOffset: 7.8,
  centerPedestalInclination: 0.61,
  centerPedestalWidth: 18,
  edgeGroundDrop: 4,
  edgePedestalGrowth: 5,
  pedestalInclination: 0.51,
  pedestalYaw: 5,
  sideGroundOffset: 3.5,
  sidePedestalWidth: 7.5,
});

const MYTHS_FORGE_PERSPECTIVE = roomPerspective({
  artworkYaw: 2.8,
  centerGroundOffset: 8.2,
  centerPedestalInclination: 0.64,
  centerPedestalWidth: 19,
  edgeGroundDrop: 4.2,
  edgePedestalGrowth: 5.2,
  pedestalInclination: 0.57,
  pedestalYaw: 4.5,
  sideGroundOffset: 3.8,
  sidePedestalWidth: 7.7,
});

const CIRCUIT_ZERO_PERSPECTIVE = roomPerspective({
  artworkLean: 0.45,
  artworkYaw: 2.7,
  centerGroundOffset: 7.6,
  centerPedestalInclination: 0.59,
  centerPedestalWidth: 22,
  edgeGroundDrop: 3.2,
  edgePedestalGrowth: 4.7,
  pedestalInclination: 0.5,
  pedestalYaw: 4,
  sideGroundOffset: 3.3,
  sidePedestalWidth: 7.7,
});

const TITANS_PERSPECTIVE = roomPerspective({
  artworkYaw: 2.6,
  centerGroundOffset: 9.5,
  centerPedestalInclination: 0.62,
  centerPedestalWidth: 20,
  edgeGroundDrop: 4.6,
  edgePedestalGrowth: 5.5,
  pedestalInclination: 0.55,
  pedestalYaw: 4,
  sideGroundOffset: 3.5,
  sidePedestalWidth: 7.5,
});

const FREEFALL_PERSPECTIVE = roomPerspective({
  artworkLean: 0.5,
  artworkYaw: 2.8,
  centerGroundOffset: 8,
  centerPedestalInclination: 0.6,
  centerPedestalWidth: 18.5,
  edgeGroundDrop: 3.5,
  edgePedestalGrowth: 4.8,
  pedestalInclination: 0.5,
  pedestalYaw: 4.2,
  sideGroundOffset: 3.2,
  sidePedestalWidth: 7.7,
});

const FROST_PERSPECTIVE = roomPerspective({
  artworkYaw: 2.5,
  centerGroundOffset: 7,
  centerPedestalInclination: 0.66,
  centerPedestalWidth: 19.5,
  edgeGroundDrop: 8.5,
  edgePedestalGrowth: 9,
  pedestalInclination: 0.63,
  pedestalYaw: 4,
  sideGroundOffset: 3.7,
  sidePedestalWidth: 7.5,
});

const ARCANE_PERSPECTIVE = roomPerspective({
  artworkLean: 0.8,
  artworkYaw: 3,
  centerGroundOffset: 9.5,
  centerPedestalInclination: 0.65,
  centerPedestalWidth: 18.8,
  edgeGroundDrop: 3,
  edgePedestalGrowth: 5.3,
  pedestalInclination: 0.62,
  pedestalYaw: 5,
  sideGroundOffset: 4.5,
  sidePedestalWidth: 7.6,
});

const TURBO_PERSPECTIVE = roomPerspective({
  artworkLean: 0.55,
  artworkYaw: 2.8,
  centerGroundOffset: 7.7,
  centerPedestalInclination: 0.62,
  centerPedestalWidth: 19,
  edgeGroundDrop: 3.8,
  edgePedestalGrowth: 5.4,
  pedestalInclination: 0.53,
  pedestalYaw: 4.5,
  sideGroundOffset: 3.4,
  sidePedestalWidth: 7.6,
});

const LAST_ROUND_PERSPECTIVE = roomPerspective({
  artworkLean: 0.45,
  artworkYaw: 2.8,
  centerGroundOffset: 8,
  centerPedestalInclination: 0.63,
  centerPedestalWidth: 20,
  edgeGroundDrop: 4.2,
  edgePedestalGrowth: 5.8,
  pedestalInclination: 0.55,
  pedestalYaw: 4.5,
  sideGroundOffset: 3.5,
  sidePedestalWidth: 7.5,
});

const FNATIC_PERSPECTIVE = roomPerspective({
  artworkYaw: 2.8,
  centerGroundOffset: 7.8,
  centerPedestalInclination: 0.64,
  centerPedestalWidth: 18,
  edgeGroundDrop: 3.7,
  edgePedestalGrowth: 5,
  pedestalInclination: 0.52,
  pedestalYaw: 4.5,
  sideGroundOffset: 3.3,
  sidePedestalWidth: 7.7,
});

const KC_PERSPECTIVE = roomPerspective({
  artworkYaw: 3,
  centerGroundOffset: 7.6,
  centerPedestalInclination: 0.63,
  centerPedestalWidth: 18,
  edgeGroundDrop: 3.8,
  edgePedestalGrowth: 5.1,
  pedestalInclination: 0.51,
  pedestalYaw: 4.8,
  sideGroundOffset: 3.2,
  sidePedestalWidth: 7.6,
});

const M8_PERSPECTIVE = roomPerspective({
  artworkLean: 0.5,
  artworkYaw: 2.7,
  centerGroundOffset: 7.7,
  centerPedestalInclination: 0.65,
  centerPedestalWidth: 18,
  edgeGroundDrop: 3.6,
  edgePedestalGrowth: 4.9,
  pedestalInclination: 0.53,
  pedestalYaw: 4.3,
  sideGroundOffset: 3.3,
  sidePedestalWidth: 7.7,
});

const LEAGUE_COLLECTION_PERSPECTIVE = roomPerspective({
  artworkYaw: 2.5,
  centerGroundOffset: 8.4,
  centerPedestalInclination: 0.63,
  centerPedestalWidth: 21,
  edgeGroundDrop: 4.1,
  edgePedestalGrowth: 5.5,
  pedestalInclination: 0.55,
  pedestalYaw: 4,
  sideGroundOffset: 3.5,
  sidePedestalWidth: 8,
});

const VALORANT_COLLECTION_PERSPECTIVE = roomPerspective({
  artworkLean: 0.55,
  artworkYaw: 2.7,
  centerGroundOffset: 8.2,
  centerPedestalInclination: 0.62,
  centerPedestalWidth: 21,
  edgeGroundDrop: 4,
  edgePedestalGrowth: 5.4,
  pedestalInclination: 0.54,
  pedestalYaw: 4.2,
  sideGroundOffset: 3.4,
  sidePedestalWidth: 8,
});

const ROCKET_COLLECTION_PERSPECTIVE = roomPerspective({
  artworkLean: 0.5,
  artworkYaw: 2.6,
  centerGroundOffset: 8.5,
  centerPedestalInclination: 0.65,
  centerPedestalWidth: 21.5,
  edgeGroundDrop: 4.2,
  edgePedestalGrowth: 5.7,
  pedestalInclination: 0.57,
  pedestalYaw: 4.2,
  sideGroundOffset: 3.6,
  sidePedestalWidth: 8.1,
});

export const SHOWCASE_ROOM_PERSPECTIVES: Readonly<Record<string, ShowcaseRoomPerspective>> = {
  'obsidian-gallery': OBSIDIAN_GALLERY_PERSPECTIVE,
  supports_gallery: OBSIDIAN_GALLERY_PERSPECTIVE,
  'bronze-sanctum': BRONZE_SANCTUM_PERSPECTIVE,
  supports_forge: BRONZE_SANCTUM_PERSPECTIVE,
  'azure-horizon': AZURE_HORIZON_PERSPECTIVE,
  supports_halo: AZURE_HORIZON_PERSPECTIVE,
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
  opaqueWidthRatio: 0.92,
  seatY: 0.3,
};

const SHOWCASE_PEDESTAL_GEOMETRIES: Readonly<Record<string, ShowcasePedestalAssetGeometry>> = {
  'chute-libre-drop-pedestal': { bottomInset: 0.1582, opaqueWidthRatio: 0.9219, seatY: 0.31 },
  'circuit-zero-aero-pedestal': { bottomInset: 0.0742, opaqueWidthRatio: 0.9557, seatY: 0.22 },
  'conclave-arcanique-rosette-pedestal': { bottomInset: 0.0508, opaqueWidthRatio: 0.8607, seatY: 0.33 },
  'dernier-round-extraction-pedestal': { bottomInset: 0.0938, opaqueWidthRatio: 0.9453, seatY: 0.34 },
  'mythes-forge-magma-pedestals': { bottomInset: 0.0645, opaqueWidthRatio: 0.9688, seatY: 0.31 },
  'neon-protocol-vector-pedestals': { bottomInset: 0.0234, opaqueWidthRatio: 0.7604, seatY: 0.13 },
  'sang-des-titans-monolith-pedestal': { bottomInset: 0.0508, opaqueWidthRatio: 0.9193, seatY: 0.31 },
  'serment-du-givre-ice-sheet-pedestal': { bottomInset: 0.0508, opaqueWidthRatio: 0.9258, seatY: 0.31 },
  'turbo-arena-kickoff-pedestal': { bottomInset: 0.1152, opaqueWidthRatio: 0.9427, seatY: 0.27 },
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

export function resolveShowcaseSlotPerspective(
  roomId: string,
  slot: ShowcaseRoomSlotDefinition,
): ResolvedShowcaseSlotPerspective {
  const profile = showcaseRoomPerspectiveById(roomId);
  const slotCenterX = Number.parseFloat(slot.left) + Number.parseFloat(slot.width) / 2;
  const sideSpan = slotCenterX < profile.vanishingPointX
    ? profile.vanishingPointX
    : 100 - profile.vanishingPointX;
  const lateral = Math.max(-1, Math.min(
    1,
    (slotCenterX - profile.vanishingPointX) / Math.max(1, sideSpan),
  ));
  const edge = Math.abs(lateral) ** 3;
  const isCenter = Math.abs(lateral) <= 0.16;
  const groundOffset = slot.pedestalGroundOffset ?? (isCenter
    ? profile.centerGroundOffset
    : profile.sideGroundOffset + profile.edgeGroundDrop * edge);

  return {
    artworkLean: -lateral * profile.artworkLean,
    artworkYaw: -lateral * profile.artworkYaw,
    groundOffset,
    isCenter,
    pedestalInclination: isCenter
      ? profile.centerPedestalInclination
      : profile.pedestalInclination,
    pedestalWidth: isCenter
      ? profile.centerPedestalWidth
      : profile.sidePedestalWidth + profile.edgePedestalGrowth * edge,
    pedestalYaw: -lateral * profile.pedestalYaw,
  };
}
