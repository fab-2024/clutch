import { Redirect, useLocalSearchParams } from 'expo-router';

import { previewRoutesEnabled } from '@/src/components/dev/PreviewRoute';

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
    grade: {
      classe: true,
      objectif_placements: 0,
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
    previewMatch('kc-vit-rl', 51, 'rocket_league', 'Karmine Corp', 'KC', 'Team Vitality', 'VIT', 'RLCS Major', 5),
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
  const params = useLocalSearchParams<{
    context?: string | string[];
    rank?: string | string[];
    score?: string | string[];
    state?: string | string[];
    teams?: string | string[];
  }>();
  if (!previewRoutesEnabled) return <Redirect href="/" />;
  const previewState = normalizePreviewState(params.state);
  const previewTeams = normalizePreviewTeams(params.teams);
  const previewScore = normalizePreviewScore(params.score);
  const previewContext = normalizePreviewContext(params.context);
  const nextMatch = matchForPreviewState(previewState, previewTeams, previewScore);
  const previewHub: HubData = {
    ...PREVIEW_HUB,
    ...contextForPreview(previewContext),
    nextMatch,
    nextMatchPrediction: previewState === 'upcoming'
      ? { matchId: nextMatch.id, choice: 'a' }
      : null,
  };
  return (
    <HubExperience
      error={null}
      hub={previewHub}
      loading={false}
      refreshing={false}
      onRefresh={noop}
      onRetry={noop}
    />
  );
}

type PreviewMatchState = 'open' | 'upcoming' | 'live' | 'finished' | 'cancelled' | 'fallback';
type PreviewScoreMode = 'score' | 'none';
type PreviewTeams = 'g2-fnatic' | 'kc-vitality' | 'light-pair';
type PreviewContext = 'auto' | 'mission' | 'none' | 'result' | 'reward';

function normalizePreviewContext(value?: string | string[]): PreviewContext {
  const context = Array.isArray(value) ? value[0] : value;
  return context === 'mission' || context === 'none' || context === 'result' || context === 'reward'
    ? context
    : 'auto';
}

function contextForPreview(context: PreviewContext): Pick<HubData, 'factionMission' | 'latestReward' | 'recentResult'> {
  if (context === 'none') return { factionMission: null, latestReward: null, recentResult: null };
  if (context === 'result') return { factionMission: null, latestReward: null, recentResult: PREVIEW_HUB.recentResult };
  if (context === 'mission') return { factionMission: PREVIEW_HUB.factionMission, latestReward: null, recentResult: null };
  if (context === 'reward') return { factionMission: null, latestReward: PREVIEW_HUB.latestReward, recentResult: null };
  return {
    factionMission: PREVIEW_HUB.factionMission,
    latestReward: PREVIEW_HUB.latestReward,
    recentResult: PREVIEW_HUB.recentResult,
  };
}

function normalizePreviewState(value?: string | string[]): PreviewMatchState {
  const state = Array.isArray(value) ? value[0] : value;
  return state === 'upcoming' || state === 'live' || state === 'finished' || state === 'cancelled' || state === 'fallback' ? state : 'open';
}

function normalizePreviewTeams(value?: string | string[]): PreviewTeams {
  const teams = Array.isArray(value) ? value[0] : value;
  return teams === 'kc-vitality' || teams === 'light-pair' ? teams : 'g2-fnatic';
}

function normalizePreviewScore(value?: string | string[]): PreviewScoreMode {
  const score = Array.isArray(value) ? value[0] : value;
  return score === 'none' ? 'none' : 'score';
}

function matchForPreviewState(state: PreviewMatchState, teams: PreviewTeams, scoreMode: PreviewScoreMode): HubMatch {
  const matchup = teams === 'kc-vitality'
    ? {
        event: 'LFL Summer Split',
        id: 'kc-vitality',
        teamA: 'Karmine Corp',
        teamB: 'Team Vitality',
        tagA: 'KC',
        tagB: 'VIT',
      }
    : teams === 'light-pair'
      ? {
          event: 'LEC Summer',
          id: 'gx-heretics',
          teamA: 'GIANTX',
          teamB: 'Team Heretics',
          tagA: 'GX',
          tagB: 'TH',
        }
    : {
        event: 'LEC Summer',
        id: 'g2-fnatic',
        teamA: 'G2 Esports',
        teamB: 'Fnatic',
        tagA: 'G2',
        tagB: 'FNC',
      };
  const accentOverrides = teams === 'light-pair'
    ? { couleur_a: '#86F6DD', couleur_b: '#FFE27A' }
    : {};
  if (state === 'live') {
    return previewMatch(`${matchup.id}-live`, -1, 'lol', matchup.teamA, matchup.tagA, matchup.teamB, matchup.tagB, matchup.event, 3, {
      ...accentOverrides,
      score_a: scoreMode === 'none' ? null : 1,
      score_b: scoreMode === 'none' ? null : 0,
      statut: 'en_cours',
    });
  }
  if (state === 'finished') {
    return previewMatch(`${matchup.id}-finished`, -2, 'lol', matchup.teamA, matchup.tagA, matchup.teamB, matchup.tagB, matchup.event, 3, {
      ...accentOverrides,
      score_a: 2,
      score_b: 1,
      statut: 'termine',
    });
  }
  if (state === 'cancelled') {
    return previewMatch(`${matchup.id}-cancelled`, 3, 'lol', matchup.teamA, matchup.tagA, matchup.teamB, matchup.tagB, matchup.event, 3, {
      ...accentOverrides,
      statut: 'annule',
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
  return previewMatch(matchup.id, 3, 'lol', matchup.teamA, matchup.tagA, matchup.teamB, matchup.tagB, matchup.event, 3, accentOverrides);
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
