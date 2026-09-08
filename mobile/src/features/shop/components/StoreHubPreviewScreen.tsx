import { Redirect } from 'expo-router';

import { usePreviewRoutesEnabled } from '@/src/components/dev/PreviewRoute';

import { PREVIEW_SHOP } from './ShopPreviewScreen';
import StoreHubScreen from './StoreHubScreen';

export default function StoreHubPreviewScreen() {
  const previewEnabled = usePreviewRoutesEnabled();
  if (!previewEnabled) return <Redirect href="/" />;
  return <StoreHubScreen preview previewData={PREVIEW_SHOP} />;
}
