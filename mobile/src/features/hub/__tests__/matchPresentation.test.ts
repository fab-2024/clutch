import {
  formatMatchHeaderSchedule,
  getHubMatchPhase,
  getMatchConfrontationState,
  resolveTeamAccent,
  withAlpha,
} from '../matchPresentation';
import type { HubMatch } from '../types';

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
    expect(state.teamA.accent).toBe('#3F88FF');
    expect(state.teamB.tag).toBe('UC');
    expect(state.teamB.accent).toBe('#FF6A21');
  });

  it('prefers an explicit valid colour and creates alpha variants', () => {
    const accent = resolveTeamAccent({ fallback: 'a', name: 'Any Team', provided: '#1a2', tag: 'ANY' });
    expect(accent).toBe('#11AA22');
    expect(withAlpha(accent, .5)).toBe('#11AA2280');
  });
});
