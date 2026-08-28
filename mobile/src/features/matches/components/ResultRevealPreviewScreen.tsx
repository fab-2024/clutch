import { Redirect, useLocalSearchParams } from 'expo-router';

import type { MatchJourneySnapshot } from '../matchJourney';
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
  frags_avant: 1243,
  frags_apres: 1261,
  rang_avant: 427,
  rang_apres: 381,
  verdicts_avant: 8,
  verdicts_apres: 9,
  grade_avant: {
    classe: true,
    objectif_placements: 0,
    placements_restants: 0,
    progression: 0.965,
    cle: 'or',
    libelle: 'Or',
    ordre: 2,
    minimum: 1050,
    plafond: 1250,
    prochaine_cle: 'platine',
    prochain_libelle: 'Platine',
    prochain_minimum: 1250,
  },
  grade_apres: {
    classe: true,
    objectif_placements: 0,
    placements_restants: 0,
    progression: 0.055,
    cle: 'platine',
    libelle: 'Platine',
    ordre: 3,
    minimum: 1250,
    plafond: 1450,
    prochaine_cle: 'diamant',
    prochain_libelle: 'Diamant',
    prochain_minimum: 1450,
  },
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
  source_resultat_label: 'Validation GRIFF',
  identifiant_resultat_externe: 'clutch:preview-final-kc-fnc:2-1',
  revision_resultat: 1,
  resultat_corrige: false,
  regle_resolution: {
    cle: 'vainqueur_match',
    libelle: 'Vainqueur de la série',
    detail: 'Le call est réussi si l’équipe choisie remporte le score final de la série.',
  },
  restants: 1,
};

export default function ResultRevealPreviewScreen() {
  const params = useLocalSearchParams<{ state?: string | string[] }>();
  const state = Array.isArray(params.state) ? params.state[0] : params.state;
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <ResultRevealScreen
      previewData={PREVIEW_RESULT}
      previewTransition={state === 'transition' ? previewSnapshot(PREVIEW_RESULT) : undefined}
      previewTransitionSource="match"
    />
  );
}

function previewSnapshot(result: MatchResultReveal): MatchJourneySnapshot {
  return {
    accentA: null,
    accentB: null,
    event: result.evenement,
    format: result.format,
    game: result.jeu,
    logoA: null,
    logoB: null,
    matchId: result.match_id,
    scoreA: result.score_a,
    scoreB: result.score_b,
    tagA: result.tag_a,
    tagB: result.tag_b,
    teamA: result.equipe_a,
    teamB: result.equipe_b,
  };
}
