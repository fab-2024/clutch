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
  access: 'free';
  source: ImageSourcePropType;
  sheet: { width: number; height: number };
  crop: { x: number; y: number; size: number };
};

// Keep persisted IDs stable: existing profiles adopt the replacement portraits.
const ORIGINAL_AVATARS = require('../../../../assets/avatars/clutch-avatars-free-15.png');

const originalAvatarSheet = { width: 1536, height: 1024 } as const;
const tileSize = 246;
const columns = [43, 345, 645, 946, 1247] as const;
const rows = [92, 390, 695] as const;

export const PLAYER_AVATARS: readonly PlayerAvatar[] = [
  avatar('chaos-smile', 'Spectre', '#D94242', 0, 0),
  avatar('void-dragon', 'Nova', '#37BDEB', 1, 0),
  avatar('gale-agent', 'Vector', '#74C773', 2, 0),
  avatar('shadow-agent', 'Glitch', '#AC63F2', 3, 0),
  avatar('cyber-sentinel', 'Bulwark', '#F6B143', 4, 0),
  avatar('octane-stripe', 'Ember', '#F47438', 0, 1),
  avatar('spirit-fox', 'Ronin', '#D95741', 1, 1),
  avatar('wind-blade', 'Nyx', '#AD8CF4', 2, 1),
  avatar('forest-scout', 'Orion', '#7EB9FF', 3, 1),
  avatar('astral-agent', 'Sylva', '#9BAD58', 4, 1),
  avatar('flame-duelist', 'K.O.', '#E35050', 0, 2),
  avatar('street-blue', 'Boost', '#F89A38', 1, 2),
  avatar('orbital-orange', 'Byte', '#44DDF5', 2, 2),
  avatar('hotrod-red', 'Fang', '#E4C15D', 3, 2),
  avatar('racer-lime', 'Ace', '#E8C442', 4, 2),
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
    access: 'free',
    source: ORIGINAL_AVATARS,
    sheet: originalAvatarSheet,
    crop: { x: columns[column], y: rows[row], size: tileSize },
  };
}
