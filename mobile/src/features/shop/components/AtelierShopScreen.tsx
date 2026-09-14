import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import ConsumablesShopSection from '@/src/features/consumables/components/ConsumablesShopSection';
import type { ProfileData } from '@/src/features/profile/types';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, layout, radius, spacing, typography } from '@/src/theme';
import { returnToCollection } from '../shopNavigation';
import type { CosmeticShopData } from '../types';
import CurrentCollectionShop from './CurrentCollectionShop';
import { ShopCategoryMenu, type ShopCategory } from './ShopCategoryMenu';

export type AtelierPreviewState = {
  acquisitionProductId?: string;
  error?: string | null;
  forceReduceMotion?: boolean;
  loading?: boolean;
  productId?: string;
  purchaseOpen?: boolean;
};

export type AtelierShopScreenProps = {
  embedded?: boolean;
  headerContent?: ReactNode;
  initialCategory?: ShopCategory;
  previewData?: CosmeticShopData;
  previewProfile?: ProfileData;
  previewState?: AtelierPreviewState;
};

export default function AtelierShopScreen({
  embedded = false,
  headerContent,
  initialCategory = 'all',
  previewData,
  previewProfile,
  previewState,
}: AtelierShopScreenProps) {
  const [category, setCategory] = useState<ShopCategory>(initialCategory);
  const { height } = useWindowDimensions();
  const { unlimitedVolts, volts } = useEconomy();
  const compact = height < 700;
  const balance = previewData?.balance ?? volts ?? 0;

  useEffect(() => setCategory(initialCategory), [initialCategory]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, compact && styles.scrollContentCompact]}
        showsVerticalScrollIndicator={false}
        testID="shop-catalog-scroll"
      >
        {headerContent}
        <View style={styles.content}>
          {!embedded ? <ShopHeader balance={balance} unlimitedVolts={!previewData && unlimitedVolts} /> : null}
          <ShopCategoryMenu onSelect={setCategory} selected={category} />

          {previewState?.error ? <View accessibilityRole="alert" style={styles.errorBanner}>
            <Text style={styles.errorTitle}>BOUTIQUE INDISPONIBLE</Text>
            <Text style={styles.errorText}>{previewState.error}</Text>
          </View> : null}

          {previewState?.loading ? <CatalogSkeleton /> : <View style={styles.catalog} testID="atelier-catalog">
            {category === 'all' ? <View style={styles.intro}>
              <View style={styles.introTopline}>
                <Text style={styles.introEyebrow}>BOUTIQUE CLUTCH</Text>
                <Text style={styles.introSeason}>SAISON 1</Text>
              </View>
              <Text style={styles.introTitle}>CONSTRUIS TON IDENTITÉ.</Text>
              <Text style={styles.introText}>Packs de profil, figurines et protections réunis dans des rayons plus rapides à parcourir.</Text>
            </View> : null}

            <CurrentCollectionShop category={category} />
            {category === 'all' || category === 'consumables' ? <ConsumablesShopSection preview={Boolean(previewData || previewProfile)} /> : null}
          </View>}
        </View>
      </ScrollView>
    </Screen>
  );
}

function ShopHeader({ balance, unlimitedVolts }: { balance: number; unlimitedVolts: boolean }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Revenir à la collection" accessibilityRole="button" onPress={() => returnToCollection(false)} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={styles.headerTitle}>BOUTIQUE</Text>
      <View accessibilityLabel={unlimitedVolts ? 'Volts illimités' : `${formatNumber(balance)} Volts disponibles`} style={styles.balance}>
        <CurrencyIcon kind="volts" size={17} />
        <Text style={styles.balanceValue}>{unlimitedVolts ? '∞' : formatNumber(balance)}</Text>
      </View>
    </View>
  );
}

function CatalogSkeleton() {
  return (
    <SkeletonGroup label="Chargement du catalogue" style={styles.skeleton} testID="atelier-catalog-loading">
      <Skeleton height={28} radius="sm" width="68%" />
      <Skeleton height={256} radius="lg" width="100%" />
      <Skeleton height={256} radius="lg" tone="subtle" width="100%" />
    </SkeletonGroup>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.max(0, Math.round(value)));
}

const styles = StyleSheet.create({
  scrollContent: { alignSelf: 'center', paddingBottom: layout.tabBarContentInset + spacing.xl, width: '100%', maxWidth: layout.contentMaxWidth },
  scrollContentCompact: { paddingBottom: spacing.xl }, content: { gap: 12, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', height: 68, justifyContent: 'space-between', paddingHorizontal: spacing.md },
  back: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }, backText: { color: colors.text, fontSize: 38, lineHeight: 40 },
  headerTitle: { ...typography.sectionTitle, color: colors.text, fontSize: 22 }, balance: { alignItems: 'center', backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: 7, minHeight: 40, paddingHorizontal: 12 }, balanceValue: { ...typography.metricSmall, color: colors.text },
  catalog: { gap: 32, paddingHorizontal: spacing.md },
  intro: { backgroundColor: 'rgba(16,43,58,.58)', borderColor: colors.borderStrong, borderRadius: radius.lg, borderWidth: 1, gap: 5, overflow: 'hidden', padding: 16 },
  introTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  introEyebrow: { ...typography.eyebrow, color: colors.volt, fontSize: 9 },
  introSeason: { ...typography.eyebrow, color: colors.textSecondary, fontSize: 8 },
  introTitle: { ...typography.sectionTitle, color: colors.text, fontSize: 25, lineHeight: 30 },
  introText: { ...typography.body, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  errorBanner: { backgroundColor: colors.surfaceRaised, borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1, gap: 4, marginHorizontal: spacing.md, padding: 14 }, errorTitle: { ...typography.eyebrow, color: colors.danger }, errorText: { ...typography.caption, color: colors.textSecondary },
  skeleton: { gap: 16, paddingHorizontal: spacing.md, paddingTop: spacing.md },
});
