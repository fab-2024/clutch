import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

import GameLogo from '@/src/features/onboarding/components/GameLogo';
import { colors, fonts, layout, spacing } from '@/src/theme';

import type { GameFilter, StatusFilter } from './MatchesArenaSections';

const GAMES: { id: GameFilter; label: string; accessibilityLabel: string }[] = [
  { id: 'followed', label: 'MOI', accessibilityLabel: 'Mes jeux suivis' },
  { id: 'lol', label: 'LOL', accessibilityLabel: 'League of Legends' },
  { id: 'valorant', label: 'VALO', accessibilityLabel: 'Valorant' },
  { id: 'rocket_league', label: 'RL', accessibilityLabel: 'Rocket League' },
];
const STATUSES: { id: StatusFilter; label: string }[] = [
  { id: 'upcoming', label: 'À VENIR' },
  { id: 'live', label: 'EN COURS' },
  { id: 'finished', label: 'RÉSULTATS' },
];

type Props = {
  callCount: number;
  callsOnly: boolean;
  game: GameFilter;
  isAdmin: boolean;
  liveCount: number;
  onCallsOnlyChange: (value: boolean) => void;
  onGameChange: (value: GameFilter) => void;
  onStatusChange: (value: StatusFilter) => void;
  status: StatusFilter;
};

export function ArenaFilters({ callCount, callsOnly, game, isAdmin, liveCount, onCallsOnlyChange, onGameChange, onStatusChange, status }: Props) {
  const compact = useWindowDimensions().width <= 360;
  return (
    <View style={styles.root} testID="matches-arena-filters">
      <View accessibilityRole="tablist" accessibilityLabel="Jeux" style={styles.games}>
        {GAMES.map((item, index) => {
          const active = game === item.id;
          const color = active ? colors.volt : colors.textMuted;
          return (
            <Pressable
              accessibilityLabel={item.accessibilityLabel}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={item.id}
              onPress={() => onGameChange(item.id)}
              style={({ pressed }) => [styles.game, pressed && styles.pressed]}
            >
              {index > 0 ? <View pointerEvents="none" style={styles.gameDivider} /> : null}
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.gameIcon}>
                {item.id === 'followed' ? (
                  <>
                    <Svg height={34} viewBox="0 0 36 36" width={34}>
                      <Polygon fill="none" points="10,2 26,2 34,10 34,26 26,34 10,34 2,26 2,10" stroke={color} strokeWidth={1.8} />
                    </Svg>
                    <Text style={[styles.personalGlyph, { color }]}>C</Text>
                  </>
                ) : <GameLogo color={color} game={item.id} size={34} />}
              </View>
              <Text style={[styles.gameLabel, { color }]}>{item.label}</Text>
              {active ? <View pointerEvents="none" style={styles.gameUnderline} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View accessibilityRole="tablist" accessibilityLabel="État des matchs" style={styles.statuses}>
        {STATUSES.map((item, index) => {
          const active = !callsOnly && status === item.id;
          const hasLiveCount = item.id === 'live' && liveCount > 0;
          return (
            <Pressable
              accessibilityLabel={hasLiveCount ? `En cours, ${liveCount} match${liveCount > 1 ? 's' : ''}` : item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={item.id}
              onPress={() => onStatusChange(item.id)}
              style={({ pressed }) => [styles.status, item.id === 'live' && styles.liveStatus, active && styles.statusActive, pressed && styles.pressed]}
            >
              {index > 0 && !active ? <View pointerEvents="none" style={styles.statusDivider} /> : null}
              {active ? <LinearGradient colors={['rgba(148,171,184,.12)', 'rgba(148,171,184,0)']} pointerEvents="none" style={styles.statusReflection} /> : null}
              <Text numberOfLines={1} style={[styles.statusLabel, compact && styles.statusLabelCompact, active && styles.statusLabelActive]}>{item.label}</Text>
              {hasLiveCount ? <View style={styles.liveBadge}><Text style={styles.liveCount}>{liveCount > 99 ? '99+' : liveCount}</Text></View> : null}
              {active ? <View pointerEvents="none" style={styles.statusUnderline} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityLabel={callsOnly ? 'Fermer Mes calls' : `Mes calls, ${callCount} verrouillé${callCount > 1 ? 's' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: callsOnly }}
        onPress={() => onCallsOnlyChange(!callsOnly)}
        style={({ pressed }) => [styles.ticket, pressed && styles.pressed]}
      >
        <Svg height="100%" pointerEvents="none" preserveAspectRatio="none" style={StyleSheet.absoluteFill} viewBox="0 0 400 64" width="100%">
          <Path d="M10 1 H390 Q392 9 399 12 V25 Q385 32 399 39 V52 Q392 55 390 63 H10 Q8 55 1 52 V39 Q15 32 1 25 V12 Q8 9 10 1 Z" fill={callsOnly ? 'rgba(40,44,13,.55)' : 'rgba(5,14,20,.78)'} stroke={colors.volt} strokeOpacity={callsOnly ? 0.8 : 0.4} strokeWidth={1} />
        </Svg>
        <Svg height={27} pointerEvents="none" style={styles.ticketIcon} viewBox="0 0 36 36" width={27}>
          <Path d="M4 8 H32 V14 C24 14 24 24 32 24 V30 H4 V24 C12 24 12 14 4 14 Z" fill="none" stroke={colors.volt} strokeWidth={2} />
        </Svg>
        <View style={styles.ticketCopy}>
          <Text style={styles.ticketTitle}>MES CALLS</Text>
          <Text style={styles.ticketCount}>· {callCount} VERROUILLÉ{callCount > 1 ? 'S' : ''}</Text>
        </View>
        <Text style={styles.ticketArrow}>{callsOnly ? '⌃' : '›'}</Text>
      </Pressable>

      {isAdmin ? <Pressable accessibilityRole="button" onPress={() => router.push('/admin/matches' as never)} style={styles.admin}><Text style={styles.adminLabel}>ADMINISTRER LE CALENDRIER</Text><Text style={styles.ticketArrow}>›</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginHorizontal: spacing.md, overflow: 'hidden', paddingBottom: 10, borderRadius: 20, backgroundColor: 'rgba(5,14,20,.88)', borderWidth: 1, borderColor: 'rgba(83,108,123,.24)' },
  games: { flexDirection: 'row', paddingTop: 17, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(105,130,145,.24)' },
  game: { flex: 1, minWidth: 0, alignItems: 'center', minHeight: 85, gap: 9, paddingBottom: 12 },
  gameDivider: { position: 'absolute', left: 0, top: 0, bottom: 9, width: 1, backgroundColor: 'rgba(139,156,168,.26)' },
  gameIcon: { height: 36, width: 38, alignItems: 'center', justifyContent: 'center' },
  personalGlyph: { position: 'absolute', fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 28 },
  gameLabel: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 23, letterSpacing: 0.6 },
  gameUnderline: { position: 'absolute', bottom: 0, height: 2, width: 39, backgroundColor: colors.volt },
  statuses: { flexDirection: 'row', paddingHorizontal: 5, paddingVertical: 12, gap: 4 },
  status: { flex: 1, minWidth: 0, minHeight: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 2, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  statusActive: { borderColor: 'rgba(146,164,176,.45)', backgroundColor: 'rgba(16,26,33,.7)' },
  liveStatus: { flex: 1.12 },
  statusReflection: { ...StyleSheet.absoluteFill, borderRadius: 12 },
  statusDivider: { position: 'absolute', left: -3, top: 7, bottom: 7, width: 1, backgroundColor: 'rgba(139,156,168,.26)' },
  statusLabel: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, color: colors.textMuted, flexShrink: 1 },
  statusLabelCompact: { fontSize: 15, lineHeight: 20 },
  statusLabelActive: { color: colors.text },
  statusUnderline: { position: 'absolute', bottom: 8, width: '60%', height: 2, backgroundColor: colors.volt },
  liveBadge: { minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#CB2035', borderWidth: 1, borderColor: '#F34052' },
  liveCount: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 20, color: colors.text, fontVariant: ['tabular-nums'] },
  ticket: { marginHorizontal: 7, minHeight: 57, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  ticketIcon: { position: 'relative' },
  ticketCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 8, rowGap: 1 },
  ticketTitle: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 23, letterSpacing: 0.8, color: colors.text },
  ticketCount: { fontFamily: fonts.displayBold, fontSize: 15, lineHeight: 20, letterSpacing: 0.4, color: colors.textMuted },
  ticketArrow: { fontFamily: fonts.body, fontSize: 32, lineHeight: 32, color: colors.volt },
  admin: { minHeight: layout.minTouchTarget, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adminLabel: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: 11 },
  pressed: { opacity: 0.72 },
});
