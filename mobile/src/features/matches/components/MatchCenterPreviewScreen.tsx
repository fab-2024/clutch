import { Redirect, useLocalSearchParams } from 'expo-router';

import { resolveTeamAccent } from '@/src/utils/teamColors';

import type { MatchCenterData } from '../types';
import type { MatchJourneySnapshot } from '../matchJourney';
import { CALL_LOCK_DURATION_MS, CALL_LOCK_MILESTONE_MS } from './CallLockMoment';
import MatchCenterScreen from './MatchCenterScreen';

export const PREVIEW_MATCH_CENTER: MatchCenterData = {
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
  const params = useLocalSearchParams<{ state?: string | string[] }>();
  const state = Array.isArray(params.state) ? params.state[0] : params.state;
  const previewData = state === 'live'
    ? livePreview(PREVIEW_MATCH_CENTER)
    : state === 'handoff-locked'
      ? lockedPreview(PREVIEW_MATCH_CENTER)
      : PREVIEW_MATCH_CENTER;
  const snapshot = previewSnapshot(previewData);
  const arenaMotion = Boolean(state?.startsWith('handoff'));
  const previewProgress = handoffPreviewProgress(state);
  const callLockChoice = state?.startsWith('call-lock') ? 'a' as const : undefined;
  const callLockProgress = callLockPreviewProgress(state);
  const reduceMotion = state === 'handoff-reduced' || state === 'call-lock-reduced'
    ? true
    : arenaMotion || callLockChoice
      ? false
      : undefined;
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <MatchCenterScreen
      previewArenaMotion={arenaMotion}
      previewArenaProgress={previewProgress}
      previewCallLockChoice={callLockChoice}
      previewCallLockProgress={callLockProgress}
      previewData={previewData}
      previewJourneySnapshot={arenaMotion || callLockChoice || state === 'live' ? snapshot : undefined}
      previewJourneySource={arenaMotion || state === 'live' ? 'hub' : undefined}
      previewLoadingSnapshot={state === 'transition' ? snapshot : undefined}
      previewReduceMotion={reduceMotion}
    />
  );
}

function handoffPreviewProgress(state?: string) {
  if (state === 'handoff-start') return 0;
  if (state === 'handoff-mid') return .52;
  if (state === 'handoff-final' || state === 'handoff-locked') return 1;
  return undefined;
}

function callLockPreviewProgress(state?: string) {
  if (state === 'call-lock-start') return 0;
  if (state === 'call-lock-seam') return CALL_LOCK_MILESTONE_PROGRESS;
  if (state === 'call-lock-final' || state === 'call-lock-reduced') return 1;
  return undefined;
}

function lockedPreview(data: MatchCenterData): MatchCenterData {
  const prediction = {
    id: 'preview-prediction-g2',
    match_id: data.match.id,
    choix: 'a' as const,
    statut: 'verrouille',
    proba_figee: .57,
    proba_scoring: .57,
    k_frags: 40,
    delta_frags: null,
    cree_le: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    regle_le: null,
  };
  return {
    ...data,
    callContext: { ...data.callContext, prediction },
    match: {
      ...data.match,
      prediction: {
        choix: prediction.choix,
        delta_frags: prediction.delta_frags,
        match_id: prediction.match_id,
        statut: prediction.statut,
      },
    },
    prediction,
  };
}

function livePreview(data: MatchCenterData): MatchCenterData {
  const startedAt = new Date(Date.now() - 38 * 60 * 1000).toISOString();
  return {
    ...data,
    match: {
      ...data.match,
      id: 'preview-live-kc-vit',
      debut: startedAt,
      equipe_a: 'Karmine Corp',
      tag_a: 'KC',
      equipe_b: 'Team Vitality',
      tag_b: 'VIT',
      evenement: 'LFL Summer Split',
      format: 3,
      statut: 'en_cours',
      score_a: 0,
      score_b: 0,
      prediction: null,
    },
    projection: {
      match_id: 'preview-live-kc-vit',
      choix: [
        { cle: 'a', proba: .71, gain: 17, perte: 25 },
        { cle: 'b', proba: .29, gain: 25, perte: 17 },
      ],
      k: 60,
      source: 'elo_v1',
      figee_le: startedAt,
    },
    prediction: null,
    callContext: {
      ...data.callContext,
      match_id: 'preview-live-kc-vit',
      participants: 1486,
      ferme_le: startedAt,
      verrouille_le: startedAt,
      distribution: {
        total: 1486,
        a: 1055,
        b: 431,
        a_pct: 71,
        b_pct: 29,
      },
      prediction: null,
    },
    related: [],
  };
}

function previewSnapshot(data: MatchCenterData): MatchJourneySnapshot {
  return {
    accentA: resolveTeamAccent({ name: data.match.equipe_a, tag: data.match.tag_a }),
    accentB: resolveTeamAccent({ name: data.match.equipe_b, tag: data.match.tag_b }),
    event: data.match.evenement,
    format: data.match.format,
    game: data.match.jeu,
    logoA: null,
    logoB: null,
    matchId: data.match.id,
    scoreA: data.match.score_a,
    scoreB: data.match.score_b,
    tagA: data.match.tag_a,
    tagB: data.match.tag_b,
    teamA: data.match.equipe_a,
    teamB: data.match.equipe_b,
  };
}

const CALL_LOCK_MILESTONE_PROGRESS = CALL_LOCK_MILESTONE_MS / CALL_LOCK_DURATION_MS;
