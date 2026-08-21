import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { ClutchHeader } from '@/src/components/layout/ClutchHeader';
import { Screen } from '@/src/components/layout/Screen';
import ClutchCore from '@/src/components/visual/ClutchCore';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, fonts, layout, radius, spacing } from '@/src/theme';

import { loadHubData } from '../api';
import type { HubData, HubMatch, HubPrediction } from '../types';

type HubGame = 'lol' | 'valorant' | 'cs2';

const DAILY_CALL_GOAL = 3;

const GAME_BACKGROUNDS: Record<HubGame, ImageSourcePropType> = {
  lol: require('../../../../assets/onboarding/lol-characters.jpg'),
  valorant: require('../../../../assets/onboarding/valorant-characters.jpg'),
  cs2: require('../../../../assets/onboarding/cs2-operators.jpg'),
};

const EMPTY_HUB: HubData = {
  seasonId: null,
  seasonName: null,
  frags: null,
  streak: 0,
  nextMatch: null,
  upNext: [],
  nextMatchPrediction: null,
  predictionsToday: 0,
  leagueCount: 0,
  faction: null,
};

export default function HomeScreen() {
  const { profile, session } = useAuth();
  const [hub, setHub] = useState<HubData>(EMPTY_HUB);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!session?.user.id) {
      setHub(EMPTY_HUB);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setHub(await loadHubData(session.user.id, profile?.jeux_suivis ?? []));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de charger le Hub.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.jeux_suivis, session?.user.id]);

  useEffect(() => { void load(); }, [load]);

  return (
    <HubExperience
      error={error}
      hub={hub}
      loading={loading}
      profileName={profile?.pseudo}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      onRetry={() => void load()}
    />
  );
}

type HubExperienceProps = {
  error: string | null;
  headerEconomy?: { frags: number; volts: number };
  hub: HubData;
  loading: boolean;
  profileName?: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onRetry: () => void;
};

export function HubExperience({
  error,
  headerEconomy,
  hub,
  loading,
  profileName,
  refreshing,
  onRefresh,
  onRetry,
}: HubExperienceProps) {
  const reduceMotion = useReducedMotion();
  const entrance = (delay: number) => reduceMotion ? undefined : FadeInDown.delay(delay).duration(420);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.volt} />}
      >
        <ClutchHeader economy={headerEconomy} />

        <Animated.View entering={entrance(30)} style={styles.intro}>
          <View style={styles.introTop}>
            <View style={styles.kickerRow}>
              <View style={styles.kickerLine} />
              <Text numberOfLines={1} style={styles.kicker}>
                {profileName ? `BON RETOUR, ${profileName.toUpperCase()}` : 'CLUTCH // AUJOURD’HUI'}
              </Text>
            </View>
            <View style={styles.seasonChip}>
              <View style={styles.seasonChipDot} />
              <Text style={styles.seasonChipText}>{hub.seasonName?.toUpperCase() || 'INTERSAISON'}</Text>
            </View>
          </View>
          <Text style={styles.pageTitle}>TON PROCHAIN{`\n`}MOVE.</Text>
        </Animated.View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={onRetry}><Text style={styles.retryText}>RÉESSAYER</Text></Pressable>
          </View>
        ) : null}

        <Animated.View entering={entrance(90)}>
          {loading ? <HeroSkeleton /> : hub.nextMatch ? <MatchHero match={hub.nextMatch} prediction={hub.nextMatchPrediction} /> : <EmptyHero />}
        </Animated.View>

        <Animated.View entering={entrance(150)}>
          <CorePanel hub={hub} loading={loading} />
        </Animated.View>

        {!loading && hub.upNext.length ? (
          <Animated.View entering={entrance(210)}>
            <UpNext matches={hub.upNext} />
          </Animated.View>
        ) : null}

        <Animated.View entering={entrance(270)}>
          <DailyMission calls={hub.predictionsToday} loading={loading} />
        </Animated.View>

      </ScrollView>
    </Screen>
  );
}

function MatchHero({ match, prediction }: { match: HubMatch; prediction: HubPrediction | null }) {
  const live = isLive(match);
  const predictionTag = prediction?.choice === 'a' ? match.tag_a : prediction?.choice === 'b' ? match.tag_b : null;

  return (
    <Pressable
      accessibilityHint="Ouvre le Match Center"
      accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}`}
      accessibilityRole="button"
      onPress={() => openMatch(match.id)}
      style={({ pressed }) => [styles.matchCard, pressed && styles.pressed]}
    >
      <Image resizeMode="cover" source={GAME_BACKGROUNDS[gameKey(match.jeu)]} style={styles.matchBackdrop} />
      <LinearGradient colors={['rgba(3,6,9,.16)', 'rgba(3,6,9,.58)', 'rgba(3,6,9,.97)']} end={{ x: 0.5, y: 1 }} start={{ x: 0.5, y: 0 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(29,111,194,.30)', 'transparent', 'rgba(213,53,77,.25)']} end={{ x: 1, y: .6 }} start={{ x: 0, y: .6 }} style={StyleSheet.absoluteFill} />

      <View style={styles.matchTop}>
        <View style={styles.eventRow}>
          <View style={styles.eventDot} />
          <Text numberOfLines={1} style={styles.eventText}>{gameName(match.jeu).toUpperCase()} · {match.evenement}</Text>
        </View>
        <View style={[styles.statePill, live && styles.livePill]}>
          <View style={[styles.stateDot, live && styles.liveDot]} />
          <Text style={[styles.stateText, live && styles.liveText]}>{live ? 'LIVE' : formatSchedule(match.debut)}</Text>
        </View>
      </View>

      <View style={styles.matchPrompt}>
        <Text style={styles.matchPromptKicker}>MATCH DU MOMENT</Text>
        <Text style={styles.matchPromptTitle}>{live ? 'LE LIVE T’ATTEND.' : prediction ? 'TON CALL EST VERROUILLÉ.' : 'CHOISIS TON CAMP.'}</Text>
      </View>

      <View style={styles.duel}>
        <Team accent="#55A7FF" name={match.equipe_a} tag={match.tag_a} />
        <View style={styles.vsBlock}>
          <Text style={styles.bo}>BO{match.format}</Text>
          <Text style={styles.vs}>VS</Text>
          <View style={styles.vsLine} />
        </View>
        <Team accent="#FF5B70" name={match.equipe_b} tag={match.tag_b} />
      </View>

      <View style={[styles.matchAction, predictionTag && styles.matchActionLocked]}>
        <Text style={[styles.matchActionText, predictionTag && styles.matchActionTextLocked]}>{predictionTag ? `TON CALL · ${predictionTag}` : matchActionLabel(match, prediction)}</Text>
      </View>
    </Pressable>
  );
}

function Team({ accent, tag, name }: { accent: string; tag: string; name: string }) {
  return (
    <View style={styles.team}>
      <TeamLogo accent={accent} name={name} size={68} tag={tag} />
      <Text numberOfLines={1} style={[styles.teamTag, { color: accent }]}>{tag}</Text>
      <Text numberOfLines={2} style={styles.teamName}>{name}</Text>
    </View>
  );
}

function CorePanel({ hub, loading }: { hub: HubData; loading: boolean }) {
  const settled = hub.frags?.pronostics_regles ?? 0;
  const wins = hub.frags?.pronostics_gagnes ?? 0;
  const accuracy = settled ? `${Math.round((wins / settled) * 100)} %` : '—';
  const remaining = hub.frags?.placements_restants ?? 0;
  const provisional = Boolean(hub.frags?.provisoire);
  const status = !hub.seasonId ? 'EN ATTENTE' : provisional ? `${remaining} PLACEMENT${remaining > 1 ? 'S' : ''}` : 'RATING CLASSÉ';

  return (
    <Pressable accessibilityLabel="Ouvrir mon rating" accessibilityRole="button" onPress={() => router.push('/(tabs)/profile')} style={({ pressed }) => [styles.coreCard, pressed && styles.pressed]}>
      <LinearGradient colors={['#111711', '#0A0F13', '#080C10']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={styles.coreTop}>
        <View style={styles.coreVisual}><ClutchCore compact size={130} /></View>
        <View style={styles.coreCopy}>
          <Text style={styles.coreKicker}>CLUTCH CORE · {hub.seasonName?.toUpperCase() || 'INTERSAISON'}</Text>
          <Text style={styles.coreRating}>{loading ? '—' : formatNumber(hub.frags?.frags ?? 0)}</Text>
          <View style={styles.coreStatus}><View style={styles.coreStatusDot} /><Text style={styles.coreStatusText}>{status}</Text></View>
          <Text style={styles.corePeak}>PIC · {loading ? '—' : formatNumber(hub.frags?.pic_frags ?? 0)} FRAGS</Text>
        </View>
      </View>
      <View style={styles.coreMetrics}>
        <CoreMetric label="SÉRIE" value={loading ? '—' : `${hub.streak} J`} />
        <View style={styles.coreMetricDivider} />
        <CoreMetric label="PRÉCISION" value={loading ? '—' : accuracy} />
        <View style={styles.coreMetricDivider} />
        <CoreMetric label="LIGUES" value={loading ? '—' : String(hub.leagueCount)} />
      </View>
    </Pressable>
  );
}

function CoreMetric({ label, value }: { label: string; value: string }) {
  return <View style={styles.coreMetric}><Text style={styles.coreMetricValue}>{value}</Text><Text style={styles.coreMetricLabel}>{label}</Text></View>;
}

function UpNext({ matches }: { matches: HubMatch[] }) {
  return (
    <View style={styles.upNextSection}>
      <SectionHead kicker="À SUIVRE" title="Les prochaines affiches." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upNextRail}>
        {matches.map((match) => (
          <Pressable accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}, ${formatSchedule(match.debut)}`} accessibilityRole="button" key={match.id} onPress={() => openMatch(match.id)} style={({ pressed }) => [styles.upNextCard, pressed && styles.pressed]}>
            <Image resizeMode="cover" source={GAME_BACKGROUNDS[gameKey(match.jeu)]} style={styles.upNextBackdrop} />
            <LinearGradient colors={['rgba(3,6,9,.42)', 'rgba(3,6,9,.95)']} end={{ x: .5, y: 1 }} start={{ x: .5, y: 0 }} style={StyleSheet.absoluteFill} />
            <View style={styles.upNextTop}><Text style={styles.upNextWhen}>{formatSchedule(match.debut)}</Text><Text style={styles.upNextGame}>{gameName(match.jeu).toUpperCase()}</Text></View>
            <Text numberOfLines={1} style={styles.upNextEvent}>{match.evenement}</Text>
            <View style={styles.upNextDuel}><Text numberOfLines={1} style={styles.upNextTag}>{match.tag_a}</Text><Text style={styles.upNextVs}>VS</Text><Text numberOfLines={1} style={styles.upNextTag}>{match.tag_b}</Text></View>
            <View style={styles.upNextFooter}><Text style={styles.upNextFormat}>BO{match.format}</Text><Text style={styles.upNextArrow}>→</Text></View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <View style={styles.sectionHead}>
      <View><Text style={styles.sectionKicker}>{kicker}</Text><Text style={styles.sectionTitle}>{title}</Text></View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/matches')}><Text style={styles.sectionLink}>TOUT VOIR →</Text></Pressable>
    </View>
  );
}

function DailyMission({ calls, loading }: { calls: number; loading: boolean }) {
  const completed = Math.min(calls, DAILY_CALL_GOAL);
  const progress = loading ? 0 : Math.round((completed / DAILY_CALL_GOAL) * 100);
  return (
    <Pressable accessibilityLabel={`Rythme du jour, ${completed} appels sur ${DAILY_CALL_GOAL}`} accessibilityRole="button" onPress={() => router.push('/(tabs)/matches')} style={({ pressed }) => [styles.missionCard, pressed && styles.pressed]}>
      <View style={styles.missionIcon}><Text style={styles.missionIconText}>◎</Text></View>
      <View style={styles.missionCopy}>
        <View style={styles.missionTop}><Text style={styles.missionKicker}>RYTHME DU JOUR</Text><Text style={styles.missionCount}>{loading ? '—' : `${completed} / ${DAILY_CALL_GOAL}`}</Text></View>
        <Text style={styles.missionTitle}>POSE {DAILY_CALL_GOAL} CALLS.</Text>
        <View style={styles.missionTrack}><View style={[styles.missionProgress, { width: `${progress}%` }]} /></View>
      </View>
      <Text style={styles.missionArrow}>→</Text>
    </Pressable>
  );
}

function EmptyHero() {
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/matches')} style={({ pressed }) => [styles.emptyHero, pressed && styles.pressed]}>
      <Image resizeMode="cover" source={GAME_BACKGROUNDS.lol} style={styles.matchBackdrop} />
      <LinearGradient colors={['rgba(3,6,9,.35)', 'rgba(3,6,9,.98)']} end={{ x: .5, y: 1 }} start={{ x: .5, y: 0 }} style={StyleSheet.absoluteFill} />
      <Text style={styles.emptyKicker}>MATCH DU MOMENT</Text>
      <Text style={styles.emptyTitle}>LE CALME AVANT{`\n`}LA PROCHAINE AFFICHE.</Text>
      <Text style={styles.emptyCopy}>Aucun match futur n’est encore programmé. L’Arena se réactivera automatiquement.</Text>
      <View style={styles.emptyButton}><Text style={styles.emptyButtonText}>OUVRIR LES MATCHS →</Text></View>
    </Pressable>
  );
}

function HeroSkeleton() {
  return <View style={styles.skeleton}><View style={styles.skeletonLine} /><View style={styles.skeletonBig} /><View style={styles.skeletonLine} /></View>;
}

function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }
function openMatch(id: string) { router.push({ pathname: '/match/[id]', params: { id } }); }
function isLive(match: HubMatch) { return match.statut === 'en_cours' || new Date(match.debut).getTime() <= Date.now(); }
function matchActionLabel(match: HubMatch, prediction: HubPrediction | null) {
  if (isLive(match)) return 'SUIVRE LE LIVE';
  if (prediction) return 'OUVRIR MON CALL';
  return 'FAIRE MON CALL';
}
function formatSchedule(value: string) {
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (sameDay(date, today)) return `AUJ. ${time}`;
  if (sameDay(date, tomorrow)) return `DEM. ${time}`;
  return `${date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').toUpperCase()} ${time}`;
}
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function gameKey(game: string): HubGame {
  const key = String(game || '').toLowerCase();
  if (key.includes('valorant')) return 'valorant';
  if (key.includes('cs')) return 'cs2';
  return 'lol';
}
function gameName(game: string) {
  const key = gameKey(game);
  if (key === 'valorant') return 'Valorant';
  if (key === 'cs2') return 'CS2';
  return 'LoL';
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: layout.tabBarContentInset, gap: 18 },
  intro: { marginHorizontal: spacing.md, paddingTop: 3 },
  introTop: { minHeight: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  kickerRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  kickerLine: { width: 20, height: 2, borderRadius: 2, backgroundColor: colors.volt },
  kicker: { flex: 1, color: colors.volt, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.5 },
  seasonChip: { maxWidth: 142, minHeight: 25, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: '#11170F', borderWidth: 1, borderColor: '#344018' },
  seasonChipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.volt },
  seasonChipText: { flexShrink: 1, color: '#CDD79A', fontFamily: fonts.bold, fontSize: 8, letterSpacing: .7 },
  pageTitle: { marginTop: 11, color: colors.text, fontFamily: fonts.display, fontSize: 48, lineHeight: 43, letterSpacing: -1 },
  errorCard: { marginHorizontal: spacing.md, padding: 13, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  errorText: { flex: 1, color: '#FF9AA2', fontFamily: fonts.body, fontSize: 11 },
  retryText: { color: colors.volt, fontFamily: fonts.bold, fontSize: 8, letterSpacing: .8 },
  matchCard: { position: 'relative', minHeight: 338, marginHorizontal: spacing.md, padding: 13, overflow: 'hidden', borderRadius: 27, backgroundColor: '#0A0E12', borderWidth: 1, borderColor: '#36414C', boxShadow: '0 14px 32px rgba(0,0,0,.28)' },
  matchBackdrop: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  matchTop: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eventRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  eventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt, boxShadow: '0 0 7px rgba(224,255,59,.6)' },
  eventText: { flex: 1, color: '#D2D8DD', fontFamily: fonts.bold, fontSize: 8, letterSpacing: .7 },
  statePill: { minHeight: 29, paddingHorizontal: 10, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(5,8,11,.76)', borderWidth: 1, borderColor: '#3C4853' },
  stateDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.volt },
  stateText: { color: colors.volt, fontFamily: fonts.bold, fontSize: 8, letterSpacing: .8 },
  livePill: { borderColor: colors.liveBorder, backgroundColor: colors.liveSurface },
  liveDot: { backgroundColor: colors.live },
  liveText: { color: colors.liveText },
  matchPrompt: { zIndex: 2, alignItems: 'center', marginTop: 14 },
  matchPromptKicker: { color: '#C3CBD1', fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.4 },
  matchPromptTitle: { maxWidth: 320, marginTop: 4, color: colors.text, fontFamily: fonts.display, fontSize: 27, lineHeight: 27, letterSpacing: -.4, textAlign: 'center' },
  duel: { zIndex: 2, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  team: { flex: 1, minWidth: 0, alignItems: 'center' },
  teamTag: { marginTop: 6, fontFamily: fonts.bold, fontSize: 8, letterSpacing: .8 },
  teamName: { minHeight: 27, marginTop: 2, color: colors.text, fontFamily: fonts.bold, fontSize: 10, lineHeight: 13, textAlign: 'center' },
  vsBlock: { width: 58, alignItems: 'center' },
  bo: { color: colors.textSubtle, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.1 },
  vs: { marginTop: 7, color: colors.text, fontFamily: fonts.display, fontSize: 36, lineHeight: 37, letterSpacing: -1 },
  vsLine: { marginTop: 4, width: 24, height: 3, borderRadius: 2, backgroundColor: colors.volt },
  matchAction: { zIndex: 2, width: 222, minHeight: 47, marginTop: 19, paddingHorizontal: 16, alignSelf: 'center', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt, boxShadow: '0 8px 18px rgba(224,255,59,.18)' },
  matchActionLocked: { backgroundColor: 'rgba(8,12,15,.88)', borderWidth: 1, borderColor: '#51601F' },
  matchActionText: { color: '#07090B', fontFamily: fonts.bold, fontSize: 9, letterSpacing: .7 },
  matchActionTextLocked: { color: colors.text },
  coreCard: { position: 'relative', minHeight: 230, marginHorizontal: spacing.md, padding: 14, overflow: 'hidden', borderRadius: 25, borderWidth: 1, borderColor: '#303B27' },
  coreTop: { minHeight: 136, flexDirection: 'row', alignItems: 'center' },
  coreVisual: { width: 138, alignItems: 'center', justifyContent: 'center' },
  coreCopy: { flex: 1, minWidth: 0, paddingLeft: 5 },
  coreKicker: { color: colors.volt, fontFamily: fonts.bold, fontSize: 8, letterSpacing: .8 },
  coreRating: { marginTop: 7, color: colors.text, fontFamily: fonts.display, fontSize: 45, lineHeight: 45, letterSpacing: -.4 },
  coreStatus: { alignSelf: 'flex-start', minHeight: 24, marginTop: 7, paddingHorizontal: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#151B0F', borderWidth: 1, borderColor: '#3F4A20' },
  coreStatusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.volt },
  coreStatusText: { color: '#D4E09E', fontFamily: fonts.bold, fontSize: 8, letterSpacing: .6 },
  corePeak: { marginTop: 8, color: colors.textMuted, fontFamily: fonts.medium, fontSize: 8, letterSpacing: .4 },
  coreMetrics: { minHeight: 62, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#212A24', flexDirection: 'row', alignItems: 'center' },
  coreMetric: { flex: 1, alignItems: 'center' },
  coreMetricValue: { color: colors.text, fontFamily: fonts.display, fontSize: 21 },
  coreMetricLabel: { marginTop: 2, color: colors.textMuted, fontFamily: fonts.bold, fontSize: 8, letterSpacing: .7 },
  coreMetricDivider: { width: 1, height: 28, backgroundColor: '#2A342B' },
  upNextSection: { gap: 10 },
  sectionHead: { marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionKicker: { color: colors.volt, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.1 },
  sectionTitle: { marginTop: 3, color: colors.text, fontFamily: fonts.display, fontSize: 24, lineHeight: 25 },
  sectionLink: { color: colors.volt, fontFamily: fonts.bold, fontSize: 8, letterSpacing: .5 },
  upNextRail: { paddingHorizontal: spacing.md, gap: 10 },
  upNextCard: { position: 'relative', width: 232, minHeight: 154, padding: 13, overflow: 'hidden', borderRadius: 21, backgroundColor: '#090D11', borderWidth: 1, borderColor: '#2B363F' },
  upNextBackdrop: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  upNextTop: { zIndex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  upNextWhen: { color: colors.volt, fontFamily: fonts.bold, fontSize: 8, letterSpacing: .6 },
  upNextGame: { color: colors.textSubtle, fontFamily: fonts.bold, fontSize: 8 },
  upNextEvent: { zIndex: 1, marginTop: 9, color: '#B2BAC1', fontFamily: fonts.medium, fontSize: 8 },
  upNextDuel: { zIndex: 1, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  upNextTag: { flex: 1, color: colors.text, fontFamily: fonts.display, fontSize: 24, textAlign: 'center' },
  upNextVs: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 8 },
  upNextFooter: { zIndex: 1, marginTop: 'auto', paddingTop: 9, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.09)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upNextFormat: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 8, letterSpacing: .7 },
  upNextArrow: { color: colors.volt, fontFamily: fonts.display, fontSize: 17 },
  missionCard: { minHeight: 100, marginHorizontal: spacing.md, padding: 14, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0B1014', borderWidth: 1, borderColor: '#303A22' },
  missionIcon: { width: 51, height: 51, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E', borderWidth: 1, borderColor: '#46531E' },
  missionIconText: { color: colors.volt, fontFamily: fonts.display, fontSize: 29, lineHeight: 31 },
  missionCopy: { flex: 1, minWidth: 0 },
  missionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  missionKicker: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 8, letterSpacing: .8 },
  missionCount: { color: colors.volt, fontFamily: fonts.bold, fontSize: 8 },
  missionTitle: { marginTop: 5, color: colors.text, fontFamily: fonts.display, fontSize: 21, lineHeight: 22 },
  missionTrack: { height: 5, marginTop: 10, overflow: 'hidden', borderRadius: 3, backgroundColor: '#20272B' },
  missionProgress: { height: '100%', borderRadius: 3, backgroundColor: colors.volt, boxShadow: '0 0 7px rgba(224,255,59,.35)' },
  missionArrow: { color: colors.volt, fontFamily: fonts.display, fontSize: 19 },
  emptyHero: { position: 'relative', minHeight: 310, marginHorizontal: spacing.md, padding: 20, overflow: 'hidden', justifyContent: 'flex-end', borderRadius: 28, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#2B343E' },
  emptyKicker: { zIndex: 1, color: colors.volt, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.3 },
  emptyTitle: { zIndex: 1, marginTop: 8, color: colors.text, fontFamily: fonts.display, fontSize: 33, lineHeight: 31 },
  emptyCopy: { zIndex: 1, maxWidth: 330, marginTop: 9, color: '#A2ABB2', fontFamily: fonts.body, fontSize: 10, lineHeight: 15 },
  emptyButton: { zIndex: 1, alignSelf: 'flex-start', minHeight: 40, marginTop: 15, paddingHorizontal: 14, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  emptyButtonText: { color: '#080A0C', fontFamily: fonts.bold, fontSize: 8, letterSpacing: .8 },
  skeleton: { minHeight: 398, marginHorizontal: spacing.md, padding: 18, justifyContent: 'space-between', borderRadius: 28, backgroundColor: '#0D1218', borderWidth: 1, borderColor: colors.border },
  skeletonLine: { width: '60%', height: 10, borderRadius: 5, backgroundColor: '#171E26' },
  skeletonBig: { width: '72%', height: 150, borderRadius: 28, alignSelf: 'center', backgroundColor: '#151C24' },
  pressed: { opacity: .78 },
});
