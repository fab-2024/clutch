import type { ShowcaseLighting } from './types';

type LightingGradient = readonly [string, string, string];

export type ShowcaseLightingVisual = {
  glow: string;
  horizontalWash?: LightingGradient;
  label: string;
  wash: LightingGradient;
};

export const SHOWCASE_LIGHTING_VISUALS: Record<ShowcaseLighting, ShowcaseLightingVisual> = {
  acid: {
    glow: '#E8FF3D',
    label: 'VICTOIRE',
    wash: ['rgba(14,18,1,.04)', 'rgba(180,211,12,.18)', 'rgba(5,7,2,.18)'],
  },
  amber: {
    glow: '#E2A451',
    label: 'AMBRE',
    wash: ['rgba(18,9,1,.04)', 'rgba(173,95,25,.15)', 'rgba(7,5,3,.17)'],
  },
  blue: {
    glow: '#168DFF',
    label: 'BLUE WALL',
    wash: ['rgba(1,5,18,.05)', 'rgba(10,81,188,.17)', 'rgba(1,4,12,.2)'],
  },
  competition: {
    glow: '#31D7E2',
    horizontalWash: ['rgba(194,18,28,.27)', 'rgba(7,8,10,.02)', 'rgba(0,158,205,.27)'],
    label: 'ROUGE / CYAN',
    wash: ['rgba(8,8,10,.02)', 'rgba(245,248,250,.04)', 'rgba(2,5,8,.16)'],
  },
  cyan: {
    glow: '#31D7E2',
    label: 'CYAN',
    wash: ['rgba(1,8,12,.03)', 'rgba(20,105,138,.09)', 'rgba(1,5,8,.16)'],
  },
  emerald: {
    glow: '#38D996',
    horizontalWash: ['rgba(8,78,48,.16)', 'rgba(87,101,34,.05)', 'rgba(165,111,29,.13)'],
    label: 'ÉMERAUDE',
    wash: ['rgba(4,14,8,.03)', 'rgba(22,119,71,.15)', 'rgba(8,7,3,.17)'],
  },
  orange: {
    glow: '#FF5900',
    label: 'FNATIC',
    wash: ['rgba(20,6,1,.05)', 'rgba(188,61,0,.15)', 'rgba(7,4,2,.18)'],
  },
  violet: {
    glow: '#9A6BFF',
    label: 'VIOLET',
    wash: ['rgba(5,3,12,.04)', 'rgba(80,43,143,.12)', 'rgba(2,4,8,.17)'],
  },
  white: {
    glow: '#F1F4F4',
    label: 'BLANC',
    wash: ['rgba(8,10,12,.02)', 'rgba(196,207,214,.08)', 'rgba(2,4,6,.15)'],
  },
};

export const SHOWCASE_CUSTOMIZABLE_LIGHTINGS = [
  'cyan',
  'amber',
  'violet',
  'competition',
  'emerald',
  'acid',
] as const satisfies readonly ShowcaseLighting[];
