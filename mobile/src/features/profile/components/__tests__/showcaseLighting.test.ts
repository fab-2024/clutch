/// <reference types="jest" />

import {
  SHOWCASE_CUSTOMIZABLE_LIGHTINGS,
  SHOWCASE_LIGHTING_VISUALS,
} from '../showcase/showcaseLighting';

describe('showcase lighting directions', () => {
  it('exposes the six approved lighting directions in display order', () => {
    expect(SHOWCASE_CUSTOMIZABLE_LIGHTINGS).toEqual([
      'cyan',
      'amber',
      'violet',
      'competition',
      'emerald',
      'acid',
    ]);
    expect(SHOWCASE_CUSTOMIZABLE_LIGHTINGS.map((lighting) => (
      SHOWCASE_LIGHTING_VISUALS[lighting].label
    ))).toEqual([
      'CYAN',
      'AMBRE',
      'VIOLET',
      'ROUGE / CYAN',
      'ÉMERAUDE',
      'VICTOIRE',
    ]);
  });

  it('keeps split washes for competition and emerald lighting', () => {
    expect(SHOWCASE_LIGHTING_VISUALS.competition.horizontalWash).toHaveLength(3);
    expect(SHOWCASE_LIGHTING_VISUALS.emerald.horizontalWash).toHaveLength(3);
    expect(SHOWCASE_LIGHTING_VISUALS.cyan.horizontalWash).toBeUndefined();
  });

  it('keeps the Fnatic orange lighting available to equipped team packs', () => {
    expect(SHOWCASE_LIGHTING_VISUALS.orange).toMatchObject({
      glow: '#FF5900',
      label: 'FNATIC',
    });
    expect(SHOWCASE_CUSTOMIZABLE_LIGHTINGS).not.toContain('orange');
  });

  it('keeps the KC Blue Wall lighting exclusive to the equipped pack', () => {
    expect(SHOWCASE_LIGHTING_VISUALS.blue).toMatchObject({
      glow: '#168DFF',
      label: 'BLUE WALL',
    });
    expect(SHOWCASE_CUSTOMIZABLE_LIGHTINGS).not.toContain('blue');
  });

  it('keeps the M8 silver lighting exclusive to the equipped pack', () => {
    expect(SHOWCASE_LIGHTING_VISUALS.silver).toMatchObject({
      glow: '#B9DCFF',
      label: 'ÉCLAT M8',
    });
    expect(SHOWCASE_CUSTOMIZABLE_LIGHTINGS).not.toContain('silver');
  });
});
