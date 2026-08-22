import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import {
  CosmeticAvatar,
  relicSignatureTheme,
} from '@/src/features/shop/components/CosmeticRenderer';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import { loadCommunityData } from '@/src/features/social/faction/api';
import type {
  CommunityActivity,
  CommunityData,
  CommunityFaction,
  CommunityMe,
} from '@/src/features/social/faction/types';
import { factionProgress, gameLabel } from '@/src/features/social/faction/utils';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

const EMPTY_COMMUNITY: CommunityData = { factions: [], moi: null };
const RELIC_SOURCE = require('../../../../assets/social/faction-relic-v5.png');

type SocialHomeExperienceProps = {
  data: CommunityData;
  error: string | null;
  favoriteTeamId?: string | null;
  loading: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  refreshing: boolean;
};

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
  const [data, setData] = useState<CommunityData>(EMPTY_COMMUNITY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (refresh = false) => {
    const requestId = ++requestRef.current;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    try {
      const community = await loadCommunityData();
      if (requestId === requestRef.current) setData(community);
    } catch (caught) {
      if (requestId === requestRef.current) {
        setError(caught instanceof Error ? caught.message : 'Impossible de charger les factions.');
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  return (
    <SocialHomeExperience
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
  data,
  error,
  favoriteTeamId,
  loading,
  onRefresh,
  onRetry,
  refreshing,
}: SocialHomeExperienceProps) {
  const reduceMotion = useReducedMotion();
  const rankedFactions = useMemo(
    () => [...data.factions].sort((a, b) => (
      b.membres - a.membres
      || b.croissance_7j - a.croissance_7j
      || a.nom.localeCompare(b.nom)
    )),
    [data.factions],
  );
  const faction = useMemo(
    () => rankedFactions.find((item) => item.moi)
      ?? rankedFactions.find((item) => item.equipe_id === favoriteTeamId)
      ?? null,
    [favoriteTeamId, rankedFactions],
  );
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
        {loading ? <FactionHeroSkeleton /> : <FactionRelicHero faction={faction} me={data.moi} />}
      </Animated.View>

      {!loading && rankedFactions.length ? (
        <Animated.View entering={entrance(90)}>
          <FactionWar factions={rankedFactions} mine={faction} />
        </Animated.View>
      ) : null}

      {!loading && data.moi && faction ? (
        <Animated.View entering={entrance(150)}>
          <FactionMemberRanking faction={faction} me={data.moi} />
        </Animated.View>
      ) : null}

      {!loading && !rankedFactions.length ? <EmptyFactions /> : null}
    </ScrollView>
  );
}

function FactionRelicHero({ faction, me }: { faction: CommunityFaction | null; me: CommunityMe | null }) {
  const { equipped } = useCosmetics();
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
  const actionTitle = progress?.max
    ? 'LA RELIQUE A ATTEINT SA FORME ULTIME.'
    : `RALLIER ${formatNumber(progress?.remaining ?? 0)} SUPPORTER${(progress?.remaining ?? 0) > 1 ? 'S' : ''}.`;
  const actionCopy = progress?.max
    ? 'La puissance collective continue désormais d’alimenter le classement de la faction.'
    : progress?.next
      ? `À ${formatNumber(progress.objective)} membres, la relique mute en ${progress.next.name}. Chaque membre présent reçoit alors +${formatNumber(progress.next.reward)} Volts.`
      : '';
  const signature = relicSignatureTheme(equipped.factionEffect);
  const effectAccent = signature.accent;

  return (
    <View style={styles.factionHero}>
      <LinearGradient colors={['#121912', '#080D11', '#06090C']} end={{ x: .8, y: 1 }} start={{ x: .1, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.heroAura, { backgroundColor: signature.aura, boxShadow: signature.glow }]} />
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
        <Animated.View style={[styles.relicCoreGlow, corePulse, { backgroundColor: `${effectAccent}7A`, boxShadow: `0 0 42px ${effectAccent}B8` }]} />
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
        {faction ? (
          <View style={styles.factionGrowthBlock}>
            <Text style={styles.factionGrowth}>{signed(faction.croissance_7j)}</Text>
            <Text style={styles.factionGrowthLabel}>SUPPORTERS · 7J</Text>
          </View>
        ) : null}
      </View>

      {faction && progress ? (
        <View style={styles.progressBlock}>
          <View style={styles.relicState}>
            <Text style={styles.relicForm}>{progress.current.name.toUpperCase()}</Text>
            <Text numberOfLines={1} style={styles.relicPhrase}>{progress.current.phrase}</Text>
          </View>
          <View style={styles.progressHeadline}>
            <Text style={styles.progressLabel}>SUPPORTERS DE LA FACTION</Text>
            <Text style={styles.progressValue}>{formatNumber(faction.membres)} / {formatNumber(progress.objective)}</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress.max ? 100 : pct}%` }]} /></View>
          <View style={styles.progressFoot}>
            <Text style={styles.progressNext}>{progress.max ? 'FORME TERMINALE' : `PROCHAINE MUTATION · ${progress.next?.name.toUpperCase() ?? 'OCÉAN SATURÉ'}`}</Text>
            {me ? <Text style={styles.progressImpact}>TOI · {me.pronos_7j} CALL{me.pronos_7j > 1 ? 'S' : ''} · 7J</Text> : null}
          </View>
          <View style={styles.mutationGuide}>
            <View style={styles.mutationPreview}>
              <Text style={styles.mutationCode}>{progress.next?.code ?? '∞'}</Text>
              <Text numberOfLines={1} style={styles.mutationName}>{progress.next?.name.toUpperCase() ?? 'OCÉAN'}</Text>
            </View>
            <View style={styles.mutationCopy}>
              <Text style={styles.mutationEyebrow}>{progress.max ? 'ÉTAT ACTUEL' : 'À FAIRE MAINTENANT'}</Text>
              <Text style={styles.mutationTitle}>{actionTitle}</Text>
              <Text style={styles.mutationText}>{actionCopy}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.heroFooter}>
        <Text style={styles.heroFooterText}>LA GUERRE DES FACTIONS</Text>
        <Text style={styles.heroFooterArrow}>↓</Text>
      </View>
    </View>
  );
}

function FactionWar({ factions, mine }: { factions: CommunityFaction[]; mine: CommunityFaction | null }) {
  const mineRank = mine ? factions.findIndex((item) => item.equipe_id === mine.equipe_id) + 1 : 0;
  const visible = factions.slice(0, 6);
  const rows = mine && mineRank > 6 ? [...visible.slice(0, 5), mine] : visible;

  return (
    <View style={styles.warSection}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionEyebrow}>LA GUERRE DES FACTIONS</Text>
          <Text style={styles.sectionTitle}>QUI DOMINE LE TERRAIN ?</Text>
        </View>
        <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>24 H</Text></View>
      </View>
      <Text style={styles.sectionIntro}>La puissance suit le nombre de supporters. L’élan montre les renforts gagnés cette semaine.</Text>

      <View style={styles.warCard}>
        {rows.map((faction) => {
          const rank = factions.findIndex((item) => item.equipe_id === faction.equipe_id) + 1;
          const selected = faction.equipe_id === mine?.equipe_id;
          return (
            <View key={faction.equipe_id} style={[styles.warRow, selected && styles.warRowMine]}>
              <Text style={[styles.warRank, rank <= 3 && styles.warRankTop]}>#{rank}</Text>
              <View style={styles.warLogo}>
                <TeamLogo accent={selected ? colors.volt : '#66727D'} name={faction.nom} size={34} tag={faction.tag} uri={faction.logo} />
              </View>
              <View style={styles.warTeam}>
                <View style={styles.warNameLine}>
                  <Text numberOfLines={1} style={styles.warName}>{faction.nom}</Text>
                  {selected ? <View style={styles.minePill}><Text style={styles.minePillText}>MA FACTION</Text></View> : null}
                </View>
                <Text style={styles.warMeta}>{gameLabel(faction.jeu)} · {factionProgress(faction.membres, faction.niveau_atteint).current.name}</Text>
              </View>
              <View style={styles.warScore}>
                <Text style={styles.warMembers}>{formatNumber(faction.membres)}</Text>
                <Text style={[styles.warGrowth, faction.croissance_7j > 0 && styles.warGrowthPositive]}>{signed(faction.croissance_7j)} EN 7 J</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function FactionMemberRanking({ faction, me }: { faction: CommunityFaction; me: CommunityMe }) {
  const { equipped } = useCosmetics();
  const ranking = me.top_activite.length ? me.top_activite : [fallbackActivity(me)];
  const placement = me.rang_activite && me.total_activite
    ? `#${me.rang_activite} SUR ${me.total_activite}`
    : 'EN PLACEMENT';

  return (
    <View style={styles.memberSection}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionEyebrow}>DANS TA FACTION</Text>
          <Text style={styles.sectionTitle}>TON CLASSEMENT {faction.tag}</Text>
        </View>
        <Text style={styles.memberPlacement}>{placement}</Text>
      </View>

      <View style={styles.memberSummary}>
        <View style={styles.memberRankBlock}>
          <Text style={styles.memberRankValue}>{me.rang_activite ? `#${me.rang_activite}` : '—'}</Text>
          <Text style={styles.memberRankLabel}>RANG INTERNE</Text>
        </View>
        <View style={styles.memberDivider} />
        <MemberStat label="CALLS · 7J" value={String(me.pronos_7j)} />
        <MemberStat label="VALIDÉS" value={String(me.gagnes_7j)} />
        <MemberStat label="FRAGS · 7J" value={signed(me.delta_frags_7j)} featured />
      </View>

      <View style={styles.memberList}>
        {ranking.slice(0, 5).map((person) => (
          <FactionMemberRow cosmetics={equipped} key={person.user_id} person={person} mine={person.user_id === me.user_id} />
        ))}
      </View>
    </View>
  );
}

function MemberStat({ featured = false, label, value }: { featured?: boolean; label: string; value: string }) {
  return (
    <View style={styles.memberStat}>
      <Text style={[styles.memberStatValue, featured && styles.memberStatValueFeatured]}>{value}</Text>
      <Text style={styles.memberStatLabel}>{label}</Text>
    </View>
  );
}

function FactionMemberRow({ cosmetics, mine, person }: { cosmetics: EquippedCosmetics; mine: boolean; person: CommunityActivity }) {
  return (
    <View style={[styles.memberRow, mine && styles.memberRowMine]}>
      <Text style={[styles.memberRowRank, mine && styles.memberRowRankMine]}>#{person.rang}</Text>
      {mine
        ? <CosmeticAvatar cosmetics={cosmetics} label={person.pseudo} size={42} />
        : <View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{initials(person.pseudo)}</Text></View>}
      <View style={styles.memberCopy}>
        <Text numberOfLines={1} style={styles.memberName}>{person.pseudo}{mine ? ' · TOI' : ''}</Text>
        <Text style={styles.memberMeta}>{person.pronos_7j} call{person.pronos_7j > 1 ? 's' : ''} · {person.gagnes_7j} validé{person.gagnes_7j > 1 ? 's' : ''}</Text>
      </View>
      <Text style={styles.memberPrecision}>{person.pronos_7j ? `${Math.round((person.gagnes_7j / person.pronos_7j) * 100)}%` : '—'}</Text>
    </View>
  );
}

function EmptyFactions() {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyMark}>✦</Text>
      <Text style={styles.emptyTitle}>LA GUERRE N’A PAS ENCORE COMMENCÉ.</Text>
      <Text style={styles.emptyText}>Les factions et leur classement apparaîtront ici dès que les premières équipes seront actives.</Text>
    </View>
  );
}

function FactionHeroSkeleton() {
  return <View style={styles.heroSkeleton}><View style={styles.skeletonTitle} /><View style={styles.skeletonRelic} /><View style={styles.skeletonLine} /></View>;
}

function fallbackActivity(me: CommunityMe): CommunityActivity {
  return {
    user_id: me.user_id,
    pseudo: me.pseudo,
    pronos_7j: me.pronos_7j,
    gagnes_7j: me.gagnes_7j,
    rang: me.rang_activite ?? 1,
  };
}

function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(value); }
function signed(value: number) { return `${value >= 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`; }
function initials(value: string) {
  const parts = value.trim().split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: layout.tabBarContentInset, gap: 22 },
  error: { minHeight: 48, padding: 12, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' },
  errorText: { ...typography.body, flex: 1, color: '#FF9AA2' },
  retry: { ...typography.action, color: colors.volt },
  factionHero: { position: 'relative', minHeight: 790, overflow: 'hidden', padding: 17, borderRadius: 30, backgroundColor: '#0B100D', borderWidth: 1, borderColor: '#495720' },
  heroAura: { position: 'absolute', width: 330, height: 330, left: 48, top: 112, borderRadius: 165, backgroundColor: 'rgba(77,53,24,.07)', boxShadow: '0 0 84px rgba(182,116,42,.07)' },
  heroAuraCold: { position: 'absolute', width: 230, height: 300, left: -70, top: 130, borderRadius: 150, backgroundColor: 'rgba(32,91,104,.045)', boxShadow: '0 0 70px rgba(54,134,151,.06)' },
  heroGridLineA: { position: 'absolute', width: 520, height: 1, left: -60, top: 280, backgroundColor: 'rgba(232,255,61,.08)', transform: [{ rotate: '18deg' }] },
  heroGridLineB: { position: 'absolute', width: 520, height: 1, left: -60, top: 330, backgroundColor: 'rgba(232,255,61,.06)', transform: [{ rotate: '-15deg' }] },
  heroTop: { zIndex: 3, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  heroEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.2 },
  heroTitle: { ...typography.displayMedium, maxWidth: 285, marginTop: 7, color: '#F7F8F4' },
  levelPill: { minHeight: 30, paddingHorizontal: 10, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(6,10,12,.66)', borderWidth: 1, borderColor: '#3B461E' },
  levelDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt },
  levelText: { ...typography.label, color: '#E6EAD8', letterSpacing: .35 },
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
  relicHintText: { ...typography.label, color: '#C6A274', letterSpacing: .35 },
  relicQuestion: { color: colors.volt, fontFamily: fonts.display, fontSize: 22 },
  factionIdentity: { zIndex: 3, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 },
  factionSeal: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080B0D', borderWidth: 1, borderColor: '#44511F' },
  factionIdentityCopy: { flex: 1, minWidth: 0 },
  factionName: { ...typography.bodyStrong, color: '#F6F7F5', letterSpacing: .1 },
  factionMeta: { ...typography.caption, marginTop: 3, color: '#8E998F' },
  factionGrowthBlock: { alignItems: 'flex-end' },
  factionGrowth: { ...typography.metricSmall, color: colors.volt },
  factionGrowthLabel: { ...typography.eyebrow, marginTop: 2, color: colors.textMuted, letterSpacing: .25 },
  progressBlock: { zIndex: 3, marginTop: 11 },
  relicState: { marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  relicForm: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 },
  relicPhrase: { ...typography.caption, flex: 1, color: '#A8B0AA', fontStyle: 'italic' },
  progressHeadline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: { ...typography.label, color: colors.textMuted, letterSpacing: .35 },
  progressValue: { ...typography.label, color: '#F4F6F2' },
  progressTrack: { height: 7, marginTop: 7, overflow: 'hidden', borderRadius: 4, backgroundColor: '#20271B' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.volt, boxShadow: '0 0 12px rgba(232,255,61,.44)' },
  progressFoot: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  progressNext: { ...typography.caption, color: colors.textMuted },
  progressImpact: { ...typography.caption, color: colors.textSubtle },
  mutationGuide: { minHeight: 120, marginTop: 13, padding: 10, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'rgba(6,9,9,.78)', borderWidth: 1, borderColor: '#3E4A21' },
  mutationPreview: { width: 58, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151B10', borderWidth: 1, borderColor: '#4B5921' },
  mutationCode: { color: colors.volt, fontFamily: fonts.display, fontSize: 25, lineHeight: 26 },
  mutationName: { ...typography.label, maxWidth: 52, marginTop: 3, color: '#AEB981', letterSpacing: .2, textAlign: 'center' },
  mutationCopy: { flex: 1, minWidth: 0 },
  mutationEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 },
  mutationTitle: { ...typography.cardTitle, marginTop: 4, color: '#F3F5F1' },
  mutationText: { ...typography.body, marginTop: 4, color: '#8F9991' },
  heroFooter: { zIndex: 3, minHeight: 42, marginTop: 'auto', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#34401C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroFooterText: { ...typography.action, color: colors.volt, letterSpacing: .7 },
  heroFooterArrow: { color: colors.volt, fontSize: 17 },
  warSection: { gap: 11 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  sectionHeadingCopy: { flex: 1, minWidth: 0 },
  sectionEyebrow: { ...typography.eyebrow, color: colors.volt },
  sectionTitle: { ...typography.sectionTitle, marginTop: 5, color: '#F3F5F5' },
  sectionIntro: { ...typography.body, maxWidth: 360, color: colors.textMuted },
  livePill: { minHeight: 28, paddingHorizontal: 9, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#3B471D' },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.volt },
  liveText: { ...typography.label, color: colors.volt, letterSpacing: .35 },
  warCard: { overflow: 'hidden', borderRadius: 25, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#242D35' },
  warRow: { minHeight: 88, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: '#1A2229' },
  warRowMine: { backgroundColor: '#141B10', borderBottomColor: '#34401B' },
  warRank: { ...typography.label, width: 27, color: '#65717B' },
  warRankTop: { color: colors.volt },
  warLogo: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#070A0D', borderWidth: 1, borderColor: '#283139' },
  warTeam: { flex: 1, minWidth: 0 },
  warNameLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  warName: { ...typography.bodyStrong, flexShrink: 1, color: '#F0F2F3' },
  minePill: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7, backgroundColor: colors.volt },
  minePillText: { ...typography.label, color: '#080A0C', letterSpacing: .15 },
  warMeta: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  warScore: { alignItems: 'flex-end' },
  warMembers: { ...typography.metricSmall, color: '#F0F2F3' },
  warGrowth: { ...typography.label, marginTop: 2, color: colors.textMuted },
  warGrowthPositive: { color: colors.volt },
  memberSection: { gap: 11 },
  memberPlacement: { ...typography.eyebrow, color: colors.volt, letterSpacing: .4 },
  memberSummary: { minHeight: 118, padding: 13, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#10160E', borderWidth: 1, borderColor: '#3C481D' },
  memberRankBlock: { minWidth: 68 },
  memberRankValue: { ...typography.metric, color: colors.volt },
  memberRankLabel: { ...typography.label, marginTop: 4, color: colors.textMuted, letterSpacing: .35 },
  memberDivider: { width: 1, height: 56, backgroundColor: '#38431D' },
  memberStat: { flex: 1, minWidth: 0, alignItems: 'center' },
  memberStatValue: { ...typography.metricSmall, color: '#F1F3F2' },
  memberStatValueFeatured: { color: colors.volt },
  memberStatLabel: { ...typography.label, marginTop: 4, color: colors.textMuted, textAlign: 'center' },
  memberList: { overflow: 'hidden', borderRadius: 22, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#242D35' },
  memberRow: { minHeight: 78, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: '#192129' },
  memberRowMine: { backgroundColor: '#141B10' },
  memberRowRank: { ...typography.label, width: 27, color: '#65717B' },
  memberRowRankMine: { color: colors.volt },
  memberAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E', borderWidth: 1, borderColor: '#38431D' },
  memberAvatarText: { ...typography.label, color: colors.volt },
  memberCopy: { flex: 1, minWidth: 0 },
  memberName: { ...typography.bodyStrong, color: '#F0F2F3' },
  memberMeta: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  memberPrecision: { ...typography.label, color: '#AAB3B9' },
  emptyCard: { minHeight: 190, padding: 22, borderRadius: 28, justifyContent: 'center', backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#252E36' },
  emptyMark: { color: colors.volt, fontSize: 24 },
  emptyTitle: { ...typography.displaySmall, maxWidth: 320, marginTop: 12, color: '#F2F4F4' },
  emptyText: { ...typography.body, maxWidth: 330, marginTop: 9, color: '#7A858E' },
  heroSkeleton: { minHeight: 730, padding: 18, borderRadius: 30, justifyContent: 'space-between', backgroundColor: '#0D1311', borderWidth: 1, borderColor: '#29321A' },
  skeletonTitle: { width: 220, height: 65, borderRadius: 17, backgroundColor: '#172016' },
  skeletonRelic: { width: 230, height: 230, alignSelf: 'center', borderRadius: 115, backgroundColor: '#151C18' },
  skeletonLine: { width: '100%', height: 58, borderRadius: 16, backgroundColor: '#151C18' },
  pressed: { opacity: .74 },
});
