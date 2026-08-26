import type { ImageSourcePropType } from 'react-native';

import {
  COSMETIC_FAMILY_BY_SLOT,
  type CosmeticItem,
  type CosmeticRarity,
  type ShowcaseAtelierSlot,
} from './types';

export const ATELIER_CATEGORIES = [
  'materials',
  'lighting',
  'supports',
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
  supports: { glyph: '◫', label: 'SUPPORTS', shortLabel: 'SOCLES', slot: 'vitrine_supports' },
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
    id: 'lighting_acid',
    category: 'lighting',
    slot: 'vitrine_eclairage',
    name: 'Acide GRIFF',
    description: 'Une lumière jaune acide concentrée sur les arêtes et les objets exposés.',
    price: 80,
    rarity: 'rare',
    accent: '#E8FF3D',
    image: require('../../../assets/shop/atelier/lighting/lighting_acid.png'),
  },
  {
    id: 'lighting_cyan',
    category: 'lighting',
    slot: 'vitrine_eclairage',
    name: 'Cryo cyan',
    description: 'Le faisceau cyan froid installé par défaut dans la Vitrine GRIFF.',
    price: 0,
    rarity: 'commun',
    accent: '#31D7E2',
    image: require('../../../assets/shop/atelier/lighting/lighting_cyan.png'),
  },
  {
    id: 'lighting_violet',
    category: 'lighting',
    slot: 'vitrine_eclairage',
    name: 'Nova violet',
    description: 'Un violet profond qui révèle les volumes sans transformer la pièce en néon.',
    price: 100,
    rarity: 'rare',
    accent: '#9A6BFF',
    image: require('../../../assets/shop/atelier/lighting/lighting_violet.png'),
  },
  {
    id: 'lighting_amber',
    category: 'lighting',
    slot: 'vitrine_eclairage',
    name: 'Victoire ambre',
    description: 'Un éclairage ambre chaud pensé pour les trophées et les finitions bronze.',
    price: 100,
    rarity: 'rare',
    accent: '#E2B25D',
    image: require('../../../assets/shop/atelier/lighting/lighting_amber.png'),
  },
  {
    id: 'lighting_white',
    category: 'lighting',
    slot: 'vitrine_eclairage',
    name: 'Arène blanche',
    description: 'Une lumière blanche franche, équilibrée comme une présentation d’arène.',
    price: 80,
    rarity: 'rare',
    accent: '#F1F4F4',
    image: require('../../../assets/shop/atelier/lighting/lighting_white.png'),
  },
  {
    id: 'supports_forge',
    category: 'supports',
    slot: 'vitrine_supports',
    name: 'Forge',
    description: 'Des socles lourds aux liserés bronze, conçus comme des pièces d’atelier.',
    price: 220,
    rarity: 'epique',
    accent: '#B4774E',
    image: require('../../../assets/shop/atelier/supports/supports_forge.png'),
  },
  {
    id: 'supports_gallery',
    category: 'supports',
    slot: 'vitrine_supports',
    name: 'Galerie',
    description: 'Des supports noirs minimalistes qui concentrent le regard sur la collection.',
    price: 0,
    rarity: 'commun',
    accent: '#8A959E',
    image: require('../../../assets/shop/atelier/supports/supports_gallery.png'),
  },
  {
    id: 'supports_halo',
    category: 'supports',
    slot: 'vitrine_supports',
    name: 'Halo',
    description: 'Des anneaux cyan sous chaque pièce pour une suspension visuelle maîtrisée.',
    price: 280,
    rarity: 'epique',
    accent: '#31D7E2',
    image: require('../../../assets/shop/atelier/supports/supports_halo.png'),
  },
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
  { kind: 'team_pack', label: 'PACKS ÉQUIPES', description: 'Collections officielles à venir', glyph: '⬡' },
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
