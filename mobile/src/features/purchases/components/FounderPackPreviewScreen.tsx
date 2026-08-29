import { Redirect } from 'expo-router';

import type { FounderPackStatus } from '../types';
import FounderPackScreen from './FounderPackScreen';

const PREVIEW_STATUS: FounderPackStatus = {
  version: 1,
  productId: 'clutch_founder_pack_v1',
  entitlementId: 'founder_pack',
  offeringId: 'founder_launch',
  type: 'non_consumable',
  indicativePrice: '4,99 €',
  storePriceRequired: true,
  voltsIncluded: 0,
  packActive: false,
  legacyFounder: false,
  isFounder: false,
  state: 'available',
  store: null,
  environment: null,
  purchasedAt: null,
  restorable: true,
  items: [
    { id: 'founder-frame-v1', slot: 'cadre_profil', name: 'Cadre Pionnier', description: 'Un cadre graphite fendu par le premier signal Volt.', styleKey: 'founder-frame', accent: '#FFCB45', owned: false, equipped: false },
    { id: 'founder-title-v1', slot: 'titre_profil', name: 'Fondateur GRIFF', description: 'Le titre permanent de celles et ceux qui ont lancé l’Arena.', styleKey: 'founder-title', accent: '#FFCB45', owned: false, equipped: false },
    { id: 'founder-relic-v1', slot: 'effet_faction', name: 'Relique Originelle', description: 'Une signature ambrée issue des débuts de GRIFF.', styleKey: 'founder-relic', accent: '#FFCB45', owned: false, equipped: false },
    { id: 'founder-banner-v1', slot: 'carte_profil', name: 'Bannière Première Vague', description: 'Une carte noire et or réservée aux premiers supporters.', styleKey: 'founder-banner', accent: '#FFCB45', owned: false, equipped: false },
  ],
};

export default function FounderPackPreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <FounderPackScreen previewStatus={PREVIEW_STATUS} />;
}
