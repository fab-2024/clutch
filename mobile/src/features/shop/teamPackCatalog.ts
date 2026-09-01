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

export type CosmeticPackKind = 'game_collection' | 'original' | 'team';

export type TeamPackDefinition = {
  accent: string;
  brandKey: string;
  description: string;
  hero: ImageSourcePropType;
  id: string;
  items: readonly TeamPackItemDefinition[];
  kind: CosmeticPackKind;
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
const M8_ICE = '#B9DCFF';
const LOL_GOLD = '#D6B56A';
const VALORANT_RED = '#FF4655';
const ROCKET_LEAGUE_ORANGE = '#FF8A24';
const NEON_CYAN = '#58DFFF';
const FORGE_ORANGE = '#F06A3A';

export const NEON_PROTOCOL_PACK: TeamPackDefinition = {
  id: 'neon-protocol',
  kind: 'original',
  brandKey: 'clutch-originals',
  name: 'Pack Protocole Néon',
  title: 'PROTOCOLE NÉON',
  subtitle: 'SYNAPSE // ARCHITECTE',
  description: 'Douze cosmétiques originaux pour transformer ta Vitrine en chambre Synapse.',
  accent: NEON_CYAN,
  price: 1200,
  licenseHolder: 'Clutch',
  hero: require('../../../assets/shop/packs/neon-protocol/neon-protocol-hero.png'),
  items: [
    {
      id: 'neon-protocol-room',
      number: 1,
      name: 'Salle Synapse',
      description: 'Une chambre orbitale graphite ouverte sur l’espace et soulignée de cyan néon.',
      slot: 'vitrine_eclairage',
      rarity: 'legendaire',
      accent: NEON_CYAN,
      equipByDefault: true,
      image: require('../../../assets/shop/packs/neon-protocol/neon-protocol-room-empty.png'),
    },
    {
      id: 'neon-protocol-armor-vega',
      number: 2,
      name: 'Armure Vega',
      description: 'Une armure céramique ivoire sur exostructure graphite, traversée de lignes cyan.',
      slot: 'vitrine_maillot',
      rarity: 'epique',
      accent: NEON_CYAN,
      equipByDefault: true,
      roomKind: 'jersey',
      roomSlot: 'jersey',
      image: require('../../../assets/shop/packs/neon-protocol/items/armor-vega.png'),
    },
    {
      id: 'neon-protocol-glyph-node',
      number: 3,
      name: 'Glyphe Nœud',
      description: 'Trois plaques ivoire convergent autour d’un nœud d’énergie magenta.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: '#E27AFF',
      equipByDefault: true,
      roomKind: 'core',
      roomSlot: 'right-extra',
      image: require('../../../assets/shop/packs/neon-protocol/items/glyph-node.png'),
    },
    {
      id: 'neon-protocol-banner-phase',
      number: 4,
      name: 'Bannière Phase',
      description: 'Une bannière graphite portant le glyphe du Protocole et ses liserés de phase.',
      slot: 'carte_profil',
      rarity: 'rare',
      accent: NEON_CYAN,
      equipByDefault: false,
      roomKind: 'banner',
      roomSlot: 'left-extra',
      image: require('../../../assets/shop/packs/neon-protocol/items/banner-phase.png'),
    },
    {
      id: 'neon-protocol-vector-pedestals',
      number: 5,
      name: 'Socle Vectoriel',
      description: 'Un réseau de socles en sustentation porté par des anneaux holographiques cyan.',
      slot: 'vitrine_supports',
      rarity: 'legendaire',
      accent: NEON_CYAN,
      equipByDefault: true,
      image: require('../../../assets/shop/packs/neon-protocol/items/vector-pedestal.png'),
    },
    {
      id: 'neon-protocol-syn-token',
      number: 6,
      name: 'Jeton Syn',
      description: 'Un jeton de circuit radial dont les pistes convergent vers un cristal magenta.',
      slot: 'apparence_core',
      rarity: 'rare',
      accent: NEON_CYAN,
      equipByDefault: false,
      roomKind: 'ring',
      roomSlot: 'ring',
      image: require('../../../assets/shop/packs/neon-protocol/items/syn-token.png'),
    },
    {
      id: 'neon-protocol-null-totem',
      number: 7,
      name: 'Totem Null',
      description: 'Une colonne de modules graphite maintenus en équilibre par un flux cyan.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: NEON_CYAN,
      equipByDefault: false,
      roomKind: 'trophy',
      roomSlot: 'trophy',
      image: require('../../../assets/shop/packs/neon-protocol/items/null-totem.png'),
    },
    {
      id: 'neon-protocol-pioneer-badge',
      number: 8,
      name: 'Badge Pionnier',
      description: 'Un badge octogonal cerclé d’une orbite métallique et signé du glyphe Nœud.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: '#E27AFF',
      equipByDefault: false,
      roomKind: 'badge',
      roomSlot: 'badge',
      image: require('../../../assets/shop/packs/neon-protocol/items/pioneer-badge.png'),
    },
    {
      id: 'neon-protocol-phase-frame',
      number: 9,
      name: 'Cadre Phase',
      description: 'Un cadre graphite angulaire aux inserts cyan et à l’éclat magenta.',
      slot: 'cadre_profil',
      rarity: 'epique',
      accent: NEON_CYAN,
      equipByDefault: true,
      roomKind: 'frame',
      roomSlot: 'left-free',
      image: require('../../../assets/shop/packs/neon-protocol/items/phase-frame.png'),
    },
    {
      id: 'neon-protocol-impulse-effect',
      number: 10,
      name: 'Effet Impulsion',
      description: 'Une impulsion cyan et magenta traverse la Vitrine avant de se stabiliser en halo.',
      slot: 'effet_faction',
      rarity: 'legendaire',
      accent: '#54CFFF',
      equipByDefault: true,
      image: require('../../../assets/shop/packs/neon-protocol/items/impulse-effect.png'),
    },
    {
      id: 'neon-protocol-share-card',
      number: 11,
      name: 'Carte de partage',
      description: 'Une carte paysage qui met en scène la chambre Synapse et sa collection équipée.',
      slot: 'carte_profil',
      rarity: 'epique',
      accent: '#E27AFF',
      equipByDefault: true,
      roomKind: 'banner',
      roomSlot: 'right-free',
      image: require('../../../assets/shop/packs/neon-protocol/items/share-card.png'),
    },
    {
      id: 'neon-protocol-architect-title',
      number: 12,
      name: 'Titre Architecte',
      description: 'Le titre « Architecte » pour signer les Vitrines conçues sous Protocole Néon.',
      slot: 'titre_profil',
      rarity: 'epique',
      accent: NEON_CYAN,
      equipByDefault: true,
      roomKind: 'title',
      roomSlot: 'title',
      image: require('../../../assets/shop/packs/neon-protocol/items/architect-title.png'),
    },
  ],
};

export const MYTHS_FORGE_PACK: TeamPackDefinition = {
  id: 'mythes-forge',
  kind: 'original',
  brandKey: 'clutch-originals',
  name: 'Pack Mythes de la Forge',
  title: 'MYTHES DE LA FORGE',
  subtitle: 'ORÉA // MAÎTRE-FORGE',
  description: 'Douze cosmétiques originaux façonnés dans le basalte, le cuivre et la braise.',
  accent: FORGE_ORANGE,
  price: 1200,
  licenseHolder: 'Clutch',
  hero: require('../../../assets/shop/packs/mythes-forge/mythes-forge-hero.png'),
  items: [
    {
      id: 'mythes-forge-room',
      number: 1,
      name: 'Forge des Failles',
      description: 'Une galerie de basalte traversée de veines de braise et de cuivre patiné.',
      slot: 'vitrine_eclairage',
      rarity: 'legendaire',
      accent: FORGE_ORANGE,
      equipByDefault: true,
      image: require('../../../assets/shop/packs/mythes-forge/mythes-forge-room-empty.png'),
    },
    {
      id: 'mythes-forge-armor-orea',
      number: 2,
      name: 'Armure Oréa',
      description: 'Une cuirasse ivoire et graphite forgée autour d’un noyau de cuivre incandescent.',
      slot: 'vitrine_maillot',
      rarity: 'epique',
      accent: '#E7DCCB',
      equipByDefault: true,
      roomKind: 'jersey',
      roomSlot: 'jersey',
      image: require('../../../assets/shop/packs/mythes-forge/items/armor-orea.png'),
    },
    {
      id: 'mythes-forge-ember-sigil',
      number: 3,
      name: 'Sigil de Braise',
      description: 'Un anneau fendu serti de trois braises qui pulse au rythme de la Forge.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: FORGE_ORANGE,
      equipByDefault: true,
      roomKind: 'core',
      roomSlot: 'right-extra',
      image: require('../../../assets/shop/packs/mythes-forge/items/ember-sigil.png'),
    },
    {
      id: 'mythes-forge-strata-banner',
      number: 4,
      name: 'Bannière Strate',
      description: 'Une bannière minérale noire, marquée d’un tracé cuivre original sans emblème tiers.',
      slot: 'carte_profil',
      rarity: 'rare',
      accent: '#C9784B',
      equipByDefault: false,
      roomKind: 'banner',
      roomSlot: 'left-extra',
      image: require('../../../assets/shop/packs/mythes-forge/items/strata-banner.png'),
    },
    {
      id: 'mythes-forge-magma-pedestals',
      number: 5,
      name: 'Socle Magmatique',
      description: 'Huit stations de basalte cerclées de métal forgé et éclairées par la roche en fusion.',
      slot: 'vitrine_supports',
      rarity: 'legendaire',
      accent: FORGE_ORANGE,
      equipByDefault: true,
      image: require('../../../assets/shop/packs/mythes-forge/items/magma-pedestal.png'),
    },
    {
      id: 'mythes-forge-telluric-token',
      number: 6,
      name: 'Jeton Tellurique',
      description: 'Un disque de roche striée dont la faille centrale diffuse une lueur tellurique.',
      slot: 'apparence_core',
      rarity: 'rare',
      accent: '#C9784B',
      equipByDefault: false,
      roomKind: 'ring',
      roomSlot: 'ring',
      image: require('../../../assets/shop/packs/mythes-forge/items/telluric-token.png'),
    },
    {
      id: 'mythes-forge-basalt-totem',
      number: 7,
      name: 'Totem Basalte',
      description: 'Une colonne de roche noire maintenue par des bagues d’ivoire et de cuivre.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: FORGE_ORANGE,
      equipByDefault: false,
      roomKind: 'trophy',
      roomSlot: 'trophy',
      image: require('../../../assets/shop/packs/mythes-forge/items/basalt-totem.png'),
    },
    {
      id: 'mythes-forge-artisan-badge',
      number: 8,
      name: 'Badge Artisan',
      description: 'Un badge hexagonal taillé dans la pierre, traversé d’un sigil de cuivre incandescent.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: '#43BFC1',
      equipByDefault: false,
      roomKind: 'badge',
      roomSlot: 'badge',
      image: require('../../../assets/shop/packs/mythes-forge/items/artisan-badge.png'),
    },
    {
      id: 'mythes-forge-rift-frame',
      number: 9,
      name: 'Cadre Fissure',
      description: 'Un cadre de basalte éclaté, consolidé par des angles de cuivre et d’ivoire.',
      slot: 'cadre_profil',
      rarity: 'epique',
      accent: FORGE_ORANGE,
      equipByDefault: true,
      roomKind: 'frame',
      roomSlot: 'left-free',
      image: require('../../../assets/shop/packs/mythes-forge/items/rift-frame.png'),
    },
    {
      id: 'mythes-forge-resonance-effect',
      number: 10,
      name: 'Effet Résonance',
      description: 'Des cercles telluriques orange et turquoise propagent une onde dans toute la Vitrine.',
      slot: 'effet_faction',
      rarity: 'legendaire',
      accent: FORGE_ORANGE,
      equipByDefault: true,
      image: require('../../../assets/shop/packs/mythes-forge/items/resonance-effect.png'),
    },
    {
      id: 'mythes-forge-share-card',
      number: 11,
      name: 'Carte de partage',
      description: 'Une carte paysage encadrée de basalte qui révèle la Forge et sa lueur tellurique.',
      slot: 'carte_profil',
      rarity: 'epique',
      accent: '#43BFC1',
      equipByDefault: true,
      roomKind: 'banner',
      roomSlot: 'right-free',
      image: require('../../../assets/shop/packs/mythes-forge/items/share-card.png'),
    },
    {
      id: 'mythes-forge-master-smith-title',
      number: 12,
      name: 'Titre Maître-Forge',
      description: 'Le titre « Maître-Forge » pour signer une collection façonnée dans les Failles.',
      slot: 'titre_profil',
      rarity: 'epique',
      accent: FORGE_ORANGE,
      equipByDefault: true,
      image: require('../../../assets/shop/packs/mythes-forge/items/master-smith-title.png'),
    },
  ],
};

export const FNATIC_TEAM_PACK: TeamPackDefinition = {
  id: 'fnatic-black-orange',
  kind: 'team',
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
  kind: 'team',
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

export const M8_TEAM_PACK: TeamPackDefinition = {
  id: 'm8-gentle-mates',
  kind: 'team',
  brandKey: 'm8',
  name: 'Pack M8',
  title: 'M8',
  subtitle: 'GENTLE MATES PARIS',
  description: 'Douze cosmétiques officiels pour transformer ta Vitrine en écrin Gentle Mates Paris.',
  accent: M8_ICE,
  price: 1200,
  licenseHolder: 'Gentle Mates',
  hero: require('../../../assets/shop/team-packs/m8/m8-gentle-mates-hero.png'),
  items: [
    {
      id: 'm8-room-lighting',
      number: 1,
      name: 'Salle + éclairage',
      description: 'Une salle bleu nuit ciselée d’argent et de lumière glacée, réservée à M8.',
      slot: 'vitrine_eclairage',
      rarity: 'legendaire',
      accent: M8_ICE,
      equipByDefault: true,
      image: require('../../../assets/shop/team-packs/m8/items/m8-room-lighting.png'),
    },
    {
      id: 'm8-jersey',
      number: 2,
      name: 'Maillot M8 2026',
      description: 'Le maillot 2026 blanc et bleu de Gentle Mates, inspiré par Paris.',
      slot: 'vitrine_maillot',
      rarity: 'epique',
      accent: M8_ICE,
      equipByDefault: true,
      roomKind: 'jersey',
      roomSlot: 'jersey',
      image: require('../../../assets/shop/team-packs/m8/items/m8-jersey.png'),
    },
    {
      id: 'm8-crest-3d',
      number: 3,
      name: 'Blason 3D',
      description: 'Le blason M8 sculpté en métal argenté pour signer la salle.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: M8_ICE,
      equipByDefault: true,
      roomKind: 'core',
      roomSlot: 'right-extra',
      image: require('../../../assets/shop/team-packs/m8/items/m8-crest-3d.png'),
    },
    {
      id: 'm8-banner',
      number: 4,
      name: 'Bannière Paris',
      description: 'Une bannière ivoire et bleu nuit dédiée à Gentle Mates Paris.',
      slot: 'carte_profil',
      rarity: 'rare',
      accent: M8_ICE,
      equipByDefault: false,
      roomKind: 'banner',
      roomSlot: 'left-extra',
      image: require('../../../assets/shop/team-packs/m8/items/m8-banner.png'),
    },
    {
      id: 'm8-pedestals',
      number: 5,
      name: 'Socles + projection',
      description: 'Des socles bleu nuit et argent qui projettent le blason M8 au sol.',
      slot: 'vitrine_supports',
      rarity: 'legendaire',
      accent: M8_ICE,
      equipByDefault: true,
      image: require('../../../assets/shop/team-packs/m8/items/m8-pedestals.png'),
    },
    {
      id: 'm8-supporter-token',
      number: 6,
      name: 'Jeton supporter',
      description: 'Un jeton M8 en argent poli, cerclé de bleu profond.',
      slot: 'apparence_core',
      rarity: 'rare',
      accent: M8_ICE,
      equipByDefault: false,
      roomKind: 'ring',
      roomSlot: 'ring',
      image: require('../../../assets/shop/team-packs/m8/items/m8-supporter-token.png'),
    },
    {
      id: 'm8-crest-totem',
      number: 7,
      name: 'Figurine blason',
      description: 'Le blason M8 dressé en totem argenté sur un socle de collection.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: M8_ICE,
      equipByDefault: false,
      roomKind: 'trophy',
      roomSlot: 'trophy',
      image: require('../../../assets/shop/team-packs/m8/items/m8-crest-totem.png'),
    },
    {
      id: 'm8-supporter-badge',
      number: 8,
      name: 'Badge M8 supporter',
      description: 'Un badge M8 entouré de lauriers métalliques et d’un halo glacé.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: M8_ICE,
      equipByDefault: false,
      roomKind: 'badge',
      roomSlot: 'badge',
      image: require('../../../assets/shop/team-packs/m8/items/m8-supporter-badge.png'),
    },
    {
      id: 'm8-profile-frame',
      number: 9,
      name: 'Cadre de profil',
      description: 'Un cadre bleu nuit aux angles argentés ponctués d’étoiles M8.',
      slot: 'cadre_profil',
      rarity: 'epique',
      accent: M8_ICE,
      equipByDefault: true,
      roomKind: 'frame',
      roomSlot: 'left-free',
      image: require('../../../assets/shop/team-packs/m8/items/m8-profile-frame.png'),
    },
    {
      id: 'm8-sparkle-effect',
      number: 10,
      name: 'Effet Éclat M8',
      description: 'Un filigrane argenté se révèle à l’entrée avant un éclat étoilé M8.',
      slot: 'effet_faction',
      rarity: 'legendaire',
      accent: M8_ICE,
      equipByDefault: true,
      image: require('../../../assets/shop/team-packs/m8/items/m8-sparkle-effect.png'),
    },
    {
      id: 'm8-share-card',
      number: 11,
      name: 'Carte de partage',
      description: 'Une carte paysage Gentle Mates prête à mettre en scène ta Vitrine équipée.',
      slot: 'carte_profil',
      rarity: 'epique',
      accent: M8_ICE,
      equipByDefault: true,
      roomKind: 'banner',
      roomSlot: 'right-free',
      image: require('../../../assets/shop/team-packs/m8/items/m8-share-card.png'),
    },
    {
      id: 'm8-title',
      number: 12,
      name: 'Gentle Mates Paris',
      description: 'Le titre « Gentle Mates Paris » pour porter les couleurs de M8.',
      slot: 'titre_profil',
      rarity: 'epique',
      accent: M8_ICE,
      equipByDefault: true,
      roomKind: 'title',
      roomSlot: 'title',
      image: require('../../../assets/shop/team-packs/m8/items/m8-title.png'),
    },
  ],
};

export const LEAGUE_OF_LEGENDS_COLLECTION_PACK: TeamPackDefinition = {
  id: 'league-of-legends-collection',
  kind: 'game_collection',
  brandKey: 'league-of-legends',
  name: 'Pack League of Legends',
  title: 'LEAGUE OF LEGENDS',
  subtitle: 'ICÔNES DE RUNETERRA',
  description: 'Cinq pièces iconiques réunies dans une galerie de pierre, d’or et de lumière cyan.',
  accent: LOL_GOLD,
  price: 900,
  licenseHolder: 'Riot Games',
  hero: require('../../../assets/shop/collections/league-of-legends/league-of-legends-collection-hero.png'),
  items: [
    {
      id: 'lol-infinity-edge',
      number: 1,
      name: 'Lame d’Infini',
      description: 'Une réplique de collection aux finitions acier, or et cristal azur.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: LOL_GOLD,
      equipByDefault: false,
      roomKind: 'core',
      roomSlot: 'left-free',
      image: require('../../../assets/shop/collections/league-of-legends/items/infinity-edge.png'),
    },
    {
      id: 'lol-nexus-fragment',
      number: 2,
      name: 'Fragment du Nexus',
      description: 'Un fragment azur suspendu, parcouru d’une énergie cristalline.',
      slot: 'apparence_core',
      rarity: 'legendaire',
      accent: '#35C8FF',
      equipByDefault: false,
      roomKind: 'core',
      roomSlot: 'left-extra',
      image: require('../../../assets/shop/collections/league-of-legends/items/nexus-fragment.png'),
    },
    {
      id: 'lol-jinx-fishbones-gallery',
      number: 3,
      name: 'Jinx & Fishbones',
      description: 'La pièce centrale de la collection, dressée avec Fishbones sur un podium noir et or.',
      slot: 'vitrine_supports',
      rarity: 'legendaire',
      accent: '#55C9FF',
      equipByDefault: true,
      roomKind: 'trophy',
      roomSlot: 'trophy',
      image: require('../../../assets/shop/collections/league-of-legends/items/jinx-fishbones.png'),
    },
    {
      id: 'lol-baron-nashor',
      number: 4,
      name: 'Baron Nashor',
      description: 'Une sculpture violette monumentale surgissant d’un bassin d’énergie du Néant.',
      slot: 'apparence_core',
      rarity: 'legendaire',
      accent: '#9B5CFF',
      equipByDefault: false,
      roomKind: 'trophy',
      roomSlot: 'right-extra',
      image: require('../../../assets/shop/collections/league-of-legends/items/baron-nashor.png'),
    },
    {
      id: 'lol-vision-ward',
      number: 5,
      name: 'Balise de vision',
      description: 'Une balise dorée protégée par une cloche de verre et un halo ambré.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: '#F3B84B',
      equipByDefault: false,
      roomKind: 'ring',
      roomSlot: 'right-free',
      image: require('../../../assets/shop/collections/league-of-legends/items/vision-ward.png'),
    },
  ],
};

export const VALORANT_COLLECTION_PACK: TeamPackDefinition = {
  id: 'valorant-collection',
  kind: 'game_collection',
  brandKey: 'valorant',
  name: 'Pack Valorant',
  title: 'VALORANT',
  subtitle: 'PROTOCOLE RADIANT',
  description: 'Cinq pièces iconiques réunies dans une galerie de pierre, de métal et de lumière corail.',
  accent: VALORANT_RED,
  price: 900,
  licenseHolder: 'Riot Games',
  hero: require('../../../assets/shop/collections/valorant/valorant-collection-hero.png'),
  items: [
    {
      id: 'valorant-vandal',
      number: 1,
      name: 'Vandal',
      description: 'Une réplique blanche et graphite sertie d’un noyau corail lumineux.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: VALORANT_RED,
      equipByDefault: false,
      roomKind: 'core',
      roomSlot: 'left-free',
      image: require('../../../assets/shop/collections/valorant/items/vandal.png'),
    },
    {
      id: 'valorant-spike',
      number: 2,
      name: 'Spike',
      description: 'Le dispositif de radianite suspendu au-dessus d’un socle parcouru d’étincelles rouges.',
      slot: 'apparence_core',
      rarity: 'legendaire',
      accent: VALORANT_RED,
      equipByDefault: false,
      roomKind: 'core',
      roomSlot: 'left-extra',
      image: require('../../../assets/shop/collections/valorant/items/spike.png'),
    },
    {
      id: 'valorant-jett-gallery',
      number: 3,
      name: 'Jett',
      description: 'La pièce centrale de la collection, portée par une spirale de vent et de lames.',
      slot: 'vitrine_supports',
      rarity: 'legendaire',
      accent: '#9FE8FF',
      equipByDefault: true,
      roomKind: 'trophy',
      roomSlot: 'trophy',
      image: require('../../../assets/shop/collections/valorant/items/jett.png'),
    },
    {
      id: 'valorant-omen',
      number: 4,
      name: 'Omen',
      description: 'Un buste d’Omen émergeant d’une nappe d’ombre violette.',
      slot: 'apparence_core',
      rarity: 'legendaire',
      accent: '#8A5CFF',
      equipByDefault: false,
      roomKind: 'trophy',
      roomSlot: 'right-extra',
      image: require('../../../assets/shop/collections/valorant/items/omen.png'),
    },
    {
      id: 'valorant-wingman',
      number: 5,
      name: 'Wingman',
      description: 'Le compagnon jaune de Gekko protégé sous une cloche de verre de collection.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: '#D8F34A',
      equipByDefault: false,
      roomKind: 'ring',
      roomSlot: 'right-free',
      image: require('../../../assets/shop/collections/valorant/items/wingman.png'),
    },
  ],
};

export const ROCKET_LEAGUE_COLLECTION_PACK: TeamPackDefinition = {
  id: 'rocket-league-collection',
  kind: 'game_collection',
  brandKey: 'rocket-league',
  name: 'Pack Rocket League',
  title: 'ROCKET LEAGUE',
  subtitle: 'BLUE & ORANGE ARENA',
  description: 'Cinq pièces iconiques réunies dans une galerie traversée par l’énergie bleue et orange.',
  accent: ROCKET_LEAGUE_ORANGE,
  price: 900,
  licenseHolder: 'Psyonix',
  hero: require('../../../assets/shop/collections/rocket-league/rocket-league-collection-hero.png'),
  items: [
    {
      id: 'rocket-league-zomba-wheel',
      number: 1,
      name: 'Roue Zomba',
      description: 'Une roue de collection dont le moyeu irradie un motif d’énergie bleu, rose et orange.',
      slot: 'apparence_core',
      rarity: 'legendaire',
      accent: '#35A8FF',
      equipByDefault: false,
      roomKind: 'ring',
      roomSlot: 'left-free',
      image: require('../../../assets/shop/collections/rocket-league/items/zomba-wheel.png'),
    },
    {
      id: 'rocket-league-boost-100',
      number: 2,
      name: 'Boost 100',
      description: 'Un orbe doré suspendu au-dessus d’un flux continu de particules de boost.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: '#FFBE3D',
      equipByDefault: false,
      roomKind: 'core',
      roomSlot: 'left-extra',
      image: require('../../../assets/shop/collections/rocket-league/items/boost-100.png'),
    },
    {
      id: 'rocket-league-octane-gallery',
      number: 3,
      name: 'Octane',
      description: 'La pièce centrale de la collection, un Octane bleu et orange en sustentation.',
      slot: 'vitrine_supports',
      rarity: 'legendaire',
      accent: '#2C9CFF',
      equipByDefault: true,
      roomKind: 'trophy',
      roomSlot: 'trophy',
      image: require('../../../assets/shop/collections/rocket-league/items/octane.png'),
    },
    {
      id: 'rocket-league-arena-ball',
      number: 4,
      name: 'Ballon d’arène',
      description: 'Le ballon blindé des arènes, marqué par les lumières des deux camps.',
      slot: 'apparence_core',
      rarity: 'epique',
      accent: '#7CCAFF',
      equipByDefault: false,
      roomKind: 'trophy',
      roomSlot: 'right-extra',
      image: require('../../../assets/shop/collections/rocket-league/items/arena-ball.png'),
    },
    {
      id: 'rocket-league-goal-explosion',
      number: 5,
      name: 'Explosion de but',
      description: 'Un impact bleu et orange figé dans un but miniature de collection.',
      slot: 'apparence_core',
      rarity: 'legendaire',
      accent: ROCKET_LEAGUE_ORANGE,
      equipByDefault: false,
      roomKind: 'core',
      roomSlot: 'right-free',
      image: require('../../../assets/shop/collections/rocket-league/items/goal-explosion.png'),
    },
  ],
};

export const ORIGINAL_PACK_CATALOG: readonly TeamPackDefinition[] = [
  MYTHS_FORGE_PACK,
  NEON_PROTOCOL_PACK,
];

export const TEAM_PACK_CATALOG: readonly TeamPackDefinition[] = [];

export const GAME_COLLECTION_PACK_CATALOG: readonly TeamPackDefinition[] = [];

export const ARCHIVED_TEAM_PACK_CATALOG: readonly TeamPackDefinition[] = [
  FNATIC_TEAM_PACK,
  KC_TEAM_PACK,
  M8_TEAM_PACK,
];

export const ARCHIVED_GAME_COLLECTION_PACK_CATALOG: readonly TeamPackDefinition[] = [
  LEAGUE_OF_LEGENDS_COLLECTION_PACK,
  VALORANT_COLLECTION_PACK,
  ROCKET_LEAGUE_COLLECTION_PACK,
];

export const COSMETIC_PACK_CATALOG: readonly TeamPackDefinition[] = [
  ...ORIGINAL_PACK_CATALOG,
];

export const ARCHIVED_COSMETIC_PACK_CATALOG: readonly TeamPackDefinition[] = [
  ...ARCHIVED_TEAM_PACK_CATALOG,
  ...ARCHIVED_GAME_COLLECTION_PACK_CATALOG,
];

export const ALL_COSMETIC_PACK_CATALOG: readonly TeamPackDefinition[] = [
  ...COSMETIC_PACK_CATALOG,
  ...ARCHIVED_COSMETIC_PACK_CATALOG,
];

const COSMETIC_PACK_ITEM_BY_ID = new Map(
  ALL_COSMETIC_PACK_CATALOG.flatMap((pack) => pack.items.map((item) => [item.id, item] as const)),
);

export function teamPackById(id: string | null | undefined) {
  return ALL_COSMETIC_PACK_CATALOG.find((pack) => pack.kind === 'team' && pack.id === id) ?? null;
}

export function cosmeticPackById(id: string | null | undefined) {
  return ALL_COSMETIC_PACK_CATALOG.find((pack) => pack.id === id) ?? null;
}

export function teamPackItemById(id: string | null | undefined) {
  return cosmeticPackItemById(id);
}

export function cosmeticPackItemById(id: string | null | undefined) {
  return id ? COSMETIC_PACK_ITEM_BY_ID.get(id) ?? null : null;
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

export function createTeamPackPreviewItems(pack: TeamPackDefinition = NEON_PROTOCOL_PACK): CosmeticItem[] {
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
    license: { type: pack.kind === 'original' ? 'originale' : 'partenaire', holder: pack.licenseHolder },
    included: false,
    available: true,
    acquirable: false,
    owned: false,
    equipped: false,
  }));
}

export function applyPreviewTeamPackAction(
  data: CosmeticShopData,
  pack: TeamPackDefinition = NEON_PROTOCOL_PACK,
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
