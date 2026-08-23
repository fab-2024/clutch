import { Redirect, useLocalSearchParams } from 'expo-router';

import type { HubData, HubMatch } from '../types';
import { HubExperience } from './HubScreen';

const PREVIEW_HUB: HubData = {
  seasonId: 'preview-season',
  seasonName: 'Saison Zéro',
  frags: {
    frags: 1025,
    pic_frags: 1084,
    pronostics_regles: 18,
    pronostics_gagnes: 12,
    placements_restants: 0,
    provisoire: false,
    grade: {
      classe: true,
      objectif_placements: 5,
      placements_restants: 0,
      progression: 0.875,
      cle: 'argent',
      libelle: 'Argent',
      ordre: 1,
      minimum: 850,
      plafond: 1050,
      prochaine_cle: 'or',
      prochain_libelle: 'Or',
      prochain_minimum: 1050,
    },
    rang: 128,
    percentile: 86.4,
    joueurs_classes: 942,
    meilleur_grade: { cle: 'argent', libelle: 'Argent', ordre: 1, minimum: 850 },
    meilleur_rang: 96,
  },
  streak: 7,
  nextMatch: previewMatch('g2-fnatic', 3, 'lol', 'G2 Esports', 'G2', 'Fnatic', 'FNC', 'LEC Summer', 3),
  upNext: [
    previewMatch('kc-vit', 8, 'lol', 'Karmine Corp', 'KC', 'Team Vitality', 'VIT', 'LFL', 3),
    previewMatch('t1-gen', 27, 'lol', 'T1', 'T1', 'Gen.G', 'GEN', 'LCK', 3),
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
    progress: 0,
    personalContribution: 0,
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
  const params = useLocalSearchParams<{ state?: string | string[] }>();
  if (!__DEV__) return <Redirect href="/" />;
  const previewState = normalizePreviewState(params.state);
  const nextMatch = matchForPreviewState(previewState);
  const previewHub: HubData = {
    ...PREVIEW_HUB,
    nextMatch,
    nextMatchPrediction: previewState === 'upcoming'
      ? { matchId: nextMatch.id, choice: 'a' }
      : null,
  };
  return (
    <HubExperience
      error={null}
      headerEconomy={{ frags: 1000, volts: 300 }}
      hub={previewHub}
      loading={false}
      refreshing={false}
      onRefresh={noop}
      onRetry={noop}
    />
  );
}

type PreviewMatchState = 'open' | 'upcoming' | 'live' | 'finished' | 'fallback';

function normalizePreviewState(value?: string | string[]): PreviewMatchState {
  const state = Array.isArray(value) ? value[0] : value;
  return state === 'upcoming' || state === 'live' || state === 'finished' || state === 'fallback' ? state : 'open';
}

function matchForPreviewState(state: PreviewMatchState): HubMatch {
  if (state === 'live') {
    return previewMatch('g2-fnatic-live', -1, 'lol', 'G2 Esports', 'G2', 'Fnatic', 'FNC', 'LEC Summer', 3, {
      score_a: 1,
      score_b: 0,
      statut: 'en_cours',
    });
  }
  if (state === 'finished') {
    return previewMatch('g2-fnatic-finished', -2, 'lol', 'G2 Esports', 'G2', 'Fnatic', 'FNC', 'LEC Summer', 3, {
      score_a: 2,
      score_b: 1,
      statut: 'termine',
    });
  }
  if (state === 'fallback') {
    return previewMatch('fallback-teams', 5, 'valorant', 'Northwind Academy', 'NWA', 'Arcadia Five', 'A5', 'Open Qualifier au nom volontairement long', 5, {
      couleur_a: null,
      couleur_b: null,
      logo_a: null,
      logo_b: null,
    });
  }
  return previewMatch('g2-fnatic', 3, 'lol', 'G2 Esports', 'G2', 'Fnatic', 'FNC', 'LEC Summer', 3);
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
  overrides: Partial<HubMatch> = {},
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
    score_a: null,
    score_b: null,
    logo_a: null,
    logo_b: null,
    couleur_a: null,
    couleur_b: null,
    ...overrides,
  };
}

function noop() {}
