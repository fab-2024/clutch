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
    grade: {
      classe: true,
      objectif_placements: 5,
      placements_restants: 0,
      progression: 0.61,
      cle: 'elite',
      libelle: 'Élite',
      ordre: 2,
      minimum: 1600,
      plafond: 2000,
      prochaine_cle: 'master',
      prochain_libelle: 'Master',
      prochain_minimum: 2000,
    },
    rang: 128,
    percentile: 86.4,
    joueurs_classes: 942,
    meilleur_grade: { cle: 'elite', libelle: 'Élite', ordre: 2, minimum: 1600 },
    meilleur_rang: 96,
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
  recentResult: {
    id: 'preview-prediction',
    matchId: 'preview-result',
    status: 'gagne',
    choice: 'a',
    deltaFrags: 34,
    resolvedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    game: 'lol',
    event: 'LEC Summer',
    teamA: 'G2 Esports',
    tagA: 'G2',
    teamB: 'Fnatic',
    tagB: 'FNC',
    scoreA: 2,
    scoreB: 1,
  },
  factionMission: {
    id: 'preview-faction-mission',
    title: 'Verrouiller 12 calls en faction',
    goal: 12,
    progress: 8,
    personalContribution: 2,
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    completed: false,
    participants: 6,
    team: { id: 'preview-faction', name: 'Karmine Corp', tag: 'KC', logo: null },
  },
  latestReward: {
    id: 'preview-reward',
    name: 'Trace électrique',
    family: 'cadre',
    slot: 'cadre_profil',
    rarity: 'rare',
    styleKey: 'electric-trace',
    accent: '#E8FF3D',
    source: 'mission',
    acquiredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
};

export default function HubPreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <HubExperience
      error={null}
      headerEconomy={{ frags: 1842, volts: 680 }}
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
