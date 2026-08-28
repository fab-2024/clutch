import type { RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Lock from 'lucide-react-native/icons/lock';

import { BaseSheet } from '@/src/components/overlays/BaseSheet';
import { Button } from '@/src/components/ui/Button';
import { Surface } from '@/src/components/ui/Surface';
import { colors, radius, spacing, typography } from '@/src/theme';

type PredictionConfirmationSheetProps = {
  error?: string | null;
  gain: number;
  loss: number;
  onChangeChoice: () => void;
  onClose: () => void;
  onClosed?: () => void;
  onConfirm: () => void;
  returnFocusRef?: RefObject<View | null>;
  submitting: boolean;
  teamName: string;
  teamTag: string;
  visible: boolean;
};

export function PredictionConfirmationSheet({
  error,
  gain,
  loss,
  onChangeChoice,
  onClose,
  onClosed,
  onConfirm,
  returnFocusRef,
  submitting,
  teamName,
  teamTag,
  visible,
}: PredictionConfirmationSheetProps) {
  return (
    <BaseSheet
      dismissible={!submitting}
      eyebrow="GRIFF · CALL CLASSÉ"
      footer={(
        <View style={styles.actions}>
          <Button
            accessibilityHint="Enregistre définitivement ce pronostic classé"
            fullWidth
            label="VERROUILLER MON CALL"
            loading={submitting}
            onPress={onConfirm}
            testID="prediction-lock-confirm"
          />
          <Button
            disabled={submitting}
            fullWidth
            label="CHANGER MON CHOIX"
            onPress={onChangeChoice}
            size="compact"
            testID="prediction-change-choice"
            variant="ghost"
          />
        </View>
      )}
      onClose={onClose}
      onClosed={onClosed}
      returnFocusRef={returnFocusRef}
      size="large"
      testID="prediction-confirmation-sheet"
      title="Verrouiller ce call ?"
      visible={visible}
    >
      <View style={styles.content}>
        <Surface border="strong" padding="md" radius="lg" tone="low">
          <View
            accessibilityLabel={`Ton choix : ${teamName}, ${teamTag}`}
            accessible
            style={styles.team}
          >
            <View style={styles.teamMark}>
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.teamTag}>{teamTag}</Text>
            </View>
            <View style={styles.teamCopy}>
              <Text style={styles.teamEyebrow}>TON CHOIX</Text>
              <Text numberOfLines={2} style={styles.teamName}>{teamName}</Text>
            </View>
          </View>

          <View style={styles.riskRow}>
            <View accessibilityLabel={`Gain possible : ${Math.abs(gain)} Frags`} accessible style={styles.riskCell}>
              <Text style={styles.riskLabel}>SI TON CALL EST JUSTE</Text>
              <Text style={[styles.riskValue, styles.gain]}>+{Math.abs(gain)}</Text>
              <Text style={styles.riskUnit}>FRAGS</Text>
            </View>
            <View style={styles.riskDivider} />
            <View accessibilityLabel={`Perte possible : ${Math.abs(loss)} Frags`} accessible style={styles.riskCell}>
              <Text style={styles.riskLabel}>SI TON CALL EST FAUX</Text>
              <Text style={[styles.riskValue, styles.loss]}>−{Math.abs(loss)}</Text>
              <Text style={styles.riskUnit}>FRAGS</Text>
            </View>
          </View>
        </Surface>

        <View accessibilityRole="summary" style={styles.commitment}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.lockIcon}>
            <Lock color={colors.volt} size={18} strokeWidth={2.2} />
          </View>
          <Text style={styles.commitmentCopy}>
            Validation définitive : ce call ne pourra plus être modifié.
          </Text>
        </View>

        {error ? (
          <View accessibilityLiveRegion="assertive" style={styles.error}>
            <Text accessibilityRole="alert" style={styles.errorTitle}>CALL NON VERROUILLÉ</Text>
            <Text style={styles.errorCopy}>{error}</Text>
          </View>
        ) : null}
      </View>
    </BaseSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  team: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  teamMark: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInteractive,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  teamTag: {
    ...typography.metricSmall,
    color: colors.volt,
  },
  teamCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  teamEyebrow: {
    ...typography.metadata,
    color: colors.textSecondary,
  },
  teamName: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  riskRow: {
    minHeight: 92,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  riskCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskDivider: {
    width: 1,
    marginVertical: spacing.xs,
    backgroundColor: colors.borderSubtle,
  },
  riskLabel: {
    ...typography.metadata,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  riskValue: {
    ...typography.metric,
    marginTop: spacing.xs,
  },
  gain: {
    color: colors.success,
  },
  loss: {
    color: colors.danger,
  },
  riskUnit: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  commitment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  lockIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceInteractive,
  },
  commitmentCopy: {
    ...typography.bodyComfortStrong,
    flex: 1,
    color: colors.text,
  },
  error: {
    gap: 4,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: `${colors.danger}14`,
    borderWidth: 1,
    borderColor: `${colors.danger}66`,
  },
  errorTitle: {
    ...typography.control,
    color: colors.danger,
  },
  errorCopy: {
    ...typography.body,
    color: colors.text,
  },
  actions: {
    gap: spacing.xs,
  },
});
