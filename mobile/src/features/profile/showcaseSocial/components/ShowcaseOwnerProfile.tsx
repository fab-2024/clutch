import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { ProfileData } from '@/src/features/profile/types';
import { spacing } from '@/src/theme';

import ShowcaseProfileCard from './ShowcaseProfileCard';

type Props = { profile: ProfileData | null; pseudo: string; ownerId?: string; preview: boolean };

export default function ShowcaseOwnerProfile({ profile, pseudo, preview }: Props) {
  return <View style={styles.root}>
    <ShowcaseProfileCard pseudo={profile?.pseudo ?? pseudo} avatarId={profile?.avatarId}
      cosmetics={profile?.cosmetics} subtitle={profile ? `NIV. ${profile.level.level}` : null}
      views={null} likes={null} showViews={false} showLikes={false}
      onProfile={() => router.push(preview ? '/profile-preview' : '/my-profile')} />
  </View>;
}

const styles = StyleSheet.create({
  root: { maxWidth: 230, minWidth: 168, padding: spacing.xs },
});
