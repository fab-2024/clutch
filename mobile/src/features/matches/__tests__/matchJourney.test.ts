/// <reference types="jest" />

import {
  buildMatchJourneyParams,
  matchJourneySource,
  matchJourneySourceFromSegments,
  matchJourneySourceLabel,
  readMatchJourneySnapshot,
} from '../matchJourney';

describe('match journey continuity', () => {
  it('round-trips the visible match snapshot, including zero scores', () => {
    const params = buildMatchJourneyParams({
      id: 'match-1',
      equipe_a: 'G2 Esports',
      equipe_b: 'Fnatic',
      evenement: 'LEC Summer',
      format: 5,
      jeu: 'lol',
      score_a: 0,
      score_b: 0,
      tag_a: 'G2',
      tag_b: 'FNC',
    }, 'hub');

    expect(params).toEqual({
      journeyEvent: 'LEC Summer',
      journeyFormat: '5',
      journeyFrom: 'hub',
      journeyGame: 'lol',
      journeyScoreA: '0',
      journeyScoreB: '0',
      journeyTagA: 'G2',
      journeyTagB: 'FNC',
      journeyTeamA: 'G2 Esports',
      journeyTeamB: 'Fnatic',
    });
    expect(readMatchJourneySnapshot('match-1', params)).toEqual({
      event: 'LEC Summer',
      format: 5,
      game: 'lol',
      matchId: 'match-1',
      scoreA: 0,
      scoreB: 0,
      tagA: 'G2',
      tagB: 'FNC',
      teamA: 'G2 Esports',
      teamB: 'Fnatic',
    });
  });

  it('falls back safely for incomplete links and derives missing tags', () => {
    expect(matchJourneySource('unknown')).toBe('system');
    expect(readMatchJourneySnapshot('match-2', {
      journeyTeamA: 'Karmine Corp',
      journeyTeamB: 'Team Liquid',
      journeyScoreA: 'invalid',
    })).toMatchObject({
      scoreA: null,
      tagA: 'KC',
      tagB: 'TL',
    });
    expect(readMatchJourneySnapshot('match-2', { journeyTeamA: 'Fnatic' })).toBeNull();
  });

  it('maps the current route to a stable source label', () => {
    expect(matchJourneySourceFromSegments(['(tabs)', 'matches'])).toBe('matches');
    expect(matchJourneySourceFromSegments(['(tabs)', 'index'])).toBe('hub');
    expect(matchJourneySourceFromSegments(['match', '[id]'])).toBe('match');
    expect(matchJourneySourceFromSegments(['u', '[pseudo]'])).toBe('profile');
    expect(matchJourneySourceLabel('calls')).toBe('MES CALLS');
    expect(matchJourneySourceLabel('match')).toBe('MATCH CENTER');
  });
});
