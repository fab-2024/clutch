import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Layers from 'lucide-react-native/icons/layers';
import X from 'lucide-react-native/icons/x';

import {
  IDENTITY_COMPONENT_LABELS,
  IDENTITY_PACKS,
  identityAccessLabel,
  type IdentityComponent,
  type IdentityPack,
} from '@/src/features/profile/identity/catalog';
import { colors, fonts, radius, spacing, typography } from '@/src/theme';
import { FIGURINE_UNIVERSES, figurineAccessLabel, type Figurine } from '../figurines/catalog';
import { IDENTITY_PACK_HERO } from '../identityPackArtwork';
import type { ShopCategory } from './ShopCategoryMenu';

type FigurineUniverse = typeof FIGURINE_UNIVERSES[number];
type Detail = { kind: 'pack'; pack: IdentityPack } | { kind: 'universe'; universe: FigurineUniverse };

function compactIdentityAccessLabel(pack: IdentityPack) {
  switch (pack.access.kind) {
    case 'included': return 'INCLUS';
    case 'volts': return pack.access.tier === 'quick' ? 'VOLTS · RAPIDE' : pack.access.tier === 'medium' ? 'VOLTS · INTERMÉDIAIRE' : 'VOLTS · LONG COURS';
    case 'store': return `${(pack.access.proposedCents / 100).toFixed(2).replace('.', ',')} €`;
    case 'season': return 'À GAGNER';
  }
}

function PackFeature({ pack, onPress }: { pack: IdentityPack; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={`Découvrir le pack ${pack.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.packFeature, pressed && styles.pressed]}
      testID={`identity-shop-${pack.id}`}
    >
      <Image resizeMode="cover" source={IDENTITY_PACK_HERO[pack.id]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(3,8,13,.08)', 'rgba(3,8,13,.2)', 'rgba(3,8,13,.98)']} locations={[0, .38, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.featureTopline}>
        <View style={[styles.featurePill, { borderColor: `${pack.accent}99` }]}>
          <Text style={[styles.featurePillText, { color: pack.accent }]}>OFFERT AU DÉPART</Text>
        </View>
        <Text style={styles.itemCount}>3 OBJETS</Text>
      </View>
      <View style={styles.featureCopy}>
        <Text style={styles.featureKicker}>PACK PROFIL</Text>
        <Text style={styles.featureTitle}>{pack.name}</Text>
        <Text style={styles.featureMaterial}>{pack.material}</Text>
        <View style={[styles.featureButton, { backgroundColor: pack.accent }]}>
          <Text style={styles.featureButtonText}>DÉCOUVRIR</Text>
          <ChevronRight color="#060A0E" size={17} strokeWidth={2.5} />
        </View>
      </View>
    </Pressable>
  );
}

function PackCard({ pack, onPress }: { pack: IdentityPack; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={`Découvrir le pack ${pack.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.packCard, { borderColor: `${pack.accent}55` }, pressed && styles.pressed]}
      testID={`identity-shop-${pack.id}`}
    >
      <View style={styles.packCardArt}>
        <Image resizeMode="cover" source={IDENTITY_PACK_HERO[pack.id]} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(5,10,15,.02)', 'rgba(5,10,15,.9)']} style={StyleSheet.absoluteFill} />
        <View style={[styles.packTypePill, { borderColor: `${pack.accent}88` }]}>
          <Text style={[styles.packTypeText, { color: pack.accent }]}>3 OBJETS</Text>
        </View>
      </View>
      <View style={styles.packCardCopy}>
        <Text numberOfLines={1} style={styles.packCardTitle}>{pack.name}</Text>
        <Text numberOfLines={1} style={styles.packCardMaterial}>{pack.material}</Text>
      </View>
      <View style={[styles.packPriceButton, { backgroundColor: pack.accent }]}>
        <Text numberOfLines={1} style={styles.packPriceText}>{compactIdentityAccessLabel(pack)}</Text>
        <ChevronRight color="#060A0E" size={15} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

function UniverseCampaign({ universe, onPress }: { universe: FigurineUniverse; onPress: () => void }) {
  const featured = universe.items[0];
  return (
    <Pressable
      accessibilityLabel={`Découvrir ${universe.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.universeCard, { borderColor: `${universe.accent}58` }, pressed && styles.pressed]}
      testID={`figurine-universe-${universe.id}`}
    >
      <LinearGradient colors={[`${universe.accent}30`, '#111923', '#080D13']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.universeArtWrap}>
        <Image resizeMode="contain" source={featured.image} style={styles.universeArt} />
      </View>
      <LinearGradient colors={['transparent', 'rgba(4,8,12,.96)']} locations={[.22, .72]} style={StyleSheet.absoluteFill} />
      <View style={styles.universeTopline}>
        <Text style={[styles.universeEyebrow, { color: universe.accent }]}>UNIVERS</Text>
        <Text style={styles.itemCount}>{universe.items.length} FIGURINES</Text>
      </View>
      <View style={styles.universeCopy}>
        <Text numberOfLines={2} style={styles.universeTitle}>{universe.name}</Text>
        <Text numberOfLines={2} style={styles.universeDescription}>Une figurine offerte, ses évolutions à gagner en jouant.</Text>
        <View style={[styles.universeButton, { backgroundColor: universe.accent }]}>
          <Text style={styles.universeButtonText}>OUVRIR</Text>
          <ChevronRight color="#060A0E" size={16} strokeWidth={2.5} />
        </View>
      </View>
    </Pressable>
  );
}

function ComponentTile({ accent, component }: { accent: string; component: IdentityComponent }) {
  return (
    <View style={[styles.componentTile, { borderColor: `${accent}55` }]}>
      <View style={styles.componentPreview}>
        {component === 'frame' ? <View style={[styles.frameOuter, { borderColor: accent }]}><View style={[styles.frameInner, { borderColor: `${accent}88` }]} /></View> : null}
        {component === 'background' ? <LinearGradient colors={['#111820', accent, '#090D12']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.backgroundPreview} /> : null}
        {component === 'signature' ? <View style={[styles.signaturePreview, { borderColor: accent }]}><View style={[styles.signatureLine, { backgroundColor: accent }]} /></View> : null}
      </View>
      <Text style={styles.componentLabel}>{IDENTITY_COMPONENT_LABELS[component]}</Text>
    </View>
  );
}

function ProductRow({ figurine, accent }: { figurine: Figurine; accent: string }) {
  return (
    <Pressable
      accessibilityLabel={`${figurine.name}, ${figurineAccessLabel(figurine)}`}
      accessibilityRole="button"
      style={({ pressed }) => [styles.productRow, pressed && styles.pressed]}
      testID={`figurine-shop-${figurine.id}`}
    >
      <Image resizeMode="cover" source={figurine.image} style={styles.productImage} />
      <View style={styles.productCopy}>
        <View style={styles.productNameRow}>
          <Text style={styles.productName}>{figurine.name}</Text>
          {figurine.starter ? <Text style={[styles.starterBadge, { color: accent, borderColor: `${accent}88` }]}>CHOIX GRATUIT</Text> : null}
        </View>
        <Text style={styles.productMeta}>Évolutions à gagner en jouant</Text>
      </View>
      <View style={[styles.pricePill, { backgroundColor: `${accent}18` }]}>
        <Text style={[styles.productPrice, { color: accent }]}>{figurineAccessLabel(figurine)}</Text>
      </View>
    </Pressable>
  );
}

export default function CurrentCollectionShop({ category }: { category: ShopCategory }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const showPacks = category === 'all' || category === 'packs';
  const showFigurines = category === 'all' || category === 'objects';
  const featuredPack = IDENTITY_PACKS[0];
  const shelfPacks = IDENTITY_PACKS.slice(1);

  return (
    <View style={styles.root} testID="current-collection-shop">
      {showPacks ? <View style={styles.section}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.eyebrow}>PACKS DE PROFIL</Text>
            <Text style={styles.heading}>Affiche tes couleurs</Text>
          </View>
          <Text style={styles.headingCount}>{IDENTITY_PACKS.length}</Text>
        </View>
        <Text style={styles.sectionDescription}>Un cadre, un fond et une signature réunis dans une seule identité.</Text>
        <PackFeature onPress={() => setDetail({ kind: 'pack', pack: featuredPack })} pack={featuredPack} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalShelf}
          snapToInterval={176}
          decelerationRate="fast"
        >
          {shelfPacks.map((pack) => <PackCard key={pack.id} onPress={() => setDetail({ kind: 'pack', pack })} pack={pack} />)}
        </ScrollView>
      </View> : null}

      {showFigurines ? <View style={styles.section}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.eyebrow}>FIGURINES</Text>
            <Text style={styles.heading}>Choisis ton univers</Text>
          </View>
          <Text style={styles.headingCount}>{FIGURINE_UNIVERSES.length}</Text>
        </View>
        <Text style={styles.sectionDescription}>Commence avec une figurine offerte. Les formes suivantes se débloquent par le jeu.</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalShelf}
          snapToInterval={220}
          decelerationRate="fast"
        >
          {FIGURINE_UNIVERSES.map((universe) => <UniverseCampaign key={universe.id} onPress={() => setDetail({ kind: 'universe', universe })} universe={universe} />)}
        </ScrollView>
      </View> : null}

      <Modal animationType="slide" onRequestClose={() => setDetail(null)} presentationStyle="pageSheet" visible={detail !== null}>
        <View style={styles.modal}>
          <Pressable accessibilityLabel="Fermer" accessibilityRole="button" onPress={() => setDetail(null)} style={styles.closeButton}>
            <X color={colors.text} size={22} />
          </Pressable>
          {detail?.kind === 'pack' ? <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
            <View style={styles.detailHero}>
              <Image resizeMode="cover" source={IDENTITY_PACK_HERO[detail.pack.id]} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', 'rgba(4,8,12,.96)']} style={StyleSheet.absoluteFill} />
              <View style={styles.detailHeroCopy}>
                <Text style={[styles.detailEyebrow, { color: detail.pack.accent }]}>PACK PROFIL</Text>
                <Text style={styles.detailTitle}>{detail.pack.name}</Text>
                <Text style={styles.detailSubtitle}>{detail.pack.material}</Text>
              </View>
            </View>
            <Text style={styles.detailDescription}>{detail.pack.description}</Text>
            <View style={styles.detailSectionHeading}>
              <Layers color={detail.pack.accent} size={19} />
              <Text style={styles.detailSectionTitle}>CONTENU DU PACK</Text>
            </View>
            <View style={styles.componentsRow}>
              {detail.pack.components.map((component) => <ComponentTile accent={detail.pack.accent} component={component} key={component} />)}
            </View>
            {detail.pack.teamAdaptive ? <View style={styles.infoPanel}><Text style={styles.infoText}>Les couleurs et les signes d’équipe s’adaptent à ton équipe favorite.</Text></View> : null}
            <View style={styles.detailPriceRow}>
              <Text style={styles.detailPriceLabel}>ACCÈS</Text>
              <Text style={[styles.detailPrice, { color: detail.pack.accent }]}>{identityAccessLabel(detail.pack.access).replace(' · Prix envisagé', '')}</Text>
            </View>
            <View style={styles.previewNotice}><Text style={styles.previewNoticeText}>APERÇU DU CATALOGUE · ACQUISITIONS BIENTÔT DISPONIBLES</Text></View>
          </ScrollView> : null}

          {detail?.kind === 'universe' ? <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.universeDetailHero, { borderColor: `${detail.universe.accent}55` }]}>
              <LinearGradient colors={[`${detail.universe.accent}35`, '#080D13']} style={StyleSheet.absoluteFill} />
              <Image resizeMode="contain" source={detail.universe.items[0].image} style={styles.universeDetailArt} />
              <LinearGradient colors={['transparent', 'rgba(4,8,12,.97)']} style={StyleSheet.absoluteFill} />
              <View style={styles.detailHeroCopy}>
                <Text style={[styles.detailEyebrow, { color: detail.universe.accent }]}>COLLECTION DE FIGURINES</Text>
                <Text style={styles.detailTitle}>{detail.universe.name}</Text>
                <Text style={styles.detailSubtitle}>{detail.universe.items.length} pièces · évolutions incluses</Text>
              </View>
            </View>
            <View style={styles.productList}>
              {detail.universe.items.map((figurine) => <ProductRow accent={detail.universe.accent} figurine={figurine} key={figurine.id} />)}
            </View>
            <View style={styles.infoPanel}><Text style={styles.infoText}>Forme 2 : 10 calls réglés et 5 jours de jeu. Forme 3 : 50 calls réglés et 20 jours de jeu. Chaque forme reste sélectionnable.</Text></View>
            <View style={styles.previewNotice}><Text style={styles.previewNoticeText}>APERÇU DU CATALOGUE · ACQUISITIONS BIENTÔT DISPONIBLES</Text></View>
          </ScrollView> : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 34 }, section: { gap: 12 }, headingRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { ...typography.eyebrow, color: colors.volt, fontSize: 10 }, heading: { color: colors.text, fontFamily: fonts.display, fontSize: 27, lineHeight: 31, marginTop: 2 },
  headingCount: { color: colors.textMuted, fontFamily: fonts.display, fontSize: 22 }, sectionDescription: { ...typography.caption, color: colors.textSecondary, maxWidth: 440 },
  horizontalShelf: { gap: 10, paddingRight: spacing.md },
  packFeature: { backgroundColor: '#080D13', borderColor: colors.borderStrong, borderRadius: radius.lg, borderWidth: 1, height: 238, justifyContent: 'space-between', overflow: 'hidden' },
  featureTopline: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 }, featurePill: { backgroundColor: 'rgba(5,9,13,.78)', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  featurePillText: { ...typography.eyebrow, fontSize: 9 }, itemCount: { ...typography.eyebrow, color: colors.textSecondary, fontSize: 9 }, featureCopy: { gap: 3, padding: 16 },
  featureKicker: { ...typography.eyebrow, color: colors.volt, fontSize: 9 }, featureTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 31, lineHeight: 34 }, featureMaterial: { ...typography.control, color: colors.textSecondary, fontSize: 11 },
  featureButton: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: radius.pill, flexDirection: 'row', gap: 3, marginTop: 8, paddingHorizontal: 15, paddingVertical: 9 }, featureButtonText: { color: '#060A0E', fontFamily: fonts.bold, fontSize: 10 },
  packCard: { backgroundColor: '#080D13', borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', width: 166 },
  packCardArt: { height: 122, overflow: 'hidden' }, packTypePill: { position: 'absolute', left: 9, top: 9, borderRadius: radius.pill, borderWidth: 1, backgroundColor: 'rgba(5,9,13,.78)', paddingHorizontal: 7, paddingVertical: 4 }, packTypeText: { ...typography.eyebrow, fontSize: 8 },
  packCardCopy: { gap: 2, minHeight: 58, paddingHorizontal: 10, paddingVertical: 8 }, packCardTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 19, lineHeight: 22 }, packCardMaterial: { ...typography.caption, color: colors.textSecondary, fontSize: 9, lineHeight: 13 },
  packPriceButton: { alignItems: 'center', flexDirection: 'row', gap: 2, justifyContent: 'center', minHeight: 40, paddingHorizontal: 7 }, packPriceText: { color: '#060A0E', flexShrink: 1, fontFamily: fonts.bold, fontSize: 10, textAlign: 'center' },
  universeCard: { backgroundColor: '#080D13', borderRadius: radius.lg, borderWidth: 1, height: 254, justifyContent: 'space-between', overflow: 'hidden', width: 210 }, universeArtWrap: { height: 180, left: 15, position: 'absolute', right: 15, top: 18 }, universeArt: { height: '100%', width: '100%' },
  universeTopline: { flexDirection: 'row', justifyContent: 'space-between', padding: 11, zIndex: 2 }, universeCopy: { gap: 4, padding: 12, zIndex: 2 }, universeEyebrow: { ...typography.eyebrow, fontSize: 9 }, universeTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 23, lineHeight: 25 }, universeDescription: { ...typography.caption, color: colors.textSecondary, fontSize: 9, lineHeight: 13 },
  universeButton: { alignItems: 'center', borderRadius: 9, flexDirection: 'row', gap: 3, justifyContent: 'center', marginTop: 4, minHeight: 36, paddingHorizontal: 11 }, universeButtonText: { color: '#060A0E', fontFamily: fonts.bold, fontSize: 10 },
  modal: { backgroundColor: colors.background, flex: 1, paddingTop: 8 }, closeButton: { alignItems: 'center', alignSelf: 'flex-end', height: 44, justifyContent: 'center', marginRight: 10, width: 44, zIndex: 3 }, detailContent: { gap: 18, paddingBottom: 50, paddingHorizontal: spacing.md },
  detailHero: { borderColor: colors.borderStrong, borderRadius: radius.lg, borderWidth: 1, height: 300, justifyContent: 'flex-end', overflow: 'hidden' }, universeDetailHero: { borderRadius: radius.lg, borderWidth: 1, height: 330, justifyContent: 'flex-end', overflow: 'hidden' }, universeDetailArt: { bottom: -28, height: 310, position: 'absolute', right: -45, width: 310 },
  detailHeroCopy: { gap: 5, padding: 18 }, detailEyebrow: { ...typography.eyebrow, fontSize: 10 }, detailTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 34, lineHeight: 38 }, detailSubtitle: { ...typography.control, color: colors.textSecondary }, detailDescription: { ...typography.body, color: colors.textSecondary },
  detailSectionHeading: { alignItems: 'center', flexDirection: 'row', gap: 8 }, detailSectionTitle: { ...typography.eyebrow, color: colors.text }, componentsRow: { flexDirection: 'row', gap: 8 }, componentTile: { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, borderWidth: 1, flex: 1, gap: 8, padding: 9 }, componentPreview: { alignItems: 'center', height: 72, justifyContent: 'center' }, componentLabel: { ...typography.caption, color: colors.text, textAlign: 'center' },
  frameOuter: { alignItems: 'center', borderRadius: 8, borderWidth: 2, height: 59, justifyContent: 'center', width: 50 }, frameInner: { borderRadius: 5, borderWidth: 1, height: 43, width: 35 }, backgroundPreview: { borderRadius: 7, height: 48, width: '100%' }, signaturePreview: { alignItems: 'center', borderBottomWidth: 1, height: 34, justifyContent: 'center', width: '100%' }, signatureLine: { borderRadius: 2, height: 3, transform: [{ rotate: '-4deg' }], width: '72%' },
  infoPanel: { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderRadius: radius.md, borderWidth: 1, padding: 14 }, infoText: { ...typography.caption, color: colors.textSecondary }, detailPriceRow: { alignItems: 'center', borderTopColor: colors.borderStrong, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16 }, detailPriceLabel: { ...typography.eyebrow, color: colors.textSecondary }, detailPrice: { ...typography.control, fontSize: 14 },
  productList: { gap: 9 }, productRow: { alignItems: 'center', backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', minHeight: 92, overflow: 'hidden', paddingRight: 11 }, productImage: { height: 90, width: 90 }, productCopy: { flex: 1, gap: 4, paddingHorizontal: 10 }, productNameRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, productName: { color: colors.text, fontFamily: fonts.display, fontSize: 19 }, productMeta: { ...typography.caption, color: colors.textSecondary, fontSize: 10 }, starterBadge: { ...typography.eyebrow, borderRadius: radius.pill, borderWidth: 1, fontSize: 7, paddingHorizontal: 5, paddingVertical: 2 }, pricePill: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 7 }, productPrice: { fontFamily: fonts.bold, fontSize: 10 },
  previewNotice: { alignItems: 'center', paddingVertical: 4 }, previewNoticeText: { ...typography.eyebrow, color: colors.textMuted, fontSize: 8, textAlign: 'center' }, pressed: { opacity: .72 },
});
