import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme';

function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const needsOnboarding = Boolean(
    session && profile && (!profile.jeux_suivis.length || !profile.equipe_favorite_id),
  );
  const inOnboarding = segments[0] === 'onboarding';

  useEffect(() => {
    if (loading || !session || !profile) return;
    if (needsOnboarding && !inOnboarding) router.replace('/onboarding');
  }, [inOnboarding, loading, needsOnboarding, profile, session]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.volt} />
        <Text style={styles.loadingText}>Chargement de Clutch…</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="match/[id]" />
        <Stack.Screen name="admin/matches" />
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.background,
  },
  loadingText: { color: colors.textMuted, fontSize: 13 },
});
