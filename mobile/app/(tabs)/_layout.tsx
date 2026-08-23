import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, layout, typography } from '@/src/theme';

type TabIconProps = {
  glyph: string;
  focused: boolean;
};

function TabIcon({ glyph, focused }: TabIconProps) {
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.iconPlate, focused && styles.iconPlateFocused]}>
        <Text style={[styles.icon, focused && styles.iconFocused]}>{glyph}</Text>
      </View>
      <View style={[styles.activeDot, focused && styles.activeDotFocused]} />
    </View>
  );
}

function SmokedGlassBackground() {
  return (
    <View pointerEvents="none" style={styles.glassBackground}>
      <BlurView intensity={62} style={StyleSheet.absoluteFill} tint="dark" />
      <LinearGradient
        colors={['rgba(35, 43, 51, 0.78)', 'rgba(9, 13, 17, 0.92)']}
        end={{ x: 0.82, y: 1 }}
        start={{ x: 0.16, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glassHighlight} />
      <View style={styles.glassVoltHaze} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.volt,
        tabBarInactiveTintColor: '#7D8995',
        tabBarActiveBackgroundColor: 'rgba(232, 255, 61, 0.07)',
        tabBarBackground: SmokedGlassBackground,
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hub', tabBarIcon: ({ focused }) => <TabIcon glyph="⌂" focused={focused} /> }} />
      <Tabs.Screen name="matches" options={{ title: 'Matchs', tabBarIcon: ({ focused }) => <TabIcon glyph="▣" focused={focused} /> }} />
      <Tabs.Screen name="social" options={{ title: 'Social', tabBarIcon: ({ focused }) => <TabIcon glyph="◎" focused={focused} /> }} />
      <Tabs.Screen name="rank" options={{ title: 'Rank', tabBarIcon: ({ focused }) => <TabIcon glyph="◆" focused={focused} /> }} />
      <Tabs.Screen
        name="room"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Moi', tabBarIcon: ({ focused }) => <TabIcon glyph="♙" focused={focused} /> }} />
      <Tabs.Screen name="community" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: layout.tabBarBottom,
    height: layout.tabBarHeight,
    paddingHorizontal: 6,
    paddingTop: 5,
    paddingBottom: 5,
    borderWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(197, 211, 222, 0.18)',
    borderRadius: 26,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 18,
  },
  item: {
    minHeight: 64,
    marginHorizontal: 1,
    borderRadius: 20,
    overflow: 'hidden',
    paddingTop: 4,
  },
  iconWrap: {
    height: 33,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconPlate: {
    width: 31,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.035)',
  },
  iconPlateFocused: {
    backgroundColor: 'rgba(232, 255, 61, 0.1)',
    borderColor: 'rgba(232, 255, 61, 0.22)',
  },
  icon: {
    color: '#7D8995',
    fontSize: 19,
    lineHeight: 20,
    fontWeight: '800',
  },
  iconFocused: { color: colors.volt },
  activeDot: {
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(125, 137, 149, 0.34)',
  },
  activeDotFocused: {
    width: 13,
    backgroundColor: colors.volt,
  },
  label: {
    ...typography.label,
    marginTop: 0,
    letterSpacing: 0.25,
  },
  glassBackground: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 25,
    backgroundColor: 'rgba(7, 10, 14, 0.76)',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 22,
    right: 22,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  glassVoltHaze: {
    position: 'absolute',
    top: -28,
    left: '39%',
    width: 90,
    height: 52,
    borderRadius: 45,
    backgroundColor: colors.volt,
    opacity: 0.045,
  },
});
