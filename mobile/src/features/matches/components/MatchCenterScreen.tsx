import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { createDuel } from '@/src/features/social/duels/api';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radius, spacing } from '@/src/theme';

import { loadMatchCenter, submitRankedPrediction } from '../api';
import type { ArenaMatch, MatchCenterData, MatchProjection, ProjectionChoice } from '../types';
import { gameLabel, matchPhase, predictionIsOpen } from '../utils';

export default function MatchCenterScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ id?: string | string[]; duel?: string | string[] }>();
  const matchId = Array.isArray(params.id) ? params.id[0] : params.id;
  const duelToken = Array.isArray(params.duel) ? params.duel[0] : params.duel;
  const [data, setData] = useState<MatchCenterData | null>(null);
  const [selected, setSelected] = useState<'a' | 'b' | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duelBusy, setDuelBusy] = useState(false);
  const [webConfirmationOpen, setWebConfirmationOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duelError, setDuelError] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  const load = useCallback(async (refresh = false) => {
    if (!matchId || !session?.user.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const requestId = ++loadRequestRef.current;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const nextData = await loadMatchCenter(matchId, session.user.id);
      if (requestId !== loadRequestRef.current) return;
      setData(nextData);
    } catch (caught) {
      if (requestId !== loadRequestRef.current) return;
      console.error(caught);
      setError(caught instanceof Error ? caught.message : 'Impossible de charger le Match Center.');
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [matchId, session?.user.id]);

  useEffect(() => {
    setData(null);
    setSelected(null);
    setSubmitError(null);
    setWebConfirmationOpen(false);
    void load();
    return () => { loadRequestRef.current += 1; };
  }, [load]);

  const match = data?.match ?? null;
  const projection = data?.projection ?? null;
  const prediction = data?.prediction ?? null;
  const phase = match ? matchPhase(match) : null;
  const open = Boolean(match && predictionIsOpen(match));

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
    const confirmation = `${team}\n+${Math.abs(selectedChoice.gain)} Frags si correct · −${Math.abs(selectedChoice.perte)} si faux.`;

    if (Platform.OS === 'web') {
      setWebConfirmationOpen(true);
      return;
    }

    Alert.alert(
      'Verrouiller ce pronostic ?',
      confirmation,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Verrouiller',
          onPress: () => void lockPrediction(match.id, selected),
        },
      ],
    );
  }

  async function lockPrediction(targetMatchId: string, choice: 'a' | 'b') {
    setWebConfirmationOpen(false);
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitRankedPrediction(targetMatchId, choice);
      setSelected(null);
      await load();
      if (duelToken) {
        router.replace({ pathname: '/duel/[token]', params: { token: duelToken } });
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Réessaie dans un instant.';
      setSubmitError(message);
      if (Platform.OS !== 'web') Alert.alert('Pronostic impossible', message);
    } finally {
      setSubmitting(false);
    }
  }

  async function launchDuel() {
    if (!match || duelBusy) return;
    setDuelBusy(true); setDuelError(null);
    try {
      const created = await createDuel(match.id);
      router.push({ pathname: '/duel/[token]', params: { token: created.token } });
    } catch (caught) {
      setDuelError(caught instanceof Error ? caught.message : 'Impossible de créer ce duel.');
    } finally { setDuelBusy(false); }
  }

  function returnToArena() {
    if (duelToken) {
      router.replace({ pathname: '/duel/[token]', params: { token: duelToken } });
      return;
    }
    router.replace('/(tabs)/matches');
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
          <Pressable accessibilityLabel={`Retour ${duelToken ? 'au duel' : 'à l’Arena'}`} accessibilityRole="button" onPress={returnToArena} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>{duelToken ? 'DUEL' : 'ARENA'}</Text>
          </Pressable>
          <Text style={styles.brand}>CLUTCH</Text>
        </View>

        {loading ? <LoadingCard /> : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Match Center indisponible</Text>
            <Text style={styles.errorCopy}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable>
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

              <Text style={[styles.dateText, phase === 'live' && styles.dateLive]}>{formatMatchDate(match)}</Text>

              <View style={styles.duel}>
                <HeroTeam
                  tag={match.tag_a}
                  name={match.equipe_a}
                  probability={choiceA?.proba}
                  score={match.score_a}
                  winner={match.statut === 'termine' && Number(match.score_a) > Number(match.score_b)}
                />
                <View style={styles.duelCenter}>
                  <Text style={styles.vsLabel}>{phase === 'finished' ? 'FINAL' : phase === 'cancelled' ? 'ANNULÉ' : phase === 'live' ? 'LIVE' : 'VERSUS'}</Text>
                  <Text style={styles.vs}>{phase === 'finished' || phase === 'cancelled' ? '—' : 'VS'}</Text>
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

              {choiceA && choiceB && phase !== 'finished' && phase !== 'cancelled' ? (
                <ProbabilityBar a={choiceA} b={choiceB} tagA={match.tag_a} tagB={match.tag_b} />
              ) : null}

              {projection && phase !== 'finished' && phase !== 'cancelled' ? <ProjectionMeta projection={projection} /> : null}
            </View>

            {prediction ? (
              <LockedPrediction data={data!} />
            ) : (
              <PredictionZone
                data={data!}
                open={open}
                selected={selected}
                onSelect={(choice) => {
                  setSelected(choice);
                  setSubmitError(null);
                  setWebConfirmationOpen(false);
                }}
              />
            )}

            {prediction && duelToken ? (
              <View style={styles.duelAction}>
                <View style={styles.duelActionCopy}>
                  <Text style={styles.duelActionEyebrow}>INVITATION EN ATTENTE</Text>
                  <Text style={styles.duelActionTitle}>Ton camp est verrouillé.</Text>
                  <Text style={styles.duelActionText}>Retourne au face-à-face pour rejoindre le rival.</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={returnToArena} style={({ pressed }) => [styles.duelActionButton, pressed && styles.confirmPressed]}><Text style={styles.duelActionButtonText}>REJOINDRE LE DUEL →</Text></Pressable>
              </View>
            ) : prediction && open && prediction.statut === 'en_cours' ? (
              <View style={styles.duelAction}>
                <View style={styles.duelActionCopy}>
                  <Text style={styles.duelActionEyebrow}>FACE-À-FACE</Text>
                  <Text style={styles.duelActionTitle}>Quelqu’un assume le camp opposé ?</Text>
                  <Text style={styles.duelActionText}>Crée une invitation liée à ce pronostic et partage-la à ton rival.</Text>
                </View>
                {duelError ? <Text style={styles.duelActionError}>{duelError}</Text> : null}
                <Pressable accessibilityRole="button" disabled={duelBusy} onPress={() => void launchDuel()} style={({ pressed }) => [styles.duelActionButton, (pressed || duelBusy) && styles.confirmPressed]}><Text style={styles.duelActionButtonText}>{duelBusy ? 'CRÉATION…' : 'DÉFIER UN RIVAL →'}</Text></Pressable>
              </View>
            ) : null}

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

                {submitError ? <View style={styles.submitError}><Text style={styles.submitErrorTitle}>PRONOSTIC NON ENREGISTRÉ</Text><Text style={styles.submitErrorCopy}>{submitError}</Text></View> : null}

                {Platform.OS === 'web' && webConfirmationOpen && selected ? (
                  <View style={styles.webConfirmation}>
                    <Text style={styles.webConfirmationTitle}>CONFIRMER CE PRONOSTIC ?</Text>
                    <Text style={styles.webConfirmationCopy}>
                      {selected === 'a' ? match.equipe_a : match.equipe_b} · +{Math.abs(selectedChoice.gain)} si correct · −{Math.abs(selectedChoice.perte)} si faux.
                    </Text>
                    <View style={styles.webConfirmationActions}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setWebConfirmationOpen(false)}
                        style={({ pressed }) => [styles.webCancelButton, pressed && styles.confirmPressed]}
                      >
                        <Text style={styles.webCancelText}>ANNULER</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={submitting}
                        onPress={() => void lockPrediction(match.id, selected)}
                        style={({ pressed }) => [styles.webLockButton, pressed && styles.confirmPressed, submitting && styles.disabled]}
                      >
                        <Text style={styles.webLockText}>{submitting ? 'VERROUILLAGE…' : 'VERROUILLER'}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={submitting}
                    onPress={() => void confirmPrediction()}
                    style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmPressed, submitting && styles.disabled]}
                  >
                    <Text style={styles.confirmText}>{submitting ? 'VERROUILLAGE…' : 'VERROUILLER MON PRONOSTIC'}</Text>
                    <Text style={styles.confirmArrow}>→</Text>
                  </Pressable>
                )}
              </View>
            ) : null}

            <View style={styles.infoCard}>
              <Text style={styles.infoEyebrow}>COMMENT ÇA MARCHE</Text>
              <Text style={styles.infoTitle}>Ton rating, pas ton portefeuille.</Text>
              <Text style={styles.infoCopy}>
                Correct : tu gagnes des Frags. Faux : tu en perds. La probabilité du modèle est figée pour tous les joueurs avant ton choix.
              </Text>
            </View>

            {data?.related.length ? <RelatedMatches matches={data.related} /> : null}
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
  if (match.statut === 'annule') {
    return <ClosedState eyebrow="MATCH ANNULÉ" title="Cette affiche ne sera pas jouée." copy="Le pronostic éventuel est annulé sans modifier ton rating." />;
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
  choice,
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
    <Pressable
      accessibilityLabel={`Choisir ${team}, ${Math.round(Number(projection.proba) * 100)} pour cent, gain ${Math.abs(projection.gain)} Frags, perte ${Math.abs(projection.perte)} Frags`}
      accessibilityHint={`Camp ${choice.toUpperCase()}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}
    >
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
  const cancelled = prediction.statut === 'annule';

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
              : cancelled
                ? 'PRONOSTIC ANNULÉ'
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

function ProjectionMeta({ projection }: { projection: MatchProjection }) {
  const source = String(projection.source || 'modèle').replace(/_/g, ' ').toUpperCase();
  const frozenAt = projection.figee_le
    ? new Date(projection.figee_le).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase()
    : null;
  return (
    <View style={styles.projectionMeta}>
      <Text style={styles.projectionMetaText}>{source}</Text>
      {frozenAt ? <><Text style={styles.projectionMetaDot}>·</Text><Text style={styles.projectionMetaText}>FIGÉ {frozenAt}</Text></> : null}
      {projection.k ? <><Text style={styles.projectionMetaDot}>·</Text><Text style={styles.projectionMetaText}>K={projection.k}</Text></> : null}
    </View>
  );
}

function RelatedMatches({ matches }: { matches: ArenaMatch[] }) {
  return (
    <View style={styles.relatedSection}>
      <View>
        <Text style={styles.relatedEyebrow}>PROCHAINS MATCHS</Text>
        <Text style={styles.relatedTitle}>Continue dans la même Arena.</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedRail}>
        {matches.map((match) => (
          <Pressable
            accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}`}
            accessibilityRole="button"
            key={match.id}
            onPress={() => router.replace({ pathname: '/match/[id]', params: { id: match.id } })}
            style={({ pressed }) => [styles.relatedCard, pressed && styles.pressed]}
          >
            <View style={styles.relatedTop}>
              <Text style={styles.relatedWhen}>{formatRelatedDate(match.debut)}</Text>
              <Text style={styles.relatedGame}>{gameLabel(match.jeu)}</Text>
            </View>
            <Text numberOfLines={1} style={styles.relatedEvent}>{match.evenement}</Text>
            <Text style={styles.relatedDuel}>{match.tag_a} <Text style={styles.relatedVs}>VS</Text> {match.tag_b}</Text>
            <View style={styles.relatedFooter}><Text style={styles.relatedFormat}>BO{match.format}</Text><Text style={styles.relatedArrow}>→</Text></View>
          </Pressable>
        ))}
      </ScrollView>
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

function formatMatchDate(match: MatchCenterData['match']) {
  const phase = matchPhase(match);
  if (phase === 'finished') return 'MATCH TERMINÉ';
  if (phase === 'cancelled') return 'MATCH ANNULÉ';
  if (phase === 'live') return 'LIVE · PRONOSTICS FERMÉS';
  const date = new Date(match.debut);
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatRelatedDate(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').toUpperCase()} · ${formatTime(value)}`;
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
  dateLive: { color: colors.liveText },
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
  projectionMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 5 },
  projectionMetaText: { color: '#687482', fontSize: 7, fontWeight: '900', letterSpacing: .7 },
  projectionMetaDot: { color: '#46515D', fontSize: 8 },
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
  submitError: { padding: spacing.sm, borderRadius: radius.sm, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027', gap: 4 },
  submitErrorTitle: { color: '#FF9AA3', fontSize: 8, fontWeight: '900', letterSpacing: .7 },
  submitErrorCopy: { color: '#D78891', fontSize: 10, lineHeight: 15 },
  confirmButton: { minHeight: 54, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.volt, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  confirmPressed: { opacity: .85 },
  confirmText: { color: '#080B0F', fontSize: 10, fontWeight: '900', letterSpacing: .8 },
  confirmArrow: { color: '#080B0F', fontSize: 19, fontWeight: '900' },
  webConfirmation: { padding: spacing.md, borderRadius: radius.md, backgroundColor: '#0A0E0A', borderWidth: 1, borderColor: '#4A5B23', gap: spacing.sm },
  webConfirmationTitle: { color: colors.text, fontSize: 11, fontWeight: '900', letterSpacing: .7 },
  webConfirmationCopy: { color: colors.textMuted, fontSize: 10, lineHeight: 16 },
  webConfirmationActions: { flexDirection: 'row', gap: spacing.sm },
  webCancelButton: { flex: 1, minHeight: 42, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  webCancelText: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: .7 },
  webLockButton: { flex: 1, minHeight: 42, borderRadius: radius.sm, backgroundColor: colors.volt, alignItems: 'center', justifyContent: 'center' },
  webLockText: { color: '#080B0F', fontSize: 9, fontWeight: '900', letterSpacing: .7 },
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
  duelAction: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#414D1E', gap: spacing.md },
  duelActionCopy: { gap: 6 },
  duelActionEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  duelActionTitle: { color: colors.text, fontSize: 19, lineHeight: 22, fontWeight: '900' },
  duelActionText: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  duelActionError: { color: '#FF9AA3', fontSize: 10, lineHeight: 15 },
  duelActionButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.volt },
  duelActionButtonText: { color: '#080B0F', fontSize: 9, fontWeight: '900', letterSpacing: .8 },
  closedCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 },
  closedEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  closedTitle: { color: colors.text, fontSize: 20, lineHeight: 24, fontWeight: '900' },
  closedCopy: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  infoCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#090D11', borderWidth: 1, borderColor: colors.border, gap: 7 },
  infoEyebrow: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  infoTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  infoCopy: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  relatedSection: { gap: 12 },
  relatedEyebrow: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  relatedTitle: { marginTop: 4, color: colors.text, fontSize: 19, fontWeight: '900', letterSpacing: -.4 },
  relatedRail: { gap: spacing.sm },
  relatedCard: { width: 210, minHeight: 145, padding: 14, borderRadius: 18, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border },
  relatedTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  relatedWhen: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: .5 },
  relatedGame: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  relatedEvent: { marginTop: 10, color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  relatedDuel: { marginTop: 10, color: colors.text, fontSize: 19, fontWeight: '900', letterSpacing: -.5 },
  relatedVs: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  relatedFooter: { marginTop: 'auto', paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1D252D' },
  relatedFormat: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: .7 },
  relatedArrow: { color: colors.volt, fontSize: 16, fontWeight: '900' },
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
