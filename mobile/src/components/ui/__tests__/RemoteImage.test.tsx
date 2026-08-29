/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { RemoteImage } from '../RemoteImage';

jest.mock('expo-image', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  const MockImage = Object.assign(
    (props: object) => React.createElement(ReactNative.View, props),
    { prefetch: jest.fn(async () => true) },
  );
  return { Image: MockImage };
});
jest.mock('react-native-reanimated', () => ({
  useReducedMotion: () => true,
}));

describe('RemoteImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses a stable memory and disk cache policy without motion when requested by the OS', async () => {
    const screen = await render(
      <RemoteImage style={{ height: 48, width: 48 }} testID="remote-mark" uri="https://cdn.example/mark.png" />,
    );

    expect(screen.getByTestId('remote-mark').props).toEqual(expect.objectContaining({
      cachePolicy: 'memory-disk',
      contentFit: 'cover',
      recyclingKey: 'https://cdn.example/mark.png',
      source: { uri: 'https://cdn.example/mark.png' },
      transition: 0,
    }));
  });

  it('reports when the requested asset is actually displayed', async () => {
    const onDisplay = jest.fn();
    const screen = await render(
      <RemoteImage
        onDisplay={onDisplay}
        style={{ height: 48, width: 48 }}
        testID="remote-mark"
        uri="https://cdn.example/mark.png"
      />,
    );

    fireEvent(screen.getByTestId('remote-mark'), 'display');

    expect(onDisplay).toHaveBeenCalledTimes(1);
  });

});
