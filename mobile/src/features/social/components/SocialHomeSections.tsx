import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { CosmeticAvatar, relicSignatureTheme } from '@/src/features/shop/components/CosmeticRenderer';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import type { CommunityActivity, CommunityFaction, CommunityMe } from '@/src/features/social/faction/types';
import { factionProgress, gameLabel } from '@/src/features/social/faction/utils';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors } from '@/src/theme';

import { styles } from './SocialHomeScreen.styles';

const RELIC_SOURCE = require('../../../../assets/social/faction-relic-v5.png');

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

export function FactionRelicHero({ faction, me }: { faction: CommunityFaction | null; me: CommunityMe | null }) {
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
        <View style={styles.heroHeading}>
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

export function FactionWar({ factions, mine }: { factions: CommunityFaction[]; mine: CommunityFaction | null }) {
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

export function FactionMemberRanking({ faction, me }: { faction: CommunityFaction; me: CommunityMe }) {
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

export function EmptyFactions() {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyMark}>✦</Text>
      <Text style={styles.emptyTitle}>LA GUERRE N’A PAS ENCORE COMMENCÉ.</Text>
      <Text style={styles.emptyText}>Les factions et leur classement apparaîtront ici dès que les premières équipes seront actives.</Text>
    </View>
  );
}

export function FactionHeroSkeleton() {
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
