import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Expand from 'lucide-react-native/icons/expand';
import Settings2 from 'lucide-react-native/icons/settings-2';
import ShoppingBag from 'lucide-react-native/icons/shopping-bag';
import type { ImageSourcePropType } from 'react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
import ProfileHeaderButton from '@/src/features/profile/components/ProfileHeaderButton';
import ProfileVitrineIdentity from '@/src/features/profile/components/ProfileVitrineIdentity';
import { ProtectorShopCard } from '@/src/features/retention/components/CallStreakCard';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

type StoreHubScreenProps = {
  preview?: boolean;
};

type StoreDestinationCardProps = {
  accessibilityLabel: string;
  accent: string;
  description: string;
  image: ImageSourcePropType;
  imageStyle?: object;
  label: string;
  onPress: () => void;
  testID: string;
  title: string;
  variant: 'showcase' | 'shop';
};

const SHOWCASE_IMAGE = require('../../../../assets/showcase/showcase-room-empty-v1.png');
const SHOP_IMAGE = require('../../../../assets/shop/atelier/supports/supports_gallery.png');

export default function StoreHubScreen({ preview = false }: StoreHubScreenProps = {}) {
  const { loading: profileLoading, profile } = useAuth();
  const { equipped } = useCosmetics();
  const openShowcase = () => router.push(preview ? '/showcase-preview' : '/showcase');
  const openShop = () => router.push({
    pathname: preview ? '/shop-preview' : '/shop',
    params: { scope: 'catalog' },
  } as never);
  const openProfile = () => router.push(preview ? '/profile-preview' : '/my-profile');
  const openSettings = () => router.push(preview ? '/settings-preview' : '/settings/profile');
  const pseudo = preview ? 'FabTheTap' : profile?.pseudo || 'Supporter';
  const profileTitle = preview ? 'Rookie du Call' : equipped.title?.name || 'Rookie du Call';
  const publicProfile = preview || profile?.profil_public !== false;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID="store-hub-scroll"
      >
        <GriffHeader
          accessory={(
            <Pressable
              accessibilityLabel="Ouvrir les paramètres"
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
          economy={preview ? { frags: 1480, volts: 320 } : undefined}
          leading={<ProfileHeaderButton preview={preview} pseudo={pseudo} />}
          variant="wallet"
        />

        <View style={styles.intro} testID="store-hub-intro">
          <Text style={styles.eyebrow}>COLLECTION & STYLE</Text>
          <Text accessibilityRole="header" style={styles.title}>MAGASIN</Text>
          <Text style={styles.subtitle}>Ta collection, en deux espaces.</Text>
        </View>

        <Pressable
          accessibilityHint="Affiche ton profil, ton classement et tes objets équipés."
          accessibilityLabel={`Ouvrir mon profil, ${pseudo}`}
          accessibilityRole="button"
          onPress={openProfile}
          style={({ pressed }) => [styles.profileCard, pressed && styles.cardPressed]}
          testID="store-hub-profile"
        >
          <ProfileVitrineIdentity
            level={null}
            loading={!preview && profileLoading}
            profileTitle={profileTitle}
            pseudo={pseudo}
            publicProfile={publicProfile}
          />
        </Pressable>

        <View accessibilityLabel="Espaces du Magasin" style={styles.destinations}>
          <StoreDestinationCard
            accessibilityLabel="Ouvrir ma Vitrine"
            accent={colors.volt}
            description="Compose ton espace et expose les objets que tu possèdes."
            image={SHOWCASE_IMAGE}
            label="OUVRIR"
            onPress={openShowcase}
            testID="store-hub-showcase"
            title="MA VITRINE"
            variant="showcase"
          />
          <StoreDestinationCard
            accessibilityLabel="Ouvrir la Boutique d’achat"
            accent="#C68458"
            description="Découvre et achète de nouveaux objets avec tes Volts."
            image={SHOP_IMAGE}
            imageStyle={styles.shopImage}
            label="EXPLORER"
            onPress={openShop}
            testID="store-hub-shop"
            title="BOUTIQUE"
            variant="shop"
          />
        </View>
        <ProtectorShopCard preview={preview} />
      </ScrollView>
    </Screen>
  );
}

function StoreDestinationCard({
  accessibilityLabel,
  accent,
  description,
  image,
  imageStyle,
  label,
  onPress,
  testID,
  title,
  variant,
}: StoreDestinationCardProps) {
  const Icon = variant === 'showcase' ? Expand : ShoppingBag;

  return (
    <Pressable
      accessibilityHint={variant === 'showcase'
        ? 'Affiche et personnalise tes objets possédés.'
        : 'Affiche le catalogue des objets disponibles à l’achat.'}
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
        style={[styles.cardImage, imageStyle]}
      />
      <LinearGradient
        colors={variant === 'showcase'
          ? ['rgba(4,7,10,.02)', 'rgba(4,7,10,.34)', 'rgba(4,7,10,.98)']
          : ['rgba(5,8,11,.18)', 'rgba(5,8,11,.62)', 'rgba(5,8,11,.98)']}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.48, 1]}
        start={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.accentLine, { backgroundColor: accent }]} />

      <View style={styles.cardContent}>
        <View style={[styles.iconWrap, { borderColor: `${accent}55` }]}>
          <Icon color={accent} size={20} strokeWidth={1.9} />
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
  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingBottom: layout.tabBarContentInset,
  },
  intro: {
    minHeight: 104,
    marginTop: 4,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  profileCard: {
    minHeight: 92,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundDeep,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.2 },
  title: { ...typography.displayMedium, marginTop: 6, color: colors.text },
  subtitle: { ...typography.bodyComfort, marginTop: 7, color: colors.textSecondary },
  settings: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  destinations: { paddingHorizontal: spacing.md, gap: 14 },
  card: {
    position: 'relative',
    minHeight: 228,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  cardPressed: { opacity: 0.84, transform: [{ scale: 0.992 }] },
  cardImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  shopImage: { left: '37%', width: '63%' },
  accentLine: { position: 'absolute', top: 0, right: 24, left: 24, height: 1, opacity: 0.9 },
  cardContent: {
    minHeight: 144,
    padding: 18,
    paddingTop: 28,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(5,8,11,.78)',
    borderWidth: 1,
  },
  cardCopy: { minWidth: 0, flex: 1 },
  cardTitle: { ...typography.sectionTitle, color: colors.text, letterSpacing: -0.2 },
  cardDescription: { ...typography.body, maxWidth: 255, marginTop: 5, color: colors.textSecondary },
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
