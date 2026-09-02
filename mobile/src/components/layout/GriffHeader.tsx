import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GriffLockup } from '@/src/components/brand/GriffLogo';
import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import { CurrencyIcon, type CurrencyKind } from '@/src/components/ui/CurrencyIcon';
import type { PlayerEconomy } from '@/src/features/economy/types';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts, typography } from '@/src/theme';

type Props = {
  accessory?: ReactNode;
  compact?: boolean;
  economy?: Pick<PlayerEconomy, 'frags' | 'volts'>;
  leading?: ReactNode;
  variant?: 'default' | 'wallet';
};

export function GriffHeader({ accessory, compact = false, economy, leading, variant = 'default' }: Props = {}) {
  const { isCompactWidth, isShortLandscape } = useResponsiveLayout();
  const { frags, volts } = useEconomy();
  const displayedFrags = economy?.frags ?? frags;
  const displayedVolts = economy?.volts ?? volts;
  const walletPresentation = variant === 'wallet';
  const narrowWallet = walletPresentation && isCompactWidth;
  const compactPresentation = compact || isShortLandscape;
  const compactWallet = compactPresentation || narrowWallet;
  const hasWalletAccessory = walletPresentation && accessory != null;
  const narrowWalletAccessory = hasWalletAccessory && narrowWallet;
  const leadingWidth = walletPresentation
    ? narrowWalletAccessory ? 88 : narrowWallet ? 104 : compactPresentation ? 108 : 118
    : 96;
  const economySummary = (
    <View
      accessible
      accessibilityLabel={`${formatBalance(displayedFrags)} Frags, ${formatBalance(displayedVolts)} Volts`}
      accessibilityRole="summary"
      style={[
        styles.economy,
        walletPresentation && styles.economyWallet,
        walletPresentation && compactWallet && styles.economyWalletCompact,
        narrowWallet && styles.economyWalletNarrow,
        narrowWalletAccessory && styles.economyWalletAccessoryNarrow,
      ]}
      testID="griff-header-economy"
    >
      <Balance compact={walletPresentation} kind="frags" label="FRAGS" value={displayedFrags} />
      {walletPresentation ? <View style={styles.economyDivider} /> : null}
      <Balance compact={walletPresentation} kind="volts" label="VOLTS" value={displayedVolts} />
    </View>
  );

  return (
    <View style={[
      styles.root,
      walletPresentation && styles.rootWallet,
      walletPresentation && compact && styles.rootWalletCompact,
      walletPresentation && isShortLandscape && styles.rootWalletLandscape,
      walletPresentation && compact && isShortLandscape && styles.rootWalletCompactLandscape,
      narrowWallet && styles.rootWalletNarrow,
      hasWalletAccessory && styles.rootWalletAccessory,
      narrowWalletAccessory && styles.rootWalletAccessoryNarrow,
      hasWalletAccessory && compact && styles.rootWalletCompactAccessory,
      narrowWalletAccessory && compact && styles.rootWalletCompactAccessoryNarrow,
    ]} testID={`griff-header-${variant}`}>
      {leading ? (
        <View style={[styles.leading, { width: leadingWidth }]} testID="griff-header-leading">{leading}</View>
      ) : walletPresentation ? (
        <GriffLockup width={leadingWidth} />
      ) : (
        <View style={styles.brandRow}>
          <GriffLockup width={96} />
        </View>
      )}

      {hasWalletAccessory ? (
        <View style={[styles.walletActions, narrowWalletAccessory && styles.walletActionsNarrow]}>
          {economySummary}
          {accessory}
        </View>
      ) : economySummary}
    </View>
  );
}

function Balance({
  compact,
  kind,
  label,
  value,
}: {
  compact: boolean;
  kind: CurrencyKind;
  label: string;
  value: number | null;
}) {
  return (
    <View style={[
      styles.balance,
      kind === 'volts' ? styles.voltsBalance : styles.fragsBalance,
      compact && styles.balanceCompact,
    ]}>
      <View style={[
        styles.balanceMark,
        kind === 'volts' ? styles.voltsMark : styles.fragsMark,
        compact && styles.balanceMarkCompact,
      ]}>
        <CurrencyIcon kind={kind} size={compact ? 25 : 24} />
      </View>
      <View style={styles.balanceCopy}>
        <Text style={[styles.balanceLabel, compact && styles.balanceLabelCompact]}>{label}</Text>
        <Text numberOfLines={1} style={[styles.balanceValue, compact && styles.balanceValueCompact]}>{formatBalance(value)}</Text>
      </View>
    </View>
  );
}

function formatBalance(value: number | null) {
  return value == null ? '—' : value.toLocaleString('fr-FR');
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    maxWidth: 430,
    minHeight: 70,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rootWallet: {
    minHeight: 84,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  rootWalletCompact: {
    minHeight: 72,
    paddingTop: 8,
    paddingRight: 70,
    paddingBottom: 8,
    paddingLeft: 14,
  },
  rootWalletLandscape: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rootWalletCompactLandscape: {
    paddingRight: 70,
  },
  rootWalletNarrow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  rootWalletAccessory: {
    paddingHorizontal: 14,
    gap: 8,
  },
  rootWalletAccessoryNarrow: {
    paddingHorizontal: 8,
    gap: 6,
  },
  rootWalletCompactAccessory: {
    paddingRight: 14,
  },
  rootWalletCompactAccessoryNarrow: {
    paddingRight: 8,
  },
  brandRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leading: {
    minWidth: 0,
    flexShrink: 0,
  },
  economy: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  economyWallet: {
    width: 209,
    minHeight: 52,
    paddingHorizontal: 5,
    gap: 0,
    borderRadius: 18,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  economyWalletCompact: { width: 170, minHeight: 50, borderRadius: 17 },
  economyWalletNarrow: { flexShrink: 0 },
  economyWalletAccessoryNarrow: { width: 162 },
  walletActions: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletActionsNarrow: { gap: 4 },
  economyDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderStrong,
  },
  balance: {
    minWidth: 76,
    minHeight: 48,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  fragsBalance: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
  voltsBalance: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
  balanceCompact: {
    minWidth: 0,
    minHeight: 51,
    flex: 1,
    paddingHorizontal: 6,
    gap: 5,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  balanceMark: {
    width: 30,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fragsMark: { backgroundColor: colors.surfaceLow },
  voltsMark: { backgroundColor: colors.surfaceLow },
  balanceMarkCompact: {
    width: 28,
    height: 36,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  balanceCopy: { minWidth: 0 },
  balanceLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  balanceLabelCompact: {
    ...typography.metadata,
    color: colors.textSecondary,
    fontFamily: fonts.bold,
    letterSpacing: 0.8,
  },
  balanceValue: {
    ...typography.bodyStrong,
    maxWidth: 52,
    marginTop: 1,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  balanceValueCompact: {
    maxWidth: 58,
    marginTop: 2,
    color: '#F7F7F5',
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 19,
    letterSpacing: 0.2,
  },
});
