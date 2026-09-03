import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabNavigationOptions } from 'expo-router/js-tabs';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import House from 'lucide-react-native/icons/house';
import Store from 'lucide-react-native/icons/store';
import Trophy from 'lucide-react-native/icons/trophy';
import UsersRound from 'lucide-react-native/icons/users-round';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import { colors, layout, typography } from '@/src/theme';

export const mainTabs = [
  { name: 'index', title: 'Hub', icon: House },
  { name: 'matches', title: 'Matchs', icon: CalendarDays },
  { name: 'social', title: 'Social', icon: UsersRound },
  { name: 'rank', title: 'Rank', icon: Trophy },
  { name: 'profile', title: 'Magasin', icon: Store },
] as const;

const nativeGlassAvailable = isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

function LiquidGlassBackground() {
  return (
    <View pointerEvents="none" style={styles.glassBackground}>
      {nativeGlassAvailable ? (
        <GlassView colorScheme="dark" glassEffectStyle="regular" style={styles.nativeGlass} />
      ) : (
        <>
          <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
          <View style={styles.glassTint} />
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.07)', 'rgba(255, 255, 255, 0.015)', 'rgba(255, 255, 255, 0.04)']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.glassRim} />
        </>
      )}
    </View>
  );
}

export function useLiquidGlassTabOptions() {
  const { isShortLandscape } = useResponsiveLayout();
  const insets = useSafeAreaInsets();

  return ({ route }: { route: { name: string } }): BottomTabNavigationOptions => {
    const tab = mainTabs.find(({ name }) => name === route.name);
    const Icon = tab?.icon;

    return {
      headerShown: false,
      title: tab?.title,
      tabBarActiveTintColor: colors.text,
      tabBarInactiveTintColor: colors.text,
      tabBarActiveBackgroundColor: 'rgba(244, 247, 250, 0.16)',
      tabBarBackground: LiquidGlassBackground,
      tabBarHideOnKeyboard: true,
      tabBarLabelPosition: 'below-icon',
      tabBarStyle: [
        styles.tabBar,
        isShortLandscape && styles.tabBarLandscape,
        { bottom: Math.max(insets.bottom, isShortLandscape ? 6 : layout.tabBarBottom) },
      ],
      tabBarLabelStyle: [styles.label, isShortLandscape && styles.labelLandscape],
      tabBarItemStyle: [styles.item, isShortLandscape && styles.itemLandscape],
      tabBarIcon: Icon ? ({ color, focused }) => (
        <View style={[styles.iconWrap, isShortLandscape && styles.iconWrapCompact]}>
          <Icon color={color} size={isShortLandscape ? 19 : 23} strokeWidth={focused ? 2.25 : 1.9} />
        </View>
      ) : undefined,
    };
  };
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    marginHorizontal: 12,
    height: layout.tabBarHeight,
    paddingHorizontal: 5,
    paddingTop: 5,
    paddingBottom: 5,
    borderWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(231, 240, 255, 0.14)',
    borderTopColor: 'rgba(231, 240, 255, 0.28)',
    borderRadius: 999,
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 12,
  },
  tabBarLandscape: {
    height: 58,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 4,
  },
  item: {
    minHeight: 64,
    borderRadius: 999,
    overflow: 'hidden',
    paddingTop: 3,
  },
  itemLandscape: {
    minHeight: layout.controlHeight,
    paddingTop: 0,
  },
  iconWrap: { height: 28, alignItems: 'center', justifyContent: 'center' },
  iconWrapCompact: { height: 23 },
  label: {
    ...typography.caption,
    marginTop: 2,
    lineHeight: 14,
    letterSpacing: 0.1,
  },
  labelLandscape: { marginTop: 0 },
  glassBackground: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(18, 25, 34, 0.12)',
  },
  nativeGlass: { ...StyleSheet.absoluteFill, borderRadius: 999 },
  glassTint: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14, 20, 29, 0.24)' },
  glassRim: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderRadius: 999,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    borderLeftColor: 'rgba(255, 255, 255, 0.09)',
    borderRightColor: 'rgba(255, 255, 255, 0.025)',
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
});
