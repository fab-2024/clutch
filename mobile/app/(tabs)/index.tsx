import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { colors, radius, spacing } from '@/src/theme/tokens';

const stats = [
  { label: 'Niveau', value: '12' },
  { label: 'Frags', value: '2 480' },
  { label: 'Série', value: '4 j' },
];

export default function HomeScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>CLUTCH</Text>
          <View style={styles.avatar}><Text style={styles.avatarText}>PL</Text></View>
        </View>

        <View>
          <Text style={styles.eyebrow}>CLUTCH HUB</Text>
          <Text style={styles.title}>Bonsoir.</Text>
          <Text style={styles.subtitle}>Ton prochain move est prêt.</Text>
        </View>

        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionKicker}>À JOUER MAINTENANT</Text>
          <View style={styles.livePill}><Text style={styles.liveText}>DANS 2H</Text></View>
        </View>

        <View style={styles.matchCard}>
          <View style={styles.gameRow}>
            <Text style={styles.game}>LEAGUE OF LEGENDS</Text>
            <Text style={styles.bo}>BO3</Text>
          </View>

          <View style={styles.teamsRow}>
            <View style={styles.team}>
              <View style={styles.teamLogo}><Text style={styles.teamLogoText}>KC</Text></View>
              <Text style={styles.teamName}>Karmine Corp</Text>
            </View>
            <View style={styles.vsWrap}>
              <Text style={styles.vs}>VS</Text>
              <Text style={styles.time}>22:00</Text>
            </View>
            <View style={styles.team}>
              <View style={styles.teamLogo}><Text style={styles.teamLogoText}>G2</Text></View>
              <Text style={styles.teamName}>G2 Esports</Text>
            </View>
          </View>

          <Pressable style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
            <Text style={styles.ctaText}>PRONOSTIQUER</Text>
            <Text style={styles.ctaArrow}>→</Text>
          </Pressable>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressCopy}>
            <Text style={styles.sectionKicker}>PROGRESSION</Text>
            <Text style={styles.progressTitle}>72% vers le niveau 13</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.progressHint}>Encore 840 XP pour débloquer la prochaine récompense.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: colors.volt,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  eyebrow: {
    color: colors.volt,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statValue: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionHeader: {
    marginBottom: -12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionKicker: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  livePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#161D15',
    borderWidth: 1,
    borderColor: '#2D4023',
  },
  liveText: {
    color: colors.volt,
    fontSize: 10,
    fontWeight: '900',
  },
  matchCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#2A343F',
    gap: spacing.lg,
  },
  gameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  game: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  bo: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  team: {
    width: '36%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamLogo: {
    width: 66,
    height: 66,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamLogoText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  teamName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  vsWrap: {
    alignItems: 'center',
    gap: 4,
  },
  vs: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  time: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  cta: {
    minHeight: 54,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.volt,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    color: '#080B0F',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  ctaArrow: {
    color: '#080B0F',
    fontSize: 22,
    fontWeight: '900',
  },
  progressCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#0B1015',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  progressCopy: {
    gap: spacing.xs,
  },
  progressTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  progressFill: {
    width: '72%',
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.volt,
  },
  progressHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
