import { LinearGradient } from 'expo-linear-gradient';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Crown from 'lucide-react-native/icons/crown';
import Info from 'lucide-react-native/icons/info';
import Ticket from 'lucide-react-native/icons/ticket';
import Trophy from 'lucide-react-native/icons/trophy';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import GameLogo from '@/src/features/onboarding/components/GameLogo';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import type { GameId } from '@/src/features/onboarding/types';
import { colors, fonts, layout } from '@/src/theme';
import { resolveMatchTeamAccents } from '@/src/utils/teamColors';

import type { MatchCenterData, RankedPrediction } from '../types';
import { gameLabel } from '../utils';

const PANEL_BLUE = '#061824';
const PANEL_BLUE_LIGHT = '#0B2534';
const PANEL_BORDER = '#31566A';
const SUCCESS = '#2FE2C6';

export function FinishedMatchCenter({ data }: { data: MatchCenterData }) {
  const [detailsOpen, setDetailsOpen] = useState(true);
  const { width } = useWindowDimensions();
  const small = width < 380;
  const { match, prediction } = data;
  const accents = resolveMatchTeamAccents(
    { name: match.equipe_a, tag: match.tag_a },
    { name: match.equipe_b, tag: match.tag_b },
  );
  const scoresKnown = match.score_a != null && match.score_b != null;
  const winner = !scoresKnown || match.score_a === match.score_b
    ? null
    : match.score_a! > match.score_b!
      ? 'a'
      : 'b';
  const winningTeam = winner === 'a' ? match.equipe_a : winner === 'b' ? match.equipe_b : null;
  const resultDate = match.resultat_regle_le ?? match.resultat_maj_le ?? match.debut;

  return (
    <View style={styles.stack} testID="finished-match-center">
      <View style={styles.metaBar}>
        <GameLogo color="#95A9B8" game={toGameId(match.jeu)} size={26} />
        <Text numberOfLines={2} style={styles.event}>
          <Text style={styles.game}>{gameLabel(match.jeu)}</Text> · {match.evenement}
        </Text>
        <View style={styles.format}><Text style={styles.formatText}>BO{match.format}</Text></View>
      </View>

      <View style={styles.resultCard}>
        <LinearGradient
          colors={[`${accents.a}16`, PANEL_BLUE, `${accents.b}12`]}
          end={{ x: 1, y: .6 }}
          pointerEvents="none"
          start={{ x: 0, y: .4 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.statusBlock}>
          <View style={styles.status}><Text style={styles.statusText}>TERMINÉ</Text></View>
          <Text style={styles.date}>{formatLongDateTime(resultDate)}</Text>
        </View>
        <View style={styles.scoreRow}>
          <ResultTeam accent={accents.a} logo={match.logo_a} name={match.equipe_a} small={small} tag={match.tag_a} winner={winner === 'a'} />
          <Text
            accessibilityLabel={`Score final : ${match.score_a ?? 'indisponible'} à ${match.score_b ?? 'indisponible'}`}
            adjustsFontSizeToFit
            minimumFontScale={.7}
            numberOfLines={1}
            style={[styles.score, small && styles.scoreSmall]}
          >
            {match.score_a ?? '—'} - {match.score_b ?? '—'}
          </Text>
          <ResultTeam accent={accents.b} logo={match.logo_b} name={match.equipe_b} small={small} tag={match.tag_b} winner={winner === 'b'} />
        </View>
        <View style={styles.winnerRow}>
          {winner ? <Trophy color={winner === 'a' ? accents.a : accents.b} size={20} strokeWidth={2.2} /> : null}
          <Text style={styles.winnerText}>
            {winningTeam ? `${winningTeam} remporte la série` : scoresKnown ? 'Match nul' : 'Score final en attente'}
          </Text>
        </View>
      </View>

      <CallResultCard data={data} prediction={prediction} small={small} />

      <View style={styles.details}>
        <Pressable
          accessibilityLabel="Détails du call"
          accessibilityRole="button"
          accessibilityState={{ expanded: detailsOpen }}
          onPress={() => setDetailsOpen((value) => !value)}
          style={({ pressed }) => [styles.detailsToggle, pressed && styles.pressed]}
        >
          <Text style={styles.detailsLabel}>Détails du call</Text>
          {detailsOpen ? <ChevronUp color={colors.text} size={22} /> : <ChevronDown color={colors.text} size={22} />}
        </Pressable>
        {detailsOpen ? <FinishedCallDetails accents={accents} data={data} winner={winner} winningTeam={winningTeam} /> : null}
      </View>
    </View>
  );
}

function ResultTeam({ accent, logo, name, small, tag, winner }: { accent: string; logo?: string | null; name: string; small: boolean; tag: string; winner: boolean }) {
  const logoSize = small ? 72 : 84;
  return (
    <View style={styles.team}>
      <View style={[styles.teamMark, small && styles.teamMarkSmall, { borderColor: winner ? accent : PANEL_BORDER }]}>
        {winner ? <View style={styles.crown}><Crown color={accent} fill={accent} size={21} strokeWidth={1.8} /></View> : null}
        <TeamLogo accent={accent} contentScale={.92} frameless name={name} size={logoSize} tag={tag} uri={logo} />
      </View>
      <Text adjustsFontSizeToFit minimumFontScale={.72} numberOfLines={2} style={styles.teamName}>{name}</Text>
    </View>
  );
}

function CallResultCard({ data, prediction, small }: { data: MatchCenterData; prediction: RankedPrediction | null; small: boolean }) {
  const { match } = data;
  if (!prediction) {
    return (
      <View style={[styles.callCard, styles.callCardIdle]} testID="finished-call-no-participation">
        <View style={styles.ticket}><Ticket color="#9FB2C1" size={small ? 42 : 50} strokeWidth={1.45} /></View>
        <View style={styles.callCopy}>
          <Text style={styles.callEyebrow}>TON CALL</Text>
          <Text style={styles.callTitle}>Tu n’as pas participé</Text>
          <Text style={styles.callDescription}>Aucun changement de Frags.</Text>
        </View>
        <View style={styles.emptyBadge}><Text style={styles.emptyBadgeText}>AUCUN CALL</Text></View>
      </View>
    );
  }

  const teamName = prediction.choix === 'a' ? match.equipe_a : match.equipe_b;
  const teamTag = prediction.choix === 'a' ? match.tag_a : match.tag_b;
  const teamLogo = prediction.choix === 'a' ? match.logo_a : match.logo_b;
  const accents = resolveMatchTeamAccents(
    { name: match.equipe_a, tag: match.tag_a },
    { name: match.equipe_b, tag: match.tag_b },
  );
  const teamAccent = prediction.choix === 'a' ? accents.a : accents.b;
  const state = predictionState(prediction);
  const delta = prediction.delta_frags;
  const deltaLabel = delta == null ? '—' : `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta)}`;
  const deltaColor = delta == null || delta === 0 ? colors.textMuted : delta > 0 ? SUCCESS : colors.danger;

  return (
    <View style={[styles.callCard, styles.callCardPlayed, { borderLeftColor: state.color }]} testID="finished-call-participation">
      <View style={[styles.callTeamMark, { borderColor: `${teamAccent}88` }]}>
        <TeamLogo accent={teamAccent} contentScale={.92} frameless name={teamName} size={small ? 52 : 60} tag={teamTag} uri={teamLogo} />
      </View>
      <View style={styles.callCopy}>
        <Text style={styles.callEyebrow}>TON CALL</Text>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.callTeam}>{teamName}</Text>
        <Text style={styles.callDescription}>Ton choix</Text>
        <View style={[styles.callStateBadge, { borderColor: `${state.color}72` }]}>
          <View style={[styles.callStateIcon, { backgroundColor: state.color }]}><Text style={styles.callStateGlyph}>{state.glyph}</Text></View>
          <Text style={[styles.callStateText, { color: state.color }]}>{state.label}</Text>
        </View>
        <Text style={styles.callOutcomeDescription}>{state.description}</Text>
      </View>
      <View style={styles.reward}>
        <View style={styles.rewardValue}>
          <CurrencyIcon color={deltaColor} kind="frags" size={22} />
          <Text style={[styles.rewardNumber, { color: deltaColor }]}>{deltaLabel}</Text>
        </View>
        <Text style={styles.rewardLabel}>FRAGS</Text>
      </View>
    </View>
  );
}

function FinishedCallDetails({ accents, data, winner, winningTeam }: { accents: { a: string; b: string }; data: MatchCenterData; winner: 'a' | 'b' | null; winningTeam: string | null }) {
  const { callContext, match, prediction } = data;
  const distribution = callContext.distribution;
  const result = winningTeam && match.score_a != null && match.score_b != null ? `${winningTeam} · ${match.score_a}–${match.score_b}` : 'En attente';
  const chosenTeam = prediction?.choix === 'a' ? match.equipe_a : prediction?.choix === 'b' ? match.equipe_b : null;
  const delta = prediction?.delta_frags;
  const reward = delta == null ? 'En attente' : `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta)} Frags`;
  const width = `${Math.max(2, Math.min(98, distribution?.a_pct ?? 50))}%` as `${number}%`;

  return (
    <View style={styles.detailsCard}>
      <View style={styles.contractHeader}>
        <View style={styles.contractCopy}>
          <Text style={styles.contractEyebrow}>CONTRAT</Text>
          <Text style={styles.contractTitle}>{callContext.regle_resolution.libelle}</Text>
        </View>
        <View style={styles.participants}>
          <Text style={styles.participantsValue}>{formatInteger(callContext.participants)}</Text>
          <Text style={styles.participantsLabel}>participant{callContext.participants > 1 ? 's' : ''}</Text>
        </View>
      </View>

      {chosenTeam ? <DetailRow label="Ton choix" value={chosenTeam} /> : null}
      <DetailRow label="Résultat" value={result} />
      {prediction ? <DetailRow accent={prediction.statut === 'perdu' ? colors.danger : SUCCESS} label="Récompense" value={reward} /> : null}
      <DetailRow label="Clôture du call" value={formatCompactDateTime(callContext.ferme_le)} />

      {distribution ? (
        <View style={styles.distribution}>
          <Text style={styles.distributionTitle}>RÉPARTITION DES CALLS</Text>
          <View style={[styles.distributionTrack, { backgroundColor: accents.b }]}><View style={[styles.distributionFill, { backgroundColor: accents.a, width }]} /></View>
          <View style={styles.distributionLabels}>
            <Text style={styles.distributionTeam}>{match.equipe_a}{'\n'}<Text style={styles.distributionPercent}>{Math.round(distribution.a_pct)} %</Text></Text>
            <Text style={[styles.distributionTeam, styles.distributionTeamRight]}>{match.equipe_b}{'\n'}<Text style={styles.distributionPercent}>{Math.round(distribution.b_pct)} %</Text></Text>
          </View>
        </View>
      ) : (
        <View style={styles.distributionUnavailable}>
          <Info color="#8FA4B4" size={18} strokeWidth={1.8} />
          <Text style={styles.distributionUnavailableText}>Répartition indisponible · aucun call enregistré.</Text>
        </View>
      )}

      {winner ? null : <Text style={styles.pendingResult}>Le résultat définitif sera affiché dès sa validation.</Text>}
    </View>
  );
}

function DetailRow({ accent, label, value }: { accent?: string; label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text numberOfLines={2} style={[styles.detailValue, accent ? { color: accent } : null]}>{value}</Text></View>;
}

function predictionState(prediction: RankedPrediction) {
  if (prediction.statut === 'gagne') return { color: SUCCESS, description: 'Ton choix correspond au résultat final.', glyph: '✓', label: 'CALL RÉUSSI' };
  if (prediction.statut === 'perdu') return { color: colors.danger, description: 'Ton choix ne correspond pas au résultat final.', glyph: '×', label: 'CALL MANQUÉ' };
  if (prediction.statut === 'annule') return { color: colors.textMuted, description: 'Ce call a été annulé.', glyph: '—', label: 'CALL ANNULÉ' };
  return { color: colors.textSecondary, description: 'Le verdict sera bientôt disponible.', glyph: '…', label: 'VERDICT EN ATTENTE' };
}

function toGameId(value: string): GameId {
  const game = value.toLowerCase();
  if (game.includes('valorant')) return 'valorant';
  if (game.includes('rocket') || game === 'rl') return 'rocket_league';
  return 'lol';
}

function formatLongDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date indisponible';
  return `${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatCompactDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'DATE INDISPONIBLE';
  const day = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace(/\./g, '').toUpperCase();
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day} À ${time}`;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  metaBar: { minHeight: 58, paddingHorizontal: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#28485A', flexDirection: 'row', alignItems: 'center', gap: 11 },
  event: { flex: 1, color: '#8EA2B2', fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  game: { color: '#B6C4CE' },
  format: { minWidth: 66, minHeight: 36, paddingHorizontal: 14, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#34576A', backgroundColor: '#071923' },
  formatText: { color: '#9FB0BD', fontFamily: fonts.bold, fontSize: 15, lineHeight: 19 },
  resultCard: { position: 'relative', overflow: 'hidden', padding: 14, paddingTop: 20, borderRadius: 22, borderWidth: 1, borderColor: PANEL_BORDER, backgroundColor: PANEL_BLUE },
  statusBlock: { alignItems: 'center', gap: 9, marginBottom: 18 },
  status: { minWidth: 106, minHeight: 34, paddingHorizontal: 17, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#34586B', backgroundColor: 'rgba(6,23,34,.78)' },
  statusText: { color: '#9DB0BE', fontFamily: fonts.bold, fontSize: 13, lineHeight: 17 },
  date: { color: '#91A5B5', fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  team: { flex: 1, minWidth: 0, alignItems: 'center', gap: 11 },
  teamMark: { position: 'relative', width: 112, height: 112, maxWidth: '100%', borderRadius: 21, borderWidth: 1.25, backgroundColor: '#06131C', alignItems: 'center', justifyContent: 'center' },
  teamMarkSmall: { width: 100, height: 100 },
  crown: { position: 'absolute', zIndex: 2, top: -17, alignSelf: 'center' },
  teamName: { minHeight: 48, color: '#F2F4F4', fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, textAlign: 'center' },
  score: { flex: .78, marginTop: 29, color: '#F5F6F5', fontFamily: fonts.display, fontSize: 46, lineHeight: 54, textAlign: 'center' },
  scoreSmall: { marginTop: 27, fontSize: 39, lineHeight: 47 },
  winnerRow: { minHeight: 48, marginTop: 15, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#2D5265', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  winnerText: { flexShrink: 1, color: '#F1F3F4', fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  callCard: { position: 'relative', overflow: 'hidden', minHeight: 124, borderRadius: 19, borderWidth: 1, borderColor: PANEL_BORDER, backgroundColor: PANEL_BLUE, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 14 },
  callCardIdle: { paddingRight: 10 },
  callCardPlayed: { minHeight: 142, borderLeftWidth: 5 },
  ticket: { width: 58, height: 58, flexShrink: 0, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-45deg' }] },
  callTeamMark: { width: 65, height: 65, flexShrink: 0, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07131B' },
  callCopy: { flex: 1, minWidth: 0, gap: 3 },
  callEyebrow: { color: '#8DA2B2', fontFamily: fonts.bold, fontSize: 10, lineHeight: 14, letterSpacing: .25 },
  callTitle: { color: '#F3F5F5', fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  callTeam: { color: '#F3F5F5', fontFamily: fonts.displayBold, fontSize: 21, lineHeight: 25 },
  callDescription: { color: '#8FA3B3', fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  emptyBadge: { position: 'absolute', top: 14, right: 12, minHeight: 28, paddingHorizontal: 11, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3A5769', backgroundColor: '#0B1B27' },
  emptyBadgeText: { color: '#90A4B3', fontFamily: fonts.bold, fontSize: 10, lineHeight: 14 },
  callStateBadge: { alignSelf: 'flex-start', marginTop: 2, minHeight: 25, paddingHorizontal: 7, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#071821' },
  callStateIcon: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  callStateGlyph: { color: '#04131B', fontFamily: fonts.bold, fontSize: 12, lineHeight: 15 },
  callStateText: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 14 },
  callOutcomeDescription: { marginTop: 2, color: '#8FA3B3', fontFamily: fonts.medium, fontSize: 10, lineHeight: 14 },
  reward: { minWidth: 82, paddingLeft: 11, borderLeftWidth: 1, borderLeftColor: '#2E5265', alignItems: 'center', justifyContent: 'center', gap: 4 },
  rewardValue: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rewardNumber: { fontFamily: fonts.displayBold, fontSize: 27, lineHeight: 31 },
  rewardLabel: { color: '#8FA3B3', fontFamily: fonts.bold, fontSize: 10, lineHeight: 14 },
  details: { gap: 8 },
  detailsToggle: { minHeight: Math.max(layout.minTouchTarget, 50), paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  detailsLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  detailsCard: { overflow: 'hidden', padding: 16, borderRadius: 19, borderWidth: 1, borderColor: PANEL_BORDER, backgroundColor: PANEL_BLUE_LIGHT },
  contractHeader: { minHeight: 62, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  contractCopy: { flex: 1, minWidth: 0 },
  contractEyebrow: { color: '#8DA2B2', fontFamily: fonts.bold, fontSize: 10, lineHeight: 14, letterSpacing: .45 },
  contractTitle: { marginTop: 4, color: '#F2F4F4', fontFamily: fonts.bold, fontSize: 18, lineHeight: 23 },
  participants: { minWidth: 82, minHeight: 52, paddingHorizontal: 9, borderRadius: 14, borderWidth: 1, borderColor: '#345A6D', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A202D' },
  participantsValue: { color: '#F2F4F4', fontFamily: fonts.bold, fontSize: 17, lineHeight: 21 },
  participantsLabel: { color: '#90A4B3', fontFamily: fonts.medium, fontSize: 10, lineHeight: 13 },
  detailRow: { minHeight: 45, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#315568', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  detailLabel: { color: '#8FA3B3', fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  detailValue: { flex: 1, color: '#F0F3F4', fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, textAlign: 'right' },
  distribution: { paddingTop: 14, borderTopWidth: 1, borderTopColor: '#315568', gap: 9 },
  distributionTitle: { color: '#8DA2B2', fontFamily: fonts.bold, fontSize: 10, lineHeight: 14, letterSpacing: .45 },
  distributionTrack: { height: 9, overflow: 'hidden', borderRadius: 5 },
  distributionFill: { height: '100%' },
  distributionLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  distributionTeam: { flex: 1, color: '#8FA3B3', fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
  distributionTeamRight: { textAlign: 'right' },
  distributionPercent: { color: '#F1F3F4', fontFamily: fonts.bold, fontSize: 13 },
  distributionUnavailable: { minHeight: 48, marginTop: 2, paddingTop: 13, borderTopWidth: 1, borderTopColor: '#315568', flexDirection: 'row', alignItems: 'center', gap: 10 },
  distributionUnavailableText: { flex: 1, color: '#8FA3B3', fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  pendingResult: { marginTop: 10, color: '#8FA3B3', fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: .75 },
});
