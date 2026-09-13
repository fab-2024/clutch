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

function PackCampaign({ pack, onPress }: { pack: IdentityPack; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={`Découvrir le pack ${pack.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.campaign, pressed && styles.pressed]}
      testID={`identity-shop-${pack.id}`}
    >
      <Image resizeMode="cover" source={IDENTITY_PACK_HERO[pack.id]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['transparent', 'rgba(3,8,13,.2)', 'rgba(3,8,13,.98)']} locations={[0, .42, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.campaignTopline}>
        <View style={[styles.collectionPill, { borderColor: `${pack.accent}88` }]}>
          <Text style={[styles.collectionPillText, { color: pack.accent }]}>PACK PROFIL</Text>
        </View>
        <Text style={styles.campaignCount}>3 OBJETS</Text>
      </View>
      <View style={styles.campaignCopy}>
        <Text style={styles.campaignTitle}>{pack.name}</Text>
        <Text style={styles.campaignMaterial}>{pack.material}</Text>
        <Text numberOfLines={2} style={styles.campaignDescription}>{pack.description}</Text>
        <View style={styles.campaignAction}>
          <Text style={[styles.campaignPrice, { color: pack.accent }]}>{identityAccessLabel(pack.access).replace(' · Prix envisagé', '')}</Text>
          <View style={[styles.openButton, { backgroundColor: pack.accent }]}>
            <Text style={styles.openButtonText}>OUVRIR</Text>
            <ChevronRight color="#060A0E" size={16} strokeWidth={2.3} />
          </View>
        </View>
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
      style={({ pressed }) => [styles.universeCampaign, { borderColor: `${universe.accent}58` }, pressed && styles.pressed]}
      testID={`figurine-universe-${universe.id}`}
    >
      <LinearGradient colors={[`${universe.accent}30`, '#111923', '#080D13']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.universeArtWrap}>
        <Image resizeMode="contain" source={featured.image} style={styles.universeArt} />
      </View>
      <LinearGradient colors={['rgba(4,8,12,.04)', 'rgba(4,8,12,.96)']} start={{ x: .35, y: 0 }} end={{ x: .78, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={styles.universeCopy}>
        <Text style={[styles.universeEyebrow, { color: universe.accent }]}>UNIVERS · {universe.items.length} FIGURINES</Text>
        <Text style={styles.universeTitle}>{universe.name}</Text>
        <Text style={styles.universeDescription}>Collectionne chaque forme et débloque ses évolutions en jouant.</Text>
        <View style={[styles.universeButton, { borderColor: `${universe.accent}BB` }]}>
          <Text style={[styles.universeButtonText, { color: universe.accent }]}>VOIR LA COLLECTION</Text>
          <ChevronRight color={universe.accent} size={17} />
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

  return (
    <View style={styles.root} testID="current-collection-shop">
      {showPacks ? <View style={styles.section}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.eyebrow}>PERSONNALISATION DU PROFIL</Text>
            <Text style={styles.heading}>Collections complètes</Text>
          </View>
          <Text style={styles.headingCount}>12</Text>
        </View>
        <Text style={styles.sectionDescription}>Cadre, fond et signature dans une même direction artistique. Ton avatar reste indépendant.</Text>
        <View style={styles.campaignList}>
          {IDENTITY_PACKS.map((pack) => <PackCampaign key={pack.id} onPress={() => setDetail({ kind: 'pack', pack })} pack={pack} />)}
        </View>
      </View> : null}

      {showFigurines ? <View style={styles.section}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.eyebrow}>FIGURINES</Text>
            <Text style={styles.heading}>Choisis ton univers</Text>
          </View>
          <Text style={styles.headingCount}>24</Text>
        </View>
        <Text style={styles.sectionDescription}>Brumousse, Écho ou Grelot est offert au départ. Toutes les évolutions se gagnent ensuite en jouant.</Text>
        <View style={styles.campaignList}>
          {FIGURINE_UNIVERSES.map((universe) => <UniverseCampaign key={universe.id} onPress={() => setDetail({ kind: 'universe', universe })} universe={universe} />)}
        </View>
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
  root: { gap: 30 }, section: { gap: 12 }, headingRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { ...typography.eyebrow, color: colors.volt, fontSize: 10 }, heading: { color: colors.text, fontFamily: fonts.display, fontSize: 27, lineHeight: 31, marginTop: 2 },
  headingCount: { color: colors.textMuted, fontFamily: fonts.display, fontSize: 22 }, sectionDescription: { ...typography.caption, color: colors.textSecondary, maxWidth: 440 }, campaignList: { gap: 14 },
  campaign: { backgroundColor: '#080D13', borderColor: colors.borderStrong, borderRadius: radius.lg, borderWidth: 1, height: 256, justifyContent: 'space-between', overflow: 'hidden' },
  campaignTopline: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 }, collectionPill: { backgroundColor: 'rgba(5,9,13,.76)', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  collectionPillText: { ...typography.eyebrow, fontSize: 9 }, campaignCount: { ...typography.eyebrow, color: colors.textSecondary, fontSize: 9 }, campaignCopy: { gap: 5, padding: 16 },
  campaignTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 30, lineHeight: 32 }, campaignMaterial: { ...typography.control, color: colors.text, fontSize: 12 }, campaignDescription: { ...typography.caption, color: colors.textSecondary, maxWidth: '85%' },
  campaignAction: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }, campaignPrice: { ...typography.control, fontSize: 12, flexShrink: 1 },
  openButton: { alignItems: 'center', borderRadius: radius.pill, flexDirection: 'row', gap: 2, paddingHorizontal: 13, paddingVertical: 8 }, openButtonText: { color: '#060A0E', fontFamily: fonts.bold, fontSize: 10 },
  universeCampaign: { backgroundColor: '#080D13', borderRadius: radius.lg, borderWidth: 1, height: 222, justifyContent: 'center', overflow: 'hidden' }, universeArtWrap: { bottom: -30, height: 250, position: 'absolute', right: -42, width: 250 }, universeArt: { height: '100%', width: '100%' },
  universeCopy: { gap: 8, padding: 18, width: '66%', zIndex: 2 }, universeEyebrow: { ...typography.eyebrow, fontSize: 9 }, universeTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 26, lineHeight: 29 }, universeDescription: { ...typography.caption, color: colors.textSecondary },
  universeButton: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: 4, marginTop: 4, paddingHorizontal: 11, paddingVertical: 7 }, universeButtonText: { ...typography.eyebrow, fontSize: 9 },
  modal: { backgroundColor: colors.background, flex: 1, paddingTop: 8 }, closeButton: { alignItems: 'center', alignSelf: 'flex-end', height: 44, justifyContent: 'center', marginRight: 10, width: 44, zIndex: 3 }, detailContent: { gap: 18, paddingBottom: 50, paddingHorizontal: spacing.md },
  detailHero: { borderColor: colors.borderStrong, borderRadius: radius.lg, borderWidth: 1, height: 300, justifyContent: 'flex-end', overflow: 'hidden' }, universeDetailHero: { borderRadius: radius.lg, borderWidth: 1, height: 330, justifyContent: 'flex-end', overflow: 'hidden' }, universeDetailArt: { bottom: -28, height: 310, position: 'absolute', right: -45, width: 310 },
  detailHeroCopy: { gap: 5, padding: 18 }, detailEyebrow: { ...typography.eyebrow, fontSize: 10 }, detailTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 34, lineHeight: 38 }, detailSubtitle: { ...typography.control, color: colors.textSecondary }, detailDescription: { ...typography.body, color: colors.textSecondary },
  detailSectionHeading: { alignItems: 'center', flexDirection: 'row', gap: 8 }, detailSectionTitle: { ...typography.eyebrow, color: colors.text }, componentsRow: { flexDirection: 'row', gap: 8 }, componentTile: { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, borderWidth: 1, flex: 1, gap: 8, padding: 9 }, componentPreview: { alignItems: 'center', height: 72, justifyContent: 'center' }, componentLabel: { ...typography.caption, color: colors.text, textAlign: 'center' },
  frameOuter: { alignItems: 'center', borderRadius: 8, borderWidth: 2, height: 59, justifyContent: 'center', width: 50 }, frameInner: { borderRadius: 5, borderWidth: 1, height: 43, width: 35 }, backgroundPreview: { borderRadius: 7, height: 48, width: '100%' }, signaturePreview: { alignItems: 'center', borderBottomWidth: 1, height: 34, justifyContent: 'center', width: '100%' }, signatureLine: { borderRadius: 2, height: 3, transform: [{ rotate: '-4deg' }], width: '72%' },
  infoPanel: { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderRadius: radius.md, borderWidth: 1, padding: 14 }, infoText: { ...typography.caption, color: colors.textSecondary }, detailPriceRow: { alignItems: 'center', borderTopColor: colors.borderStrong, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16 }, detailPriceLabel: { ...typography.eyebrow, color: colors.textSecondary }, detailPrice: { ...typography.control, fontSize: 14 },
  productList: { gap: 9 }, productRow: { alignItems: 'center', backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', minHeight: 92, overflow: 'hidden', paddingRight: 11 }, productImage: { height: 90, width: 90 }, productCopy: { flex: 1, gap: 4, paddingHorizontal: 10 }, productNameRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, productName: { color: colors.text, fontFamily: fonts.display, fontSize: 19 }, productMeta: { ...typography.caption, color: colors.textSecondary, fontSize: 10 }, starterBadge: { ...typography.eyebrow, borderRadius: radius.pill, borderWidth: 1, fontSize: 7, paddingHorizontal: 5, paddingVertical: 2 }, pricePill: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 7 }, productPrice: { fontFamily: fonts.bold, fontSize: 10 },
  previewNotice: { alignItems: 'center', paddingVertical: 4 }, previewNoticeText: { ...typography.eyebrow, color: colors.textMuted, fontSize: 8, textAlign: 'center' }, pressed: { opacity: .72 },
});
