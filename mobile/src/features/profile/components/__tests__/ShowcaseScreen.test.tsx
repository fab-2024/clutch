/// <reference types="jest" />

import { fireEvent, render, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { rankEmblemSource } from '@/src/features/ranking/components/RankEmblem';
import { DEFAULT_MONETIZATION_CONTRACT, EMPTY_EQUIPPED_COSMETICS, type CosmeticShopData } from '@/src/features/shop/types';
import { PREVIEW_PROFILE } from '../ProfilePreviewScreen';
import ShowcaseScreen, { resolveRoomPlaceableItems } from '../ShowcaseScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => true }));
jest.mock('lucide-react-native/icons/arrow-left', () => 'ArrowLeft');
jest.mock('lucide-react-native/icons/settings-2', () => 'Settings2');
jest.mock('../ProfileScreen', () => 'ProfileScreen');
jest.mock('../showcase/ShowcaseRoomScene', () => 'ShowcaseRoomScene');
jest.mock('@/src/features/analytics/api', () => ({ trackAnalyticsEvent: jest.fn() }));
jest.mock('@/src/features/shop/api', () => ({ equipCosmetic: jest.fn(), loadCosmeticShop: jest.fn() }));
jest.mock('../../api', () => ({ loadProfileData: jest.fn() }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ profile: { pseudo: 'TestVitrine' } }) }));
jest.mock('@/src/providers/CosmeticsProvider', () => ({ useCosmetics: () => ({ refresh: jest.fn() }) }));
jest.mock('../../showcaseRings/useShowcaseRingEquipment', () => ({
  useShowcaseRingEquipment: () => ({ family: null, loading: false, equip: jest.fn() }),
}));
jest.mock('../../achievementBadges/useAchievementBadgeEquipment', () => ({
  useAchievementBadgeEquipment: () => ({ slots: [], loading: false, equip: jest.fn() }),
}));
jest.mock('@/src/components/layout/Screen', () => ({
  Screen: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('@/src/components/overlays/BaseSheet', () => {
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    BaseSheet: ({ children, onClose, testID, title, visible }: {
      children: ReactNode;
      onClose: () => void;
      testID?: string;
      title: string;
      visible: boolean;
    }) => visible ? (
      <View testID={testID}>
        <Text>{title}</Text>
        <Pressable accessibilityLabel={`Fermer ${title}`} accessibilityRole="button" onPress={onClose} />
        {children}
      </View>
    ) : null,
  };
});

const EMPTY_SHOP: CosmeticShopData = {
  balance: 0,
  contract: DEFAULT_MONETIZATION_CONTRACT,
  equipped: EMPTY_EQUIPPED_COSMETICS,
  items: [],
};

describe('ShowcaseScreen immersive editor', () => {
  it('removes the permanent bars and keeps settings available on demand', async () => {
    const screen = await render(<ShowcaseScreen previewProfile={PREVIEW_PROFILE} previewShop={EMPTY_SHOP} />);

    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByText('PERSONNALISER')).toBeNull();
    expect(screen.queryByText('TOUCHE UN EMPLACEMENT POUR L’ÉQUIPER')).toBeNull();
    expect(screen.queryByTestId('showcase-settings-sheet')).toBeNull();
    expect(screen.getByTestId('showcase-room-background-supports_gallery').props.source).toBe(
      require('../../../../../assets/shop/atelier/supports/scenes/presenter-circle-obsidian-empty-v2.png'),
    );

    await fireEvent.press(screen.getByLabelText('Ouvrir les réglages de la vitrine'));
    expect(screen.getByTestId('showcase-settings-sheet')).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByLabelText('PRÉSENTOIR, CERCLE OBSIDIENNE')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Fermer MA VITRINE'));
    expect(screen.queryByTestId('showcase-settings-sheet')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Revenir au Magasin'));
    expect(router.back).toHaveBeenCalled();
  });

  it('shows only + Ajouter in an empty slot and restores it after removing an object', async () => {
    const screen = await render(<ShowcaseScreen previewProfile={PREVIEW_PROFILE} previewShop={EMPTY_SHOP} />);
    const slot = () => screen.getByTestId('showcase-room-slot-jersey');

    expect(slot().props.accessibilityLabel).toBe('Emplacement maillot, vide');
    expect(within(slot()).getByText('+')).toBeTruthy();
    expect(within(slot()).getByText('AJOUTER')).toBeTruthy();

    await fireEvent.press(slot());
    await fireEvent.press(screen.getByLabelText('Rang BRONZE'));
    expect(slot().props.accessibilityLabel).toBe('Emplacement maillot, Rang BRONZE');
    expect(within(slot()).queryByText('AJOUTER')).toBeNull();

    await fireEvent.press(slot());
    await fireEvent.press(screen.getByLabelText('Laisser cet emplacement vide'));
    expect(slot().props.accessibilityLabel).toBe('Emplacement maillot, vide');
    expect(within(slot()).getByText('AJOUTER')).toBeTruthy();
  });

  it('does not create a jersey or duplicate trophies from favorite teams and achievements', () => {
    const items = resolveRoomPlaceableItems({
      ownedItems: [],
      profileData: PREVIEW_PROFILE,
      rankAccent: '#C57943',
      rankLabel: 'BRONZE',
      ringProgressions: [],
    });

    expect(PREVIEW_PROFILE.favoriteTeam).toBeTruthy();
    expect(items.some((item) => item.kind === 'jersey' || item.kind === 'trophy')).toBe(false);
    expect(items.find((item) => item.kind === 'rank')?.image).toBe(rankEmblemSource('bronze'));
    expect(items.filter((item) => item.kind === 'badge')).toHaveLength(
      PREVIEW_PROFILE.badges.filter((badge) => badge.obtained).length,
    );
    for (const item of items.filter((candidate) => candidate.kind === 'badge')) {
      expect(item.badge?.obtained).toBe(true);
      expect(item.image).toBeUndefined();
    }
  });
});
