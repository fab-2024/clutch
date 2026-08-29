import { Redirect } from 'expo-router';

import { previewRoutesEnabled } from '@/src/components/dev/PreviewRoute';

import StoreHubScreen from './StoreHubScreen';

export default function StoreHubPreviewScreen() {
  if (!previewRoutesEnabled) return <Redirect href="/" />;
  return <StoreHubScreen preview />;
}
