import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { loadDuels } from '@/src/features/social/duels/api';
import type { DuelRow, DuelStatus } from '@/src/features/social/duels/types';
import { loadCommunityData } from '@/src/features/social/faction/api';
import type { CommunityData, CommunityFaction, CommunityMe } from '@/src/features/social/faction/types';
import { factionProgress, gameLabel } from '@/src/features/social/faction/utils';
import { loadFriends } from '@/src/features/social/friends/api';
import type { FriendsData } from '@/src/features/social/friends/types';
import { loadLeagues } from '@/src/features/social/leagues/api';
import type { LeagueSummary } from '@/src/features/social/leagues/types';
import { loadFriendQuests } from '@/src/features/social/missions/api';
import type { FriendQuest, FriendQuestsData } from '@/src/features/social/missions/types';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/src/theme';

const EMPTY_FRIENDS: FriendsData = { amis: [], recues: [], envoyees: [] };
const EMPTY_MISSIONS: FriendQuestsData = { actives: [], historique: [], duos: [], a_reveler: null };
const EMPTY_COMMUNITY: CommunityData = { factions: [], moi: null };
const RELIC_SOURCE = require('../../../../assets/social/faction-relic-v5.png');

export type SocialSnapshot = {
  community: CommunityData;
  duels: DuelRow[];
  friends: FriendsData;
  leagues: LeagueSummary[];
  missions: FriendQuestsData;
};

type SocialDomain = keyof SocialSnapshot;
export type SocialAvailability = Record<SocialDomain, boolean>;
type SocialRoute =
  | '/(tabs)/social/friends'
  | '/(tabs)/social/missions'
  | '/(tabs)/social/leagues'
  | '/(tabs)/social/duels'
  | '/(tabs)/social/faction'
  | '/(tabs)/matches';

type SocialAction = {
  eyebrow: string;
  glyph: string;
  href: SocialRoute;
  id: string;
  meta: string;
  title: string;
};

type PriorityAction = {
  action: string;
  eyebrow: string;
  glyph: string;
  href: SocialRoute;
  meta: string;
  sourceId: string | null;
  title: string;
};

type SocialHomeExperienceProps = {
  availability: SocialAvailability;
  data: SocialSnapshot;
  error: string | null;
  favoriteTeamId?: string | null;
  loading: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  refreshing: boolean;
};

const EMPTY: SocialSnapshot = {
  community: EMPTY_COMMUNITY,
  duels: [],
  friends: EMPTY_FRIENDS,
  leagues: [],
  missions: EMPTY_MISSIONS,
};

const ALL_AVAILABLE: SocialAvailability = {
  community: true,
  duels: true,
  friends: true,
  leagues: true,
  missions: true,
};

const STARTER_STEPS: Array<{ href: SocialRoute; meta: string; number: string; title: string }> = [
  { number: '01', title: 'Trouve un joueur', meta: 'Un pseudo suffit pour ouvrir ton cercle.', href: '/(tabs)/social/friends' },
  { number: '02', title: 'Porte tes couleurs', meta: 'Choisis la faction qui te représente.', href: '/(tabs)/social/faction' },
  { number: '03', title: 'Provoque un duel', meta: 'Pose ton call puis défie le camp opposé.', href: '/(tabs)/matches' },
];

type RelicBubbleSpec = {
  bottom: number;
  id: string;
  left?: number;
  right?: number;
  size: number;
};

const RELIC_BUBBLES: RelicBubbleSpec[] = [
  { id: 'bubble-a', size: 11, left: 28, bottom: 8 },
  { id: 'bubble-b', size: 8, right: 25, bottom: 20 },
  { id: 'bubble-c', size: 7, left: 20, bottom: 36 },
  { id: 'bubble-d', size: 10, right: 16, bottom: 49 },
  { id: 'bubble-e', size: 6, left: 45, bottom: 56 },
  { id: 'bubble-f', size: 8, right: 39, bottom: 72 },
];

export default function SocialHomeScreen() {
  const { profile } = useAuth();
  const [data, setData] = useState<SocialSnapshot>(EMPTY);
  const [availability, setAvailability] = useState<SocialAvailability>(ALL_AVAILABLE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (refresh = false) => {
    const requestId = ++requestRef.current;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    const [friends, leagues, missions, duels, community] = await Promise.allSettled([
      loadFriends(),
      loadLeagues(),
      loadFriendQuests(),
      loadDuels(12),
      loadCommunityData(),
    ]);

    if (requestId !== requestRef.current) return;

    const nextAvailability = {
      friends: friends.status === 'fulfilled',
      leagues: leagues.status === 'fulfilled',
      missions: missions.status === 'fulfilled',
      duels: duels.status === 'fulfilled',
      community: community.status === 'fulfilled',
    };
    const failed = Object.values(nextAvailability).filter((available) => !available).length;

    setAvailability(nextAvailability);
    setData({
      friends: friends.status === 'fulfilled' ? friends.value : EMPTY_FRIENDS,
      leagues: leagues.status === 'fulfilled' ? leagues.value : [],
      missions: missions.status === 'fulfilled' ? missions.value : EMPTY_MISSIONS,
      duels: duels.status === 'fulfilled' ? duels.value : [],
      community: community.status === 'fulfilled' ? community.value : EMPTY_COMMUNITY,
    });
    setError(
      failed === 5
        ? 'Impossible de charger ton QG Social.'
        : failed
          ? `${failed} espace${failed > 1 ? 's sont' : ' est'} momentanément indisponible${failed > 1 ? 's' : ''}.`
          : null,
    );
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  return (
    <SocialHomeExperience
      availability={availability}
      data={data}
      error={error}
      favoriteTeamId={profile?.equipe_favorite_id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      onRetry={() => void load()}
    />
  );
}

export function SocialHomeExperience({
  availability,
  data,
  error,
  favoriteTeamId,
  loading,
  onRefresh,
  onRetry,
  refreshing,
}: SocialHomeExperienceProps) {
  const reduceMotion = useReducedMotion();
  const activeDuels = useMemo(() => data.duels.filter((duel) => isActiveDuel(duel)), [data.duels]);
  const faction = useMemo(
    () => data.community.factions.find((item) => item.moi)
      ?? data.community.factions.find((item) => item.equipe_id === favoriteTeamId)
      ?? null,
    [data.community.factions, favoriteTeamId],
  );
  const priority = getPriority(data, activeDuels);
  const actions = buildActions(data, activeDuels);
  const secondarySignals = actions.filter((action) => action.id !== priority.sourceId).slice(0, 3);
  const entrance = (delay: number) => reduceMotion ? undefined : FadeInDown.delay(delay).duration(380);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.volt} />}
    >
      {error ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry}><Text style={styles.retry}>RÉESSAYER</Text></Pressable>
        </View>
      ) : null}

      <Animated.View entering={entrance(20)}>
        {loading ? (
          <FactionHeroSkeleton />
        ) : (
          <FactionRelicHero
            faction={faction}
            me={data.community.moi}
          />
        )}
      </Animated.View>

      <Animated.View entering={entrance(90)}>
        <PriorityCard priority={priority} />
      </Animated.View>

      <Animated.View entering={entrance(150)} style={styles.metrics}>
        <SocialMetric available={availability.friends} href="/(tabs)/social/friends" label="AMIS" loading={loading} value={data.friends.amis.length} featured />
        <SocialMetric available={availability.missions} href="/(tabs)/social/missions" label="MISSIONS" loading={loading} value={data.missions.actives.length} />
        <SocialMetric available={availability.leagues} href="/(tabs)/social/leagues" label="LIGUES" loading={loading} value={data.leagues.length} />
        <SocialMetric available={availability.duels} href="/(tabs)/social/duels" label="DUELS" loading={loading} value={activeDuels.length} />
      </Animated.View>

      <Animated.View entering={entrance(210)} style={styles.section}>
        <SectionHead meta={secondarySignals.length ? `${secondarySignals.length} ACTIF${secondarySignals.length > 1 ? 'S' : ''}` : 'QG SYNCHRONISÉ'} title="SIGNAUX DU CERCLE" />
        {secondarySignals.length ? (
          <View style={styles.signalList}>
            {secondarySignals.map((action) => <SignalRow action={action} key={action.id} />)}
          </View>
        ) : (
          <View style={styles.quietCard}>
            <View style={styles.quietPulse}><View style={styles.quietPulseCore} /></View>
            <View style={styles.quietCopy}><Text style={styles.quietTitle}>TON QG EST À JOUR.</Text><Text style={styles.quietMeta}>Les nouvelles demandes, missions et rivalités apparaîtront ici.</Text></View>
          </View>
        )}
      </Animated.View>

      {!loading && allDomainsAvailable(availability) && !hasSocialFootprint(data) ? <StarterPath /> : null}
    </ScrollView>
  );
}

function FactionRelicHero({ faction, me }: { faction: CommunityFaction | null; me: CommunityMe | null }) {
  const reduceMotion = useReducedMotion();
  const [relicFocused, setRelicFocused] = useState(false);
  const float = useSharedValue(0);
  const instability = useSharedValue(0);
  const boil = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(float);
      cancelAnimation(instability);
      cancelAnimation(boil);
      float.value = 0;
      instability.value = 0;
      boil.value = 0;
      return undefined;
    }
    float.value = withRepeat(
      withTiming(1, { duration: 4800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(float);
      cancelAnimation(instability);
      cancelAnimation(boil);
    };
  }, [boil, float, instability, reduceMotion]);

  const awakenRelic = useCallback(() => {
    cancelAnimation(instability);
    cancelAnimation(boil);

    if (reduceMotion) {
      instability.value = instability.value === 0 ? 1 : 0;
      boil.value = 0;
      return;
    }

    instability.value = 0;
    boil.value = 0;
    instability.value = withSequence(
      withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
      withTiming(-0.85, { duration: 210 }),
      withTiming(0.7, { duration: 200 }),
      withTiming(-0.55, { duration: 190 }),
      withTiming(0.4, { duration: 180 }),
      withTiming(-0.25, { duration: 160 }),
      withTiming(0, { duration: 1000, easing: Easing.out(Easing.quad) }),
    );
    boil.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }),
      2,
      false,
    );
  }, [boil, instability, reduceMotion]);

  const relicMotion = useAnimatedStyle(() => ({
    opacity: 0.42 + Math.min(1, Math.abs(instability.value)) * 0.58,
    transform: [
      { perspective: 900 },
      { translateX: instability.value * 1.8 },
      { translateY: -3 + float.value * 6 },
      { rotateZ: `${-0.45 + float.value * 0.9 + instability.value * 0.35}deg` },
    ],
  }));
  const corePulse = useAnimatedStyle(() => ({
    opacity: 0.04 + Math.min(1, Math.abs(instability.value)) * 0.9,
    transform: [{ scale: 0.72 + Math.min(1, Math.abs(instability.value)) * 0.52 }],
  }));
  const interiorDarkness = useAnimatedStyle(() => ({
    opacity: 0.82 - Math.min(1, Math.abs(instability.value)) * 0.68,
  }));
  const bubbleMotion = useAnimatedStyle(() => ({
    opacity: Math.sin(boil.value * Math.PI) * 0.88,
    transform: [
      { translateY: boil.value * -50 },
      { scale: 0.55 + boil.value * 0.6 },
    ],
  }));
  const progress = faction ? factionProgress(faction.membres, faction.niveau_atteint) : null;
  const pct = progress ? Math.round(progress.progress * 100) : 0;
  const title = faction ? 'PORTE TES COULEURS.' : 'CHOISIS TES COULEURS.';
  const action = faction ? 'OUVRIR MA FACTION' : 'DÉCOUVRIR LES FACTIONS';

  return (
    <View style={styles.factionHero}>
      <LinearGradient colors={['#121912', '#080D11', '#06090C']} end={{ x: .8, y: 1 }} start={{ x: .1, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={styles.heroAura} />
      <View style={styles.heroAuraCold} />
      <View style={styles.heroGridLineA} />
      <View style={styles.heroGridLineB} />

      <View style={styles.heroTop}>
        <View>
          <Text style={styles.heroEyebrow}>QG SOCIAL // FACTION</Text>
          <Text style={styles.heroTitle}>{title}</Text>
        </View>
        <View style={styles.levelPill}>
          <View style={styles.levelDot} />
          <Text style={styles.levelText}>{progress ? `FORME ${progress.current.code}` : 'NON LIÉE'}</Text>
        </View>
      </View>

      <Pressable
        accessibilityHint="Déclenche une brève réaction du liquide"
        accessibilityLabel="Réveiller le cœur de la Fiole"
        accessibilityRole="button"
        onBlur={() => setRelicFocused(false)}
        onFocus={() => setRelicFocused(true)}
        onPress={awakenRelic}
        style={({ pressed }) => [styles.relicStage, relicFocused && styles.relicStageFocused, pressed && styles.relicStagePressed]}
      >
        <Animated.View style={[styles.relicCoreGlow, corePulse]} />
        <View pointerEvents="none" style={styles.bubbleField}>
          {RELIC_BUBBLES.map((bubble) => (
            <Animated.View
              key={bubble.id}
              style={[
                styles.relicBubble,
                {
                  width: bubble.size,
                  height: bubble.size,
                  left: bubble.left,
                  right: bubble.right,
                  bottom: bubble.bottom,
                  borderRadius: bubble.size / 2,
                },
                bubbleMotion,
              ]}
            >
              <LinearGradient
                colors={['rgba(255,250,225,.72)', 'rgba(223,165,66,.15)', 'rgba(30,13,5,.34)']}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.relicBubbleHighlight} />
              <View style={styles.relicBubbleDepth} />
            </Animated.View>
          ))}
        </View>
        <Animated.Image resizeMode="contain" source={RELIC_SOURCE} style={[styles.relicImage, relicMotion]} />
        <Animated.View pointerEvents="none" style={[styles.relicInteriorShade, interiorDarkness]}>
          <LinearGradient
            colors={['rgba(0,0,0,.04)', 'rgba(0,0,0,.72)', 'rgba(0,0,0,.04)']}
            end={{ x: 1, y: 0.5 }}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(0,0,0,.02)', 'rgba(0,0,0,.42)', 'rgba(0,0,0,.02)']}
            end={{ x: 0.5, y: 1 }}
            locations={[0, 0.54, 1]}
            start={{ x: 0.5, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View pointerEvents="none" style={styles.relicHint}>
          <View style={styles.relicHintDot} />
          <Text style={styles.relicHintText}>TOUCHE POUR RÉVEILLER LE CŒUR</Text>
        </View>
      </Pressable>

      <View style={styles.factionIdentity}>
        <View style={styles.factionSeal}>
          {faction ? (
            <TeamLogo accent={colors.volt} name={faction.nom} size={38} tag={faction.tag} uri={faction.logo} />
          ) : (
            <Text style={styles.relicQuestion}>?</Text>
          )}
        </View>
        <View style={styles.factionIdentityCopy}>
          <Text style={styles.factionName}>{faction?.nom.toUpperCase() ?? 'AUCUNE FACTION'}</Text>
          <Text style={styles.factionMeta}>{faction ? `${gameLabel(faction.jeu)} · ${formatNumber(faction.membres)} MEMBRE${faction.membres > 1 ? 'S' : ''}` : 'UNE RELIQUE ATTEND TES COULEURS'}</Text>
        </View>
        {faction ? <Text style={styles.factionGrowth}>{signed(faction.croissance_7j)} · 7J</Text> : null}
      </View>

      {faction && progress ? (
        <View style={styles.progressBlock}>
          <View style={styles.relicState}>
            <Text style={styles.relicForm}>{progress.current.name.toUpperCase()}</Text>
            <Text numberOfLines={1} style={styles.relicPhrase}>{progress.current.phrase}</Text>
          </View>
          <View style={styles.progressHeadline}>
            <Text style={styles.progressLabel}>CHARGE COLLECTIVE</Text>
            <Text style={styles.progressValue}>{formatNumber(faction.membres)} / {formatNumber(progress.objective)}</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress.max ? 100 : pct}%` }]} /></View>
          <View style={styles.progressFoot}>
            <Text style={styles.progressNext}>{progress.max ? 'FORME TERMINALE' : `PROCHAINE MUTATION · ${progress.next?.name.toUpperCase() ?? 'OCÉAN SATURÉ'}`}</Text>
            {me ? <Text style={styles.progressImpact}>{me.pronos_7j} CALL{me.pronos_7j > 1 ? 'S' : ''} · 7J</Text> : null}
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel={faction ? `Ouvrir ma faction ${faction.nom}` : 'Découvrir les factions'}
        accessibilityRole="button"
        onPress={() => router.replace('/(tabs)/social/faction')}
        style={({ pressed }) => [styles.heroAction, pressed && styles.pressed]}
      >
        <Text style={styles.heroActionText}>{action}</Text>
        <Text style={styles.heroActionArrow}>→</Text>
      </Pressable>
    </View>
  );
}

function PriorityCard({ priority }: { priority: PriorityAction }) {
  return (
    <Pressable
      accessibilityLabel={`${priority.eyebrow}. ${priority.title}`}
      accessibilityRole="button"
      onPress={() => router.replace(priority.href as never)}
      style={({ pressed }) => [styles.priorityCard, pressed && styles.pressed]}
    >
      <View style={styles.priorityGlyph}><Text style={styles.priorityGlyphText}>{priority.glyph}</Text></View>
      <View style={styles.priorityCopy}>
        <Text style={styles.priorityEyebrow}>À TON TOUR · {priority.eyebrow}</Text>
        <Text numberOfLines={2} style={styles.priorityTitle}>{priority.title}</Text>
        <Text numberOfLines={1} style={styles.priorityMeta}>{priority.meta}</Text>
      </View>
      <View style={styles.priorityAction}><Text style={styles.priorityActionText}>{priority.action}</Text><Text style={styles.priorityArrow}>→</Text></View>
    </Pressable>
  );
}

function SocialMetric({ available, featured = false, href, label, loading, value }: { available: boolean; featured?: boolean; href: SocialRoute; label: string; loading: boolean; value: number }) {
  return (
    <Pressable accessibilityLabel={`${label.toLowerCase()} : ${metric(loading, available, value)}`} accessibilityRole="button" onPress={() => router.replace(href as never)} style={({ pressed }) => [styles.metric, featured && styles.metricFeatured, pressed && styles.pressed]}>
      <Text style={[styles.metricValue, featured && styles.metricValueFeatured]}>{metric(loading, available, value)}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Pressable>
  );
}

function SectionHead({ meta, title }: { meta: string; title: string }) {
  return <View style={styles.sectionHead}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionMeta}>{meta}</Text></View>;
}

function SignalRow({ action }: { action: SocialAction }) {
  return (
    <Pressable accessibilityLabel={`${action.eyebrow}. ${action.title}`} accessibilityRole="button" onPress={() => router.replace(action.href as never)} style={({ pressed }) => [styles.signalRow, pressed && styles.pressed]}>
      <View style={styles.signalGlyph}><Text style={styles.signalGlyphText}>{action.glyph}</Text></View>
      <View style={styles.signalCopy}><Text style={styles.signalEyebrow}>{action.eyebrow}</Text><Text numberOfLines={1} style={styles.signalTitle}>{action.title}</Text><Text style={styles.signalMeta}>{action.meta}</Text></View>
      <Text style={styles.signalArrow}>›</Text>
    </Pressable>
  );
}

function StarterPath() {
  return (
    <View style={styles.starter}>
      <Text style={styles.starterEyebrow}>LANCER TON QG</Text>
      <Text style={styles.starterTitle}>TROIS MOVES. UNE PREMIÈRE RIVALITÉ.</Text>
      <View style={styles.starterList}>
        {STARTER_STEPS.map((step) => (
          <Pressable accessibilityRole="button" key={step.number} onPress={() => router.replace(step.href as never)} style={({ pressed }) => [styles.starterRow, pressed && styles.pressed]}>
            <Text style={styles.starterNumber}>{step.number}</Text>
            <View style={styles.starterCopy}><Text style={styles.starterStep}>{step.title}</Text><Text style={styles.starterMeta}>{step.meta}</Text></View>
            <Text style={styles.starterArrow}>→</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function FactionHeroSkeleton() {
  return <View style={styles.heroSkeleton}><View style={styles.skeletonTitle} /><View style={styles.skeletonRelic} /><View style={styles.skeletonLine} /></View>;
}

function getPriority(data: SocialSnapshot, activeDuels: DuelRow[]): PriorityAction {
  const incoming = data.friends.recues[0];
  const revealable = data.missions.a_reveler;
  const duel = activeDuels.find((item) => effectiveDuelStatus(item) === 'accepte') ?? activeDuels[0];
  const mission = data.missions.actives[0];
  if (incoming) return { sourceId: `friend-${incoming.id}`, glyph: '◎', eyebrow: 'DEMANDE EN ATTENTE', title: `${incoming.pseudo} veut rejoindre ton cercle.`, meta: 'Réponds maintenant pour débloquer vos prochains moves.', action: 'RÉPONDRE', href: '/(tabs)/social/friends' };
  if (revealable) return { sourceId: `reveal-${revealable.id}`, glyph: '⚡', eyebrow: 'MISSION À RÉVÉLER', title: 'Un résultat social attend ton verdict.', meta: questPartnerLabel(revealable), action: 'DÉCOUVRIR', href: '/(tabs)/social/missions' };
  if (duel) return { sourceId: `duel-${duel.token}`, glyph: '⚔', eyebrow: effectiveDuelStatus(duel) === 'accepte' ? 'DUEL VERROUILLÉ' : 'RIVALITÉ OUVERTE', title: `Ton face-à-face avec ${duelRival(duel)} est lancé.`, meta: duelMatchLabel(duel), action: 'VOIR', href: '/(tabs)/social/duels' };
  if (mission) return { sourceId: `mission-${mission.id}`, glyph: '⚡', eyebrow: 'MISSION ACTIVE', title: 'Quelqu’un compte sur ton prochain call.', meta: questPartnerLabel(mission), action: 'CONTINUER', href: '/(tabs)/social/missions' };
  return { sourceId: null, glyph: '◎', eyebrow: 'PROCHAIN MOVE', title: 'Agrandis ton cercle pour créer de nouvelles rivalités.', meta: 'Trouve un joueur et lance votre premier défi.', action: 'TROUVER', href: '/(tabs)/social/friends' };
}

function buildActions(data: SocialSnapshot, activeDuels: DuelRow[]): SocialAction[] {
  const actions: SocialAction[] = [];
  data.friends.recues.slice(0, 2).forEach((friend) => actions.push({ id: `friend-${friend.id}`, glyph: '◎', eyebrow: 'DEMANDE', title: `${friend.pseudo} veut rejoindre ton cercle.`, meta: 'Accepter ou refuser', href: '/(tabs)/social/friends' }));
  if (data.missions.a_reveler) actions.push({ id: `reveal-${data.missions.a_reveler.id}`, glyph: '⚡', eyebrow: 'À RÉVÉLER', title: 'Le résultat de ta mission est prêt.', meta: questPartnerLabel(data.missions.a_reveler), href: '/(tabs)/social/missions' });
  data.missions.actives.slice(0, 1).forEach((quest) => actions.push({ id: `mission-${quest.id}`, glyph: '⚡', eyebrow: 'MISSION', title: questTitle(quest), meta: `${quest.progression}/${quest.objectif} · ${questPartnerLabel(quest)}`, href: '/(tabs)/social/missions' }));
  activeDuels.slice(0, 2).forEach((duel) => actions.push({ id: `duel-${duel.token}`, glyph: '⚔', eyebrow: effectiveDuelStatus(duel) === 'accepte' ? 'DUEL VERROUILLÉ' : 'DUEL EN ATTENTE', title: `Face à ${duelRival(duel)}`, meta: duelMatchLabel(duel), href: '/(tabs)/social/duels' }));
  return actions;
}

function metric(loading: boolean, available: boolean, value: number) { return loading ? '—' : available ? value : '!'; }
function effectiveDuelStatus(duel: DuelRow): DuelStatus { return duel.statut === 'en_attente' && duel.debut && new Date(duel.debut).getTime() <= Date.now() ? 'expire' : duel.statut; }
function isActiveDuel(duel: DuelRow) { const status = effectiveDuelStatus(duel); return status === 'en_attente' || status === 'accepte'; }
function duelRival(duel: DuelRow) { return duel.moi_role === 'createur' ? (duel.accepteur_pseudo || 'un rival') : (duel.createur_pseudo || 'ton rival'); }
function duelMatchLabel(duel: DuelRow) { return `${duel.tag_a || duel.equipe_a || 'A'} vs ${duel.tag_b || duel.equipe_b || 'B'}`; }
function questPartnerLabel(quest: FriendQuest) { return quest.partenaire?.pseudo ? `Avec ${quest.partenaire.pseudo}` : 'Mission à deux'; }
function questTitle(quest: FriendQuest) { if (quest.type === 'duel') return 'Termine votre duel.'; if (quest.type === 'revenge') return 'La revanche est ouverte.'; if (quest.type === 'league_push') return 'Poussez votre ligue ensemble.'; return 'Ton prochain call compte.'; }
function allDomainsAvailable(availability: SocialAvailability) { return Object.values(availability).every(Boolean); }
function hasSocialFootprint(data: SocialSnapshot) { return Boolean(data.friends.amis.length || data.friends.recues.length || data.friends.envoyees.length || data.leagues.length || data.missions.actives.length || data.missions.historique.length || data.duels.length || data.community.moi); }
function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(value); }
function signed(value: number) { return `${value >= 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 128, gap: 18 },
  error: { minHeight: 48, padding: 12, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' },
  errorText: { flex: 1, color: '#FF9AA2', fontFamily: fonts.body, fontSize: 11 },
  retry: { color: colors.volt, fontFamily: fonts.bold, fontSize: 8 },
  factionHero: { position: 'relative', minHeight: 610, overflow: 'hidden', padding: 17, borderRadius: 30, backgroundColor: '#0B100D', borderWidth: 1, borderColor: '#495720' },
  heroAura: { position: 'absolute', width: 330, height: 330, left: 48, top: 112, borderRadius: 165, backgroundColor: 'rgba(77,53,24,.07)', boxShadow: '0 0 84px rgba(182,116,42,.07)' },
  heroAuraCold: { position: 'absolute', width: 230, height: 300, left: -70, top: 130, borderRadius: 150, backgroundColor: 'rgba(32,91,104,.045)', boxShadow: '0 0 70px rgba(54,134,151,.06)' },
  heroGridLineA: { position: 'absolute', width: 520, height: 1, left: -60, top: 280, backgroundColor: 'rgba(232,255,61,.08)', transform: [{ rotate: '18deg' }] },
  heroGridLineB: { position: 'absolute', width: 520, height: 1, left: -60, top: 330, backgroundColor: 'rgba(232,255,61,.06)', transform: [{ rotate: '-15deg' }] },
  heroTop: { zIndex: 3, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  heroEyebrow: { color: colors.volt, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.6 },
  heroTitle: { maxWidth: 285, marginTop: 7, color: '#F7F8F4', fontFamily: fonts.display, fontSize: 42, lineHeight: 39, letterSpacing: -1.2 },
  levelPill: { minHeight: 30, paddingHorizontal: 10, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(6,10,12,.66)', borderWidth: 1, borderColor: '#3B461E' },
  levelDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt },
  levelText: { color: '#E6EAD8', fontFamily: fonts.bold, fontSize: 7, letterSpacing: .6 },
  relicStage: { zIndex: 2, height: 330, marginTop: 1, alignItems: 'center', justifyContent: 'center', outlineWidth: 0 },
  relicStageFocused: { outlineWidth: 1, outlineStyle: 'solid', outlineColor: 'rgba(164,113,51,.55)' },
  relicStagePressed: { transform: [{ scale: 0.992 }] },
  relicCoreGlow: { position: 'absolute', zIndex: 1, width: 70, height: 70, bottom: 31, borderRadius: 35, backgroundColor: 'rgba(255,193,44,.48)', boxShadow: '0 0 42px rgba(255,193,44,.72)' },
  relicImage: { zIndex: 2, width: 300, height: 316 },
  relicInteriorShade: { position: 'absolute', zIndex: 3, width: 150, height: 148, left: '50%', bottom: 42, overflow: 'hidden', borderRadius: 75, transform: [{ translateX: -75 }] },
  bubbleField: { position: 'absolute', zIndex: 4, width: 100, height: 98, left: '50%', bottom: 34, transform: [{ translateX: -50 }] },
  relicBubble: { position: 'absolute', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,235,190,.72)', backgroundColor: 'rgba(255,218,142,.08)', boxShadow: 'inset -2px -2px 4px rgba(40,14,4,.45), 0 0 9px rgba(255,198,58,.52)' },
  relicBubbleHighlight: { position: 'absolute', width: '30%', height: '30%', left: '17%', top: '14%', borderRadius: 99, backgroundColor: 'rgba(255,255,244,.88)' },
  relicBubbleDepth: { position: 'absolute', width: '45%', height: '45%', right: '8%', bottom: '7%', borderRadius: 99, backgroundColor: 'rgba(56,20,5,.24)' },
  relicHint: { position: 'absolute', zIndex: 6, minHeight: 24, bottom: 0, paddingHorizontal: 9, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(5,7,8,.86)', borderWidth: 1, borderColor: '#4A3922' },
  relicHintDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#D39A3F', boxShadow: '0 0 7px rgba(255,194,65,.5)' },
  relicHintText: { color: '#A98B61', fontFamily: fonts.bold, fontSize: 6, letterSpacing: .7 },
  relicQuestion: { color: colors.volt, fontFamily: fonts.display, fontSize: 22 },
  factionIdentity: { zIndex: 3, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 },
  factionSeal: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080B0D', borderWidth: 1, borderColor: '#44511F' },
  factionIdentityCopy: { flex: 1, minWidth: 0 },
  factionName: { color: '#F6F7F5', fontFamily: fonts.bold, fontSize: 13, letterSpacing: .25 },
  factionMeta: { marginTop: 4, color: '#8E998F', fontFamily: fonts.medium, fontSize: 8, letterSpacing: .25 },
  factionGrowth: { color: colors.volt, fontFamily: fonts.bold, fontSize: 9 },
  progressBlock: { zIndex: 3, marginTop: 11 },
  relicState: { marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  relicForm: { color: colors.volt, fontFamily: fonts.bold, fontSize: 7, letterSpacing: 1 },
  relicPhrase: { flex: 1, color: '#A8B0AA', fontFamily: fonts.medium, fontSize: 8, fontStyle: 'italic' },
  progressHeadline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: { color: '#89938B', fontFamily: fonts.bold, fontSize: 7, letterSpacing: .8 },
  progressValue: { color: '#F4F6F2', fontFamily: fonts.bold, fontSize: 8 },
  progressTrack: { height: 7, marginTop: 7, overflow: 'hidden', borderRadius: 4, backgroundColor: '#20271B' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.volt, boxShadow: '0 0 12px rgba(232,255,61,.44)' },
  progressFoot: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  progressNext: { color: '#68736D', fontFamily: fonts.bold, fontSize: 6, letterSpacing: .45 },
  progressImpact: { color: '#8E998F', fontFamily: fonts.bold, fontSize: 6 },
  heroAction: { zIndex: 3, minHeight: 42, marginTop: 'auto', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#34401C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroActionText: { color: colors.volt, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1 },
  heroActionArrow: { color: colors.volt, fontSize: 17 },
  priorityCard: { minHeight: 118, padding: 14, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#0E1412', borderWidth: 1, borderColor: '#3D4920' },
  priorityGlyph: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#19220F', borderWidth: 1, borderColor: '#4C5922' },
  priorityGlyphText: { color: colors.volt, fontSize: 19, fontWeight: '900' },
  priorityCopy: { flex: 1, minWidth: 0 },
  priorityEyebrow: { color: colors.volt, fontFamily: fonts.bold, fontSize: 7, letterSpacing: .75 },
  priorityTitle: { marginTop: 4, color: '#F4F6F5', fontFamily: fonts.bold, fontSize: 13, lineHeight: 16 },
  priorityMeta: { marginTop: 4, color: '#88938F', fontFamily: fonts.body, fontSize: 8 },
  priorityAction: { minWidth: 59, minHeight: 38, paddingHorizontal: 8, borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 1, backgroundColor: colors.volt },
  priorityActionText: { color: '#080B0C', fontFamily: fonts.bold, fontSize: 6, letterSpacing: .3 },
  priorityArrow: { color: '#080B0C', fontSize: 14, lineHeight: 14 },
  metrics: { flexDirection: 'row', gap: 7 },
  metric: { flex: 1, minHeight: 76, padding: 9, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#222B34' },
  metricFeatured: { backgroundColor: '#141B10', borderColor: '#424F1D' },
  metricValue: { color: '#F2F4F5', fontFamily: fonts.display, fontSize: 23, letterSpacing: -.4 },
  metricValueFeatured: { color: colors.volt },
  metricLabel: { marginTop: 4, color: '#78838D', fontFamily: fonts.bold, fontSize: 6, letterSpacing: .65 },
  section: { gap: 9 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { color: '#A7B0B7', fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.2 },
  sectionMeta: { color: '#59646E', fontFamily: fonts.bold, fontSize: 6, letterSpacing: .55 },
  signalList: { overflow: 'hidden', borderRadius: 21, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#222B34' },
  signalRow: { minHeight: 78, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#192129' },
  signalGlyph: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151D10', borderWidth: 1, borderColor: '#38431D' },
  signalGlyphText: { color: colors.volt, fontSize: 15 },
  signalCopy: { flex: 1, minWidth: 0 },
  signalEyebrow: { color: colors.volt, fontFamily: fonts.bold, fontSize: 6, letterSpacing: .8 },
  signalTitle: { marginTop: 3, color: '#F1F4F5', fontFamily: fonts.bold, fontSize: 11 },
  signalMeta: { marginTop: 4, color: '#76818B', fontFamily: fonts.body, fontSize: 8 },
  signalArrow: { color: colors.volt, fontSize: 16 },
  quietCard: { minHeight: 92, padding: 14, borderRadius: 21, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#222B34' },
  quietPulse: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3F4B1E', backgroundColor: '#141B10' },
  quietPulseCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.volt, boxShadow: '0 0 10px rgba(232,255,61,.5)' },
  quietCopy: { flex: 1 },
  quietTitle: { color: '#F2F4F5', fontFamily: fonts.bold, fontSize: 10, letterSpacing: .5 },
  quietMeta: { marginTop: 5, color: '#78838C', fontFamily: fonts.body, fontSize: 9, lineHeight: 13 },
  starter: { overflow: 'hidden', padding: 17, borderRadius: 26, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#28323B' },
  starterEyebrow: { color: colors.volt, fontFamily: fonts.bold, fontSize: 7, letterSpacing: 1.1 },
  starterTitle: { maxWidth: 330, marginTop: 7, color: colors.text, fontFamily: fonts.display, fontSize: 26, lineHeight: 25, letterSpacing: -.6 },
  starterList: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#222B32' },
  starterRow: { minHeight: 69, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#192129' },
  starterNumber: { width: 26, color: colors.volt, fontFamily: fonts.bold, fontSize: 8 },
  starterCopy: { flex: 1, minWidth: 0 },
  starterStep: { color: colors.text, fontFamily: fonts.bold, fontSize: 11 },
  starterMeta: { marginTop: 4, color: colors.textMuted, fontFamily: fonts.body, fontSize: 8, lineHeight: 12 },
  starterArrow: { color: colors.volt, fontSize: 15 },
  heroSkeleton: { minHeight: 610, padding: 18, borderRadius: 30, justifyContent: 'space-between', backgroundColor: '#0D1311', borderWidth: 1, borderColor: '#29321A' },
  skeletonTitle: { width: 220, height: 65, borderRadius: 17, backgroundColor: '#172016' },
  skeletonRelic: { width: 230, height: 230, alignSelf: 'center', borderRadius: 115, backgroundColor: '#151C18' },
  skeletonLine: { width: '100%', height: 58, borderRadius: 16, backgroundColor: '#151C18' },
  pressed: { opacity: .74 },
});
