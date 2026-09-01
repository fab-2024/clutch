import type { ImageSourcePropType } from 'react-native';

export type ActivePlayerAvatarId =
  | 'chaos-smile'
  | 'void-dragon'
  | 'gale-agent'
  | 'shadow-agent'
  | 'cyber-sentinel'
  | 'octane-stripe'
  | 'spirit-fox'
  | 'wind-blade'
  | 'forest-scout'
  | 'astral-agent'
  | 'flame-duelist'
  | 'street-blue'
  | 'orbital-orange'
  | 'hotrod-red'
  | 'racer-lime';

export type LegacyPlayerAvatarId =
  | 'muscle-violet'
  | 'armored-cyan'
  | 'supercar-gold'
  | 'formula-magenta'
  | 'hypercar-white';

export type PlayerAvatarId = ActivePlayerAvatarId | LegacyPlayerAvatarId;

export type PlayerAvatar = {
  id: ActivePlayerAvatarId;
  label: string;
  accent: string;
  source: ImageSourcePropType;
  sheet: { width: number; height: number };
  crop: { x: number; y: number; size: number };
};

const ORIGINAL_AVATARS = require('../../../../assets/avatars/griff-avatars-original-v2.png');

const originalAvatarSheet = { width: 1614, height: 974 } as const;
const tileSize = 310;
const columns = [6, 329, 652, 974, 1297] as const;
const rows = [7, 332, 656] as const;

export const PLAYER_AVATARS: readonly PlayerAvatar[] = [
  avatar('chaos-smile', 'Sentinelle prisme', '#22DFF7', 0, 0),
  avatar('void-dragon', 'Oracle neurale', '#22DFF7', 1, 0),
  avatar('gale-agent', 'Drone pulsar', '#22DFF7', 2, 0),
  avatar('shadow-agent', 'Ranger Nova', '#22DFF7', 3, 0),
  avatar('cyber-sentinel', 'Chacal cyber', '#22DFF7', 4, 0),
  avatar('octane-stripe', 'Gardienne braise', '#FF7622', 0, 1),
  avatar('spirit-fox', 'Colosse magma', '#FF7622', 1, 1),
  avatar('wind-blade', 'Cerf ardent', '#FF7622', 2, 1),
  avatar('forest-scout', 'Griffon ardent', '#FF7622', 3, 1),
  avatar('astral-agent', 'Chevalier forge', '#FF7622', 4, 1),
  avatar('flame-duelist', 'Pilote ionique', '#C6FF16', 0, 2),
  avatar('street-blue', 'Pilote halo', '#C6FF16', 1, 2),
  avatar('orbital-orange', 'Racer néon', '#C6FF16', 2, 2),
  avatar('hotrod-red', 'Ingénieure nocturne', '#C6FF16', 3, 2),
  avatar('racer-lime', 'Noyau orbital', '#C6FF16', 4, 2),
];

const avatarsById = new Map(PLAYER_AVATARS.map((item) => [item.id, item]));
const legacyAvatarAliases: Record<LegacyPlayerAvatarId, ActivePlayerAvatarId> = {
  'muscle-violet': 'flame-duelist',
  'armored-cyan': 'street-blue',
  'supercar-gold': 'orbital-orange',
  'formula-magenta': 'hotrod-red',
  'hypercar-white': 'racer-lime',
};

export function playerAvatarById(id?: string | null) {
  if (!id) return null;
  const activeAvatar = avatarsById.get(id as ActivePlayerAvatarId);
  if (activeAvatar) return activeAvatar;

  const replacementId = legacyReplacementId(id);
  return replacementId ? avatarsById.get(replacementId) ?? null : null;
}

export function isPlayerAvatarId(value: unknown): value is PlayerAvatarId {
  return typeof value === 'string'
    && (avatarsById.has(value as ActivePlayerAvatarId) || legacyReplacementId(value) !== null);
}

function legacyReplacementId(id: string) {
  return Object.prototype.hasOwnProperty.call(legacyAvatarAliases, id)
    ? legacyAvatarAliases[id as LegacyPlayerAvatarId]
    : null;
}

function avatar(
  id: ActivePlayerAvatarId,
  label: string,
  accent: string,
  column: 0 | 1 | 2 | 3 | 4,
  row: 0 | 1 | 2,
): PlayerAvatar {
  return {
    id,
    label,
    accent,
    source: ORIGINAL_AVATARS,
    sheet: originalAvatarSheet,
    crop: { x: columns[column], y: rows[row], size: tileSize },
  };
}
