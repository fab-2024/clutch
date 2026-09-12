import { IDENTITY_PACKS, STARTER_IDENTITY_AVATARS, applyIdentityPack, validJerseyNumber } from './catalog';
it('keeps the approved 1 / 6 / 4 / 1 acquisition split', () => {
  expect(new Set(IDENTITY_PACKS.map(p => p.id)).size).toBe(12);
  expect(['included', 'volts', 'store', 'season'].map(kind => IDENTITY_PACKS.filter(p => p.access.kind === kind).length)).toEqual([1, 6, 4, 1]);
  expect(STARTER_IDENTITY_AVATARS).toEqual(['Spectre', 'Nova', 'Vector', 'Glitch', 'Bulwark', 'Ember', 'Ronin', 'Nyx', 'Orion', 'Sylva', 'K.O.', 'Boost', 'Byte', 'Fang', 'Ace']);
  for (const tier of ['quick', 'medium', 'long']) expect(IDENTITY_PACKS.filter(p => p.access.kind === 'volts' && p.access.tier === tier)).toHaveLength(2);
});
it('keeps avatar and earned performance independent of purchased styling', () => {
  const current = { frame: 'clutch-original', background: 'clutch-original', signature: 'clutch-original', avatar: 'Nova', grade: 'Bronze', frags: 620, badges: ['first-call'], team: 'KC' } as const;
  expect(applyIdentityPack(current, 'ivoire')).toEqual({ ...current, frame: 'ivoire', background: 'ivoire', signature: 'ivoire' });
});
it('stores the four proposed euro prices without pricing the season pack', () => {
  expect(IDENTITY_PACKS.flatMap(p => p.access.kind === 'store' ? [p.access.proposedCents] : [])).toEqual([399, 499, 499, 699]);
});
it('accepts a jersey number from 0 to 99, including a leading zero', () => {
  for (const value of ['0', '07', '99']) expect(validJerseyNumber(value)).toBe(true);
  for (const value of ['100', '-1', '', '3.5', 'a7']) expect(validJerseyNumber(value)).toBe(false);
});
