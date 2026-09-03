import { useLocalSearchParams } from 'expo-router';

import InvitationsScreen from '@/src/features/social/friends/referrals/components/InvitationsScreen';

import { PREVIEW_INVITATIONS, PREVIEW_SHOWCASE, PREVIEW_SHOWCASE_OWNER } from '../preview';
import MilestoneLinkScreen from './MilestoneLinkScreen';
import PublicShowcaseScreen from './PublicShowcaseScreen';
import ShowcaseActivityScreen from './ShowcaseActivityScreen';

const milestone = { pseudo: 'Nova', milestone: 7, earnedAt: '2026-09-03T09:00:00Z' };
export default function GrowthPreviewScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  if (section === 'activity') return <ShowcaseActivityScreen previewData={PREVIEW_SHOWCASE_OWNER} />;
  if (section === 'showcase') return <PublicShowcaseScreen previewData={PREVIEW_SHOWCASE} />;
  if (section === 'milestone') return <MilestoneLinkScreen previewData={milestone} />;
  return <InvitationsScreen previewData={PREVIEW_INVITATIONS} />;
}
