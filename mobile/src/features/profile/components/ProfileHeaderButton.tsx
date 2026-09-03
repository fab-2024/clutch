import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GriffProgress } from '@/src/components/ui/GriffProgress';
import PlayerAvatar from '@/src/features/profile/avatars/PlayerAvatar';
import { useProfileLevel } from '@/src/features/profile/hooks/useProfileLevel';
import { levelFromXp } from '@/src/features/profile/progression';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors, fonts, layout, typography } from '@/src/theme';

const PROFILE_AVATAR_SIZE = layout.headerControlHeight;
const PREVIEW_LEVEL = levelFromXp(200);

type ProfileHeaderButtonProps = {
  preview?: boolean;
  pseudo?: string;
};

export default function ProfileHeaderButton({
  preview = false,
  pseudo: pseudoOverride,
}: ProfileHeaderButtonProps = {}) {
  const { profile, session } = useAuth();
  const { equipped } = useCosmetics();
  const currentLevel = useProfileLevel(preview ? undefined : session?.user.id, profile?.pseudo);
  const level = preview ? PREVIEW_LEVEL : currentLevel;
  const pseudo = pseudoOverride
    || profile?.pseudo
    || session?.user.email?.split('@')[0]
    || (preview ? 'FabTheTap' : 'Supporter');
  const progressionLabel = level
    ? `Niveau ${level.level}, ${Math.round(level.progress * 100)} % vers le niveau ${level.level + 1}, ${level.remaining.toLocaleString('fr-FR')} XP restantes`
    : 'Progression de niveau en attente de synchronisation';

  return (
    <Pressable
      accessibilityHint={`${progressionLabel}. Affiche ton classement Ranked, tes badges, tes trophées et tes maillots.`}
      accessibilityLabel={`Ouvrir mon profil, ${pseudo}`}
      accessibilityRole="button"
      onPress={() => router.push(preview ? '/profile-preview' : '/my-profile')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      testID="profile-header-button"
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.avatar}
      >
        <PlayerAvatar
          avatarId={preview ? 'chaos-smile' : profile?.avatar_id}
          cosmetics={equipped}
          label={pseudo}
          size={PROFILE_AVATAR_SIZE}
        />
      </View>
      <View style={styles.copy}>
        <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={styles.pseudo}>{pseudo}</Text>
        <Text numberOfLines={1} style={styles.level}>NIV. {level?.level ?? '—'}</Text>
        <GriffProgress
          accessibilityLabel={progressionLabel}
          max={1}
          style={[styles.progress, !level && styles.progressPending]}
          value={level?.progress ?? 0}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minWidth: 0,
    minHeight: layout.headerControlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    flexShrink: 0,
  },
  copy: {
    minWidth: 0,
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  pseudo: {
    ...typography.bodyStrong,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 19,
    letterSpacing: 0.2,
  },
  level: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.3,
  },
  progress: {
    height: 4,
    marginTop: 1,
  },
  progressPending: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.66,
  },
});
