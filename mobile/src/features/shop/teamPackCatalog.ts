import type { ImageSourcePropType } from 'react-native';

import type {
  ShowcasePlaceableKind,
  ShowcaseRoomSlotId,
} from '@/src/features/profile/components/showcase/roomEditor';

import {
  COSMETIC_FAMILY_BY_SLOT,
  type CosmeticItem,
  type CosmeticRarity,
  type CosmeticShopData,
  type CosmeticSlot,
  type EquippedCosmetic,
  type EquippedCosmetics,
} from './types';

export type TeamPackItemDefinition = {
  accent: string;
  description: string;
  equipByDefault: boolean;
  id: string;
  image: ImageSourcePropType;
  name: string;
  number: number;
  rarity: CosmeticRarity;
  roomKind?: ShowcasePlaceableKind;
  roomSlot?: ShowcaseRoomSlotId;
  slot: CosmeticSlot;
};

export type TeamPackDefinition = {
  accent: string;
  brandKey: string;
  description: string;
  hero: ImageSourcePropType;
  id: string;
  items: readonly TeamPackItemDefinition[];
  licenseHolder: string;
  name: string;
  price: number;
  subtitle: string;
  title: string;
};

export type TeamPackPrimaryAction =
  | 'buy'
  | 'equip'
  | 'equipped'
  | 'insufficient'
  | 'unavailable';

const FNATIC_ORANGE = '#FF5900';
const KC_BLUE = '#168DFF';

export const FNATIC_TEAM_PACK: TeamPackDefinition = {
  id: 'fnatic-black-orange',
  brandKey: 'fnatic',
  name: 'Pack Fnatic',
  title: 'FNATIC',
  subtitle: 'BLACK & ORANGE',
  description: 'Douze cosmétiques officiels pour transformer ta Vitrine en salle Fnatic.',
  accent: FNATIC_ORANGE,
  price: 1200,
  licenseHolder: 'Fnatic',
  hero: require('../../../assets/shop/team-packs/fnatic/fnatic-black-orange-hero.png'),
  items: [
    {
      id: 'fnatic-room-lighting',
      number: 1,
      name: 'Salle + éclairage',
      description: 'Une salle graphite bordée de lumière orange, réservée au pack Fnatic.',
      slot: 'vitrine_eclairage',
      rarity: 'legendaire',
      accent: FNATIC_ORANGE,
      equipByDefault: true,
      image: require('../../../assets/shop/team-packs/fnatic/items/fnatic-room-lighting.png'),
    },
    {
      id: 'fnatic-jersey',
      number: 2,
      name: 'Maillot Fnatic',
      description: 'Le maillot noir Fnatic, relevé de l’orange iconique de l’équipe.',
      slot: 'vitrine_maillot',
      rarity: 'epique',
      accent: FNATIC_ORANGE,
      equipByDefault: true,
      roomKind: 'jersey',
      roomSlot: 'jersey',
      image: require('../../../assets/shop/team-packs/fnatic/items/fnatic-jersey.png'),
    },
    {
      id: 'fnatic-logo-3d',
      number: 3,
      name: 'Logo 3D',
      description: 'Le monogramme Fnatic sculpté en métal orange pour signer la salle.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: FNATIC_ORANGE,
      equipByDefault: true,
      roomKind: 'core',
      roomSlot: 'right-extra',
      image: require('../../../assets/shop/team-packs/fnatic/items/fnatic-logo-3d.png'),
    },
    {
      id: 'fnatic-banner',
      number: 4,
      name: 'Bannière',
      description: 'Une bannière textile noire frappée du logo Fnatic orange.',
      slot: 'carte_profil',
      rarity: 'rare',
      accent: FNATIC_ORANGE,
      equipByDefault: false,
      roomKind: 'banner',
      roomSlot: 'left-extra',
      image: require('../../../assets/shop/team-packs/fnatic/items/fnatic-banner.png'),
    },
    {
      id: 'fnatic-pedestals',
      number: 5,
      name: 'Socles + projection',
      description: 'Des socles noir et orange qui projettent la signature Fnatic au sol.',
      slot: 'vitrine_supports',
      rarity: 'legendaire',
      accent: FNATIC_ORANGE,
      equipByDefault: true,
      image: require('../../../assets/shop/team-packs/fnatic/items/fnatic-pedestals.png'),
    },
    {
      id: 'fnatic-supporter-token',
      number: 6,
      name: 'Jeton supporter',
      description: 'Un jeton métallique Fnatic à exposer dans un emplacement libre.',
      slot: 'apparence_core',
      rarity: 'rare',
      accent: FNATIC_ORANGE,
      equipByDefault: false,
      roomKind: 'ring',
      roomSlot: 'ring',
      image: require('../../../assets/shop/team-packs/fnatic/items/fnatic-supporter-token.png'),
    },
    {
      id: 'fnatic-totem',
      number: 7,
      name: 'Figurine totem',
      description: 'Un totem de bureau Fnatic monté sur un socle noir de collection.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: FNATIC_ORANGE,
      equipByDefault: false,
      roomKind: 'trophy',
      roomSlot: 'trophy',
      image: require('../../../assets/shop/team-packs/fnatic/items/fnatic-totem.png'),
    },
    {
      id: 'fnatic-supporter-badge',
      number: 8,
      name: 'Badge supporter',
      description: 'Un badge Fnatic cerclé de métal, pensé pour la Vitrine supporter.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: FNATIC_ORANGE,
      equipByDefault: false,
      roomKind: 'badge',
      roomSlot: 'badge',
      image: require('../../../assets/shop/team-packs/fnatic/items/fnatic-supporter-badge.png'),
    },
    {
      id: 'fnatic-profile-frame',
      number: 9,
      name: 'Cadre de profil',
      description: 'Un cadre carbone renforcé de liserés orange pour ton identité publique.',
      slot: 'cadre_profil',
      rarity: 'epique',
      accent: FNATIC_ORANGE,
      equipByDefault: true,
      roomKind: 'frame',
      roomSlot: 'left-free',
      image: require('../../../assets/shop/team-packs/fnatic/items/fnatic-profile-frame.png'),
    },
    {
      id: 'fnatic-embers',
      number: 10,
      name: 'Effet braises',
      description: 'Une impulsion de braises orange à l’entrée, puis un halo discret au repos.',
      slot: 'effet_faction',
      rarity: 'legendaire',
      accent: FNATIC_ORANGE,
      equipByDefault: true,
      image: require('../../../assets/shop/team-packs/fnatic/items/fnatic-embers.png'),
    },
    {
      id: 'fnatic-share-card',
      number: 11,
      name: 'Carte de partage',
      description: 'Une carte paysage Fnatic prête à mettre en scène ta Vitrine équipée.',
      slot: 'carte_profil',
      rarity: 'epique',
      accent: FNATIC_ORANGE,
      equipByDefault: true,
      roomKind: 'banner',
      roomSlot: 'right-free',
      image: require('../../../assets/shop/team-packs/fnatic/items/fnatic-share-card.png'),
    },
    {
      id: 'fnatic-title',
      number: 12,
      name: 'Always Fnatic',
      description: 'Le titre supporter « Always Fnatic » pour afficher ton équipe sans détour.',
      slot: 'titre_profil',
      rarity: 'epique',
      accent: FNATIC_ORANGE,
      equipByDefault: true,
      roomKind: 'title',
      roomSlot: 'title',
      image: require('../../../assets/shop/team-packs/fnatic/items/fnatic-title.png'),
    },
  ],
};

export const KC_TEAM_PACK: TeamPackDefinition = {
  id: 'kc-blue-wall',
  brandKey: 'kc',
  name: 'Pack Karmine Corp',
  title: 'KARMINE CORP',
  subtitle: 'BLUE WALL',
  description: 'Douze cosmétiques officiels pour transformer ta Vitrine en Blue Wall.',
  accent: KC_BLUE,
  price: 1200,
  licenseHolder: 'Karmine Corp',
  hero: require('../../../assets/shop/team-packs/kc/kc-blue-wall-hero.png'),
  items: [
    {
      id: 'kc-room-lighting',
      number: 1,
      name: 'Salle + éclairage',
      description: 'Une salle graphite soulignée de bleu électrique, réservée au Blue Wall.',
      slot: 'vitrine_eclairage',
      rarity: 'legendaire',
      accent: KC_BLUE,
      equipByDefault: true,
      image: require('../../../assets/shop/team-packs/kc/items/kc-room-lighting.png'),
    },
    {
      id: 'kc-jersey',
      number: 2,
      name: 'Maillot KC',
      description: 'Le maillot noir et bleu de la Karmine Corp, frappé du monogramme blanc.',
      slot: 'vitrine_maillot',
      rarity: 'epique',
      accent: KC_BLUE,
      equipByDefault: true,
      roomKind: 'jersey',
      roomSlot: 'jersey',
      image: require('../../../assets/shop/team-packs/kc/items/kc-jersey.png'),
    },
    {
      id: 'kc-logo-3d',
      number: 3,
      name: 'Logo 3D',
      description: 'Le monogramme KC sculpté en métal blanc et bleu pour signer la salle.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: KC_BLUE,
      equipByDefault: true,
      roomKind: 'core',
      roomSlot: 'right-extra',
      image: require('../../../assets/shop/team-packs/kc/items/kc-logo-3d.png'),
    },
    {
      id: 'kc-banner',
      number: 4,
      name: 'Bannière Blue Wall',
      description: 'Une bannière textile bleu nuit dédiée au Blue Wall.',
      slot: 'carte_profil',
      rarity: 'rare',
      accent: KC_BLUE,
      equipByDefault: false,
      roomKind: 'banner',
      roomSlot: 'left-extra',
      image: require('../../../assets/shop/team-packs/kc/items/kc-banner.png'),
    },
    {
      id: 'kc-pedestals',
      number: 5,
      name: 'Socles + projection',
      description: 'Des socles noir et bleu qui projettent le monogramme KC au sol.',
      slot: 'vitrine_supports',
      rarity: 'legendaire',
      accent: KC_BLUE,
      equipByDefault: true,
      image: require('../../../assets/shop/team-packs/kc/items/kc-pedestals.png'),
    },
    {
      id: 'kc-supporter-token',
      number: 6,
      name: 'Jeton supporter',
      description: 'Un jeton métallique KC serti de points lumineux bleus.',
      slot: 'apparence_core',
      rarity: 'rare',
      accent: KC_BLUE,
      equipByDefault: false,
      roomKind: 'ring',
      roomSlot: 'ring',
      image: require('../../../assets/shop/team-packs/kc/items/kc-supporter-token.png'),
    },
    {
      id: 'kc-totem',
      number: 7,
      name: 'Figurine KC Totem',
      description: 'Le monogramme KC dressé sur un socle bleu nuit de collection.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: KC_BLUE,
      equipByDefault: false,
      roomKind: 'trophy',
      roomSlot: 'trophy',
      image: require('../../../assets/shop/team-packs/kc/items/kc-totem.png'),
    },
    {
      id: 'kc-supporter-badge',
      number: 8,
      name: 'Badge KC supporter',
      description: 'Un badge KC cerclé de métal et d’un halo bleu électrique.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: KC_BLUE,
      equipByDefault: false,
      roomKind: 'badge',
      roomSlot: 'badge',
      image: require('../../../assets/shop/team-packs/kc/items/kc-supporter-badge.png'),
    },
    {
      id: 'kc-profile-frame',
      number: 9,
      name: 'Cadre de profil',
      description: 'Un cadre acier renforcé de quatre angles lumineux aux couleurs de KC.',
      slot: 'cadre_profil',
      rarity: 'epique',
      accent: KC_BLUE,
      equipByDefault: true,
      roomKind: 'frame',
      roomSlot: 'left-free',
      image: require('../../../assets/shop/team-packs/kc/items/kc-profile-frame.png'),
    },
    {
      id: 'kc-blue-wall-effect',
      number: 10,
      name: 'Effet Blue Wall',
      description: 'Une vague bleue se propage à l’entrée, puis devient un halo discret.',
      slot: 'effet_faction',
      rarity: 'legendaire',
      accent: KC_BLUE,
      equipByDefault: true,
      image: require('../../../assets/shop/team-packs/kc/items/kc-blue-wall-effect.png'),
    },
    {
      id: 'kc-share-card',
      number: 11,
      name: 'Carte de partage KC',
      description: 'Une carte paysage Blue Wall prête à mettre en scène ta Vitrine équipée.',
      slot: 'carte_profil',
      rarity: 'epique',
      accent: KC_BLUE,
      equipByDefault: true,
      roomKind: 'banner',
      roomSlot: 'right-free',
      image: require('../../../assets/shop/team-packs/kc/items/kc-share-card.png'),
    },
    {
      id: 'kc-title',
      number: 12,
      name: 'Blue Wall',
      description: 'Le titre supporter « Blue Wall » pour afficher ton équipe sans détour.',
      slot: 'titre_profil',
      rarity: 'epique',
      accent: KC_BLUE,
      equipByDefault: true,
      roomKind: 'title',
      roomSlot: 'title',
      image: require('../../../assets/shop/team-packs/kc/items/kc-title.png'),
    },
  ],
};

export const TEAM_PACK_CATALOG: readonly TeamPackDefinition[] = [FNATIC_TEAM_PACK, KC_TEAM_PACK];

const TEAM_PACK_ITEM_BY_ID = new Map(
  TEAM_PACK_CATALOG.flatMap((pack) => pack.items.map((item) => [item.id, item] as const)),
);

export function teamPackById(id: string | null | undefined) {
  return TEAM_PACK_CATALOG.find((pack) => pack.id === id) ?? null;
}

export function teamPackItemById(id: string | null | undefined) {
  return id ? TEAM_PACK_ITEM_BY_ID.get(id) ?? null : null;
}

export function teamPackRuntimeItems(pack: TeamPackDefinition, data: CosmeticShopData | null | undefined) {
  const ids = new Set(pack.items.map((item) => item.id));
  return (data?.items ?? []).filter((item) => ids.has(item.id));
}

export function teamPackPrimaryAction(
  pack: TeamPackDefinition,
  data: CosmeticShopData | null | undefined,
): TeamPackPrimaryAction {
  if (!data) return 'unavailable';
  const byId = new Map(teamPackRuntimeItems(pack, data).map((item) => [item.id, item]));
  if (byId.size !== pack.items.length) return 'unavailable';

  const owned = pack.items.every((definition) => byId.get(definition.id)?.owned === true);
  if (owned) {
    const equipped = pack.items
      .filter((definition) => definition.equipByDefault)
      .every((definition) => byId.get(definition.id)?.equipped === true);
    return equipped ? 'equipped' : 'equip';
  }
  return data.balance >= pack.price ? 'buy' : 'insufficient';
}

export function createTeamPackPreviewItems(pack: TeamPackDefinition = FNATIC_TEAM_PACK): CosmeticItem[] {
  return pack.items.map((definition, index) => ({
    id: definition.id,
    slot: definition.slot,
    family: COSMETIC_FAMILY_BY_SLOT[definition.slot],
    level: index + 1,
    name: definition.name,
    description: definition.description,
    rarity: definition.rarity,
    styleKey: definition.id,
    accent: definition.accent,
    price: 0,
    collectionKey: pack.id,
    source: 'team_pack',
    team: null,
    brandKey: pack.brandKey,
    campaignKey: null,
    seasonId: null,
    availableFrom: null,
    availableUntil: null,
    publicationStatus: 'publie',
    license: { type: 'partenaire', holder: pack.licenseHolder },
    included: false,
    available: true,
    acquirable: false,
    owned: false,
    equipped: false,
  }));
}

export function applyPreviewTeamPackAction(
  data: CosmeticShopData,
  pack: TeamPackDefinition = FNATIC_TEAM_PACK,
): CosmeticShopData {
  const action = teamPackPrimaryAction(pack, data);
  if (action !== 'buy' && action !== 'equip') return data;

  const definitionById = new Map(pack.items.map((item) => [item.id, item]));
  const defaultBySlot = new Map(
    pack.items
      .filter((item) => item.equipByDefault)
      .map((item) => [item.slot, item.id] as const),
  );
  const nextItems = data.items.map((item) => {
    const definition = definitionById.get(item.id);
    if (definition) {
      return {
        ...item,
        owned: true,
        equipped: definition.equipByDefault,
      };
    }
    return defaultBySlot.has(item.slot) ? { ...item, equipped: false } : item;
  });

  return {
    ...data,
    balance: action === 'buy' ? Math.max(0, data.balance - pack.price) : data.balance,
    items: nextItems,
    equipped: equipmentFromPack(nextItems, data.equipped, defaultBySlot),
  };
}

function equipmentFromPack(
  items: CosmeticItem[],
  fallback: EquippedCosmetics,
  defaultBySlot: ReadonlyMap<CosmeticSlot, string>,
): EquippedCosmetics {
  const find = (slot: CosmeticSlot): EquippedCosmetic | null => {
    const id = defaultBySlot.get(slot);
    const item = id ? items.find((candidate) => candidate.id === id) : null;
    return item ? asEquipped(item) : null;
  };

  return {
    frame: find('cadre_profil') ?? fallback.frame,
    title: find('titre_profil') ?? fallback.title,
    core: find('apparence_core') ?? fallback.core,
    factionEffect: find('effet_faction') ?? fallback.factionEffect,
    profileCard: find('carte_profil') ?? fallback.profileCard,
    showcase: {
      material: fallback.showcase.material,
      lighting: find('vitrine_eclairage') ?? fallback.showcase.lighting,
      supports: find('vitrine_supports') ?? fallback.showcase.supports,
      rankDisplay: fallback.showcase.rankDisplay,
      jersey: find('vitrine_maillot') ?? fallback.showcase.jersey,
    },
  };
}

function asEquipped(item: CosmeticItem): EquippedCosmetic {
  const { accent, description, id, level, name, rarity, slot, styleKey } = item;
  return { accent, description, id, level, name, rarity, slot, styleKey };
}
