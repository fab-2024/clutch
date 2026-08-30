import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/src/theme';
import { SHOWCASE_PRESENTER_CATALOG } from '@/src/features/shop/showcasePresenterCatalog';
import type { ShowcaseRankDisplayDefinition } from '@/src/features/shop/showcaseRankDisplayCatalog';

import {
  SHOWCASE_CUSTOMIZABLE_LIGHTINGS,
  SHOWCASE_LIGHTING_VISUALS,
} from './showcaseLighting';
import type { ShowcaseLighting, ShowcaseRoomTheme } from './types';

type ShowcaseCustomizationBarProps = {
  lighting: ShowcaseLighting;
  onLightingChange: (value: ShowcaseLighting) => void;
  onPresenterChange: (value: string) => void;
  onRankDisplayChange: (value: string) => void;
  onThemeChange: (value: ShowcaseRoomTheme) => void;
  presenterId: string;
  rankDisplayDisabled?: boolean;
  rankDisplayId: string;
  rankDisplays: readonly Pick<ShowcaseRankDisplayDefinition, 'accent' | 'id' | 'name'>[];
  theme: ShowcaseRoomTheme;
};

type ShowcaseControlVariant = 'pedestal' | 'presenter' | 'rank' | 'theme' | 'lighting';

const PRESENTERS = SHOWCASE_PRESENTER_CATALOG.map((presenter) => ({
  color: presenter.accent,
  label: presenter.name.toUpperCase(),
  value: presenter.id,
}));

const THEMES: { color: string; label: string; value: ShowcaseRoomTheme }[] = [
  { color: '#161C22', label: 'GRAPHITE', value: 'graphite' },
  { color: '#5A4438', label: 'MUSÉE', value: 'museum' },
  { color: '#173A55', label: 'AZUR', value: 'azure' },
];

const LIGHTS = SHOWCASE_CUSTOMIZABLE_LIGHTINGS.map((value) => ({
  color: SHOWCASE_LIGHTING_VISUALS[value].glow,
  label: SHOWCASE_LIGHTING_VISUALS[value].label,
  value,
}));

export default function ShowcaseCustomizationBar({
  lighting,
  onLightingChange,
  onPresenterChange,
  onRankDisplayChange,
  onThemeChange,
  presenterId,
  rankDisplayDisabled = false,
  rankDisplayId,
  rankDisplays,
  theme,
}: ShowcaseCustomizationBarProps) {
  const rankDisplayOptions = rankDisplays.map((display) => ({
    color: display.accent,
    label: display.name.toUpperCase(),
    value: display.id,
  }));

  return (
    <View style={styles.root}>
      <Text style={styles.title}>PERSONNALISER</Text>
      <ScrollView contentContainerStyle={styles.groups} horizontal showsHorizontalScrollIndicator={false}>
        <ShowcaseControlGroup label="PRÉSENTOIR" onChange={onPresenterChange} options={PRESENTERS} selected={presenterId} variant="presenter" />
        <ShowcaseControlGroup disabled={rankDisplayDisabled} label="ÉCRIN DU RANG" onChange={onRankDisplayChange} options={rankDisplayOptions} selected={rankDisplayId} variant="rank" />
        <ShowcaseControlGroup label="THÈME DE VITRINE" onChange={onThemeChange} options={THEMES} selected={theme} variant="theme" />
        <ShowcaseControlGroup label="COULEUR D’ÉCLAIRAGE" onChange={onLightingChange} options={LIGHTS} selected={lighting} variant="lighting" />
      </ScrollView>
    </View>
  );
}

export function ShowcaseControlGroup<T extends string>({
  disabled = false,
  label,
  onChange,
  options,
  selected,
  variant,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: T) => void;
  options: readonly { color: string; label: string; value: T }[];
  selected: T;
  variant?: ShowcaseControlVariant;
}) {
  const resolvedVariant = variant ?? controlVariantForLabel(label);

  return (
    <View style={[
      styles.group,
      resolvedVariant === 'presenter' && styles.groupPresenter,
      resolvedVariant === 'rank' && styles.groupRank,
      resolvedVariant === 'lighting' && styles.groupLighting,
    ]}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const active = option.value === selected;
          return (
            <Pressable
              accessibilityLabel={`${label}, ${option.label}`}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected: active }}
              disabled={disabled}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [styles.option, active && styles.optionActive, disabled && styles.disabled, pressed && styles.pressed]}
              testID={`showcase-control-${option.value}`}
            >
              <ControlMiniature active={active} color={option.color} variant={resolvedVariant} />
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
              {active ? <View style={styles.activeMark} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ControlMiniature({ active, color, variant }: { active: boolean; color: string; variant: ShowcaseControlVariant }) {
  if (variant === 'pedestal' || variant === 'presenter') {
    return (
      <View style={styles.pedestalMiniature}>
        <View style={[styles.pedestalTop, { borderColor: alpha(color, active ? 'F0' : '9A') }]} />
        <LinearGradient colors={[alpha(color, 'D8'), '#11171C', '#030506']} style={styles.pedestalBody} />
        <View style={[styles.pedestalFoot, { borderTopColor: alpha(color, 'B4') }]} />
      </View>
    );
  }

  if (variant === 'rank') {
    return (
      <View style={[styles.rankMiniature, { borderColor: alpha(color, active ? 'E8' : '82') }]}>
        <View style={[styles.rankHalo, { borderColor: alpha(color, active ? 'E8' : '88') }]} />
        <View style={[styles.rankCore, { backgroundColor: color }]} />
      </View>
    );
  }

  if (variant === 'theme') {
    return (
      <LinearGradient colors={[alpha(color, 'E6'), '#0A1015']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={[styles.themeMiniature, active && { borderColor: alpha(color, 'E6') }]}>
        <View style={styles.themeShelf} />
        <View style={styles.themeShelf} />
        <View style={[styles.themeBeam, { backgroundColor: alpha(color, '8A') }]} />
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.lightOrbOuter, active && { borderColor: alpha(color, 'D4') }]}>
      <View style={[styles.lightOrbGlow, { backgroundColor: alpha(color, active ? '72' : '42') }]} />
      <View style={[styles.lightOrbCore, { backgroundColor: color }]} />
    </View>
  );
}

function controlVariantForLabel(label: string): ShowcaseControlVariant {
  if (label.includes('PRÉSENTOIR')) return 'presenter';
  if (label.includes('RANG')) return 'rank';
  if (label.includes('SOCLE')) return 'pedestal';
  if (label.includes('THÈME')) return 'theme';
  return 'lighting';
}

function alpha(color: string, opacity: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${opacity}` : color;
}

const styles = StyleSheet.create({
  root: { minHeight: 78, paddingTop: 5, backgroundColor: '#080C10', borderTopWidth: 1, borderTopColor: '#222C34' },
  title: { ...typography.eyebrow, color: '#C9DA38', textAlign: 'center', letterSpacing: 0.68 },
  groups: { flexGrow: 1, paddingHorizontal: 12, paddingBottom: 5, justifyContent: 'center', gap: 8 },
  group: { minWidth: 190, minHeight: 58, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: '#0B1014', borderWidth: 1, borderColor: '#263039' },
  groupPresenter: { minWidth: 610 },
  groupRank: { minWidth: 610 },
  groupLighting: { minWidth: 430 },
  groupLabel: { ...typography.label, color: '#89959F', textAlign: 'center', letterSpacing: 0.34 },
  options: { marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  option: { position: 'relative', minHeight: 44, minWidth: 54, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: 'transparent', borderRadius: 4 },
  optionActive: { backgroundColor: 'rgba(232,255,61,.035)', borderColor: 'rgba(232,255,61,.22)' },
  optionText: { ...typography.label, color: colors.textMuted },
  optionTextActive: { color: '#D5DDE3' },
  activeMark: { position: 'absolute', right: 9, bottom: 1, left: 9, height: 1, borderRadius: 2, backgroundColor: colors.volt },
  pedestalMiniature: { width: 18, height: 15, alignItems: 'center', justifyContent: 'flex-end' },
  pedestalTop: { zIndex: 3, width: 13, height: 4, marginBottom: -1, borderRadius: 999, backgroundColor: '#161D22', borderWidth: 1 },
  pedestalBody: { width: 15, height: 6, borderRadius: 2 },
  pedestalFoot: { width: 18, height: 4, marginTop: -1, borderTopWidth: 1, borderRadius: 999, backgroundColor: '#080B0E' },
  rankMiniature: { position: 'relative', width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 4, transform: [{ rotate: '45deg' }] },
  rankHalo: { position: 'absolute', width: 12, height: 12, borderWidth: 1, borderRadius: 999 },
  rankCore: { width: 6, height: 6, borderRadius: 1 },
  themeMiniature: { position: 'relative', overflow: 'hidden', width: 20, height: 15, padding: 3, justifyContent: 'space-around', borderRadius: 2, borderWidth: 1, borderColor: '#44505A' },
  themeShelf: { width: '100%', height: 1, backgroundColor: 'rgba(220,235,245,.34)' },
  themeBeam: { position: 'absolute', top: 0, bottom: 0, left: '47%', width: 2, opacity: 0.55 },
  lightOrbOuter: { position: 'relative', width: 16, height: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#48545E' },
  lightOrbGlow: { position: 'absolute', width: 13, height: 13, borderRadius: 7, opacity: 0.55 },
  lightOrbCore: { width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,.62)' },
  pressed: { opacity: 0.68 },
  disabled: { opacity: 0.48 },
});
