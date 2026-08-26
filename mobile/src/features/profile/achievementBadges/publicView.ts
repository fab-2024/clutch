import type {
  AchievementBadge,
  AchievementBadgeDefinition,
  AchievementBadgeEvaluation,
  LockedSecretBadgeView,
  PublicAchievementBadge,
} from './types';

export function getPublicBadgeView(
  definition: AchievementBadgeDefinition,
  playerBadgeState: AchievementBadgeEvaluation,
): PublicAchievementBadge {
  if (definition.isSecret && !playerBadgeState.obtained) {
    return {
      id: definition.id,
      key: definition.id,
      name: 'Badge mystère',
      category: 'secret',
      family: 'Mystère',
      rarity: 'secret',
      visualFamily: definition.sealedVisualFamily ?? definition.visualFamily,
      accent: '#59646D',
      isSecret: true,
      clue: definition.clue ?? '',
      obtained: false,
      locked: true,
      dataAvailable: playerBadgeState.dataAvailable,
    } satisfies LockedSecretBadgeView;
  }

  return {
    id: definition.id,
    key: definition.id,
    name: definition.name,
    description: definition.description,
    condition: definition.condition,
    category: definition.category,
    family: categoryLabel(definition.category),
    rarity: definition.rarity,
    visualFamily: definition.visualFamily,
    accent: definition.accent,
    isSecret: definition.isSecret,
    clue: definition.clue,
    obtained: playerBadgeState.obtained,
    locked: !playerBadgeState.obtained,
    dataAvailable: playerBadgeState.dataAvailable,
    unlockedAt: playerBadgeState.unlockedAt,
    seasonId: playerBadgeState.seasonId,
    progress: playerBadgeState.progress,
  } satisfies AchievementBadge;
}

export function projectPublicBadgeCollection(evaluations: readonly AchievementBadgeEvaluation[]) {
  return evaluations.map((evaluation) => getPublicBadgeView(evaluation.definition, evaluation));
}

export function isLockedSecretBadge(
  badge: PublicAchievementBadge,
): badge is LockedSecretBadgeView {
  return badge.isSecret && !badge.obtained;
}

function categoryLabel(category: AchievementBadgeDefinition['category']) {
  if (category === 'calls') return 'Calls';
  if (category === 'social') return 'Social';
  if (category === 'faction') return 'Faction';
  if (category === 'season') return 'Saison';
  return 'Mystère';
}
