import { router } from 'expo-router';
import Eye from 'lucide-react-native/icons/eye';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { DetailScreen, detailStyles as styles } from '@/src/components/layout/DetailScreen';
import { Button } from '@/src/components/ui/Button';
import { GrowthError, growthError } from '@/src/lib/growthErrors';
import { formatNumber, t } from '@/src/lib/i18n';
import { showcasePath } from '@/src/lib/publicLinks';
import { useScreenResource } from '@/src/lib/useScreenResource';
import { useAuth } from '@/src/providers/AuthProvider';
import { useSnackbar } from '@/src/providers/SnackbarProvider';
import { colors } from '@/src/theme';

import { loadPublicShowcase, saveShowcasePreferences } from '../api';
import type { PublicShowcase, ShowcasePreferences, ShowcaseVisibility } from '../types';

export default function ShowcaseActivityScreen({ previewData }: { previewData?: PublicShowcase } = {}) {
  const { profile, session } = useAuth();
  return <ActivityContent key={previewData ? 'preview' : `${session?.user.id}:${profile?.pseudo}`} ownerId={session?.user.id}
    pseudo={profile?.pseudo} previewData={previewData} />;
}

function ActivityContent({ ownerId, pseudo, previewData }: { ownerId?: string; pseudo?: string; previewData?: PublicShowcase }) {
  const load = useCallback(async () => {
    if (previewData) return previewData;
    if (!ownerId || !pseudo) throw new GrowthError('authentication_required');
    const result = await loadPublicShowcase(pseudo, ownerId, false);
    if (!result?.owner) throw new GrowthError('invalid_response');
    return result;
  }, [ownerId, previewData, pseudo]);
  const { data, setData, error, setError, loading, refresh, mounted } = useScreenResource(load);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const { showSnackbar } = useSnackbar();

  async function save(preferences: ShowcasePreferences) {
    if (lock.current || !data) return;
    if (previewData) { setData({ ...data, preferences }); showSnackbar({ message: t('growth.preview'), tone: 'info' }); return; }
    if (!ownerId) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const result = await saveShowcasePreferences(preferences, ownerId);
      if (!result?.owner) throw new GrowthError('invalid_response');
      if (mounted.current) { setData(result); showSnackbar({ message: t('showcase.social.saved'), tone: 'success' }); }
    } catch (caught) { if (mounted.current) setError(growthError(caught)); }
    finally { if (mounted.current) { lock.current = false; setBusy(false); } }
  }

  return <DetailScreen title={t('showcase.social.ownerTitle')} eyebrow={t(previewData ? 'growth.preview' : 'growth.eyebrow')}
    loading={loading} error={error} onRefresh={() => { if (!lock.current) void refresh(); }}>
    {data ? <>
      <View style={styles.panel}>
        <Eye color={colors.volt} size={30} />
        <View style={styles.row}><View style={styles.fill}><Text style={styles.number}>{formatNumber(data.views ?? 0)}</Text><Text style={styles.meta}>{t('showcase.social.views')}</Text></View>
          <View style={styles.fill}><Text style={styles.number}>{formatNumber(data.weeklyViews ?? 0)}</Text><Text style={styles.meta}>{t('showcase.social.week')}</Text></View></View>
        <Text style={styles.accent}>{t('showcase.social.likes', { count: data.likes })}</Text>
        {data.weeklyViews !== null && data.previousWeeklyViews !== null ? <Text style={styles.meta}>{t('showcase.social.weekTrend', {
          delta: `${data.weeklyViews >= data.previousWeeklyViews ? '+' : '−'}${formatNumber(Math.abs(data.weeklyViews - data.previousWeeklyViews))}`,
        })}</Text> : null}
        <Text style={styles.meta}>{t('showcase.social.viewsPrivacy')}</Text>
      </View>
      <PreferencesForm key={JSON.stringify(data.preferences)} preferences={data.preferences} busy={busy} onSave={save} />
      {!data.publicProfile ? <View style={styles.panel}><Text style={styles.body}>{t('showcase.social.profilePrivate')}</Text>
        <Button label={t('showcase.social.settings')} variant="secondary" onPress={() => router.push(previewData ? '/settings-preview' : '/settings/profile')} /></View> : null}
      <Button fullWidth label={t('showcase.social.open')} variant="secondary" onPress={() => {
        const path = showcasePath(data.pseudo);
        if (previewData) router.push('/growth-preview?section=showcase' as never);
        else if (path) router.push(path as never);
      }} />
      <Button fullWidth label={t('showcase.social.edit')} onPress={() => router.push(previewData ? '/showcase-preview' : '/showcase')} />
    </> : null}
  </DetailScreen>;
}

function PreferencesForm({ preferences, busy, onSave }: { preferences: ShowcasePreferences; busy: boolean; onSave: (value: ShowcasePreferences) => Promise<void> }) {
  const [draft, setDraft] = useState(preferences);
  const choices: ShowcaseVisibility[] = ['publique', 'cercle', 'privee'];
  return <View style={styles.panel}>
    <Text style={styles.heading}>{t('showcase.social.visibility')}</Text>
    {choices.map((visibility) => <Pressable key={visibility} accessibilityRole="radio" aria-checked={draft.visibility === visibility}
      accessibilityState={{ checked: draft.visibility === visibility, disabled: busy }}
      disabled={busy} onPress={() => setDraft({ ...draft, visibility })} style={[styles.input, styles.row, draft.visibility === visibility && { borderColor: colors.volt }]}>
      <Text style={draft.visibility === visibility ? styles.accent : styles.body}>{t(`showcase.social.visibility.${visibility}`)}</Text>
    </Pressable>)}
    {(['showRank', 'showStreak', 'showMilestones', 'likeNotifications'] as const).map((field) => {
      const label = t(field === 'likeNotifications' ? 'showcase.social.notifications' : `showcase.social.${field}`);
      return <View key={field} style={styles.row}><Text style={[styles.body, styles.fill]}>{label}</Text>
        <Switch accessibilityLabel={label} disabled={busy} value={draft[field]} trackColor={{ false: colors.borderStrong, true: colors.volt }}
          thumbColor={draft[field] ? colors.background : colors.text} onValueChange={(value) => setDraft({ ...draft, [field]: value })} /></View>;
    })}
    <Text style={styles.meta}>{t('showcase.social.notificationsRule')}</Text>
    <Button fullWidth label={t('showcase.social.save')} loading={busy} disabled={JSON.stringify(draft) === JSON.stringify(preferences)} onPress={() => { void onSave(draft); }} />
  </View>;
}
