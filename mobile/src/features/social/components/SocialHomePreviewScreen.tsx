import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { ClutchHeader } from '@/src/components/layout/ClutchHeader';
import { Screen } from '@/src/components/layout/Screen';
import type { CommunityData } from '@/src/features/social/faction/types';

import SocialSectionNav from './SocialSectionNav';
import {
  SocialHomeExperience,
  type SocialAvailability,
  type SocialSnapshot,
} from './SocialHomeScreen';

const PREVIEW_COMMUNITY: CommunityData = {
  factions: [
    {
      equipe_id: 'preview-kc',
      nom: 'Karmine Corp',
      tag: 'KC',
      jeu: 'lol',
      logo: null,
      membres: 1,
      niveau_atteint: 1,
      croissance_24h: 1,
      croissance_7j: 1,
      moi: true,
      dernier_evenement_id: null,
      dernier_evenement_niveau: null,
      dernier_evenement_nom: null,
      dernier_evenement_le: null,
      dernier_evenement_recompense_volts: 0,
    },
  ],
  moi: {
    user_id: 'preview-user',
    pseudo: 'Pierre-Louis',
    equipe_id: 'preview-kc',
    membre_depuis: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    pronos_depuis: 1,
    mutations_vecues: 0,
    pronos_7j: 1,
    gagnes_7j: 1,
    delta_frags_7j: 3,
    rang_activite: 1,
    total_activite: 1,
    top_activite: [],
    archives: [],
  },
};

const PREVIEW_DATA: SocialSnapshot = {
  community: PREVIEW_COMMUNITY,
  friends: {
    amis: [
      { id: 'friend-aiden', pseudo: 'Aiden', solde: 1842 },
      { id: 'friend-kayo', pseudo: 'Kayo', solde: 1756 },
      { id: 'friend-nova', pseudo: 'Nova', solde: 1623 },
      { id: 'friend-ryu', pseudo: 'Ryu', solde: 1438 },
    ],
    recues: [{ id: 'friend-luna', pseudo: 'Luna', solde: 1510 }],
    envoyees: [],
  },
  leagues: [
    { id: 'league-nightshift', nom: 'Nightshift', code: 'NS-24', createur_id: 'preview-user', cree_le: new Date().toISOString(), nb_membres: 12 },
    { id: 'league-clutch', nom: 'Clutch Friends', code: 'CF-08', createur_id: 'friend-aiden', cree_le: new Date().toISOString(), nb_membres: 8 },
  ],
  missions: {
    actives: [
      {
        id: 'mission-duo',
        type: 'prediction',
        statut: 'active',
        progression: 2,
        objectif: 3,
        recompense_xp: 250,
        recompense_volts: 0,
        expire_le: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
        partenaire: { id: 'friend-aiden', pseudo: 'Aiden' },
      },
    ],
    historique: [],
    duos: [{ user_id: 'friend-aiden', pseudo: 'Aiden', missions_terminees: 7, serie_semaines: 3 }],
    a_reveler: null,
  },
  duels: [
    {
      token: 'preview-duel',
      match_id: 'preview-match',
      statut: 'accepte',
      moi_role: 'createur',
      createur_pseudo: 'Pierre-Louis',
      accepteur_pseudo: 'Vexa',
      createur_choix: 'a',
      accepteur_choix: 'b',
      equipe_a: 'G2 Esports',
      equipe_b: 'Fnatic',
      tag_a: 'G2',
      tag_b: 'FNC',
      jeu: 'lol',
      evenement: 'LEC Summer',
      debut: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

const PREVIEW_AVAILABILITY: SocialAvailability = {
  community: true,
  duels: true,
  friends: true,
  leagues: true,
  missions: true,
};

export default function SocialHomePreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <ClutchHeader />
        <SocialSectionNav activeOverride="faction" />
        <SocialHomeExperience
          availability={PREVIEW_AVAILABILITY}
          data={PREVIEW_DATA}
          error={null}
          favoriteTeamId="preview-kc"
          loading={false}
          refreshing={false}
          onRefresh={noop}
          onRetry={noop}
        />
      </View>
    </Screen>
  );
}

function noop() {}
