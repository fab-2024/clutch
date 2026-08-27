import { Redirect } from 'expo-router';

import type { MatchCenterData } from '../types';
import MatchCenterScreen from './MatchCenterScreen';

const PREVIEW_MATCH_CENTER: MatchCenterData = {
  match: {
    id: 'preview-open-g2-fnc',
    saison_id: 'preview-season',
    debut: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    jeu: 'lol',
    equipe_a: 'G2 Esports',
    tag_a: 'G2',
    equipe_b: 'Fnatic',
    tag_b: 'FNC',
    evenement: 'LEC Summer Split',
    format: 5,
    statut: 'a_venir',
    score_a: null,
    score_b: null,
    prediction: null,
  },
  projection: {
    match_id: 'preview-open-g2-fnc',
    choix: [
      { cle: 'a', proba: 0.57, gain: 19, perte: 23 },
      { cle: 'b', proba: 0.43, gain: 23, perte: 19 },
    ],
    placements_restants: 3,
    k: 40,
    source: 'modèle_clutch',
    figee_le: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  prediction: null,
  callContext: {
    match_id: 'preview-open-g2-fnc',
    participants: 84,
    ferme_le: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    verrouille_le: null,
    distribution: null,
    regle_resolution: {
      cle: 'vainqueur_match',
      libelle: 'Vainqueur de la série',
      detail: 'Le call est réussi si l’équipe choisie remporte le score final de la série.',
    },
    prediction: null,
    source_resultat: null,
    source_resultat_label: null,
    identifiant_resultat_externe: null,
    revision_resultat: 0,
    resultat_corrige: false,
  },
  related: [],
};

export default function MatchCenterPreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <MatchCenterScreen previewData={PREVIEW_MATCH_CENTER} />;
}
