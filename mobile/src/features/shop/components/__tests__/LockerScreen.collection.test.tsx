/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { ProfileData } from '@/src/features/profile/types';

import {
  DEFAULT_MONETIZATION_CONTRACT,
  EMPTY_EQUIPPED_COSMETICS,
  type CosmeticItem,
  type CosmeticShopData,
} from '../../types';
import LockerScreen from '../LockerScreen';

let mockParams: Record<string, string> = { scope: 'owned', tab: 'badges' };

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/src/components/layout/Screen', () => {
  const ReactNative = jest.requireActual('react-native');
  return { Screen: ({ children }: { children: ReactNode }) => <ReactNative.View>{children}</ReactNative.View> };
});
jest.mock('@/src/components/ui/CurrencyIcon', () => ({ CurrencyIcon: () => null }));
jest.mock('@/src/components/ui/Skeleton', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    Skeleton: () => null,
    SkeletonGroup: ({ children }: { children: ReactNode }) => <ReactNative.View>{children}</ReactNative.View>,
  };
});
jest.mock('@/src/features/analytics/api', () => ({ trackAnalyticsEvent: jest.fn() }));
jest.mock('@/src/features/profile/api', () => ({ loadProfileData: jest.fn() }));
jest.mock('@/src/features/profile/achievementBadges/components/AchievementBadgeCollection', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    badgeFilterFromParam: () => 'all',
    default: () => <ReactNative.Text>BADGE COLLECTION</ReactNative.Text>,
  };
});
jest.mock('@/src/features/profile/achievementBadges/components/ShowcaseTrophyCollection', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <ReactNative.Text>TROPHY COLLECTION</ReactNative.Text>,
  };
});
jest.mock('@/src/features/profile/achievementBadges/useAchievementBadgeEquipment', () => ({
  useAchievementBadgeEquipment: () => ({
    equip: jest.fn(),
    loading: false,
    slots: [null, null, null, null],
  }),
}));
jest.mock('@/src/features/profile/levelFrames/components/LevelFrameGallery', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <ReactNative.Text>LEVEL FRAME COLLECTION</ReactNative.Text>,
  };
});
jest.mock('@/src/features/profile/levelFrames/useLevelFrameEquipment', () => ({
  useLevelFrameEquipment: () => ({ equip: jest.fn(), loading: false, variant: 'signalAscendant' }),
}));
jest.mock('@/src/features/profile/showcaseRings/components/ShowcaseRingCollection', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <ReactNative.Text>RING COLLECTION</ReactNative.Text>,
  };
});
jest.mock('@/src/features/profile/showcaseRings/progression', () => ({
  adaptShowcaseRingStats: () => ({}),
  resolveAllShowcaseRings: () => [],
}));
jest.mock('@/src/features/profile/showcaseRings/useShowcaseRingEquipment', () => ({
  useShowcaseRingEquipment: () => ({ equip: jest.fn(), family: null, loading: false }),
}));
jest.mock('@/src/features/shop/api', () => ({
  equipCosmetic: jest.fn(),
  loadCosmeticShop: jest.fn(),
  purchaseCosmetic: jest.fn(),
}));
jest.mock('@/src/features/shop/components/CosmeticRenderer', () => ({
  CosmeticItemPreview: () => null,
}));
jest.mock('@/src/features/shop/components/RareAcquisitionReveal', () => ({
  RareAcquisitionReveal: () => null,
}));
jest.mock('@/src/providers/AuthProvider', () => ({
  useAuth: () => ({ profile: { pseudo: 'Testeur' }, session: { user: { email: 'test@clutch.app' } } }),
}));
jest.mock('@/src/providers/CosmeticsProvider', () => ({
  useCosmetics: () => ({ refresh: jest.fn() }),
}));
jest.mock('@/src/providers/EconomyProvider', () => ({
  useEconomy: () => ({ refresh: jest.fn() }),
}));
jest.mock('@/src/providers/SnackbarProvider', () => ({
  useSnackbar: () => ({ showSnackbar: jest.fn() }),
}));

const jerseyItem: CosmeticItem = {
  accent: '#7B8791',
  acquirable: true,
  available: true,
  availableFrom: null,
  availableUntil: null,
  brandKey: null,
  campaignKey: null,
  collectionKey: 'atelier',
  description: 'Le maillot suspendu dans un vestiaire sombre.',
  equipped: true,
  family: 'vitrine_maillot',
  id: 'jersey_locker',
  included: true,
  level: 1,
  license: { holder: 'GRIFF', type: 'interne' },
  name: 'Vestiaire',
  owned: true,
  price: 0,
  publicationStatus: 'publie',
  rarity: 'commun',
  seasonId: null,
  slot: 'vitrine_maillot',
  source: 'gratuit',
  styleKey: 'jersey-locker',
  team: null,
};

const previewData: CosmeticShopData = {
  balance: 300,
  contract: DEFAULT_MONETIZATION_CONTRACT,
  equipped: EMPTY_EQUIPPED_COSMETICS,
  items: [jerseyItem],
};

const previewProfile = {
  badges: [],
  founder: false,
  level: { level: 1 },
  pinnedBadges: [],
  pseudo: 'Testeur',
} as unknown as ProfileData;

describe('LockerScreen focused collections', () => {
  beforeEach(() => {
    mockParams = { scope: 'owned', tab: 'badges' };
  });

  it('shows only badges when opened from the Badges profile entry', async () => {
    const screen = await render(
      <LockerScreen previewData={previewData} previewProfile={previewProfile} />,
    );

    expect(screen.getByText('BADGE COLLECTION')).toBeTruthy();
    expect(screen.queryByText('RING COLLECTION')).toBeNull();
    expect(screen.queryByText('Cadres')).toBeNull();
    expect(screen.queryByText('NOVA WEEK')).toBeNull();
    expect(screen.queryByText('FOUNDER PACK')).toBeNull();
    expect(screen.queryByText('LE PACTE GRIFF')).toBeNull();
  });

  it('shows only rings when opened from the Anneaux profile entry', async () => {
    mockParams = { scope: 'owned', tab: 'rings' };

    const screen = await render(
      <LockerScreen previewData={previewData} previewProfile={previewProfile} />,
    );

    expect(screen.getByText('RING COLLECTION')).toBeTruthy();
    expect(screen.queryByText('BADGE COLLECTION')).toBeNull();
    expect(screen.queryByText('Badges')).toBeNull();
    expect(screen.queryByText('NOVA WEEK')).toBeNull();
    expect(screen.queryByText('FOUNDER PACK')).toBeNull();
    expect(screen.queryByText('LE PACTE GRIFF')).toBeNull();
  });

  it('shows only trophies when opened from the Trophées profile entry', async () => {
    mockParams = { scope: 'owned', tab: 'trophies' };

    const screen = await render(
      <LockerScreen previewData={previewData} previewProfile={previewProfile} />,
    );

    expect(screen.getByText('TROPHY COLLECTION')).toBeTruthy();
    expect(screen.queryByText('BADGE COLLECTION')).toBeNull();
    expect(screen.queryByText('RING COLLECTION')).toBeNull();
    expect(screen.queryByText('NOVA WEEK')).toBeNull();
    expect(screen.queryByText('FOUNDER PACK')).toBeNull();
    expect(screen.queryByText('LE PACTE GRIFF')).toBeNull();
  });

  it('shows only owned jerseys when opened from the Maillots profile entry', async () => {
    mockParams = { scope: 'owned', tab: 'jerseys' };

    const screen = await render(
      <LockerScreen previewData={previewData} previewProfile={previewProfile} />,
    );

    expect(screen.getByText('Vestiaire')).toBeTruthy();
    expect(screen.getByText('MAILLOTS')).toBeTruthy();
    expect(screen.queryByText('BADGE COLLECTION')).toBeNull();
    expect(screen.queryByText('RING COLLECTION')).toBeNull();
    expect(screen.queryByText('TROPHY COLLECTION')).toBeNull();
    expect(screen.queryByText('FOUNDER PACK')).toBeNull();
    expect(screen.queryByText('LE PACTE GRIFF')).toBeNull();
  });
});
