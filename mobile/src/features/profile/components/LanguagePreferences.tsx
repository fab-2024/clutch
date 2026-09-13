import Languages from 'lucide-react-native/icons/languages';
import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/src/lib/i18n';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

export default function LanguagePreferences() {
  return <View style={styles.card}>
    <View style={styles.intro}>
      <View style={styles.icon}><Languages color={colors.volt} size={20} strokeWidth={1.9} /></View>
      <View style={styles.copy}>
        <Text style={styles.title}>{t('language.title')}</Text>
        <Text style={styles.detail}>{t('language.detail')}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.current}>{t('language.current', { language: t('language.french') })}</Text>
      </View>
    </View>
    <View style={styles.options}>
      <View accessibilityLabel={t('language.french')} accessibilityRole="text" style={[styles.option, styles.optionActive]}>
        <View style={[styles.radio, styles.radioActive]}><View style={styles.radioDot} /></View>
        <View style={styles.copy}><Text style={[styles.optionLabel, styles.optionLabelActive]}>{t('language.french')}</Text></View>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.borderSubtle },
  intro: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  icon: { width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.surfaceRaised },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { ...typography.bodyStrong, color: colors.text },
  detail: { ...typography.caption, color: colors.textSecondary },
  current: { ...typography.metadata, color: colors.volt },
  options: { padding: spacing.sm, gap: spacing.xs },
  option: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.sm },
  optionActive: { backgroundColor: colors.surfaceRaised },
  radio: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  radioActive: { borderColor: colors.volt },
  radioDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.volt },
  optionLabel: { ...typography.action, color: colors.textSecondary },
  optionLabelActive: { color: colors.text },
});
