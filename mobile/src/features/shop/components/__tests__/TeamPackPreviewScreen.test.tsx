/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import TeamPackPreviewScreen from '../TeamPackPreviewScreen';

const mockTeamPackScreen = jest.fn();
let mockParams: { packId?: string; state?: string } = {};

jest.mock('expo-router', () => ({ Redirect: 'Redirect', useLocalSearchParams: () => mockParams }));
jest.mock('@/src/components/dev/PreviewRoute', () => ({ usePreviewRoutesEnabled: () => true }));
jest.mock('../ShopPreviewScreen', () => ({
  PREVIEW_SHOP: {
    balance: 1280,
    contract: {},
    equipped: {
      core: null, factionEffect: null, frame: null, profileCard: null, title: null,
      showcase: { jersey: null, lighting: null, material: null, rankDisplay: null, supports: null },
    },
    items: [],
  },
}));
jest.mock('../TeamPackScreen', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  return function MockTeamPackScreen(props: unknown) {
    mockTeamPackScreen(props);
    return React.createElement(ReactNative.View, { testID: 'mock-team-pack-screen' });
  };
});

describe('TeamPackPreviewScreen', () => {
  beforeEach(() => { jest.clearAllMocks(); mockParams = {}; });

  it.each([
    ['sang-des-titans', 'sang-des-titans-three-voices-totem'],
    ['chute-libre', 'chute-libre-falcon-jetpack'],
    ['serment-du-givre', 'serment-du-givre-veyr-dragon'],
  ])('selects the requested current pack %s', async (packId, itemId) => {
    mockParams = { packId };
    await render(<TeamPackPreviewScreen />);
    expect(mockTeamPackScreen).toHaveBeenCalledWith(expect.objectContaining({
      packId,
      previewData: expect.objectContaining({
        items: expect.arrayContaining([expect.objectContaining({ id: itemId })]),
      }),
    }));
  });

  it('selects the Clutch Originals pack with its six fictional team emblems', async () => {
    mockParams = { packId: 'clutch-originals-teams' };
    await render(<TeamPackPreviewScreen />);
    const props = mockTeamPackScreen.mock.calls[0][0] as { previewData: { items: unknown[] } };
    expect(props.previewData.items).toHaveLength(6);
  });

  it('falls back to the current default for a removed identifier', async () => {
    mockParams = { packId: 'fnatic-black-orange' };
    await render(<TeamPackPreviewScreen />);
    expect(mockTeamPackScreen).toHaveBeenCalledWith(expect.objectContaining({ packId: 'sang-des-titans' }));
  });
});
