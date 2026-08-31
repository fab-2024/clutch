/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import TeamPackPreviewScreen from '../TeamPackPreviewScreen';

const mockTeamPackScreen = jest.fn();
let mockParams: { packId?: string; state?: string } = {};

jest.mock('expo-router', () => ({
  Redirect: 'Redirect',
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/src/components/dev/PreviewRoute', () => ({ previewRoutesEnabled: true }));
jest.mock('../ShopPreviewScreen', () => ({
  PREVIEW_SHOP: {
    balance: 1280,
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
jest.mock('../TeamPackScreen', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  return function MockTeamPackScreen(props: unknown) {
    mockTeamPackScreen(props);
    return React.createElement(ReactNative.View, { testID: 'mock-team-pack-screen' });
  };
});

describe('TeamPackPreviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
  });

  it('selects the requested pack instead of hardcoding Fnatic', async () => {
    mockParams = { packId: 'kc-blue-wall' };
    await render(<TeamPackPreviewScreen />);

    expect(mockTeamPackScreen).toHaveBeenCalled();
    const props = mockTeamPackScreen.mock.calls[0][0] as {
      packId: string;
      previewData: { items: { id: string }[] };
    };
    expect(props).toEqual(expect.objectContaining({
      packId: 'kc-blue-wall',
      previewData: expect.objectContaining({
        items: expect.arrayContaining([expect.objectContaining({ id: 'kc-blue-wall-effect' })]),
      }),
    }));
    expect(props.previewData.items).toHaveLength(12);
  });

  it('selects the requested M8 pack with its sparkle effect', async () => {
    mockParams = { packId: 'm8-gentle-mates' };
    await render(<TeamPackPreviewScreen />);

    const props = mockTeamPackScreen.mock.calls[0][0] as {
      packId: string;
      previewData: { items: { id: string }[] };
    };
    expect(props).toEqual(expect.objectContaining({
      packId: 'm8-gentle-mates',
      previewData: expect.objectContaining({
        items: expect.arrayContaining([expect.objectContaining({ id: 'm8-sparkle-effect' })]),
      }),
    }));
    expect(props.previewData.items).toHaveLength(12);
  });

  it('selects the requested League of Legends collection with five objects', async () => {
    mockParams = { packId: 'league-of-legends-collection' };
    await render(<TeamPackPreviewScreen />);

    const props = mockTeamPackScreen.mock.calls[0][0] as {
      packId: string;
      previewData: { items: { id: string }[] };
    };
    expect(props).toEqual(expect.objectContaining({
      packId: 'league-of-legends-collection',
      previewData: expect.objectContaining({
        items: expect.arrayContaining([expect.objectContaining({ id: 'lol-baron-nashor' })]),
      }),
    }));
    expect(props.previewData.items).toHaveLength(5);
  });

  it('selects the requested Valorant collection with five objects', async () => {
    mockParams = { packId: 'valorant-collection' };
    await render(<TeamPackPreviewScreen />);

    const props = mockTeamPackScreen.mock.calls[0][0] as {
      packId: string;
      previewData: { items: { id: string }[] };
    };
    expect(props).toEqual(expect.objectContaining({
      packId: 'valorant-collection',
      previewData: expect.objectContaining({
        items: expect.arrayContaining([expect.objectContaining({ id: 'valorant-omen' })]),
      }),
    }));
    expect(props.previewData.items).toHaveLength(5);
  });

  it('selects the requested Rocket League collection with five objects', async () => {
    mockParams = { packId: 'rocket-league-collection' };
    await render(<TeamPackPreviewScreen />);

    const props = mockTeamPackScreen.mock.calls[0][0] as {
      packId: string;
      previewData: { items: { id: string }[] };
    };
    expect(props).toEqual(expect.objectContaining({
      packId: 'rocket-league-collection',
      previewData: expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ id: 'rocket-league-arena-ball' }),
        ]),
      }),
    }));
    expect(props.previewData.items).toHaveLength(5);
  });
});
