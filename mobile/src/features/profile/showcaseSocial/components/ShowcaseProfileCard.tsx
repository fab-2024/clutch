import Eye from 'lucide-react-native/icons/eye';
import Heart from 'lucide-react-native/icons/heart';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import PlayerAvatar from '@/src/features/profile/avatars/PlayerAvatar';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import { formatNumber, t } from '@/src/lib/i18n';
import { colors, radius, spacing, typography } from '@/src/theme';

type Props = {
  pseudo: string;
  avatarId?: string | null;
  cosmetics?: EquippedCosmetics;
  subtitle?: string | null;
  views: number | null;
  likes: number | null;
  showViews?: boolean;
  liked?: boolean;
  busy?: boolean;
  onLike?: () => void;
  onProfile?: () => void;
};

export default function ShowcaseProfileCard({
  pseudo, avatarId, cosmetics, subtitle, views, likes, showViews = true,
  liked = false, busy = false, onLike, onProfile,
}: Props) {
  const identity = <>
    <PlayerAvatar avatarId={avatarId} cosmetics={cosmetics} label={pseudo} size={36} />
    <View style={styles.copy}>
      <Text numberOfLines={1} style={styles.name}>{pseudo}</Text>
      {subtitle ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  </>;
  const likeCount = <>
    <Heart size={17} color={liked ? colors.volt : colors.textMuted} fill={liked ? colors.volt : 'transparent'} />
    <Text accessibilityLiveRegion="polite" style={[styles.count, liked && styles.liked]}>
      {likes === null ? '— LIKES' : t('showcase.social.likes', { count: likes })}
    </Text>
    {onLike ? <Text style={styles.action}>{liked ? 'AIMÉ' : 'LIKER'}</Text> : null}
  </>;
  return <View style={styles.card} testID="showcase-profile-card">
    {onProfile ? <Pressable accessibilityRole="button" accessibilityLabel={`Voir le profil de ${pseudo}`}
      onPress={onProfile} style={styles.identity}>{identity}</Pressable>
      : <View style={styles.identity}>{identity}</View>}
    {showViews ? <View style={styles.stat} testID="showcase-views">
      <Eye size={17} color={colors.textMuted} />
      <Text style={styles.count}>{views === null ? '—' : formatNumber(views)} {views === 1 ? 'VUE' : 'VUES'}</Text>
    </View> : null}
    {onLike ? <Pressable accessibilityRole="checkbox" accessibilityLabel={t(liked ? 'showcase.social.unlike' : 'showcase.social.like')}
      accessibilityState={{ checked: liked, disabled: busy, busy }} aria-checked={liked} aria-busy={busy}
      disabled={busy} onPress={onLike} style={[styles.stat, styles.likeButton, liked && styles.likeSelected]}
      testID="showcase-like">{likeCount}</Pressable>
      : <View style={styles.stat} testID="showcase-like-count">{likeCount}</View>}
  </View>;
}

const styles = StyleSheet.create({
  card: { padding: spacing.sm, gap: 4, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(6,15,22,.88)' },
  identity: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  copy: { flex: 1, minWidth: 0 },
  name: { ...typography.bodyStrong, color: colors.text },
  subtitle: { ...typography.label, color: colors.textMuted },
  stat: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  count: { ...typography.label, color: colors.textMuted },
  liked: { color: colors.volt },
  action: { ...typography.label, color: colors.volt, marginLeft: 'auto' },
  likeButton: { minHeight: 44, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderStrong },
  likeSelected: { borderColor: colors.volt },
});
