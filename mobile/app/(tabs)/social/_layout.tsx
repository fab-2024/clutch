import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppAtmosphere } from '@/src/components/layout/AppAtmosphere';
import { GriffHeader } from '@/src/components/layout/GriffHeader';
import ProfileHeaderButton from '@/src/features/profile/components/ProfileHeaderButton';
import SocialSectionNav from '@/src/features/social/components/SocialSectionNav';
import { colors } from '@/src/theme';

export default function SocialLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <AppAtmosphere />
      <View style={[styles.top, { paddingTop: Math.max(insets.top, 6) }]}>
        <GriffHeader leading={<ProfileHeaderButton />} variant="wallet" />
      </View>

      <SocialSectionNav />

      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.atmosphereBottom },
  top: {
    backgroundColor: 'rgba(9,24,34,.76)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHighlight,
  },
  content: { flex: 1 },
});
