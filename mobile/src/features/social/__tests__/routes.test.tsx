/// <reference types="jest" />

import { router, Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import SocialRoute from '@/app/(tabs)/social/index';
import DuelsMissionsEntryScreen from '../duels/components/DuelsMissionsEntryScreen';
import { SOCIAL_MISSIONS_ROUTE } from '../routes';

jest.mock('../components/SocialHomeScreen', () => {
  const { Text } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <Text>Faction actuelle</Text> };
});
jest.mock('../duels/components/DuelsScreen', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ initialMissionsOpen, onMissionsClosed }: {
      initialMissionsOpen: boolean;
      onMissionsClosed: () => void;
    }) => (
      <Pressable onPress={onMissionsClosed} accessibilityRole="button" accessibilityLabel="Fermer les missions">
        <Text>{initialMissionsOpen ? 'Missions ouvertes' : 'Défis'}</Text>
      </Pressable>
    ),
  };
});

function TestLayout() {
  const pathname = usePathname();
  const { missions } = useGlobalSearchParams<{ missions?: string }>();
  return (
    <View style={{ flex: 1 }}>
      <Text testID="route-path">{pathname}</Text>
      <Text testID="missions-query">{missions ?? ''}</Text>
      <Stack screenOptions={{ animation: 'none' }} />
    </View>
  );
}

const routes = {
  _layout: TestLayout,
  '(tabs)/index': () => <Text>Hub</Text>,
  '(tabs)/social/index': SocialRoute,
  '(tabs)/social/duels': DuelsMissionsEntryScreen,
};

describe('Current Social routes', () => {
  it.each(['/social'])(
    'opens the current faction at the canonical address from %s', async (initialUrl) => {
      await renderRouter(routes, { initialUrl });
      await waitFor(() => expect(screen.getByTestId('route-path').props.children).toBe('/social'));
      expect(screen.getByText('Faction actuelle')).toBeTruthy();
    },
  );

  it.each(['/social/duels?missions=1'])(
    'preserves direct missions access from %s and clears the request on close', async (initialUrl) => {
      await renderRouter(routes, { initialUrl });
      await waitFor(() => expect(screen.getByTestId('route-path').props.children).toBe('/social/duels'));
      expect(screen.getByText('Missions ouvertes')).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: 'Fermer les missions' }));
      await waitFor(() => expect(screen.getByTestId('missions-query').props.children).toBe(''));
      expect(screen.getByText('Défis')).toBeTruthy();
    },
  );

  it('opens missions from the Hub and returns to it after closing the panel', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await act(async () => router.push(SOCIAL_MISSIONS_ROUTE));
    await waitFor(() => expect(screen.getByText('Missions ouvertes')).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Fermer les missions' }));
    await waitFor(() => expect(screen.getByTestId('missions-query').props.children).toBe(''));
    await act(async () => router.back());
    await waitFor(() => expect(screen.getByTestId('route-path').props.children).toBe('/'));
    expect(screen.getByText('Hub')).toBeTruthy();
  });
});
