import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { BaseSheet } from '@/src/components/overlays/BaseSheet';
import PlayerAvatar from '@/src/features/profile/avatars/PlayerAvatar';
import { PLAYER_AVATARS, playerAvatarById } from '@/src/features/profile/avatars/catalog';
import { colors, radius, spacing, typography } from '@/src/theme';

type ProfileAvatarPickerSheetProps = {
  error: string | null;
  onClose: () => void;
  onSelect: (avatarId: string) => void;
  selectedAvatarId?: string | null;
  savingAvatarId: string | null;
  visible: boolean;
};

export default function ProfileAvatarPickerSheet({
  error,
  onClose,
  onSelect,
  selectedAvatarId,
  savingAvatarId,
  visible,
}: ProfileAvatarPickerSheetProps) {
  const normalizedSelectedId = playerAvatarById(selectedAvatarId)?.id ?? null;
  const busy = savingAvatarId !== null;

  return (
    <BaseSheet
      dismissible={!busy}
      eyebrow="PHOTO DE PROFIL"
      onClose={onClose}
      size="large"
      testID="profile-avatar-picker"
      title="CHOISIS TON AVATAR"
      visible={visible}
    >
      <Text style={styles.intro}>
        Sélectionne une icône. Elle sera enregistrée sur ton profil et visible dans l’application.
      </Text>

      {error ? (
        <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <View accessibilityRole="radiogroup" style={styles.grid}>
        {PLAYER_AVATARS.map((avatar) => {
          const selected = avatar.id === normalizedSelectedId;
          const saving = avatar.id === savingAvatarId;

          return (
            <Pressable
              accessibilityLabel={`Choisir l’avatar ${avatar.label}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: busy }}
              disabled={busy}
              key={avatar.id}
              onPress={() => onSelect(avatar.id)}
              style={({ pressed }) => [
                styles.choice,
                selected && styles.choiceSelected,
                pressed && !busy && styles.pressed,
                busy && !saving && styles.choiceDisabled,
              ]}
              testID={`profile-avatar-choice-${avatar.id}`}
            >
              <PlayerAvatar avatarId={avatar.id} label={avatar.label} size={72} />
              <Text numberOfLines={2} style={[styles.label, selected && styles.labelSelected]}>
                {avatar.label}
              </Text>
              {saving ? (
                <View style={styles.stateBadge}>
                  <ActivityIndicator color="#080A0C" size="small" />
                </View>
              ) : selected ? (
                <View style={styles.stateBadge}>
                  <Text style={styles.check}>✓</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </BaseSheet>
  );
}

const styles = StyleSheet.create({
  intro: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.bodyStrong,
    marginTop: spacing.sm,
    padding: spacing.sm,
    color: colors.danger,
    borderRadius: radius.sm,
    backgroundColor: colors.liveSurface,
    borderWidth: 1,
    borderColor: colors.liveBorder,
  },
  grid: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choice: {
    position: 'relative',
    width: '31%',
    minHeight: 116,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  choiceSelected: {
    backgroundColor: '#15210F',
    borderColor: colors.volt,
  },
  choiceDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  label: {
    ...typography.caption,
    minHeight: 32,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.text,
  },
  stateBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.volt,
    borderWidth: 2,
    borderColor: colors.backgroundDeep,
  },
  check: {
    color: '#080A0C',
    fontSize: 12,
    fontWeight: '900',
  },
});
