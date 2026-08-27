import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import House from 'lucide-react-native/icons/house';
import Trophy from 'lucide-react-native/icons/trophy';
import UserRound from 'lucide-react-native/icons/user-round';
import UsersRound from 'lucide-react-native/icons/users-round';
import { StyleSheet, View } from 'react-native';

import { colors, layout, typography } from '@/src/theme';

type TabIconProps = {
  focused: boolean;
  icon: LucideIcon;
};

function TabIcon({ focused, icon: Icon }: TabIconProps) {
  return (
    <View style={styles.iconWrap}>
      <Icon
        color={focused ? colors.volt : '#77838F'}
        size={21}
        strokeWidth={focused ? 2.25 : 1.8}
      />
    </View>
  );
}

function SmokedGlassBackground() {
  return (
    <View pointerEvents="none" style={styles.glassBackground}>
      <BlurView intensity={54} style={StyleSheet.absoluteFill} tint="dark" />
      <View style={styles.glassTint} />
      <View style={styles.glassHighlight} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.volt,
        tabBarInactiveTintColor: '#77838F',
        tabBarActiveBackgroundColor: 'rgba(232, 255, 61, 0.075)',
        tabBarBackground: SmokedGlassBackground,
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hub', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={House} /> }} />
      <Tabs.Screen name="matches" options={{ title: 'Matchs', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={CalendarDays} /> }} />
      <Tabs.Screen name="social" options={{ title: 'Social', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={UsersRound} /> }} />
      <Tabs.Screen name="rank" options={{ title: 'Rank', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={Trophy} /> }} />
      <Tabs.Screen
        name="room"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Moi', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={UserRound} /> }} />
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
    height: 70,
    paddingHorizontal: 5,
    paddingTop: 4,
    paddingBottom: 4,
    borderWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(197, 211, 222, 0.14)',
    borderRadius: 23,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 12,
  },
  item: {
    minHeight: 60,
    marginHorizontal: 1,
    borderRadius: 18,
    overflow: 'hidden',
    paddingTop: 3,
  },
  iconWrap: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.label,
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.15,
  },
  glassBackground: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: 'rgba(7, 10, 14, 0.82)',
  },
  glassTint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(13, 18, 24, 0.86)',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 22,
    right: 22,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
