/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import { Skeleton, SkeletonGroup } from '../Skeleton';

jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    cancelAnimation: jest.fn(),
    Easing: { inOut: () => identity, quad: identity },
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withRepeat: (value: number) => value,
    withTiming: (value: number) => value,
  };
});

describe('Skeleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('announces one busy region while hiding its decorative geometry', async () => {
    const screen = await render(
      <SkeletonGroup label="Chargement du profil" testID="profile-loading">
        <Skeleton height={48} testID="skeleton-block" width="70%" />
      </SkeletonGroup>,
    );

    expect(screen.getByRole('progressbar').props).toEqual(expect.objectContaining({
      accessibilityLabel: 'Chargement du profil',
      accessibilityLiveRegion: 'polite',
      accessibilityState: { busy: true },
    }));
    expect(screen.getByTestId('skeleton-block', { includeHiddenElements: true }).props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('keeps the loading geometry static when motion is reduced', async () => {
    const screen = await render(
      <SkeletonGroup label="Chargement" reduceMotionOverride>
        <Skeleton height={20} />
      </SkeletonGroup>,
    );

    expect(screen.getByRole('progressbar')).toHaveStyle({ opacity: 0.82 });
  });
});
