import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GriffHeader } from '@/src/components/layout/GriffHeader';
import SocialSectionNav from '@/src/features/social/components/SocialSectionNav';
import type { FriendQuestsData } from '@/src/features/social/missions/types';
import { colors } from '@/src/theme';

import type { DuelRow } from '../types';
import DuelsScreen, { type DuelsMissionsPreviewData } from './DuelsScreen';

export const PREVIEW_DUELS: DuelRow[] = [
  {
    token: 'a4d5e6f789ab1234',
    match_id: 'preview-g2-fnc',
    statut: 'accepte',
    moi_role: 'createur',
    createur_pseudo: 'Pierre-Louis',
    accepteur_pseudo: 'Nova',
    createur_choix: 'a',
    accepteur_choix: 'b',
    equipe_a: 'G2 Esports',
    equipe_b: 'Fnatic',
    tag_a: 'G2',
    tag_b: 'FNC',
    jeu: 'lol',
    evenement: 'LEC Summer',
    debut: futureIso(3),
  },
  {
    token: 'b5e6f789ab123456',
    match_id: 'preview-kc-bds',
    statut: 'termine',
    moi_role: 'accepteur',
    createur_pseudo: 'Kayo',
    accepteur_pseudo: 'Pierre-Louis',
    createur_choix: 'b',
    accepteur_choix: 'a',
    equipe_a: 'Karmine Corp',
    equipe_b: 'Team BDS',
    tag_a: 'KC',
    tag_b: 'BDS',
    jeu: 'lol',
    evenement: 'LEC Summer',
    debut: futureIso(-22),
  },
];

export const PREVIEW_MISSIONS: FriendQuestsData = {
  actives: [
    {
      id: 'mission-duo-calls',
      type: 'duo_calls',
      statut: 'active',
      progression: 3,
      objectif: 5,
      recompense_xp: 120,
      recompense_volts: 35,
      expire_le: futureIso(18),
      moi_fait: true,
      partenaire_fait: false,
      partenaire: { id: 'nova', pseudo: 'Nova' },
    },
    {
      id: 'mission-opposition',
      type: 'opposition',
      statut: 'active',
      progression: 1,
      objectif: 2,
      recompense_xp: 90,
      recompense_volts: 20,
      expire_le: futureIso(31),
      partenaire: { id: 'kayo', pseudo: 'Kayo' },
      match: { id: 'preview-g2-fnc', tag_a: 'G2', tag_b: 'FNC' },
    },
  ],
  duos: [
    { user_id: 'nova', pseudo: 'Nova', missions_terminees: 9, serie_semaines: 4 },
    { user_id: 'kayo', pseudo: 'Kayo', missions_terminees: 6, serie_semaines: 3 },
    { user_id: 'ryu', pseudo: 'Ryu', missions_terminees: 4, serie_semaines: 2 },
  ],
  historique: [
    {
      id: 'mission-history-same-side',
      type: 'same_side',
      statut: 'terminee',
      progression: 1,
      objectif: 1,
      recompense_xp: 80,
      recompense_volts: 15,
      expire_le: null,
      partenaire: { id: 'nova', pseudo: 'Nova' },
    },
    {
      id: 'mission-history-revenge',
      type: 'revenge',
      statut: 'expiree',
      progression: 0,
      objectif: 1,
      recompense_xp: 100,
      recompense_volts: 20,
      expire_le: null,
      partenaire: { id: 'kayo', pseudo: 'Kayo' },
    },
  ],
  a_reveler: null,
};

const EMPTY_MISSIONS: FriendQuestsData = {
  actives: [],
  duos: [],
  historique: [],
  a_reveler: null,
};

export default function DuelsMissionsPreviewScreen() {
  const insets = useSafeAreaInsets();
  const { missions: missionsState, sheet } = useLocalSearchParams<{
    missions?: string;
    sheet?: string;
  }>();
  const previewData: DuelsMissionsPreviewData = {
    duels: PREVIEW_DUELS,
    missions: missionsState === 'empty' ? EMPTY_MISSIONS : PREVIEW_MISSIONS,
  };

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: Math.max(insets.top, 6) }]}>
        <GriffHeader variant="social" />
      </View>
      <SocialSectionNav activeOverride="challenges" />
      <View style={styles.content}>
        <DuelsScreen
          initialMissionsOpen={sheet === '1'}
          key={`${missionsState ?? 'ready'}-${sheet ?? 'closed'}`}
          previewData={previewData}
        />
      </View>
    </View>
  );
}

function futureIso(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1_000).toISOString();
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
