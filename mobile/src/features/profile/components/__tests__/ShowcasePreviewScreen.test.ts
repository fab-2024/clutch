/// <reference types="jest" />

import { showcasePreviewForMood } from '../ShowcasePreviewScreen';

jest.mock('expo-router', () => ({ Redirect: 'Redirect', useLocalSearchParams: () => ({}) }));
jest.mock('@/src/features/shop/components/ShopPreviewScreen', () => ({
  PREVIEW_SHOP: {
    balance: 1_280,
    contract: {},
    equipped: {
      core: null, factionEffect: null, frame: null, profileCard: null, title: null,
      showcase: { jersey: null, lighting: null, material: null, rankDisplay: null, supports: null },
    },
    items: [],
  },
}));
jest.mock('../ProfilePreviewScreen', () => ({
  PREVIEW_PROFILE: {
    favoriteTeam: { id: 'fnc', jeu: 'lol', logo: null, nom: 'Fnatic', relique: 'Ampoule', relique_niveau: 1, supporters: 1, tag: 'FNC' },
  },
}));
jest.mock('../ShowcaseScreen', () => 'ShowcaseScreen');

describe('ShowcasePreviewScreen current moods', () => {
  it.each([
    ['forge', 'mythes-forge', 'mythes-forge-room'],
    ['circuit', 'circuit-zero', 'circuit-zero-room'],
  ] as const)('builds the %s collection preview', (mood, collectionKey, lightingId) => {
    const preview = showcasePreviewForMood(mood);
    expect(preview.shop.items.filter((item) => item.collectionKey === collectionKey)).toHaveLength(8);
    expect(preview.shop.equipped.showcase.lighting?.id).toBe(lightingId);
  });

  it('accepts a current original pack identifier', () => {
    const preview = showcasePreviewForMood('standard', 'sang-des-titans');
    expect(preview.shop.items.filter((item) => item.collectionKey === 'sang-des-titans')).toHaveLength(8);
  });

  it('ignores removed collection identifiers', () => {
    const preview = showcasePreviewForMood('standard', 'fnatic-black-orange');
    expect(preview.shop.items.some((item) => item.collectionKey === 'fnatic-black-orange')).toBe(false);
  });
});
