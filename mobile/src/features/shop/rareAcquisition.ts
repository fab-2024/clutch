import type { ImageSourcePropType } from 'react-native';

import {
  ATELIER_CATEGORY_META,
  type AtelierProduct,
} from './atelierCatalog';
import type {
  CosmeticItem,
  CosmeticRarity,
  CosmeticSource,
  CosmeticSlot,
} from './types';

export type RareAcquisitionOrigin = 'atelier' | 'hub' | 'locker';

export type RareAcquisitionEvent = {
  category: string;
  eventKey: string;
  image?: ImageSourcePropType;
  item: CosmeticItem;
  origin: RareAcquisitionOrigin;
  provenance: string;
};

type CreateRareAcquisitionEventInput = {
  eventKey: string;
  item: CosmeticItem;
  origin: RareAcquisitionOrigin;
  product?: AtelierProduct | null;
};

const REVEAL_DURATION_MS: Record<Exclude<CosmeticRarity, 'commun'>, number> = {
  rare: 900,
  epique: 1_150,
  legendaire: 1_400,
};
const presentedEventKeys = new Set<string>();
const PRESENTED_EVENT_LIMIT = 64;

const SLOT_LABELS: Record<CosmeticSlot, string> = {
  cadre_profil: 'CADRE DE PROFIL',
  titre_profil: 'TITRE DE PROFIL',
  apparence_core: 'APPARENCE DE CORE',
  effet_faction: 'EFFET DE RELIQUE',
  carte_profil: 'BANNIÈRE DE PROFIL',
  vitrine_materiau: 'MATIÈRE DE VITRINE',
  vitrine_eclairage: 'LUMIÈRE DE VITRINE',
  vitrine_supports: 'SOCLES DE VITRINE',
  vitrine_maillot: 'PRÉSENTATION DE MAILLOT',
};

export function createRareAcquisitionEvent({
  eventKey,
  item,
  origin,
  product,
}: CreateRareAcquisitionEventInput): RareAcquisitionEvent | null {
  if (!isRevealRarity(item.rarity)) return null;

  const collection = humanize(item.collectionKey || 'griff').toUpperCase();
  const source = sourceLabel(item.source);

  return {
    category: product
      ? ATELIER_CATEGORY_META[product.category].label
      : SLOT_LABELS[item.slot],
    eventKey,
    image: product?.image,
    item,
    origin,
    provenance: origin === 'atelier'
      ? `ATELIER GRIFF · ${source}`
      : `${source} · COLLECTION ${collection}`,
  };
}

export function isRevealRarity(
  rarity: CosmeticRarity | string,
): rarity is Exclude<CosmeticRarity, 'commun'> {
  return rarity === 'rare' || rarity === 'epique' || rarity === 'legendaire';
}

export function claimRareAcquisitionPresentation(eventKey: string) {
  if (!eventKey || presentedEventKeys.has(eventKey)) return false;
  if (presentedEventKeys.size >= PRESENTED_EVENT_LIMIT) {
    const oldestEventKey = presentedEventKeys.values().next().value;
    if (oldestEventKey) presentedEventKeys.delete(oldestEventKey);
  }
  presentedEventKeys.add(eventKey);
  return true;
}

export function rareAcquisitionDuration(rarity: CosmeticRarity, reduceMotion: boolean) {
  if (reduceMotion) return 180;
  return rarity === 'commun' ? 0 : REVEAL_DURATION_MS[rarity];
}

export function rareAcquisitionLabel(rarity: CosmeticRarity) {
  if (rarity === 'legendaire') return 'PIÈCE LÉGENDAIRE';
  if (rarity === 'epique') return 'PIÈCE ÉPIQUE';
  if (rarity === 'rare') return 'SIGNAL RARE';
  return 'OBJET COMMUN';
}

export function rareAcquisitionOriginLabel(origin: RareAcquisitionOrigin) {
  if (origin === 'hub') return 'HUB // RÉCOMPENSE RÉCLAMÉE';
  if (origin === 'locker') return 'LOCKER // ACQUISITION CONFIRMÉE';
  return 'ATELIER // ACQUISITION CONFIRMÉE';
}

function sourceLabel(source: CosmeticSource) {
  if (source === 'mission') return 'MISSION ACCOMPLIE';
  if (source === 'partenaire') return 'ACTIVATION PARTENAIRE';
  if (source === 'founder_pack') return 'FOUNDER PACK';
  if (source === 'gratuit') return 'OFFERT PAR GRIFF';
  return 'ACQUISITION VOLTS';
}

function humanize(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
