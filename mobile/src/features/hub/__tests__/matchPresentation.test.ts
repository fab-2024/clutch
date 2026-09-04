import {
  formatMatchHeaderSchedule,
  getHubMatchPhase,
  getMatchConfrontationState,
  resolveTeamAccent,
  withAlpha,
} from '../matchPresentation';
import type { HubMatch } from '../types';
import { MATCH_TEAM_FALLBACK_ACCENTS } from '@/src/utils/teamColors';

const NOW = Date.parse('2026-08-23T18:00:00.000Z');

const BASE_MATCH: HubMatch = {
  id: 'match-1',
  debut: '2026-08-23T19:00:00.000Z',
  jeu: 'lol',
  equipe_a: 'Northwind Academy',
  tag_a: 'NWA',
  equipe_b: 'Arcadia Five',
  tag_b: 'A5',
  evenement: 'Open Qualifier',
  format: 3,
  statut: 'a_venir',
};

describe('hub match confrontation presentation', () => {
  it('formats the confrontation header as weekday and time', () => {
    expect(formatMatchHeaderSchedule(BASE_MATCH.debut)).toMatch(/^\p{L}{3} \d{2}:\d{2}$/u);
    expect(formatMatchHeaderSchedule('invalid')).toBe('HORAIRE À CONFIRMER');
  });

  it('distinguishes upcoming, live, finished and cancelled states', () => {
    expect(getHubMatchPhase(BASE_MATCH, NOW)).toBe('upcoming');
    expect(getHubMatchPhase({ ...BASE_MATCH, statut: 'en_cours' }, NOW)).toBe('live');
    expect(getHubMatchPhase({ ...BASE_MATCH, statut: 'a_venir', debut: '2026-08-23T17:59:00.000Z' }, NOW)).toBe('live');
    expect(getHubMatchPhase({ ...BASE_MATCH, statut: 'termine' }, NOW)).toBe('finished');
    expect(getHubMatchPhase({ ...BASE_MATCH, statut: 'annule' }, NOW)).toBe('cancelled');
  });

  it('shows a score and identifies the winner only once the match is finished', () => {
    const state = getMatchConfrontationState({ ...BASE_MATCH, statut: 'termine', score_a: 2, score_b: 1 }, null, NOW);
    expect(state.scoreLabel).toBe('2 – 1');
    expect(state.status).toBe('TERMINÉ');
    expect(state.action).toBe('VOIR LE RÉSULTAT');
    expect(state.winner).toBe('a');
  });

  it('keeps missing scores explicit during a live match', () => {
    const state = getMatchConfrontationState({ ...BASE_MATCH, statut: 'en_cours' }, null, NOW);
    expect(state.scoreLabel).toBe('— – —');
    expect(state.status).toBe('LIVE');
    expect(state.winner).toBeNull();
  });

  it('keeps a locked call visible on an upcoming confrontation', () => {
    const state = getMatchConfrontationState(BASE_MATCH, { matchId: BASE_MATCH.id, choice: 'b' }, NOW);
    expect(state.phase).toBe('upcoming');
    expect(state.predictionTag).toBe('A5');
    expect(state.status).toBe('CALL · A5');
    expect(state.action).toBe('OUVRIR MON CALL');
    expect(state.scoreLabel).toBeNull();
  });

  it('keeps cancelled confrontations actionable without inventing a score or winner', () => {
    const state = getMatchConfrontationState({ ...BASE_MATCH, statut: 'annule' }, null, NOW);
    expect(state.phase).toBe('cancelled');
    expect(state.status).toBe('ANNULÉ');
    expect(state.action).toBe('VOIR LE MATCH');
    expect(state.scoreLabel).toBeNull();
    expect(state.winner).toBeNull();
  });

  it('provides readable team and colour fallbacks without logos or brand data', () => {
    const state = getMatchConfrontationState({
      ...BASE_MATCH,
      equipe_a: '',
      tag_a: '',
      equipe_b: 'Unknown Collective',
      tag_b: '',
      couleur_a: null,
      couleur_b: null,
      logo_a: null,
      logo_b: null,
    }, null, NOW);

    expect(state.teamA.name).toBe('Équipe 1');
    expect(state.teamA.tag).toBe('EQ1');
    expect(state.teamA.accent).toBe(MATCH_TEAM_FALLBACK_ACCENTS.a);
    expect(state.teamB.tag).toBe('UC');
    expect(state.teamB.accent).toBe(MATCH_TEAM_FALLBACK_ACCENTS.b);
  });

  it('prefers an explicit valid colour and creates alpha variants', () => {
    const accent = resolveTeamAccent({ name: 'Any Team', provided: '#1a2', tag: 'ANY' });
    expect(accent).toBe('#11AA22');
    expect(withAlpha(accent, .5)).toBe('#11AA2280');
  });

  it('keeps the FEARX colour and gives monochrome Dplus a stable blue fallback', () => {
    const match = { ...BASE_MATCH, equipe_a: 'BNK FEARX', tag_a: 'BFX', equipe_b: 'Dplus KIA', tag_b: 'DK' };
    const original = getMatchConfrontationState(match, null, NOW);
    const swapped = getMatchConfrontationState({
      ...match, equipe_a: match.equipe_b, tag_a: match.tag_b, equipe_b: match.equipe_a, tag_b: match.tag_a,
    }, null, NOW);

    expect(original.teamA.accent).toBe('#FFD600');
    expect(original.teamB.accent).toBe(MATCH_TEAM_FALLBACK_ACCENTS.a);
    expect(swapped.teamA.accent).toBe(original.teamB.accent);
    expect(swapped.teamB.accent).toBe(original.teamA.accent);
  });

  it('keeps KT red and renders monochrome Dplus blue', () => {
    const match = { ...BASE_MATCH, equipe_a: 'KT Rolster', tag_a: 'KT', equipe_b: 'Dplus KIA', tag_b: 'DK' };
    const state = getMatchConfrontationState(match, null, NOW);

    expect(state.teamA.accent).toBe('#E5333A');
    expect(state.teamB.accent).toBe(MATCH_TEAM_FALLBACK_ACCENTS.a);
  });

  it.each([
    ['  bnk-fearx ', '', '#FFD600'],
    ['Dplus Kia', 'UNKNOWN', '#E5E7EB'],
    ['Gen G', 'GEN', '#C8A45D'],
    ['Team Vitality', 'VITALITY', '#F3D933'],
    ['', 'KOI', '#1AC8FF'],
    ['Maryville University', 'MVU', '#C91235'],
    ['Contingent Esports', 'CONT', '#238BCB'],
  ])('recognizes provider names and aliases for %s / %s', (name, tag, expected) => {
    expect(resolveTeamAccent({ name, tag, provided: 'invalid' })).toBe(expected);
  });
});
