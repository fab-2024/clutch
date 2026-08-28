import { useLocalSearchParams } from 'expo-router';

import type { ProfileData } from '@/src/features/profile/types';

import { shopSurfaceFromParam } from '../scope';
import type { CosmeticShopData } from '../types';
import AtelierShopScreen, { type AtelierPreviewState } from './AtelierShopScreen';
import LockerScreen, { type LockerPreviewState } from './LockerScreen';

export type ShopScreenProps = {
  previewAtelierState?: AtelierPreviewState;
  previewData?: CosmeticShopData;
  previewLockerState?: LockerPreviewState;
  previewProfile?: ProfileData;
};

export default function ShopScreen({
  previewAtelierState,
  previewData,
  previewLockerState,
  previewProfile,
}: ShopScreenProps) {
  const params = useLocalSearchParams<{ scope?: string | string[] }>();

  if (previewLockerState || shopSurfaceFromParam(params.scope) === 'locker') {
    return (
      <LockerScreen
        previewData={previewData}
        previewProfile={previewProfile}
        previewState={previewLockerState}
      />
    );
  }
  return (
    <AtelierShopScreen
      previewData={previewData}
      previewProfile={previewProfile}
      previewState={previewAtelierState}
    />
  );
}
