import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { createAtelierPreviewItems, INDIVIDUAL_PROFILE_FRAMES } from '@/src/features/shop/atelierCatalog';
import { applyPreviewAtelierAction } from '@/src/features/shop/atelierState';
import { DEFAULT_MONETIZATION_CONTRACT, EMPTY_EQUIPPED_COSMETICS, type CosmeticShopData } from '@/src/features/shop/types';
import PlayerAvatar from '../PlayerAvatar';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

const initial: CosmeticShopData = {
  balance: 1000, items: createAtelierPreviewItems(),
  equipped: EMPTY_EQUIPPED_COSMETICS, contract: DEFAULT_MONETIZATION_CONTRACT,
};

it.each(INDIVIDUAL_PROFILE_FRAMES)('renders the actual $name artwork on the profile after purchase', async (frame) => {
  const purchased = applyPreviewAtelierAction(initial, frame.id);
  expect(purchased.equipped.frame?.id).toBe(frame.id);
  expect(purchased.balance).toBe(800);
  const screen = await render(<PlayerAvatar label="Nova" avatarId="chaos-smile" cosmetics={purchased.equipped} size={94} />);
  const artwork = screen.getByTestId(`profile-frame-artwork-${frame.id}`);
  expect(artwork.props.source).toBe(frame.image);
  expect(artwork.props.resizeMode).toBe('contain');
  expect(StyleSheet.flatten(artwork.props.style)).toMatchObject({ width: 94, height: 94 });
});

it('equips one owned frame at a time without paying again', async () => {
  const first = applyPreviewAtelierAction(initial, INDIVIDUAL_PROFILE_FRAMES[0].id);
  const second = applyPreviewAtelierAction(first, INDIVIDUAL_PROFILE_FRAMES[1].id);
  const screen = await render(<PlayerAvatar label="Nova" cosmetics={second.equipped} />);
  const restored = applyPreviewAtelierAction(second, INDIVIDUAL_PROFILE_FRAMES[0].id);
  expect(restored.balance).toBe(second.balance);
  expect(restored.items.filter((item) => item.slot === 'cadre_profil' && item.equipped)).toHaveLength(1);
  await screen.rerender(<PlayerAvatar label="Nova" cosmetics={restored.equipped} />);
  expect(screen.queryByTestId(`profile-frame-artwork-${INDIVIDUAL_PROFILE_FRAMES[1].id}`)).toBeNull();
  expect(screen.getByTestId(`profile-frame-artwork-${INDIVIDUAL_PROFILE_FRAMES[0].id}`)).toBeTruthy();
});
