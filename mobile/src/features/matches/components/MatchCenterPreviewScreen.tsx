import { Redirect } from 'expo-router';

import type { MatchCenterData } from '../types';
import MatchCenterScreen from './MatchCenterScreen';

const PREVIEW_MATCH_CENTER: MatchCenterData = {
  match: {
    id: 'preview-final-kc-fnc',
    saison_id: 'preview-season',
    debut: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    jeu: 'lol',
    equipe_a: 'Karmine Corp',
    tag_a: 'KC',
    equipe_b: 'Fnatic',
    tag_b: 'FNC',
    evenement: 'LEC Summer',
    format: 3,
    statut: 'termine',
    score_a: 2,
    score_b: 1,
    prediction: { match_id: 'preview-final-kc-fnc', choix: 'a', statut: 'gagne', delta_frags: 18 },
  },
  projection: {
    match_id: 'preview-final-kc-fnc',
    choix: [
      { cle: 'a', proba: 0.61, gain: 18, perte: 25 },
      { cle: 'b', proba: 0.39, gain: 25, perte: 18 },
    ],
    placements_restants: 0,
    k: 40,
    source: 'modèle_clutch',
    figee_le: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  prediction: {
    id: 'preview-prediction',
    match_id: 'preview-final-kc-fnc',
    choix: 'a',
    statut: 'gagne',
    proba_figee: 0.61,
    proba_scoring: 0.61,
    k_frags: 40,
    delta_frags: 18,
  },
  callContext: {
    match_id: 'preview-final-kc-fnc',
    participants: 128,
    ferme_le: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    verrouille_le: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    distribution: { total: 128, a: 78, b: 50, a_pct: 60.9, b_pct: 39.1 },
    regle_resolution: {
      cle: 'vainqueur_match',
      libelle: 'Vainqueur de la série',
      detail: 'Le call est réussi si l’équipe choisie remporte le score final de la série.',
    },
    prediction: {
      id: 'preview-prediction',
      match_id: 'preview-final-kc-fnc',
      choix: 'a',
      statut: 'gagne',
      proba_figee: 0.61,
      proba_scoring: 0.61,
      k_frags: 40,
      delta_frags: 18,
    },
    source_resultat: 'validation_clutch',
    source_resultat_label: 'Validation Clutch',
  },
  related: [],
};

export default function MatchCenterPreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <MatchCenterScreen previewData={PREVIEW_MATCH_CENTER} />;
}
