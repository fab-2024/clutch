import { Image } from 'expo-image';

export async function prefetchRemoteImages(uris: (string | null | undefined)[]) {
  const uniqueUris = [...new Set(uris.filter((uri): uri is string => Boolean(uri?.trim())))];
  if (!uniqueUris.length) return true;

  try {
    return await Image.prefetch(uniqueUris, { cachePolicy: 'memory-disk' });
  } catch {
    return false;
  }
}
