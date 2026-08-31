import type { ImageSourcePropType } from 'react-native';

import {
  COSMETIC_FAMILY_BY_SLOT,
  type CosmeticItem,
  type CosmeticRarity,
  type ShowcaseAtelierSlot,
} from './types';
import { SHOWCASE_PRESENTER_CATALOG } from './showcasePresenterCatalog';
import { SHOWCASE_RANK_DISPLAY_CATALOG } from './showcaseRankDisplayCatalog';

export const ATELIER_CATEGORIES = [
  'materials',
  'lighting',
  'supports',
  'ranks',
  'jerseys',
] as const;

export type AtelierCategory = (typeof ATELIER_CATEGORIES)[number];
export type AtelierDiscoveryKind = 'team_pack' | 'partner_pack';

export type AtelierProduct = {
  accent: string;
  category: AtelierCategory;
  description: string;
  id: string;
  image: ImageSourcePropType;
  name: string;
  overlayImage?: ImageSourcePropType;
  price: number;
  rarity: CosmeticRarity;
  slot: ShowcaseAtelierSlot;
};

export const ATELIER_CATEGORY_META: Record<AtelierCategory, {
  glyph: string;
  label: string;
  shortLabel: string;
  slot: ShowcaseAtelierSlot;
}> = {
  materials: { glyph: '▤', label: 'MATÉRIAUX', shortLabel: 'MATIÈRE', slot: 'vitrine_materiau' },
  lighting: { glyph: '✦', label: 'ÉCLAIRAGE', shortLabel: 'LUMIÈRE', slot: 'vitrine_eclairage' },
  supports: { glyph: '◫', label: 'PRÉSENTOIRS', shortLabel: 'PRÉSENTOIR', slot: 'vitrine_supports' },
  ranks: { glyph: '◆', label: 'ÉCRINS DE RANG', shortLabel: 'RANG', slot: 'vitrine_rang' },
  jerseys: { glyph: '⌁', label: 'MAILLOTS', shortLabel: 'MAILLOT', slot: 'vitrine_maillot' },
};

export const ATELIER_CATALOG: readonly AtelierProduct[] = [
  {
    id: 'material_graphite',
    category: 'materials',
    slot: 'vitrine_materiau',
    name: 'Graphite mat',
    description: 'Un graphite profond aux reflets froids qui laisse la collection dominer.',
    price: 0,
    rarity: 'commun',
    accent: '#7B8791',
    image: require('../../../assets/shop/atelier/materials/material_graphite.png'),
  },
  {
    id: 'material_steel',
    category: 'materials',
    slot: 'vitrine_materiau',
    name: 'Acier brossé',
    description: 'Des panneaux d’acier clair, striés et polis par une lumière d’atelier.',
    price: 120,
    rarity: 'rare',
    accent: '#B8C5CE',
    image: require('../../../assets/shop/atelier/materials/material_steel.png'),
  },
  {
    id: 'material_bronze',
    category: 'materials',
    slot: 'vitrine_materiau',
    name: 'Bronze noir',
    description: 'Un bronze patiné presque noir, relevé de chanfreins cuivre discrets.',
    price: 180,
    rarity: 'rare',
    accent: '#B4774E',
    image: require('../../../assets/shop/atelier/materials/material_bronze.png'),
  },
  {
    id: 'material_carbon',
    category: 'materials',
    slot: 'vitrine_materiau',
    name: 'Carbone compétition',
    description: 'Une peau carbone sombre et technique inspirée des équipements de compétition.',
    price: 220,
    rarity: 'epique',
    accent: '#68737C',
    image: require('../../../assets/shop/atelier/materials/material_carbon.png'),
  },
  {
    id: 'material_smoked_glass',
    category: 'materials',
    slot: 'vitrine_materiau',
    name: 'Verre fumé',
    description: 'Une façade de verre froid et fumé qui ajoute profondeur et reflets bleutés.',
    price: 260,
    rarity: 'epique',
    accent: '#6A9CB5',
    image: require('../../../assets/shop/atelier/materials/material_smoked_glass.png'),
  },
  {
    id: 'lighting_cyan',
    category: 'lighting',
    slot: 'vitrine_eclairage',
    name: 'Sobre cyan',
    description: 'Un éclairage froid et précis qui souligne les socles sans voler la vedette aux objets.',
    price: 0,
    rarity: 'commun',
    accent: '#31D7E2',
    image: require('../../../assets/shop/atelier/lighting/scenes/lighting-cyan-scene.png'),
  },
  {
    id: 'lighting_amber',
    category: 'lighting',
    slot: 'vitrine_eclairage',
    name: 'Prestige ambre',
    description: 'Une lumière chaude et cérémonielle qui révèle le bronze et les trophées majeurs.',
    price: 100,
    rarity: 'rare',
    accent: '#E2A451',
    image: require('../../../assets/shop/atelier/lighting/scenes/lighting-amber-scene.png'),
  },
  {
    id: 'lighting_violet',
    category: 'lighting',
    slot: 'vitrine_eclairage',
    name: 'Mystérieux violet',
    description: 'Des rais violets profonds pour une salle plus secrète et théâtrale.',
    price: 100,
    rarity: 'rare',
    accent: '#9A6BFF',
    image: require('../../../assets/shop/atelier/lighting/scenes/lighting-violet-scene.png'),
  },
  {
    id: 'lighting_white',
    category: 'lighting',
    slot: 'vitrine_eclairage',
    name: 'Compétition rouge / cyan',
    description: 'Une scène coupée en deux camps, rouge à gauche et cyan à droite.',
    price: 80,
    rarity: 'rare',
    accent: '#FF4B4B',
    image: require('../../../assets/shop/atelier/lighting/scenes/lighting-competition-scene.png'),
  },
  {
    id: 'lighting_emerald',
    category: 'lighting',
    slot: 'vitrine_eclairage',
    name: 'Émeraude vert / or',
    description: 'Un vert profond bordé d’or pour une vitrine rare et statutaire.',
    price: 120,
    rarity: 'rare',
    accent: '#38D996',
    image: require('../../../assets/shop/atelier/lighting/scenes/lighting-emerald-scene.png'),
  },
  {
    id: 'lighting_acid',
    category: 'lighting',
    slot: 'vitrine_eclairage',
    name: 'Victoire Clutch',
    description: 'Le jaune acide signature converge vers le rang central comme un instant de victoire.',
    price: 80,
    rarity: 'rare',
    accent: '#E8FF3D',
    image: require('../../../assets/shop/atelier/lighting/scenes/lighting-victory-scene.png'),
  },
  ...SHOWCASE_PRESENTER_CATALOG.filter((presenter) => !presenter.packOnly).map((presenter) => ({
    id: presenter.id,
    category: 'supports' as const,
    slot: 'vitrine_supports' as const,
    name: presenter.name,
    description: presenter.description,
    price: presenter.price,
    rarity: presenter.rarity,
    accent: presenter.accent,
    image: presenter.image,
  })),
  ...SHOWCASE_RANK_DISPLAY_CATALOG.map((display) => ({
    id: display.id,
    category: 'ranks' as const,
    slot: 'vitrine_rang' as const,
    name: display.name,
    description: display.description,
    price: display.price,
    rarity: display.rarity,
    accent: display.accent,
    image: display.image,
    overlayImage: display.overlayImage,
  })),
  {
    id: 'jersey_locker',
    category: 'jerseys',
    slot: 'vitrine_maillot',
    name: 'Vestiaire',
    description: 'Le maillot suspendu dans un vestiaire sombre, sobre et immédiatement lisible.',
    price: 0,
    rarity: 'commun',
    accent: '#7B8791',
    image: require('../../../assets/shop/atelier/jerseys/jersey_locker.png'),
  },
  {
    id: 'jersey_gallery',
    category: 'jerseys',
    slot: 'vitrine_maillot',
    name: 'Galerie',
    description: 'Une présentation encadrée comme une pièce historique de la collection.',
    price: 200,
    rarity: 'rare',
    accent: '#B3BAC0',
    image: require('../../../assets/shop/atelier/jerseys/jersey_gallery.png'),
  },
  {
    id: 'jersey_podium',
    category: 'jerseys',
    slot: 'vitrine_maillot',
    name: 'Podium',
    description: 'Un buste sur podium noir pour donner au maillot une présence de scène.',
    price: 240,
    rarity: 'epique',
    accent: '#C28A5A',
    image: require('../../../assets/shop/atelier/jerseys/jersey_podium.png'),
  },
] as const;

export const ATELIER_DISCOVERY_ENTRIES: readonly {
  description: string;
  glyph: string;
  kind: AtelierDiscoveryKind;
  label: string;
}[] = [
  { kind: 'team_pack', label: 'PACKS ÉQUIPES', description: 'Fnatic et Karmine Corp disponibles', glyph: '⬡' },
  { kind: 'partner_pack', label: 'COLLABS', description: 'Collaborations autorisées à venir', glyph: '✦' },
] as const;

export const ATELIER_PRODUCT_IDS = new Set(ATELIER_CATALOG.map((product) => product.id));

export function atelierProducts(category: AtelierCategory) {
  return ATELIER_CATALOG.filter((product) => product.category === category);
}

export function atelierProductById(id: string | null | undefined) {
  return ATELIER_CATALOG.find((product) => product.id === id) ?? null;
}

export function createAtelierPreviewItems(): CosmeticItem[] {
  return ATELIER_CATALOG.map((product) => {
    const included = product.price === 0;
    return {
      id: product.id,
      slot: product.slot,
      family: COSMETIC_FAMILY_BY_SLOT[product.slot],
      level: atelierProducts(product.category).findIndex((candidate) => candidate.id === product.id) + 1,
      name: product.name,
      description: product.description,
      rarity: product.rarity,
      styleKey: product.id.replace(/_/g, '-'),
      accent: product.accent,
      price: product.price,
      collectionKey: 'atelier',
      source: included ? 'gratuit' : 'achat',
      team: null,
      brandKey: null,
      campaignKey: null,
      seasonId: null,
      availableFrom: null,
      availableUntil: null,
      publicationStatus: 'publie',
      license: { type: 'interne', holder: 'GRIFF' },
      included,
      available: true,
      acquirable: true,
      owned: included,
      equipped: included,
    };
  });
}

export function isAtelierItem(item: CosmeticItem) {
  return ATELIER_PRODUCT_IDS.has(item.id);
}
