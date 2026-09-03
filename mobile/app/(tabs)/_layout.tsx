import { Tabs } from 'expo-router';

import { useLiquidGlassTabOptions } from '@/src/components/navigation/LiquidGlassTabBar';

export default function TabsLayout() {
  const screenOptions = useLiquidGlassTabOptions();

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="matches" />
      <Tabs.Screen name="social" />
      <Tabs.Screen name="rank" />
      <Tabs.Screen name="room" options={{ href: null }} />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="community" options={{ href: null }} />
    </Tabs>
  );
}
