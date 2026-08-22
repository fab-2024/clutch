import { Redirect } from 'expo-router';

import {
  DEFAULT_MONETIZATION_CONTRACT,
  type CosmeticItem,
  type CosmeticShopData,
  type CosmeticSlot,
} from '../types';
import ShopScreen from './ShopScreen';

const DEFINITIONS: Array<[CosmeticSlot, string, string, string, number, string]> = [
  ['cadre_profil', 'Cadre Brut', 'frame-raw', '#AAB4BE', 0, 'commun'],
  ['cadre_profil', 'Signal Volt', 'frame-volt', '#E8FF3D', 350, 'rare'],
  ['cadre_profil', 'Prisme Arena', 'frame-prism', '#63B8FF', 850, 'epique'],
  ['cadre_profil', 'Obsidienne', 'frame-obsidian', '#B68CFF', 1500, 'legendaire'],
  ['titre_profil', 'Rookie du Call', 'title-rookie', '#AAB4BE', 0, 'commun'],
  ['titre_profil', 'Lecteur du Jeu', 'title-reader', '#63B8FF', 250, 'rare'],
  ['titre_profil', 'Instinct Clutch', 'title-instinct', '#E8FF3D', 650, 'epique'],
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
  level: index % 4 + 1,
  name,
  description: price ? 'Une signature visuelle pure, sans aucun avantage compétitif.' : 'Le style de départ inclus avec ton profil.',
  rarity: rarity as CosmeticItem['rarity'],
  styleKey,
  accent,
  price,
  owned: price === 0 || styleKey === 'frame-volt' || styleKey === 'title-reader',
  equipped: styleKey === 'frame-volt' || styleKey === 'title-reader' || styleKey === 'core-origin' || styleKey === 'faction-aura' || styleKey === 'card-black',
}));

const PREVIEW_SHOP: CosmeticShopData = {
  balance: 1280,
  items: ITEMS,
  equipped: { frame: null, title: null, core: null, factionEffect: null, profileCard: null },
  contract: DEFAULT_MONETIZATION_CONTRACT,
};

export default function ShopPreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ShopScreen previewData={PREVIEW_SHOP} />;
}
