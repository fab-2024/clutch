import type { AchievementBadgeDefinition, BadgeId } from './types';

export const ACHIEVEMENT_BADGE_CATALOG: readonly AchievementBadgeDefinition[] = [
  { id: 'first_signal', name: 'Premier Signal', description: 'Le premier verdict inscrit dans ton parcours officiel.', condition: 'Obtenir le verdict de son premier call officiel.', category: 'calls', rarity: 'common', visualFamily: 'circular-target-cyan', accent: '#31D7E2', isSecret: false },
  { id: 'versatile', name: 'Polyvalent', description: 'Tes lectures restent justes sur plusieurs terrains.', condition: 'Réussir au moins un call dans 5 compétitions différentes.', category: 'calls', rarity: 'rare', visualFamily: 'compass-five', accent: '#4DD9F1', isSecret: false },
  { id: 'perfect_eclipse', name: 'Éclipse parfaite', description: 'Tes cinq premiers verdicts n’ont laissé aucune ombre.', condition: 'Réussir ses 5 premiers calls officiels.', category: 'secret', rarity: 'secret', visualFamily: 'revealed-eclipse', sealedVisualFamily: 'sealed-eclipse', accent: '#31D7E2', isSecret: true, clue: 'Cinq décisions. Aucune ombre.' },
  { id: 'countercurrent', name: 'Contre-courant', description: 'Tu as lu juste quand presque tous les autres regardaient ailleurs.', condition: 'Réussir un call choisi par 10 % des participants ou moins.', category: 'secret', rarity: 'secret', visualFamily: 'revealed-countercurrent', sealedVisualFamily: 'sealed-countercurrent', accent: '#E8FF3D', isSecret: true, clue: 'La foule regardait ailleurs.' },
  { id: 'resurgence', name: 'Résurgence', description: 'Une série neuve s’est élevée depuis trois chutes consécutives.', condition: 'Après 3 calls incorrects consécutifs, réussir 5 calls consécutifs.', category: 'secret', rarity: 'secret', visualFamily: 'revealed-resurgence', sealedVisualFamily: 'sealed-resurgence', accent: '#FF9C42', isSecret: true, clue: 'La chute n’était pas la fin.' },
  { id: 'synchrony', name: 'Synchronie', description: 'Deux trajectoires ont produit trois verdicts identiques et justes.', condition: 'Réussir avec un ami les mêmes 3 calls consécutifs.', category: 'secret', rarity: 'secret', visualFamily: 'revealed-synchrony', sealedVisualFamily: 'sealed-synchrony', accent: '#6F7DFF', isSecret: true, clue: 'Deux signaux, une trajectoire.' },
  { id: 'zero_chronicle', name: 'Chronique Zéro', description: 'Aucune semaine de la saison complète ne manque au registre.', condition: 'Effectuer au moins un call validé chaque semaine d’une saison complète.', category: 'secret', rarity: 'secret', visualFamily: 'revealed-chronicle', sealedVisualFamily: 'sealed-chronicle', accent: '#E8EEF3', isSecret: true, clue: 'Aucune semaine ne manque.' },
] as const;

export const ACHIEVEMENT_BADGE_BY_ID = new Map<BadgeId, AchievementBadgeDefinition>(
  ACHIEVEMENT_BADGE_CATALOG.map((badge) => [badge.id, badge]),
);
