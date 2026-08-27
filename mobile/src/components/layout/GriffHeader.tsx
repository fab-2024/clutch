import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { GriffLockup, GriffMark } from '@/src/components/brand/GriffLogo';
import { CurrencyIcon, type CurrencyKind } from '@/src/components/ui/CurrencyIcon';
import type { PlayerEconomy } from '@/src/features/economy/types';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts, typography } from '@/src/theme';

type Props = {
  compact?: boolean;
  economy?: Pick<PlayerEconomy, 'frags' | 'volts'>;
  variant?: 'default' | 'social';
};

export function GriffHeader({ compact = false, economy, variant = 'default' }: Props = {}) {
  const { frags, volts } = useEconomy();
  const displayedFrags = economy?.frags ?? frags;
  const displayedVolts = economy?.volts ?? volts;
  const social = variant === 'social';

  return (
    <View style={[styles.root, social && styles.rootSocial, social && compact && styles.rootSocialCompact]}>
      {social ? (
        <LinearGradient
          colors={['rgba(8,18,25,.92)', 'rgba(5,10,14,.72)', 'rgba(2,5,8,0)']}
          end={{ x: 1, y: 0.5 }}
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          style={styles.socialAtmosphere}
        />
      ) : null}

      {social ? (
        <View accessibilityLabel="GRIFF" accessibilityRole="image" style={[styles.socialBrand, compact && styles.socialBrandCompact]}>
          <LinearGradient
            colors={['#18191A', '#090B0D', '#030405']}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={[styles.socialMark, compact && styles.socialMarkCompact]}
          >
            <GriffMark size={compact ? 32 : 35} style={[styles.socialMarkImage, compact && styles.socialMarkImageCompact]} />
          </LinearGradient>
          <Text style={[styles.socialWord, compact && styles.socialWordCompact]}>GRIFF</Text>
          <View style={[styles.socialDot, compact && styles.socialDotCompact]} />
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
        style={[styles.wallet, social && styles.walletSocial, social && compact && styles.walletSocialCompact]}
      >
        {social ? (
          <LinearGradient
            colors={['rgba(42,46,49,.88)', 'rgba(10,13,16,.98)', 'rgba(2,4,6,.99)']}
            end={{ x: 0.72, y: 1 }}
            pointerEvents="none"
            start={{ x: 0.2, y: 0 }}
            style={styles.walletSurface}
          />
        ) : null}
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
  rootSocial: {
    minHeight: 96,
    paddingHorizontal: 18,
    paddingVertical: 18,
    overflow: 'hidden',
  },
  rootSocialCompact: {
    minHeight: 80,
    paddingTop: 10,
    paddingRight: 70,
    paddingBottom: 10,
    paddingLeft: 14,
  },
  socialAtmosphere: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.82,
  },
  brandRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialBrand: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  socialBrandCompact: { gap: 8 },
  socialMark: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.25,
    borderColor: 'rgba(201,125,79,.82)',
    boxShadow: '0 0 18px rgba(190,101,55,.22), inset 0 1px 0 rgba(255,211,171,.18)',
  },
  socialMarkCompact: { width: 42, height: 42, borderRadius: 13 },
  socialMarkImage: {
    width: 35,
    height: 35,
    tintColor: '#C98154',
  },
  socialMarkImageCompact: { width: 32, height: 32 },
  socialWord: {
    color: '#F8F7F4',
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 22,
    letterSpacing: 3.2,
    textShadowColor: 'rgba(255,255,255,.16)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  socialWordCompact: { fontSize: 17, lineHeight: 20, letterSpacing: 2.8 },
  socialDot: {
    width: 6,
    height: 6,
    marginLeft: -7,
    marginTop: 15,
    borderRadius: 3,
    backgroundColor: colors.volt,
    boxShadow: '0 0 9px rgba(232,255,61,.72)',
  },
  socialDotCompact: { marginLeft: -6, marginTop: 13 },
  wallet: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  walletSocial: {
    width: 209,
    minHeight: 56,
    paddingHorizontal: 5,
    gap: 0,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#070A0D',
    borderWidth: 1.25,
    borderColor: 'rgba(181,109,69,.72)',
    boxShadow: '0 5px 20px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,217,183,.12)',
  },
  walletSocialCompact: { width: 170, minHeight: 52, borderRadius: 19 },
  walletSurface: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  walletDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(111,116,120,.36)',
    boxShadow: '1px 0 0 rgba(0,0,0,.5)',
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
    color: '#858A93',
    fontFamily: fonts.bold,
    fontSize: 8,
    lineHeight: 9,
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
