import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, radius, spacing } from '@/src/theme/tokens';

export default function ProfileScreen() {
  const { profile, session } = useAuth();
  const initials = (profile?.pseudo || session?.user.email || '?').slice(0, 2).toUpperCase();

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>IDENTITÉ</Text>
        <Text style={styles.title}>Profil</Text>

        <View style={styles.card}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={styles.copy}>
            <Text style={styles.pseudo}>{profile?.pseudo || 'Joueur Clutch'}</Text>
            <Text style={styles.email}>{session?.user.email}</Text>
          </View>
        </View>

        <Pressable onPress={() => supabase.auth.signOut()} style={styles.logout}>
          <Text style={styles.logoutText}>SE DÉCONNECTER</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  eyebrow: { color: colors.volt, fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: colors.text, fontSize: 38, fontWeight: '900', letterSpacing: -1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.volt, fontSize: 17, fontWeight: '900' },
  copy: { flex: 1, gap: 3 },
  pseudo: { color: colors.text, fontSize: 20, fontWeight: '900' },
  email: { color: colors.textMuted, fontSize: 13 },
  logout: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: { color: colors.textMuted, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
});
