import Languages from 'lucide-react-native/icons/languages';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/src/lib/i18n';
import { useI18n } from '@/src/lib/i18n/I18nProvider';
import type { LocalePreference } from '@/src/lib/i18n/preference';
import { useSnackbar } from '@/src/providers/SnackbarProvider';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

const OPTIONS: { value: LocalePreference; label: 'language.system' | 'language.french' | 'language.english'; detail?: 'language.systemDetail' }[] = [
  { value: 'system', label: 'language.system', detail: 'language.systemDetail' },
  { value: 'fr-FR', label: 'language.french' },
  { value: 'en-US', label: 'language.english' },
];

export default function LanguagePreferences({ onLocaleChange }: {
  onLocaleChange?: (locale: 'fr-FR' | 'en-US') => void;
}) {
  const { changePreference, locale, preference } = useI18n();
  const { showSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(false);

  async function choose(next: LocalePreference) {
    if (next === preference || busy) return;
    setBusy(true);
    try {
      const nextLocale = await changePreference(next);
      onLocaleChange?.(nextLocale);
    } catch {
      showSnackbar({ message: t('language.saveError'), tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return <View style={styles.card}>
    <View style={styles.intro}>
      <View style={styles.icon}><Languages color={colors.volt} size={20} strokeWidth={1.9} /></View>
      <View style={styles.copy}>
        <Text style={styles.title}>{t('language.title')}</Text>
        <Text style={styles.detail}>{t('language.detail')}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.current}>{t('language.current', {
          language: t(locale === 'fr-FR' ? 'language.french' : 'language.english'),
        })}</Text>
      </View>
    </View>
    <View accessibilityRole="radiogroup" style={styles.options}>
      {OPTIONS.map((option) => {
        const checked = preference === option.value;
        return <Pressable
          key={option.value}
          accessibilityLabel={t(option.label)}
          accessibilityRole="radio"
          accessibilityState={{ checked, disabled: busy }}
          disabled={busy}
          onPress={() => { void choose(option.value); }}
          style={({ pressed }) => [styles.option, checked && styles.optionActive, pressed && styles.pressed]}
        >
          <View style={[styles.radio, checked && styles.radioActive]}>{checked ? <View style={styles.radioDot} /> : null}</View>
          <View style={styles.copy}><Text style={[styles.optionLabel, checked && styles.optionLabelActive]}>{t(option.label)}</Text>
            {option.detail ? <Text style={styles.optionDetail}>{t(option.detail)}</Text> : null}</View>
        </Pressable>;
      })}
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
  optionDetail: { ...typography.caption, color: colors.textMuted },
  pressed: { opacity: 0.72 },
});
