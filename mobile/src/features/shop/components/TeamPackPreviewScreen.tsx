import { Redirect, useLocalSearchParams } from 'expo-router';

import { previewRoutesEnabled } from '@/src/components/dev/PreviewRoute';

import {
  applyPreviewTeamPackAction,
  cosmeticPackById,
  createTeamPackPreviewItems,
  FNATIC_TEAM_PACK,
  type TeamPackDefinition,
} from '../teamPackCatalog';
import type { CosmeticShopData } from '../types';
import { PREVIEW_SHOP } from './ShopPreviewScreen';
import TeamPackScreen from './TeamPackScreen';

export default function TeamPackPreviewScreen() {
  const params = useLocalSearchParams<{
    packId?: string | string[];
    state?: string | string[];
  }>();
  if (!previewRoutesEnabled) return <Redirect href="/" />;

  const pack = cosmeticPackById(readParam(params.packId)) ?? FNATIC_TEAM_PACK;
  const state = readParam(params.state);
  const initial = previewPackData(state === 'insufficient' ? 320 : PREVIEW_SHOP.balance, pack);
  const data = state === 'equipped' ? applyPreviewTeamPackAction(initial, pack) : initial;
  return <TeamPackScreen packId={pack.id} previewData={data} />;
}

function previewPackData(
  balance: number,
  pack: TeamPackDefinition,
): CosmeticShopData {
  return {
    ...PREVIEW_SHOP,
    balance,
    items: [...PREVIEW_SHOP.items, ...createTeamPackPreviewItems(pack)],
  };
}

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
