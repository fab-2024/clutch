import { jest } from '@jest/globals';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// StateView is consumed across feature suites. Keep its Lucide boundary as a
// lightweight host so Jest never has to parse the package's ESM icon modules.
jest.mock('lucide-react-native/icons/circle-alert', () => 'CircleAlert');
jest.mock('lucide-react-native/icons/circle-check', () => 'CircleCheck');
jest.mock('lucide-react-native/icons/inbox', () => 'Inbox');

// P1 cards are shared by Hub, profile and shop. Keep their icon-only native
// boundary lightweight while retaining the real cards and navigation in tests.
jest.mock('lucide-react-native/icons/flame', () => 'Flame');
jest.mock('lucide-react-native/icons/shield-check', () => 'ShieldCheck');
jest.mock('lucide-react-native/icons/chevron-right', () => 'ChevronRight');

// Skia ships an ESM-native renderer. Unit tests exercise the adaptive atmosphere
// rules directly and replace only this visual boundary with a lightweight host.
jest.mock('./src/features/profile/components/showcase/ShowcaseAtmosphereLayer', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function ShowcaseAtmosphereMock({ active }: { active: boolean }) {
    return React.createElement(View, {
      testID: `showcase-atmosphere-${active ? 'active' : 'paused'}`,
    });
  };
});

// The relic interaction canvas is verified through its pure presentation rules.
// Keep native Skia out of feature tests that only exercise Social behavior.
jest.mock('./src/features/social/faction/components/InteractiveRelicVial', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: React.forwardRef(function InteractiveRelicVialMock(
      props: { onMutationBurst?: () => void; onMutationComplete?: () => void; testID?: string },
      ref: unknown,
    ) {
      React.useImperativeHandle(ref, () => ({
        playReaction: () => undefined,
        playMutation: () => {
          props.onMutationBurst?.();
          props.onMutationComplete?.();
        },
      }));
      return React.createElement(View, { testID: props.testID ?? 'interactive-relic-vial' });
    }),
  };
});
