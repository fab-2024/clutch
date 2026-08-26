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
    accent: '#31D7E2',
    description: 'Ton parcours classé cristallisé dans une structure de graphite et de saphir.',
    family: 'rank',
    name: 'Rang',
  },
  streak: {
    accent: '#B8E62E',
    description: 'Une cadence vivante qui se densifie tant que ton activité reste ininterrompue.',
    family: 'streak',
    name: 'Série',
  },
  faction: {
    accent: '#E2A04D',
    description: 'La trace durable de tes contributions à ta faction.',
    family: 'faction',
    name: 'Faction',
  },
  major: {
    accent: '#7FA7FF',
    description: 'Les accomplissements majeurs conservés dans un diamant de platine.',
    family: 'major',
    name: 'Majeur',
  },
  seniority: {
    accent: '#D8B77A',
    description: 'Le temps passé dans GRIFF, inscrit dans des couronnes d’obsidienne.',
    family: 'seniority',
    name: 'Ancienneté',
  },
};

const STAGE_SEEDS: Record<ShowcaseRingFamily, readonly StageSeed[]> = {
  rank: [
    { name: 'Placement', threshold: 0, condition: 'Commencer le parcours classé' },
    { name: 'Platine', threshold: 2, condition: 'Atteindre le grade Platine' },
    { name: 'Diamant', threshold: 3, condition: 'Atteindre le grade Diamant' },
    { name: 'Élite', threshold: 4, condition: 'Atteindre le grade Mythique' },
    { name: 'Légende', threshold: 5, condition: 'Terminer dans le top 1 % de la saison' },
  ],
  streak: [
    { name: 'Amorçage', threshold: 1, condition: 'Maintenir 1 jour d’activité' },
    { name: 'Cadence', threshold: 3, condition: 'Maintenir 3 jours consécutifs' },
    { name: 'Série', threshold: 7, condition: 'Maintenir 7 jours consécutifs' },
    { name: 'Surcharge', threshold: 14, condition: 'Maintenir 14 jours consécutifs' },
    { name: 'Inarrêtable', threshold: 30, condition: 'Maintenir 30 jours consécutifs' },
  ],
  faction: [
    { name: 'Recrue', threshold: 1, condition: 'Apporter 1 contribution à la faction' },
    { name: 'Membre', threshold: 25, condition: 'Apporter 25 contributions cumulées' },
    { name: 'Pilier', threshold: 100, condition: 'Apporter 100 contributions cumulées' },
    { name: 'Champion', threshold: 350, condition: 'Apporter 350 contributions cumulées' },
    { name: 'Icône de faction', threshold: 1000, condition: 'Apporter 1 000 contributions cumulées' },
  ],
  major: [
    { name: 'Qualifié', threshold: 1, condition: 'Valider 1 accomplissement majeur' },
    { name: 'Finaliste', threshold: 2, condition: 'Valider 2 accomplissements majeurs' },
    { name: 'Vainqueur', threshold: 3, condition: 'Valider 3 accomplissements majeurs' },
    { name: 'Champion', threshold: 5, condition: 'Valider 5 accomplissements majeurs' },
    { name: 'Grand Chelem', threshold: 8, condition: 'Valider 8 accomplissements majeurs' },
  ],
  seniority: [
    { name: 'Première trace', threshold: 1, condition: 'Terminer 1 période GRIFF' },
    { name: 'Fidèle', threshold: 2, condition: 'Terminer 2 périodes GRIFF' },
    { name: 'Vétéran', threshold: 4, condition: 'Terminer 4 périodes GRIFF' },
    { name: 'Gardien', threshold: 8, condition: 'Terminer 8 périodes GRIFF' },
    { name: 'Héritage', threshold: 12, condition: 'Terminer 12 périodes GRIFF' },
  ],
};

export const SHOWCASE_RING_CATALOG: Record<ShowcaseRingFamily, ShowcaseRingFamilyDefinition> = {
  rank: definition('rank'),
  streak: definition('streak'),
  faction: definition('faction'),
  major: definition('major'),
  seniority: definition('seniority'),
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
