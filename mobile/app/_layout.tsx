import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk/400Regular';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { useFonts } from 'expo-font';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import AuthRecoveryScreen from '@/src/features/auth/components/AuthRecoveryScreen';
import ResultRevealGate from '@/src/features/matches/components/ResultRevealGate';
import { NotificationBridge } from '@/src/features/notifications';
import { AuthProvider, useAuth } from '@/src/providers/AuthProvider';
import { CosmeticsProvider } from '@/src/providers/CosmeticsProvider';
import { EconomyProvider } from '@/src/providers/EconomyProvider';
import { colors, typography } from '@/src/theme';

function RootNavigator() {
  const { session, profile, status } = useAuth();
  const segments = useSegments();
  const loading = status === 'loading';
  const userId = session?.user.id;
  const profileId = profile?.id;
  const needsOnboarding = Boolean(
    session && profile && (!profile.jeux_suivis.length || !profile.equipe_favorite_id),
  );
  const inOnboarding = segments[0] === 'onboarding';
  const inAuthFlow = segments[0] === 'auth';

  useEffect(() => {
    if (loading || !userId || !profileId) return;
    if (needsOnboarding && !inOnboarding && !inAuthFlow) router.replace('/onboarding');
  }, [inAuthFlow, inOnboarding, loading, needsOnboarding, profileId, userId]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.volt} />
        <Text style={styles.loadingText}>Chargement de Clutch…</Text>
      </View>
    );
  }

  if (status === 'error' || status === 'profile_missing') {
    return <AuthRecoveryScreen />;
  }

  return (
    <>
      <NotificationBridge userId={userId} />
      <ResultRevealGate />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="match/[id]" />
          <Stack.Screen name="result/[id]" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
          <Stack.Screen name="duel/[token]" />
          <Stack.Screen name="settings/profile" />
          <Stack.Screen name="shop" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="economy" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="admin/matches" />
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
        </Stack.Protected>
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="auth/update-password" />
        <Stack.Screen name="player/[pseudo]" />
        <Stack.Screen name="shop-preview" options={{ animation: 'fade' }} />
        <Stack.Screen name="economy-preview" options={{ animation: 'fade' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.volt} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <EconomyProvider>
        <CosmeticsProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </CosmeticsProvider>
      </EconomyProvider>
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
  loadingText: { ...typography.body, color: colors.textMuted },
});
