import { Redirect } from 'expo-router';

import { previewRoutesEnabled } from '@/src/components/dev/PreviewRoute';
import VisualConsumablesScreen, { PREVIEW_VISUAL_CONSUMABLES } from '@/src/features/consumables/components/VisualConsumablesScreen';

export default function VisualConsumablesPreviewScreen() {
  if (!previewRoutesEnabled) return <Redirect href="/" />;
  return <VisualConsumablesScreen previewState={PREVIEW_VISUAL_CONSUMABLES} />;
}
