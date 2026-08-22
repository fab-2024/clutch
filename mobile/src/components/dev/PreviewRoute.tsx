import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

export function PreviewRoute({ children }: { children: ReactNode }) {
  if (!__DEV__) return <Redirect href="/" />;
  return children;
}
