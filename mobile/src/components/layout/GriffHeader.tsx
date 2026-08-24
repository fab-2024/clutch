import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { GriffLockup, GriffMark } from '@/src/components/brand/GriffLogo';
import { CurrencyIcon, type CurrencyKind } from '@/src/components/ui/CurrencyIcon';
import type { PlayerEconomy } from '@/src/features/economy/types';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts, typography } from '@/src/theme';

type Props = {
  economy?: Pick<PlayerEconomy, 'frags' | 'volts'>;
  variant?: 'default' | 'social';
};

export function GriffHeader({ economy, variant = 'default' }: Props = {}) {
  const { frags, volts } = useEconomy();
  const displayedFrags = economy?.frags ?? frags;
  const displayedVolts = economy?.volts ?? volts;
  const social = variant === 'social';

  return (
    <View style={[styles.root, social && styles.rootSocial]}>
      {social ? (
        <View accessibilityLabel="GRIFF" accessibilityRole="image" style={styles.socialBrand}>
          <LinearGradient
            colors={['#F2B07D', '#9A4D2C', '#4C241D']}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.socialMark}
          >
            <GriffMark size={30} style={styles.socialMarkImage} />
          </LinearGradient>
          <Text style={styles.socialWord}>GRIFF</Text>
          <View style={styles.socialDot} />
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
        style={[styles.wallet, social && styles.walletSocial]}
      >
        <Balance compact={social} kind="frags" label="FRAGS" value={displayedFrags} />
        {social ? <View style={styles.walletDivider} /> : null}
        <Balance compact={social} kind="volts" label="VOLTS" value={displayedVolts} />
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
        <CurrencyIcon kind={kind} size={compact ? 17 : 24} />
      </View>
      <View style={styles.balanceCopy}>
        <Text style={styles.balanceLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.balanceValue}>{formatBalance(value)}</Text>
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
  rootSocial: { minHeight: 50, paddingHorizontal: 18, paddingVertical: 3 },
  brandRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialBrand: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  socialMark: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,193,145,.52)',
    boxShadow: '0 0 16px rgba(173,77,39,.2)',
  },
  socialMarkImage: { width: 24, height: 24, tintColor: '#090A0B' },
  socialWord: {
    color: '#F5F3EE',
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 19,
    letterSpacing: 2.8,
  },
  socialDot: {
    width: 5,
    height: 5,
    marginLeft: -3,
    marginTop: 10,
    borderRadius: 3,
    backgroundColor: colors.volt,
    boxShadow: '0 0 7px rgba(232,255,61,.65)',
  },
  wallet: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  walletSocial: {
    minHeight: 36,
    paddingHorizontal: 3,
    gap: 0,
    overflow: 'hidden',
    borderRadius: 15,
    backgroundColor: 'rgba(7,11,15,.94)',
    borderWidth: 1,
    borderColor: '#26313B',
    boxShadow: '0 0 14px rgba(27,77,98,.08)',
  },
  walletDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#222B33',
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
    minWidth: 67,
    minHeight: 32,
    paddingHorizontal: 5,
    gap: 4,
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
    width: 22,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  balanceCopy: { minWidth: 0 },
  balanceLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  balanceValue: {
    ...typography.bodyStrong,
    maxWidth: 52,
    marginTop: 1,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
