import { buildMatchTerritoryPalette } from '../components/matchConfrontationPalette';

describe('hub confrontation territory palette', () => {
  it('keeps the exterior dark while concentrating saturation near the confrontation', () => {
    const palette = buildMatchTerritoryPalette('#69A7FF');
    expect(brightness(palette.outer)).toBeLessThan(brightness(palette.middle));
    expect(brightness(palette.middle)).toBeLessThan(brightness(palette.local));
    expect(brightness(palette.nearFracture)).toBeGreaterThan(brightness(palette.local));
  });

  it('turns a yellow team accent into dark amber without dulling its luminous edge', () => {
    const palette = buildMatchTerritoryPalette('#F3D933');
    const outer = channels(palette.outer);
    const local = channels(palette.local);
    expect(outer.red).toBeGreaterThan(outer.green);
    expect(outer.blue).toBeLessThan(outer.green / 3);
    expect(local.red).toBeGreaterThan(220);
    expect(local.green).toBeGreaterThan(180);
  });

  it('normalizes two pale accents into readable energetic local colours', () => {
    const cyan = buildMatchTerritoryPalette('#86F6DD');
    const gold = buildMatchTerritoryPalette('#FFE27A');
    expect(brightness(cyan.local)).toBeLessThan(brightness('#86F6DD'));
    expect(brightness(gold.local)).toBeLessThan(brightness('#FFE27A'));
    expect(brightness(cyan.outer)).toBeLessThan(45);
    expect(brightness(gold.outer)).toBeLessThan(45);
  });
});

function brightness(color: string) {
  const { blue, green, red } = channels(color);
  return red * .2126 + green * .7152 + blue * .0722;
}

function channels(color: string) {
  return {
    red: Number.parseInt(color.slice(1, 3), 16),
    green: Number.parseInt(color.slice(3, 5), 16),
    blue: Number.parseInt(color.slice(5, 7), 16),
  };
}
