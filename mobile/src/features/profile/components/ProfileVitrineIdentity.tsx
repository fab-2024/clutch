import { StyleSheet, Text, View } from 'react-native';

import LevelFrame from '@/src/features/profile/levelFrames/components/LevelFrame';
import type { LevelFrameVariant } from '@/src/features/profile/levelFrames/types';
import { colors, radius, spacing, typography } from '@/src/theme';

type ProfileVitrineIdentityProps = {
  level?: number | null;
  levelFrameVariant?: LevelFrameVariant;
  loading?: boolean;
  profileTitle: string;
  pseudo: string;
  publicProfile: boolean;
};

export default function ProfileVitrineIdentity({
  level,
  levelFrameVariant = 'signalAscendant',
  loading = false,
  profileTitle,
  pseudo,
  publicProfile,
}: ProfileVitrineIdentityProps) {
  const displayedLevel = loading ? '—' : level ?? '—';
  const status = loading ? 'SYNCHRO' : publicProfile ? 'PUBLIC' : 'PRIVÉ';
  const statusLabel = loading ? 'en synchronisation' : publicProfile ? 'publique' : 'privée';
  const statusColor = loading ? colors.textMuted : publicProfile ? colors.success : colors.liveText;

  return (
    <View style={styles.identityRow} testID="profile-vitrine-identity">
      <LevelFrame
        level={typeof displayedLevel === 'number' ? displayedLevel : 0}
        size={58}
        variant={levelFrameVariant}
      />
      <View
        accessible
        accessibilityLabel={`${pseudo}, ${profileTitle}, niveau ${displayedLevel}, vitrine ${statusLabel}`}
        style={styles.identityCopy}
      >
        <View style={styles.identityEyebrowRow}>
          <Text numberOfLines={1} style={styles.eyebrow}>VITRINE</Text>
          <View style={styles.status}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
          </View>
        </View>
        <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={styles.pseudo}>
          {pseudo}
        </Text>
        <Text numberOfLines={1} style={styles.profileTitle}>{profileTitle.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  identityRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  identityEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.control,
    color: colors.volt,
    letterSpacing: 0.7,
  },
  pseudo: {
    ...typography.sectionTitle,
    marginTop: 1,
    color: colors.text,
  },
  profileTitle: {
    ...typography.metadata,
    marginTop: 1,
    color: colors.textSecondary,
    letterSpacing: 0.25,
  },
  status: {
    minHeight: 24,
    flexShrink: 0,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  statusText: {
    ...typography.metadata,
    fontFamily: typography.control.fontFamily,
  },
});
