import { router, useLocalSearchParams } from 'expo-router';
import Flame from 'lucide-react-native/icons/flame';
import { useCallback } from 'react';
import { Text, View } from 'react-native';

import { DetailScreen, detailStyles as styles } from '@/src/components/layout/DetailScreen';
import { Button } from '@/src/components/ui/Button';
import { formatDateTime, t } from '@/src/lib/i18n';
import { publicPseudo, SHARED_MILESTONES, showcasePath } from '@/src/lib/publicLinks';
import { useScreenResource } from '@/src/lib/useScreenResource';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme';

import { loadPublicMilestone } from '../api';
import type { PublicMilestone } from '../types';

export default function MilestoneLinkScreen({ previewData }: { previewData?: PublicMilestone } = {}) {
  const params = useLocalSearchParams<{ pseudo?: string; milestone?: string }>();
  const { session } = useAuth();
  const pseudo = previewData?.pseudo ?? publicPseudo(params.pseudo) ?? '';
  const milestone = previewData?.milestone ?? Number(params.milestone);
  return <MilestoneContent key={`${session?.user.id ?? 'anon'}:${pseudo}:${milestone}`} pseudo={pseudo} milestone={milestone} previewData={previewData} />;
}

function MilestoneContent({ pseudo, milestone, previewData }: { pseudo: string; milestone: number; previewData?: PublicMilestone }) {
  const load = useCallback(() => previewData ? Promise.resolve(previewData) : SHARED_MILESTONES.some((value) => value === milestone)
    ? loadPublicMilestone(pseudo, milestone) : Promise.resolve(null), [milestone, previewData, pseudo]);
  const { data, loading, error, refresh } = useScreenResource(load);
  return <DetailScreen title={data ? t('milestone.title', { count: data.milestone }) : t('streak.milestones')}
    eyebrow={t(previewData ? 'growth.preview' : data ? 'milestone.verified' : 'growth.eyebrow')} loading={loading} error={error} onRefresh={() => { void refresh(); }}>
    {data ? <View style={styles.panel}>
      <Flame color={colors.volt} size={64} /><Text style={styles.title}>{data.pseudo}</Text>
      <Text style={styles.body}>{t('milestone.description')}</Text>
      <Text style={styles.meta}>{t('milestone.earned', { date: formatDateTime(data.earnedAt) })}</Text>
      <Button label={t('showcase.social.open')} onPress={() => {
        const path = showcasePath(pseudo);
        if (previewData) router.push('/growth-preview?section=showcase' as never);
        else if (path) router.push(path as never);
      }} />
    </View> : !loading && !error ? <Text style={styles.body}>{t('milestone.unavailable')}</Text> : null}
  </DetailScreen>;
}
