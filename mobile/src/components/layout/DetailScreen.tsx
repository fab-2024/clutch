import { router } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { t } from '@/src/lib/i18n';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

import { Screen } from './Screen';

export function DetailScreen({ title, subtitle, eyebrow, children, loading, error, onRefresh }: PropsWithChildren<{
  title: string; subtitle?: string; eyebrow?: string; loading?: boolean; error?: string | null; onRefresh?: () => void;
}>) {
  return <Screen><ScrollView contentContainerStyle={detailStyles.content} showsVerticalScrollIndicator={false}
    refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(loading)} onRefresh={onRefresh} tintColor={colors.volt} /> : undefined}>
    <Button label={t('streak.back')} variant="ghost" leading={<ArrowLeft size={20} color={colors.text} />}
      onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
    <View style={detailStyles.intro}>
      {eyebrow ? <Text style={detailStyles.eyebrow}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={detailStyles.title}>{title}</Text>
      {subtitle ? <Text style={detailStyles.body}>{subtitle}</Text> : null}
    </View>
    {error ? <View accessibilityRole="alert" style={detailStyles.panel}><Text style={detailStyles.body}>{error}</Text>
      {onRefresh ? <Button label={t('common.retry')} variant="secondary" onPress={onRefresh} /> : null}</View> : null}
    {loading ? <ActivityIndicator accessibilityLabel={t('common.loading')} color={colors.volt} /> : null}
    {children}
  </ScrollView></Screen>;
}

export const detailStyles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  intro: { gap: spacing.sm },
  title: { ...typography.displayMedium, color: colors.text },
  eyebrow: { ...typography.eyebrow, color: colors.volt },
  heading: { ...typography.cardTitle, color: colors.text },
  body: { ...typography.bodyComfort, color: colors.textSecondary },
  meta: { ...typography.metadata, color: colors.textSecondary },
  accent: { ...typography.bodyComfortStrong, color: colors.volt },
  number: { ...typography.metricLarge, color: colors.text },
  panel: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.surfaceLow, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  fill: { flex: 1, minWidth: 0, gap: spacing.xs },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.sm, padding: spacing.sm, ...typography.bodyComfort, color: colors.text, backgroundColor: colors.surfaceInteractive },
});
