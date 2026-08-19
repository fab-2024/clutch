import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/tokens';

export function ClutchHeader() {
  return (
    <View style={styles.root}>
      <View style={styles.brandRow}>
        <View style={styles.logoBox}>
          <Text style={styles.logoGlyph}>C</Text>
        </View>
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>CLUTCH</Text>
          <View style={styles.dot} />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ouvrir mon profil"
        onPress={() => router.push('/(tabs)/profile')}
        style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}
      >
        <Text style={styles.profileButtonText}>MON PROFIL</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    maxWidth: 430,
    minHeight: 74,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  brandRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.volt,
  },
  logoGlyph: {
    color: '#06090C',
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -2,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  wordmark: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 3.1,
  },
  dot: {
    width: 5,
    height: 5,
    marginBottom: 3,
    borderRadius: 3,
    backgroundColor: colors.volt,
  },
  profileButton: {
    minHeight: 44,
    minWidth: 122,
    paddingHorizontal: 16,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.volt,
  },
  profileButtonText: {
    color: '#080A0C',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  pressed: { opacity: 0.76 },
});
