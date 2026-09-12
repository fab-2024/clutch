import { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Line, Path, Pattern, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import PlayerAvatar from '../avatars/PlayerAvatar';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import { RankEmblem } from '@/src/features/ranking/components/RankEmblem';
import type { SeasonalGradeState } from '@/src/features/ranking/grades';
import { fonts } from '@/src/theme';
import { identityPack } from './catalog';

export function equippedIdentityStyle(cosmetics?: EquippedCosmetics | null) {
  const key = cosmetics?.profileCard?.styleKey;
  return identityPack(key ?? '') ?? identityPack(key?.replace(/^identity-/, '') ?? '');
}
export const IdentitySurface = memo(function IdentitySurface({ accent = '#DFFF7A' }: { accent?: string }) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <LinearGradient colors={['#242C31', '#0B1218', '#121B22']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    <Svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none">
      <Defs><Pattern id="carbon" width={9} height={9} patternUnits="userSpaceOnUse"><Line x1={0} y1={9} x2={9} y2={0} stroke="#D8E4ED" strokeOpacity={.055} strokeWidth={1} /></Pattern></Defs>
      <Rect width={600} height={200} fill="url(#carbon)" />
      <Path d="M510 0 L363 200 L409 200 L556 0 Z" fill={accent} opacity={.46} />
      <Path d="M565 0 L418 200 L431 200 L578 0 Z" fill={accent} opacity={.18} />
      <Path d="M510 0 L363 200" stroke={accent} opacity={.85} />
    </Svg>
  </View>;
});
export type PlayerIdentityCardProps = {
  pseudo: string; avatarId?: string | null; cosmetics?: EquippedCosmetics | null;
  team?: { nom: string; logo: string | null } | null; grade?: SeasonalGradeState | null;
  season?: string | null; compact?: boolean;
};
export const PlayerIdentityCard = memo(function PlayerIdentityCard({ pseudo, avatarId, cosmetics, team, grade, season, compact = false }: PlayerIdentityCardProps) {
  const style = equippedIdentityStyle(cosmetics);
  const accent = style?.accent ?? cosmetics?.profileCard?.accent ?? cosmetics?.frame?.accent ?? '#DFFF7A';
  return <View testID="player-identity-card" style={[styles.card, compact && styles.compact, { borderColor: accent + '88' }]}>
    <IdentitySurface accent={accent} />
    <View style={styles.brandRow}><Text style={styles.brand}>CLUTCH</Text>{team?.logo ? <Image accessibilityLabel={team.nom} source={{ uri: team.logo }} style={styles.logo} resizeMode="contain" /> : null}</View>
    <View style={styles.content}>
      <View style={[styles.frame, { borderColor: accent }]}><PlayerAvatar avatarId={avatarId} cosmetics={cosmetics} label={pseudo} size={compact ? 64 : 82} /></View>
      <View style={styles.copy}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.65} style={[styles.pseudo, compact && styles.compactPseudo]}>{pseudo}</Text>
        <Text numberOfLines={1} style={styles.team}>{team ? `Supporter ${team.nom}` : 'Joueur Clutch'}</Text>
        <View style={styles.gradeRow}>{grade ? <><RankEmblem grade={grade} size={24} /><Text style={styles.grade}>{grade.libelle}</Text></> : null}{season ? <Text numberOfLines={1} style={styles.season}>{season}</Text> : null}</View>
      </View>
    </View>
  </View>;
});
const styles = StyleSheet.create({
  card: { minHeight: 178, padding: 14, borderWidth: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#0B1218' },
  compact: { minHeight: 145, padding: 12 }, brandRow: { flexDirection: 'row', justifyContent: 'space-between', height: 24, marginBottom: 10 },
  brand: { color: '#E8E4DD', fontFamily: fonts.bold, fontStyle: 'italic', letterSpacing: 2, fontSize: 12 }, logo: { width: 30, height: 26 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 14 }, frame: { padding: 3, borderWidth: 2, borderRadius: 12, backgroundColor: '#080D12' }, copy: { flex: 1, minWidth: 0 },
  pseudo: { color: '#FFF', fontFamily: fonts.bold, fontSize: 27, fontStyle: 'italic' }, compactPseudo: { fontSize: 24 }, team: { color: '#C3CBD3', fontSize: 13, marginTop: 4 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }, grade: { color: '#D9C4A9', fontSize: 12 }, season: { flex: 1, color: '#AAB3BD', fontSize: 11, marginLeft: 4 },
});
