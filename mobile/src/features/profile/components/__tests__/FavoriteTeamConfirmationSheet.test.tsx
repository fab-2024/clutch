/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import type { TeamOrganization } from '@/src/features/onboarding/types';

import { FavoriteTeamConfirmationSheet } from '../FavoriteTeamConfirmationSheet';

jest.mock('lucide-react-native/icons/shield-check', () => ({ __esModule: true, default: 'ShieldCheck' }));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { cubic: identity, out: () => identity, quad: identity },
    runOnJS: (callback: () => void) => callback,
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number, _config: object, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return value;
    },
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

const fnatic: TeamOrganization = {
  key: 'fnatic',
  name: 'Fnatic',
  tag: 'FNC',
  games: ['lol'],
  teams: [{ id: 'fnc-lol', jeu: 'lol', nom: 'Fnatic', tag: 'FNC' }],
};
const g2: TeamOrganization = {
  key: 'g2',
  name: 'G2 Esports',
  tag: 'G2',
  games: ['lol'],
  teams: [{ id: 'g2-lol', jeu: 'lol', nom: 'G2 Esports', tag: 'G2' }],
};

describe('FavoriteTeamConfirmationSheet', () => {
  it('states the irreversible window before allowing confirmation', async () => {
    const onConfirm = jest.fn();
    const screen = await render(
      <FavoriteTeamConfirmationSheet
        busy={false}
        currentOrganization={fnatic}
        error={null}
        onClose={jest.fn()}
        onConfirm={onConfirm}
        organization={g2}
      />,
    );

    expect(screen.getByText('7 JOURS')).toBeTruthy();
    expect(screen.getByText('Fnatic')).toBeTruthy();
    expect(screen.getByRole('header')).toHaveTextContent('Changer de faction ?');
    expect(screen.getAllByText('G2 Esports').length).toBeGreaterThanOrEqual(1);
    await fireEvent.press(screen.getByRole('button', { name: 'CONFIRMER LE CHANGEMENT' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
