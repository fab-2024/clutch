import { LinearGradient } from 'expo-linear-gradient';
import Gift from 'lucide-react-native/icons/gift';
import Play from 'lucide-react-native/icons/play';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { colors, radius, spacing, typography } from '@/src/theme';

// Development-only concept. No ad SDK, currency credit or redemption is connected.
export default function GiftCardsPreviewSection() {
  return (
    <View style={styles.content} testID="gift-cards-preview">
      <Text style={styles.preview}>APERÇU DU CONCEPT · AUCUN ÉCHANGE RÉEL</Text>
      <Text style={styles.title}>Ta passion. Tes récompenses.</Text>
      <Text style={styles.subtitle}>Gaming et merch d’équipe : un nouvel objectif pour ta collection.</Text>
      <View style={styles.adCard}>
        <View style={styles.row}>
          <View style={styles.play}><Play color={colors.volt} size={20} /></View>
          <View style={styles.copy}>
            <Text style={styles.sectionTitle}>Une pause, +10 Volts</Text>
            <Text style={styles.muted}>Une publicité terminée. À ton initiative.</Text>
          </View>
        </View>
        <View style={styles.quota}>
          <Text style={styles.muted}>3 publicités maximum par jour</Text>
          <Text style={styles.count}>0 / 3</Text>
        </View>
        <View style={styles.segments}>{[0, 1, 2].map((slot) => <View key={slot} style={styles.segment} />)}</View>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={styles.button}>
          <Play color={colors.background} size={17} />
          <Text style={styles.buttonLabel}>Regarder · +10 Volts</Text>
        </Pressable>
        <Text style={styles.note}>Publicités non activées. Régie et conditions des récompenses à définir.</Text>
      </View>
      <View style={styles.catalogHeader}>
        <Text style={styles.sectionTitle}>Cartes cadeaux</Text>
        <Text style={styles.coming}>À VENIR</Text>
      </View>
      <Text style={styles.muted}>Un seuil envisagé de 10 000 Volts. Les marques et la valeur des cartes restent à confirmer.</Text>
      {[
        { title: 'Gaming', subtitle: 'Pour tes prochaines découvertes', accent: '#78C9EA' },
        { title: 'Merch d’équipe', subtitle: 'Porte les couleurs qui te rassemblent', accent: '#BBA0FF' },
      ].map((card) => (
        <View key={card.title} style={styles.giftCard}>
          <LinearGradient colors={['#152A35', '#091720']} style={styles.giftArt}>
            <Text style={[styles.giftEyebrow, { color: card.accent }]}>CARTE CADEAU</Text>
            <Gift size={44} strokeWidth={1.4} color={card.accent} />
            <Text style={styles.giftTitle}>{card.title}</Text>
          </LinearGradient>
          <View style={styles.giftCopy}>
            <Text style={styles.muted}>{card.subtitle}</Text>
            <View style={styles.price}>
              <CurrencyIcon kind="volts" size={19} />
              <Text style={styles.priceText}>10 000</Text>
              <Text style={styles.note}>seuil indicatif</Text>
            </View>
            <Text style={styles.note}>Catalogue partenaire en préparation</Text>
          </View>
        </View>
      ))}
      <Text style={styles.note}>Le lien entre les Volts publicitaires et les cartes cadeaux dépendra des conditions du partenaire retenu.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: 14 },
  preview: { ...typography.metadata, color: colors.volt, letterSpacing: .7 },
  title: { ...typography.sectionTitle, color: colors.text, fontSize: 25, lineHeight: 31 },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: -6 },
  adCard: { padding: 16, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.lg, backgroundColor: colors.surfaceGlass, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceInteractive },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  sectionTitle: { ...typography.sectionTitle, color: colors.text, fontSize: 19, lineHeight: 25 },
  muted: { ...typography.caption, color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  quota: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count: { ...typography.control, color: colors.text },
  segments: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 5, backgroundColor: colors.borderStrong, borderRadius: 3 },
  button: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, backgroundColor: colors.volt, opacity: .55 },
  buttonLabel: { ...typography.action, color: colors.background, fontSize: 16 },
  note: { ...typography.caption, color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  catalogHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  coming: { ...typography.metadata, color: colors.textSecondary },
  giftCard: { overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceGlass },
  giftArt: { minHeight: 165, padding: 18, justifyContent: 'space-between', alignItems: 'flex-start' },
  giftEyebrow: { ...typography.metadata, letterSpacing: 1 },
  giftTitle: { ...typography.sectionTitle, color: colors.text, fontSize: 25 },
  giftCopy: { padding: 14, gap: 8 },
  price: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  priceText: { ...typography.control, color: colors.volt, fontSize: 20 },
});
