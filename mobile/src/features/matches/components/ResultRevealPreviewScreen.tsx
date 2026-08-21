import { Redirect } from 'expo-router';

import type { MatchResultReveal } from '../types';
import ResultRevealScreen from './ResultRevealScreen';

const PREVIEW_RESULT: MatchResultReveal = {
  id: 'preview-result-kc-fnc',
  match_id: 'preview-final-kc-fnc',
  saison_id: 'preview-season',
  statut: 'gagne',
  choix: 'a',
  proba_figee: 0.55,
  delta_frags: 18,
  frags_avant: 1193,
  frags_apres: 1211,
  rang_avant: 427,
  rang_apres: 381,
  verdicts_avant: 8,
  verdicts_apres: 9,
  grade_avant: {
    classe: true,
    objectif_placements: 5,
    placements_restants: 0,
    progression: 0.97,
    cle: 'recrue',
    libelle: 'Recrue',
    ordre: 0,
    minimum: 0,
    plafond: 1200,
    prochaine_cle: 'challenger',
    prochain_libelle: 'Challenger',
    prochain_minimum: 1200,
  },
  grade_apres: {
    classe: true,
    objectif_placements: 5,
    placements_restants: 0,
    progression: 0.0275,
    cle: 'challenger',
    libelle: 'Challenger',
    ordre: 1,
    minimum: 1200,
    plafond: 1600,
    prochaine_cle: 'elite',
    prochain_libelle: 'Élite',
    prochain_minimum: 1600,
  },
  objectif_placements: 5,
  regle_le: new Date().toISOString(),
  revele_le: null,
  equipe_a: 'Karmine Corp',
  equipe_b: 'Fnatic',
  tag_a: 'KC',
  tag_b: 'FNC',
  score_a: 2,
  score_b: 1,
  jeu: 'lol',
  evenement: 'LEC Summer',
  format: 3,
  debut: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  source_resultat: 'validation_clutch',
  source_resultat_label: 'Validation Clutch',
  regle_resolution: {
    cle: 'vainqueur_match',
    libelle: 'Vainqueur de la série',
    detail: 'Le call est réussi si l’équipe choisie remporte le score final de la série.',
  },
  restants: 1,
};

export default function ResultRevealPreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ResultRevealScreen previewData={PREVIEW_RESULT} />;
}
