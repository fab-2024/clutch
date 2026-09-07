import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, fonts, layout, spacing } from '@/src/theme';

import { CloseIcon, SearchIcon } from './MatchesArenaSections';

type Props = {
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
  onShowCalls: () => void;
  onToggleSearch: () => void;
  query: string;
  searchOpen: boolean;
};

export function MatchesHeader({ onQueryChange, onRefresh, onShowCalls, onToggleSearch, query, searchOpen }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Text accessibilityRole="header" style={styles.title}>Matchs</Text>
        <Pressable accessibilityLabel={searchOpen ? 'Fermer la recherche' : 'Rechercher un match'} accessibilityRole="button" onPress={onToggleSearch} style={styles.action}>
          {searchOpen ? <CloseIcon color={colors.text} size={24} /> : <SearchIcon color={colors.text} size={24} />}
        </Pressable>
        <Pressable accessibilityLabel="Options des matchs" accessibilityRole="button" accessibilityState={{ expanded: menuOpen }} onPress={() => setMenuOpen((value) => !value)} style={styles.action}>
          <Svg height={24} viewBox="0 0 24 24" width={24}>{[5, 12, 19].map((cy) => <Circle cx={12} cy={cy} fill={colors.text} key={cy} r={1.8} />)}</Svg>
        </Pressable>
      </View>
      {menuOpen ? <View style={styles.menu}>
        <Pressable accessibilityRole="button" onPress={() => { setMenuOpen(false); onShowCalls(); }} style={styles.menuItem}><Text style={styles.menuText}>Mes calls</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => { setMenuOpen(false); onRefresh(); }} style={styles.menuItem}><Text style={styles.menuText}>Actualiser les matchs</Text></Pressable>
      </View> : null}
      {searchOpen ? <TextInput accessibilityLabel="Rechercher une équipe ou une compétition" autoFocus onChangeText={onQueryChange} placeholder="Équipe ou compétition" placeholderTextColor={colors.textMuted} style={styles.search} value={query} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginHorizontal: spacing.md, paddingTop: 12, gap: 10 },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 32, lineHeight: 42 },
  action: { minWidth: layout.minTouchTarget, minHeight: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  menu: { alignSelf: 'flex-end', minWidth: 190, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceGlass },
  menuItem: { minHeight: layout.minTouchTarget, justifyContent: 'center', paddingHorizontal: 12 },
  menuText: { fontFamily: fonts.medium, color: colors.text, fontSize: 14 },
  search: { minHeight: layout.minTouchTarget, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceGlass, color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
});
