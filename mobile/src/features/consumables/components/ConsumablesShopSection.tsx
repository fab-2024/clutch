import { SHOP_EFFECTS_ENABLED } from '@/src/features/shop/effectAvailability';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import X from 'lucide-react-native/icons/x';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { colors, fonts } from '@/src/theme';

const effects = [
  { id: 'showcase_spotlight', tag: 'VITRINE', name: 'Éclat de vitrine', description: 'Un éclat pour ton espace.', image: require('../../../../assets/consumables/spotlight.png') },
  { id: 'profile_pulse', tag: 'PROFIL', name: 'Impulsion de profil', description: 'Une signature pour ton profil.', image: require('../../../../assets/consumables/profile.png') },
] as const;

export default function ConsumablesShopSection({ preview = false }: { preview?: boolean }) {
  const [selected, setSelected] = useState<(typeof effects)[number] | null>(null);
  return <View testID="shop-consumables-section" style={styles.section}>
    {SHOP_EFFECTS_ENABLED ? <><View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>EFFETS TEMPORAIRES</Text>
      <Text style={styles.subtitle}>Donne du caractère à ta vitrine et à ton profil.</Text></View>
    <View style={styles.grid} testID="store-visual-consumables">
      {effects.map((effect) => <View key={effect.id} style={styles.effect}>
        <Image source={effect.image} contentFit="contain" style={styles.art} accessibilityLabel={effect.name} />
        <View style={styles.copy}><Text style={styles.tag}>{effect.tag}</Text>
          <Text style={styles.name}>{effect.name}</Text><Text style={styles.description}>{effect.description}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Prévisualiser ${effect.name}`} onPress={() => setSelected(effect)} style={({ pressed }) => [styles.previewButton, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>Prévisualiser</Text><ArrowRight size={17} color={colors.text} />
          </Pressable>
        </View>
      </View>)}
    </View>
    </> : null}
    <View style={[styles.heading, SHOP_EFFECTS_ENABLED && styles.protectionHeading]}><Text accessibilityRole="header" style={styles.title}>PROTECTIONS DE SÉRIE</Text>
      <Text style={styles.subtitle}>Garde ta série malgré une journée manquée.</Text></View>
    <View style={styles.protector} testID="shop-streak-protector">
      <Image source={require('../../../../assets/consumables/protector.png')} contentFit="contain" style={styles.shield} accessibilityLabel="Bouclier protecteur de série" />
      <View style={styles.protectorCopy}><Text style={styles.tag}>1 JOURNÉE</Text>
        <Text style={styles.name}>Protecteur de série</Text>
        <Text style={styles.description}>Protège une journée manquée.</Text>
        <Text style={styles.note}>Sans avantage compétitif.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Acheter un protecteur de série pour 90 Volts" onPress={() => router.push(preview ? '/streak-preview' : '/streak')} style={({ pressed }) => [styles.buyButton, pressed && styles.pressed]}>
          <View style={styles.priceRow}><CurrencyIcon kind="volts" size={18} color="#080A0C" /><Text style={styles.price}>90 Volts</Text></View>
        </Pressable>
      </View>
    </View>
    <Modal visible={selected !== null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
      <View style={styles.backdrop}><View style={styles.modal}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          {selected ? <><Image source={selected.image} contentFit="contain" style={styles.art} />
            <Text style={styles.name}>{selected.name}</Text><Text style={styles.description}>{selected.description}</Text>
            <Pressable accessibilityRole="button" style={styles.buyButton} onPress={() => { setSelected(null); router.push(preview ? '/consumables-preview' : '/consumables'); }}>
              <Text style={styles.price}>Voir l’effet et ses options</Text>
            </Pressable></> : null}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer l’aperçu" style={styles.close} onPress={() => setSelected(null)}><X size={23} color={colors.text} /></Pressable>
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  heading: { gap: 2, paddingHorizontal: 3 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 29, color: colors.text },
  subtitle: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  grid: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  effect: { flex: 1, minWidth: 0, overflow: 'hidden', borderRadius: 15, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#091218' },
  art: { width: '100%', aspectRatio: 1 },
  copy: { flex: 1, padding: 10, paddingTop: 0, gap: 6 },
  tag: { alignSelf: 'flex-start', color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2, overflow: 'hidden' },
  name: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.text },
  description: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  previewButton: { marginTop: 'auto', minHeight: 44, borderWidth: 1, borderColor: '#7B8993', borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 4, paddingVertical: 8 },
  buttonText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  protectionHeading: { marginTop: 12, paddingTop: 13, borderTopWidth: 1, borderColor: colors.borderStrong },
  protector: { flexDirection: 'row', overflow: 'hidden', borderRadius: 15, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#091218' },
  shield: { width: '48%', alignSelf: 'stretch', minHeight: 190 },
  protectorCopy: { flex: 1, padding: 10, paddingLeft: 2, justifyContent: 'center', gap: 6 },
  note: { fontFamily: fonts.body, fontSize: 10, lineHeight: 15, color: colors.textMuted },
  buyButton: { marginTop: 7, minHeight: 44, borderRadius: 9, backgroundColor: '#DFE982', alignItems: 'center', justifyContent: 'center', padding: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  price: { color: '#071014', fontFamily: fonts.bold, fontSize: 15, textAlign: 'center' },
  pressed: { opacity: 0.7 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { width: '100%', maxWidth: 430, maxHeight: '90%', borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#091218' },
  modalContent: { padding: 16, gap: 10 },
  close: { position: 'absolute', right: 8, top: 8, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#091218' },
});
