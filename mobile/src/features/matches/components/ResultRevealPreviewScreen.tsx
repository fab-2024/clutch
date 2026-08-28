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
      previewCeremonyProgress={ceremonyProgressForState(state)}
      previewData={previewResultForState(state)}
      previewReduceMotion={state === 'promotion-reduced'}
      previewTransition={state === 'transition' ? previewSnapshot(PREVIEW_RESULT) : undefined}
      previewTransitionSource="match"
    />
  );
}

function ceremonyProgressForState(state?: string) {
  switch (state) {
    case 'promotion-verdict': return .21;
    case 'promotion-frags': return .42;
    case 'promotion-threshold': return .62;
    case 'promotion-emblem': return .82;
    case 'promotion-final': return 1;
    default: return undefined;
  }
}

function previewResultForState(state?: string): MatchResultReveal {
  if (state === 'replay') {
    return { ...PREVIEW_RESULT, revele_le: new Date().toISOString() };
  }
  if (state === 'stable' || state === 'loss') {
    const loss = state === 'loss';
    return {
      ...PREVIEW_RESULT,
      statut: loss ? 'perdu' : 'gagne',
      delta_frags: loss ? -12 : 4,
      frags_apres: loss ? 1231 : 1247,
      score_a: loss ? 1 : PREVIEW_RESULT.score_a,
      score_b: loss ? 2 : PREVIEW_RESULT.score_b,
      grade_apres: {
        ...PREVIEW_RESULT.grade_avant,
        progression: loss ? .905 : .985,
      },
    };
  }
  return PREVIEW_RESULT;
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
