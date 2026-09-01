import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import PlayerAvatar from '@/src/features/profile/avatars/PlayerAvatar';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors, typography } from '@/src/theme';

const PROFILE_AVATAR_SIZE = 36;

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
  const pseudo = pseudoOverride
    || profile?.pseudo
    || session?.user.email?.split('@')[0]
    || (preview ? 'FabTheTap' : 'Supporter');

  return (
    <Pressable
      accessibilityHint="Affiche ton classement Ranked, tes badges, tes trophées et tes maillots."
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
        <Text numberOfLines={1} style={styles.label}>PROFIL</Text>
        <Text numberOfLines={1} style={styles.pseudo}>{pseudo}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minWidth: 0,
    minHeight: 52,
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
  },
  label: {
    ...typography.metadata,
    color: colors.volt,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.55,
  },
  pseudo: {
    ...typography.label,
    color: colors.text,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.1,
  },
  pressed: {
    opacity: 0.66,
  },
});
