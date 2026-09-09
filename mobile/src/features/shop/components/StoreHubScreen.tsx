import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import Globe from 'lucide-react-native/icons/globe';
import Lock from 'lucide-react-native/icons/lock';
import Plus from 'lucide-react-native/icons/plus';
import ShoppingCart from 'lucide-react-native/icons/shopping-cart';
import Expand from 'lucide-react-native/icons/expand';
import Settings2 from 'lucide-react-native/icons/settings-2';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
import ProfileHeaderButton from '@/src/features/profile/components/ProfileHeaderButton';
import PlayerAvatar from '@/src/features/profile/avatars/PlayerAvatar';
import { t } from '@/src/lib/i18n';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import type { CosmeticShopData } from '../types';
import AtelierShopScreen from './AtelierShopScreen';
import GiftCardsPreviewSection from './GiftCardsPreviewSection';

type StoreHubScreenProps = {
  preview?: boolean;
  previewData?: CosmeticShopData;
};

const SHOWCASE_IMAGE = require('../../../../assets/showcase/showcase-room-empty-v1.png');

export default function StoreHubScreen({ preview = false, previewData }: StoreHubScreenProps = {}) {
  const [section, setSection] = useState<'showcase' | 'shop' | 'gift-cards'>('showcase');
  const { profile } = useAuth();
  const { equipped } = useCosmetics();
  const openShowcase = () => router.push(preview ? '/showcase-preview' : '/showcase');
  const openProfile = () => router.push(preview ? '/profile-preview' : '/my-profile');
  const openSettings = () => router.push(preview ? '/settings-preview' : '/settings/profile');
  const pseudo = preview ? 'FabTheTap' : profile?.pseudo || t('store.fallbackPseudo');
  const avatarId = preview ? 'chaos-smile' : profile?.avatar_id;
  const cosmetics = previewData?.equipped ?? equipped;
  const openLighting = () => router.push({ pathname: preview ? '/showcase-preview' : '/showcase', params: { atelier: 'lighting' } });
  const openFrames = () => router.push({ pathname: preview ? '/shop-preview' : '/shop', params: { scope: 'owned', tab: 'cadre_profil' } });
  const publicProfile = preview || profile?.profil_public !== false;

  const header = (
    <View style={styles.header}>
      {section === 'shop' ? <GriffHeader
        accessory={(
          <Pressable
            accessibilityLabel={t('store.settingsLabel')}
            accessibilityRole="button"
            hitSlop={4}
            onPress={openSettings}
            style={({ pressed }) => [styles.settings, pressed && styles.pressed]}
            testID="store-hub-settings"
          >
            <Settings2 color={colors.textSecondary} size={20} strokeWidth={1.9} />
          </Pressable>
        )}
        compact
        economy={preview ? { frags: 1480, volts: previewData?.balance ?? 320 } : undefined}
        leading={<ProfileHeaderButton preview={preview} pseudo={pseudo} />}
        variant="wallet"
      /> : null}

      <View accessibilityLabel={t('store.sectionsLabel')} accessibilityRole="tablist" style={styles.tabs}>
        {(preview ? ['showcase', 'shop', 'gift-cards'] as const : ['showcase', 'shop'] as const).map((key) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: section === key }}
            aria-selected={section === key}
            key={key}
            onPress={() => setSection(key)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <View style={styles.tabLabelWrap}>
              <Text style={[styles.tabLabel, section === key && styles.tabLabelActive]}>{t(key === 'showcase' ? 'store.showcaseTab' : key === 'shop' ? 'store.shopTab' : 'store.giftCardsTab')}</Text>
              {section === key ? <View pointerEvents="none" style={styles.tabUnderline} /> : null}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (section === 'shop') {
    return <AtelierShopScreen embedded headerContent={header} previewData={previewData} />;
  }

  if (preview && section === 'gift-cards') {
    return <Screen><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {header}
      <GiftCardsPreviewSection />
    </ScrollView></Screen>;
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="store-hub-scroll">
        {header}
        <View style={styles.intro} testID="store-hub-intro">
          <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={styles.heading}>{t('store.showcase.heading')}</Text>
          <Text style={styles.subtitle}>{t('store.showcase.subtitle')}</Text>
        </View>
        <View style={styles.hero}>
          <View style={styles.identityRow}>
            <Pressable accessibilityLabel={t('store.profileLabel', { pseudo })} accessibilityRole="button"
              onPress={openProfile} style={styles.identity} testID="store-hub-profile">
              <PlayerAvatar avatarId={avatarId} cosmetics={cosmetics} label={pseudo} size={48} />
              <View style={styles.identityCopy}>
                <Text style={styles.eyebrow}>{t('store.showcase.owner')}</Text>
                <Text numberOfLines={1} style={styles.pseudo}>{pseudo}</Text>
              </View>
            </Pressable>
            <Pressable accessibilityLabel={t('store.showcase.visibility')} accessibilityRole="button"
              onPress={openSettings} style={({ pressed }) => [styles.visibility, pressed && styles.pressed]}
              testID="store-hub-visibility">
              {publicProfile ? <Globe size={18} color={colors.textSecondary} /> : <Lock size={18} color={colors.textSecondary} />}
              <Text style={styles.visibilityText}>{t(publicProfile ? 'store.showcase.public' : 'store.showcase.private')}</Text>
              <ChevronDown size={18} color={colors.volt} />
            </Pressable>
          </View>
          <View style={styles.stage}>
            <Image source={SHOWCASE_IMAGE} resizeMode="cover" style={styles.sceneImage} />
            <Pressable accessibilityLabel={t('store.showcase.expand')} accessibilityRole="button"
              onPress={openShowcase} style={({ pressed }) => [styles.expand, pressed && styles.pressed]}>
              <Expand color={colors.text} size={20} />
            </Pressable>
            <Pressable accessibilityLabel={t('store.showcase.compose')} accessibilityRole="button"
              onPress={openShowcase} style={({ pressed }) => [styles.firstPiece, pressed && styles.pressed]}>
              <View style={styles.plusCircle}><Plus color={colors.text} size={28} /></View>
              <Text style={styles.firstPieceLabel}>{t('store.showcase.firstPiece')}</Text>
            </Pressable>
          </View>
          <Pressable accessibilityLabel={t('store.showcase.compose')} accessibilityRole="button"
            onPress={openShowcase} style={({ pressed }) => [styles.compose, pressed && styles.pressed]} testID="store-hub-showcase">
            <Text style={styles.composeLabel}>{t('store.showcase.compose')}</Text>
            <ArrowRight color={colors.background} size={24} />
          </Pressable>
        </View>
        <View style={styles.personalization}>
          <Text style={styles.sectionTitle}>{t('store.showcase.personalize')}</Text>
          <View style={styles.shortcuts}>
            <PersonalizationTile label={t('store.showcase.objects')} onPress={openShowcase} testID="store-hub-objects">
              <Image source={require('../../../../assets/rank/rank-tier-pedestal-v1.png')} resizeMode="contain" style={styles.pedestal} />
              <View style={styles.tilePlus}><Plus color={colors.text} size={26} /></View>
            </PersonalizationTile>
            <PersonalizationTile label={t('store.showcase.lights')} onPress={openLighting} testID="store-hub-lights">
              <Image source={SHOWCASE_IMAGE} resizeMode="cover" style={styles.lightArt} />
            </PersonalizationTile>
            <PersonalizationTile label={t('store.showcase.frame')} onPress={openFrames} testID="store-hub-frame">
              <PlayerAvatar avatarId={avatarId} cosmetics={cosmetics} label={pseudo} size={72} />
            </PersonalizationTile>
          </View>
          <Pressable accessibilityRole="button" onPress={() => setSection('shop')}
            style={({ pressed }) => [styles.shopLink, pressed && styles.pressed]} testID="store-hub-discover">
            <View style={styles.cart}><ShoppingCart size={26} color={colors.text} /></View>
            <View style={styles.shopCopy}>
              <Text style={styles.shopTitle}>{t('store.showcase.discover')}</Text>
              <Text style={styles.shopSubtitle}>{t('store.showcase.inShop')}</Text>
            </View>
            <ChevronRight color={colors.text} size={24} />
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function PersonalizationTile({ children, label, onPress, testID }: {
  children: ReactNode; label: string; onPress: () => void; testID: string;
}) {
  return <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress}
    style={({ pressed }) => [styles.tile, pressed && styles.pressed]} testID={testID}>
    <View pointerEvents="none" style={styles.tileArt}>{children}</View>
    <Text style={styles.tileLabel}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  header: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: layout.tabBarContentInset },
  tabs: { marginHorizontal: spacing.md, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  tabLabelWrap: { paddingBottom: 5 },
  tabLabel: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 16, lineHeight: 22 },
  tabLabelActive: { fontFamily: fonts.bold, color: colors.text },
  tabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2, backgroundColor: colors.volt },
  settings: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14,
    backgroundColor: colors.surfaceGlassElevated, borderWidth: 1, borderColor: colors.borderHighlight },
  intro: { paddingHorizontal: spacing.md, paddingTop: 16, paddingBottom: 18 },
  heading: { ...typography.sectionTitle, fontSize: 25, lineHeight: 31, letterSpacing: -.6, color: colors.text },
  subtitle: { ...typography.body, fontSize: 16, lineHeight: 23, color: colors.textSecondary },
  hero: { marginHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.borderStrong,
    overflow: 'hidden', backgroundColor: colors.surfaceGlass },
  identityRow: { padding: 12, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 8 },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  identityCopy: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.metadata, fontSize: 10, lineHeight: 15, color: colors.textSecondary, letterSpacing: .5 },
  pseudo: { ...typography.sectionTitle, fontSize: 21, lineHeight: 26, color: colors.text },
  visibility: { minHeight: 38, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.pill, backgroundColor: colors.background },
  visibilityText: { ...typography.control, color: colors.volt, fontSize: 13 },
  stage: { aspectRatio: 1.57, overflow: 'hidden', borderRadius: 12, backgroundColor: colors.background },
  sceneImage: { position: 'absolute', width: '100%', height: '100%' },
  expand: { position: 'absolute', top: 10, right: 10, width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(5,17,24,.85)', borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  firstPiece: { position: 'absolute', bottom: '18%', alignSelf: 'center', alignItems: 'center', gap: 5 },
  plusCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.volt,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,17,24,.8)' },
  firstPieceLabel: { ...typography.caption, color: colors.text, fontSize: 10 },
  compose: { margin: 12, minHeight: 44, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.volt, borderRadius: 10 },
  composeLabel: { ...typography.action, color: colors.background, fontSize: 17, lineHeight: 22 },
  personalization: { paddingHorizontal: 12, paddingTop: 18 },
  sectionTitle: { ...typography.sectionTitle, color: colors.text, fontSize: 23, lineHeight: 29, marginBottom: 10 },
  shortcuts: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, minWidth: 0, aspectRatio: 1.06, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12,
    overflow: 'hidden', backgroundColor: colors.surfaceGlass, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 },
  tileArt: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tileLabel: { ...typography.control, color: colors.text, fontSize: 14, lineHeight: 19 },
  pedestal: { position: 'absolute', bottom: -8, width: '100%', height: '70%' },
  tilePlus: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.volt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4, backgroundColor: colors.background },
  lightArt: { position: 'absolute', width: '220%', height: '240%', left: '-60%', top: '-20%' },
  shopLink: { marginTop: 16, minHeight: 60, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceGlass },
  cart: { paddingRight: 12, borderRightWidth: 1, borderRightColor: colors.borderSubtle },
  shopCopy: { flex: 1, minWidth: 0 },
  shopTitle: { ...typography.bodyStrong, fontSize: 15, lineHeight: 20, color: colors.text },
  shopSubtitle: { ...typography.caption, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  pressed: { opacity: .7 },
});
