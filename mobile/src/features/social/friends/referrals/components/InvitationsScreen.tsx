import { router } from 'expo-router';
import Share2 from 'lucide-react-native/icons/share-2';
import Users from 'lucide-react-native/icons/users';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { DetailScreen, detailStyles as styles } from '@/src/components/layout/DetailScreen';
import { Button } from '@/src/components/ui/Button';
import { publicAppUrl } from '@/src/config/release';
import { GrowthError, growthError } from '@/src/lib/growthErrors';
import { formatDateTime, formatNumber, t } from '@/src/lib/i18n';
import { invitationCode } from '@/src/lib/publicLinks';
import { sharePublicLink } from '@/src/lib/share';
import { useScreenResource } from '@/src/lib/useScreenResource';
import { useAuth } from '@/src/providers/AuthProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { useSnackbar } from '@/src/providers/SnackbarProvider';
import { colors } from '@/src/theme';

import { createInvitation, loadInvitations, recordInvitationShare } from '../api';
import { newShareOperation } from '../installation';
import type { ReferralDashboard } from '../types';

export default function InvitationsScreen({ previewData }: { previewData?: ReferralDashboard } = {}) {
  const { session } = useAuth();
  return <InvitationsContent key={previewData ? 'preview' : session?.user.id ?? 'signed-out'} ownerId={session?.user.id} previewData={previewData} />;
}

function InvitationsContent({ ownerId, previewData }: { ownerId?: string; previewData?: ReferralDashboard }) {
  const load = useCallback(async () => {
    if (previewData) return previewData;
    if (!ownerId) throw new GrowthError('authentication_required');
    return loadInvitations(ownerId);
  }, [ownerId, previewData]);
  const { data, setData, error, setError, loading, refresh, mounted } = useScreenResource(load);
  const [busy, setBusy] = useState(false);
  const [shareMessage, setShareMessage] = useState(() => t('invite.shareMessage'));
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const lock = useRef(false);
  const { showSnackbar } = useSnackbar();
  const { refresh: refreshEconomy } = useEconomy();
  const link = data?.code ? publicAppUrl(`/i/${data.code}`) : null;
  useEffect(() => { if (data && !previewData) void refreshEconomy(); }, [data, previewData, refreshEconomy]);

  async function create() {
    if (lock.current || !data || !ownerId) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const code = await createInvitation(ownerId);
      if (mounted.current) setData({ ...data, code });
    } catch (caught) { if (mounted.current) setError(growthError(caught)); }
    finally { if (mounted.current) { lock.current = false; setBusy(false); } }
  }

  async function share() {
    if (lock.current || !data) return;
    if (previewData) { showSnackbar({ message: t('growth.preview'), tone: 'info' }); return; }
    if (!link || !ownerId) { setError(t('growth.error.config')); return; }
    lock.current = true; setBusy(true); setError(null);
    try {
      const operation = newShareOperation();
      const outcome = await sharePublicLink(t('invite.title'), shareMessage.trim() || t('invite.shareMessage'), link);
      if (!mounted.current || outcome === 'dismissed') return;
      showSnackbar({ message: t(outcome === 'copied' ? 'growth.share.copied' : 'growth.share.shared'), tone: 'success' });
      try {
        const recorded = await recordInvitationShare(operation, ownerId);
        if (mounted.current) {
          if (recorded) setData((current) => current ? { ...current, shares: current.shares + 1 } : current);
          else setError(t('invite.shareUncounted'));
        }
      } catch { if (mounted.current) setError(t('invite.shareUncounted')); }
    } catch (caught) { if (mounted.current) setError(growthError(caught)); }
    finally { if (mounted.current) { lock.current = false; setBusy(false); } }
  }

  function openCode() {
    const code = invitationCode(codeInput);
    if (!code) { setCodeError(t('invite.error.invalid')); return; }
    setCodeError(null);
    if (previewData) { showSnackbar({ message: t('growth.preview'), tone: 'info' }); return; }
    router.push(`/i/${code}` as never);
  }

  return <DetailScreen title={t('invite.title')} subtitle={t('invite.description')}
    eyebrow={t(previewData ? 'growth.preview' : 'growth.eyebrow')} loading={loading} error={error}
    onRefresh={() => { if (!lock.current) void refresh(); }}>
    {data ? <>
      <View style={styles.panel}>
        <Users size={36} color={colors.volt} />
        <Text style={styles.title}>{t('invite.reward', { count: data.reward })}</Text>
        <Text style={styles.body}>{t('invite.rewardRule')}</Text>
        <Text style={styles.meta}>{t('invite.cap', { daily: data.dailyCap, monthly: data.monthlyCap })}</Text>
        <Text style={styles.meta}>{t('invite.welcome')}</Text>
        <Text style={styles.accent}>{t('invite.progress', { day: data.rewardedToday, daily: data.dailyCap, month: data.rewardedThisMonth, monthly: data.monthlyCap })}</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>{t('invite.link')}</Text>
        {data.code ? <>
          {link && !previewData ? <Text selectable style={styles.body} testID="invitation-public-link">{link}</Text> : <Text style={styles.meta}>{t(previewData ? 'growth.preview' : 'growth.error.config')}</Text>}
          <Text style={styles.eyebrow}>{t('invite.messageLabel')}</Text>
          <TextInput accessibilityLabel={t('invite.messageLabel')} accessibilityHint={t('invite.messageHint')}
            multiline maxLength={280} value={shareMessage} onChangeText={setShareMessage} editable={!busy}
            style={[styles.input, invitationStyles.message]} testID="invitation-share-message" />
          <Text style={styles.meta}>{t('invite.messageHint')}</Text>
          <Button fullWidth label={t('growth.share')} disabled={busy || (!link && !previewData)} loading={busy}
            leading={<Share2 size={20} color={colors.background} />} onPress={() => { void share(); }} />
          <Text selectable style={styles.meta}>{data.code}</Text>
        </> : <Button fullWidth label={t('invite.create')} loading={busy} onPress={() => { void create(); }} />}
        <Text style={styles.meta}>{t('invite.recover')}</Text>
      </View>
      <View style={[styles.panel, styles.row]}>
        <Metric value={data.shares} label={t('invite.shares')} /><Metric value={data.registered} label={t('invite.registered')} />
        <Metric value={data.active} label={t('invite.active')} /><Metric value={data.volts} label={t('invite.volts')} />
      </View>
      <View style={styles.panel}>
        <Text style={styles.heading}>{t('invite.history')}</Text>
        <Text style={styles.meta}>{t('invite.historyPrivacy')}</Text>
        {!data.history.length ? <Text style={styles.body}>{t('invite.empty')}</Text> : data.history.map((item) => <View key={item.id} style={styles.intro}>
          <Text style={styles.meta}>{t('invite.historyRow', { date: formatDateTime(item.registeredAt) })}</Text>
          <Text style={styles.accent}>{t(item.activatedAt ? `invite.status.${item.reward}` : 'invite.status.registered', { count: data.reward })}</Text>
        </View>)}
      </View>
      {!data.alreadyReferred ? <View style={styles.panel}>
        <Text style={styles.eyebrow}>{t('invite.codeLabel')}</Text>
        <TextInput accessibilityLabel={t('invite.codePlaceholder')} placeholder={t('invite.codePlaceholder')}
          placeholderTextColor={colors.textSecondary} autoCapitalize="none" autoCorrect={false} maxLength={350}
          value={codeInput} onChangeText={(value) => { setCodeInput(value); setCodeError(null); }}
          onSubmitEditing={openCode} returnKeyType="go" style={styles.input} testID="invitation-code-input" />
        {codeError ? <Text accessibilityRole="alert" style={styles.body}>{codeError}</Text> : null}
        <Button label={t('invite.codeOpen')} variant="secondary" onPress={openCode} disabled={!codeInput.trim()} />
      </View> : null}
      <View style={styles.panel}><Text style={styles.meta}>{t('invite.newAccount')}</Text><Text style={styles.meta}>{t('invite.security')}</Text></View>
    </> : null}
  </DetailScreen>;
}

function Metric({ value, label }: { value: number; label: string }) {
  return <View style={[styles.fill, invitationStyles.metric]}><Text style={styles.number}>{formatNumber(value)}</Text><Text style={styles.meta}>{label}</Text></View>;
}

const invitationStyles = StyleSheet.create({
  metric: { flexBasis: '42%', minWidth: 100 },
  message: { minHeight: 120, textAlignVertical: 'top' },
});
