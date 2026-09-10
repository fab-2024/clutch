import { router } from 'expo-router';

import { APP_ROUTES } from '@/src/features/navigation/routes';

export function returnToCollection(preview = false) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(preview ? '/store-preview' : APP_ROUTES.collection);
}
