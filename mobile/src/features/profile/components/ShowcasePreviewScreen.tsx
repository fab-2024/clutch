import { Redirect } from 'expo-router';

import { PREVIEW_SHOP } from '@/src/features/shop/components/ShopPreviewScreen';

import { PREVIEW_PROFILE } from './ProfilePreviewScreen';
import ShowcaseScreen from './ShowcaseScreen';

const SHOWCASE_SHOP = {
  ...PREVIEW_SHOP,
  items: PREVIEW_SHOP.items.map((item) => {
    if (item.styleKey === 'frame-volt') {
      return {
        ...item,
        team: { id: 'kc', name: 'Karmine Corp', tag: 'KC', logo: null },
      };
    }
    if (item.styleKey === 'title-reader') {
      return { ...item, seasonId: 'saison_zero' };
    }
    if (item.styleKey === 'faction-veins') {
      return { ...item, owned: true };
    }
    if (item.styleKey === 'card-signal') {
      return {
        ...item,
        acquirable: false,
        brandKey: 'nova_gaming',
        campaignKey: 'nova_week',
        owned: true,
        source: 'partenaire' as const,
      };
    }
    return item;
  }),
};

export default function ShowcasePreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ShowcaseScreen previewProfile={PREVIEW_PROFILE} previewShop={SHOWCASE_SHOP} />;
}
