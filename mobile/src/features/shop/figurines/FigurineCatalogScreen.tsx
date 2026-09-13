import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/src/components/layout/Screen';
import { colors, spacing, typography } from '@/src/theme';
import { FIGURINE_EVOLUTION_TIERS } from './progression';
import { FIGURINE_UNIVERSES, figurineAccessLabel } from './catalog';

export default function FigurineCatalogScreen() {
  return <Screen>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Revenir à la collection" onPress={() => router.back()} style={styles.back}><Text style={styles.copy}>← Collection</Text></Pressable>
      <Text style={styles.title}>LES FIGURINES</Text>
      <Text style={styles.copy}>Aperçu de la prochaine collection · 24 pièces, 5 univers.</Text>
      <View style={styles.notice}>
        <Text style={styles.heading}>Ta première figurine offerte</Text>
        <Text style={styles.copy}>À l’inscription, un choix parmi Brumousse, Écho et Grelot. Les deux autres seront accessibles en Volts.</Text>
      </View>
      {FIGURINE_UNIVERSES.map(universe => <View key={universe.id} style={styles.universe}>
        <Text style={[styles.heading, { color: universe.accent }]}>{universe.name}</Text>
        {universe.items.map(item => <View key={item.id} style={styles.row}>
          <Image accessibilityLabel={`Figurine ${item.name}`} source={item.image} resizeMode="cover" style={styles.itemImage} />
          <View style={styles.itemCopy}>
            <Text style={styles.name}>{item.name}{item.starter ? ' · Choix de départ' : ''}</Text>
            <Text style={styles.access}>{figurineAccessLabel(item)}</Text>
          </View>
        </View>)}
      </View>)}
      <View style={styles.notice}>
        <Text style={styles.heading}>Des évolutions gagnées en jouant</Text>
        <Text style={styles.copy}>Toutes les figurines évolueront en jouant, même celles achetées. Chaque forme débloquée restera sélectionnable. Tes figurines déjà possédées restent acquises.</Text>
        {FIGURINE_EVOLUTION_TIERS.slice(1).map(tier => <Text key={tier.form} style={styles.copy}>{tier.label} : {tier.settledCalls} calls réglés et {tier.activeDays} jours de jeu cumulés.</Text>)}
        <Text style={styles.copy}>Victoires et défaites comptent. Aucune série obligatoire, aucun accélérateur payant.</Text>
        <Text style={styles.copy}>Les acquisitions de ce nouveau catalogue ne sont pas encore ouvertes.</Text>
      </View>
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 48 },
  back: { minHeight: 44, justifyContent: 'center' },
  title: { ...typography.sectionTitle, color: colors.text },
  heading: { ...typography.bodyStrong, color: colors.text },
  copy: { ...typography.body, color: colors.textSecondary },
  notice: { padding: spacing.md, gap: 10, borderRadius: 16, backgroundColor: colors.surfaceRaised },
  universe: { gap: 12, paddingVertical: 12 },
  row: { alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, flexDirection: 'row', paddingVertical: 10, gap: 12 },
  itemImage: { borderRadius: 12, height: 78, width: 78 },
  itemCopy: { flex: 1, gap: 4 },
  name: { ...typography.bodyStrong, color: colors.text },
  access: { ...typography.caption, color: colors.volt },
});
