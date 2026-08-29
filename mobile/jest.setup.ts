import { jest } from '@jest/globals';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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
