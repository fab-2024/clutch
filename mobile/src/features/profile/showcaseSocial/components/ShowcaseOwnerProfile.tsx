import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ProfileData } from '@/src/features/profile/types';
import { GrowthError } from '@/src/lib/growthErrors';
import { useScreenResource } from '@/src/lib/useScreenResource';
import { colors, typography } from '@/src/theme';

import { loadPublicShowcase } from '../api';
import ShowcaseProfileCard from './ShowcaseProfileCard';

type Props = { profile: ProfileData | null; pseudo: string; ownerId?: string; preview: boolean };

export default function ShowcaseOwnerProfile({ profile, pseudo, ownerId, preview }: Props) {
  const load = useCallback(async () => {
    if (preview) return { views: 0, likes: 0 };
    if (!ownerId) throw new GrowthError('authentication_required');
    const result = await loadPublicShowcase(pseudo, ownerId, false);
    if (!result?.owner) throw new GrowthError('invalid_response');
    return result;
  }, [ownerId, preview, pseudo]);
  const { data, error, loading, refresh } = useScreenResource(load);
  return <View style={styles.root}>
    <ShowcaseProfileCard pseudo={profile?.pseudo ?? pseudo} avatarId={profile?.avatarId}
      cosmetics={profile?.cosmetics} subtitle={profile ? `NIV. ${profile.level.level}` : null}
      views={preview ? 0 : data?.views ?? null} likes={preview ? 0 : data?.likes ?? null}
      onProfile={() => router.push(preview ? '/profile-preview' : '/my-profile')} />
    {error ? <Pressable accessibilityRole="button" accessibilityLabel="Actualiser les vues et les likes"
      disabled={loading} onPress={() => { void refresh(); }} style={styles.retry}>
      <Text style={styles.retryText}>COMPTEURS INDISPONIBLES · RÉESSAYER</Text>
    </Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, maxWidth: 230, minWidth: 0 },
  retry: { minHeight: 44, justifyContent: 'center' },
  retryText: { ...typography.label, color: colors.textMuted },
});
