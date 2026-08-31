import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Check from 'lucide-react-native/icons/check';
import Play from 'lucide-react-native/icons/play';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Target from 'lucide-react-native/icons/target';
import Trophy from 'lucide-react-native/icons/trophy';
import UsersRound from 'lucide-react-native/icons/users-round';
import type { ComponentType } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { Surface } from '@/src/components/ui/Surface';
import { colors, spacing, typography } from '@/src/theme';
import { openMatchResult } from '@/src/features/matches/matchCenterNavigation';

import type { HubContextItem } from '../hubContext';
import type { HubFactionMission, HubRecentResult, HubReward } from '../types';

type ContextPresentation = {
  accent: string;
  accessibilityLabel: string;
  action: string;
  description: string;
  eyebrow: string;
  footer: string;
  hint: string;
  Icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  metric: string;
  metricLabel: string;
  title: string;
};

type HubContextSlotProps = {
  context: HubContextItem;
  now?: number;
};

type DailyMissionCard = {
  colors: [string, string, string];
  current: number;
  eyebrow: string;
  goal: number;
  iconColor: string;
  Icon: ComponentType<{ color?: string; fill?: string; size?: number; strokeWidth?: number }>;
  key: 'faction' | 'call' | 'live' | 'social';
  reward: number;
  title: string;
};

export function HubContextSlot({ context, now = Date.now() }: HubContextSlotProps) {
  if (context.kind === 'mission') {
    return <HubMissionChallengeCard mission={context.mission} />;
  }

  const presentation = contextPresentation(context, now);
  const { Icon } = presentation;

  return (
    <Pressable
      accessibilityHint={presentation.hint}
      accessibilityLabel={presentation.accessibilityLabel}
      accessibilityRole="button"
      onPress={() => openContext(context)}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      testID={`hub-context-${context.kind}`}
    >
      <Surface border="subtle" layout={{ minHeight: 148, width: '100%' }} padding="none" radius="lg" tone="low">
        <View style={[styles.accent, { backgroundColor: presentation.accent }]} />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.identity}>
              <View style={styles.icon}>
                <Icon color={presentation.accent} size={20} strokeWidth={2.2} />
              </View>
              <Text numberOfLines={1} style={styles.eyebrow}>{presentation.eyebrow}</Text>
            </View>
            <View style={styles.metric}>
              <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={[styles.metricValue, { color: presentation.accent }]}>
                {presentation.metric}
              </Text>
              <Text numberOfLines={1} style={styles.metricLabel}>{presentation.metricLabel}</Text>
            </View>
          </View>

          <Text numberOfLines={2} style={styles.title}>{presentation.title}</Text>
          <Text numberOfLines={2} style={styles.description}>{presentation.description}</Text>

          <View style={styles.footer}>
            <Text numberOfLines={1} style={styles.footerMeta}>{presentation.footer}</Text>
            <View style={styles.action}>
              <Text style={styles.actionLabel}>{presentation.action}</Text>
              <ChevronRight color={colors.volt} size={18} strokeWidth={2.2} />
            </View>
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}

function HubMissionChallengeCard({ mission }: { mission: HubFactionMission }) {
  const { width } = useWindowDimensions();
  const team = (mission.team.tag || mission.team.name || 'FACTION').toUpperCase();
  const cards = dailyMissionCards(mission, team);
  const completed = cards.filter((card) => card.current >= card.goal).length;
  const cardWidth = Math.min(360, Math.max(256, width - 68));
  const openMissions = () => openContext({ kind: 'mission', mission });

  return (
    <View style={styles.missionSection}>
      <View style={styles.missionSectionHeader}>
        <Text style={styles.missionSectionTitle}>DÉFIS DU JOUR</Text>
        <Pressable
          accessibilityLabel={`Voir les quatre défis du jour, ${completed} terminé${completed === 1 ? '' : 's'}`}
          accessibilityRole="button"
          onPress={openMissions}
          style={({ pressed }) => [styles.missionCountPill, pressed && styles.pressed]}
        >
          <Text style={styles.missionCount}>{completed} / {cards.length}</Text>
          <ChevronRight color={colors.text} size={18} strokeWidth={2.4} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.missionRail}
        decelerationRate="fast"
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={cardWidth + 10}
        style={styles.missionRailViewport}
        testID="hub-mission-rail"
      >
        {cards.map((card) => (
          <DailyMissionCardView
            card={card}
            cardWidth={cardWidth}
            key={card.key}
            onPress={openMissions}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function DailyMissionCardView({
  card,
  cardWidth,
  onPress,
}: {
  card: DailyMissionCard;
  cardWidth: number;
  onPress: () => void;
}) {
  const { Icon } = card;

  return (
    <Pressable
      accessibilityHint="Ouvre le détail des missions dans Défis"
      accessibilityLabel={`${card.eyebrow}. ${card.title}. Progression ${card.current} sur ${card.goal}. Récompense ${card.reward} Frags.`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.missionPressable, { width: cardWidth }, pressed && styles.pressed]}
      testID={`hub-daily-mission-${card.key}`}
    >
      <LinearGradient
        colors={card.colors}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.missionCard}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.missionBackdropIcon}
        >
          <Icon color={card.iconColor} size={154} strokeWidth={5.2} />
        </View>
        <LinearGradient
          colors={['rgba(255,255,255,.10)', 'rgba(20,12,0,.04)', 'rgba(3,8,12,.32)']}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.missionCopy}>
          <View style={styles.missionEyebrowPlate}>
            <Text numberOfLines={1} style={styles.missionEyebrow}>{card.eyebrow}</Text>
          </View>
          <View style={styles.missionTitlePlate}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.68}
              numberOfLines={2}
              style={styles.missionTitle}
            >
              {card.title}
            </Text>
          </View>
        </View>

        <View style={styles.missionBottomRow}>
          <View style={styles.missionProgressPill}>
            <Text style={styles.missionProgress}>{card.current}/{card.goal}</Text>
          </View>
          <View style={styles.missionRewardPill}>
            <Text style={styles.missionReward}>+{card.reward} FRAGS</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function dailyMissionCards(mission: HubFactionMission, team: string): DailyMissionCard[] {
  const factionGoal = Math.max(1, mission.goal);

  // The Hub API currently exposes only the faction mission. The other three
  // cards are presentation placeholders until their mission data is available.
  return [
    {
      colors: ['#F6B900', '#D58700', '#713500'],
      current: Math.min(Math.max(0, mission.progress), factionGoal),
      eyebrow: `MISSION ${team}`,
      goal: factionGoal,
      iconColor: 'rgba(102,55,0,.30)',
      Icon: Target,
      key: 'faction',
      reward: 25,
      title: `${factionGoal} CALLS EN FACTION`,
    },
    {
      colors: ['#00AD72', '#007750', '#003C2B'],
      current: 0,
      eyebrow: 'MISSION CALL',
      goal: 1,
      iconColor: 'rgba(0,62,45,.34)',
      Icon: Check,
      key: 'call',
      reward: 30,
      title: 'VALIDE 1 CALL',
    },
    {
      colors: ['#842CE5', '#5115B4', '#28036A'],
      current: 0,
      eyebrow: 'MISSION LIVE',
      goal: 2,
      iconColor: 'rgba(43,4,103,.36)',
      Icon: Play,
      key: 'live',
      reward: 20,
      title: 'SUIS 2 MATCHS',
    },
    {
      colors: ['#178CE8', '#075DAD', '#052D65'],
      current: 0,
      eyebrow: 'MISSION SOCIAL',
      goal: 1,
      iconColor: 'rgba(0,44,98,.36)',
      Icon: UsersRound,
      key: 'social',
      reward: 25,
      title: 'INVITE 1 SUPPORTER',
    },
  ];
}

export function HubContextSkeleton() {
  return (
    <Surface
      border="subtle"
      layout={{ minHeight: 148, width: '100%' }}
      padding="md"
      radius="lg"
      tone="low"
    >
      <SkeletonGroup label="Chargement du contexte du Hub" style={styles.skeletonContent}>
        <View style={styles.skeletonTop}>
          <Skeleton height={40} radius="md" width={40} />
          <Skeleton height={12} radius="pill" width="36%" />
        </View>
        <Skeleton height={16} radius="pill" width="72%" />
        <Skeleton height={12} radius="pill" tone="subtle" width="88%" />
        <Skeleton height={12} radius="pill" tone="subtle" width="42%" />
      </SkeletonGroup>
    </Surface>
  );
}

function contextPresentation(
  context: Exclude<HubContextItem, { kind: 'mission' }>,
  now: number,
): ContextPresentation {
  if (context.kind === 'result') return resultPresentation(context.result, now);
  return rewardPresentation(context.reward, now);
}

function resultPresentation(result: HubRecentResult, now: number): ContextPresentation {
  const won = result.status === 'gagne';
  const choice = result.choice === 'a' ? result.tagA : result.tagB;
  const delta = won ? Math.abs(result.deltaFrags) : -Math.abs(result.deltaFrags);
  const score = result.scoreA == null || result.scoreB == null
    ? `${result.tagA} VS ${result.tagB}`
    : `${result.tagA} ${result.scoreA} — ${result.scoreB} ${result.tagB}`;
  const outcome = won ? 'gagné' : 'perdu';
  const deltaLabel = `${delta >= 0 ? '+' : '−'}${formatNumber(Math.abs(delta))}`;

  return {
    accent: won ? colors.success : colors.liveText,
    accessibilityLabel: `Verdict ${outcome}. ${score}. Call ${choice}. ${won ? 'Gain' : 'Perte'} de ${formatNumber(Math.abs(delta))} Frags.`,
    action: 'REVOIR',
    description: won ? `Ton call ${choice} est validé. Ton rating progresse.` : `Ton call ${choice} n’est pas passé. Ton rating est mis à jour.`,
    eyebrow: `VERDICT · ${result.event || gameLabel(result.game)}`,
    footer: formatPastTime(result.resolvedAt, now),
    hint: 'Ouvre le verdict détaillé et l’évolution de ton rating',
    Icon: Trophy,
    metric: deltaLabel,
    metricLabel: 'FRAGS',
    title: score,
  };
}

function rewardPresentation(reward: HubReward, now: number): ContextPresentation {
  const rarity = humanize(reward.rarity).toUpperCase();
  const category = rewardCategory(reward);

  return {
    accent: reward.accent || colors.volt,
    accessibilityLabel: `Nouvelle récompense ${reward.name}. Rareté ${rarity.toLowerCase()}. ${category}. Ajoutée à ta collection.`,
    action: 'DÉCOUVRIR',
    description: `${category} · ${rewardSource(reward.source)}`,
    eyebrow: 'NOUVELLE RÉCOMPENSE',
    footer: formatPastTime(reward.acquiredAt, now),
    hint: isRewardRevealRarity(reward.rarity)
      ? 'Ouvre la révélation de cette récompense puis ta collection'
      : 'Ouvre ta collection dans l’Atelier',
    Icon: Sparkles,
    metric: rarity,
    metricLabel: 'OBTENU',
    title: reward.name,
  };
}

function openContext(context: HubContextItem) {
  if (context.kind === 'result') {
    openMatchResult({
      id: context.result.matchId,
      equipe_a: context.result.teamA,
      equipe_b: context.result.teamB,
      evenement: context.result.event,
      jeu: context.result.game,
      score_a: context.result.scoreA,
      score_b: context.result.scoreB,
      tag_a: context.result.tagA,
      tag_b: context.result.tagB,
    }, { source: 'hub' });
    return;
  }
  if (context.kind === 'mission') {
    router.push('/(tabs)/social/missions');
    return;
  }
  const { reward } = context;
  router.push({
    pathname: '/shop',
    params: isRewardRevealRarity(reward.rarity)
      ? {
          acquisitionEvent: `hub:${reward.id}:${reward.acquiredAt}`,
          acquisitionId: reward.id,
          acquisitionOrigin: 'hub',
          scope: 'owned',
        }
      : { scope: 'owned' },
  });
}

function formatPastTime(value: string, now: number) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'RÉCEMMENT';
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return 'À L’INSTANT';
  if (minutes < 60) return `IL Y A ${minutes} MIN`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `IL Y A ${hours} H`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'HIER' : `IL Y A ${days} J`;
}

function rewardCategory(reward: HubReward) {
  const slots: Record<string, string> = {
    apparence_core: 'Apparence de Core',
    cadre_profil: 'Cadre de profil',
    carte_profil: 'Bannière de profil',
    effet_faction: 'Effet de relique',
    titre_profil: 'Titre de profil',
  };
  return slots[reward.slot] ?? humanize(reward.family || reward.slot || 'Objet cosmétique');
}

function rewardSource(source: string) {
  if (source === 'mission') return 'Mission accomplie';
  if (source === 'founder_pack') return 'Founder Pack';
  if (source === 'partenaire') return 'Activation partenaire';
  return humanize(source || 'Collection GRIFF');
}

function isRewardRevealRarity(rarity: string) {
  return rarity === 'rare' || rarity === 'epique' || rarity === 'legendaire';
}

function gameLabel(game: string) {
  const normalized = game.toLowerCase();
  if (normalized.includes('rocket') || normalized === 'rl') return 'RL';
  if (normalized.includes('valorant')) return 'VALORANT';
  if (normalized.includes('lol')) return 'LOL';
  return 'ESPORT';
}

function humanize(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  pressed: {
    opacity: 0.78,
  },
  missionSection: {
    gap: 10,
  },
  missionSectionHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  missionSectionTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  missionCountPill: {
    minHeight: 40,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 20,
    backgroundColor: '#152633',
    borderWidth: 1,
    borderColor: '#30414E',
  },
  missionCount: {
    ...typography.control,
    color: colors.text,
    letterSpacing: 0.35,
  },
  missionPressable: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.14)',
    backgroundColor: '#111A22',
  },
  missionRailViewport: {
    marginRight: -spacing.md,
    overflow: 'visible',
  },
  missionRail: {
    gap: 10,
    paddingRight: 18,
  },
  missionCard: {
    height: 170,
    overflow: 'hidden',
  },
  missionBackdropIcon: {
    position: 'absolute',
    zIndex: 0,
    top: -4,
    right: -12,
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-7deg' }],
  },
  missionCopy: {
    zIndex: 2,
    padding: 13,
    paddingBottom: 58,
    alignItems: 'flex-start',
  },
  missionEyebrowPlate: {
    maxWidth: '72%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(6,8,9,.88)',
  },
  missionEyebrow: {
    ...typography.action,
    color: colors.volt,
    fontFamily: typography.metricSmall.fontFamily,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  missionTitlePlate: {
    maxWidth: '78%',
    marginTop: 2,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(6,8,9,.94)',
  },
  missionTitle: {
    ...typography.displayMedium,
    color: '#FFFFFF',
    fontSize: 31,
    lineHeight: 29,
    letterSpacing: -0.35,
  },
  missionBottomRow: {
    position: 'absolute',
    zIndex: 3,
    left: 12,
    right: 12,
    bottom: 11,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  missionProgressPill: {
    minWidth: 61,
    minHeight: 35,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(6,8,9,.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.2)',
  },
  missionProgress: {
    ...typography.metricSmall,
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 19,
  },
  missionRewardPill: {
    minWidth: 104,
    minHeight: 35,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: colors.volt,
  },
  missionReward: {
    ...typography.control,
    color: '#080B0D',
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  accent: {
    position: 'absolute',
    top: spacing.md,
    bottom: spacing.md,
    left: 0,
    width: 3,
    borderRadius: 2,
  },
  content: {
    minHeight: 148,
    padding: spacing.md,
    paddingLeft: spacing.md + 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 24,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    ...typography.control,
    flex: 1,
    color: colors.textSecondary,
    letterSpacing: 0.55,
  },
  metric: {
    maxWidth: 96,
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  metricValue: {
    ...typography.metricSmall,
    maxWidth: '100%',
  },
  metricLabel: {
    ...typography.metadata,
    marginTop: 1,
    color: colors.textSecondary,
    fontFamily: typography.control.fontFamily,
    letterSpacing: 0.45,
  },
  title: {
    ...typography.cardTitle,
    marginTop: spacing.sm,
    color: colors.text,
  },
  description: {
    ...typography.bodyComfort,
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  footer: {
    minHeight: 24,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  footerMeta: {
    ...typography.metadata,
    flex: 1,
    minWidth: 0,
    color: colors.textSecondary,
    letterSpacing: 0.25,
  },
  action: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionLabel: {
    ...typography.control,
    color: colors.volt,
    letterSpacing: 0.35,
  },
  skeletonContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  skeletonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
