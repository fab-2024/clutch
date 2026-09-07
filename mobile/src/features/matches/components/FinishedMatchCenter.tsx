import { LinearGradient } from 'expo-linear-gradient';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Ticket from 'lucide-react-native/icons/ticket';
import Trophy from 'lucide-react-native/icons/trophy';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { colors, fonts, layout } from '@/src/theme';
import { resolveMatchTeamAccents } from '@/src/utils/teamColors';

import type { MatchCenterData } from '../types';
import { gameLabel } from '../utils';
import { CallContract } from './MatchCenterSections';

export function FinishedMatchCenter({ data }: { data: MatchCenterData }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { width } = useWindowDimensions();
  const small = width < 380;
  const { match, prediction } = data;
  const accents = resolveMatchTeamAccents(
    { name: match.equipe_a, tag: match.tag_a },
    { name: match.equipe_b, tag: match.tag_b },
  );
  const scoresKnown = match.score_a != null && match.score_b != null;
  const winner = !scoresKnown || match.score_a === match.score_b ? null : match.score_a! > match.score_b! ? 'a' : 'b';
  const winningTeam = winner === 'a' ? match.equipe_a : match.equipe_b;
  const calledTeam = prediction?.choix === 'a' ? match.equipe_a : match.equipe_b;
  const settled = prediction?.statut === 'gagne' || prediction?.statut === 'perdu';
  const delta = prediction?.delta_frags;
  const outcome = !prediction ? 'Tu n’as pas participé'
    : prediction.statut === 'gagne' ? 'Call réussi'
    : prediction.statut === 'perdu' ? 'Call manqué'
    : prediction.statut === 'annule' ? 'Call annulé'
    : 'Verdict de ton call en attente';
  const impact = !prediction || prediction.statut === 'annule' ? 'Aucun changement de Frags.'
    : settled && delta != null ? `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta)} Frags`
    : 'Mise à jour des Frags en attente.';
  const impactColor = settled && delta != null && delta !== 0 ? delta > 0 ? colors.success : colors.danger : colors.textMuted;
  const startsAt = new Date(match.debut);
  const dateLabel = Number.isNaN(startsAt.getTime()) ? 'Date indisponible' : `${startsAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · ${startsAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <View style={styles.stack} testID="finished-match-center">
      <View style={styles.hero}>
        <LinearGradient colors={[`${accents.a}26`, '#070D15', `${accents.b}26`]} start={{ x: 0, y: .5 }} end={{ x: 1, y: .5 }} pointerEvents="none" style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['transparent', 'rgba(5,10,15,.72)']} pointerEvents="none" style={StyleSheet.absoluteFill} />
        <View style={styles.meta}>
          <View style={styles.dot} />
          <Text numberOfLines={2} style={styles.event}><Text style={styles.game}>{gameLabel(match.jeu)}</Text> · {match.evenement}</Text>
          <View style={styles.format}><Text style={styles.metaText}>BO{match.format}</Text></View>
        </View>
        <View style={styles.statusBlock}>
          <View style={styles.status}><Text style={styles.metaText}>Terminé</Text></View>
          <Text style={styles.date}>{dateLabel}</Text>
        </View>
        <View style={styles.scoreRow}>
          <ResultTeam accent={accents.a} logo={match.logo_a} name={match.equipe_a} small={small} tag={match.tag_a} winner={winner === 'a'} />
          <Text accessibilityLabel={`Score final : ${match.score_a ?? 'indisponible'} à ${match.score_b ?? 'indisponible'}`} adjustsFontSizeToFit minimumFontScale={.7} numberOfLines={1} style={[styles.score, small && styles.scoreSmall]}>{match.score_a ?? '—'} - {match.score_b ?? '—'}</Text>
          <ResultTeam accent={accents.b} logo={match.logo_b} name={match.equipe_b} small={small} tag={match.tag_b} winner={winner === 'b'} />
        </View>
        <View style={styles.winner}>
          {winner ? <View style={styles.trophy}><Trophy color={colors.volt} size={22} /><View style={styles.check}><Check color={colors.background} size={10} strokeWidth={3} /></View></View> : null}
          <Text style={styles.winnerText}>{winner ? `Victoire de ${winningTeam}` : scoresKnown ? 'Match nul' : 'Score final en attente'}</Text>
        </View>
      </View>

      <View style={styles.call}>
        <View style={styles.ticket}><Ticket color={prediction ? colors.volt : colors.textSubtle} size={small ? 42 : 54} strokeWidth={1.4} /></View>
        <View style={styles.callCopy}>
          <Text style={styles.eyebrow}>TON CALL{prediction ? ` · ${prediction.choix === 'a' ? match.tag_a : match.tag_b}` : ''}</Text>
          <Text style={styles.outcome}>{outcome}</Text>
          {prediction ? <Text style={styles.chosenTeam}>{calledTeam}</Text> : null}
          <Text style={[styles.impact, { color: impactColor }]}>{impact}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <Pressable accessibilityRole="button" accessibilityLabel="Détails du call" accessibilityState={{ expanded: detailsOpen }} onPress={() => setDetailsOpen((value) => !value)} style={({ pressed }) => [styles.detailsToggle, pressed && styles.pressed]}>
          <Text style={styles.detailsLabel}>Détails du call</Text>
          {detailsOpen ? <ChevronUp color={colors.text} size={22} /> : <ChevronDown color={colors.text} size={22} />}
        </Pressable>
        {detailsOpen ? <View style={styles.detailsBody}><CallContract data={data} /></View> : null}
      </View>
    </View>
  );
}

function ResultTeam({ accent, logo, name, small, tag, winner }: { accent: string; logo?: string | null; name: string; small: boolean; tag: string; winner: boolean }) {
  return (
    <View style={styles.team}>
      <TeamLogo accent={accent} contentScale={.9} name={name} size={small ? 78 : 90} tag={tag} uri={logo} />
      <Text adjustsFontSizeToFit minimumFontScale={.75} numberOfLines={2} style={[styles.teamName, winner && { color: accent }]}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  hero: { overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#080E14', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 26 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.volt },
  event: { flex: 1, color: colors.textMuted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  game: { color: colors.text },
  format: { borderRadius: 18, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.surfaceElevated },
  metaText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  statusBlock: { alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 14 },
  status: { borderRadius: 20, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 12, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,.035)' },
  date: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  team: { flex: 1, minWidth: 0, alignItems: 'center', gap: 10 },
  teamName: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 24, textAlign: 'center', minHeight: 48 },
  score: { flex: 1.18, marginTop: 17, color: colors.text, fontFamily: fonts.display, fontSize: 58, lineHeight: 66, textAlign: 'center' },
  scoreSmall: { marginTop: 13, fontSize: 48, lineHeight: 56 },
  winner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14, minHeight: 38 },
  trophy: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#747F10', alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', bottom: -1, right: -1, borderRadius: 8, backgroundColor: colors.volt, padding: 2 },
  winnerText: { flexShrink: 1, fontFamily: fonts.medium, color: colors.text, fontSize: 15, lineHeight: 22 },
  call: { minHeight: 110, borderRadius: 20, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(13,22,29,.7)', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 22 },
  ticket: { width: 60, height: 60, flexShrink: 0, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-45deg' }] },
  callCopy: { flex: 1, minWidth: 0, gap: 6 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 16, color: colors.volt },
  outcome: { fontFamily: fonts.medium, fontSize: 19, lineHeight: 25, color: colors.text },
  chosenTeam: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  impact: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  details: { borderRadius: 18, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(13,22,29,.55)', overflow: 'hidden' },
  detailsToggle: { minHeight: Math.max(layout.minTouchTarget, 50), paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  detailsLabel: { color: colors.text, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  detailsBody: { padding: 10, paddingTop: 0 },
  pressed: { opacity: .75 },
});
