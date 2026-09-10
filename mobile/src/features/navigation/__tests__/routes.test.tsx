/// <reference types="jest" />

import { router, Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import TabsLayout from '@/app/(tabs)/_layout';
import CollectionRoute from '@/app/(tabs)/collection';
import PublicProfileRoute from '@/app/u/[pseudo]';

// These integration tests mount both the real stack and bottom-tab navigators.
jest.setTimeout(15_000);

jest.mock('@/src/components/navigation/LiquidGlassTabBar', () => ({
  useLiquidGlassTabOptions: () => ({ route }: { route: { name: string } }) => ({
    headerShown: false,
    title: route.name === 'collection' ? 'Collection' : route.name,
  }),
}));
jest.mock('@/src/features/shop/components/StoreHubScreen', () => {
  const { Text } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <Text>Vitrine et magasin</Text> };
});
jest.mock('@/src/features/profile/components/ProfileScreen', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ profilePseudo }: { profilePseudo: string }) => <Text>{profilePseudo}</Text>,
  };
});

function TestLayout() {
  const pathname = usePathname();
  const { pseudo } = useGlobalSearchParams<{ pseudo?: string }>();
  return (
    <View style={{ flex: 1 }}>
      <Text testID="route-path">{pathname}</Text>
      <Text testID="route-pseudo">{pseudo ?? ''}</Text>
      <Stack screenOptions={{ animation: 'none' }} />
    </View>
  );
}

const routes = {
  _layout: TestLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': () => <Text>Hub</Text>,
  '(tabs)/matches': () => <Text>Matchs</Text>,
  '(tabs)/social': () => <Text>Social</Text>,
  '(tabs)/rank': () => <Text>Rank</Text>,
  '(tabs)/room': () => <Text>Room</Text>,
  '(tabs)/collection': CollectionRoute,
  'u/[pseudo]': PublicProfileRoute,
};

describe('Current product routes', () => {
  it.each(['/collection'])(
    'opens Collection from %s with exactly five visible tabs', async (initialUrl) => {
      await renderRouter(routes, { initialUrl });
      await waitFor(() => expect(screen.getByTestId('route-path').props.children).toBe('/collection'));
      expect(screen.getByText('Vitrine et magasin')).toBeTruthy();
      expect(screen.getAllByLabelText(/, tab, \d+ of \d+$/)).toHaveLength(5);
    },
  );

  it('returns to the Hub after opening Collection', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await act(async () => router.push('/collection'));
    await waitFor(() => expect(screen.getByTestId('route-path').props.children).toBe('/collection'));
    await act(async () => router.back());
    await waitFor(() => expect(screen.getByTestId('route-path').props.children).toBe('/'));
    await fireEvent.press(screen.getByLabelText(/^Collection, tab,/));
    await waitFor(() => expect(screen.getByTestId('route-path').props.children).toBe('/collection'));
  });

  it.each(['Nova', 'Étoile Bleue'])(
    'opens the public profile for %s', async (pseudo) => {
      await renderRouter(routes, { initialUrl: `/u/${encodeURIComponent(pseudo)}` });
      await waitFor(() => expect(screen.getByTestId('route-path').props.children).toMatch(/^\/u\//));
      expect(screen.getByTestId('route-pseudo').props.children).toBe(pseudo);
      expect(screen.getAllByText(pseudo).length).toBeGreaterThan(0);
    },
  );
});
