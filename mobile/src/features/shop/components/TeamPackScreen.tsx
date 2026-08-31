import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { BaseSheet } from '@/src/components/overlays/BaseSheet';
import { Button } from '@/src/components/ui/Button';
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { errorFeedback, selectionFeedback, successFeedback } from '@/src/lib/feedback';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { useSnackbar } from '@/src/providers/SnackbarProvider';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import {
  equipCosmeticPack,
  loadCosmeticShop,
  purchaseCosmeticPack,
} from '../api';
import {
  applyPreviewTeamPackAction,
  FNATIC_TEAM_PACK,
  teamPackById,
  teamPackPrimaryAction,
  type TeamPackDefinition,
  type TeamPackItemDefinition,
  type TeamPackPrimaryAction,
} from '../teamPackCatalog';
import type { CosmeticShopData } from '../types';

export type TeamPackScreenProps = {
  packId?: string;
  previewData?: CosmeticShopData;
};

export default function TeamPackScreen({ packId, previewData }: TeamPackScreenProps) {
  const params = useLocalSearchParams<{ key?: string | string[] }>();
  const routeId = packId ?? readParam(params.key) ?? FNATIC_TEAM_PACK.id;
  const pack = teamPackById(routeId);
  const { refresh: refreshCosmetics } = useCosmetics();
  const { refresh: refreshEconomy } = useEconomy();
  const { showSnackbar } = useSnackbar();
  const [data, setData] = useState<CosmeticShopData | null>(previewData ?? null);
  const [loading, setLoading] = useState(!previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<TeamPackItemDefinition | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (refresh = false) => {
    if (previewData) {
      setData(previewData);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const requestId = ++requestRef.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const nextData = await loadCosmeticShop();
      if (requestId === requestRef.current) setData(nextData);
    } catch (caught) {
      if (requestId === requestRef.current) setError(friendlyError(caught));
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [previewData]);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  const runtimeById = useMemo(
    () => new Map((data?.items ?? []).map((item) => [item.id, item])),
    [data?.items],
  );
  const action = pack ? teamPackPrimaryAction(pack, data) : 'unavailable';

  async function handlePrimaryAction() {
    if (!pack || !data || pending || (action !== 'buy' && action !== 'equip')) return;
    const previous = data;
    setPending(true);
    setError(null);
    try {
      const mutation = previewData
        ? null
        : action === 'buy'
          ? await purchaseCosmeticPack(pack.id)
          : await equipCosmeticPack(pack.id);
      const next = applyPreviewTeamPackAction(previous, pack);
      setData(mutation ? { ...next, balance: mutation.balance } : next);
      successFeedback();
      showSnackbar({
        message: action === 'buy'
          ? `${pack.name} débloqué et équipé dans ta Vitrine.`
          : `Le ${pack.name} équipe maintenant ta Vitrine.`,
        tone: 'success',
      });

      if (!previewData) {
        const requestId = ++requestRef.current;
        void Promise.allSettled([
          loadCosmeticShop(),
          refreshCosmetics(),
          refreshEconomy(),
        ]).then(([shopResult]) => {
          if (requestId !== requestRef.current || shopResult.status !== 'fulfilled') return;
          setData(shopResult.value);
        });
      }
    } catch (caught) {
      setData(previous);
      setError(friendlyError(caught));
      errorFeedback();
    } finally {
      setPending(false);
    }
  }

  if (!pack) {
    return (
      <Screen>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEyebrow}>PACK ÉQUIPE</Text>
          <Text style={styles.emptyTitle}>PACK INTROUVABLE</Text>
          <Text style={styles.emptyText}>Cette collection n’est plus disponible dans la Boutique.</Text>
          <Button label="REVENIR À LA BOUTIQUE" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={(
            <RefreshControl
              onRefresh={() => void load(true)}
              refreshing={refreshing}
              tintColor={pack.accent}
            />
          )}
          showsVerticalScrollIndicator={false}
          testID="team-pack-scroll"
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Revenir à la Boutique"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <Text style={styles.backGlyph}>‹</Text>
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={[styles.headerEyebrow, { color: pack.accent }]}>PACK ÉQUIPE // OFFICIEL</Text>
              <Text style={styles.headerTitle}>{pack.name.toLocaleUpperCase('fr-FR')}</Text>
            </View>
            <View style={styles.itemCount}>
              <Text style={styles.itemCountValue}>{pack.items.length}</Text>
              <Text style={styles.itemCountLabel}>OBJETS</Text>
            </View>
          </View>

          <View style={[styles.hero, { borderColor: `${pack.accent}80` }]} testID="team-pack-hero">
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={pack.hero}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(4,5,7,.06)', 'rgba(4,5,7,.20)', 'rgba(4,5,7,.98)']}
              locations={[0, 0.56, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <Text style={[styles.heroTeam, { color: pack.accent }]}>{pack.title}</Text>
              <Text style={styles.heroSubtitle}>{pack.subtitle}</Text>
              <Text style={styles.heroDescription}>{pack.description}</Text>
              <View style={styles.heroMeta}>
                <View style={[styles.officialPill, { borderColor: `${pack.accent}52` }]}>
                  <View style={[styles.officialDot, { backgroundColor: pack.accent }]} />
                  <Text style={styles.officialText}>COLLECTION OFFICIELLE</Text>
                </View>
                <Text style={styles.heroMetaText}>{pack.items.length} COSMÉTIQUES</Text>
              </View>
            </View>
          </View>

          {error ? (
            <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorBanner}>
              <Text style={styles.errorTitle}>SYNCHRONISATION IMPOSSIBLE</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable accessibilityRole="button" onPress={() => void load()}>
                <Text style={[styles.retry, { color: pack.accent }]}>RÉESSAYER</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.collectionHeading}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: pack.accent }]}>CONTENU DU PACK</Text>
              <Text style={styles.sectionTitle}>{pack.subtitle}</Text>
            </View>
            <Text style={styles.inspectHint}>TOUCHE POUR INSPECTER</Text>
          </View>

          {loading ? (
            <View accessibilityLabel={`Chargement du ${pack.name}`} accessibilityRole="progressbar" style={styles.loading}>
              <ActivityIndicator color={pack.accent} />
              <Text style={styles.loadingText}>SYNCHRONISATION DES {pack.items.length} OBJETS…</Text>
            </View>
          ) : (
            <View style={styles.itemGrid} testID="team-pack-item-grid">
              {pack.items.map((item) => {
                const runtime = runtimeById.get(item.id);
                return (
                  <Pressable
                    accessibilityHint="Ouvre la fiche détaillée de cet objet"
                    accessibilityLabel={`${item.name}, objet ${item.number} sur ${pack.items.length}${runtime?.owned ? ', possédé' : ''}`}
                    accessibilityRole="button"
                    key={item.id}
                    onPress={() => {
                      selectionFeedback();
                      setSelectedItem(item);
                    }}
                    style={({ pressed }) => [
                      styles.itemCard,
                      runtime?.owned && { borderColor: `${pack.accent}70` },
                      pressed && styles.pressed,
                    ]}
                    testID={`team-pack-item-${item.id}`}
                  >
                    <View style={styles.itemVisual}>
                      <Image
                        accessibilityIgnoresInvertColors
                        resizeMode="cover"
                        source={item.image}
                        style={styles.itemImage}
                      />
                      <View style={[styles.numberPill, { borderColor: `${pack.accent}80` }]}>
                        <Text style={[styles.numberText, { color: pack.accent }]}>{item.number}</Text>
                      </View>
                      {runtime?.owned ? (
                        <View style={styles.ownedPill}>
                          <Text style={[styles.ownedText, { color: pack.accent }]}>{runtime.equipped ? 'ÉQUIPÉ' : 'POSSÉDÉ'}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.itemCopy}>
                      <Text numberOfLines={1} style={styles.itemName}>{item.name}</Text>
                      <Text numberOfLines={1} style={styles.itemType}>{slotLabel(item.slot)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={[styles.licenseBlock, { borderColor: `${pack.accent}38` }]}>
            <Text style={[styles.licenseTitle, { color: pack.accent }]}>{pack.licenseHolder.toLocaleUpperCase('fr-FR')} × CLUTCH</Text>
            <Text style={styles.licenseText}>
              Collection cosmétique officielle. Aucun objet ne modifie le rang, les Calls ou les performances.
            </Text>
          </View>
        </ScrollView>

        <TeamPackActionDock
          action={action}
          balance={data?.balance ?? 0}
          onPress={() => void handlePrimaryAction()}
          pack={pack}
          pending={pending}
        />

        <BaseSheet
          eyebrow={`PACK ${pack.title} // OBJET`}
          footer={<Button fullWidth label="FERMER" onPress={() => setSelectedItem(null)} variant="secondary" />}
          onClose={() => setSelectedItem(null)}
          testID="team-pack-item-sheet"
          title={selectedItem?.name ?? `Objet ${pack.title}`}
          visible={Boolean(selectedItem)}
        >
          {selectedItem ? (
            <View style={styles.sheetContent}>
              <View style={[styles.sheetImageWrap, { borderColor: `${pack.accent}70` }]}>
                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode="contain"
                  source={selectedItem.image}
                  style={styles.sheetImage}
                />
              </View>
              <View style={styles.sheetMetaRow}>
                <Text style={[styles.sheetNumber, { color: pack.accent }]}>OBJET {selectedItem.number}/{pack.items.length}</Text>
                <Text style={styles.sheetSlot}>{slotLabel(selectedItem.slot)}</Text>
              </View>
              <Text style={styles.sheetDescription}>{selectedItem.description}</Text>
              <View style={[styles.sheetStatus, { borderColor: `${pack.accent}38` }]}>
                <View style={[styles.officialDot, { backgroundColor: pack.accent }]} />
                <Text style={styles.sheetStatusText}>
                  {runtimeById.get(selectedItem.id)?.owned ? 'DANS TA COLLECTION' : 'INCLUS DANS LE PACK'}
                </Text>
              </View>
            </View>
          ) : null}
        </BaseSheet>
      </View>
    </Screen>
  );
}

function TeamPackActionDock({
  action,
  balance,
  onPress,
  pack,
  pending,
}: {
  action: TeamPackPrimaryAction;
  balance: number;
  onPress: () => void;
  pack: TeamPackDefinition;
  pending: boolean;
}) {
  const disabled = pending || action === 'equipped' || action === 'insufficient' || action === 'unavailable';
  return (
    <View style={[styles.dock, { borderTopColor: `${pack.accent}42` }]} testID="team-pack-action-dock">
      <View style={styles.dockCopy}>
        <Text style={styles.dockEyebrow}>PACK COMPLET</Text>
        {action === 'buy' || action === 'insufficient' ? (
          <View accessibilityLabel={`${formatNumber(pack.price)} Volts`} style={styles.dockPrice}>
            <CurrencyIcon kind="volts" size={15} />
            <Text style={styles.dockPriceText}>{formatNumber(pack.price)}</Text>
          </View>
        ) : (
          <Text style={[styles.dockState, action === 'equipped' && { color: pack.accent }]}>
            {action === 'equipped' ? 'CONFIGURATION ACTIVE' : `${pack.items.length} OBJETS POSSÉDÉS`}
          </Text>
        )}
      </View>
      <Pressable
        accessibilityLabel={actionAccessibilityLabel(action, balance, pack.price, pack.name)}
        accessibilityRole="button"
        accessibilityState={{ busy: pending, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.packAction,
          { backgroundColor: pack.accent, borderColor: pack.accent },
          disabled && styles.packActionDisabled,
          pressed && !disabled && styles.packActionPressed,
        ]}
        testID="team-pack-primary-action"
      >
        {pending ? (
          <ActivityIndicator color="#0A0A0A" />
        ) : (
          <Text style={[styles.packActionText, disabled && styles.packActionTextDisabled]}>
            {actionLabel(action)}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function actionLabel(action: TeamPackPrimaryAction) {
  if (action === 'buy') return 'ACHETER LE PACK';
  if (action === 'equip') return 'ÉQUIPER LE PACK';
  if (action === 'equipped') return 'PACK ÉQUIPÉ';
  if (action === 'insufficient') return 'SOLDE INSUFFISANT';
  return 'INDISPONIBLE';
}

function actionAccessibilityLabel(action: TeamPackPrimaryAction, balance: number, price: number, packName: string) {
  if (action === 'buy') return `Acheter et équiper le ${packName} pour ${formatNumber(price)} Volts`;
  if (action === 'equip') return `Équiper le ${packName}`;
  if (action === 'equipped') return `Le ${packName} est équipé`;
  if (action === 'insufficient') return `Solde insuffisant. Il manque ${formatNumber(price - balance)} Volts`;
  return `Le ${packName} est indisponible`;
}

function slotLabel(slot: TeamPackItemDefinition['slot']) {
  if (slot === 'cadre_profil') return 'CADRE DE PROFIL';
  if (slot === 'titre_profil') return 'TITRE';
  if (slot === 'apparence_core') return 'OBJET DE VITRINE';
  if (slot === 'effet_faction') return 'EFFET';
  if (slot === 'carte_profil') return 'CARTE & BANNIÈRE';
  if (slot === 'vitrine_eclairage') return 'ÉCLAIRAGE';
  if (slot === 'vitrine_supports') return 'PRÉSENTOIRS';
  if (slot === 'vitrine_maillot') return 'MAILLOT';
  if (slot === 'vitrine_rang') return 'RANG';
  return 'MATÉRIAU';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.max(0, Math.round(value)));
}

function friendlyError(caught: unknown) {
  const message = caught instanceof Error ? caught.message : '';
  if (/solde insuffisant/i.test(message)) return 'Ton solde a changé. Recharge le pack avant de réessayer.';
  if (/network|fetch|hors connexion|offline/i.test(message)) return 'Connexion indisponible. Ta collection n’a pas été modifiée.';
  return message || 'Le pack équipe n’a pas pu être synchronisé.';
}

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050608' },
  scrollContent: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 144,
    gap: spacing.md,
  },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: '#0B0E12',
  },
  backGlyph: { color: colors.text, fontSize: 31, lineHeight: 31, marginTop: -3 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerEyebrow: { ...typography.eyebrow },
  headerTitle: { ...typography.sectionTitle, color: colors.text, marginTop: 1 },
  itemCount: { alignItems: 'center', minWidth: 54 },
  itemCountValue: { ...typography.metricSmall, color: colors.text },
  itemCountLabel: { ...typography.eyebrow, color: colors.textMuted, marginTop: -1 },
  hero: {
    minHeight: 292,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderRadius: radius.lg,
    backgroundColor: '#090B0E',
  },
  heroContent: { padding: spacing.md, paddingTop: 112 },
  heroTeam: { fontFamily: fonts.display, fontSize: 48, lineHeight: 45, letterSpacing: -1 },
  heroSubtitle: { ...typography.cardTitle, color: colors.text, letterSpacing: 1.2 },
  heroDescription: { ...typography.body, color: '#D0D4D8', marginTop: spacing.xs, maxWidth: 330 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  officialPill: {
    minHeight: 27,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#4C3225',
    backgroundColor: 'rgba(8,9,11,.78)',
  },
  officialDot: { width: 6, height: 6, borderRadius: 3 },
  officialText: { ...typography.label, color: colors.text },
  heroMetaText: { ...typography.eyebrow, color: colors.textSecondary },
  errorBanner: {
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: `${colors.danger}70`,
    borderRadius: radius.md,
    backgroundColor: '#160B0D',
  },
  errorTitle: { ...typography.eyebrow, color: colors.danger },
  errorText: { ...typography.body, color: colors.textSecondary },
  retry: { ...typography.action, marginTop: spacing.xs },
  collectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
  sectionEyebrow: { ...typography.eyebrow },
  sectionTitle: { ...typography.sectionTitle, color: colors.text, marginTop: 2 },
  inspectHint: { ...typography.caption, color: colors.textMuted, textAlign: 'right', maxWidth: 112 },
  loading: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    backgroundColor: '#090B0E',
  },
  loadingText: { ...typography.eyebrow, color: colors.textMuted },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  itemCard: {
    width: '48.5%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2B3036',
    borderRadius: radius.md,
    backgroundColor: '#0B0E12',
  },
  itemVisual: { height: 126, overflow: 'hidden', backgroundColor: '#080A0D' },
  itemImage: { width: '100%', height: '100%' },
  numberPill: {
    position: 'absolute',
    left: spacing.xs,
    top: spacing.xs,
    minWidth: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(3,4,5,.88)',
  },
  numberText: { fontFamily: fonts.bold, fontSize: 12 },
  ownedPill: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(3,4,5,.88)',
  },
  ownedText: { ...typography.eyebrow, fontSize: 9 },
  itemCopy: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  itemName: { ...typography.bodyStrong, color: colors.text },
  itemType: { ...typography.eyebrow, color: colors.textMuted, fontSize: 9, marginTop: 3 },
  licenseBlock: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#30251F',
    borderRadius: radius.md,
    backgroundColor: '#0B0B0C',
  },
  licenseTitle: { ...typography.eyebrow },
  licenseText: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 104,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#332017',
    backgroundColor: 'rgba(5,6,8,.97)',
  },
  dockCopy: { flex: 1, minWidth: 0 },
  dockEyebrow: { ...typography.eyebrow, color: colors.textMuted },
  dockPrice: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 3 },
  dockPriceText: { ...typography.metricSmall, color: colors.text },
  dockState: { ...typography.label, color: colors.textSecondary, marginTop: 4 },
  packAction: {
    minWidth: 184,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  packActionDisabled: { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong },
  packActionPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  packActionText: { ...typography.control, color: '#090A0B' },
  packActionTextDisabled: { color: colors.textDisabled },
  pressed: { opacity: 0.78 },
  sheetContent: { gap: spacing.md },
  sheetImageWrap: {
    height: 230,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: '#080A0C',
  },
  sheetImage: { width: '100%', height: '100%' },
  sheetMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sheetNumber: { ...typography.eyebrow },
  sheetSlot: { ...typography.eyebrow, color: colors.textMuted, textAlign: 'right' },
  sheetDescription: { ...typography.bodyComfort, color: colors.textSecondary },
  sheetStatus: {
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#30251F',
    borderRadius: radius.sm,
    backgroundColor: '#0B0B0C',
  },
  sheetStatusText: { ...typography.label, color: colors.text },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyEyebrow: { ...typography.eyebrow, color: colors.danger },
  emptyTitle: { ...typography.displayMedium, color: colors.text, textAlign: 'center' },
  emptyText: { ...typography.bodyComfort, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
});
