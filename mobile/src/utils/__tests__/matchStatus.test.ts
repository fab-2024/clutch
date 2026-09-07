import { classifyMatchPhase, LIVE_MATCH_MAX_AGE_MS } from '../matchStatus';

const NOW = Date.parse('2026-09-07T16:00:00Z');
const at = (offset: number) => new Date(NOW + offset).toISOString();

describe('match status confirmation', () => {
  it('requires an explicit live status, never just an elapsed start time', () => {
    expect(classifyMatchPhase({ statut: 'a_venir', debut: at(-60000) }, NOW)).toBe('pending');
    expect(classifyMatchPhase({ statut: 'en_cours', debut: at(-60000) }, NOW)).toBe('live');
    expect(classifyMatchPhase({ statut: 'a_venir', debut: at(60000) }, NOW)).toBe('upcoming');
  });

  it('expires stale live statuses without fabricating results', () => {
    expect(classifyMatchPhase({ statut: 'en_cours', debut: at(-LIVE_MATCH_MAX_AGE_MS) }, NOW)).toBe('live');
    expect(classifyMatchPhase({ statut: 'en_cours', debut: at(-LIVE_MATCH_MAX_AGE_MS - 1) }, NOW)).toBe('pending');
    expect(classifyMatchPhase({ statut: 'en_cours', debut: '2026-08-18T12:00:00Z' }, NOW)).toBe('pending');
    expect(classifyMatchPhase({ statut: 'termine', debut: '2026-08-18T12:00:00Z' }, NOW)).toBe('finished');
    expect(classifyMatchPhase({ statut: 'annule', debut: at(-60000) }, NOW)).toBe('cancelled');
  });

  it('does not label a future or invalid start live', () => {
    expect(classifyMatchPhase({ statut: 'en_cours', debut: at(60000) }, NOW)).toBe('pending');
    expect(classifyMatchPhase({ statut: 'a_venir', debut: 'invalid' }, NOW)).toBe('pending');
  });
});
