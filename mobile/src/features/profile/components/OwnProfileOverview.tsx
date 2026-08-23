import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CosmeticAvatar } from '@/src/features/shop/components/CosmeticRenderer';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import { colors, fonts, typography } from '@/src/theme';

import type { ProfileData } from '../types';

type Props = {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  email?: string | null;
  loading: boolean;
  onOpenAccount: () => void;
  onOpenInventory: () => void;
  onOpenPreferences: () => void;
  onOpenShop: () => void;
  onSignOut: () => void;
  pseudo: string;
  signingOut: boolean;
  signOutError?: string | null;
};

export default function OwnProfileOverview({
  cosmetics,
  data,
  email,
  loading,
  onOpenAccount,
  onOpenInventory,
  onOpenPreferences,
  onOpenShop,
  onSignOut,
  pseudo,
  signingOut,
  signOutError,
}: Props) {
  const level = data?.level.level ?? 0;
  const xp = data?.level.xp ?? 0;
  const equippedCount = cosmetics
    ? [cosmetics.frame, cosmetics.title, cosmetics.core, cosmetics.factionEffect, cosmetics.profileCard].filter(Boolean).length
    : 0;
  const badgeCount = data?.badges.filter((badge) => badge.obtained).length ?? 0;
  const accent = cosmetics?.profileCard?.accent || colors.volt;
  const xpWidth = (String(Math.max(2, Math.round((data?.level.progress ?? 0) * 100))) + '%') as `${number}%`;

  return (
    <>
      <View style={[styles.accountCard, { borderColor: alpha(accent, '55') }]}>
        <LinearGradient
          colors={[alpha(accent, '0F'), '#0A1015', '#080D11']}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <CosmeticAvatar cosmetics={cosmetics} fallback={String(level || '—')} label={pseudo} size={68} />
        <View style={styles.accountIdentity}>
          <Text adjustsFontSizeToFit minimumFontScale={0.74} numberOfLines={1} style={styles.pseudo}>
            {loading ? 'Chargement' : pseudo}
          </Text>
          <Text numberOfLines={1} style={styles.maskedEmail}>{maskEmail(email)}</Text>
          <Text style={styles.level}>NIVEAU {loading ? '—' : level} · {loading ? '—' : formatNumber(xp)} XP</Text>
          <View style={styles.xpTrack}><View style={[styles.xpFill, { width: xpWidth }]} /></View>
        </View>
        <Pressable
          accessibilityLabel="Gérer mon compte"
          accessibilityRole="button"
          onPress={onOpenAccount}
          style={({ pressed }) => [styles.manageAccount, pressed && styles.pressed]}
        >
          <Text style={styles.manageAccountText}>GÉRER{`\n`}MON COMPTE</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PERSONNALISATION</Text>
        <View style={styles.shopCard}>
          <View style={styles.shopTop}>
            <View style={styles.shopMark}>
              <View style={styles.bagHandle} />
              <View style={styles.bagBody}><View style={styles.bagSpark} /></View>
            </View>
            <View style={styles.shopContent}>
              <Text style={styles.shopTitle}>BOUTIQUE</Text>
              <Text style={styles.shopDescription}>Cadres, reliques, bannières et badges</Text>
              <View style={styles.categoryRail}>
                <CategoryIcon kind="frame" label="Cadres" />
                <CategoryIcon kind="relic" label="Reliques" />
                <CategoryIcon kind="banner" label="Bannières" />
                <CategoryIcon kind="badge" label="Badges" />
              </View>
            </View>
            <Text style={styles.cardArrow}>›</Text>
          </View>
          <Pressable
            accessibilityLabel="Ouvrir la boutique"
            accessibilityRole="button"
            onPress={onOpenShop}
            style={({ pressed }) => [styles.shopAction, pressed && styles.pressed]}
          >
            <Text style={styles.shopActionText}>OUVRIR LA BOUTIQUE</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MON INVENTAIRE</Text>
        <Pressable
          accessibilityLabel="Gérer mon inventaire"
          accessibilityRole="button"
          onPress={onOpenInventory}
          style={({ pressed }) => [styles.inventoryCard, pressed && styles.pressed]}
        >
          <InventoryStat glyph="◇" label="ÉQUIPÉS" value={loading ? '—' : equippedCount} />
          <View style={styles.inventoryDivider} />
          <InventoryStat glyph="✦" label="BADGES" value={loading ? '—' : badgeCount} />
          <View style={styles.inventoryManage}><Text style={styles.inventoryManageText}>GÉRER</Text></View>
        </Pressable>
      </View>

      <View style={styles.settingsGroup}>
        <SettingsRow glyph="◉" label="PRÉFÉRENCES ET CONFIDENTIALITÉ" onPress={onOpenPreferences} />
        <View style={styles.settingsDivider} />
        <SettingsRow
          danger
          disabled={signingOut}
          glyph="↪"
          label={signingOut ? 'DÉCONNEXION…' : 'SE DÉCONNECTER'}
          onPress={onSignOut}
        />
      </View>
      {signOutError ? <Text style={styles.accountError}>{signOutError}</Text> : null}
    </>
  );
}

function CategoryIcon({ kind, label }: { kind: 'frame' | 'relic' | 'banner' | 'badge'; label: string }) {
  return (
    <View accessible accessibilityLabel={label} style={styles.categoryIcon}>
      {kind === 'frame' ? <View style={styles.frameGlyph}><View style={styles.frameGlyphInner} /></View> : null}
      {kind === 'relic' ? <Text style={styles.relicGlyph}>♙</Text> : null}
      {kind === 'banner' ? <View style={styles.bannerGlyph}><View style={styles.bannerNotch} /></View> : null}
      {kind === 'badge' ? <View style={styles.badgeGlyph}><View style={styles.badgeGlyphInner} /></View> : null}
    </View>
  );
}

function InventoryStat({ glyph, label, value }: { glyph: string; label: string; value: number | string }) {
  return (
    <View style={styles.inventoryStat}>
      <Text style={styles.inventoryGlyph}>{glyph}</Text>
      <Text style={styles.inventoryValue}>{value}</Text>
      <Text style={styles.inventoryLabel}>{label}</Text>
    </View>
  );
}

function SettingsRow({
  danger = false,
  disabled = false,
  glyph,
  label,
  onPress,
}: {
  danger?: boolean;
  disabled?: boolean;
  glyph: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <View style={[styles.settingsMark, danger && styles.settingsMarkDanger]}>
        <Text style={[styles.settingsGlyph, danger && styles.settingsGlyphDanger]}>{glyph}</Text>
      </View>
      <Text style={[styles.settingsLabel, danger && styles.settingsLabelDanger]}>{label}</Text>
      <Text style={[styles.settingsArrow, danger && styles.settingsLabelDanger]}>›</Text>
    </Pressable>
  );
}

function maskEmail(email?: string | null) {
  if (!email) return 'Compte Clutch';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(3, Math.min(6, local.length - visible.length)))}@${domain}`;
}

function alpha(color: string, opacity: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color + opacity : color;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

const styles = StyleSheet.create({
  accountCard: { position: 'relative', overflow: 'hidden', minHeight: 112, marginHorizontal: 16, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 22, backgroundColor: '#090E12', borderWidth: 1 },
  accountIdentity: { flex: 1, minWidth: 0 },
  pseudo: { color: colors.text, fontFamily: fonts.display, fontSize: 25, lineHeight: 27, letterSpacing: -.4 },
  maskedEmail: { ...typography.caption, marginTop: 2, color: colors.textMuted },
  level: { ...typography.label, marginTop: 8, color: colors.text, fontSize: 9, letterSpacing: .25 },
  xpTrack: { height: 6, marginTop: 6, overflow: 'hidden', borderRadius: 999, backgroundColor: '#263039' },
  xpFill: { height: '100%', borderRadius: 999, backgroundColor: colors.volt },
  manageAccount: { minHeight: 56, width: 82, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#0C110C', borderWidth: 1, borderColor: '#55651B' },
  manageAccountText: { ...typography.action, color: colors.volt, fontSize: 9, lineHeight: 12, letterSpacing: .15, textAlign: 'center' },
  section: { gap: 8 },
  sectionTitle: { marginHorizontal: 16, color: colors.text, fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, letterSpacing: .2 },
  shopCard: { marginHorizontal: 16, padding: 11, gap: 10, borderRadius: 20, backgroundColor: '#090E12', borderWidth: 1, borderColor: '#28323B' },
  shopTop: { minHeight: 90, flexDirection: 'row', alignItems: 'center', gap: 11 },
  shopMark: { position: 'relative', width: 80, height: 80, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#0E151B', borderWidth: 1, borderColor: '#303B45' },
  bagHandle: { position: 'absolute', top: 18, width: 23, height: 18, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderWidth: 2, borderBottomWidth: 0, borderColor: colors.volt },
  bagBody: { position: 'relative', width: 38, height: 37, marginTop: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.volt, transform: [{ perspective: 80 }, { rotateZ: '2deg' }] },
  bagSpark: { position: 'absolute', right: -4, top: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.volt, boxShadow: '0 0 10px rgba(232,255,61,.6)' },
  shopContent: { flex: 1, minWidth: 0 },
  shopTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 22, lineHeight: 24 },
  shopDescription: { ...typography.caption, marginTop: 2, color: colors.textMuted },
  categoryRail: { marginTop: 10, flexDirection: 'row', gap: 7 },
  categoryIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#0B1116', borderWidth: 1, borderColor: '#33404A' },
  frameGlyph: { width: 17, height: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 5, borderWidth: 1.4, borderColor: '#9AA7B2' },
  frameGlyphInner: { width: 9, height: 9, borderRadius: 3, borderWidth: 1, borderColor: '#596771' },
  relicGlyph: { color: '#AAB5BE', fontSize: 20, lineHeight: 22 },
  bannerGlyph: { position: 'relative', overflow: 'hidden', width: 13, height: 19, borderWidth: 1.3, borderColor: '#9AA7B2' },
  bannerNotch: { position: 'absolute', left: 3, bottom: -4, width: 7, height: 7, backgroundColor: '#0B1116', borderTopWidth: 1, borderLeftWidth: 1, borderColor: '#9AA7B2', transform: [{ rotateZ: '45deg' }] },
  badgeGlyph: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1.3, borderColor: '#9AA7B2', transform: [{ rotateZ: '45deg' }] },
  badgeGlyphInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6A7680' },
  cardArrow: { color: colors.textMuted, fontSize: 31, lineHeight: 34, fontWeight: '200' },
  shopAction: { minHeight: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.volt, boxShadow: '0 8px 22px rgba(232,255,61,.12)' },
  shopActionText: { ...typography.action, color: '#080A0C', letterSpacing: .55 },
  inventoryCard: { minHeight: 64, marginHorizontal: 16, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 17, backgroundColor: '#090E12', borderWidth: 1, borderColor: '#28323B' },
  inventoryStat: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  inventoryGlyph: { color: '#93A0AA', fontSize: 19, lineHeight: 21 },
  inventoryValue: { ...typography.bodyStrong, color: colors.volt },
  inventoryLabel: { ...typography.label, color: colors.textMuted, fontSize: 8, letterSpacing: .4 },
  inventoryDivider: { width: 1, height: 28, backgroundColor: '#2B343D' },
  inventoryManage: { minHeight: 31, marginLeft: 'auto', paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#101509', borderWidth: 1, borderColor: '#53631B' },
  inventoryManageText: { ...typography.action, color: colors.volt, fontSize: 9 },
  settingsGroup: { overflow: 'hidden', marginHorizontal: 16, borderRadius: 18, backgroundColor: '#090E12', borderWidth: 1, borderColor: '#28323B' },
  settingsRow: { minHeight: 56, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  settingsMark: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#10170D', borderWidth: 1, borderColor: '#3A461D' },
  settingsMarkDanger: { backgroundColor: '#171014', borderColor: '#43252F' },
  settingsGlyph: { color: colors.volt, fontSize: 16, lineHeight: 18, fontWeight: '900' },
  settingsGlyphDanger: { color: '#FF8B96' },
  settingsLabel: { ...typography.action, flex: 1, color: colors.textMuted, fontSize: 10, letterSpacing: .25 },
  settingsLabelDanger: { color: '#C57A83' },
  settingsArrow: { color: '#8D99A3', fontSize: 25, lineHeight: 27, fontWeight: '300' },
  settingsDivider: { height: 1, marginLeft: 58, backgroundColor: '#202931' },
  accountError: { ...typography.body, marginHorizontal: 16, marginTop: -13, color: '#FF9AA2' },
  disabled: { opacity: .48 },
  pressed: { opacity: .75, transform: [{ scale: .995 }] },
});
