import { SHOWCASE_RING_ASSETS } from './assets';
import type {
  ShowcaseRingFamily,
  ShowcaseRingFamilyDefinition,
  ShowcaseRingStage,
  ShowcaseRingStageDefinition,
} from './types';

type StageSeed = {
  condition: string;
  name: string;
  threshold: number;
};

const FAMILY_META: Record<ShowcaseRingFamily, Omit<ShowcaseRingFamilyDefinition, 'stages'>> = {
  rank: {
    accent: '#9A6BFF',
    description: 'Un écusson dont la couronne et le bouclier se déploient avec ton classement de saison.',
    family: 'rank',
    name: 'Élite',
  },
  streak: {
    accent: '#80F04E',
    description: 'Deux flux continus se densifient à mesure que ta série de calls justes grandit.',
    family: 'streak',
    name: 'Trace',
  },
  faction: {
    accent: '#FFB84D',
    description: 'Trois orbites se relient à mesure que les amis invités rejoignent ton cercle.',
    family: 'faction',
    name: 'Cercle',
  },
  major: {
    accent: '#31D7E2',
    description: 'Un œil-compas qui gagne des couches, des directions et de la précision.',
    family: 'major',
    name: 'Regard',
  },
  seniority: {
    accent: '#D8B77A',
    description: 'Chaque année passée dans GRIFF grave une nouvelle couronne permanente.',
    family: 'seniority',
    name: 'Héritage',
  },
  ritual: {
    accent: '#4CA7FF',
    description: 'Chaque jour distinct avec au moins un call allume un nouveau segment du cadran.',
    family: 'ritual',
    name: 'Rituel',
  },
  countercurrent: {
    accent: '#FF4DB7',
    description: 'La flèche tient quand ton choix juste réunissait moins de 30 % de la communauté.',
    family: 'countercurrent',
    name: 'Contre-courant',
  },
  clean_sweep: {
    accent: '#FFC34A',
    description: 'Chaque journée d’au moins trois calls tous justes ouvre l’étoile et ses éclats.',
    family: 'clean_sweep',
    name: 'Carton plein',
  },
  ascension: {
    accent: '#3F8FFF',
    description: 'Chaque promotion dans les ligues ajoute un chevron vers le sommet.',
    family: 'ascension',
    name: 'Ascension',
  },
  duelist: {
    accent: '#FF554D',
    description: 'Chaque duel remporté renforce les lames, les protections et les cicatrices.',
    family: 'duelist',
    name: 'Duelliste',
  },
  pact: {
    accent: '#43E08F',
    description: 'Chaque ami distinct avec lequel tu interagis renforce les connexions du pacte.',
    family: 'pact',
    name: 'Pacte',
  },
  echo: {
    accent: '#34D7FF',
    description: 'Chaque utilisateur unique qui aime ta vitrine amplifie la portée de ses ondes.',
    family: 'echo',
    name: 'Écho',
  },
  metamorphosis: {
    accent: '#4FE7E0',
    description: 'Chaque relique menée à son évolution maximale déploie davantage le cristal.',
    family: 'metamorphosis',
    name: 'Métamorphose',
  },
};

const STAGE_SEEDS: Record<ShowcaseRingFamily, readonly StageSeed[]> = {
  rank: [
    { name: 'Germe', threshold: 50, condition: 'Terminer une saison dans le top 50 %' },
    { name: 'Éveil', threshold: 80, condition: 'Terminer une saison dans le top 20 %' },
    { name: 'Manifestation', threshold: 90, condition: 'Terminer une saison dans le top 10 %' },
    { name: 'Ascendance', threshold: 95, condition: 'Terminer une saison dans le top 5 %' },
    { name: 'Apogée', threshold: 99, condition: 'Terminer une saison dans le top 1 %' },
  ],
  streak: [
    { name: 'Germe', threshold: 5, condition: 'Réussir 5 calls consécutifs' },
    { name: 'Éveil', threshold: 10, condition: 'Réussir 10 calls consécutifs' },
    { name: 'Manifestation', threshold: 15, condition: 'Réussir 15 calls consécutifs' },
    { name: 'Ascendance', threshold: 20, condition: 'Réussir 20 calls consécutifs' },
    { name: 'Apogée', threshold: 50, condition: 'Réussir 50 calls consécutifs' },
  ],
  faction: [
    { name: 'Germe', threshold: 5, condition: 'Inviter 5 amis' },
    { name: 'Éveil', threshold: 10, condition: 'Inviter 10 amis' },
    { name: 'Manifestation', threshold: 20, condition: 'Inviter 20 amis' },
    { name: 'Ascendance', threshold: 50, condition: 'Inviter 50 amis' },
    { name: 'Apogée', threshold: 100, condition: 'Inviter 100 amis' },
  ],
  major: [
    { name: 'Germe', threshold: 25, condition: 'Réussir 25 calls' },
    { name: 'Éveil', threshold: 50, condition: 'Réussir 50 calls' },
    { name: 'Manifestation', threshold: 100, condition: 'Réussir 100 calls' },
    { name: 'Ascendance', threshold: 500, condition: 'Réussir 500 calls' },
    { name: 'Apogée', threshold: 1000, condition: 'Réussir 1 000 calls' },
  ],
  seniority: [
    { name: 'Germe', threshold: 1, condition: 'Atteindre 1 an d’ancienneté' },
    { name: 'Éveil', threshold: 2, condition: 'Atteindre 2 ans d’ancienneté' },
    { name: 'Manifestation', threshold: 3, condition: 'Atteindre 3 ans d’ancienneté' },
    { name: 'Ascendance', threshold: 4, condition: 'Atteindre 4 ans d’ancienneté' },
    { name: 'Apogée', threshold: 5, condition: 'Atteindre 5 ans d’ancienneté' },
  ],
  ritual: [
    { name: 'Germe', threshold: 7, condition: 'Poser au moins un call pendant 7 jours distincts' },
    { name: 'Éveil', threshold: 30, condition: 'Poser au moins un call pendant 30 jours distincts' },
    { name: 'Manifestation', threshold: 100, condition: 'Poser au moins un call pendant 100 jours distincts' },
    { name: 'Ascendance', threshold: 250, condition: 'Poser au moins un call pendant 250 jours distincts' },
    { name: 'Apogée', threshold: 500, condition: 'Poser au moins un call pendant 500 jours distincts' },
  ],
  countercurrent: [
    { name: 'Germe', threshold: 1, condition: 'Réussir 1 call choisi par moins de 30 % de la communauté' },
    { name: 'Éveil', threshold: 5, condition: 'Réussir 5 calls choisis par moins de 30 % de la communauté' },
    { name: 'Manifestation', threshold: 15, condition: 'Réussir 15 calls choisis par moins de 30 % de la communauté' },
    { name: 'Ascendance', threshold: 40, condition: 'Réussir 40 calls choisis par moins de 30 % de la communauté' },
    { name: 'Apogée', threshold: 100, condition: 'Réussir 100 calls choisis par moins de 30 % de la communauté' },
  ],
  clean_sweep: [
    { name: 'Germe', threshold: 1, condition: 'Réaliser 1 journée parfaite avec au moins 3 calls' },
    { name: 'Éveil', threshold: 3, condition: 'Réaliser 3 journées parfaites avec au moins 3 calls' },
    { name: 'Manifestation', threshold: 10, condition: 'Réaliser 10 journées parfaites avec au moins 3 calls' },
    { name: 'Ascendance', threshold: 25, condition: 'Réaliser 25 journées parfaites avec au moins 3 calls' },
    { name: 'Apogée', threshold: 50, condition: 'Réaliser 50 journées parfaites avec au moins 3 calls' },
  ],
  ascension: [
    { name: 'Germe', threshold: 1, condition: 'Obtenir 1 promotion dans les ligues' },
    { name: 'Éveil', threshold: 2, condition: 'Obtenir 2 promotions dans les ligues' },
    { name: 'Manifestation', threshold: 4, condition: 'Obtenir 4 promotions dans les ligues' },
    { name: 'Ascendance', threshold: 7, condition: 'Obtenir 7 promotions dans les ligues' },
    { name: 'Apogée', threshold: 10, condition: 'Obtenir 10 promotions dans les ligues' },
  ],
  duelist: [
    { name: 'Germe', threshold: 1, condition: 'Remporter 1 duel' },
    { name: 'Éveil', threshold: 10, condition: 'Remporter 10 duels' },
    { name: 'Manifestation', threshold: 50, condition: 'Remporter 50 duels' },
    { name: 'Ascendance', threshold: 150, condition: 'Remporter 150 duels' },
    { name: 'Apogée', threshold: 500, condition: 'Remporter 500 duels' },
  ],
  pact: [
    { name: 'Germe', threshold: 1, condition: 'Avoir une vraie interaction avec 1 ami distinct' },
    { name: 'Éveil', threshold: 5, condition: 'Avoir une vraie interaction avec 5 amis distincts' },
    { name: 'Manifestation', threshold: 15, condition: 'Avoir une vraie interaction avec 15 amis distincts' },
    { name: 'Ascendance', threshold: 40, condition: 'Avoir une vraie interaction avec 40 amis distincts' },
    { name: 'Apogée', threshold: 100, condition: 'Avoir une vraie interaction avec 100 amis distincts' },
  ],
  echo: [
    { name: 'Germe', threshold: 5, condition: 'Recevoir des likes de 5 utilisateurs uniques sur la vitrine' },
    { name: 'Éveil', threshold: 25, condition: 'Recevoir des likes de 25 utilisateurs uniques sur la vitrine' },
    { name: 'Manifestation', threshold: 100, condition: 'Recevoir des likes de 100 utilisateurs uniques sur la vitrine' },
    { name: 'Ascendance', threshold: 500, condition: 'Recevoir des likes de 500 utilisateurs uniques sur la vitrine' },
    { name: 'Apogée', threshold: 2000, condition: 'Recevoir des likes de 2 000 utilisateurs uniques sur la vitrine' },
  ],
  metamorphosis: [
    { name: 'Germe', threshold: 1, condition: 'Amener 1 relique à son évolution maximale' },
    { name: 'Éveil', threshold: 3, condition: 'Amener 3 reliques à leur évolution maximale' },
    { name: 'Manifestation', threshold: 7, condition: 'Amener 7 reliques à leur évolution maximale' },
    { name: 'Ascendance', threshold: 15, condition: 'Amener 15 reliques à leur évolution maximale' },
    { name: 'Apogée', threshold: 30, condition: 'Amener 30 reliques à leur évolution maximale' },
  ],
};

export const SHOWCASE_RING_CATALOG: Record<ShowcaseRingFamily, ShowcaseRingFamilyDefinition> = {
  rank: definition('rank'),
  streak: definition('streak'),
  faction: definition('faction'),
  major: definition('major'),
  seniority: definition('seniority'),
  ritual: definition('ritual'),
  countercurrent: definition('countercurrent'),
  clean_sweep: definition('clean_sweep'),
  ascension: definition('ascension'),
  duelist: definition('duelist'),
  pact: definition('pact'),
  echo: definition('echo'),
  metamorphosis: definition('metamorphosis'),
};

function definition(family: ShowcaseRingFamily): ShowcaseRingFamilyDefinition {
  return {
    ...FAMILY_META[family],
    stages: STAGE_SEEDS[family].map((seed, index) => {
      const stage = (index + 1) as ShowcaseRingStage;
      return {
        assets: SHOWCASE_RING_ASSETS[family][stage],
        condition: { label: seed.condition, threshold: seed.threshold },
        name: seed.name,
        stage,
      } satisfies ShowcaseRingStageDefinition;
    }),
  };
}
