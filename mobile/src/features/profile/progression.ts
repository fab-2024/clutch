import type { BadgeRarity, LevelState, ProfileBadge } from './types';
import { toNumber } from './utils';

const RARITY_XP: Record<BadgeRarity, number> = {
  commun: 200,
  rare: 400,
  epique: 800,
  legendaire: 1200,
  mythique: 2000,
};

const XP_PRONO_REGLE = 30;
const XP_PRONO_GAGNE = 20;
const XP_SAISON = 500;
const XP_CALL = 300;

export function calculateProfileXp(recap: Record<string, unknown>, badges: ProfileBadge[]) {
  const badgeXp = badges
    .filter((badge) => badge.obtained)
    .reduce((total, badge) => total + RARITY_XP[badge.rarity], 0);

  return badgeXp
    + toNumber(recap.paris) * XP_PRONO_REGLE
    + toNumber(recap.gagnes) * XP_PRONO_GAGNE
    + toNumber(recap.saisons_jouees) * XP_SAISON
    + toNumber(recap.calls_gagnes) * XP_CALL
    + toNumber(recap.xp_quetes);
}

export function levelFromXp(xp: number): LevelState {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 30));
  const floor = 30 * level * level;
  const ceiling = 30 * (level + 1) * (level + 1);
  const progress = Math.max(0, Math.min(1, (xp - floor) / Math.max(1, ceiling - floor)));
  const title = level >= 30
    ? 'Légende'
    : level >= 25
      ? 'Vétéran'
      : level >= 20
        ? 'Expert des Frags'
        : level >= 15
          ? 'Fin renard'
          : level >= 10
            ? 'Analyste'
            : level >= 5
              ? 'Habitué'
              : 'Recrue';

  const prestige = level >= 50
    ? 'clutch'
    : level >= 35
      ? 'master'
      : level >= 20
        ? 'elite'
        : level >= 10
          ? 'challenger'
          : level >= 5
            ? 'initie'
            : 'recrue';
  const prestigeLabel = {
    recrue: 'Recrue',
    initie: 'Initié',
    challenger: 'Challenger',
    elite: 'Elite',
    master: 'Master',
    clutch: 'CLUTCH',
  }[prestige];

  return {
    xp,
    level,
    title,
    prestige,
    prestigeLabel,
    progress,
    remaining: Math.max(0, ceiling - xp),
  };
}
