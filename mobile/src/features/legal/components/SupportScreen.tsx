import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { publicAppUrl, supportEmail, supportMailto } from '@/src/config/release';
import { colors, radius, spacing, typography } from '@/src/theme';

export default function SupportScreen() {
  const supportUrl = publicAppUrl('/support');

  async function contactSupport() {
    const url = supportMailto('Support Clutch');
    if (url) await Linking.openURL(url);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Revenir en arrière" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>← RETOUR</Text></Pressable>
        </View>
        <View style={styles.intro}><Text style={styles.eyebrow}>CLUTCH // SUPPORT</Text><Text style={styles.title}>ON GARDE LE MATCH OUVERT.</Text><Text style={styles.subtitle}>Compte, verdict, achat ou sécurité : décris le problème avec le plus de contexte possible, sans envoyer ton mot de passe.</Text></View>
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>CONTACT</Text>
          <Text style={styles.cardTitle}>{supportEmail ?? 'CONFIGURATION REQUISE'}</Text>
          <Text style={styles.cardCopy}>{supportEmail ? 'Ton application e-mail va s’ouvrir. Ajoute ton pseudo, l’appareil utilisé et l’heure du problème.' : 'L’adresse de support doit être renseignée dans EXPO_PUBLIC_SUPPORT_EMAIL avant la publication.'}</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: !supportEmail }} disabled={!supportEmail} onPress={() => void contactSupport()} style={({ pressed }) => [styles.action, !supportEmail && styles.disabled, pressed && styles.pressed]}><Text style={styles.actionText}>ÉCRIRE AU SUPPORT</Text></Pressable>
        </View>
        {supportUrl ? <Text selectable style={styles.web}>RESSOURCE WEB · {supportUrl}</Text> : null}
        <View style={styles.security}><Text style={styles.securityTitle}>URGENCE SÉCURITÉ</Text><Text style={styles.securityCopy}>Si tu penses que ton compte est compromis, change d’abord ton mot de passe puis déconnecte-toi. Ne communique jamais un code ou un jeton de connexion.</Text></View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: spacing.md, paddingBottom: 72, gap: 22 },
  header: { minHeight: 72, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#171D23' },
  back: { minHeight: 38, alignSelf: 'flex-start', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#28313A' }, backText: { ...typography.action, color: colors.text },
  intro: { gap: 8 }, eyebrow: { ...typography.eyebrow, color: colors.volt }, title: { ...typography.displayMedium, color: colors.text }, subtitle: { ...typography.body, color: colors.textMuted },
  card: { padding: 20, gap: 10, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#35401D' }, cardEyebrow: { ...typography.eyebrow, color: colors.volt }, cardTitle: { ...typography.cardTitle, color: colors.text }, cardCopy: { ...typography.body, color: colors.textMuted },
  action: { minHeight: 52, marginTop: 8, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.volt }, actionText: { ...typography.action, color: '#080A0C' },
  web: { ...typography.caption, color: colors.textSubtle },
  security: { padding: 17, borderRadius: radius.lg, backgroundColor: '#11161C', borderWidth: 1, borderColor: colors.border }, securityTitle: { ...typography.label, color: colors.text }, securityCopy: { ...typography.body, marginTop: 7, color: colors.textMuted },
  disabled: { opacity: 0.42 }, pressed: { opacity: 0.72 },
});
