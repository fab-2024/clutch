import { StyleSheet, Text, View } from 'react-native';

import { GriffLockup, GriffMark } from '@/src/components/brand/GriffLogo';
import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import { CurrencyIcon, type CurrencyKind } from '@/src/components/ui/CurrencyIcon';
import type { PlayerEconomy } from '@/src/features/economy/types';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts, typography } from '@/src/theme';

type Props = {
  compact?: boolean;
  economy?: Pick<PlayerEconomy, 'frags' | 'volts'>;
  variant?: 'default' | 'wallet';
};

export function GriffHeader({ compact = false, economy, variant = 'default' }: Props = {}) {
  const { isCompactWidth, isShortLandscape } = useResponsiveLayout();
  const { frags, volts } = useEconomy();
  const displayedFrags = economy?.frags ?? frags;
  const displayedVolts = economy?.volts ?? volts;
  const walletPresentation = variant === 'wallet';
  const narrowWallet = walletPresentation && isCompactWidth;
  const compactPresentation = compact || isShortLandscape;

  return (
    <View style={[
      styles.root,
      walletPresentation && styles.rootWallet,
      walletPresentation && compact && styles.rootWalletCompact,
      walletPresentation && isShortLandscape && styles.rootWalletLandscape,
      walletPresentation && compact && isShortLandscape && styles.rootWalletCompactLandscape,
      narrowWallet && styles.rootWalletNarrow,
    ]} testID={`griff-header-${variant}`}>
      {walletPresentation ? (
        <View accessibilityLabel="GRIFF" accessibilityRole="image" style={[styles.walletBrand, compactPresentation && styles.walletBrandCompact]}>
          <GriffMark
            size={compactPresentation ? 36 : 40}
            style={[styles.walletMark, compactPresentation && styles.walletMarkCompact]}
          />
          {narrowWallet ? null : <Text style={[styles.walletWord, compactPresentation && styles.walletWordCompact]}>GRIFF</Text>}
          {narrowWallet ? null : <View style={[styles.walletDot, compactPresentation && styles.walletDotCompact]} />}
        </View>
      ) : (
        <View style={styles.brandRow}>
          <GriffLockup width={96} />
        </View>
      )}

      <View
        accessible
        accessibilityLabel={`${formatBalance(displayedFrags)} Frags, ${formatBalance(displayedVolts)} Volts`}
        accessibilityRole="summary"
        style={[
          styles.economy,
          walletPresentation && styles.economyWallet,
          walletPresentation && compactPresentation && styles.economyWalletCompact,
          narrowWallet && styles.economyWalletNarrow,
        ]}
        testID="griff-header-economy"
      >
        <Balance compact={walletPresentation} kind="frags" label="FRAGS" value={displayedFrags} />
        {walletPresentation ? <View style={styles.economyDivider} /> : null}
        <Balance compact={walletPresentation} kind="volts" label="VOLTS" value={displayedVolts} />
      </View>
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
  brandRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletBrand: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletBrandCompact: { gap: 8 },
  walletMark: {
    width: 40,
    height: 40,
    tintColor: colors.volt,
  },
  walletMarkCompact: { width: 36, height: 36 },
  walletWord: {
    color: '#F8F7F4',
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 22,
    letterSpacing: 3.2,
  },
  walletWordCompact: { fontSize: 17, lineHeight: 20, letterSpacing: 2.8 },
  walletDot: {
    width: 6,
    height: 6,
    marginLeft: -7,
    marginTop: 15,
    borderRadius: 3,
    backgroundColor: colors.volt,
  },
  walletDotCompact: { marginLeft: -6, marginTop: 13 },
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
  fragsBalance: { backgroundColor: '#0C0B13', borderColor: '#353047' },
  voltsBalance: { backgroundColor: '#0D120B', borderColor: '#343D1C' },
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
  fragsMark: { backgroundColor: '#09080F' },
  voltsMark: { backgroundColor: '#090D08' },
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
