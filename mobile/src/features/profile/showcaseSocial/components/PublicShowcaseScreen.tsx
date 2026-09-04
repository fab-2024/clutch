import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import Activity from 'lucide-react-native/icons/activity';
import Flame from 'lucide-react-native/icons/flame';
import Heart from 'lucide-react-native/icons/heart';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { DetailScreen, detailStyles as styles } from '@/src/components/layout/DetailScreen';
import { Button } from '@/src/components/ui/Button';
import { publicAppUrl } from '@/src/config/release';
import { rememberPendingRoute } from '@/src/features/auth/pendingRoute';
import PlayerAvatar from '@/src/features/profile/avatars/PlayerAvatar';
import ProfileSafetyActions from '@/src/features/safety/components/ProfileSafetyActions';
import { atelierProductById } from '@/src/features/shop/atelierCatalog';
import { cosmeticPackItemById } from '@/src/features/shop/teamPackCatalog';
import type { EquippedCosmetic } from '@/src/features/shop/types';
import { GrowthError, growthError } from '@/src/lib/growthErrors';
import { formatDateTime, formatNumber, t } from '@/src/lib/i18n';
import { publicPseudo, showcasePath } from '@/src/lib/publicLinks';
import { sharePublicLink } from '@/src/lib/share';
import { useScreenResource } from '@/src/lib/useScreenResource';
import { useAuth } from '@/src/providers/AuthProvider';
import { useSnackbar } from '@/src/providers/SnackbarProvider';
import { colors, radius, spacing } from '@/src/theme';

import { loadPublicShowcase, setShowcaseLike } from '../api';
import { optimisticLike } from '../model';
import type { PublicShowcase } from '../types';

export default function PublicShowcaseScreen({ previewData }: { previewData?: PublicShowcase } = {}) {
  const params = useLocalSearchParams<{ pseudo?: string }>();
  const { session } = useAuth();
  const pseudo = previewData?.pseudo ?? publicPseudo(params.pseudo) ?? '';
  const viewerId = session?.user.id;
  const confirmed = Boolean(session && !session.user.is_anonymous && (session.user.email_confirmed_at || session.user.phone_confirmed_at));
  return <ShowcaseContent key={`${previewData ? 'preview' : viewerId ?? 'anon'}:${pseudo}`} pseudo={pseudo} viewerId={viewerId}
    confirmed={confirmed} previewData={previewData} />;
}

function ShowcaseContent({ pseudo, viewerId, confirmed, previewData }: { pseudo: string; viewerId?: string; confirmed: boolean; previewData?: PublicShowcase }) {
  const load = useCallback(() => previewData ? Promise.resolve(previewData) : loadPublicShowcase(pseudo, viewerId, confirmed), [confirmed, previewData, pseudo, viewerId]);
  const { data, setData, error, setError, loading, refresh, mounted } = useScreenResource(load);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const { showSnackbar } = useSnackbar();
  const hide = useCallback(() => { setData(null); }, [setData]);

  async function like() {
    if (!data?.canLike || lock.current || !viewerId && !previewData) return;
    const previous = data;
    const next = !data.liked;
    if (previewData) { setData(optimisticLike(data, next)); return; }
    lock.current = true; setBusy(true); setError(null);
    setData(optimisticLike(data, next));
    try {
      const result = await setShowcaseLike(pseudo, next, viewerId!);
      if (mounted.current) setData(result);
    } catch (caught) { if (mounted.current) { setData(previous); setError(growthError(caught)); } }
    finally { if (mounted.current) { lock.current = false; setBusy(false); } }
  }

  async function share() {
    if (!data || lock.current) return;
    if (previewData) { showSnackbar({ message: t('growth.preview'), tone: 'info' }); return; }
    lock.current = true; setBusy(true); setError(null);
    try {
      const path = showcasePath(pseudo);
      const url = path ? publicAppUrl(path) : null;
      if (!url) throw new GrowthError('public_origin_missing');
      const outcome = await sharePublicLink(t('showcase.social.title'), t('showcase.social.shareMessage'), url);
      if (mounted.current && outcome === 'copied') showSnackbar({ message: t('growth.share.copied'), tone: 'success' });
    } catch (caught) { if (mounted.current) setError(growthError(caught)); }
    finally { if (mounted.current) { lock.current = false; setBusy(false); } }
  }

  async function login() {
    try {
      const path = showcasePath(pseudo);
      if (path) await rememberPendingRoute(path);
      if (mounted.current) router.push('/login');
    } catch { if (mounted.current) setError(t('growth.error.storage')); }
  }

  return <DetailScreen title={t('showcase.social.title')} eyebrow={t(previewData ? 'growth.preview' : 'growth.eyebrow')}
    loading={loading} error={error} onRefresh={() => { if (!lock.current) void refresh(); }}>
    {!data && !loading && !error ? <View style={styles.panel}><Text style={styles.body}>{t('showcase.social.unavailable')}</Text></View> : null}
    {data ? <>
      <TemporaryEffects data={data} />
      <ShowcaseIdentity data={data} />
      <View style={[styles.panel, styles.row]}>
        <View style={styles.fill}><Text accessibilityLiveRegion="polite" style={styles.heading}>{t('showcase.social.likes', { count: data.likes })}</Text></View>
        {data.canLike ? <Pressable accessibilityRole="checkbox" accessibilityLabel={t(data.liked ? 'showcase.social.unlike' : 'showcase.social.like')}
          aria-checked={data.liked} aria-busy={busy}
          accessibilityState={{ checked: data.liked, disabled: busy, busy }} disabled={busy} onPress={() => { void like(); }} testID="showcase-like"
          style={[artStyles.like, data.liked && artStyles.liked]}>
          <Heart size={20} color={colors.volt} fill={data.liked ? colors.volt : 'transparent'} />
          <Text style={styles.accent}>{t(data.liked ? 'showcase.social.unlike' : 'showcase.social.like')}</Text>
        </Pressable> : !viewerId && !previewData ? <Button label={t('growth.login')} variant="secondary" onPress={() => { void login(); }} /> : null}
      </View>
      {data.owner ? <Button fullWidth variant="secondary" label={t('showcase.social.entry')}
        onPress={() => router.push((previewData ? '/growth-preview?section=activity' : '/showcase-activity') as never)} /> : null}
      {data.publicProfile && data.preferences.visibility === 'publique' ? <Button fullWidth disabled={busy} label={t('growth.share')} variant="secondary" onPress={() => { void share(); }} /> : null}
      <ShowcaseEquipment data={data} />
      {!data.owner && viewerId && !previewData ? <ProfileSafetyActions pseudo={pseudo} onBlocked={hide} /> : null}
    </> : null}
  </DetailScreen>;
}

export function ShowcaseIdentity({ data }: { data: PublicShowcase }) {
  const profilePulse = data.effects.some((effect) => effect.type === 'profile_pulse' && Date.parse(effect.activeUntil) > Date.now());
  const spotlight = data.effects.some((effect) => effect.type === 'showcase_spotlight' && Date.parse(effect.activeUntil) > Date.now());
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!profilePulse || reduceMotion) {
      pulse.value = reduceMotion && profilePulse ? 0.45 : 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1_800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [profilePulse, pulse, reduceMotion]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: profilePulse && !reduceMotion ? 0.94 + pulse.value * 0.06 : 1,
    transform: profilePulse && !reduceMotion ? [{ scale: 0.994 + pulse.value * 0.006 }] : [],
  }));
  const accent = profilePulse ? '#E879F9' : spotlight ? colors.volt : data.cosmetics.profileCard?.accent ?? colors.info;
  return <Animated.View style={pulseStyle} testID={profilePulse ? 'profile-pulse-active' : undefined}>
    <LinearGradient colors={profilePulse ? ['rgba(232,121,249,.22)', colors.backgroundDeep]
      : spotlight ? ['rgba(223,255,31,.16)', colors.backgroundDeep] : [colors.surfaceRaised, colors.backgroundDeep]}
      style={[styles.panel, { borderColor: accent }]}>
    <View style={styles.row}>
      <PlayerAvatar avatarId={data.avatarId} cosmetics={data.cosmetics} label={data.pseudo} size={96} />
      <View style={styles.fill}><Text style={styles.title}>{data.pseudo}</Text>
        {data.title || data.cosmetics.title ? <Text style={styles.accent}>{data.cosmetics.title?.name ?? data.title}</Text> : null}
        {data.team ? <Text style={styles.meta}>{data.team}</Text> : null}
      </View>
    </View>
    {data.ranking ? <View style={styles.row}><Text style={styles.number}>{formatNumber(data.ranking.frags)}</Text>
      <View style={styles.fill}><Text style={styles.eyebrow}>{t('showcase.social.frags')}</Text>
        {data.ranking.label ? <Text style={styles.heading}>{data.ranking.label}</Text> : null}
        {data.ranking.rank !== null ? <Text style={styles.meta}>#{formatNumber(data.ranking.rank)}</Text> : null}</View></View> : null}
    {data.streak?.current != null || data.streak?.best != null ? <View style={styles.row}>
      <Flame color={colors.volt} size={28} /><View style={styles.fill}>
        <Text style={styles.eyebrow}>{t('showcase.social.streak')}</Text>
        {data.streak.current != null ? <Text style={styles.heading}>{t('streak.days', { count: data.streak.current })}</Text> : null}
        {data.streak.best != null ? <Text style={styles.meta}>{t('showcase.social.best', { count: data.streak.best })}</Text> : null}
      </View></View> : null}
      {data.streak?.milestone ? <Text style={styles.accent}>{t('milestone.title', { count: data.streak.milestone })}</Text> : null}
    </LinearGradient>
  </Animated.View>;
}

function TemporaryEffects({ data }: { data: PublicShowcase }) {
  const active = data.effects.filter((effect) => Date.parse(effect.activeUntil) > Date.now());
  if (!active.length) return null;
  return <View style={artStyles.effects}>{active.map((effect) => {
    const spotlight = effect.type === 'showcase_spotlight';
    const Icon = spotlight ? Sparkles : Activity;
    const accent = spotlight ? colors.volt : '#E879F9';
    return <View key={effect.type} style={[artStyles.effect, { borderColor: accent }]}>
      <Icon color={accent} size={18} />
      <View style={styles.fill}><Text style={[styles.accent, { color: accent }]}>{t(spotlight ? 'consumables.effect.spotlight' : 'consumables.effect.profilePulse')}</Text>
        <Text style={styles.meta}>{t('consumables.effect.until', { date: formatDateTime(effect.activeUntil) })}</Text></View>
    </View>;
  })}</View>;
}

function ShowcaseEquipment({ data }: { data: PublicShowcase }) {
  const c = data.cosmetics;
  const items = [c.frame, c.title, c.core, c.profileCard, c.factionEffect, ...Object.values(c.showcase)]
    .filter((item): item is EquippedCosmetic => Boolean(item));
  return <View style={styles.intro}>
    <Text style={styles.heading}>{t('showcase.social.equipped')}</Text>
    {!items.length ? <View style={styles.panel}><Text style={styles.body}>{t('showcase.social.empty')}</Text></View>
      : <View style={artStyles.grid}>{items.map((item) => {
        const image = cosmeticPackItemById(item.id)?.image ?? atelierProductById(item.id)?.image;
        return <View key={item.id} style={[artStyles.item, { borderColor: item.accent }]}>
          {image ? <Image accessibilityIgnoresInvertColors accessible accessibilityLabel={item.name} source={image} resizeMode="contain" style={artStyles.itemImage} /> : null}
          <Text style={styles.heading}>{item.name}</Text><Text style={styles.meta}>{item.description}</Text>
        </View>;
      })}</View>}
  </View>;
}

const artStyles = StyleSheet.create({
  effects: { gap: spacing.sm },
  effect: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceLow, borderWidth: 1 },
  like: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.sm },
  liked: { borderColor: colors.volt, backgroundColor: colors.surfaceRaised },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: { flexBasis: '47%', flexGrow: 1, minWidth: 135, borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.surfaceLow, padding: spacing.sm, gap: spacing.sm },
  itemImage: { width: '100%', aspectRatio: 1 },
});
