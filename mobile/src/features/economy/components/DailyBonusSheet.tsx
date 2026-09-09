import { LinearGradient } from 'expo-linear-gradient';
import X from 'lucide-react-native/icons/x';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { formatNumber, t } from '@/src/lib/i18n';
import { fonts } from '@/src/theme';
import { DAILY_VOLT_BONUS } from '../dailyBonus';

export default function DailyBonusSheet({ visible, pending, error, onClaim, onClose }: {
  visible: boolean;
  pending: boolean;
  error: string | null;
  onClaim: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const sheetWidth = Math.min(width, 640);
  const amount = formatNumber(DAILY_VOLT_BONUS);
  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} accessible={false} onPress={onClose} />
      <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[styles.sheet, { width: sheetWidth, maxHeight: height - insets.top - 8 }]} testID="daily-volt-bonus">
        <View style={styles.handle} />
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) }}>
          <View style={[styles.art, { height: Math.min(sheetWidth * 0.62, height * 0.4) }]}>
            <Image source={require('../../../../assets/rewards/daily-volts-gold.png')} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} accessible={false} />
            <LinearGradient colors={['transparent', '#071118']} style={styles.fade} pointerEvents="none" />
          </View>
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>{t('economy.dailyBonus.sheetEyebrow')}</Text>
            <Text accessibilityRole="header" style={[styles.amount, { fontSize: sheetWidth > 480 ? 64 : 46 }]}>{t('economy.dailyBonus.amount', { amount })}</Text>
            <Text style={styles.title}>{t('economy.dailyBonus.waiting')}</Text>
            <Text style={styles.detail}>{t('economy.dailyBonus.tomorrow')}</Text>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={t('economy.dailyBonus.claim', { amount })} accessibilityState={{ disabled: pending, busy: pending }} disabled={pending} onPress={onClaim} style={({ pressed }) => [styles.claim, (pressed || pending) && styles.pressed]} testID="daily-bonus-claim">
              <LinearGradient colors={['#E5EB88', '#DCE675']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.claimFill}>
                {pending ? <ActivityIndicator color="#071118" /> : <><Text style={styles.claimText}>{t('economy.dailyBonus.claim', { amount })}</Text><CurrencyIcon kind="volts" color="#071118" size={18} /></>}
              </LinearGradient>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.later}><Text style={styles.laterText}>{t('economy.dailyBonus.later')}</Text></Pressable>
          </View>
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel={t('economy.dailyBonus.close')} onPress={onClose} style={styles.close}><X size={24} color="#8A97A3" /></Pressable>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,.65)' },
  sheet: { backgroundColor: '#071118', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: '#455763', overflow: 'hidden' },
  handle: { alignSelf: 'center', width: 58, height: 5, borderRadius: 3, marginTop: 12, backgroundColor: '#50606E' },
  art: { width: '100%', marginTop: 8 },
  fade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 50 },
  copy: { paddingHorizontal: 24, alignItems: 'center' },
  eyebrow: { fontFamily: fonts.medium, fontSize: 11, letterSpacing: 4, color: '#8995A2', textAlign: 'center', marginTop: 2 },
  amount: { fontFamily: fonts.bold, color: '#F4F1E9', textAlign: 'center', marginTop: 8, marginBottom: 16 },
  title: { fontFamily: fonts.medium, fontSize: 20, lineHeight: 27, color: '#F3F4F5', textAlign: 'center' },
  detail: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: '#8A97A3', textAlign: 'center', marginTop: 5 },
  error: { fontFamily: fonts.body, fontSize: 14, color: '#FF9C9C', textAlign: 'center', marginTop: 14 },
  claim: { width: '100%', marginTop: 32, borderRadius: 12, overflow: 'hidden' },
  claimFill: { minHeight: 60, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  claimText: { fontFamily: fonts.bold, fontSize: 18, color: '#071118', textAlign: 'center', flexShrink: 1 },
  pressed: { opacity: 0.72 },
  later: { padding: 16, marginTop: 6, minHeight: 48 },
  laterText: { fontFamily: fonts.medium, fontSize: 16, color: '#8A97A3' },
  close: { position: 'absolute', top: 22, right: 16, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
