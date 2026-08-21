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
      <Text style={[styles.icon, focused && styles.iconFocused]}>{glyph}</Text>
      <View style={[styles.underline, focused && styles.underlineFocused]} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.volt,
        tabBarInactiveTintColor: '#6F7B89',
        tabBarActiveBackgroundColor: '#151C11',
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hub', tabBarIcon: ({ focused }) => <TabIcon glyph="⌂" focused={focused} /> }} />
      <Tabs.Screen name="matches" options={{ title: 'Matchs', tabBarIcon: ({ focused }) => <TabIcon glyph="▣" focused={focused} /> }} />
      <Tabs.Screen name="social" options={{ title: 'Social', tabBarIcon: ({ focused }) => <TabIcon glyph="◎" focused={focused} /> }} />
      <Tabs.Screen
        name="room"
        options={{
          title: 'Room',
          tabBarAccessibilityLabel: 'Room, bientôt disponible',
          tabBarLabel: 'Room · bientôt',
          tabBarLabelStyle: [styles.label, styles.roomLabel],
          tabBarIcon: ({ focused }) => <TabIcon glyph="◇" focused={focused} />,
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
    left: 14,
    right: 14,
    bottom: layout.tabBarBottom,
    height: layout.tabBarHeight,
    padding: 5,
    borderTopWidth: 1,
    borderWidth: 1,
    borderColor: '#242C35',
    borderRadius: 24,
    backgroundColor: '#090D11',
    overflow: 'hidden',
  },
  item: {
    minHeight: 64,
    marginHorizontal: 2,
    borderRadius: 18,
    overflow: 'hidden',
    paddingTop: 5,
  },
  iconWrap: {
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  icon: {
    color: '#6F7B89',
    fontSize: 21,
    lineHeight: 22,
    fontWeight: '800',
  },
  iconFocused: { color: colors.volt },
  underline: {
    width: 0,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  underlineFocused: {
    width: 20,
    backgroundColor: colors.volt,
  },
  label: {
    ...typography.label,
    marginTop: 1,
    letterSpacing: 0.25,
  },
  roomLabel: {
    fontSize: 10,
    letterSpacing: 0,
  },
});
