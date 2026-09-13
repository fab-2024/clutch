import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Check from 'lucide-react-native/icons/check';
import Lock from 'lucide-react-native/icons/lock';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { createDuel } from '@/src/features/social/duels/api';
import { errorFeedback, selectionFeedback, successFeedback } from '@/src/lib/feedback';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts, radius, spacing, typography } from '@/src/theme';
import { resolveMatchTeamAccents } from '@/src/utils/teamColors';

import { submitRankedPrediction } from '../api';
import { useMatchCenterData } from '../hooks/useMatchCenterData';
import type { ArenaMatch, ProjectionChoice } from '../types';
import { formatPredictionCountdown, gameLabel, predictionIsOpen } from '../utils';
import { PredictionConfirmationSheet } from './PredictionConfirmationSheet';

const CALL_ACCENT = '#FF754D';
const CALL_ACCENT_STRONG = '#FF4E32';
const CALL_SURFACE = '#06131C';

type InlinePredictionPanelProps = {
  match: ArenaMatch;
  onClose: () => void;
  onPredictionLocked?: () => void | Promise<void>;
  rivalId?: string;
  rivalPseudo?: string;
  userId?: string;
};

export function InlinePredictionPanel({
  match,
  onClose,
  onPredictionLocked,
  rivalId,
  rivalPseudo,
  userId,
}: InlinePredictionPanelProps) {
  const { refresh: refreshEconomy } = useEconomy();
  const [selected, setSelected] = useState<'a' | 'b' | null>(null);
  const [submittedChoice, setSubmittedChoice] = useState<'a' | 'b' | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duelBusy, setDuelBusy] = useState(false);
  const [duelError, setDuelError] = useState<string | null>(null);
  const callStartedRef = useRef(false);
  const reviewTriggerRef = useRef<View>(null);
  const { data, error, load, loading } = useMatchCenterData({
    matchId: match.id,
    onResolved: refreshEconomy,
    userId,
  });

  useEffect(() => {
    if (!userId) return;
    void trackAnalyticsEvent({
      type: 'match_consulte',
      idempotencyKey: `match:${match.id}:view`,
    }).catch(() => undefined);
  }, [match.id, userId]);

  const activeMatch = data?.match ?? match;
  const projectionA = data?.projection?.choix.find((choice) => choice.cle === 'a') ?? null;
  const projectionB = data?.projection?.choix.find((choice) => choice.cle === 'b') ?? null;
  const selectedProjection = selected === 'a' ? projectionA : selected === 'b' ? projectionB : null;
  const lockedChoice = data?.prediction?.choix ?? submittedChoice ?? match.prediction?.choix ?? null;
  const accents = resolveMatchTeamAccents(
    { name: activeMatch.equipe_a, tag: activeMatch.tag_a },
    { name: activeMatch.equipe_b, tag: activeMatch.tag_b },
  );
  const countdown = useInlineCountdown(data?.callContext.ferme_le ?? activeMatch.debut);
  const open = predictionIsOpen(activeMatch);

  function selectChoice(choice: 'a' | 'b') {
    if (submitting || lockedChoice) return;
    selectionFeedback();
    if (!callStartedRef.current && userId) {
      callStartedRef.current = true;
      void trackAnalyticsEvent({
        type: 'call_commence',
        idempotencyKey: `match:${match.id}:call-started`,
      }).catch(() => {
        callStartedRef.current = false;
      });
    }
    setSelected(choice);
    setSubmitError(null);
  }

  function reviewChoice() {
    if (!selected || !selectedProjection || submitting) return;
    setSubmitError(null);
    setConfirmationOpen(true);
  }

  async function lockChoice() {
    if (!selected || !selectedProjection || submitting) return;
    const choice = selected;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitRankedPrediction(match.id, choice);
      setSubmittedChoice(choice);
      setConfirmationOpen(false);
      successFeedback();
      void trackAnalyticsEvent({
        type: 'call_verrouille',
        idempotencyKey: `match:${match.id}:call-locked`,
      }).catch(() => undefined);
      const refreshDashboard = onPredictionLocked
        ? Promise.resolve().then(onPredictionLocked)
        : Promise.resolve();
      await Promise.allSettled([
        load(true),
        refreshEconomy(),
        refreshDashboard,
      ]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Réessaie dans un instant.';
      setSubmitError(message);
      errorFeedback();
    } finally {
      setSubmitting(false);
    }
  }

  async function launchTargetedDuel() {
    if (!rivalId || duelBusy) return;
    setDuelBusy(true);
    setDuelError(null);
    try {
      const duel = await createDuel(match.id, rivalId);
      router.push({ pathname: '/duel/[token]', params: { token: duel.token } });
    } catch (caught) {
      setDuelError(caught instanceof Error ? caught.message : 'Impossible de créer ce duel.');
      errorFeedback();
    } finally {
      setDuelBusy(false);
    }
  }

  if (loading && !data) {
    return <InlinePredictionLoading match={match} onClose={onClose} />;
  }

  if (error && !data) {
    return (
      <InlinePredictionState
        action="RÉESSAYER"
        copy={error}
        match={match}
        onAction={() => void load()}
        onClose={onClose}
        title="PRONOSTIC INDISPONIBLE"
      />
    );
  }

  if (!data) {
    return (
      <InlinePredictionState
        copy="Reconnecte-toi pour charger le barème de ce call."
        match={match}
        onClose={onClose}
        title="CONNEXION REQUISE"
      />
    );
  }

  if (lockedChoice) {
    const lockedTag = lockedChoice === 'a' ? activeMatch.tag_a : activeMatch.tag_b;
    const lockedTeam = lockedChoice === 'a' ? activeMatch.equipe_a : activeMatch.equipe_b;
    return (
      <PanelShell accents={accents} match={activeMatch} onClose={onClose}>
        <View accessibilityLiveRegion="polite" style={styles.lockedState} testID="inline-prediction-locked">
          <View style={styles.lockedIcon}><Check color="#080B0F" size={22} strokeWidth={3} /></View>
          <Text style={styles.lockedEyebrow}>TON CALL · {lockedTag}</Text>
          <Text style={styles.lockedTitle}>CALL VERROUILLÉ</Text>
          <Text style={styles.lockedCopy}>{rivalId ? `Ton camp est prêt face à ${rivalPseudo || 'ton rival'}.` : `Ton call sur ${lockedTeam} est maintenant verrouillé.`}</Text>
          {duelError ? <Text accessibilityRole="alert" style={styles.duelError}>{duelError}</Text> : null}
          <View style={styles.lockedActions}>
            {rivalId ? (
              <Pressable accessibilityRole="button" disabled={duelBusy} onPress={() => void launchTargetedDuel()} style={({ pressed }) => [styles.lockedButton, (pressed || duelBusy) && styles.pressed]}>
                <Text style={styles.lockedButtonText}>{duelBusy ? 'CRÉATION…' : `DÉFIER ${(rivalPseudo || 'MON RIVAL').toUpperCase()}`}</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [rivalId ? styles.lockedSecondaryButton : styles.lockedButton, pressed && styles.pressed]}>
              <Text style={rivalId ? styles.lockedSecondaryButtonText : styles.lockedButtonText}>REVENIR AUX MATCHS</Text>
            </Pressable>
          </View>
        </View>
      </PanelShell>
    );
  }

  if (!open || !projectionA || !projectionB) {
    return (
      <InlinePredictionState
        copy={open ? (data?.projection?.status === 'preparing' ? 'Historique insuffisant ou en cours de mise à jour. Les calls ouvriront dès que l’estimation sera prête.' : 'Le barème de ce match sera bientôt disponible.') : 'Les calls sont fermés pour cette affiche.'}
        match={activeMatch}
        onClose={onClose}
        title={open ? 'BARÈME EN PRÉPARATION' : 'PRONOSTICS FERMÉS'}
      />
    );
  }

  const selectedTag = selected === 'a' ? activeMatch.tag_a : selected === 'b' ? activeMatch.tag_b : null;
  const selectedTeam = selected === 'a' ? activeMatch.equipe_a : activeMatch.equipe_b;

  return (
    <PanelShell accents={accents} match={activeMatch} onClose={onClose}>
      <Text style={styles.question}>QUI GAGNE CE BO{activeMatch.format} ?</Text>

      <View style={styles.choices}>
        <InlineChoice
          accent={accents.a}
          choice="a"
          match={activeMatch}
          onPress={() => selectChoice('a')}
          projection={projectionA}
          selected={selected === 'a'}
        />
        <View style={styles.versus}>
          <Text style={styles.versusDash}>—</Text>
          <Text style={styles.versusText}>VS</Text>
        </View>
        <InlineChoice
          accent={accents.b}
          choice="b"
          match={activeMatch}
          onPress={() => selectChoice('b')}
          projection={projectionB}
          selected={selected === 'b'}
        />
      </View>

      {selectedProjection && selectedTag ? (
        <View style={styles.selectionBlock}>
          <View style={styles.selectionPill}>
            <View style={styles.selectionPillIcon}><Check color="#071118" size={12} strokeWidth={3.4} /></View>
            <Text style={styles.selectionPillText}>TON CALL · {selectedTag}</Text>
          </View>
          <View style={styles.riskCard}>
            <RiskMetric label="SI JUSTE" positive value={selectedProjection.gain} />
            <View style={styles.riskDivider} />
            <RiskMetric label="SI FAUX" value={selectedProjection.perte} />
          </View>
        </View>
      ) : (
        <Text style={styles.choiceHint}>TOUCHE UNE ÉQUIPE POUR VOIR TON BARÈME</Text>
      )}

      <Text style={styles.rule}>{data.callContext.regle_resolution.libelle} · Barème figé</Text>

      {submitError ? (
        <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.submitError}>
          <Text style={styles.submitErrorTitle}>CALL NON ENREGISTRÉ</Text>
          <Text style={styles.submitErrorCopy}>{submitError}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityHint="Ouvre la vérification avant le verrouillage définitif"
        accessibilityRole="button"
        accessibilityState={{ disabled: !selectedProjection || submitting }}
        disabled={!selectedProjection || submitting}
        onPress={reviewChoice}
        ref={reviewTriggerRef}
        style={({ pressed }) => [
          styles.reviewButton,
          !selectedProjection && styles.reviewButtonDisabled,
          pressed && styles.pressed,
        ]}
        testID="inline-prediction-review"
      >
        <LinearGradient
          colors={['#FFF9EF', '#F3EEE5']}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <Lock color="#E33725" size={21} strokeWidth={2.35} />
        <Text style={styles.reviewButtonText}>VÉRIFIER ET VERROUILLER</Text>
      </Pressable>

      <View accessibilityLabel={`Ferme dans ${countdown}`} accessibilityRole="timer" style={styles.countdown}>
        <Lock color={colors.textMuted} size={13} strokeWidth={1.8} />
        <Text style={styles.countdownLabel}>FERME DANS</Text>
        <Text style={styles.countdownValue}>{countdown}</Text>
      </View>

      {selected && selectedProjection ? (
        <PredictionConfirmationSheet
          error={submitError}
          gain={selectedProjection.gain}
          loss={selectedProjection.perte}
          onChangeChoice={() => {
            setConfirmationOpen(false);
            setSelected(null);
            setSubmitError(null);
          }}
          onClose={() => setConfirmationOpen(false)}
          onConfirm={() => void lockChoice()}
          returnFocusRef={reviewTriggerRef}
          submitting={submitting}
          teamName={selectedTeam}
          teamTag={selectedTag ?? ''}
          visible={confirmationOpen}
        />
      ) : null}
    </PanelShell>
  );
}

function PanelShell({
  accents: _accents,
  children,
  match,
  onClose,
}: {
  accents: { a: string; b: string };
  children: ReactNode;
  match: ArenaMatch;
  onClose: () => void;
}) {
  return (
    <View style={styles.panel} testID={`inline-prediction-panel-${match.id}`}>
      <LinearGradient
        colors={['#0A2637', '#061A29', '#03121F']}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.panelTextureA} />
      <View pointerEvents="none" style={styles.panelTextureB} />
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.whenRow}>
            <View style={styles.gameSlash} />
            <Text style={styles.when}>{formatDay(match.debut)} · {formatTime(match.debut)}</Text>
          </View>
          <Text numberOfLines={1} style={styles.event}>{gameLabel(match.jeu)} · {match.evenement}</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.formatPill}><Text style={styles.formatText}>BO{match.format}</Text></View>
          <Pressable accessibilityLabel="Réduire le pronostic" accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <Text style={styles.closeText}>−</Text>
          </Pressable>
        </View>
      </View>
      {children}
    </View>
  );
}

function InlineChoice({
  accent,
  choice,
  match,
  onPress,
  projection,
  selected,
}: {
  accent: string;
  choice: 'a' | 'b';
  match: ArenaMatch;
  onPress: () => void;
  projection: ProjectionChoice;
  selected: boolean;
}) {
  const name = choice === 'a' ? match.equipe_a : match.equipe_b;
  const tag = choice === 'a' ? match.tag_a : match.tag_b;
  const uri = choice === 'a' ? match.logo_a : match.logo_b;
  return (
    <Pressable
      accessibilityLabel={`Choisir ${name}, gain ${Math.abs(projection.gain)} Frags, perte ${Math.abs(projection.perte)} Frags`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, { borderColor: `${accent}72` }, selected && styles.choiceSelected, pressed && styles.choicePressed]}
    >
      <LinearGradient colors={[`${accent}30`, CALL_SURFACE, '#040D14']} end={{ x: .5, y: 1 }} pointerEvents="none" start={{ x: .5, y: 0 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.choiceGlow, { backgroundColor: accent }]} />
      {selected ? <View style={styles.choiceCheck}><Check color="#F8FAFA" size={16} strokeWidth={3.2} /></View> : null}
      <TeamLogo accent={accent} contentScale={1.08} frameless name={name} size={90} tag={tag} uri={uri} />
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.choiceTag}>{tag}</Text>
    </Pressable>
  );
}

function RiskMetric({ label, positive = false, value }: { label: string; positive?: boolean; value: number }) {
  const color = positive ? colors.success : colors.danger;
  return (
    <View style={styles.riskMetric}>
      <Text style={styles.riskArrow}>{positive ? '↗' : '↘'}</Text>
      <View>
        <Text style={styles.riskLabel}>{label}</Text>
        <View style={styles.riskValueRow}>
          <Text style={[styles.riskValue, { color }]}>{positive ? '+' : '−'}{Math.abs(value)}</Text>
          <CurrencyIcon color={color} kind="frags" size={12} />
          <Text style={[styles.riskUnit, { color }]}>FRAGS</Text>
        </View>
      </View>
    </View>
  );
}

function InlinePredictionLoading({ match, onClose }: { match: ArenaMatch; onClose: () => void }) {
  const accents = resolveMatchTeamAccents(
    { name: match.equipe_a, tag: match.tag_a },
    { name: match.equipe_b, tag: match.tag_b },
  );
  return (
    <PanelShell accents={accents} match={match} onClose={onClose}>
      <SkeletonGroup label="Chargement du pronostic" style={styles.loading}>
        <Skeleton height={27} radius="sm" width="64%" />
        <View style={styles.loadingChoices}>
          <Skeleton height={130} radius="lg" width="42%" />
          <Skeleton height={130} radius="lg" width="42%" />
        </View>
        <Skeleton height={74} radius="lg" width="100%" />
        <Skeleton height={54} radius="md" width="100%" />
      </SkeletonGroup>
    </PanelShell>
  );
}

function InlinePredictionState({
  action,
  copy,
  match,
  onAction,
  onClose,
  title,
}: {
  action?: string;
  copy: string;
  match: ArenaMatch;
  onAction?: () => void;
  onClose: () => void;
  title: string;
}) {
  const accents = resolveMatchTeamAccents(
    { name: match.equipe_a, tag: match.tag_a },
    { name: match.equipe_b, tag: match.tag_b },
  );
  return (
    <PanelShell accents={accents} match={match} onClose={onClose}>
      <View style={styles.inlineState}>
        <Text style={styles.inlineStateEyebrow}>{title}</Text>
        <Text style={styles.inlineStateCopy}>{copy}</Text>
        {action && onAction ? (
          <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.stateAction, pressed && styles.pressed]}>
            <Text style={styles.stateActionText}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
    </PanelShell>
  );
}

function useInlineCountdown(closesAt: string) {
  const [label, setLabel] = useState(() => formatPredictionCountdown(closesAt));
  useEffect(() => {
    const update = () => setLabel(formatPredictionCountdown(closesAt));
    update();
    const interval = setInterval(update, 1_000);
    return () => clearInterval(interval);
  }, [closesAt]);
  return label;
}

function formatDay(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (sameDay(date, today)) return "AUJOURD’HUI";
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (sameDay(date, tomorrow)) return 'DEMAIN';
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }).replace(/\./g, '').toUpperCase();
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  panel: { position: 'relative', overflow: 'hidden', padding: 17, gap: 18, borderRadius: 22, backgroundColor: '#041521', borderWidth: 1, borderColor: '#2B5C75' },
  panelTextureA: { position: 'absolute', top: 152, left: -66, width: 250, height: 34, backgroundColor: 'rgba(64,137,173,.08)', transform: [{ rotate: '-35deg' }] },
  panelTextureB: { position: 'absolute', top: 320, right: -80, width: 270, height: 42, backgroundColor: 'rgba(39,105,140,.08)', transform: [{ rotate: '-32deg' }] },
  header: { zIndex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  headerCopy: { flex: 1, minWidth: 0 },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  gameSlash: { width: 8, height: 21, backgroundColor: '#F05E5C', transform: [{ skewX: '-12deg' }] },
  when: { color: '#F4F6F7', fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, letterSpacing: .2 },
  event: { ...typography.label, marginTop: 5, color: '#9FAFBB', fontSize: 12, lineHeight: 16, letterSpacing: .25 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  formatPill: { minHeight: 33, paddingHorizontal: 13, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C1821', borderWidth: 1, borderColor: '#3A5363' },
  formatText: { color: '#A5B4C0', fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  closeButton: { width: 50, height: 50, marginTop: -8, marginRight: -7, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07121A', borderWidth: 1, borderColor: '#294454' },
  closeText: { marginTop: -3, color: '#8294A2', fontFamily: fonts.medium, fontSize: 27, lineHeight: 29 },
  question: { zIndex: 1, color: '#F6F6F3', fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -.55 },
  choices: { zIndex: 1, minHeight: 180, flexDirection: 'row', alignItems: 'center', gap: 9 },
  choice: { position: 'relative', flex: 1, minWidth: 0, minHeight: 174, overflow: 'hidden', padding: 10, borderRadius: 18, alignItems: 'center', justifyContent: 'flex-end', gap: 7, backgroundColor: CALL_SURFACE, borderWidth: 1.25 },
  choiceSelected: { borderWidth: 2, borderColor: CALL_ACCENT, shadowColor: CALL_ACCENT_STRONG, shadowOpacity: .34, shadowRadius: 13, shadowOffset: { width: 0, height: 0 } },
  choicePressed: { transform: [{ scale: .98 }] },
  choiceGlow: { position: 'absolute', top: 26, width: 82, height: 82, borderRadius: 41, opacity: .08, transform: [{ scaleX: 1.4 }] },
  choiceCheck: { position: 'absolute', top: 9, right: 9, zIndex: 3, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: CALL_ACCENT, borderWidth: 1, borderColor: '#FFD1C2' },
  choiceTag: { color: '#F5F5F2', fontFamily: fonts.display, fontSize: 27, lineHeight: 30 },
  versus: { width: 40, alignItems: 'center', justifyContent: 'center', gap: 2 },
  versusDash: { color: '#758896', fontSize: 21 },
  versusText: { color: '#9AA9B5', fontFamily: fonts.display, fontSize: 20, lineHeight: 23 },
  selectionBlock: { zIndex: 1, marginTop: 2 },
  selectionPill: { zIndex: 2, minHeight: 38, alignSelf: 'center', marginBottom: -19, paddingHorizontal: 17, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#07131B', borderWidth: 1.25, borderColor: CALL_ACCENT },
  selectionPillIcon: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: CALL_ACCENT },
  selectionPillText: { color: '#F0F1EF', fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: .7 },
  riskCard: { minHeight: 100, paddingTop: 18, borderRadius: 17, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(4,15,22,.94)', borderWidth: 1, borderColor: '#244658' },
  riskMetric: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  riskArrow: { color: '#91A3B0', fontSize: 27, fontWeight: '800' },
  riskLabel: { ...typography.metadata, color: '#8FA0AD', fontSize: 11, letterSpacing: .7 },
  riskValueRow: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 3 },
  riskValue: { fontFamily: fonts.bold, fontSize: 23, lineHeight: 27 },
  riskUnit: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15 },
  riskDivider: { width: 1, height: 56, backgroundColor: '#285064' },
  choiceHint: { ...typography.metadata, zIndex: 1, minHeight: 42, color: '#92A2AE', textAlign: 'center', textAlignVertical: 'center', letterSpacing: .55 },
  rule: { ...typography.caption, zIndex: 1, color: '#91A2AF', textAlign: 'center', fontSize: 12, lineHeight: 16 },
  submitError: { zIndex: 1, padding: 10, borderRadius: 12, backgroundColor: `${colors.danger}14`, borderWidth: 1, borderColor: `${colors.danger}66` },
  submitErrorTitle: { ...typography.control, color: colors.danger },
  submitErrorCopy: { ...typography.caption, marginTop: 3, color: '#F0A3AB' },
  reviewButton: { zIndex: 1, minHeight: 61, overflow: 'hidden', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11, backgroundColor: '#F8F2E9', borderWidth: 1, borderColor: CALL_ACCENT },
  reviewButtonDisabled: { opacity: .38 },
  reviewButtonText: { color: '#071119', fontFamily: fonts.display, fontSize: 18, lineHeight: 22, letterSpacing: .15 },
  countdown: { zIndex: 1, minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: '#24485B', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(4,15,22,.82)' },
  countdownLabel: { ...typography.metadata, color: '#8598A6', letterSpacing: .65 },
  countdownValue: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: CALL_ACCENT },
  lockedState: { zIndex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  lockedIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  lockedEyebrow: { ...typography.eyebrow, marginTop: 16, color: colors.volt, letterSpacing: .8 },
  lockedTitle: { ...typography.displaySmall, marginTop: 5, color: colors.text },
  lockedCopy: { ...typography.body, marginTop: 8, color: colors.textMuted, textAlign: 'center' },
  duelError: { ...typography.caption, marginTop: 10, color: colors.danger, textAlign: 'center' },
  lockedActions: { width: '100%', marginTop: 20, gap: 8 },
  lockedButton: { minHeight: 46, paddingHorizontal: 18, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  lockedButtonText: { ...typography.control, color: '#080B0F' },
  lockedSecondaryButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#485326' },
  lockedSecondaryButtonText: { ...typography.control, color: colors.volt },
  loading: { zIndex: 1, gap: 14 },
  loadingChoices: { flexDirection: 'row', justifyContent: 'space-between' },
  inlineState: { zIndex: 1, minHeight: 230, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  inlineStateEyebrow: { ...typography.cardTitle, color: colors.text, textAlign: 'center' },
  inlineStateCopy: { ...typography.body, marginTop: 8, color: colors.textMuted, textAlign: 'center' },
  stateAction: { minHeight: 44, marginTop: 18, paddingHorizontal: 18, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  stateActionText: { ...typography.control, color: '#080B0F' },
  pressed: { opacity: .78 },
});
