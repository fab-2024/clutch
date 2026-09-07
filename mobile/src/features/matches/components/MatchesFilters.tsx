import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

import GameLogo from '@/src/features/onboarding/components/GameLogo';
import { colors, fonts, layout, spacing } from '@/src/theme';

import type { GameFilter, StatusFilter } from './MatchesArenaSections';

const GAMES: { id: GameFilter; label: string; accessibilityLabel: string }[] = [
  { id: 'followed', label: 'Moi', accessibilityLabel: 'Mes jeux suivis' },
  { id: 'lol', label: 'LoL', accessibilityLabel: 'League of Legends' },
  { id: 'valorant', label: 'Valo', accessibilityLabel: 'Valorant' },
  { id: 'rocket_league', label: 'RL', accessibilityLabel: 'Rocket League' },
];
const STATUSES: { id: StatusFilter; label: string }[] = [
  { id: 'live', label: 'En cours' },
  { id: 'upcoming', label: 'À venir' },
  { id: 'finished', label: 'Résultats' },
];

type Props = {
  children?: ReactNode;
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

export function ArenaFilters({ children, callCount, callsOnly, game, isAdmin, liveCount, onCallsOnlyChange, onGameChange, onStatusChange, status }: Props) {
  const compact = useWindowDimensions().width <= 360;
  return (
    <View style={styles.root} testID="matches-arena-filters">
      <View accessibilityRole="tablist" accessibilityLabel="Jeux" style={styles.games}>
        {GAMES.map((item) => {
          const active = game === item.id;
          const color = active ? colors.volt : colors.textMuted;
          return (
            <Pressable
              accessibilityLabel={item.accessibilityLabel}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={item.id}
              onPress={() => onGameChange(item.id)}
              style={({ pressed }) => [styles.game, active && styles.gameActive, pressed && styles.pressed]}
            >
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
            </Pressable>
          );
        })}
      </View>

      <View accessibilityRole="tablist" accessibilityLabel="État des matchs" style={styles.statuses}>
        {STATUSES.map((item) => {
          const active = !callsOnly && status === item.id;
          const hasLiveCount = item.id === 'live' && liveCount > 0;
          return (
            <Pressable
              accessibilityLabel={hasLiveCount ? `En cours, ${liveCount} match${liveCount > 1 ? 's' : ''}` : item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={item.id}
              onPress={() => onStatusChange(item.id)}
              style={({ pressed }) => [styles.status, pressed && styles.pressed]}
            >
              <Text numberOfLines={1} style={[styles.statusLabel, compact && styles.statusLabelCompact, active && styles.statusLabelActive]}>{item.label}</Text>
              {hasLiveCount ? <View style={styles.liveBadge}><Text style={styles.liveCount}>{liveCount > 99 ? '99+' : liveCount}</Text></View> : null}
              {active ? <View pointerEvents="none" style={styles.statusUnderline} /> : null}
            </Pressable>
          );
        })}
      </View>

      {children}

      <Pressable
        accessibilityLabel={callsOnly ? 'Fermer Mes calls' : `Mes calls, ${callCount} verrouillé${callCount > 1 ? 's' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: callsOnly }}
        onPress={() => onCallsOnlyChange(!callsOnly)}
        style={({ pressed }) => [styles.ticket, callsOnly && styles.ticketActive, pressed && styles.pressed]}
      >
        <Svg height={27} pointerEvents="none" style={styles.ticketIcon} viewBox="0 0 36 36" width={27}>
          <Path d="M4 8 H32 V14 C24 14 24 24 32 24 V30 H4 V24 C12 24 12 14 4 14 Z" fill="none" stroke={colors.text} strokeWidth={2} />
        </Svg>
        <View style={styles.ticketCopy}>
          <Text style={styles.ticketTitle}>Mes calls</Text>
          <Text style={styles.ticketCount}>{callCount} verrouillé{callCount > 1 ? 's' : ''}</Text>
        </View>
        <Text style={styles.ticketArrow}>{callsOnly ? '⌃' : '›'}</Text>
      </Pressable>

      {isAdmin ? <Pressable accessibilityRole="button" onPress={() => router.push('/admin/matches' as never)} style={styles.admin}><Text style={styles.adminLabel}>ADMINISTRER LE CALENDRIER</Text><Text style={styles.ticketArrow}>›</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginHorizontal: spacing.md, gap: 16 },
  games: { flexDirection: 'row', gap: 4 },
  game: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 48, gap: 7, borderRadius: 9, borderWidth: 1, borderColor: 'transparent' },
  gameActive: { borderColor: 'rgba(105,130,145,.3)', backgroundColor: 'rgba(16,32,43,.6)' },
  gameIcon: { height: 32, width: 28, alignItems: 'center', justifyContent: 'center', transform: [{ scale: .8 }] },
  personalGlyph: { position: 'absolute', fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 28 },
  gameLabel: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  statuses: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(105,130,145,.3)' },
  status: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 2 },
  statusLabel: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: colors.textMuted, flexShrink: 1 },
  statusLabelCompact: { fontSize: 13, lineHeight: 19 },
  statusLabelActive: { color: colors.text },
  statusUnderline: { position: 'absolute', bottom: -1, width: '100%', height: 2, backgroundColor: colors.volt },
  liveBadge: { minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#CB2035' },
  liveCount: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  ticket: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(105,130,145,.4)', backgroundColor: 'rgba(5,14,20,.5)' },
  ticketActive: { borderColor: colors.volt },
  ticketIcon: { position: 'relative' },
  ticketCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ticketTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.text },
  ticketCount: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  ticketArrow: { fontFamily: fonts.body, fontSize: 30, lineHeight: 30, color: colors.text },
  admin: { minHeight: layout.minTouchTarget, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adminLabel: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: 11 },
  pressed: { opacity: 0.72 },
});
