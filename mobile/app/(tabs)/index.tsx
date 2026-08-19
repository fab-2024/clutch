import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { type HubData, type HubFaction, loadHubData } from '@/src/services/hub';
import { colors, radius, spacing } from '@/src/theme/tokens';

const EMPTY_HUB: HubData = {
  seasonId: null,
  seasonName: null,
  frags: null,
  streak: 0,
  nextMatch: null,
  predictionsToday: 0,
  leagueCount: 0,
  faction: null,
};

export default function HomeScreen() {
  const { session, profile } = useAuth();
  const [hub, setHub] = useState<HubData>(EMPTY_HUB);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!session?.user.id) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    try {
      setHub(await loadHubData(session.user.id));
    } catch (caught) {
      console.error(caught);
      setError(caught instanceof Error ? caught.message : 'Impossible de charger le Hub.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const pseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'joueur';
  const initials = pseudo.slice(0, 2).toUpperCase();
  const placementsDone = Math.max(0, 5 - Number(hub.frags?.placements_restants ?? 5));
  const placementProgress = `${Math.min(100, placementsDone * 20)}%` as `${number}%`;

  const missions = useMemo(() => [
    {
      id: 'first-call',
      label: 'Premier call',
      detail: `${Math.min(1, hub.predictionsToday)} / 1`,
      done: hub.predictionsToday >= 1,
      action: () => router.push('/(tabs)/matches'),
    },
    {
      id: 'triple',
      label: 'Triplé du jour',
      detail: `${Math.min(3, hub.predictionsToday)} / 3`,
      done: hub.predictionsToday >= 3,
      action: () => router.push('/(tabs)/matches'),
    },
    {
      id: 'rating',
      label: 'Établir ton rating',
      detail: `${placementsDone} / 5`,
      done: placementsDone >= 5,
      action: () => router.push('/(tabs)/matches'),
    },
  ], [hub.predictionsToday, placementsDone]);

  const missionsDone = missions.filter((mission) => mission.done).length;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <Text style={styles.brand}>CLUTCH</Text>
            <View style={styles.onlineDot} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ouvrir le profil"
            onPress={() => router.push('/(tabs)/profile')}
            style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>

        <View style={styles.intro}>
          <Text style={styles.seasonEyebrow}>{hub.seasonName?.toUpperCase() || 'CLUTCH // AUJOURD’HUI'}</Text>
          <Text style={styles.greeting}>{pseudo},</Text>
          <Text style={styles.title}>ton prochain move.</Text>
        </View>

        <View style={styles.statusRail}>
          <View style={styles.primaryStat}>
            <Text style={styles.statEyebrow}>RATING</Text>
            <Text style={styles.primaryStatValue}>{loading ? '—' : formatNumber(hub.frags?.frags ?? 0)}</Text>
            <Text style={styles.primaryStatUnit}>FRAGS</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.secondaryStat}>
            <Text style={styles.statEyebrow}>SÉRIE</Text>
            <Text style={styles.secondaryStatValue}>{loading ? '—' : `${hub.streak}j`}</Text>
          </View>
          <View style={styles.secondaryStat}>
            <Text style={styles.statEyebrow}>PLACEMENT</Text>
            <Text style={styles.secondaryStatValue}>{loading ? '—' : `${placementsDone}/5`}</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>À JOUER</Text>
            <Text style={styles.sectionTitle}>Le match du moment</Text>
          </View>
          {hub.nextMatch ? <TimePill value={hub.nextMatch.debut} /> : null}
        </View>

        {hub.nextMatch ? <MatchHero match={hub.nextMatch} /> : <EmptyMatch />}

        <View style={styles.sectionHeadingCompact}>
          <View>
            <Text style={styles.sectionEyebrow}>BOUCLE DU JOUR</Text>
            <Text style={styles.sectionTitle}>Trois moves. Pas plus.</Text>
          </View>
          <Text style={styles.sectionMeta}>{missionsDone}/3</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.missionsRail}
        >
          {missions.map((mission, index) => (
            <Pressable
              key={mission.id}
              onPress={mission.action}
              style={({ pressed }) => [
                styles.mission,
                mission.done && styles.missionDone,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.missionIndex, mission.done && styles.missionIndexDone]}>
                <Text style={[styles.missionIndexText, mission.done && styles.missionIndexTextDone]}>
                  {mission.done ? '✓' : `0${index + 1}`}
                </Text>
              </View>
              <Text style={styles.missionLabel}>{mission.label}</Text>
              <View style={styles.missionBottom}>
                <Text style={styles.missionDetail}>{mission.detail}</Text>
                <Text style={styles.missionArrow}>→</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <RatingCard
          frags={hub.frags?.frags ?? 0}
          wins={hub.frags?.pronostics_gagnes ?? 0}
          remaining={hub.frags?.placements_restants ?? 5}
          provisional={Boolean(hub.frags?.provisoire)}
          progress={placementProgress}
        />

        <FactionCard faction={hub.faction} />
      </ScrollView>
    </Screen>
  );
}

function TimePill({ value }: { value: string }) {
  const text = countdown(value);
  const live = text === 'LIVE';
  return (
    <View style={[styles.timePill, live && styles.timePillLive]}>
      {live ? <View style={styles.liveDot} /> : null}
      <Text style={[styles.timePillText, live && styles.timePillTextLive]}>{text}</Text>
    </View>
  );
}

function MatchHero({ match }: { match: NonNullable<HubData['nextMatch']> }) {
  return (
    <Pressable
      onPress={() => router.push('/(tabs)/matches')}
      style={({ pressed }) => [styles.matchHero, pressed && styles.matchHeroPressed]}
    >
      <View style={styles.matchAccent} />
      <View style={styles.matchTop}>
        <View style={styles.gameIdentity}>
          <View style={styles.gameDot} />
          <Text numberOfLines={1} style={styles.gameText}>{gameName(match.jeu)}</Text>
        </View>
        <Text style={styles.bo}>BO{match.format}</Text>
      </View>

      <Text numberOfLines={1} style={styles.eventName}>{match.evenement}</Text>
      <Text style={styles.matchQuestion}>Tu prends qui ?</Text>

      <View style={styles.duel}>
        <Team tag={match.tag_a} name={match.equipe_a} />
        <View style={styles.duelCenter}>
          <Text style={styles.vs}>VS</Text>
          <Text style={styles.matchTime}>{formatTime(match.debut)}</Text>
        </View>
        <Team tag={match.tag_b} name={match.equipe_b} />
      </View>

      <View style={styles.cta}>
        <View>
          <Text style={styles.ctaEyebrow}>TON PROCHAIN MOVE</Text>
          <Text style={styles.ctaText}>PRENDRE POSITION</Text>
        </View>
        <View style={styles.ctaArrowCircle}><Text style={styles.ctaArrow}>→</Text></View>
      </View>
    </Pressable>
  );
}

function Team({ tag, name }: { tag: string; name: string }) {
  return (
    <View style={styles.team}>
      <View style={styles.teamMark}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.teamTag}>{tag}</Text>
      </View>
      <Text numberOfLines={2} style={styles.teamName}>{name}</Text>
    </View>
  );
}

function EmptyMatch() {
  return (
    <Pressable
      onPress={() => router.push('/(tabs)/matches')}
      style={({ pressed }) => [styles.emptyHero, pressed && styles.pressed]}
    >
      <View style={styles.emptySignal}>
        <View style={styles.emptySignalDot} />
        <View style={styles.emptySignalLine} />
      </View>
      <Text style={styles.emptyEyebrow}>CALENDRIER</Text>
      <Text style={styles.emptyTitle}>Le calme avant la prochaine affiche.</Text>
      <Text style={styles.emptyCopy}>Aucun match futur n’est encore programmé. Le Hub se mettra à jour automatiquement.</Text>
      <Text style={styles.emptyLink}>OUVRIR LES MATCHS →</Text>
    </Pressable>
  );
}

function RatingCard({
  frags,
  wins,
  remaining,
  provisional,
  progress,
}: {
  frags: number;
  wins: number;
  remaining: number;
  provisional: boolean;
  progress: `${number}%`;
}) {
  return (
    <View style={styles.ratingCard}>
      <View style={styles.ratingTop}>
        <View style={styles.ratingCopy}>
          <Text style={styles.sectionEyebrow}>PROGRESSION</Text>
          <Text style={styles.ratingTitle}>{provisional ? 'Ton rating prend forme.' : 'Ton rating est établi.'}</Text>
        </View>
        <Text style={styles.ratingValue}>{formatNumber(frags)}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progress }]} />
      </View>

      <View style={styles.ratingFooter}>
        <Text style={styles.ratingHint}>
          {remaining > 0
            ? `${remaining} placement${remaining > 1 ? 's' : ''} avant le rating complet`
            : `${wins} pronostic${wins > 1 ? 's' : ''} gagné${wins > 1 ? 's' : ''}`}
        </Text>
        <Text style={styles.ratingMeta}>{remaining > 0 ? `${5 - remaining}/5` : 'ÉTABLI'}</Text>
      </View>
    </View>
  );
}

function FactionCard({ faction }: { faction: HubFaction | null }) {
  if (!faction) {
    return (
      <Pressable
        onPress={() => router.push('/(tabs)/community')}
        style={({ pressed }) => [styles.factionEmpty, pressed && styles.pressed]}
      >
        <RelicGlyph level={1} />
        <View style={styles.factionEmptyCopy}>
          <Text style={styles.sectionEyebrow}>FACTION</Text>
          <Text style={styles.factionTitle}>Ta relique attend son équipe.</Text>
          <Text style={styles.factionCopy}>Choisis ta faction pour faire apparaître sa progression ici.</Text>
          <Text style={styles.factionLink}>ENTRER DANS LA COMMUNAUTÉ →</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/community')}
      style={({ pressed }) => [styles.factionCard, pressed && styles.pressed]}
    >
      <RelicGlyph level={faction.niveauAtteint} />
      <View style={styles.factionCopyWrap}>
        <View style={styles.factionHeadingRow}>
          <Text style={styles.sectionEyebrow}>TA FACTION</Text>
          <Text style={styles.factionLevel}>RELIQUE {Math.max(1, faction.niveauAtteint)}</Text>
        </View>
        <Text style={styles.factionName}>{faction.nom}</Text>
        <Text style={styles.factionStats}>
          {formatNumber(faction.membres)} supporter{faction.membres > 1 ? 's' : ''}
          {faction.croissance24h > 0 ? `  ·  +${faction.croissance24h} aujourd’hui` : ''}
        </Text>
        <Text style={styles.factionLink}>VOIR LA RELIQUE →</Text>
      </View>
    </Pressable>
  );
}

function RelicGlyph({ level }: { level: number }) {
  const coreScale = Math.min(1.35, 0.82 + Math.max(0, level - 1) * 0.07);
  return (
    <View style={styles.relicStage}>
      <View style={styles.relicAura} />
      <View style={styles.relicStopper} />
      <View style={styles.relicNeck} />
      <View style={styles.relicBody}>
        <View style={styles.relicLiquid} />
        <View style={[styles.relicCore, { transform: [{ scale: coreScale }] }]} />
        <View style={styles.relicShine} />
      </View>
    </View>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function countdown(value: string) {
  const delta = new Date(value).getTime() - Date.now();
  if (delta <= 0) return 'LIVE';
  const hours = Math.floor(delta / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.ceil(delta / 60_000))} MIN`;
  if (hours < 24) return `${hours}H`;
  return `${Math.ceil(hours / 24)}J`;
}

function gameName(game: string) {
  const key = String(game || '').toLowerCase();
  if (key.includes('lol')) return 'LEAGUE OF LEGENDS';
  if (key.includes('valorant')) return 'VALORANT';
  if (key.includes('cs')) return 'COUNTER-STRIKE 2';
  return String(game || 'ESPORT').toUpperCase();
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 122,
    gap: 26,
  },
  topBar: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 2.1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111820',
    borderWidth: 1,
    borderColor: '#28323B',
  },
  avatarText: { color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },
  pressed: { opacity: 0.72 },
  intro: { gap: 1 },
  seasonEyebrow: {
    color: colors.volt,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.65,
    marginBottom: 8,
  },
  greeting: { color: colors.textMuted, fontSize: 28, lineHeight: 31, fontWeight: '700', letterSpacing: -0.8 },
  title: { color: colors.text, fontSize: 35, lineHeight: 38, fontWeight: '900', letterSpacing: -1.45 },
  statusRail: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#0B1015',
    borderWidth: 1,
    borderColor: '#1C252E',
  },
  primaryStat: { flex: 1.25, justifyContent: 'center' },
  statEyebrow: { color: '#69747E', fontSize: 8, fontWeight: '900', letterSpacing: 1.15 },
  primaryStatValue: { marginTop: 2, color: colors.text, fontSize: 23, lineHeight: 25, fontWeight: '900', letterSpacing: -0.7 },
  primaryStatUnit: { marginTop: 1, color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  statusDivider: { width: 1, marginVertical: 2, marginHorizontal: 14, backgroundColor: '#202A33' },
  secondaryStat: { flex: 0.8, justifyContent: 'center' },
  secondaryStatValue: { marginTop: 5, color: colors.text, fontSize: 17, fontWeight: '900' },
  errorBanner: {
    marginTop: -10,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#241313',
    borderWidth: 1,
    borderColor: '#4A2424',
  },
  errorText: { flex: 1, color: '#F0A0A0', fontSize: 11, lineHeight: 16 },
  retry: { color: '#FFC1C1', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionHeadingCompact: { marginBottom: -12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionEyebrow: { color: '#727E89', fontSize: 9, fontWeight: '900', letterSpacing: 1.45 },
  sectionTitle: { marginTop: 4, color: colors.text, fontSize: 20, lineHeight: 24, fontWeight: '900', letterSpacing: -0.45 },
  sectionMeta: { color: colors.volt, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  timePill: {
    minWidth: 46,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#11171D',
    borderWidth: 1,
    borderColor: '#29323A',
  },
  timePillLive: { flexDirection: 'row', gap: 5, borderColor: '#32431F', backgroundColor: '#12180F' },
  timePillText: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  timePillTextLive: { color: colors.volt },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.volt },
  matchHero: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 330,
    padding: 18,
    borderRadius: 26,
    backgroundColor: '#0D1319',
    borderWidth: 1,
    borderColor: '#26323D',
  },
  matchHeroPressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  matchAccent: { position: 'absolute', top: 0, left: 28, right: 28, height: 2, backgroundColor: colors.volt, opacity: 0.8 },
  matchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  gameIdentity: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  gameDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt },
  gameText: { flex: 1, color: '#9AA5AF', fontSize: 9, fontWeight: '900', letterSpacing: 1.05 },
  bo: { color: '#68737C', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  eventName: { marginTop: 8, color: '#66727D', fontSize: 10, fontWeight: '700' },
  matchQuestion: { marginTop: 22, color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.7, textAlign: 'center' },
  duel: { marginTop: 22, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  team: { width: '37%', alignItems: 'center' },
  teamMark: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141C24',
    borderWidth: 1,
    borderColor: '#2C3741',
  },
  teamTag: { maxWidth: 60, color: colors.text, fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  teamName: { marginTop: 10, color: '#DDE3E8', fontSize: 12, lineHeight: 15, fontWeight: '800', textAlign: 'center' },
  duelCenter: { paddingTop: 19, alignItems: 'center' },
  vs: { color: '#56616B', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  matchTime: { marginTop: 5, color: colors.text, fontSize: 13, fontWeight: '900' },
  cta: {
    marginTop: 26,
    minHeight: 58,
    paddingLeft: 16,
    paddingRight: 10,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.volt,
  },
  ctaEyebrow: { color: '#39450F', fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  ctaText: { marginTop: 2, color: '#080B0F', fontSize: 12, fontWeight: '900', letterSpacing: 0.9 },
  ctaArrowCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#11170B' },
  ctaArrow: { color: colors.volt, fontSize: 21, fontWeight: '900', marginTop: -1 },
  emptyHero: {
    minHeight: 230,
    padding: 20,
    borderRadius: 26,
    backgroundColor: '#0C1116',
    borderWidth: 1,
    borderColor: '#202A33',
  },
  emptySignal: { height: 34, flexDirection: 'row', alignItems: 'center' },
  emptySignalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#3A454F' },
  emptySignalLine: { marginLeft: 7, width: 42, height: 1, backgroundColor: '#28323B' },
  emptyEyebrow: { marginTop: 8, color: '#66717B', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  emptyTitle: { marginTop: 8, maxWidth: 300, color: colors.text, fontSize: 24, lineHeight: 29, fontWeight: '900', letterSpacing: -0.65 },
  emptyCopy: { marginTop: 10, maxWidth: 320, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  emptyLink: { marginTop: 20, color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  missionsRail: { gap: 10, paddingRight: 18 },
  mission: {
    width: 164,
    minHeight: 136,
    padding: 14,
    borderRadius: 18,
    justifyContent: 'space-between',
    backgroundColor: '#0B1015',
    borderWidth: 1,
    borderColor: '#202A33',
  },
  missionDone: { borderColor: '#34451F', backgroundColor: '#0F150D' },
  missionIndex: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151D24' },
  missionIndexDone: { backgroundColor: colors.volt },
  missionIndexText: { color: '#75818B', fontSize: 9, fontWeight: '900' },
  missionIndexTextDone: { color: '#0A0D09', fontSize: 12 },
  missionLabel: { marginTop: 13, color: colors.text, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  missionBottom: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  missionDetail: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  missionArrow: { color: colors.volt, fontSize: 16, fontWeight: '900' },
  ratingCard: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#202A33',
  },
  ratingTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 },
  ratingCopy: { flex: 1 },
  ratingTitle: { marginTop: 5, color: colors.text, fontSize: 18, lineHeight: 22, fontWeight: '900', letterSpacing: -0.3 },
  ratingValue: { color: colors.volt, fontSize: 22, fontWeight: '900', letterSpacing: -0.7 },
  progressTrack: { marginTop: 18, height: 6, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: '#1C252D' },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.volt },
  ratingFooter: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  ratingHint: { flex: 1, color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  ratingMeta: { color: '#818C95', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  factionCard: {
    minHeight: 174,
    padding: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    overflow: 'hidden',
    backgroundColor: '#0A1015',
    borderWidth: 1,
    borderColor: '#27323B',
  },
  factionEmpty: {
    minHeight: 174,
    padding: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    backgroundColor: '#0A1015',
    borderWidth: 1,
    borderColor: '#202A33',
  },
  factionCopyWrap: { flex: 1, minWidth: 0 },
  factionEmptyCopy: { flex: 1, minWidth: 0 },
  factionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  factionLevel: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  factionName: { marginTop: 7, color: colors.text, fontSize: 21, lineHeight: 25, fontWeight: '900', letterSpacing: -0.5 },
  factionTitle: { marginTop: 7, color: colors.text, fontSize: 18, lineHeight: 22, fontWeight: '900', letterSpacing: -0.35 },
  factionStats: { marginTop: 6, color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  factionCopy: { marginTop: 6, color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  factionLink: { marginTop: 15, color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  relicStage: { width: 104, height: 140, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' },
  relicAura: { position: 'absolute', bottom: 13, width: 92, height: 92, borderRadius: 46, backgroundColor: '#1A2111', opacity: 0.72 },
  relicStopper: { width: 28, height: 14, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: '#35372C', borderWidth: 1, borderColor: '#626552' },
  relicNeck: { width: 22, height: 22, backgroundColor: '#182129', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#394751' },
  relicBody: {
    width: 76,
    height: 92,
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
    borderBottomLeftRadius: 31,
    borderBottomRightRadius: 31,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101920',
    borderWidth: 1,
    borderColor: '#3A4A55',
  },
  relicLiquid: { position: 'absolute', left: 4, right: 4, bottom: 4, height: 54, borderBottomLeftRadius: 27, borderBottomRightRadius: 27, borderTopLeftRadius: 11, borderTopRightRadius: 11, backgroundColor: '#221A35' },
  relicCore: { width: 19, height: 19, borderRadius: 10, backgroundColor: colors.volt, borderWidth: 4, borderColor: '#677B20' },
  relicShine: { position: 'absolute', left: 13, top: 13, width: 4, height: 40, borderRadius: 3, backgroundColor: '#91A2AC', opacity: 0.25 },
});