import { Redirect } from 'expo-router';

import type { HubData, HubMatch } from '../types';
import { HubExperience } from './HubScreen';

const PREVIEW_HUB: HubData = {
  seasonId: 'preview-season',
  seasonName: 'Saison Zéro',
  frags: {
    frags: 1842,
    pic_frags: 1917,
    pronostics_regles: 35,
    pronostics_gagnes: 24,
    placements_restants: 0,
    provisoire: false,
  },
  streak: 7,
  nextMatch: previewMatch('g2-fnatic', 3, 'lol', 'G2 Esports', 'G2', 'Fnatic', 'FNC', 'LEC Summer', 3),
  upNext: [
    previewMatch('kc-bds', 8, 'lol', 'Karmine Corp', 'KC', 'Team BDS', 'BDS', 'LEC Summer', 3),
    previewMatch('th-gx', 27, 'valorant', 'Team Heretics', 'TH', 'GiantX', 'GX', 'VCT EMEA', 3),
    previewMatch('navi-faze', 51, 'cs2', 'Natus Vincere', 'NAVI', 'FaZe Clan', 'FAZE', 'BLAST Premier', 3),
  ],
  nextMatchPrediction: null,
  predictionsToday: 2,
  leagueCount: 4,
  faction: {
    equipeId: 'preview-faction',
    nom: 'Karmine Corp',
    tag: 'KC',
    jeu: 'lol',
    membres: 1284,
    niveauAtteint: 6,
    croissance24h: 38,
  },
};

export default function HubPreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <HubExperience
      error={null}
      hub={PREVIEW_HUB}
      loading={false}
      profileName="Pierre-Louis"
      refreshing={false}
      onRefresh={noop}
      onRetry={noop}
    />
  );
}

function previewMatch(
  id: string,
  hoursFromNow: number,
  jeu: string,
  equipeA: string,
  tagA: string,
  equipeB: string,
  tagB: string,
  evenement: string,
  format: number,
): HubMatch {
  return {
    id,
    debut: new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString(),
    jeu,
    equipe_a: equipeA,
    tag_a: tagA,
    equipe_b: equipeB,
    tag_b: tagB,
    evenement,
    format,
    statut: 'a_venir',
  };
}

function noop() {}
