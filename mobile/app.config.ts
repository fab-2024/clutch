import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const host = publicAppHost(process.env.EXPO_PUBLIC_APP_ORIGIN);
  return {
    ...config,
    name: config.name ?? 'GRIFF',
    slug: config.slug ?? 'clutch-mobile',
    ios: {
      ...config.ios,
      associatedDomains: host ? [`applinks:${host}`] : [],
    },
    android: {
      ...config.android,
      intentFilters: host ? [
        {
          action: 'VIEW',
          autoVerify: true,
          category: ['BROWSABLE', 'DEFAULT'],
          data: [
            { scheme: 'https', host, pathPrefix: '/c/' },
            { scheme: 'https', host, pathPrefix: '/u/' },
          ],
        },
      ] : [],
    },
  };
};

function publicAppHost(value?: string) {
  try {
    const url = new URL(value ?? '');
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) return null;
    return url.host;
  } catch {
    return null;
  }
}
