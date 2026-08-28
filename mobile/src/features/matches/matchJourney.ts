export const MATCH_JOURNEY_SOURCES = [
  'hub',
  'matches',
  'calls',
  'match',
  'profile',
  'duel',
  'system',
] as const;

export type MatchJourneySource = typeof MATCH_JOURNEY_SOURCES[number];

export type MatchJourneyTarget = {
  couleur_a?: string | null;
  couleur_b?: string | null;
  id: string;
  equipe_a?: string | null;
  equipe_b?: string | null;
  evenement?: string | null;
  format?: number | null;
  jeu?: string | null;
  logo_a?: string | null;
  logo_b?: string | null;
  score_a?: number | null;
  score_b?: number | null;
  tag_a?: string | null;
  tag_b?: string | null;
};

export type MatchJourneySnapshot = {
  accentA: string | null;
  accentB: string | null;
  event: string | null;
  format: number | null;
  game: string | null;
  logoA: string | null;
  logoB: string | null;
  matchId: string;
  scoreA: number | null;
  scoreB: number | null;
  tagA: string;
  tagB: string;
  teamA: string;
  teamB: string;
};

export type MatchJourneySearchParams = {
  journeyAccentA?: string | string[];
  journeyAccentB?: string | string[];
  journeyEvent?: string | string[];
  journeyFormat?: string | string[];
  journeyFrom?: string | string[];
  journeyGame?: string | string[];
  journeyLogoA?: string | string[];
  journeyLogoB?: string | string[];
  journeyMotion?: string | string[];
  journeyScoreA?: string | string[];
  journeyScoreB?: string | string[];
  journeyTagA?: string | string[];
  journeyTagB?: string | string[];
  journeyTeamA?: string | string[];
  journeyTeamB?: string | string[];
};

export function buildMatchJourneyParams(
  target: MatchJourneyTarget,
  source: MatchJourneySource,
) {
  const params: Record<string, string> = { journeyFrom: source };
  assignColor(params, 'journeyAccentA', target.couleur_a);
  assignColor(params, 'journeyAccentB', target.couleur_b);
  assignText(params, 'journeyTeamA', target.equipe_a);
  assignText(params, 'journeyTagA', target.tag_a);
  assignText(params, 'journeyTeamB', target.equipe_b);
  assignText(params, 'journeyTagB', target.tag_b);
  assignText(params, 'journeyEvent', target.evenement);
  assignText(params, 'journeyGame', target.jeu);
  assignText(params, 'journeyLogoA', target.logo_a);
  assignText(params, 'journeyLogoB', target.logo_b);
  assignNumber(params, 'journeyFormat', target.format);
  assignNumber(params, 'journeyScoreA', target.score_a);
  assignNumber(params, 'journeyScoreB', target.score_b);
  return params;
}

export function matchJourneySource(value?: string | string[]): MatchJourneySource {
  const source = firstParam(value);
  return MATCH_JOURNEY_SOURCES.includes(source as MatchJourneySource)
    ? source as MatchJourneySource
    : 'system';
}

export function matchJourneyUsesArenaMotion(value?: string | string[]) {
  return firstParam(value) === 'arena';
}

export function matchJourneySourceLabel(source: MatchJourneySource) {
  if (source === 'hub') return 'HUB';
  if (source === 'calls') return 'MES CALLS';
  if (source === 'match') return 'MATCH CENTER';
  if (source === 'profile') return 'PROFIL';
  if (source === 'duel') return 'DUEL';
  if (source === 'matches') return 'MATCHS';
  return 'RETOUR';
}

export function matchJourneySourceFromSegments(segments: readonly string[]): MatchJourneySource {
  const [root, section] = segments;
  if (root === 'match') return 'match';
  if (root === 'duel' || root === 'c') return 'duel';
  if (root === 'player' || root === 'u') return 'profile';
  if (root === '(tabs)') {
    if (section === 'matches') return 'matches';
    if (section === 'profile') return 'profile';
    return 'hub';
  }
  return 'system';
}

export function readMatchJourneySnapshot(
  matchId: string | undefined,
  params: MatchJourneySearchParams,
): MatchJourneySnapshot | null {
  const teamA = firstParam(params.journeyTeamA)?.trim();
  const teamB = firstParam(params.journeyTeamB)?.trim();
  if (!matchId || !teamA || !teamB) return null;

  return {
    accentA: optionalColor(params.journeyAccentA),
    accentB: optionalColor(params.journeyAccentB),
    event: optionalText(params.journeyEvent),
    format: optionalNumber(params.journeyFormat),
    game: optionalText(params.journeyGame),
    logoA: optionalText(params.journeyLogoA),
    logoB: optionalText(params.journeyLogoB),
    matchId,
    scoreA: optionalNumber(params.journeyScoreA),
    scoreB: optionalNumber(params.journeyScoreB),
    tagA: optionalText(params.journeyTagA) ?? shortTag(teamA),
    tagB: optionalText(params.journeyTagB) ?? shortTag(teamB),
    teamA,
    teamB,
  };
}

function assignColor(
  params: Record<string, string>,
  key: string,
  value?: string | null,
) {
  const color = normalizeHexColor(value);
  if (color) params[key] = color;
}

function assignText(
  params: Record<string, string>,
  key: string,
  value?: string | null,
) {
  const text = value?.trim();
  if (text) params[key] = text;
}

function assignNumber(
  params: Record<string, string>,
  key: string,
  value?: number | null,
) {
  if (typeof value === 'number' && Number.isFinite(value)) params[key] = String(value);
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function optionalText(value?: string | string[]) {
  const text = firstParam(value)?.trim();
  return text || null;
}

function optionalColor(value?: string | string[]) {
  return normalizeHexColor(firstParam(value));
}

function optionalNumber(value?: string | string[]) {
  const text = firstParam(value);
  if (text == null || text.trim() === '') return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function shortTag(team: string) {
  const words = team.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length > 1) return words.map((word) => word[0]).join('').slice(0, 4).toUpperCase();
  return team.slice(0, 4).toUpperCase();
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
