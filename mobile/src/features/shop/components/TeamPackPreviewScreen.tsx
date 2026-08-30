import { Redirect, useLocalSearchParams } from 'expo-router';

import { previewRoutesEnabled } from '@/src/components/dev/PreviewRoute';

import {
  applyPreviewTeamPackAction,
  createTeamPackPreviewItems,
  FNATIC_TEAM_PACK,
} from '../teamPackCatalog';
import type { CosmeticShopData } from '../types';
import { PREVIEW_SHOP } from './ShopPreviewScreen';
import TeamPackScreen from './TeamPackScreen';

export default function TeamPackPreviewScreen() {
  const params = useLocalSearchParams<{ state?: string | string[] }>();
  if (!previewRoutesEnabled) return <Redirect href="/" />;

  const state = readParam(params.state);
  const initial = previewPackData(state === 'insufficient' ? 320 : PREVIEW_SHOP.balance);
  const data = state === 'equipped' ? applyPreviewTeamPackAction(initial) : initial;
  return <TeamPackScreen packId={FNATIC_TEAM_PACK.id} previewData={data} />;
}

function previewPackData(balance: number): CosmeticShopData {
  return {
    ...PREVIEW_SHOP,
    balance,
    items: [...PREVIEW_SHOP.items, ...createTeamPackPreviewItems()],
  };
}

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
