import { PreviewRoute } from '@/src/components/dev/PreviewRoute';
import SocialHomePreviewScreen from '@/src/features/social/components/SocialHomePreviewScreen';

export default function SocialV2PreviewRoute() {
  return (
    <PreviewRoute>
      <SocialHomePreviewScreen factionHeroVariant="v2" />
    </PreviewRoute>
  );
}
