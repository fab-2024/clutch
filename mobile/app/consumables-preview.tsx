import { Redirect } from 'expo-router';

import { usePreviewRoutesEnabled } from '@/src/components/dev/PreviewRoute';
import VisualConsumablesScreen, { PREVIEW_VISUAL_CONSUMABLES } from '@/src/features/consumables/components/VisualConsumablesScreen';

export default function VisualConsumablesPreviewScreen() {
  const previewEnabled = usePreviewRoutesEnabled();
  if (!previewEnabled) return <Redirect href="/" />;
  return <VisualConsumablesScreen previewState={PREVIEW_VISUAL_CONSUMABLES} />;
}
