import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppAtmosphere } from '@/src/components/layout/AppAtmosphere';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme';

import { hasSeenOnboarding } from '../draft';

export default function StartupScreen() {
  const { profile, session } = useAuth();
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    if (session) return;
    let active = true;
    hasSeenOnboarding()
      .then((value) => { if (active) setSeen(value); })
      .catch(() => { if (active) setSeen(false); });
    return () => { active = false; };
  }, [session]);

  if (session && profile) {
    return <Redirect href={profile.est_developpeur || profile.onboarding_termine ? '/(tabs)' : '/onboarding'} />;
  }

  if (seen !== null) return <Redirect href={seen ? '/login' : '/onboarding'} />;

  return (
    <View style={styles.root}>
      <AppAtmosphere />
      <ActivityIndicator color={colors.volt} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.atmosphereBottom },
});
