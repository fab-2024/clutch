import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/tokens';

type TabIconProps = {
  glyph: string;
  focused: boolean;
};

function TabIcon({ glyph, focused }: TabIconProps) {
  return (
    <View style={[styles.iconShell, focused && styles.iconShellFocused]}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>{glyph}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: '#697580',
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hub',
          tabBarIcon: ({ focused }) => <TabIcon glyph="⌂" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matchs',
          tabBarIcon: ({ focused }) => <TabIcon glyph="⚔" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ focused }) => <TabIcon glyph="◎" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="room"
        options={{
          title: 'Room',
          tabBarIcon: ({ focused }) => <TabIcon glyph="◇" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Moi',
          tabBarIcon: ({ focused }) => <TabIcon glyph="●" focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="community"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 76,
    paddingTop: 7,
    paddingBottom: 9,
    borderTopWidth: 1,
    borderTopColor: '#1D2730',
    backgroundColor: '#080C10',
  },
  item: {
    gap: 1,
  },
  iconShell: {
    width: 34,
    height: 28,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShellFocused: {
    backgroundColor: '#1A2110',
    borderWidth: 1,
    borderColor: '#39471B',
  },
  icon: {
    color: '#697580',
    fontSize: 17,
    fontWeight: '800',
  },
  iconFocused: {
    color: colors.volt,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.15,
  },
});
