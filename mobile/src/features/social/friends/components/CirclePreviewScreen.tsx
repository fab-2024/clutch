import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GriffHeader } from '@/src/components/layout/GriffHeader';
import SocialSectionNav from '@/src/features/social/components/SocialSectionNav';
import { colors } from '@/src/theme';

import type { CircleWeeklyRow, FriendRow, FriendsData, PlayerSearchRow } from '../types';
import { CirclePeopleScreen, type CirclePreviewState, type CircleView } from './FriendsScreen';

const FRIENDS: FriendRow[] = [
  { id: 'nova', pseudo: 'Nova', solde: 2840, paris: 38, gagnes: 25, tag_favori: 'KC' },
  { id: 'kayo', pseudo: 'Kayo', solde: 2260, paris: 29, gagnes: 17, tag_favori: 'G2' },
  { id: 'ryu', pseudo: 'Ryu', solde: 1940, paris: 26, gagnes: 14, tag_favori: 'FNC' },
  { id: 'luma', pseudo: 'Luma', solde: 1715, paris: 21, gagnes: 13, tag_favori: 'VIT' },
  { id: 'mako', pseudo: 'Mako', solde: 1540, paris: 18, gagnes: 9, tag_favori: 'BDS' },
  { id: 'sol', pseudo: 'Solstice', solde: 1390, paris: 17, gagnes: 8, tag_favori: 'GX' },
  { id: 'veil', pseudo: 'Veil', solde: 1260, paris: 15, gagnes: 7, tag_favori: 'TH' },
  { id: 'ace', pseudo: 'Ace', solde: 1180, paris: 13, gagnes: 6, tag_favori: 'M8' },
  { id: 'nox', pseudo: 'Nox', solde: 1050, paris: 11, gagnes: 5, tag_favori: 'SK' },
  { id: 'jinx', pseudo: 'Jinx', solde: 960, paris: 9, gagnes: 4, tag_favori: 'KOI' },
  { id: 'sena', pseudo: 'Sena', solde: 890, paris: 8, gagnes: 4, tag_favori: 'TL' },
  { id: 'echo', pseudo: 'Echo', solde: 820, paris: 7, gagnes: 3, tag_favori: 'C9' },
];

const RANKING: CircleWeeklyRow[] = [
  weeklyRow('nova', 'Nova', 1, 11, 8, 360, false, 'KC'),
  weeklyRow('me', 'Pierre-Louis', 2, 10, 7, 285, true, 'G2'),
  weeklyRow('kayo', 'Kayo', 3, 9, 6, 220, false, 'G2'),
  weeklyRow('ryu', 'Ryu', 4, 8, 5, 155, false, 'FNC'),
  weeklyRow('luma', 'Luma', 5, 8, 4, 80, false, 'VIT'),
  weeklyRow('mako', 'Mako', 6, 7, 3, 15, false, 'BDS'),
  weeklyRow('sol', 'Solstice', 7, 6, 3, -20, false, 'GX'),
  weeklyRow('veil', 'Veil', 8, 6, 2, -75, false, 'TH'),
  weeklyRow('ace', 'Ace', 9, 5, 2, -120, false, 'M8'),
  weeklyRow('nox', 'Nox', 10, 4, 1, -190, false, 'SK'),
  weeklyRow('jinx', 'Jinx', 11, 3, 1, -225, false, 'KOI'),
  weeklyRow('sena', 'Sena', 12, 2, 0, -280, false, 'TL'),
];

export const PREVIEW_CIRCLE_DATA: FriendsData = {
  amis: FRIENDS,
  recues: [
    { id: 'lyra', pseudo: 'Lyra', solde: 1480, paris: 19, gagnes: 11, tag_favori: 'KC' },
    { id: 'orion', pseudo: 'Orion', solde: 1210, paris: 14, gagnes: 7, tag_favori: 'G2' },
  ],
  envoyees: [
    { id: 'atlas', pseudo: 'Atlas', solde: 1350, paris: 16, gagnes: 8, tag_favori: 'FNC' },
  ],
  weekly: {
    saison_id: 'preview-summer-2026',
    semaine: 'S34',
    debut: '2026-08-24T00:00:00.000Z',
    fin: '2026-08-30T23:59:59.000Z',
    classement: RANKING,
    moi: {
      ...RANKING[1],
      participants: RANKING.length,
    },
  },
};

export const PREVIEW_CIRCLE_SEARCH: PlayerSearchRow[] = [
  { id: 'nova-prime', pseudo: 'NovaPrime', relation: 'aucune' },
  { id: 'nova-two', pseudo: 'NovaTwo', relation: 'demande_envoyee' },
  { id: 'nova-core', pseudo: 'NovaCore', relation: 'ami' },
];

const EMPTY_CIRCLE_DATA: FriendsData = { amis: [], recues: [], envoyees: [], weekly: null };
const LONG_CIRCLE_DATA: FriendsData = {
  ...PREVIEW_CIRCLE_DATA,
  amis: PREVIEW_CIRCLE_DATA.amis.map((friend, index) => (
    index === 0
      ? { ...friend, pseudo: 'NovaDuServeurFrancophoneTrèsLong' }
      : friend
  )),
};

type PreviewStateKey = 'default' | 'empty' | 'error' | 'loading' | 'long' | 'search';

export default function CirclePreviewScreen() {
  const insets = useSafeAreaInsets();
  const { focus, state: stateParam, view: viewParam } = useLocalSearchParams<{
    focus?: string;
    state?: string;
    view?: string;
  }>();
  const state = previewStateKey(stateParam);
  const initialView: CircleView = viewParam === 'friends' || state === 'search' || state === 'long'
    ? 'friends'
    : 'activity';
  const focusRequests = focus === 'requests' || focus === '1';
  const previewState = useMemo<CirclePreviewState>(() => previewFor(state), [state]);

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: Math.max(insets.top, 6) }]}>
        <GriffHeader variant="social" />
      </View>
      <SocialSectionNav activeOverride="circle" />
      <View style={styles.content}>
        <CirclePeopleScreen
          focusRequests={focusRequests}
          initialView={initialView}
          key={`${initialView}-${state}-${focusRequests ? 'requests' : 'activity'}`}
          previewState={previewState}
        />
      </View>
    </View>
  );
}

function previewFor(state: PreviewStateKey): CirclePreviewState {
  if (state === 'empty') return { data: EMPTY_CIRCLE_DATA };
  if (state === 'loading') return { data: EMPTY_CIRCLE_DATA, loading: true };
  if (state === 'error') return { data: EMPTY_CIRCLE_DATA, error: 'Le Cercle est indisponible pour le moment.' };
  if (state === 'search') {
    return { data: PREVIEW_CIRCLE_DATA, search: 'nova', searchResults: PREVIEW_CIRCLE_SEARCH };
  }
  if (state === 'long') return { data: LONG_CIRCLE_DATA };
  return { data: PREVIEW_CIRCLE_DATA };
}

function previewStateKey(value?: string): PreviewStateKey {
  if (value === 'empty' || value === 'error' || value === 'loading' || value === 'long' || value === 'search') return value;
  return 'default';
}

function weeklyRow(
  id: string,
  pseudo: string,
  rang: number,
  calls: number,
  victoires: number,
  frags: number,
  moi: boolean,
  tag: string,
): CircleWeeklyRow {
  return {
    id,
    pseudo,
    tag_favori: tag,
    rang,
    calls,
    victoires,
    precision_pct: calls ? (victoires / calls) * 100 : null,
    frags_hebdo: frags,
    meilleur_call: Math.max(0, Math.round(frags * 0.4)),
    frags: 1_000 + frags,
    grade: null,
    moi,
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  top: {
    backgroundColor: '#06090C',
    borderBottomWidth: 1,
    borderBottomColor: '#171D23',
  },
  content: {
    flex: 1,
  },
});
