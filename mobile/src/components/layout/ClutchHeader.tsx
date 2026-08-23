import { StyleSheet, Text, View } from 'react-native';

import { CurrencyIcon, type CurrencyKind } from '@/src/components/ui/CurrencyIcon';
import type { PlayerEconomy } from '@/src/features/economy/types';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts, typography } from '@/src/theme';

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
        <Balance kind="frags" label="FRAGS" value={displayedFrags} />
        <View style={styles.walletDivider} />
        <Balance kind="volts" label="VOLTS" value={displayedVolts} />
      </View>
    </View>
  );
}

function Balance({
  kind,
  label,
  value,
}: {
  kind: CurrencyKind;
  label: string;
  value: number | null;
}) {
  return (
    <View style={styles.balance}>
      <View style={[styles.balanceMark, kind === 'volts' ? styles.voltsMark : styles.fragsMark]}>
        <CurrencyIcon kind={kind} size={18} />
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
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fragsMark: { backgroundColor: '#090E12', borderWidth: 1, borderColor: '#35414B' },
  voltsMark: { backgroundColor: '#10160A', borderWidth: 1, borderColor: '#47551A' },
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
  walletDivider: {
    width: 1,
    height: 25,
    marginHorizontal: 6,
    backgroundColor: '#27313A',
  },
});
