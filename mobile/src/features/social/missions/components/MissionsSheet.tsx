import type { RefObject } from 'react';
import Flame from 'lucide-react-native/icons/flame';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BaseSheet } from '@/src/components/overlays/BaseSheet';
import { Button } from '@/src/components/ui/Button';
import { StateView } from '@/src/components/ui/StateView';
import { Surface } from '@/src/components/ui/Surface';
import { colors, radius, spacing, typography } from '@/src/theme';

import {
  missionDescription,
  missionInitials,
  missionMeta,
  missionProgress,
  missionRewardLabel,
  missionStatusLabel,
  missionTimeLeft,
} from '../missionPresentation';
import type { DuoStreak, FriendQuest, FriendQuestsData } from '../types';

type MissionsSheetProps = {
  data: FriendQuestsData;
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onClosed?: () => void;
  onRetry: () => void;
  returnFocusRef?: RefObject<View | null>;
  visible: boolean;
};

export function MissionsSheet({
  data,
  error,
  loading,
  onClose,
  onClosed,
  onRetry,
  returnFocusRef,
  visible,
}: MissionsSheetProps) {
  const hasContent = data.actives.length > 0 || data.duos.length > 0 || data.historique.length > 0;

  return (
    <BaseSheet
      eyebrow="GRIFF · DÉFIS"
      onClose={onClose}
      onClosed={onClosed}
      returnFocusRef={returnFocusRef}
      size="large"
      testID="missions-sheet"
      title="Missions de duo"
      visible={visible}
    >
      <View style={styles.content}>
        {loading ? (
          <StateView
            compact
            description="On rassemble tes objectifs et tes séries en cours."
            title="Chargement des missions"
            variant="loading"
          />
        ) : null}

        {!loading && error && !hasContent ? (
          <StateView
            action={{ label: 'RÉESSAYER', onPress: onRetry }}
            compact
            description={error}
            title="Missions indisponibles"
            variant="error"
          />
        ) : null}

        {!loading && error && hasContent ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>ACTUALISATION IMPOSSIBLE</Text>
              <Text style={styles.errorDescription}>{error}</Text>
            </View>
            <Button label="RÉESSAYER" onPress={onRetry} size="compact" variant="secondary" />
          </View>
        ) : null}

        {!loading && (!error || hasContent) ? (
          hasContent ? (
            <>
              <MissionList quests={data.actives} />
              <DuoStreaks duos={data.duos} />
              <MissionHistory quests={data.historique} />
            </>
          ) : (
            <StateView
              compact
              description="Un call partagé, un duel ou une activité de ligue fera apparaître le prochain objectif."
              title="Aucune mission pour le moment"
              variant="empty"
            />
          )
        ) : null}
      </View>
    </BaseSheet>
  );
}

function MissionList({ quests }: { quests: FriendQuest[] }) {
  return (
    <View style={styles.section}>
      <SectionHeading label="EN COURS" meta={`${quests.length}/3`} />
      {quests.length ? (
        quests.slice(0, 3).map((quest) => <MissionCard key={quest.id} quest={quest} />)
      ) : (
        <Surface border="subtle" padding="md" radius="md" tone="low">
          <Text style={styles.quietTitle}>Aucune mission active</Text>
          <Text style={styles.quietCopy}>Tes anciennes missions et tes séries restent accessibles ci-dessous.</Text>
        </Surface>
      )}
    </View>
  );
}

function MissionCard({ quest }: { quest: FriendQuest }) {
  const meta = missionMeta(quest);
  const progress = missionProgress(quest);
  const partner = quest.partenaire?.pseudo || 'ton duo';

  return (
    <Surface border="subtle" padding="md" radius="md" tone="low">
      <View style={styles.missionTop}>
        <View style={styles.missionIdentity}>
          <Text style={styles.missionEyebrow}>{meta.eyebrow}</Text>
          <Text style={styles.missionPartner}>AVEC {partner.toUpperCase()}</Text>
        </View>
        <Text style={styles.missionTime}>{missionTimeLeft(quest.expire_le)}</Text>
      </View>
      <Text style={styles.missionTitle}>{meta.title}</Text>
      <Text style={styles.missionDescription}>{missionDescription(quest)}</Text>
      <View style={styles.missionProgressHeader}>
        <Text style={styles.missionProgressValue}>{progress.current} / {progress.objective}</Text>
        <Text style={styles.missionReward}>{missionRewardLabel(quest)}</Text>
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
    </Surface>
  );
}

function DuoStreaks({ duos }: { duos: DuoStreak[] }) {
  if (!duos.length) return null;
  return (
    <View style={styles.section}>
      <SectionHeading label="SÉRIES DE DUO" meta={`${duos.length}`} />
      <ScrollView
        contentContainerStyle={styles.duoRail}
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
      >
        {duos.slice(0, 8).map((duo, index) => {
          const pseudo = duo.pseudo || 'Duo';
          const weeks = Number(duo.serie_semaines || 0);
          const completed = Number(duo.missions_terminees || 0);
          return (
            <Surface
              accessibilityLabel={`${pseudo}, série de ${weeks} semaines, ${completed} missions terminées`}
              accessible
              border="subtle"
              key={`${duo.user_id ?? pseudo}-${index}`}
              layout={{ minHeight: 142, width: 132 }}
              padding="sm"
              radius="md"
              tone="low"
            >
              <View style={styles.duoAvatar}>
                <Text style={styles.duoInitials}>{missionInitials(pseudo)}</Text>
              </View>
              <Text numberOfLines={1} style={styles.duoName}>{pseudo}</Text>
              <View style={styles.streakRow}>
                <Flame color={colors.volt} size={14} strokeWidth={2.2} />
                <Text style={styles.streakValue}>{weeks} sem.</Text>
              </View>
              <Text style={styles.duoMeta}>{completed} missions</Text>
            </Surface>
          );
        })}
      </ScrollView>
    </View>
  );
}

function MissionHistory({ quests }: { quests: FriendQuest[] }) {
  return (
    <View style={styles.section}>
      <SectionHeading label="DERNIÈRES MISSIONS" meta={`${quests.length}`} />
      <Surface border="subtle" padding="none" radius="md" tone="low">
        {quests.length ? (
          quests.slice(0, 6).map((quest, index) => {
            const meta = missionMeta(quest);
            return (
              <View
                accessibilityLabel={`${meta.title}, avec ${quest.partenaire?.pseudo || 'un joueur'}, ${missionStatusLabel(quest.statut)}, ${missionRewardLabel(quest)}`}
                accessible
                key={quest.id}
                style={[styles.historyRow, index < Math.min(quests.length, 6) - 1 && styles.historyDivider]}
              >
                <View style={styles.historyCopy}>
                  <Text style={styles.historyTitle}>{meta.title}</Text>
                  <Text style={styles.historyMeta}>avec {quest.partenaire?.pseudo || 'un joueur'} · {missionStatusLabel(quest.statut)}</Text>
                </View>
                <Text style={styles.historyReward}>{missionRewardLabel(quest)}</Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyHistory}>Tes missions terminées laisseront leur trace ici.</Text>
        )}
      </Surface>
    </View>
  );
}

function SectionHeading({ label, meta }: { label: string; meta: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionMeta}>{meta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeading: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.metadata,
    color: colors.textSecondary,
    fontFamily: typography.control.fontFamily,
    letterSpacing: 0.5,
  },
  sectionMeta: {
    ...typography.metadata,
    color: colors.textMuted,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.liveSurface,
    borderWidth: 1,
    borderColor: colors.liveBorder,
  },
  errorCopy: {
    flex: 1,
    minWidth: 0,
  },
  errorTitle: {
    ...typography.control,
    color: colors.liveText,
  },
  errorDescription: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.textSecondary,
  },
  missionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  missionIdentity: {
    flex: 1,
    minWidth: 0,
  },
  missionEyebrow: {
    ...typography.metadata,
    color: colors.volt,
    fontFamily: typography.control.fontFamily,
    letterSpacing: 0.4,
  },
  missionPartner: {
    ...typography.metadata,
    marginTop: 1,
    color: colors.textMuted,
  },
  missionTime: {
    ...typography.metadata,
    color: colors.textSecondary,
  },
  missionTitle: {
    ...typography.cardTitle,
    marginTop: spacing.sm,
    color: colors.text,
  },
  missionDescription: {
    ...typography.bodyComfort,
    marginTop: 3,
    color: colors.textSecondary,
  },
  missionProgressHeader: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  missionProgressValue: {
    ...typography.bodyComfortStrong,
    color: colors.text,
  },
  missionReward: {
    ...typography.metadata,
    flexShrink: 1,
    color: colors.volt,
    textAlign: 'right',
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
  quietTitle: {
    ...typography.bodyComfortStrong,
    color: colors.text,
  },
  quietCopy: {
    ...typography.metadata,
    marginTop: 3,
    color: colors.textSecondary,
  },
  duoRail: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  duoAvatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceInteractive,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  duoInitials: {
    ...typography.control,
    color: colors.volt,
  },
  duoName: {
    ...typography.bodyComfortStrong,
    marginTop: spacing.sm,
    color: colors.text,
  },
  streakRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakValue: {
    ...typography.metadata,
    color: colors.text,
    fontFamily: typography.control.fontFamily,
  },
  duoMeta: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.textMuted,
  },
  historyRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  historyDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  historyCopy: {
    flex: 1,
    minWidth: 0,
  },
  historyTitle: {
    ...typography.bodyComfortStrong,
    color: colors.text,
  },
  historyMeta: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.textMuted,
  },
  historyReward: {
    ...typography.metadata,
    maxWidth: 112,
    color: colors.volt,
    textAlign: 'right',
  },
  emptyHistory: {
    ...typography.bodyComfort,
    padding: spacing.md,
    color: colors.textSecondary,
  },
});
