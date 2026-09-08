import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Expand from 'lucide-react-native/icons/expand';
import Settings2 from 'lucide-react-native/icons/settings-2';
import { useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
import ProfileHeaderButton from '@/src/features/profile/components/ProfileHeaderButton';
import ProfileVitrineIdentity from '@/src/features/profile/components/ProfileVitrineIdentity';
import { t } from '@/src/lib/i18n';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import type { CosmeticShopData } from '../types';
import AtelierShopScreen from './AtelierShopScreen';

type StoreHubScreenProps = {
  preview?: boolean;
  previewData?: CosmeticShopData;
};

type StoreDestinationCardProps = {
  accessibilityLabel: string;
  accent: string;
  description: string;
  image: ImageSourcePropType;
  label: string;
  onPress: () => void;
  testID: string;
  title: string;
};

const SHOWCASE_IMAGE = require('../../../../assets/showcase/showcase-room-empty-v1.png');

export default function StoreHubScreen({ preview = false, previewData }: StoreHubScreenProps = {}) {
  const [section, setSection] = useState<'showcase' | 'shop'>('showcase');
  const { loading: profileLoading, profile } = useAuth();
  const { equipped } = useCosmetics();
  const openShowcase = () => router.push(preview ? '/showcase-preview' : '/showcase');
  const openProfile = () => router.push(preview ? '/profile-preview' : '/my-profile');
  const openSettings = () => router.push(preview ? '/settings-preview' : '/settings/profile');
  const pseudo = preview ? 'FabTheTap' : profile?.pseudo || t('store.fallbackPseudo');
  const profileTitle = preview ? 'Rookie du Call' : equipped.title?.name || 'Rookie du Call';
  const publicProfile = preview || profile?.profil_public !== false;

  const header = (
    <View style={styles.header}>
      <GriffHeader
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
      />

      <View accessibilityLabel={t('store.sectionsLabel')} accessibilityRole="tablist" style={styles.tabs}>
        {(['showcase', 'shop'] as const).map((key) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: section === key }}
            aria-selected={section === key}
            key={key}
            onPress={() => setSection(key)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <View style={styles.tabLabelWrap}>
              <Text style={[styles.tabLabel, section === key && styles.tabLabelActive]}>{t(key === 'showcase' ? 'store.showcaseTab' : 'store.shopTab')}</Text>
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

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="store-hub-scroll">
        {header}
        <Pressable
          accessibilityHint={t('store.profileHint')}
          accessibilityLabel={t('store.profileLabel', { pseudo })}
          accessibilityRole="button"
          onPress={openProfile}
          style={({ pressed }) => [styles.profileCard, pressed && styles.cardPressed]}
          testID="store-hub-profile"
        >
          <ProfileVitrineIdentity
            compact
            level={null}
            loading={!preview && profileLoading}
            profileTitle={profileTitle}
            pseudo={pseudo}
            publicProfile={publicProfile}
          />
        </Pressable>

        <View accessibilityLabel={t('store.destinationsLabel')} style={styles.destinations}>
          <StoreDestinationCard
            accessibilityLabel={t('store.showcaseLabel')}
            accent={colors.volt}
            description={t('store.showcase.description')}
            image={SHOWCASE_IMAGE}
            label={t('store.showcase.action')}
            onPress={openShowcase}
            testID="store-hub-showcase"
            title={t('store.showcase.title')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function StoreDestinationCard({
  accessibilityLabel,
  accent,
  description,
  image,
  label,
  onPress,
  testID,
  title,
}: StoreDestinationCardProps) {

  return (
    <Pressable
      accessibilityHint={t('store.showcaseHint')}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      testID={testID}
    >
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={image}
        style={styles.cardImage}
      />
      <LinearGradient
        colors={['rgba(5,17,24,.01)', 'rgba(6,27,38,.24)', 'rgba(7,25,35,.92)']}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.48, 1]}
        start={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.accentLine, { backgroundColor: accent }]} />

      <View style={styles.cardContent}>
        <View style={[styles.iconWrap, { borderColor: `${accent}55` }]}>
          <Expand color={accent} size={20} strokeWidth={1.9} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
        <View style={styles.action}>
          <Text style={[styles.actionLabel, { color: accent }]}>{label}</Text>
          <ChevronRight color={accent} size={17} strokeWidth={2.2} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingBottom: layout.tabBarContentInset,
  },
  tabs: { marginHorizontal: spacing.md, marginBottom: 10, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(143,156,176,.22)' },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  tabLabelWrap: { paddingBottom: 5 },
  tabLabel: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  tabLabelActive: { fontFamily: fonts.bold, color: colors.text },
  tabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2, backgroundColor: colors.text },
  profileCard: {
    minHeight: 72,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    boxShadow: '0 16px 34px rgba(0,0,0,.22)',
  },
  settings: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.surfaceGlassElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  destinations: { paddingHorizontal: spacing.md, gap: 14 },
  card: {
    position: 'relative',
    minHeight: 176,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    boxShadow: '0 20px 42px rgba(0,0,0,.28)',
  },
  cardPressed: { opacity: 0.84, transform: [{ scale: 0.992 }] },
  cardImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  accentLine: { position: 'absolute', top: 0, right: 24, left: 24, height: 1, opacity: 0.9 },
  cardContent: {
    minHeight: 104,
    padding: 12,
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  iconWrap: {
    width: 42,
    height: 42,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(8,20,28,.86)',
    borderWidth: 1,
  },
  cardCopy: { minWidth: 0, flex: 1 },
  cardTitle: { ...typography.sectionTitle, fontSize: 20, lineHeight: 24, color: colors.text, letterSpacing: -0.2 },
  cardDescription: { ...typography.body, fontSize: 12, lineHeight: 17, maxWidth: 255, marginTop: 5, color: colors.textSecondary },
  action: {
    minHeight: layout.minTouchTarget,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionLabel: { ...typography.action, letterSpacing: 0.7 },
  pressed: { opacity: 0.68 },
});
