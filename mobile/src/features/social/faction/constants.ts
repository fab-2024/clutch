import type { CommunityForm } from './types';

export const COMMUNITY_FORMS: CommunityForm[] = [
  { level: 1, code: 'I', name: 'Fiole', threshold: 0, reward: 0, phrase: 'Le noyau vient de s’allumer.' },
  { level: 2, code: 'II', name: 'Flacon', threshold: 10, reward: 200, phrase: 'L’élixir commence à tenir sa charge.' },
  { level: 3, code: 'III', name: 'Bombonne', threshold: 50, reward: 300, phrase: 'La faction devient impossible à ignorer.' },
  { level: 4, code: 'IV', name: 'Calice', threshold: 100, reward: 500, phrase: 'Le récipient devient un véritable artefact.' },
  { level: 5, code: 'V', name: 'Alambic', threshold: 500, reward: 750, phrase: 'La charge se raffine au lieu de simplement grossir.' },
  { level: 6, code: 'VI', name: 'Cornue', threshold: 1000, reward: 1000, phrase: 'Le réacteur devient instable — dans le bon sens.' },
  { level: 7, code: 'VII', name: 'Océan', threshold: 5000, reward: 1500, phrase: 'La faction est devenue son propre environnement.' },
];
