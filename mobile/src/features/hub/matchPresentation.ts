import { resolveTeamAccent } from '@/src/utils/teamColors';

import type { HubMatch, HubPrediction } from './types';

export { resolveTeamAccent } from '@/src/utils/teamColors';

export type HubMatchPhase = 'upcoming' | 'live' | 'finished' | 'cancelled';
export type HubTeamSide = 'a' | 'b';

export type ConfrontationTeam = {
  accent: string;
  logo: string | null;
  name: string;
  side: HubTeamSide;
  tag: string;
};

export type MatchConfrontationState = {
  action: string;
  phase: HubMatchPhase;
  predictionTag: string | null;
  scoreA: number | null;
  scoreB: number | null;
  scoreLabel: string | null;
  status: string;
  teamA: ConfrontationTeam;
  teamB: ConfrontationTeam;
  winner: HubTeamSide | null;
};

export function getHubMatchPhase(match: HubMatch, now = Date.now()): HubMatchPhase {
  const status = String(match.statut || '').toLowerCase();
  if (status === 'annule' || status === 'cancelled') return 'cancelled';
  if (status === 'termine' || status === 'terminee' || status === 'finished') return 'finished';
  if (status === 'en_cours' || status === 'live') return 'live';

  const startsAt = new Date(match.debut).getTime();
  return status === 'a_venir' && Number.isFinite(startsAt) && startsAt <= now ? 'live' : 'upcoming';
}

export function getMatchConfrontationState(
  match: HubMatch,
  prediction: HubPrediction | null,
  now = Date.now(),
): MatchConfrontationState {
  const phase = getHubMatchPhase(match, now);
  const teamA = buildTeam(match, 'a');
  const teamB = buildTeam(match, 'b');
  const scoreA = safeScore(match.score_a);
  const scoreB = safeScore(match.score_b);
  const predictionTag = prediction?.choice === 'a' ? teamA.tag : prediction?.choice === 'b' ? teamB.tag : null;
  const scoreLabel = phase === 'live' || phase === 'finished'
    ? `${scoreA ?? '—'} – ${scoreB ?? '—'}`
    : null;

  let winner: HubTeamSide | null = null;
  if (phase === 'finished' && scoreA != null && scoreB != null && scoreA !== scoreB) {
    winner = scoreA > scoreB ? 'a' : 'b';
  }

  return {
    action: phase === 'live'
      ? 'SUIVRE LE LIVE'
      : phase === 'finished'
        ? 'VOIR LE RÉSULTAT'
        : phase === 'cancelled'
          ? 'VOIR LE MATCH'
          : predictionTag
            ? 'OUVRIR MON CALL'
            : 'FAIRE MON CALL',
    phase,
    predictionTag,
    scoreA,
    scoreB,
    scoreLabel,
    status: phase === 'live'
      ? 'LIVE'
      : phase === 'finished'
        ? 'TERMINÉ'
        : phase === 'cancelled'
          ? 'ANNULÉ'
          : predictionTag
            ? `CALL · ${predictionTag}`
            : 'OUVERT',
    teamA,
    teamB,
    winner,
  };
}

export function withAlpha(color: string, alpha: number) {
  const normalized = normalizeHexColor(color) ?? '#000000';
  const value = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return `${normalized}${value}`;
}

export function formatMatchSchedule(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'HORAIRE À CONFIRMER';
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (sameDay(date, today)) return `AUJ. ${time}`;
  if (sameDay(date, tomorrow)) return `DEM. ${time}`;
  return `${date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').toUpperCase()} ${time}`;
}

export function formatMatchHeaderSchedule(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'HORAIRE À CONFIRMER';
  const weekday = date
    .toLocaleDateString('fr-FR', { weekday: 'short' })
    .replace('.', '')
    .toUpperCase();
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${weekday} ${time}`;
}

function buildTeam(match: HubMatch, side: HubTeamSide): ConfrontationTeam {
  const rawName = side === 'a' ? match.equipe_a : match.equipe_b;
  const rawTag = side === 'a' ? match.tag_a : match.tag_b;
  const name = safeName(rawName, side);
  const tag = safeTag(rawTag, name, side);
  return {
    accent: resolveTeamAccent({
      name,
      provided: side === 'a' ? match.couleur_a : match.couleur_b,
      tag,
    }),
    logo: side === 'a' ? match.logo_a ?? null : match.logo_b ?? null,
    name,
    side,
    tag,
  };
}

function normalizeHexColor(value?: string | null) {
  const color = String(value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const [red, green, blue] = color.slice(1).split('');
    return `#${red}${red}${green}${green}${blue}${blue}`.toUpperCase();
  }
  return null;
}

function safeScore(value: number | null | undefined) {
  const score = Number(value);
  return value != null && Number.isFinite(score) && score >= 0 ? Math.round(score) : null;
}

function safeName(value: string, side: HubTeamSide) {
  const name = String(value || '').trim();
  return name || `Équipe ${side === 'a' ? '1' : '2'}`;
}

function safeTag(value: string, name: string, side: HubTeamSide) {
  const tag = String(value || '').trim().toUpperCase();
  if (tag) return tag.slice(0, 8);
  if (name === `Équipe ${side === 'a' ? '1' : '2'}`) return `EQ${side === 'a' ? '1' : '2'}`;
  const words = name.split(/\s+/).filter(Boolean);
  const derived = words.length > 1
    ? words.slice(0, 3).map((word) => word[0]).join('')
    : words[0]?.slice(0, 3);
  return String(derived || `EQ${side === 'a' ? '1' : '2'}`).toUpperCase();
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
