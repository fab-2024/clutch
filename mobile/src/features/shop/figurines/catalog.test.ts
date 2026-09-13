import { FIGURINES, STARTER_FIGURINES } from './catalog';
it('keeps the approved acquisition split, prices and starter choices', () => {
  expect(new Set(FIGURINES.map(item => item.id)).size).toBe(24);
  expect(FIGURINES.filter(item => item.access.kind === 'volts')).toHaveLength(15);
  expect(FIGURINES.filter(item => item.access.kind === 'store' && item.access.priceCents === 399)).toHaveLength(5);
  expect(FIGURINES.filter(item => item.access.kind === 'store' && item.access.priceCents === 599)).toHaveLength(4);
  expect(STARTER_FIGURINES.map(item => item.id).sort()).toEqual(['brumousse', 'echo', 'grelot']);
  expect(STARTER_FIGURINES.every(item => item.access.kind === 'volts')).toBe(true);
});
