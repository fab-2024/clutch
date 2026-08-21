import { StyleSheet, Text, View } from 'react-native';

import type { PlayerEconomy } from '@/src/features/economy/types';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts } from '@/src/theme';

type Props = {
  economy?: Pick<PlayerEconomy, 'frags' | 'volts'>;
};

export function ClutchHeader({ economy }: Props = {}) {
  const { frags, volts } = useEconomy();
  const displayedFrags = economy?.frags ?? frags;
  const displayedVolts = economy?.volts ?? volts;

  return (
    <View style={styles.root}>
      <View style={styles.brandRow}>
        <View style={styles.logoBox}>
          <Text style={styles.logoGlyph}>C</Text>
        </View>
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>CLUTCH</Text>
          <View style={styles.dot} />
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={`${formatBalance(displayedFrags)} Frags, ${formatBalance(displayedVolts)} Volts`}
        style={styles.wallet}
      >
        <Balance label="FRAGS" mark="F" tone="frags" value={displayedFrags} />
        <View style={styles.walletDivider} />
        <Balance label="VOLTS" mark="V" tone="volts" value={displayedVolts} />
      </View>
    </View>
  );
}

function Balance({
  label,
  mark,
  tone,
  value,
}: {
  label: string;
  mark: string;
  tone: 'frags' | 'volts';
  value: number | null;
}) {
  return (
    <View style={styles.balance}>
      <View style={[styles.balanceMark, tone === 'volts' ? styles.voltsMark : styles.fragsMark]}>
        <Text style={[styles.balanceMarkText, tone === 'volts' && styles.voltsMarkText]}>{mark}</Text>
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
    minHeight: 66,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  brandRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.volt,
  },
  logoGlyph: {
    color: '#06090C',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -2,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  wordmark: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 3.1,
  },
  dot: {
    width: 5,
    height: 5,
    marginBottom: 3,
    borderRadius: 3,
    backgroundColor: colors.volt,
  },
  wallet: {
    minHeight: 44,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    borderRadius: 16,
    backgroundColor: '#0C1116',
    borderWidth: 1,
    borderColor: '#26313B',
  },
  balance: {
    minWidth: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceMark: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fragsMark: { backgroundColor: '#13243A', borderWidth: 1, borderColor: '#315A86' },
  voltsMark: { backgroundColor: colors.volt },
  balanceMarkText: {
    color: '#87C4FF',
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  voltsMarkText: { color: '#080A0C' },
  balanceCopy: { minWidth: 0 },
  balanceLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 8,
    lineHeight: 9,
    letterSpacing: 0.6,
  },
  balanceValue: {
    maxWidth: 52,
    marginTop: 2,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 13,
    fontVariant: ['tabular-nums'],
  },
  walletDivider: {
    width: 1,
    height: 25,
    marginHorizontal: 6,
    backgroundColor: '#27313A',
  },
});
