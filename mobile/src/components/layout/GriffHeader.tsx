import { StyleSheet, Text, View } from 'react-native';

import { GriffLockup } from '@/src/components/brand/GriffLogo';
import { CurrencyIcon, type CurrencyKind } from '@/src/components/ui/CurrencyIcon';
import type { PlayerEconomy } from '@/src/features/economy/types';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, typography } from '@/src/theme';

type Props = {
  economy?: Pick<PlayerEconomy, 'frags' | 'volts'>;
};

export function GriffHeader({ economy }: Props = {}) {
  const { frags, volts } = useEconomy();
  const displayedFrags = economy?.frags ?? frags;
  const displayedVolts = economy?.volts ?? volts;

  return (
    <View style={styles.root}>
      <View style={styles.brandRow}>
        <GriffLockup width={96} />
      </View>

      <View
        accessible
        accessibilityLabel={`${formatBalance(displayedFrags)} Frags, ${formatBalance(displayedVolts)} Volts`}
        style={styles.wallet}
      >
        <Balance kind="frags" label="FRAGS" value={displayedFrags} />
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
    <View style={[styles.balance, kind === 'volts' ? styles.voltsBalance : styles.fragsBalance]}>
      <View style={[styles.balanceMark, kind === 'volts' ? styles.voltsMark : styles.fragsMark]}>
        <CurrencyIcon kind={kind} size={24} />
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
  brandRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wallet: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
  balanceMark: {
    width: 30,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fragsMark: { backgroundColor: '#09080F' },
  voltsMark: { backgroundColor: '#090D08' },
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
