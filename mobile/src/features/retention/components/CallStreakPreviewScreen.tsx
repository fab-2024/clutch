import { PreviewRoute } from '@/src/components/dev/PreviewRoute';

import { PREVIEW_STREAK } from '../preview';
import CallStreakScreen from './CallStreakScreen';

export default function CallStreakPreviewScreen() {
  return <PreviewRoute><CallStreakScreen previewState={PREVIEW_STREAK} /></PreviewRoute>;
}
