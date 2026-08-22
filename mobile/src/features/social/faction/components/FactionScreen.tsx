import { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme';

import { useCommunityDashboard } from '../hooks/useCommunityDashboard';
import { factionProgress } from '../utils';
import {
  CommunitySkeleton,
  EmptyCommunity,
  FactionHero,
  FactionWar,
  FormsCollection,
  MutationArchive,
  MyImpact,
  VisitorNotice,
} from './FactionSections';
import { styles } from './FactionScreen.styles';

export default function FactionScreen() {
  const { profile } = useAuth();
  const { data, error, load, loading, refreshing } = useCommunityDashboard();

  const mine = useMemo(
    () => data.factions.find(
      (faction) => faction.moi || faction.equipe_id === profile?.equipe_favorite_id,
    ) ?? null,
    [data.factions, profile?.equipe_favorite_id],
  );
  const featured = mine ?? data.factions[0] ?? null;
  const rank = featured
    ? Math.max(1, data.factions.findIndex((faction) => faction.equipe_id === featured.equipe_id) + 1)
    : 0;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.volt}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>FACTION // RÉACTEUR COLLECTIF</Text>
          <Text style={styles.title}>Votre énergie prend forme.</Text>
          <Text style={styles.subtitle}>
            Chaque membre compte pour un supporter. L’activité fait vivre la faction, sans gonfler artificiellement la relique.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void load()}>
              <Text style={styles.retry}>RÉESSAYER</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? <CommunitySkeleton /> : featured ? (
          <>
            <FactionHero faction={featured} rank={rank} isMine={Boolean(mine)} />
            {!mine ? <VisitorNotice /> : null}
            <FactionWar factions={data.factions} featuredId={featured.equipe_id} />
            {mine && data.moi ? <MyImpact me={data.moi} faction={mine} /> : null}
            {mine && data.moi ? <MutationArchive me={data.moi} progress={factionProgress(mine.membres, mine.niveau_atteint)} /> : null}
            <FormsCollection faction={featured} />
          </>
        ) : (
          <EmptyCommunity />
        )}
      </ScrollView>
    </Screen>
  );
}
