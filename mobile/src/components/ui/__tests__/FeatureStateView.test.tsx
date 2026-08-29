/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import {
  FEATURE_STATE_COPY,
  FeatureStateView,
  type FeatureStateDomain,
} from '../FeatureStateView';

jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { cubic: identity, out: () => identity, quad: identity },
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number) => value,
  };
});

jest.mock('lucide-react-native/icons/circle-alert', () => 'CircleAlert');
jest.mock('lucide-react-native/icons/circle-check', () => 'CircleCheck');
jest.mock('lucide-react-native/icons/inbox', () => 'Inbox');

const DOMAINS = Object.keys(FEATURE_STATE_COPY) as FeatureStateDomain[];

describe('FeatureStateView', () => {
  it.each(DOMAINS)('defines loading, error and empty copy for %s', (domain) => {
    expect(Object.keys(FEATURE_STATE_COPY[domain]).sort()).toEqual(['empty', 'error', 'loading']);
    for (const state of Object.values(FEATURE_STATE_COPY[domain])) {
      expect(state.title.length).toBeGreaterThan(0);
      expect(state.description.length).toBeGreaterThan(0);
    }
  });

  it('uses the domain error copy and the shared retry contract', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <FeatureStateView domain="profile" onRetry={onRetry} variant="error" />,
    );

    expect(screen.getByText('Impossible de charger ton profil')).toBeTruthy();
    expect(screen.getByText('Ta Vitrine et ta progression n’ont pas pu être actualisées.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'RÉESSAYER' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
