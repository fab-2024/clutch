/// <reference types="jest" />

import { Image } from 'expo-image';

import { prefetchRemoteImages } from '../imageCache';

jest.mock('expo-image', () => ({
  Image: {
    prefetch: jest.fn(async () => true),
  },
}));

const prefetch = Image.prefetch as jest.Mock;

describe('prefetchRemoteImages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deduplicates valid URLs before warming the shared cache', async () => {
    await expect(prefetchRemoteImages([
      'https://cdn.example/a.png',
      null,
      'https://cdn.example/a.png',
      'https://cdn.example/b.png',
    ])).resolves.toBe(true);

    expect(prefetch).toHaveBeenCalledWith([
      'https://cdn.example/a.png',
      'https://cdn.example/b.png',
    ], { cachePolicy: 'memory-disk' });
  });

  it('treats cache warming as best effort', async () => {
    prefetch.mockRejectedValueOnce(new Error('offline'));

    await expect(prefetchRemoteImages(['https://cdn.example/a.png'])).resolves.toBe(false);
  });
});
