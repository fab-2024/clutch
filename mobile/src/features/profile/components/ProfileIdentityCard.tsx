import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import LevelFrame from '@/src/features/profile/levelFrames/components/LevelFrame';
import type { LevelFrameVariant } from '@/src/features/profile/levelFrames/types';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import { colors, fonts, typography } from '@/src/theme';

import type { ProfileData } from '../types';

type ProfileIdentityCardProps = {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  loading: boolean;
  levelFrameVariant: LevelFrameVariant;
  onModify: () => void;
  pseudo: string;
};

export default function ProfileIdentityCard({
  cosmetics,
  data,
  loading,
  levelFrameVariant,
  onModify,
  pseudo,
}: ProfileIdentityCardProps) {
  const level = loading ? '—' : data?.level.level ?? '—';
  const xp = loading ? '—' : formatNumber(data?.level.xp ?? 0);
  const title = loading
    ? '—'
    : cosmetics?.title?.name
      || data?.profileTitle
      || data?.level.prestigeLabel
      || 'Supporter GRIFF';
  const accent = cosmetics?.frame?.accent ?? cosmetics?.profileCard?.accent ?? '#46515C';
  const progress = loading ? 0 : clampProgress(data?.level.progress ?? 0);
  const progressWidth = `${Math.max(progress > 0 ? 2 : 0, Math.round(progress * 100))}%` as `${number}%`;

  return (
    <View style={[styles.card, { borderColor: alpha(accent, '5C') }]}>
      <LinearGradient
        colors={[alpha(accent, '13'), '#0A1015', '#080D11']}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <LevelFrame level={typeof level === 'number' ? level : 0} size={64} variant={levelFrameVariant} />
      <View style={styles.identity}>
        <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.pseudo}>
          {pseudo || '—'}
        </Text>
        <Text numberOfLines={1} style={[styles.title, { color: cosmetics?.title?.accent ?? colors.textMuted }]}>
          {title.toUpperCase()}
        </Text>
        <Text style={styles.level}>NIVEAU {level} · {xp} XP</Text>
        <View
          accessibilityLabel="Progression du niveau"
          accessibilityRole="progressbar"
          accessibilityValue={{ max: 100, min: 0, now: Math.round(progress * 100), text: loading ? 'Chargement' : `${Math.round(progress * 100)} pour cent` }}
          style={styles.track}
        >
          <View style={[styles.trackFill, { width: progressWidth }]} />
        </View>
      </View>
      <Pressable
        accessibilityLabel="Modifier mon profil"
        accessibilityRole="button"
        onPress={onModify}
        style={({ pressed }) => [styles.modify, pressed && styles.pressed]}
      >
        <Text style={styles.modifyText}>MODIFIER</Text>
      </Pressable>
    </View>
  );
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function alpha(color: string, opacity: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${opacity}` : color;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 92,
    marginHorizontal: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 17,
    backgroundColor: '#090E12',
    borderWidth: 1,
  },
  identity: { flex: 1, minWidth: 0 },
  pseudo: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.4,
  },
  title: { ...typography.label, marginTop: 2, letterSpacing: 0.45 },
  level: { ...typography.label, marginTop: 5, color: colors.text, fontSize: 8, letterSpacing: 0.25 },
  track: { height: 5, marginTop: 5, overflow: 'hidden', borderRadius: 999, backgroundColor: '#263039' },
  trackFill: { height: '100%', borderRadius: 999, backgroundColor: colors.volt },
  modify: {
    minHeight: 43,
    minWidth: 72,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#0C110C',
    borderWidth: 1,
    borderColor: '#55651B',
  },
  modifyText: { ...typography.action, color: colors.volt, fontSize: 9, letterSpacing: 0.3 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.99 }] },
});
