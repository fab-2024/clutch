import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { ClutchHeader } from '@/src/components/layout/ClutchHeader';
import { Screen } from '@/src/components/layout/Screen';
import type { CommunityData, CommunityFaction } from '@/src/features/social/faction/types';

import { SocialHomeExperience } from './SocialHomeScreen';
import SocialSectionNav from './SocialSectionNav';

const PREVIEW_COMMUNITY: CommunityData = {
  factions: [
    previewFaction('g2', 'G2 Esports', 'G2', 286, 18),
    previewFaction('fnc', 'Fnatic', 'FNC', 244, 12),
    previewFaction('kc', 'Karmine Corp', 'KC', 218, 21, true),
    previewFaction('bds', 'Team BDS', 'BDS', 175, 8),
    previewFaction('th', 'Team Heretics', 'TH', 142, 5),
    previewFaction('sk', 'SK Gaming', 'SK', 119, 3),
  ],
  moi: {
    user_id: 'preview-user',
    pseudo: 'Pierre-Louis',
    equipe_id: 'kc',
    membre_depuis: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    pronos_depuis: 84,
    mutations_vecues: 3,
    pronos_7j: 12,
    gagnes_7j: 8,
    delta_frags_7j: 36,
    rang_activite: 4,
    total_activite: 218,
    top_activite: [
      { user_id: 'member-1', pseudo: 'Aiden', pronos_7j: 19, gagnes_7j: 14, rang: 1 },
      { user_id: 'member-2', pseudo: 'Kayo', pronos_7j: 17, gagnes_7j: 12, rang: 2 },
      { user_id: 'member-3', pseudo: 'Nova', pronos_7j: 14, gagnes_7j: 10, rang: 3 },
      { user_id: 'preview-user', pseudo: 'Pierre-Louis', pronos_7j: 12, gagnes_7j: 8, rang: 4 },
      { user_id: 'member-5', pseudo: 'Ryu', pronos_7j: 11, gagnes_7j: 7, rang: 5 },
    ],
    archives: [],
  },
};

export default function SocialHomePreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <ClutchHeader />
        <SocialSectionNav activeOverride="faction" />
        <SocialHomeExperience
          data={PREVIEW_COMMUNITY}
          error={null}
          favoriteTeamId="kc"
          loading={false}
          refreshing={false}
          onRefresh={noop}
          onRetry={noop}
        />
      </View>
    </Screen>
  );
}

function previewFaction(
  equipe_id: string,
  nom: string,
  tag: string,
  membres: number,
  croissance_7j: number,
  moi = false,
): CommunityFaction {
  return {
    equipe_id,
    nom,
    tag,
    jeu: 'lol',
    logo: null,
    membres,
    niveau_atteint: membres >= 100 ? 4 : membres >= 50 ? 3 : membres >= 10 ? 2 : 1,
    croissance_24h: Math.max(1, Math.round(croissance_7j / 3)),
    croissance_7j,
    moi,
    dernier_evenement_id: null,
    dernier_evenement_niveau: null,
    dernier_evenement_nom: null,
    dernier_evenement_le: null,
    dernier_evenement_recompense_volts: 0,
  };
}

function noop() {}
