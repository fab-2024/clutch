import type { RefObject } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { BaseSheet } from '@/src/components/overlays/BaseSheet';
import { Button } from '@/src/components/ui/Button';
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { Surface } from '@/src/components/ui/Surface';
import { colors, radius, spacing, typography } from '@/src/theme';

import type { AtelierProduct } from '../atelierCatalog';

type AtelierPurchaseSheetProps = {
  balance: number;
  error?: string | null;
  onClose: () => void;
  onClosed?: () => void;
  onConfirm: () => void;
  pending: boolean;
  price: number;
  product: AtelierProduct | null;
  returnFocusRef?: RefObject<View | null>;
  visible: boolean;
};

export function AtelierPurchaseSheet({
  balance,
  error,
  onClose,
  onClosed,
  onConfirm,
  pending,
  price,
  product,
  returnFocusRef,
  visible,
}: AtelierPurchaseSheetProps) {
  const { height } = useWindowDimensions();
  const nextBalance = Math.max(0, balance - price);
  const compactHeight = height < 720;

  return (
    <BaseSheet
      dismissible={!pending}
      eyebrow="ATELIER // ACQUISITION"
      footer={product ? (
        <View style={styles.actions}>
          <Button
            accessibilityHint={`Débite ${formatNumber(price)} Volts et équipe ${product.name} dans ta Vitrine`}
            fullWidth
            label={`CONFIRMER · ${formatNumber(price)} VOLTS`}
            loading={pending}
            onPress={onConfirm}
            testID="atelier-purchase-confirm"
          />
          <Button
            disabled={pending}
            fullWidth
            label="CONTINUER À COMPOSER"
            onPress={onClose}
            size="compact"
            testID="atelier-purchase-cancel"
            variant="ghost"
          />
        </View>
      ) : null}
      onClose={onClose}
      onClosed={onClosed}
      returnFocusRef={returnFocusRef}
      size={compactHeight ? 'large' : 'medium'}
      testID="atelier-purchase-sheet"
      title={product ? `Débloquer ${product.name} ?` : 'Confirmer l’acquisition'}
      visible={visible}
    >
      {product ? (
        <View style={[styles.content, compactHeight && styles.contentCompact]}>
          <View style={[styles.productRow, compactHeight && styles.productRowCompact]}>
            <View style={[styles.visual, compactHeight && styles.visualCompact, { borderColor: `${product.accent}66` }]}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: `${product.accent}12` }]} />
              <Image resizeMode="contain" source={product.image} style={styles.image} />
            </View>
            <View style={styles.productCopy}>
              <Text style={[styles.rarity, { color: product.accent }]}>{rarityLabel(product.rarity)}</Text>
              <Text numberOfLines={2} style={styles.productName}>{product.name}</Text>
              <Text numberOfLines={compactHeight ? 2 : 3} style={styles.description}>{product.description}</Text>
            </View>
          </View>

          <Surface
            accessibilityLabel={`Achat de ${product.name} pour ${formatNumber(price)} Volts. Ton solde passera de ${formatNumber(balance)} à ${formatNumber(nextBalance)} Volts.`}
            accessible
            border="strong"
            padding={compactHeight ? 'sm' : 'md'}
            radius="md"
            tone="low"
          >
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.ledger, compactHeight && styles.ledgerCompact]}>
              <LedgerRow label="SOLDE ACTUEL" value={formatNumber(balance)} />
              <LedgerRow label={product.name.toUpperCase()} negative value={`−${formatNumber(price)}`} />
              <View style={styles.divider} />
              <LedgerRow accent label="SOLDE APRÈS" value={formatNumber(nextBalance)} />
            </View>
          </Surface>

          <View accessibilityRole="summary" style={styles.promise}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.promiseIcon}>
              <CurrencyIcon kind="volts" size={18} />
            </View>
            <Text style={styles.promiseText}>
              {compactHeight
                ? 'Permanent, cosmétique uniquement, équipé dès confirmation.'
                : 'Cet objet est permanent, cosmétique uniquement et sera équipé dès la confirmation.'}
            </Text>
          </View>

          {error ? (
            <View accessible accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
              <Text style={styles.errorTitle}>ACQUISITION NON FINALISÉE</Text>
              <Text style={styles.errorCopy}>{error}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </BaseSheet>
  );
}

function LedgerRow({
  accent = false,
  label,
  negative = false,
  value,
}: {
  accent?: boolean;
  label: string;
  negative?: boolean;
  value: string;
}) {
  return (
    <View style={styles.ledgerRow}>
      <Text numberOfLines={1} style={styles.ledgerLabel}>{label}</Text>
      <View style={styles.ledgerValueRow}>
        <CurrencyIcon kind="volts" size={15} />
        <Text style={[styles.ledgerValue, accent && styles.ledgerValueAccent, negative && styles.ledgerValueNegative]}>{value}</Text>
      </View>
    </View>
  );
}

function rarityLabel(rarity: AtelierProduct['rarity']) {
  if (rarity === 'legendaire') return 'LÉGENDAIRE';
  if (rarity === 'epique') return 'ÉPIQUE';
  if (rarity === 'rare') return 'RARE';
  return 'COMMUN';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.max(0, Math.round(value)));
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  contentCompact: {
    gap: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  productRowCompact: {
    gap: spacing.sm,
  },
  visual: {
    position: 'relative',
    overflow: 'hidden',
    width: 88,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.background,
  },
  visualCompact: {
    width: 72,
    height: 80,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  productCopy: {
    flex: 1,
    minWidth: 0,
  },
  rarity: {
    ...typography.metadata,
    fontFamily: typography.control.fontFamily,
  },
  productName: {
    ...typography.sectionTitle,
    marginTop: spacing.xs,
    color: colors.text,
  },
  description: {
    ...typography.body,
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  ledger: {
    gap: spacing.sm,
  },
  ledgerCompact: {
    gap: spacing.xs,
  },
  ledgerRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  ledgerLabel: {
    ...typography.metadata,
    flex: 1,
    color: colors.textSecondary,
  },
  ledgerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ledgerValue: {
    ...typography.metricSmall,
    color: colors.text,
  },
  ledgerValueAccent: {
    color: colors.volt,
  },
  ledgerValueNegative: {
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  promise: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  promiseIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceInteractive,
  },
  promiseText: {
    ...typography.bodyComfortStrong,
    flex: 1,
    color: colors.text,
  },
  error: {
    gap: 4,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: `${colors.danger}14`,
    borderWidth: 1,
    borderColor: `${colors.danger}66`,
  },
  errorTitle: {
    ...typography.control,
    color: colors.danger,
  },
  errorCopy: {
    ...typography.body,
    color: colors.text,
  },
  actions: {
    gap: spacing.xs,
  },
});
