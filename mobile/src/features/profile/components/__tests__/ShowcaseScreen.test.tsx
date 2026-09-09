/// <reference types="jest" />

import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { rankEmblemSource } from '@/src/features/ranking/components/RankEmblem';
import { equipCosmetic, loadCosmeticShop } from '@/src/features/shop/api';
import { applyPreviewAtelierAction } from '@/src/features/shop/atelierState';
import { loadProfileData } from '../../api';
import { createAtelierPreviewItems } from '@/src/features/shop/atelierCatalog';
import {
  applyPreviewTeamPackAction,
  createTeamPackPreviewItems,
  CONCLAVE_ARCANIQUE_PACK,
  FNATIC_TEAM_PACK,
  SANG_DES_TITANS_PACK,
  SERMENT_DU_GIVRE_PACK,
} from '@/src/features/shop/teamPackCatalog';
import { DEFAULT_MONETIZATION_CONTRACT, EMPTY_EQUIPPED_COSMETICS, type CosmeticShopData } from '@/src/features/shop/types';
import { PREVIEW_PROFILE } from '../ProfilePreviewScreen';
import ShowcaseScreen, { resolveRoomPlaceableItems } from '../ShowcaseScreen';

const mockEquipPedestals = jest.fn(async () => undefined);
const mockPedestalAssignments = {};

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => true }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));
jest.mock('lucide-react-native/icons/arrow-left', () => 'ArrowLeft');
jest.mock('lucide-react-native/icons/check', () => 'Check');
jest.mock('lucide-react-native/icons/chevron-down', () => 'ChevronDown');
jest.mock('lucide-react-native/icons/chevron-left', () => 'ChevronLeft');
jest.mock('lucide-react-native/icons/chevron-right', () => 'ChevronRight');
jest.mock('lucide-react-native/icons/lock', () => 'Lock');
jest.mock('lucide-react-native/icons/settings-2', () => 'Settings2');
jest.mock('../ProfileScreen', () => 'ProfileScreen');
jest.mock('../showcase/ShowcaseRoomScene', () => 'ShowcaseRoomScene');
jest.mock('@/src/features/analytics/api', () => ({ trackAnalyticsEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/src/features/shop/api', () => ({
  equipCosmetic: jest.fn(),
  loadCosmeticShop: jest.fn(),
  purchaseCosmetic: jest.fn(),
}));
jest.mock('../../api', () => ({ loadProfileData: jest.fn() }));
jest.mock('../../showcaseSocial/api', () => ({ loadPublicShowcase: jest.fn().mockResolvedValue(null) }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ profile: { pseudo: 'TestVitrine' } }) }));
jest.mock('@/src/providers/CosmeticsProvider', () => ({ useCosmetics: () => ({ refresh: jest.fn() }) }));
jest.mock('@/src/providers/EconomyProvider', () => ({ useEconomy: () => ({ refresh: jest.fn() }) }));
jest.mock('@/src/components/ui/Button', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: React.forwardRef(function MockButton({ disabled, label, loading, onPress, testID }: {
      disabled?: boolean;
      label: string;
      loading?: boolean;
      onPress: () => void;
      testID?: string;
    }, _ref: unknown) {
      return (
        <Pressable disabled={disabled || loading} onPress={onPress} testID={testID}>
          <Text>{label}</Text>
        </Pressable>
      );
    }),
  };
});
jest.mock('@/src/features/shop/components/AtelierPurchaseSheet', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    AtelierPurchaseSheet: ({ onConfirm, product, visible }: {
      onConfirm: () => void;
      product: { name: string } | null;
      visible: boolean;
    }) => visible ? (
      <View testID="atelier-purchase-sheet">
        <Text>{product?.name}</Text>
        <Pressable onPress={onConfirm} testID="atelier-purchase-confirm" />
      </View>
    ) : null,
  };
});
jest.mock('../../showcaseRings/useShowcaseRingEquipment', () => ({
  useShowcaseRingEquipment: () => ({ family: null, loading: false, equip: jest.fn() }),
}));
jest.mock('../../showcasePedestals/useShowcasePedestalEquipment', () => ({
  useShowcasePedestalEquipment: () => ({
    assignments: mockPedestalAssignments,
    equip: mockEquipPedestals,
    loading: false,
  }),
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

const ATELIER_SHOP: CosmeticShopData = {
  balance: 500,
  contract: DEFAULT_MONETIZATION_CONTRACT,
  equipped: EMPTY_EQUIPPED_COSMETICS,
  items: createAtelierPreviewItems(),
};

describe('ShowcaseScreen immersive editor', () => {
  it('removes the permanent bars and keeps settings available on demand', async () => {
    const screen = await render(<ShowcaseScreen previewProfile={PREVIEW_PROFILE} previewShop={EMPTY_SHOP} />);

    expect(screen.getByLabelText(`Voir le profil de ${PREVIEW_PROFILE.pseudo}`)).toBeTruthy();
    expect(screen.getByText('0 VUES')).toBeTruthy();
    expect(screen.getByText('0 LIKE')).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByText('PERSONNALISER')).toBeNull();
    expect(screen.queryByText('TOUCHE UN EMPLACEMENT POUR L’ÉQUIPER')).toBeNull();
    expect(screen.queryByTestId('showcase-settings-sheet')).toBeNull();
    expect(screen.getByTestId('showcase-room-background-obsidian-gallery').props.source).toBe(
      require('../../../../../assets/shop/rooms/room-obsidian-gallery.png'),
    );
    expect(screen.queryByTestId(
      'showcase-room-pedestal-rank-neon-protocol-vector-pedestals',
    )).toBeNull();
    expect(screen.queryByTestId('showcase-rank-display-rank_carbon_cradle')).toBeNull();
    expect(screen.getByLabelText('Ouvrir l’Atelier de la Vitrine')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Ouvrir les réglages de la vitrine'));
    expect(screen.getByTestId('showcase-settings-sheet')).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByLabelText('SALLE, GALERIE OBSIDIENNE')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Fermer MA VITRINE'));
    expect(screen.queryByTestId('showcase-settings-sheet')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Revenir à la Collection'));
    expect(router.back).toHaveBeenCalled();
  });

  it('previews and buys room finishes without selling displayed objects', async () => {
    const screen = await render(
      <ShowcaseScreen previewProfile={PREVIEW_PROFILE} previewShop={ATELIER_SHOP} />,
    );

    await fireEvent.press(screen.getByLabelText('Ouvrir l’Atelier de la Vitrine'));
    expect(screen.getByTestId('showcase-atelier-drawer')).toBeTruthy();
    expect(screen.getAllByRole('tab').map((tab) => tab.props.testID)).toEqual([
      'showcase-atelier-category-supports',
      'showcase-atelier-category-lighting',
      'showcase-atelier-category-ranks',
    ]);
    expect(screen.queryByTestId('showcase-atelier-category-materials')).toBeNull();
    expect(screen.queryByTestId('showcase-atelier-category-jerseys')).toBeNull();
    expect(screen.queryByTestId('showcase-atelier-category-pedestals')).toBeNull();
    expect(screen.getByText('Salles')).toBeTruthy();
    expect(screen.getByText('Ambiance de la vitrine')).toBeTruthy();
    expect(screen.getByText('1 / 6')).toBeTruthy();
    expect(screen.getByTestId('showcase-atelier-previous')).toBeDisabled();

    await fireEvent.press(screen.getByTestId('showcase-atelier-next'));
    expect(screen.getByText('2 / 6')).toBeTruthy();
    expect(screen.getByTestId('showcase-atelier-selected-lighting_amber')).toBeTruthy();
    expect(screen.getByTestId('showcase-room-lighting-amber')).toBeTruthy();
    expect(screen.getByText('Acheter · 100 volts')).toBeTruthy();
    expect(screen.getByTestId('showcase-atelier-product-image-lighting_amber').props.resizeMode).toBe('cover');

    await fireEvent.press(screen.getByTestId('showcase-atelier-category-supports'));
    await fireEvent.press(screen.getByTestId('showcase-atelier-product-supports_forge'));
    expect(screen.getByTestId('showcase-room-background-bronze-sanctum')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('showcase-atelier-category-ranks'));
    expect(screen.getByTestId('showcase-atelier-product-image-rank_carbon_cradle').props.resizeMode).toBe('contain');

    await fireEvent.press(screen.getByLabelText('Fermer l’Atelier de la Vitrine'));
    expect(screen.getByTestId('showcase-room-theme-graphite')).toBeTruthy();
    expect(screen.getByTestId('showcase-room-lighting-cyan')).toBeTruthy();
    expect(screen.getByTestId('showcase-room-background-obsidian-gallery')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Ouvrir l’Atelier de la Vitrine'));
    await fireEvent.press(screen.getByTestId('showcase-atelier-category-lighting'));
    await fireEvent.press(screen.getByTestId('showcase-atelier-product-lighting_amber'));

    await fireEvent.press(screen.getByTestId('showcase-atelier-primary'));
    expect(screen.getByTestId('atelier-purchase-sheet')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('atelier-purchase-confirm'));

    await waitFor(() => {
      expect(screen.getAllByText('Équipé').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('400')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Fermer l’Atelier de la Vitrine'));
    expect(screen.getByTestId('showcase-room-theme-graphite')).toBeTruthy();
    expect(screen.getByTestId('showcase-room-lighting-amber')).toBeTruthy();
  });

  it('removes an equipped rank display on a second tap and can equip it again', async () => {
    const equippedShop = applyPreviewAtelierAction(ATELIER_SHOP, 'rank_clutch_revelation');
    const screen = await render(
      <ShowcaseScreen previewProfile={PREVIEW_PROFILE} previewShop={equippedShop} />,
    );
    await fireEvent.press(screen.getByLabelText('Ouvrir l’Atelier de la Vitrine'));
    await fireEvent.press(screen.getByTestId('showcase-atelier-category-ranks'));
    expect(screen.getByTestId('showcase-rank-display-rank_clutch_revelation')).toBeTruthy();
    expect(screen.getByText('Déséquiper')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('showcase-atelier-product-rank_clutch_revelation'));
    expect(screen.queryAllByTestId(/^showcase-rank-display-/)).toHaveLength(0);
    expect(screen.getByText('Écrin déséquipé.')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Fermer l’Atelier de la Vitrine'));
    expect(screen.queryAllByTestId(/^showcase-rank-display-/)).toHaveLength(0);
    await fireEvent.press(screen.getByLabelText('Ouvrir l’Atelier de la Vitrine'));
    await fireEvent.press(screen.getByTestId('showcase-atelier-product-rank_clutch_revelation'));
    expect(screen.getByText('Équiper')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('showcase-atelier-primary'));
    expect(screen.getByText('Déséquiper')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('showcase-atelier-primary'));
    expect(screen.queryAllByTestId(/^showcase-rank-display-/)).toHaveLength(0);
    expect(screen.getByText(String(equippedShop.balance))).toBeTruthy();
  });

  it('persists removal and restores the equipped display if saving fails', async () => {
    const equippedShop = applyPreviewAtelierAction(ATELIER_SHOP, 'rank_clutch_revelation');
    jest.mocked(loadProfileData).mockResolvedValue(PREVIEW_PROFILE);
    jest.mocked(loadCosmeticShop).mockResolvedValue(equippedShop);
    jest.mocked(equipCosmetic).mockRejectedValueOnce(new Error('Connexion interrompue'));
    const screen = await render(<ShowcaseScreen />);
    await waitFor(() => expect(screen.getByTestId('showcase-rank-display-rank_clutch_revelation')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Ouvrir l’Atelier de la Vitrine'));
    await fireEvent.press(screen.getByTestId('showcase-atelier-category-ranks'));
    await fireEvent.press(screen.getByTestId('showcase-atelier-product-rank_clutch_revelation'));
    await waitFor(() => expect(screen.getByText('Connexion interrompue')).toBeTruthy());
    expect(equipCosmetic).toHaveBeenCalledWith('rank_carbon_cradle');
    expect(screen.getByTestId('showcase-rank-display-rank_clutch_revelation')).toBeTruthy();
    expect(screen.getByText('Déséquiper')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Fermer l’Atelier de la Vitrine'));
    expect(screen.getByTestId('showcase-rank-display-rank_clutch_revelation')).toBeTruthy();

    const removedShop = applyPreviewAtelierAction(equippedShop, 'rank_carbon_cradle');
    jest.mocked(loadCosmeticShop).mockResolvedValue(removedShop);
    jest.mocked(equipCosmetic).mockResolvedValueOnce({
      itemId: 'rank_carbon_cradle', slot: 'vitrine_rang',
      balance: removedShop.balance, purchased: false, equipped: true,
    });
    await fireEvent.press(screen.getByLabelText('Ouvrir l’Atelier de la Vitrine'));
    await fireEvent.press(screen.getByTestId('showcase-atelier-product-rank_clutch_revelation'));
    await waitFor(() => expect(screen.getByText('Écrin déséquipé.')).toBeTruthy());
    expect(screen.queryAllByTestId(/^showcase-rank-display-/)).toHaveLength(0);
    await screen.unmount();
    const reopened = await render(<ShowcaseScreen />);
    await fireEvent.press(reopened.getByLabelText('Ouvrir l’Atelier de la Vitrine'));
    await fireEvent.press(reopened.getByTestId('showcase-atelier-category-ranks'));
    expect(within(reopened.getByTestId('showcase-atelier-product-rank_clutch_revelation')).getByText('Possédé')).toBeTruthy();
    expect(reopened.queryAllByTestId(/^showcase-rank-display-/)).toHaveLength(0);
  });

  it('exposes an owned pack room in Salles and renders it as the equipped scene', async () => {
    const packShop = applyPreviewTeamPackAction({
      ...ATELIER_SHOP,
      balance: 1280,
      items: [
        ...ATELIER_SHOP.items,
        ...createTeamPackPreviewItems(SERMENT_DU_GIVRE_PACK),
      ],
    }, SERMENT_DU_GIVRE_PACK);
    const screen = await render(
      <ShowcaseScreen previewProfile={PREVIEW_PROFILE} previewShop={packShop} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('showcase-room-background-serment-du-givre-ice-sheet-pedestal')).toBeTruthy();
    });
    expect(screen.queryByTestId('showcase-rank-display-rank_carbon_cradle')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Ouvrir l’Atelier de la Vitrine'));
    await fireEvent.press(screen.getByTestId('showcase-atelier-category-supports'));
    const roomProduct = screen.getByTestId('showcase-atelier-product-serment-du-givre-room');
    expect(roomProduct).toBeTruthy();
    expect(within(roomProduct).getByText('Bastion des Cimes')).toBeTruthy();
  }, 15_000);

  it.each([true, false])('keeps the selected standard room after closing over a pack room (owned: %s)', async (owned) => {
    const initial = { ...ATELIER_SHOP, balance: 3000 };
    const standardShop = owned ? applyPreviewAtelierAction(initial, 'supports_halo') : initial;
    const packShop = applyPreviewTeamPackAction({
      ...standardShop,
      items: [...standardShop.items, ...createTeamPackPreviewItems(SERMENT_DU_GIVRE_PACK)],
    }, SERMENT_DU_GIVRE_PACK);
    const screen = await render(<ShowcaseScreen previewProfile={PREVIEW_PROFILE} previewShop={packShop} />);
    await fireEvent.press(screen.getByTestId('showcase-room-slot-jersey'));
    await fireEvent.press(screen.getByLabelText('Rang BRONZE'));
    await fireEvent.press(screen.getByLabelText('Ouvrir l’Atelier de la Vitrine'));
    await fireEvent.press(screen.getByTestId('showcase-atelier-category-supports'));
    expect(within(screen.getByTestId('showcase-atelier-product-supports_halo')).queryByText('Équipé')).toBeNull();
    await fireEvent.press(screen.getByTestId('showcase-atelier-product-supports_halo'));
    expect(screen.getByTestId('showcase-room-background-azure-horizon')).toBeTruthy();
    expect(screen.getByTestId('showcase-room-slot-jersey').props.accessibilityLabel).toContain('Rang BRONZE');
    await fireEvent.press(screen.getByTestId('showcase-atelier-primary'));
    if (!owned) await fireEvent.press(screen.getByTestId('atelier-purchase-confirm'));
    await fireEvent.press(screen.getByLabelText('Fermer l’Atelier de la Vitrine'));
    expect(screen.getByTestId('showcase-room-background-azure-horizon')).toBeTruthy();
    expect(screen.getByTestId('showcase-room-slot-jersey').props.accessibilityLabel).toContain('Rang BRONZE');
    await fireEvent.press(screen.getByLabelText('Ouvrir l’Atelier de la Vitrine'));
    expect(within(screen.getByTestId('showcase-atelier-product-supports_halo')).getByText('Équipé')).toBeTruthy();
    expect(within(screen.getByTestId('showcase-atelier-product-serment-du-givre-room')).queryByText('Équipé')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Fermer l’Atelier de la Vitrine'));
    expect(screen.getByTestId('showcase-room-background-azure-horizon')).toBeTruthy();
    expect(screen.getByTestId('showcase-room-slot-jersey').props.accessibilityLabel).toContain('Rang BRONZE');
  }, 30_000);

  it('keeps pack pedestals integrated in the room and hides pedestal swapping', async () => {
    const frostShop = applyPreviewTeamPackAction({
      ...ATELIER_SHOP,
      balance: 1280,
      items: [
        ...ATELIER_SHOP.items,
        ...createTeamPackPreviewItems(SERMENT_DU_GIVRE_PACK),
      ],
    }, SERMENT_DU_GIVRE_PACK);
    const screen = await render(
      <ShowcaseScreen
        previewProfile={PREVIEW_PROFILE}
        previewShop={frostShop}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('showcase-room-background-serment-du-givre-ice-sheet-pedestal')).toBeTruthy();
    });
    expect(screen.getByTestId(
      'showcase-room-background-serment-du-givre-ice-sheet-pedestal',
    ).props.source).toBe(require('../../../../../assets/shop/rooms/pack-serment-du-givre.png'));
    expect(screen.queryAllByTestId(/showcase-room-pedestal-/)).toHaveLength(0);

    await fireEvent.press(screen.getByLabelText('Ouvrir l’Atelier de la Vitrine'));
    expect(screen.queryByTestId('showcase-atelier-category-pedestals')).toBeNull();
    expect(screen.queryByTestId('showcase-pedestal-targets')).toBeNull();
    expect(mockEquipPedestals).not.toHaveBeenCalled();
  }, 15_000);

  it('shows only + Ajouter in an empty slot and restores it after removing an object', async () => {
    const screen = await render(<ShowcaseScreen previewProfile={PREVIEW_PROFILE} previewShop={EMPTY_SHOP} />);
    const slot = () => screen.getByTestId('showcase-room-slot-jersey');

    expect(slot().props.accessibilityLabel).toBe('Emplacement maillot, vide');
    expect(within(screen.getByTestId('showcase-room-empty-jersey')).getByText('+')).toBeTruthy();
    expect(within(screen.getByTestId('showcase-room-empty-jersey')).getByText('AJOUTER')).toBeTruthy();

    await fireEvent.press(slot());
    await fireEvent.press(screen.getByLabelText('Rang BRONZE'));
    expect(slot().props.accessibilityLabel).toBe('Emplacement maillot, Rang BRONZE');
    expect(within(slot()).queryByText('AJOUTER')).toBeNull();
    expect(within(slot()).queryByText('BRONZE')).toBeNull();

    await fireEvent.press(slot());
    await fireEvent.press(screen.getByLabelText('Laisser cet emplacement vide'));
    expect(slot().props.accessibilityLabel).toBe('Emplacement maillot, vide');
    expect(within(screen.getByTestId('showcase-room-empty-jersey')).getByText('AJOUTER')).toBeTruthy();
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

  it('uses the current Boutique catalogue in the object picker and hides archived pack objects', () => {
    const archivedTotem = createTeamPackPreviewItems(FNATIC_TEAM_PACK)
      .find((item) => item.id === 'fnatic-totem')!;
    const currentTotem = createTeamPackPreviewItems(SANG_DES_TITANS_PACK)
      .find((item) => item.id === 'sang-des-titans-three-voices-totem')!;

    const items = resolveRoomPlaceableItems({
      ownedItems: [
        { ...archivedTotem, owned: true },
        { ...currentTotem, owned: true },
      ],
      profileData: PREVIEW_PROFILE,
      rankAccent: '#C57943',
      rankLabel: 'BRONZE',
      ringProgressions: [],
    });

    expect(items.some((item) => item.id === 'cosmetic:fnatic-totem')).toBe(false);
    expect(items.find((item) => item.id === `cosmetic:${currentTotem.id}`)).toMatchObject({
      kind: 'trophy',
      name: 'Totem des Trois Voix',
    });
  });

  it('hides legacy cores, banners, every title and every frame while preserving current pack objects', () => {
    const currentCore = createTeamPackPreviewItems(CONCLAVE_ARCANIQUE_PACK)
      .find((item) => item.id === 'conclave-arcanique-conclave-seal')!;
    const currentBanner = createTeamPackPreviewItems(CONCLAVE_ARCANIQUE_PACK)
      .find((item) => item.id === 'conclave-arcanique-bloom-banner')!;
    const currentTitle = createTeamPackPreviewItems(FNATIC_TEAM_PACK)
      .find((item) => item.slot === 'titre_profil')!;
    const currentFrame = createTeamPackPreviewItems(CONCLAVE_ARCANIQUE_PACK)
      .find((item) => item.id === 'conclave-arcanique-trellis-frame')!;
    const legacyItems = [
      { ...currentCore, id: 'legacy-core', name: 'Core Origine' },
      { ...currentBanner, id: 'legacy-banner', name: 'Carte Noire' },
      { ...currentTitle, id: 'legacy-title', name: 'Rookie du Call' },
    ];

    const items = resolveRoomPlaceableItems({
      ownedItems: [
        ...legacyItems.map((item) => ({ ...item, owned: true })),
        { ...currentCore, owned: true },
        { ...currentBanner, owned: true },
        { ...currentTitle, owned: true },
        { ...currentFrame, owned: true },
      ],
      profileData: PREVIEW_PROFILE,
      rankAccent: '#C57943',
      rankLabel: 'BRONZE',
      ringProgressions: [],
    });

    expect(items.some((item) => item.kind === 'title')).toBe(false);
    expect(items.some((item) => item.kind === 'frame')).toBe(false);
    expect(items.filter((item) => item.kind === 'core')).toEqual([
      expect.objectContaining({ id: `cosmetic:${currentCore.id}` }),
    ]);
    expect(items.filter((item) => item.kind === 'banner')).toEqual([
      expect.objectContaining({ id: `cosmetic:${currentBanner.id}` }),
    ]);
  });
});
