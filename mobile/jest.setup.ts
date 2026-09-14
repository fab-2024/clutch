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
jest.mock('lucide-react-native/icons/user-round-plus', () => 'UserRoundPlus');
jest.mock('lucide-react-native/icons/flip-horizontal-2', () => 'FlipHorizontal');
jest.mock('lucide-react-native/icons/eye', () => 'Eye');
jest.mock('lucide-react-native/icons/heart', () => 'Heart');
jest.mock('lucide-react-native/icons/activity', () => 'Activity');
jest.mock('lucide-react-native/icons/sparkles', () => 'Sparkles');
jest.mock('lucide-react-native/icons/languages', () => 'Languages');

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
