import type { EquippedCosmetics } from '@/src/features/shop/types';
import type { LevelFrameVariant } from '@/src/features/profile/levelFrames/types';

import type { ProfileData } from '../types';
import ProfileOverviewSections from './ProfileOverviewSections';
import ProfileVitrinePreviewCard from './ProfileVitrinePreviewCard';

type OwnProfileOverviewProps = {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  loading: boolean;
  levelFrameVariant: LevelFrameVariant;
  onModify: () => void;
  onOpenActivations: () => void;
  onOpenFaction: () => void;
  onOpenLocker: () => void;
  onOpenRank: () => void;
  onOpenShop: () => void;
  onOpenShowcase: () => void;
  onOpenVisitor: () => void;
  preview?: boolean;
  pseudo: string;
  rankAccent: string;
  rankLabel: string;
};

export default function OwnProfileOverview({
  cosmetics,
  data,
  loading,
  levelFrameVariant,
  onModify,
  onOpenActivations,
  onOpenFaction,
  onOpenLocker,
  onOpenRank,
  onOpenShop,
  onOpenShowcase,
  onOpenVisitor,
  preview = false,
  pseudo,
  rankAccent,
  rankLabel,
}: OwnProfileOverviewProps) {
  return (
    <>
      <ProfileVitrinePreviewCard
        cosmetics={cosmetics}
        data={data}
        levelFrameVariant={levelFrameVariant}
        loading={loading}
        onOpenShowcase={onOpenShowcase}
        onOpenVisibility={onModify}
        onOpenVisitor={onOpenVisitor}
        preview={preview}
        pseudo={pseudo}
        rankAccent={rankAccent}
        rankLabel={rankLabel}
      />
      <ProfileOverviewSections
        cosmetics={cosmetics}
        data={data}
        levelFrameVariant={levelFrameVariant}
        loading={loading}
        onModify={onModify}
        onOpenActivations={onOpenActivations}
        onOpenFaction={onOpenFaction}
        onOpenLocker={onOpenLocker}
        onOpenRank={onOpenRank}
        onOpenShop={onOpenShop}
        pseudo={pseudo}
        rankAccent={rankAccent}
        rankLabel={rankLabel}
      />
    </>
  );
}
