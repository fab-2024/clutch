import { router, useLocalSearchParams } from 'expo-router';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { DetailScreen, detailStyles as styles } from '@/src/components/layout/DetailScreen';
import { Button } from '@/src/components/ui/Button';
import { rememberPendingRoute } from '@/src/features/auth/pendingRoute';
import { notifyCallStreakChanged } from '@/src/features/retention/events';
import { growthError } from '@/src/lib/growthErrors';
import { t } from '@/src/lib/i18n';
import { INVITATION_CODE, showcasePath } from '@/src/lib/publicLinks';
import { useScreenResource } from '@/src/lib/useScreenResource';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme';

import { acceptInvitation, loadInvitation } from '../api';

export default function InvitationLinkScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { session } = useAuth();
  const validCode = typeof code === 'string' && INVITATION_CODE.test(code) ? code : '';
  return <InvitationContent key={`${session?.user.id ?? 'anon'}:${validCode}`} ownerId={session?.user.id} code={validCode} />;
}

function InvitationContent({ code, ownerId }: { code: string; ownerId?: string }) {
  const load = useCallback(() => loadInvitation(code), [code]);
  const { data, error, setError, loading, refresh, mounted } = useScreenResource(load);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  async function accept() {
    if (lock.current || !data) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      if (!ownerId) {
        await rememberPendingRoute(`/i/${code}`);
        if (mounted.current) router.push('/login');
      } else {
        await acceptInvitation(code, ownerId);
        if (mounted.current) { setAccepted(true); notifyCallStreakChanged(); }
      }
    } catch (caught) { if (mounted.current) setError(growthError(caught)); }
    finally { if (mounted.current) { lock.current = false; setBusy(false); } }
  }

  return <DetailScreen title={t('invite.incoming')} eyebrow={t('growth.eyebrow')} loading={loading} error={error}
    onRefresh={() => { if (!lock.current) void refresh(); }}>
    {!loading && !data && !error ? <Text style={styles.body}>{t('invite.error.invalid')}</Text> : null}
    {data ? <View style={styles.panel}>
      <ShieldCheck size={44} color={colors.volt} />
      <Text style={styles.heading}>{data.inviter ? t('invite.from', { pseudo: data.inviter }) : t('invite.fromPrivate')}</Text>
      <Text style={styles.body}>{t('invite.welcome')}</Text>
      <Text style={styles.body}>{t('invite.newAccount')}</Text>
      <Text style={styles.meta}>{t('invite.referrerReward', { count: data.reward })}</Text>
      {accepted ? <><Text accessibilityLiveRegion="polite" style={styles.accent}>{t('invite.accepted')}</Text>
        <Button label={t('streak.matches')} onPress={() => router.push('/(tabs)/matches')} /></>
        : <Button fullWidth loading={busy} label={t(ownerId ? 'invite.accept' : 'growth.login')} onPress={() => { void accept(); }} />}
      <Text selectable style={styles.meta}>{code}</Text>
      <Text style={styles.meta}>{t('invite.recover')}</Text>
      {data.inviter ? <Button label={t('showcase.social.open')} variant="secondary" onPress={() => {
        const path = showcasePath(data.inviter ?? '');
        if (path) router.push(path as never);
      }} /> : null}
    </View> : null}
  </DetailScreen>;
}
