import type { ImageSourcePropType } from 'react-native';

import type { CosmeticRarity } from './types';

export type ShowcaseRankDisplayDefinition = {
  accent: string;
  description: string;
  id: string;
  image: ImageSourcePropType;
  name: string;
  overlayImage: ImageSourcePropType;
  price: number;
  rarity: CosmeticRarity;
};

export const SHOWCASE_RANK_DISPLAY_CATALOG: readonly ShowcaseRankDisplayDefinition[] = [
  {
    id: 'rank_carbon_cradle',
    name: 'Écrin Mécanique Carbone',
    description: 'Un anneau mécanique en carbone et cyan cadre le rang au centre de la Vitrine.',
    accent: '#31D7E2',
    image: require('../../../assets/shop/atelier/ranks/overlays/rank-mechanical-carbon-overlay.png'),
    overlayImage: require('../../../assets/shop/atelier/ranks/overlays/rank-mechanical-carbon-overlay.png'),
    price: 0,
    rarity: 'commun',
  },
  {
    id: 'rank_crystal_capsule',
    name: 'Capsule Cristal',
    description: 'Une capsule transparente monumentale protège le rang sous une lumière froide.',
    accent: '#B9E8FF',
    image: require('../../../assets/shop/atelier/ranks/overlays/rank-crystal-capsule-overlay.png'),
    overlayImage: require('../../../assets/shop/atelier/ranks/overlays/rank-crystal-capsule-overlay.png'),
    price: 180,
    rarity: 'rare',
  },
  {
    id: 'rank_royal_crown',
    name: 'Couronne Royale',
    description: 'Deux arches champagne composent une couronne cérémonielle autour du rang.',
    accent: '#D7B77A',
    image: require('../../../assets/shop/atelier/ranks/overlays/rank-royal-crown-overlay.png'),
    overlayImage: require('../../../assets/shop/atelier/ranks/overlays/rank-royal-crown-overlay.png'),
    price: 220,
    rarity: 'rare',
  },
  {
    id: 'rank_orbital_core',
    name: 'Noyau Orbital',
    description: 'Des orbites métalliques encerclent le rang comme le cœur énergétique de la salle.',
    accent: '#7ED9F4',
    image: require('../../../assets/shop/atelier/ranks/overlays/rank-orbital-core-overlay.png'),
    overlayImage: require('../../../assets/shop/atelier/ranks/overlays/rank-orbital-core-overlay.png'),
    price: 260,
    rarity: 'epique',
  },
  {
    id: 'rank_volcanic_forge',
    name: 'Forge Volcanique',
    description: 'Une couronne mécanique noire, chauffée à l’orange, transforme le rang en relique forgée.',
    accent: '#F5792A',
    image: require('../../../assets/shop/atelier/ranks/overlays/rank-volcanic-forge-overlay.png'),
    overlayImage: require('../../../assets/shop/atelier/ranks/overlays/rank-volcanic-forge-overlay.png'),
    price: 300,
    rarity: 'epique',
  },
  {
    id: 'rank_clutch_revelation',
    name: 'Révélation Clutch',
    description: 'Un halo jaune signature et des panneaux lumineux révèlent le rang comme une victoire décisive.',
    accent: '#E8FF3D',
    image: require('../../../assets/shop/atelier/ranks/overlays/rank-clutch-revelation-overlay.png'),
    overlayImage: require('../../../assets/shop/atelier/ranks/overlays/rank-clutch-revelation-overlay.png'),
    price: 360,
    rarity: 'legendaire',
  },
] as const;

export const DEFAULT_SHOWCASE_RANK_DISPLAY_ID = SHOWCASE_RANK_DISPLAY_CATALOG[0].id;

export function showcaseRankDisplayById(id: string | null | undefined) {
  return SHOWCASE_RANK_DISPLAY_CATALOG.find((display) => display.id === id) ?? null;
}
