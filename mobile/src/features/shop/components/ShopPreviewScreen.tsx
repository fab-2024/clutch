import { Redirect, useLocalSearchParams } from 'expo-router';

import { previewRoutesEnabled } from '@/src/components/dev/PreviewRoute';
import { PREVIEW_PROFILE } from '@/src/features/profile/components/ProfilePreviewScreen';

import { atelierProductById, createAtelierPreviewItems } from '../atelierCatalog';
import {
  COSMETIC_FAMILY_BY_SLOT,
  DEFAULT_MONETIZATION_CONTRACT,
  type CosmeticItem,
  type CosmeticShopData,
  type CosmeticSlot,
  type EquippedCosmetic,
} from '../types';
import ShopScreen from './ShopScreen';

const DEFINITIONS: [CosmeticSlot, string, string, string, number, string][] = [
  ['cadre_profil', 'Cadre Brut', 'frame-raw', '#AAB4BE', 0, 'commun'],
  ['cadre_profil', 'Signal Volt', 'frame-volt', '#E8FF3D', 350, 'rare'],
  ['cadre_profil', 'Prisme Arena', 'frame-prism', '#63B8FF', 850, 'epique'],
  ['cadre_profil', 'Obsidienne', 'frame-obsidian', '#B68CFF', 1500, 'legendaire'],
  ['titre_profil', 'Rookie du Call', 'title-rookie', '#AAB4BE', 0, 'commun'],
  ['titre_profil', 'Lecteur du Jeu', 'title-reader', '#63B8FF', 250, 'rare'],
  ['titre_profil', 'Instinct GRIFF', 'title-instinct', '#E8FF3D', 650, 'epique'],
  ['titre_profil', 'Architecte du Chaos', 'title-architect', '#FFB84D', 1100, 'legendaire'],
  ['apparence_core', 'Core Origine', 'core-origin', '#E8FF3D', 0, 'commun'],
  ['apparence_core', 'Core Plasma', 'core-plasma', '#FF5DDF', 600, 'rare'],
  ['apparence_core', 'Core Holographique', 'core-holo', '#54D9FF', 1200, 'epique'],
  ['apparence_core', 'Core Éclipse', 'core-eclipse', '#F5F6F2', 2200, 'legendaire'],
  ['effet_faction', 'Aura Discrète', 'faction-aura', '#C6A34A', 0, 'commun'],
  ['effet_faction', 'Veines Volt', 'faction-veins', '#E8FF3D', 500, 'rare'],
  ['effet_faction', 'Éclat de Guerre', 'faction-war', '#FFB84D', 1100, 'epique'],
  ['effet_faction', 'Mutation Instable', 'faction-mutation', '#D886FF', 2000, 'legendaire'],
  ['carte_profil', 'Carte Noire', 'card-black', '#AAB4BE', 0, 'commun'],
  ['carte_profil', 'Signal Acide', 'card-signal', '#E8FF3D', 400, 'rare'],
  ['carte_profil', 'Scoreboard', 'card-scoreboard', '#63B8FF', 900, 'epique'],
  ['carte_profil', 'Légende Nocturne', 'card-nocturne', '#A982FF', 1700, 'legendaire'],
];

const ITEMS: CosmeticItem[] = DEFINITIONS.map(([slot, name, styleKey, accent, price, rarity], index) => ({
  id: `preview-${styleKey}`,
  slot,
  family: COSMETIC_FAMILY_BY_SLOT[slot],
  level: index % 4 + 1,
  name,
  description: price ? 'Une signature visuelle pure, sans aucun avantage compétitif.' : 'Le style de départ inclus avec ton profil.',
  rarity: rarity as CosmeticItem['rarity'],
  styleKey,
  accent,
  price,
  collectionKey: 'origine',
  source: price ? 'achat' : 'gratuit',
  team: null,
  brandKey: null,
  campaignKey: null,
  seasonId: null,
  availableFrom: null,
  availableUntil: null,
  publicationStatus: 'publie',
  license: { type: 'interne', holder: 'GRIFF' },
  included: price === 0,
  available: true,
  acquirable: true,
  owned: price === 0 || styleKey === 'frame-volt' || styleKey === 'title-reader',
  equipped: styleKey === 'frame-volt' || styleKey === 'title-reader' || styleKey === 'core-origin' || styleKey === 'faction-aura' || styleKey === 'card-black',
}));
const ATELIER_ITEMS = createAtelierPreviewItems();

export const PREVIEW_SHOP: CosmeticShopData = {
  balance: 1280,
  items: [...ITEMS, ...ATELIER_ITEMS],
  equipped: {
    frame: previewEquipped(ITEMS, 'cadre_profil'),
    title: previewEquipped(ITEMS, 'titre_profil'),
    core: previewEquipped(ITEMS, 'apparence_core'),
    factionEffect: previewEquipped(ITEMS, 'effet_faction'),
    profileCard: previewEquipped(ITEMS, 'carte_profil'),
    showcase: {
      material: previewEquipped(ATELIER_ITEMS, 'vitrine_materiau'),
      lighting: previewEquipped(ATELIER_ITEMS, 'vitrine_eclairage'),
      supports: previewEquipped(ATELIER_ITEMS, 'vitrine_supports'),
      jersey: previewEquipped(ATELIER_ITEMS, 'vitrine_maillot'),
    },
  },
  contract: DEFAULT_MONETIZATION_CONTRACT,
};

function previewEquipped(items: CosmeticItem[], slot: CosmeticSlot): EquippedCosmetic | null {
  const item = items.find((candidate) => candidate.slot === slot && candidate.equipped);
  if (!item) return null;
  const { id, level, name, description, rarity, styleKey, accent } = item;
  return { id, slot, level, name, description, rarity, styleKey, accent };
}

export default function ShopPreviewScreen() {
  const params = useLocalSearchParams<{
    product?: string | string[];
    state?: string | string[];
  }>();
  if (!previewRoutesEnabled) return <Redirect href="/" />;
  const state = previewState(readParam(params.state));
  const requestedProduct = atelierProductById(readParam(params.product));
  const productId = requestedProduct?.id
    ?? (state === 'purchase' || state === 'insufficient' || state === 'equip' ? 'material_steel' : undefined);
  const data = previewDataForState(state);

  return (
    <ShopScreen
      previewAtelierState={{
        error: state === 'error' ? 'Connexion indisponible. La dernière configuration reste visible.' : null,
        loading: state === 'loading',
        productId,
        purchaseOpen: state === 'purchase',
      }}
      previewData={data}
      previewProfile={PREVIEW_PROFILE}
    />
  );
}

type ShopPreviewState = 'default' | 'equip' | 'error' | 'insufficient' | 'loading' | 'purchase';

function previewState(value?: string): ShopPreviewState {
  if (value === 'equip' || value === 'error' || value === 'insufficient' || value === 'loading' || value === 'purchase') {
    return value;
  }
  return 'default';
}

function previewDataForState(state: ShopPreviewState): CosmeticShopData {
  if (state === 'insufficient') return { ...PREVIEW_SHOP, balance: 60 };
  if (state === 'equip') {
    return {
      ...PREVIEW_SHOP,
      items: PREVIEW_SHOP.items.map((item) => item.id === 'material_steel'
        ? { ...item, equipped: false, owned: true }
        : item),
    };
  }
  return PREVIEW_SHOP;
}

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
