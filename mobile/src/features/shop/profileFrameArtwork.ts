import { INDIVIDUAL_PROFILE_FRAMES } from './atelierCatalog';
import type { EquippedCosmetic, EquippedCosmetics } from './types';

export function profileFrameArtwork(frame: EquippedCosmetic | null | undefined) {
  return INDIVIDUAL_PROFILE_FRAMES.find((candidate) => candidate.id === frame?.id)?.image;
}

export function profileAvatarArtworkSize(cosmetics: EquippedCosmetics | null | undefined, size: number) {
  return profileFrameArtwork(cosmetics?.frame)
    ? Math.max(12, Math.round(size * 0.72))
    : Math.max(18, size - 6);
}
