import { forwardRef } from 'react';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Zap from 'lucide-react-native/icons/zap';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { StateView } from '@/src/components/ui/StateView';
import { Surface } from '@/src/components/ui/Surface';
import { colors, radius, spacing, typography } from '@/src/theme';

import {
  missionDescription,
  missionMeta,
  missionProgress,
  missionRewardLabel,
  missionTimeLeft,
} from '../missionPresentation';
import type { FriendQuestsData } from '../types';

type DuelMissionsSectionProps = {
  data: FriendQuestsData;
  error: string | null;
  loading: boolean;
  onOpen: () => void;
  onRetry: () => void;
};

export const DuelMissionsSection = forwardRef<View, DuelMissionsSectionProps>(
  function DuelMissionsSection({ data, error, loading, onOpen, onRetry }, ref) {
    const activeMission = data.actives[0] ?? null;
    const hasContent = data.actives.length > 0 || data.duos.length > 0 || data.historique.length > 0;

    if (loading) {
      return (
        <SkeletonGroup
          label="Chargement de la mission contextuelle"
          style={styles.section}
          testID="duel-missions-loading"
        >
          <SectionHeading count={null} />
          <Surface border="subtle" layout={{ minHeight: 132, width: '100%' }} radius="lg" tone="low">
            <Skeleton height={12} radius="pill" width="42%" />
            <Skeleton height={18} radius="sm" style={styles.skeletonCopy} width="78%" />
            <Skeleton height={6} radius="pill" style={styles.skeletonTrack} width="100%" />
          </Surface>
        </SkeletonGroup>
      );
    }

    if (error && !hasContent) {
      return (
        <View style={styles.section}>
          <SectionHeading count={null} />
          <StateView
            action={{ label: 'RÉESSAYER', onPress: onRetry }}
            compact
            description={error}
            title="Missions indisponibles"
            variant="error"
          />
        </View>
      );
    }

    if (!activeMission) {
      const archivedCount = data.historique.length;
      return (
        <View style={styles.section}>
          <SectionHeading count={0} />
          {error ? <MissionRefreshNotice message={error} onRetry={onRetry} /> : null}
          <Pressable
            accessibilityHint="Ouvre l’historique et les séries de duo"
            accessibilityLabel="Aucune mission active. Ouvrir les missions de duo"
            accessibilityRole="button"
            onPress={onOpen}
            ref={ref}
            style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
            testID="duel-missions-entry"
          >
            <Surface border="subtle" layout={{ minHeight: 104, width: '100%' }} radius="lg" tone="low">
              <View style={styles.emptyRow}>
                <View style={styles.emptyCopy}>
                  <Text style={styles.emptyTitle}>Aucune mission active</Text>
                  <Text style={styles.emptyDescription}>
                    Tes calls et tes duels feront apparaître le prochain objectif à deux.
                  </Text>
                  {archivedCount ? <Text style={styles.archiveMeta}>{archivedCount} mission{archivedCount > 1 ? 's' : ''} dans l’historique</Text> : null}
                </View>
                <ChevronRight color={colors.textSecondary} size={20} strokeWidth={2} />
              </View>
            </Surface>
          </Pressable>
        </View>
      );
    }

    const meta = missionMeta(activeMission);
    const progress = missionProgress(activeMission);
    const partner = activeMission.partenaire?.pseudo || 'ton duo';
    const reward = missionRewardLabel(activeMission);

    return (
      <View style={styles.section}>
        <SectionHeading count={data.actives.length} />
        {error ? <MissionRefreshNotice message={error} onRetry={onRetry} /> : null}
        <Pressable
          accessibilityHint="Ouvre toutes les missions, les séries de duo et l’historique"
          accessibilityLabel={`${meta.title}, avec ${partner}, progression ${progress.current} sur ${progress.objective}, récompense ${reward}`}
          accessibilityRole="button"
          onPress={onOpen}
          ref={ref}
          style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
          testID="duel-missions-entry"
        >
          <Surface border="strong" layout={{ minHeight: 152, width: '100%' }} radius="lg" tone="interactive">
            <View style={styles.accent} />
            <View style={styles.topRow}>
              <View style={styles.identity}>
                <View style={styles.icon}>
                  <Zap color={colors.background} fill={colors.background} size={16} strokeWidth={2.4} />
                </View>
                <View style={styles.identityCopy}>
                  <Text style={styles.eyebrow}>{meta.eyebrow}</Text>
                  <Text numberOfLines={1} style={styles.partner}>AVEC {partner.toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.openLabel}>
                <Text style={styles.openLabelText}>VOIR TOUT</Text>
                <ChevronRight color={colors.volt} size={18} strokeWidth={2.2} />
              </View>
            </View>

            <Text style={styles.title}>{meta.title}</Text>
            <Text numberOfLines={2} style={styles.description}>{missionDescription(activeMission)}</Text>

            <View style={styles.progressHeader}>
              <Text style={styles.progressValue}>{progress.current} / {progress.objective}</Text>
              <Text style={styles.time}>{missionTimeLeft(activeMission.expire_le)}</Text>
            </View>
            <View
              accessible
              accessibilityLabel={`Progression ${progress.current} sur ${progress.objective}`}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: progress.objective, now: progress.current }}
              style={styles.progressTrack}
            >
              <View style={[styles.progressFill, { width: `${progress.percentage}%` }]} />
            </View>
            <Text style={styles.reward}>RÉCOMPENSE · {reward.toUpperCase()}</Text>
          </Surface>
        </Pressable>
      </View>
    );
  },
);

function MissionRefreshNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View accessibilityRole="alert" style={styles.refreshNotice}>
      <View style={styles.refreshNoticeCopy}>
        <Text style={styles.refreshNoticeTitle}>ACTUALISATION IMPOSSIBLE</Text>
        <Text numberOfLines={2} style={styles.refreshNoticeDescription}>{message}</Text>
      </View>
      <Button label="RÉESSAYER" onPress={onRetry} size="compact" variant="secondary" />
    </View>
  );
}

function SectionHeading({ count }: { count: number | null }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.headingLabel}>MISSION CONTEXTUELLE</Text>
      {count === null ? null : (
        <Text style={styles.headingMeta}>{count ? `${count}/3 EN COURS` : 'AUCUNE ACTIVE'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  heading: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headingLabel: {
    ...typography.metadata,
    color: colors.textSecondary,
    fontFamily: typography.control.fontFamily,
    letterSpacing: 0.55,
  },
  headingMeta: {
    ...typography.metadata,
    color: colors.textMuted,
  },
  refreshNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.liveSurface,
    borderWidth: 1,
    borderColor: colors.liveBorder,
  },
  refreshNoticeCopy: {
    flex: 1,
    minWidth: 0,
  },
  refreshNoticeTitle: {
    ...typography.control,
    color: colors.liveText,
  },
  refreshNoticeDescription: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.textSecondary,
  },
  pressable: {
    width: '100%',
    borderRadius: radius.lg,
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
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: colors.volt,
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.volt,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    ...typography.metadata,
    color: colors.volt,
    fontFamily: typography.control.fontFamily,
    letterSpacing: 0.4,
  },
  partner: {
    ...typography.metadata,
    marginTop: 1,
    color: colors.textMuted,
  },
  openLabel: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openLabelText: {
    ...typography.control,
    color: colors.volt,
  },
  title: {
    ...typography.sectionTitle,
    marginTop: spacing.sm,
    color: colors.text,
  },
  description: {
    ...typography.bodyComfort,
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  progressHeader: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressValue: {
    ...typography.bodyComfortStrong,
    color: colors.text,
  },
  time: {
    ...typography.metadata,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 6,
    marginTop: spacing.xs,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.volt,
  },
  reward: {
    ...typography.metadata,
    marginTop: spacing.sm,
    color: colors.text,
    fontFamily: typography.control.fontFamily,
  },
  emptyRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyCopy: {
    flex: 1,
    minWidth: 0,
  },
  emptyTitle: {
    ...typography.bodyComfortStrong,
    color: colors.text,
  },
  emptyDescription: {
    ...typography.metadata,
    marginTop: 3,
    color: colors.textSecondary,
  },
  archiveMeta: {
    ...typography.metadata,
    marginTop: spacing.xs,
    color: colors.volt,
  },
  skeletonCopy: {
    marginTop: spacing.md,
  },
  skeletonTrack: {
    marginTop: spacing.lg,
  },
});
