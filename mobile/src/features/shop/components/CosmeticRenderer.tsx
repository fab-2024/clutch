import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, typography } from '@/src/theme';

import type {
  CosmeticItem,
  EquippedCosmetic,
  EquippedCosmetics,
} from '../types';

type CosmeticAvatarProps = {
  cosmetics?: EquippedCosmetics | null;
  fallback?: string;
  label: string;
  size?: number;
};

type SupporterIdentityProps = {
  cosmetics?: EquippedCosmetics | null;
  meta?: string;
  pseudo: string;
  compact?: boolean;
};

export function CosmeticAvatar({
  cosmetics,
  fallback,
  label,
  size = 48,
}: CosmeticAvatarProps) {
  const frame = cosmetics?.frame;
  const accent = frame?.accent ?? '#46515C';
  const mark = fallback?.trim() || initials(label);
  const outerRadius = Math.round(size * 0.31);
  const innerSize = Math.round(size * 0.7);

  return (
    <View
      accessible
      accessibilityLabel={frame ? `${label}, cadre ${frame.name}` : label}
      style={[
        styles.avatarShell,
        {
          width: size,
          height: size,
          borderRadius: outerRadius,
          borderColor: accent,
          boxShadow: frame ? `0 0 ${Math.round(size * 0.25)}px ${alpha(accent, '40')}` : 'none',
        },
      ]}
    >
      <View
        style={[
          styles.avatarCore,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: Math.round(innerSize * 0.31),
            backgroundColor: alpha(accent, frame ? '26' : '16'),
          },
        ]}
      >
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.avatarText, { color: frame ? accent : colors.volt, fontSize: Math.max(10, Math.round(size * 0.25)) }]}
        >
          {mark}
        </Text>
      </View>
      {frame ? (
        <>
          <View style={[styles.frameCornerTop, { borderColor: accent }]} />
          <View style={[styles.frameCornerBottom, { borderColor: accent }]} />
        </>
      ) : null}
    </View>
  );
}

export function SupporterIdentity({
  compact = false,
  cosmetics,
  meta,
  pseudo,
}: SupporterIdentityProps) {
  const title = cosmetics?.title;
  const frame = cosmetics?.frame;

  return (
    <View
      accessible
      accessibilityLabel={`${pseudo}, ${title?.name ?? 'supporter GRIFF'}${frame ? `, cadre ${frame.name}` : ''}`}
      style={[styles.identity, compact && styles.identityCompact, { borderColor: alpha(frame?.accent ?? '#33404A', '72') }]}
    >
      <CosmeticAvatar cosmetics={cosmetics} label={pseudo} size={compact ? 40 : 52} />
      <View style={styles.identityCopy}>
        <Text numberOfLines={1} style={[styles.identityPseudo, compact && styles.identityPseudoCompact]}>{pseudo}</Text>
        <Text numberOfLines={1} style={[styles.identityTitle, { color: title?.accent ?? colors.volt }]}>
          {(title?.name ?? meta ?? 'Supporter GRIFF').toUpperCase()}
        </Text>
      </View>
      {meta && title ? <Text numberOfLines={1} style={styles.identityMeta}>{meta}</Text> : null}
    </View>
  );
}

export function CosmeticItemPreview({ item, pseudo = 'JOUEUR_01' }: { item: CosmeticItem; pseudo?: string }) {
  if (item.slot === 'cadre_profil') {
    return (
      <View style={styles.preview}>
        <View style={[styles.framePreview, { borderColor: item.accent, boxShadow: `0 0 18px ${alpha(item.accent, '35')}` }]}>
          <View style={[styles.frameAvatar, { backgroundColor: alpha(item.accent, '28') }]}><Text style={[styles.frameAvatarText, { color: item.accent }]}>{initials(pseudo)}</Text></View>
          <View style={styles.frameLines}><View style={styles.frameLineLong} /><View style={[styles.frameLineShort, { backgroundColor: item.accent }]} /></View>
        </View>
      </View>
    );
  }
  if (item.slot === 'titre_profil') {
    return (
      <View style={styles.preview}>
        <View style={styles.titlePreview}><Text numberOfLines={1} style={styles.titlePreviewPseudo}>{pseudo}</Text><Text numberOfLines={1} style={[styles.titlePreviewValue, { color: item.accent }]}>{item.name.toUpperCase()}</Text><View style={[styles.titlePreviewLine, { backgroundColor: item.accent }]} /></View>
      </View>
    );
  }
  if (item.slot === 'apparence_core') {
    return (
      <View style={styles.preview}>
        <View style={[styles.coreOrbit, { borderColor: alpha(item.accent, '66') }]}><View style={[styles.coreOrbitNode, { backgroundColor: item.accent }]} /><LinearGradient colors={[alpha(item.accent, 'EE'), alpha(item.accent, '66'), '#10141A']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.corePreview}><Text style={styles.corePreviewText}>C</Text></LinearGradient></View>
      </View>
    );
  }
  if (item.slot === 'effet_faction') {
    return (
      <View style={styles.preview}>
        <View style={[styles.relicGlow, { backgroundColor: alpha(item.accent, '22'), boxShadow: `0 0 24px ${alpha(item.accent, '44')}` }]} /><View style={[styles.relicNeck, { borderColor: alpha(item.accent, '77') }]} /><View style={[styles.relicBody, { borderColor: alpha(item.accent, '99') }]}><View style={[styles.relicLiquid, { backgroundColor: alpha(item.accent, '45') }]} /><View style={[styles.relicHeart, { backgroundColor: item.accent, boxShadow: `0 0 12px ${item.accent}` }]} /></View>
      </View>
    );
  }
  return (
    <View style={styles.preview}>
      <LinearGradient colors={['#141A21', alpha(item.accent, '28'), '#080B0F']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={[styles.cardPreview, { borderColor: alpha(item.accent, '88') }]}><Text style={[styles.cardPreviewRank, { color: item.accent }]}>#128</Text><View style={styles.cardPreviewCopy}><Text numberOfLines={1} style={styles.cardPreviewName}>{pseudo}</Text><Text style={styles.cardPreviewMeta}>ÉLITE · 68% PRÉCISION</Text></View></LinearGradient>
    </View>
  );
}

export function relicSignatureTheme(effect?: EquippedCosmetic | null) {
  const accent = effect?.accent ?? '#C6A34A';
  return {
    accent,
    aura: alpha(accent, effect && effect.level >= 4 ? '32' : effect && effect.level >= 2 ? '24' : '18'),
    border: alpha(accent, effect ? '8C' : '5C'),
    glow: `0 0 ${effect ? 44 + effect.level * 6 : 36}px ${alpha(accent, effect ? '54' : '34')}`,
  };
}

function initials(value: string) {
  const parts = value.trim().split(/[\s._-]+/).filter(Boolean);
  return parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : (parts[0] || '?').slice(0, 2).toUpperCase();
}

function alpha(color: string, opacity: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${opacity}` : color;
}

const styles = StyleSheet.create({
  avatarShell: { position: 'relative', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', backgroundColor: '#0A0F14', borderWidth: 1.5 },
  avatarCore: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E' },
  avatarText: { fontFamily: fonts.display, letterSpacing: -.5 },
  frameCornerTop: { position: 'absolute', top: -1, right: -1, width: '42%', height: '32%', borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 13 },
  frameCornerBottom: { position: 'absolute', left: -1, bottom: -1, width: '42%', height: '32%', borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 13 },
  identity: { minHeight: 72, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 20, backgroundColor: 'rgba(8,13,17,.88)', borderWidth: 1 },
  identityCompact: { minHeight: 58, paddingVertical: 8, paddingHorizontal: 9, borderRadius: 17 },
  identityCopy: { flex: 1, minWidth: 0 },
  identityPseudo: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
  identityPseudoCompact: { fontSize: 14 },
  identityTitle: { ...typography.eyebrow, marginTop: 3, letterSpacing: .55 },
  identityMeta: { ...typography.label, maxWidth: 90, color: colors.textMuted, textAlign: 'right' },
  preview: { height: 120, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 17, backgroundColor: '#070B0F', borderWidth: 1, borderColor: '#1C252D' },
  framePreview: { width: 126, height: 78, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 18, backgroundColor: '#0C1116', borderWidth: 2 },
  frameAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  frameAvatarText: { fontFamily: fonts.display, fontSize: 18 },
  frameLines: { flex: 1, gap: 7 },
  frameLineLong: { width: '92%', height: 6, borderRadius: 4, backgroundColor: '#D9DEE3' },
  frameLineShort: { width: '62%', height: 4, borderRadius: 3 },
  titlePreview: { width: 132, height: 74, padding: 11, justifyContent: 'center', borderRadius: 17, backgroundColor: '#0D1319', borderWidth: 1, borderColor: '#27313B' },
  titlePreviewPseudo: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
  titlePreviewValue: { marginTop: 4, fontFamily: fonts.semibold, fontSize: 8, letterSpacing: .4 },
  titlePreviewLine: { width: 34, height: 2, marginTop: 8 },
  coreOrbit: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', borderRadius: 46, borderWidth: 1 },
  coreOrbitNode: { position: 'absolute', top: 3, width: 7, height: 7, borderRadius: 4 },
  corePreview: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 19, transform: [{ rotate: '-7deg' }] },
  corePreviewText: { color: '#07090C', fontFamily: fonts.display, fontSize: 32 },
  relicGlow: { position: 'absolute', width: 86, height: 86, borderRadius: 43 },
  relicNeck: { width: 21, height: 25, marginBottom: -3, borderWidth: 1.5, borderBottomWidth: 0, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: '#12181D' },
  relicBody: { width: 66, height: 67, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', borderRadius: 29, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1.5, backgroundColor: 'rgba(19,28,34,.82)' },
  relicLiquid: { position: 'absolute', left: 3, right: 3, bottom: 3, height: 36, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  relicHeart: { width: 10, height: 22, marginBottom: 18, borderRadius: 6 },
  cardPreview: { width: 140, height: 82, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 17, borderWidth: 1 },
  cardPreviewRank: { fontFamily: fonts.display, fontSize: 25 },
  cardPreviewCopy: { flex: 1, minWidth: 0 },
  cardPreviewName: { ...typography.bodyStrong, color: colors.text },
  cardPreviewMeta: { ...typography.caption, marginTop: 3, color: colors.textMuted, fontSize: 8 },
});
