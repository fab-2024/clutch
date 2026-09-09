import { showcaseCentralPedestalBackdrop } from '@/src/features/shop/showcaseCentralPedestalCatalog';

// Source-pixel measurements of the visible base and interior, excluding PNG padding.
const DISPLAY_GEOMETRY: Readonly<Record<string, {
  width: number; height: number; baseLeft: number; baseRight: number;
  contactY: number; seatY: number; interiorTop: number; interiorWidth: number;
}>> = {
  rank_carbon_cradle: { width: 1024, height: 945, baseLeft: 151, baseRight: 860, contactY: 867, seatY: 624, interiorTop: 190, interiorWidth: 340 },
  rank_crystal_capsule: { width: 1024, height: 709, baseLeft: 292, baseRight: 727, contactY: 653, seatY: 480, interiorTop: 140, interiorWidth: 280 },
  rank_royal_crown: { width: 1024, height: 1024, baseLeft: 132, baseRight: 892, contactY: 949, seatY: 690, interiorTop: 190, interiorWidth: 380 },
  rank_orbital_core: { width: 1024, height: 596, baseLeft: 271, baseRight: 749, contactY: 545, seatY: 380, interiorTop: 108, interiorWidth: 265 },
  rank_volcanic_forge: { width: 1024, height: 628, baseLeft: 263, baseRight: 754, contactY: 550, seatY: 398, interiorTop: 128, interiorWidth: 240 },
  rank_clutch_revelation: { width: 1024, height: 1024, baseLeft: 187, baseRight: 836, contactY: 871, seatY: 675, interiorTop: 180, interiorWidth: 440 },
};

// Visible base width as a percentage of the room image. The removal mask includes
// stairs and shadows, so its width must not dictate the size of a replacement.
const ROOM_DISPLAY_BASE_WIDTH: Readonly<Record<string, number>> = {
  'volcanic-forge': 19,
  supports_champagne: 19,
  'sang-des-titans-monolith-pedestal': 20,
  'dernier-round-extraction-pedestal': 21,
  'turbo-arena-kickoff-pedestal': 21,
  'circuit-zero-aero-pedestals': 22,
  'mythes-forge-magma-pedestals': 22,
  'fnatic-pedestals': 21,
  'kc-pedestals': 21,
  'm8-pedestals': 21,
  'lol-jinx-fishbones-gallery': 22,
  'valorant-jett-gallery': 21,
  'rocket-league-octane-gallery': 21,
};

export function showcaseRankDisplayLayout({ displayId, roomId, imageLayout, viewportHeight, artworkAspectRatio = 1 }: {
  artworkAspectRatio?: number;
  viewportHeight?: number;
  displayId: string;
  roomId: string;
  imageLayout: { width: number; height: number; left: number; top: number };
}) {
  const backdrop = showcaseCentralPedestalBackdrop(roomId);
  const geometry = DISPLAY_GEOMETRY[displayId];
  if (!backdrop || !geometry) return null;
  const points = backdrop.outline.split(' ').map((point) => point.split(',').map(Number));
  const left = Math.min(...points.map(([x]) => x));
  const right = Math.max(...points.map(([x]) => x));
  const bottom = Math.max(...points.map(([, y]) => y)) - 1;
  const baseWidthPercent = ROOM_DISPLAY_BASE_WIDTH[roomId] ?? (right - left) * 0.94;
  const baseWidth = imageLayout.width * baseWidthPercent / 100;
  const centerX = imageLayout.left + imageLayout.width * (left + right) / 200;
  const groundY = imageLayout.top + imageLayout.height * bottom / 100;
  // Keep headroom in short landscape views; scale the object and display together
  // around their existing contact point instead of lifting or stretching either.
  const heightScale = viewportHeight === undefined ? Infinity
    : Math.max(1, groundY - viewportHeight * 0.12) / geometry.contactY;
  const scale = Math.min(baseWidth / (geometry.baseRight - geometry.baseLeft), heightScale);
  const top = groundY - geometry.contactY * scale;
  const artworkScale = displayId === 'rank_volcanic_forge' ? 1.1 : 1;

  return {
    image: {
      left: centerX - (geometry.baseLeft + geometry.baseRight) * scale / 2,
      top,
      width: geometry.width * scale,
      height: geometry.height * scale,
    },
    centerX,
    groundY,
    seatY: top + geometry.seatY * scale,
    maxArtworkSize: Math.min(
      geometry.interiorWidth / Math.min(artworkAspectRatio, 1),
      (geometry.seatY - geometry.interiorTop) * Math.max(artworkAspectRatio, 1),
    ) * scale * 0.96 * artworkScale,
  };
}
