import { router } from 'expo-router';

export function returnFromMatchCenter(duelToken?: string) {
  if (duelToken) {
    router.replace({ pathname: '/duel/[token]', params: { token: duelToken } });
    return;
  }

  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/(tabs)/matches');
}
