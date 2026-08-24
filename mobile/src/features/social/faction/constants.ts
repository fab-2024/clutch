import type { CommunityForm } from './types';

export const COMMUNITY_FORMS: CommunityForm[] = [
  {
    state: 'dormant', level: 0, code: '0', name: 'Dormant', threshold: 0, reward: 0,
    phrase: 'Le cœur attend sa première impulsion.', container: 'ampoule', intensity: 0,
    coreBottom: 92, visualScale: 1.08,
  },
  {
    state: 'ampoule', level: 1, code: 'I', name: 'Ampoule', threshold: 1, reward: 0,
    phrase: 'Une première racine vient de s’éveiller.', container: 'ampoule', intensity: .22,
    coreBottom: 92, visualScale: 1.08,
  },
  {
    state: 'fiole', level: 2, code: 'II', name: 'Fiole', threshold: 100, reward: 200,
    phrase: 'Le liquide commence à répondre au cœur.', container: 'fiole', intensity: .4,
    coreBottom: 47, visualScale: .97,
  },
  {
    state: 'flacon', level: 3, code: 'III', name: 'Flacon', threshold: 500, reward: 300,
    phrase: 'Les ramifications gagnent tout le récipient.', container: 'flacon', intensity: .58,
    coreBottom: 43, visualScale: .96,
  },
  {
    state: 'reacteur', level: 4, code: 'IV', name: 'Bonbonne', threshold: 2_000, reward: 500,
    phrase: 'La pression collective devient instable.', container: 'reacteur', intensity: .78,
    coreBottom: 42, visualScale: .9,
  },
  {
    state: 'reliquaire', level: 5, code: 'V', name: 'Cuve', threshold: 5_000, reward: 1_000,
    phrase: 'Le cœur est contenu par une armature cérémonielle.', container: 'reliquaire', intensity: 1,
    coreBottom: 57, visualScale: .89,
  },
  {
    state: 'awakened', level: 6, code: '∞', name: 'Cœur éveillé', threshold: 10_000, reward: 1_500,
    phrase: 'La relique maîtrise enfin toute sa puissance.', container: 'reliquaire', intensity: .88,
    coreBottom: 72, visualScale: .89,
  },
];

export const RELIC_TOTAL_AWAKENING = 10_000;

export const RELIC_MUTATION_THRESHOLDS = COMMUNITY_FORMS
  .filter((form) => form.level >= 2)
  .map((form) => form.threshold);
