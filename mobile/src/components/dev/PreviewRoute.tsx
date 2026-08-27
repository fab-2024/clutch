import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

export const previewRoutesEnabled = __DEV__ || process.env.EXPO_PUBLIC_PREVIEW_ROUTES === '1';

export function PreviewRoute({ children }: { children: ReactNode }) {
  if (!previewRoutesEnabled) return <Redirect href="/" />;
  return children;
}
