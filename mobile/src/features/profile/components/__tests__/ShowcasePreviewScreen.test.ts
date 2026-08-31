/// <reference types="jest" />

import { showcasePreviewForMood } from '../ShowcasePreviewScreen';

jest.mock('expo-router', () => ({ Redirect: 'Redirect', useLocalSearchParams: () => ({}) }));
jest.mock('@/src/features/shop/components/ShopPreviewScreen', () => ({
  PREVIEW_SHOP: {
    balance: 1_280,
    contract: {},
    equipped: {
      core: null,
      factionEffect: null,
      frame: null,
      profileCard: null,
      showcase: {
        jersey: null,
        lighting: null,
        material: null,
        rankDisplay: null,
        supports: null,
      },
      title: null,
    },
    items: [],
  },
}));
jest.mock('../ProfilePreviewScreen', () => ({
  PREVIEW_PROFILE: {
    favoriteTeam: {
      id: 'fnc',
      jeu: 'lol',
      logo: null,
      nom: 'Fnatic',
      relique: 'Ampoule',
      relique_niveau: 1,
      supporters: 1,
      tag: 'FNC',
    },
  },
}));
jest.mock('../ShowcaseScreen', () => 'ShowcaseScreen');

describe('ShowcasePreviewScreen team-pack moods', () => {
  it('uses packId to build the Karmine Corp Blue Wall showcase', () => {
    const preview = showcasePreviewForMood('standard', 'kc-blue-wall');

    expect(preview.profile.favoriteTeam).toMatchObject({
      id: 'kc',
      nom: 'Karmine Corp',
      tag: 'KC',
    });
    expect(preview.shop.items.filter((item) => item.collectionKey === 'kc-blue-wall')).toHaveLength(12);
    expect(preview.shop.equipped.showcase).toMatchObject({
      jersey: expect.objectContaining({ id: 'kc-jersey' }),
      lighting: expect.objectContaining({ id: 'kc-room-lighting' }),
      supports: expect.objectContaining({ id: 'kc-pedestals' }),
    });
    expect(preview.shop.equipped.factionEffect?.id).toBe('kc-blue-wall-effect');
  });

  it('keeps the Fnatic mood available through the same packId path', () => {
    const preview = showcasePreviewForMood('standard', 'fnatic-black-orange');

    expect(preview.shop.items.filter((item) => item.collectionKey === 'fnatic-black-orange')).toHaveLength(12);
    expect(preview.shop.equipped.showcase.supports?.id).toBe('fnatic-pedestals');
    expect(preview.shop.equipped.factionEffect?.id).toBe('fnatic-embers');
  });
});
