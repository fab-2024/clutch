import { LinearGradient } from 'expo-linear-gradient';
import type { ImageSourcePropType } from 'react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { CosmeticAvatar } from '@/src/features/shop/components/CosmeticRenderer';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import { colors, fonts, radius, typography } from '@/src/theme';

const RELIC_ASSETS: ImageSourcePropType[] = [
  require('../../../../assets/social/relic-evolution/ampoule.png'),
  require('../../../../assets/social/relic-evolution/fiole.png'),
  require('../../../../assets/social/relic-evolution/flacon.png'),
  require('../../../../assets/social/relic-evolution/reacteur.png'),
  require('../../../../assets/social/relic-evolution/reliquaire.png'),
];

type ProfileShowcaseCardProps = {
  cosmetics?: EquippedCosmetics | null;
  level: number;
  loading: boolean;
  onOpenLoadout?: () => void;
  onOpenShowcase?: () => void;
  profileTitle: string;
  pseudo: string;
  rankAccent: string;
  rankLabel: string;
  relicLevel: number;
  teamTag: string;
  volts?: number | null;
};

export default function ProfileShowcaseCard({
  cosmetics,
  level,
  loading,
  onOpenLoadout,
  onOpenShowcase,
  profileTitle,
  pseudo,
  rankAccent,
  rankLabel,
  relicLevel,
  teamTag,
  volts,
}: ProfileShowcaseCardProps) {
  const bannerAccent = cosmetics?.profileCard?.accent ?? rankAccent;
  const frameAccent = cosmetics?.frame?.accent ?? bannerAccent;
  const relicAccent = cosmetics?.factionEffect?.accent ?? rankAccent;

  return (
    <View style={[styles.card, { borderColor: alpha(bannerAccent, '72') }]}>
      <LinearGradient
        colors={[alpha(bannerAccent, '32'), '#10151B', '#070A0E']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.bannerGlow, { backgroundColor: bannerAccent }]} />
      <View style={[styles.relicGlow, { backgroundColor: relicAccent }]} />
      <Text style={[styles.watermark, { color: bannerAccent }]}>{teamTag}</Text>

      <View style={styles.topline}>
        <View style={styles.bannerMeta}>
          <View style={[styles.bannerDot, { backgroundColor: bannerAccent }]} />
          <Text numberOfLines={1} style={styles.bannerName}>
            {cosmetics?.profileCard?.name?.toUpperCase() ?? 'BANNIÈRE ORIGINE'}
          </Text>
        </View>
        <View style={[styles.rankPill, { borderColor: alpha(rankAccent, '70') }]}>
          <Text style={[styles.rankPillText, { color: rankAccent }]}>{rankLabel}</Text>
        </View>
      </View>

      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.identityLine}>
        {loading ? 'CHARGEMENT' : pseudo.toUpperCase()} <Text style={[styles.identityRank, { color: rankAccent }]}>— {rankLabel}</Text>
      </Text>

      <View style={styles.stage}>
        <View style={styles.supporterBlock}>
          <CosmeticAvatar cosmetics={cosmetics} fallback={`${level}`} label={pseudo} size={92} />
          <Text numberOfLines={1} style={styles.frameName}>{cosmetics?.frame?.name?.toUpperCase() ?? 'CADRE ORIGINE'}</Text>
          <Text numberOfLines={1} style={[styles.title, { color: cosmetics?.title?.accent ?? frameAccent }]}>{profileTitle.toUpperCase()}</Text>
        </View>

        <ProfileRelicThumbnail
          accent={relicAccent}
          level={relicLevel}
          name={cosmetics?.factionEffect?.name ?? 'Forme Origine'}
        />
      </View>

      <Text style={styles.visibilityPromise}>VISIBLE SUR RANK, SOCIAL ET TES CALLS</Text>

      {onOpenShowcase || onOpenLoadout ? <View style={styles.actions}>
        {onOpenShowcase ? <Pressable
          accessibilityLabel="Voir ma Vitrine"
          accessibilityRole="button"
          onPress={onOpenShowcase}
          style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
        >
          <Text style={styles.primaryActionText}>VOIR MA VITRINE</Text>
        </Pressable> : null}
        {onOpenLoadout ? (
          <Pressable
            accessibilityLabel="Modifier mon Loadout"
            accessibilityRole="button"
            onPress={onOpenLoadout}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryActionText}>MODIFIER MON LOADOUT</Text>
            {volts != null ? <Text style={styles.balance}>{formatNumber(volts)} V</Text> : null}
          </Pressable>
        ) : null}
      </View> : null}
    </View>
  );
}

export function ProfileRelicThumbnail({ accent, level, name }: { accent: string; level: number; name: string }) {
  const relicAsset = RELIC_ASSETS[Math.max(0, Math.min(RELIC_ASSETS.length - 1, level - 1))];
  return (
    <View accessible accessibilityLabel={`Relique principale, ${name}`} style={styles.relicBlock}>
      <View style={[styles.relicHalo, { borderColor: alpha(accent, '6E') }]} />
      <Image resizeMode="contain" source={relicAsset} style={styles.relicImage} />
      <Text style={styles.relicLabel}>RELIQUE PRINCIPALE</Text>
      <Text numberOfLines={1} style={[styles.relicName, { color: accent }]}>{name.toUpperCase()}</Text>
    </View>
  );
}

function alpha(color: string, opacity: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${opacity}` : color;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

const styles = StyleSheet.create({
  card: { position: 'relative', overflow: 'hidden', minHeight: 430, marginHorizontal: 16, padding: 18, borderRadius: 31, backgroundColor: '#0A0F14', borderWidth: 1 },
  bannerGlow: { position: 'absolute', width: 300, height: 300, top: -185, left: -65, borderRadius: 150, opacity: .2, boxShadow: '0 0 70px rgba(232,255,61,.1)' },
  relicGlow: { position: 'absolute', width: 150, height: 180, right: -28, top: 112, borderRadius: 80, opacity: .1, boxShadow: '0 0 52px rgba(232,255,61,.12)' },
  watermark: { position: 'absolute', right: -12, top: 46, fontFamily: fonts.display, fontSize: 94, lineHeight: 98, letterSpacing: -6, opacity: .065 },
  topline: { zIndex: 2, minHeight: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  bannerMeta: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  bannerDot: { width: 6, height: 6, borderRadius: 3 },
  bannerName: { ...typography.eyebrow, flex: 1, color: colors.textMuted, letterSpacing: .75 },
  rankPill: { minHeight: 27, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: 'rgba(5,8,11,.66)', borderWidth: 1 },
  rankPillText: { ...typography.label, letterSpacing: .6 },
  identityLine: { zIndex: 2, marginTop: 13, color: colors.text, fontFamily: fonts.display, fontSize: 32, lineHeight: 34, letterSpacing: -.7 },
  identityRank: { fontFamily: fonts.display },
  stage: { zIndex: 2, minHeight: 190, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  supporterBlock: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  frameName: { ...typography.label, maxWidth: 150, marginTop: 9, color: colors.textMuted, letterSpacing: .5 },
  title: { ...typography.bodyStrong, maxWidth: 170, marginTop: 2 },
  relicBlock: { position: 'relative', width: 142, minHeight: 178, alignItems: 'center', justifyContent: 'center' },
  relicHalo: { position: 'absolute', width: 122, height: 122, top: 5, borderRadius: 61, backgroundColor: 'rgba(0,0,0,.24)', borderWidth: 1 },
  relicImage: { width: 142, height: 145 },
  relicLabel: { ...typography.label, marginTop: -5, color: colors.textMuted, letterSpacing: .45 },
  relicName: { ...typography.eyebrow, width: 142, marginTop: 2, textAlign: 'center', letterSpacing: .35 },
  visibilityPromise: { ...typography.label, zIndex: 2, marginTop: 2, color: '#AAB3BC', letterSpacing: .45, textAlign: 'center' },
  actions: { zIndex: 2, marginTop: 14, gap: 8 },
  primaryAction: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: colors.volt, boxShadow: '0 10px 28px rgba(232,255,61,.13)' },
  primaryActionText: { ...typography.action, color: '#070A0E', letterSpacing: .7 },
  secondaryAction: { minHeight: 47, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 15, backgroundColor: 'rgba(8,12,16,.72)', borderWidth: 1, borderColor: '#34404A' },
  secondaryActionText: { ...typography.action, color: colors.text, letterSpacing: .45 },
  balance: { ...typography.label, color: colors.volt },
  pressed: { opacity: .76, transform: [{ scale: .995 }] },
});
