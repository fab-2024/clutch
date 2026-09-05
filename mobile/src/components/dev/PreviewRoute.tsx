import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { useOptionalAuth } from '@/src/providers/AuthProvider';

export const previewRoutesEnabled = __DEV__ || process.env.EXPO_PUBLIC_PREVIEW_ROUTES === '1';

export function usePreviewRoutesEnabled() {
  const auth = useOptionalAuth();
  return previewRoutesEnabled || auth?.profile?.est_developpeur === true;
}

export function PreviewRoute({ children }: { children: ReactNode }) {
  const enabled = usePreviewRoutesEnabled();
  if (!enabled) return <Redirect href="/" />;
  return children;
}
