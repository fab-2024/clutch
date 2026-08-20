import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { colors, radius, spacing } from '@/src/theme';

import { loadMatchCenter, submitRankedPrediction } from '../api';
import type { MatchCenterData, ProjectionChoice } from '../types';
import { gameLabel } from '../utils';

export default function MatchCenterScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const matchId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [data, setData] = useState<MatchCenterData | null>(null);
  const [selected, setSelected] = useState<'a' | 'b' | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!matchId) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setData(await loadMatchCenter(matchId));
    } catch (caught) {
      console.error(caught);
      setError(caught instanceof Error ? caught.message : 'Impossible de charger le Match Center.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const match = data?.match ?? null;
  const projection = data?.projection ?? null;
  const prediction = data?.prediction ?? null;
  const open = Boolean(
    match && match.statut === 'a_venir' && new Date(match.debut).getTime() > Date.now(),
  );

  const choiceA = useMemo(
    () => projection?.choix?.find((choice) => choice.cle === 'a') ?? null,
    [projection],
  );
  const choiceB = useMemo(
    () => projection?.choix?.find((choice) => choice.cle === 'b') ?? null,
    [projection],
  );
  const selectedChoice = selected === 'a' ? choiceA : selected === 'b' ? choiceB : null;

  async function confirmPrediction() {
    if (!match || !selected || !selectedChoice || submitting) return;
    const team = selected === 'a' ? match.equipe_a : match.equipe_b;

    Alert.alert(
      'Verrouiller ce pronostic ?',
      `${team}\n+${Math.abs(selectedChoice.gain)} Frags si correct · −${Math.abs(selectedChoice.perte)} si faux.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Verrouiller',
          onPress: async () => {
            setSubmitting(true);
            try {
              await submitRankedPrediction(match.id, selected);
              setSelected(null);
              await load();
            } catch (caught) {
              Alert.alert('Pronostic impossible', caught instanceof Error ? caught.message : 'Réessaie dans un instant.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>ARENA</Text>
          </Pressable>
          <Text style={styles.brand}>CLUTCH</Text>
        </View>

        {loading ? <LoadingCard /> : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Match Center indisponible</Text>
            <Text style={styles.errorCopy}>{error}</Text>
            <Pressable onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable>
          </View>
        ) : null}

        {match ? (
          <>
            <View style={styles.hero}>
              <View style={styles.heroAccent} />
              <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                  <View style={styles.gameDot} />
                  <Text style={styles.metaText}>{gameLabel(match.jeu)}</Text>
                  <Text style={styles.metaDivider}>·</Text>
                  <Text numberOfLines={1} style={styles.eventText}>{match.evenement}</Text>
                </View>
                <View style={styles.boPill}><Text style={styles.boText}>BO{match.format}</Text></View>
              </View>

              <Text style={styles.dateText}>{formatMatchDate(match.debut, match.statut)}</Text>

              <View style={styles.duel}>
                <HeroTeam
                  tag={match.tag_a}
                  name={match.equipe_a}
                  probability={choiceA?.proba}
                  score={match.score_a}
                  winner={match.statut === 'termine' && Number(match.score_a) > Number(match.score_b)}
                />
                <View style={styles.duelCenter}>
                  <Text style={styles.vsLabel}>{match.statut === 'termine' ? 'FINAL' : 'VERSUS'}</Text>
                  <Text style={styles.vs}>{match.statut === 'termine' ? '—' : 'VS'}</Text>
                  <Text style={styles.kickoff}>{formatTime(match.debut)}</Text>
                </View>
                <HeroTeam
                  tag={match.tag_b}
                  name={match.equipe_b}
                  probability={choiceB?.proba}
                  score={match.score_b}
                  winner={match.statut === 'termine' && Number(match.score_b) > Number(match.score_a)}
                />
              </View>

              {choiceA && choiceB && match.statut !== 'termine' ? (
                <ProbabilityBar a={choiceA} b={choiceB} tagA={match.tag_a} tagB={match.tag_b} />
              ) : null}
            </View>

            {prediction ? (
              <LockedPrediction data={data!} />
            ) : (
              <PredictionZone
                data={data!}
                open={open}
                selected={selected}
                onSelect={setSelected}
              />
            )}

            {selectedChoice && !prediction ? (
              <View style={styles.ticket}>
                <View style={styles.ticketTop}>
                  <View>
                    <Text style={styles.ticketEyebrow}>TON PRONOSTIC CLASSÉ</Text>
                    <Text style={styles.ticketTeam}>{selected === 'a' ? match.equipe_a : match.equipe_b}</Text>
                  </View>
                  <View style={styles.lockMark}><Text style={styles.lockMarkText}>✓</Text></View>
                </View>

                <View style={styles.riskRow}>
                  <RiskCell label="SI CORRECT" value={`+${Math.abs(selectedChoice.gain)}`} positive />
                  <View style={styles.riskDivider} />
                  <RiskCell label="SI FAUX" value={`−${Math.abs(selectedChoice.perte)}`} />
                </View>

                <Text style={styles.ticketHint}>
                  {projection?.placements_restants
                    ? `${projection.placements_restants} placement${projection.placements_restants > 1 ? 's' : ''} restant${projection.placements_restants > 1 ? 's' : ''}.`
                    : 'Rating établi.'} Aucun Frag n’est engagé ni dépensé.
                </Text>

                <Pressable
                  disabled={submitting}
                  onPress={() => void confirmPrediction()}
                  style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmPressed, submitting && styles.disabled]}
                >
                  <Text style={styles.confirmText}>{submitting ? 'VERROUILLAGE…' : 'VERROUILLER MON PRONOSTIC'}</Text>
                  <Text style={styles.confirmArrow}>→</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.infoCard}>
              <Text style={styles.infoEyebrow}>COMMENT ÇA MARCHE</Text>
              <Text style={styles.infoTitle}>Ton rating, pas ton portefeuille.</Text>
              <Text style={styles.infoCopy}>
                Correct : tu gagnes des Frags. Faux : tu en perds. La probabilité du modèle est figée pour tous les joueurs avant ton choix.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function PredictionZone({
  data,
  open,
  selected,
  onSelect,
}: {
  data: MatchCenterData;
  open: boolean;
  selected: 'a' | 'b' | null;
  onSelect: (choice: 'a' | 'b') => void;
}) {
  const { match, projection } = data;

  if (match.statut === 'termine') {
    return <ClosedState eyebrow="VERDICT" title="Le match est terminé." copy="Le résultat est figé. Ton historique conserve le delta Frags associé." />;
  }
  if (!open) {
    return <ClosedState eyebrow="PRONOSTICS FERMÉS" title="Le match a commencé." copy="Après le coup d’envoi, aucun nouveau pronostic classé n’est accepté." />;
  }
  if (!projection?.choix?.length) {
    return <ClosedState eyebrow="MODÈLE" title="Le risque arrive bientôt." copy="Le snapshot de probabilité n’est pas encore disponible pour cette affiche." />;
  }

  const a = projection.choix.find((choice) => choice.cle === 'a');
  const b = projection.choix.find((choice) => choice.cle === 'b');

  return (
    <View style={styles.market}>
      <Text style={styles.marketEyebrow}>PRONOSTIC CLASSÉ</Text>
      <Text style={styles.marketTitle}>Qui remporte le match ?</Text>
      <Text style={styles.marketCopy}>Choisis un camp. Tu vois le risque exact avant de verrouiller.</Text>
      <View style={styles.choiceGrid}>
        {a ? <ChoiceCard choice="a" team={match.equipe_a} tag={match.tag_a} projection={a} selected={selected === 'a'} onPress={() => onSelect('a')} /> : null}
        {b ? <ChoiceCard choice="b" team={match.equipe_b} tag={match.tag_b} projection={b} selected={selected === 'b'} onPress={() => onSelect('b')} /> : null}
      </View>
    </View>
  );
}

function ChoiceCard({
  team,
  tag,
  projection,
  selected,
  onPress,
}: {
  choice: 'a' | 'b';
  team: string;
  tag: string;
  projection: ProjectionChoice;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}>
      <View style={[styles.choiceMark, selected && styles.choiceMarkSelected]}>
        <Text style={[styles.choiceTag, selected && styles.choiceTagSelected]}>{tag}</Text>
      </View>
      <Text numberOfLines={2} style={styles.choiceTeam}>{team}</Text>
      <Text style={styles.choiceProbability}>{Math.round(Number(projection.proba) * 100)}%</Text>
      <View style={styles.choiceRisk}>
        <Text style={styles.choiceGain}>+{Math.abs(projection.gain)}</Text>
        <Text style={styles.choiceSlash}>/</Text>
        <Text style={styles.choiceLoss}>−{Math.abs(projection.perte)}</Text>
        <Text style={styles.choiceFrags}> FRAGS</Text>
      </View>
    </Pressable>
  );
}

function LockedPrediction({ data }: { data: MatchCenterData }) {
  const { match, prediction } = data;
  if (!prediction) return null;
  const team = prediction.choix === 'a' ? match.equipe_a : match.equipe_b;
  const tag = prediction.choix === 'a' ? match.tag_a : match.tag_b;
  const settled = prediction.statut === 'gagne' || prediction.statut === 'perdu';

  return (
    <View style={styles.lockedCard}>
      <View style={styles.lockedHeader}>
        <View>
          <Text style={styles.lockedEyebrow}>TON CHOIX EST VERROUILLÉ</Text>
          <Text style={styles.lockedTeam}>{team}</Text>
        </View>
        <View style={styles.lockedBadge}><Text style={styles.lockedBadgeText}>{tag}</Text></View>
      </View>
      <View style={styles.lockedMeta}>
        <Text style={styles.lockedModel}>{Math.round(Number(prediction.proba_figee) * 100)}% modèle</Text>
        <Text style={styles.lockedDot}>·</Text>
        <Text style={styles.lockedModel}>K={prediction.k_frags}</Text>
      </View>
      <View style={styles.verdictLine}>
        <Text style={styles.verdictLabel}>{settled ? 'VERDICT' : 'STATUT'}</Text>
        <Text style={[
          styles.verdictValue,
          prediction.statut === 'gagne' && styles.verdictWin,
          prediction.statut === 'perdu' && styles.verdictLoss,
        ]}>
          {prediction.statut === 'gagne'
            ? `+${Math.abs(Number(prediction.delta_frags ?? 0))} FRAGS`
            : prediction.statut === 'perdu'
              ? `−${Math.abs(Number(prediction.delta_frags ?? 0))} FRAGS`
              : 'EN ATTENTE DU RÉSULTAT'}
        </Text>
      </View>
    </View>
  );
}

function HeroTeam({
  tag,
  name,
  probability,
  score,
  winner,
}: {
  tag: string;
  name: string;
  probability?: number;
  score: number | null;
  winner: boolean;
}) {
  return (
    <View style={styles.heroTeam}>
      <View style={[styles.heroTeamMark, winner && styles.heroTeamWinner]}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.heroTeamTag, winner && styles.winnerText]}>{tag}</Text>
      </View>
      <Text numberOfLines={2} style={styles.heroTeamName}>{name}</Text>
      {score !== null ? <Text style={[styles.heroScore, winner && styles.winnerText]}>{score}</Text> : null}
      {score === null && probability !== undefined ? <Text style={styles.heroProbability}>{Math.round(Number(probability) * 100)}%</Text> : null}
    </View>
  );
}

function ProbabilityBar({ a, b, tagA, tagB }: { a: ProjectionChoice; b: ProjectionChoice; tagA: string; tagB: string }) {
  const width = `${Math.max(4, Math.min(96, Math.round(Number(a.proba) * 100)))}%` as `${number}%`;
  return (
    <View style={styles.probabilityWrap}>
      <View style={styles.probabilityLabels}>
        <Text style={styles.probabilityText}>{tagA} <Text style={styles.probabilityStrong}>{Math.round(Number(a.proba) * 100)}%</Text></Text>
        <Text style={styles.probabilityText}><Text style={styles.probabilityStrong}>{Math.round(Number(b.proba) * 100)}%</Text> {tagB}</Text>
      </View>
      <View style={styles.probabilityTrack}><View style={[styles.probabilityFill, { width }]} /></View>
    </View>
  );
}

function ClosedState({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <View style={styles.closedCard}>
      <Text style={styles.closedEyebrow}>{eyebrow}</Text>
      <Text style={styles.closedTitle}>{title}</Text>
      <Text style={styles.closedCopy}>{copy}</Text>
    </View>
  );
}

function RiskCell({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <View style={styles.riskCell}>
      <Text style={styles.riskLabel}>{label}</Text>
      <Text style={[styles.riskValue, positive ? styles.riskGain : styles.riskLoss]}>{value}</Text>
      <Text style={styles.riskUnit}>FRAGS</Text>
    </View>
  );
}

function LoadingCard() {
  return (
    <View style={styles.loadingCard}>
      <View style={styles.loadingLineWide} />
      <View style={styles.loadingLine} />
      <View style={styles.loadingDuel}>
        <View style={styles.loadingCircle} /><View style={styles.loadingCircle} />
      </View>
    </View>
  );
}

function formatMatchDate(value: string, status: string) {
  if (status === 'termine') return 'MATCH TERMINÉ';
  const date = new Date(value);
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 60, gap: spacing.lg },
  topBar: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 10 },
  backArrow: { color: colors.text, fontSize: 19, fontWeight: '800' },
  backText: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  brand: { color: colors.volt, fontSize: 14, fontWeight: '900', letterSpacing: 1.4 },
  hero: { position: 'relative', overflow: 'hidden', padding: spacing.lg, borderRadius: 30, backgroundColor: '#0D1218', borderWidth: 1, borderColor: '#2B3541', gap: spacing.md },
  heroAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: colors.volt },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  metaLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  gameDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt },
  metaText: { color: colors.text, fontSize: 9, fontWeight: '900', letterSpacing: .7 },
  metaDivider: { color: colors.textMuted, fontSize: 9 },
  eventText: { flex: 1, color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  boPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surfaceElevated },
  boText: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  dateText: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  duel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  heroTeam: { width: '36%', alignItems: 'center', gap: 7 },
  heroTeamMark: { width: 74, height: 74, borderRadius: 23, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  heroTeamWinner: { backgroundColor: '#1B2215', borderColor: '#4A5B23' },
  heroTeamTag: { color: colors.text, fontSize: 19, fontWeight: '900' },
  heroTeamName: { color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'center' },
  heroScore: { color: colors.text, fontSize: 24, fontWeight: '900' },
  heroProbability: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  winnerText: { color: colors.volt },
  duelCenter: { alignItems: 'center', gap: 3 },
  vsLabel: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  vs: { color: colors.text, fontSize: 20, fontWeight: '900' },
  kickoff: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  probabilityWrap: { gap: 7 },
  probabilityLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  probabilityText: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  probabilityStrong: { color: colors.text, fontWeight: '900' },
  probabilityTrack: { height: 6, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: '#242B34' },
  probabilityFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.volt },
  market: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border, gap: 8 },
  marketEyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  marketTitle: { color: colors.text, fontSize: 23, lineHeight: 27, fontWeight: '900', letterSpacing: -.5 },
  marketCopy: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  choiceGrid: { marginTop: 8, flexDirection: 'row', gap: 10 },
  choice: { flex: 1, minWidth: 0, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 7 },
  choiceSelected: { backgroundColor: '#171E12', borderColor: colors.volt },
  choiceMark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated },
  choiceMarkSelected: { backgroundColor: colors.volt },
  choiceTag: { color: colors.text, fontSize: 11, fontWeight: '900' },
  choiceTagSelected: { color: '#080B0F' },
  choiceTeam: { minHeight: 32, color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: '900' },
  choiceProbability: { color: colors.text, fontSize: 20, fontWeight: '900' },
  choiceRisk: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  choiceGain: { color: colors.success, fontSize: 11, fontWeight: '900' },
  choiceSlash: { marginHorizontal: 4, color: colors.textMuted, fontSize: 10 },
  choiceLoss: { color: colors.danger, fontSize: 11, fontWeight: '900' },
  choiceFrags: { color: colors.textMuted, fontSize: 7, fontWeight: '800' },
  ticket: { padding: spacing.lg, borderRadius: 26, backgroundColor: '#101510', borderWidth: 1, borderColor: '#3A4722', gap: spacing.md },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  ticketEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  ticketTeam: { marginTop: 5, color: colors.text, fontSize: 20, fontWeight: '900' },
  lockMark: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.volt, alignItems: 'center', justifyContent: 'center' },
  lockMarkText: { color: '#080B0F', fontSize: 14, fontWeight: '900' },
  riskRow: { minHeight: 72, flexDirection: 'row', alignItems: 'stretch', borderRadius: radius.md, backgroundColor: '#0A0E0A', overflow: 'hidden' },
  riskCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  riskDivider: { width: 1, marginVertical: 12, backgroundColor: '#303A24' },
  riskLabel: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  riskValue: { marginTop: 3, fontSize: 21, fontWeight: '900' },
  riskGain: { color: colors.success },
  riskLoss: { color: colors.danger },
  riskUnit: { color: colors.textMuted, fontSize: 7, fontWeight: '800' },
  ticketHint: { color: colors.textMuted, fontSize: 10, lineHeight: 16 },
  confirmButton: { minHeight: 54, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.volt, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  confirmPressed: { opacity: .85 },
  confirmText: { color: '#080B0F', fontSize: 10, fontWeight: '900', letterSpacing: .8 },
  confirmArrow: { color: '#080B0F', fontSize: 19, fontWeight: '900' },
  disabled: { opacity: .5 },
  lockedCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#101510', borderWidth: 1, borderColor: '#3A4722', gap: spacing.md },
  lockedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  lockedEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  lockedTeam: { marginTop: 5, color: colors.text, fontSize: 22, fontWeight: '900' },
  lockedBadge: { minWidth: 46, height: 46, paddingHorizontal: 7, borderRadius: 14, backgroundColor: colors.volt, alignItems: 'center', justifyContent: 'center' },
  lockedBadgeText: { color: '#080B0F', fontSize: 11, fontWeight: '900' },
  lockedMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  lockedModel: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  lockedDot: { color: colors.textMuted, fontSize: 10 },
  verdictLine: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#303A24', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  verdictLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  verdictValue: { flex: 1, textAlign: 'right', color: colors.text, fontSize: 10, fontWeight: '900' },
  verdictWin: { color: colors.success },
  verdictLoss: { color: colors.danger },
  closedCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 },
  closedEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  closedTitle: { color: colors.text, fontSize: 20, lineHeight: 24, fontWeight: '900' },
  closedCopy: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  infoCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#090D11', borderWidth: 1, borderColor: colors.border, gap: 7 },
  infoEyebrow: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  infoTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  infoCopy: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  errorCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#48242A', gap: 8 },
  errorTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  errorCopy: { color: '#FF9AA3', fontSize: 11, lineHeight: 17 },
  retry: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  loadingCard: { height: 290, padding: spacing.lg, borderRadius: 30, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 12 },
  loadingLineWide: { width: '65%', height: 10, borderRadius: 5, backgroundColor: colors.surfaceElevated },
  loadingLine: { width: '38%', height: 8, borderRadius: 4, backgroundColor: colors.surfaceElevated },
  loadingDuel: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  loadingCircle: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.surfaceElevated },
  pressed: { opacity: .82, transform: [{ scale: .99 }] },
});
