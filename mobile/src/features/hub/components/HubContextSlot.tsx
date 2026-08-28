import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Target from 'lucide-react-native/icons/target';
import Trophy from 'lucide-react-native/icons/trophy';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GriffProgress } from '@/src/components/ui/GriffProgress';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { Surface } from '@/src/components/ui/Surface';
import { colors, spacing, typography } from '@/src/theme';

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
  progress?: { current: number; goal: number };
  title: string;
};

type HubContextSlotProps = {
  context: HubContextItem;
  now?: number;
};

export function HubContextSlot({ context, now = Date.now() }: HubContextSlotProps) {
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

          {presentation.progress ? (
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.progress}>
              <GriffProgress
                accessibilityLabel={`Progression ${presentation.progress.current} sur ${presentation.progress.goal}`}
                max={presentation.progress.goal}
                value={presentation.progress.current}
              />
            </View>
          ) : null}

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

function contextPresentation(context: HubContextItem, now: number): ContextPresentation {
  if (context.kind === 'result') return resultPresentation(context.result, now);
  if (context.kind === 'mission') return missionPresentation(context.mission, now);
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

function missionPresentation(mission: HubFactionMission, now: number): ContextPresentation {
  const current = Math.min(Math.max(0, mission.progress), Math.max(1, mission.goal));
  const goal = Math.max(1, mission.goal);
  const timeLeft = formatFutureTime(mission.endsAt, now);
  const contribution = formatNumber(Math.max(0, mission.personalContribution));
  const participants = formatNumber(Math.max(0, mission.participants));

  return {
    accent: colors.frag,
    accessibilityLabel: `Mission ${mission.title}. Progression ${current} sur ${goal}. Ta contribution ${contribution}. ${timeLeft.toLowerCase()}.`,
    action: 'CONTINUER',
    description: `Ta contribution ${contribution} · ${participants} participant${mission.participants === 1 ? '' : 's'}`,
    eyebrow: `MISSION · ${mission.team.tag || mission.team.name}`,
    footer: timeLeft,
    hint: 'Ouvre le détail des missions dans Défis',
    Icon: Target,
    metric: `${current}/${goal}`,
    metricLabel: 'ÉQUIPE',
    progress: { current, goal },
    title: mission.title,
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
    hint: 'Ouvre ta collection dans l’Atelier',
    Icon: Sparkles,
    metric: rarity,
    metricLabel: 'OBTENU',
    title: reward.name,
  };
}

function openContext(context: HubContextItem) {
  if (context.kind === 'result') {
    router.push({ pathname: '/result/[id]', params: { id: context.result.matchId } });
    return;
  }
  if (context.kind === 'mission') {
    router.push('/(tabs)/social/missions');
    return;
  }
  router.push({ pathname: '/shop', params: { scope: 'owned' } });
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

function formatFutureTime(value: string, now: number) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'MISSION EN COURS';
  const minutes = Math.max(0, Math.ceil((timestamp - now) / 60_000));
  if (minutes < 60) return `SE TERMINE DANS ${Math.max(1, minutes)} MIN`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `SE TERMINE DANS ${hours} H`;
  return `SE TERMINE DANS ${Math.ceil(hours / 24)} J`;
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

function gameLabel(game: string) {
  const normalized = game.toLowerCase();
  if (normalized.includes('valorant')) return 'VALORANT';
  if (normalized.includes('cs')) return 'CS2';
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
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
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
  progress: {
    marginTop: spacing.sm,
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
