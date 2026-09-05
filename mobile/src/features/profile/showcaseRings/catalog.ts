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
    description: 'Les segments d’un cadran temporel bleu argenté s’allument progressivement.',
    family: 'ritual',
    name: 'Rituel',
  },
  countercurrent: {
    accent: '#FF4DB7',
    description: 'Une flèche stable traverse un courant opposé qui devient toujours plus puissant.',
    family: 'countercurrent',
    name: 'Contre-courant',
  },
  clean_sweep: {
    accent: '#FFC34A',
    description: 'Une étoile compacte ouvre ses branches et accueille de nouveaux éclats.',
    family: 'clean_sweep',
    name: 'Carton plein',
  },
  ascension: {
    accent: '#3F8FFF',
    description: 'Chaque compétition maîtrisée ajoute un chevron vers le sommet.',
    family: 'ascension',
    name: 'Ascension',
  },
  duelist: {
    accent: '#FF554D',
    description: 'Un bouclier fendu dont les lames, les protections et les cicatrices évoluent.',
    family: 'duelist',
    name: 'Duelliste',
  },
  pact: {
    accent: '#43E08F',
    description: 'Deux arcs se rapprochent autour du noyau et multiplient leurs connexions.',
    family: 'pact',
    name: 'Pacte',
  },
  echo: {
    accent: '#34D7FF',
    description: 'Des ondes cyan gagnent en nombre et en portée depuis un cadre carré ouvert.',
    family: 'echo',
    name: 'Écho',
  },
  metamorphosis: {
    accent: '#4FE7E0',
    description: 'Un cocon de cristal irisé déploie ses pétales jusqu’à libérer son noyau.',
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
    { name: 'Germe', threshold: 1, condition: 'Rester actif pendant 1 semaine consécutive' },
    { name: 'Éveil', threshold: 4, condition: 'Rester actif pendant 4 semaines consécutives' },
    { name: 'Manifestation', threshold: 8, condition: 'Rester actif pendant 8 semaines consécutives' },
    { name: 'Ascendance', threshold: 16, condition: 'Rester actif pendant 16 semaines consécutives' },
    { name: 'Apogée', threshold: 32, condition: 'Rester actif pendant 32 semaines consécutives' },
  ],
  countercurrent: [
    { name: 'Germe', threshold: 1, condition: 'Réussir 1 call outsider' },
    { name: 'Éveil', threshold: 3, condition: 'Réussir 3 calls à contre-courant' },
    { name: 'Manifestation', threshold: 5, condition: 'Réussir 5 calls à contre-courant' },
    { name: 'Ascendance', threshold: 10, condition: 'Réussir 10 calls à contre-courant' },
    { name: 'Apogée', threshold: 25, condition: 'Réussir 25 calls à contre-courant' },
  ],
  clean_sweep: [
    { name: 'Germe', threshold: 1, condition: 'Réussir 1 call de placement' },
    { name: 'Éveil', threshold: 2, condition: 'Réussir 2 calls de placement' },
    { name: 'Manifestation', threshold: 3, condition: 'Réussir 3 calls de placement' },
    { name: 'Ascendance', threshold: 4, condition: 'Réussir 4 calls de placement' },
    { name: 'Apogée', threshold: 5, condition: 'Réussir les 5 calls de placement' },
  ],
  ascension: [
    { name: 'Germe', threshold: 1, condition: 'Réussir un call dans 1 compétition' },
    { name: 'Éveil', threshold: 2, condition: 'Réussir un call dans 2 compétitions' },
    { name: 'Manifestation', threshold: 3, condition: 'Réussir un call dans 3 compétitions' },
    { name: 'Ascendance', threshold: 5, condition: 'Réussir un call dans 5 compétitions' },
    { name: 'Apogée', threshold: 8, condition: 'Réussir un call dans 8 compétitions' },
  ],
  duelist: [
    { name: 'Germe', threshold: 1, condition: 'Remporter 1 duel' },
    { name: 'Éveil', threshold: 5, condition: 'Remporter 5 duels' },
    { name: 'Manifestation', threshold: 10, condition: 'Remporter 10 duels' },
    { name: 'Ascendance', threshold: 25, condition: 'Remporter 25 duels' },
    { name: 'Apogée', threshold: 50, condition: 'Remporter 50 duels' },
  ],
  pact: [
    { name: 'Germe', threshold: 1, condition: 'Réussir 1 call synchronisé avec un ami' },
    { name: 'Éveil', threshold: 2, condition: 'Réussir 2 calls synchronisés avec un ami' },
    { name: 'Manifestation', threshold: 3, condition: 'Réussir 3 calls synchronisés avec un ami' },
    { name: 'Ascendance', threshold: 5, condition: 'Réussir 5 calls synchronisés avec un ami' },
    { name: 'Apogée', threshold: 10, condition: 'Réussir 10 calls synchronisés avec un ami' },
  ],
  echo: [
    { name: 'Germe', threshold: 1, condition: 'Effectuer 1 call officiel' },
    { name: 'Éveil', threshold: 25, condition: 'Effectuer 25 calls officiels' },
    { name: 'Manifestation', threshold: 100, condition: 'Effectuer 100 calls officiels' },
    { name: 'Ascendance', threshold: 500, condition: 'Effectuer 500 calls officiels' },
    { name: 'Apogée', threshold: 1000, condition: 'Effectuer 1 000 calls officiels' },
  ],
  metamorphosis: [
    { name: 'Germe', threshold: 1, condition: 'Réussir 1 retour après une série de défaites' },
    { name: 'Éveil', threshold: 2, condition: 'Réussir 2 retours après une série de défaites' },
    { name: 'Manifestation', threshold: 3, condition: 'Réussir 3 retours après une série de défaites' },
    { name: 'Ascendance', threshold: 5, condition: 'Réussir 5 retours après une série de défaites' },
    { name: 'Apogée', threshold: 10, condition: 'Réussir 10 retours après une série de défaites' },
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
