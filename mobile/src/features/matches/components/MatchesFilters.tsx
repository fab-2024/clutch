import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import GameLogo from '@/src/features/onboarding/components/GameLogo';
import { colors, fonts, spacing } from '@/src/theme';

import type { GameFilter } from './MatchesArenaSections';

const GAMES: { id: GameFilter; label: string; accessibilityLabel: string }[] = [
  { id: 'all', label: 'Tous', accessibilityLabel: 'Tous les jeux' },
  { id: 'lol', label: 'LOL', accessibilityLabel: 'League of Legends' },
  { id: 'valorant', label: 'VALO', accessibilityLabel: 'Valorant' },
  { id: 'rocket_league', label: 'RL', accessibilityLabel: 'Rocket League' },
];

type Props = {
  game: GameFilter;
  onGameChange: (value: GameFilter) => void;
};

export function ArenaFilters({ game, onGameChange }: Props) {
  return (
    <View accessibilityLabel="Jeux" accessibilityRole="tablist" style={styles.root} testID="matches-arena-filters">
      {GAMES.map((item) => {
        const active = game === item.id;
        const color = active ? '#091015' : colors.textMuted;
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
              {item.id === 'all' ? <AllGamesIcon color={color} /> : <GameLogo color={color} game={item.id} size={22} />}
            </View>
            <Text style={[styles.gameLabel, active && styles.gameLabelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AllGamesIcon({ color }: { color: string }) {
  return (
    <Svg height={22} viewBox="0 0 24 24" width={22}>
      <Circle cx="7" cy="7" fill="none" r="3" stroke={color} strokeWidth={1.8} />
      <Circle cx="17" cy="7" fill="none" r="3" stroke={color} strokeWidth={1.8} />
      <Circle cx="7" cy="17" fill="none" r="3" stroke={color} strokeWidth={1.8} />
      <Path d="M14 17h6M17 14v6" fill="none" stroke={color} strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    marginHorizontal: spacing.md,
    padding: 3,
    flexDirection: 'row',
    gap: 4,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(105,130,145,.28)',
    backgroundColor: 'rgba(5,14,20,.68)',
  },
  game: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
  },
  gameActive: { backgroundColor: '#F1F4EC' },
  gameIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  gameLabel: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
  gameLabelActive: { color: '#091015' },
  pressed: { opacity: 0.72 },
});
