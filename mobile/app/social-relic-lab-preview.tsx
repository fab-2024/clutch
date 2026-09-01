import { PreviewRoute } from '@/src/components/dev/PreviewRoute';
import SocialHomePreviewScreen from '@/src/features/social/components/SocialHomePreviewScreen';

export default function SocialRelicLabPreviewRoute() {
  return (
    <PreviewRoute>
      <SocialHomePreviewScreen factionHeroVariant="v2" lab />
    </PreviewRoute>
  );
}
