import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, layout, spacing } from '@/src/theme';

import { CalendarIcon, CloseIcon, SearchIcon } from './MatchesArenaSections';

type Props = {
  onQueryChange: (value: string) => void;
  onShowToday: () => void;
  onToggleSearch: () => void;
  query: string;
  searchOpen: boolean;
};

export function MatchesHeader({ onQueryChange, onShowToday, onToggleSearch, query, searchOpen }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Text accessibilityRole="header" style={styles.title}>Matchs</Text>
        <Pressable accessibilityLabel="Afficher les matchs d’aujourd’hui" accessibilityRole="button" onPress={onShowToday} style={styles.action}>
          <CalendarIcon color={colors.text} size={22} />
        </Pressable>
        <Pressable accessibilityLabel={searchOpen ? 'Fermer la recherche' : 'Rechercher un match'} accessibilityRole="button" onPress={onToggleSearch} style={styles.action}>
          {searchOpen ? <CloseIcon color={colors.text} size={24} /> : <SearchIcon color={colors.text} size={24} />}
        </Pressable>
      </View>
      {searchOpen ? <TextInput accessibilityLabel="Rechercher une équipe ou une compétition" autoFocus onChangeText={onQueryChange} placeholder="Équipe ou compétition" placeholderTextColor={colors.textMuted} style={styles.search} value={query} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginHorizontal: spacing.md, paddingTop: 4, gap: 6 },
  row: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 30, lineHeight: 36 },
  action: { minWidth: layout.minTouchTarget, minHeight: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  search: { minHeight: layout.minTouchTarget, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceGlass, color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
});
