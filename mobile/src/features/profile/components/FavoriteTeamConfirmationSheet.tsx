import ShieldCheck from 'lucide-react-native/icons/shield-check';
import type { RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BaseSheet } from '@/src/components/overlays/BaseSheet';
import { Button } from '@/src/components/ui/Button';
import type { TeamOrganization } from '@/src/features/onboarding/types';
import { colors, radius, spacing, typography } from '@/src/theme';

type FavoriteTeamConfirmationSheetProps = {
  busy: boolean;
  currentOrganization: TeamOrganization | null;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
  organization: TeamOrganization | null;
  returnFocusRef?: RefObject<View | null>;
};

export function FavoriteTeamConfirmationSheet({
  busy,
  currentOrganization,
  error,
  onClose,
  onConfirm,
  organization,
  returnFocusRef,
}: FavoriteTeamConfirmationSheetProps) {
  const title = 'Changer de faction ?';

  return (
    <BaseSheet
      dismissible={!busy}
      eyebrow="ENGAGEMENT · FACTION"
      footer={(
        <View style={styles.footer}>
          <Button
            fullWidth
            label="CONFIRMER LE CHANGEMENT"
            loading={busy}
            onPress={onConfirm}
          />
          <Button
            disabled={busy}
            fullWidth
            label="GARDER MA FACTION"
            onPress={onClose}
            variant="secondary"
          />
        </View>
      )}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      scrollable={false}
      testID="favorite-team-confirmation"
      title={title}
      visible={Boolean(organization)}
    >
      <View style={styles.commitment}>
        <View style={styles.icon}>
          <ShieldCheck color={colors.volt} size={24} strokeWidth={2.1} />
        </View>
        <View style={styles.commitmentCopy}>
          <Text style={styles.commitmentLabel}>VERROUILLAGE APRÈS CONFIRMATION</Text>
          <Text style={styles.commitmentValue}>7 JOURS</Text>
        </View>
      </View>

      {organization ? (
        <View style={styles.change}>
          <TeamIdentity
            accent={false}
            label="ACTUELLE"
            name={currentOrganization?.name ?? 'Faction actuelle'}
            tag={currentOrganization?.tag ?? '—'}
          />
          <Text accessibilityElementsHidden style={styles.arrow}>→</Text>
          <TeamIdentity accent label="NOUVELLE" name={organization.name} tag={organization.tag} />
        </View>
      ) : null}

      <Text style={styles.explanation}>
        La nouvelle faction sera utilisée immédiatement dans le Social, ta relique et ton identité publique. Tu ne pourras plus en sélectionner une autre avant la fin du délai.
      </Text>
      <Text style={styles.reassurance}>
        Tes jeux suivis, tes notifications et ta progression restent inchangés.
      </Text>

      {error ? (
        <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </BaseSheet>
  );
}

function TeamIdentity({ accent, label, name, tag }: { accent: boolean; label: string; name: string; tag: string }) {
  return (
    <View style={[styles.team, accent && styles.teamAccent]}>
      <Text style={[styles.teamLabel, accent && styles.teamLabelAccent]}>{label}</Text>
      <View style={[styles.teamMark, accent && styles.teamMarkAccent]}><Text style={[styles.teamTag, accent && styles.teamTagAccent]}>{tag.slice(0, 4)}</Text></View>
      <Text numberOfLines={2} style={styles.teamName}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  commitment: {
    minHeight: 78,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInteractive,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  icon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  commitmentCopy: { flex: 1, minWidth: 0 },
  commitmentLabel: { ...typography.eyebrow, color: colors.textMuted },
  commitmentValue: { ...typography.sectionTitle, marginTop: 2, color: colors.volt },
  change: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  team: {
    flex: 1,
    minWidth: 0,
    minHeight: 132,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  teamAccent: { backgroundColor: '#11170E', borderColor: '#48541E' },
  teamLabel: { ...typography.eyebrow, color: colors.textMuted },
  teamLabelAccent: { color: colors.volt },
  teamMark: {
    width: 42,
    height: 42,
    marginTop: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceInteractive,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  teamMarkAccent: { backgroundColor: colors.volt, borderColor: colors.volt },
  teamTag: { ...typography.action, color: colors.textSecondary },
  teamTagAccent: { color: colors.background },
  teamName: { ...typography.bodyStrong, marginTop: spacing.xs, color: colors.text },
  arrow: { color: colors.volt, fontSize: 20 },
  explanation: { ...typography.body, marginTop: spacing.md, color: colors.text },
  reassurance: { ...typography.metadata, marginTop: spacing.sm, color: colors.textSecondary },
  error: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,93,104,.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,93,104,.36)',
  },
  errorText: { ...typography.body, color: colors.danger },
  footer: { gap: spacing.xs },
});
