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
          <Text style={styles.lockedCopy}>{rivalId ? `Ton camp est prêt face à ${rivalPseudo || 'ton rival'}.` : `${lockedTeam} rejoint maintenant la section « Mes calls ».`}</Text>
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
        copy={open ? 'Le barème de ce match sera bientôt disponible.' : 'Les calls sont fermés pour cette affiche.'}
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
            <View style={styles.selectionPillIcon}><Check color="#080B0F" size={11} strokeWidth={3.4} /></View>
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
        <Lock color="#080B0F" size={18} strokeWidth={2.2} />
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
  accents,
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
        colors={[`${accents.a}22`, 'rgba(3,8,13,.97)', `${accents.b}1E`]}
        end={{ x: 1, y: .58 }}
        pointerEvents="none"
        start={{ x: 0, y: .42 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.when}>{formatDay(match.debut)} · {formatTime(match.debut)}</Text>
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
      style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.choicePressed]}
    >
      <LinearGradient colors={[`${accent}2E`, '#07121C']} pointerEvents="none" style={StyleSheet.absoluteFill} />
      {selected ? <View style={styles.choiceCheck}><Check color="#080B0F" size={14} strokeWidth={3.2} /></View> : null}
      <TeamLogo accent={selected ? colors.volt : accent} contentScale={1.08} frameless name={name} size={78} tag={tag} uri={uri} />
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
  panel: { position: 'relative', overflow: 'hidden', padding: 16, gap: 14, borderRadius: 22, backgroundColor: '#03090E', borderWidth: 1, borderColor: '#2C5269' },
  header: { zIndex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  headerCopy: { flex: 1, minWidth: 0 },
  when: { ...typography.action, color: colors.volt, letterSpacing: .25 },
  event: { ...typography.label, marginTop: 4, color: colors.textMuted, letterSpacing: .2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  formatPill: { minHeight: 27, paddingHorizontal: 9, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#14202A', borderWidth: 1, borderColor: '#344653' },
  formatText: { ...typography.label, color: colors.textMuted },
  closeButton: { width: 44, height: 44, marginTop: -7, marginRight: -7, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A1218', borderWidth: 1, borderColor: '#2B3A45' },
  closeText: { marginTop: -2, color: colors.textMuted, fontSize: 23, lineHeight: 24 },
  question: { ...typography.displaySmall, zIndex: 1, color: colors.text, fontSize: 27, lineHeight: 30, letterSpacing: -.35 },
  choices: { zIndex: 1, minHeight: 144, flexDirection: 'row', alignItems: 'center', gap: 8 },
  choice: { position: 'relative', flex: 1, minWidth: 0, minHeight: 136, overflow: 'hidden', padding: 9, borderRadius: 18, alignItems: 'center', justifyContent: 'flex-end', gap: 5, backgroundColor: '#07121C', borderWidth: 1, borderColor: '#53606B' },
  choiceSelected: { borderWidth: 2, borderColor: colors.volt, boxShadow: '0 0 14px rgba(220,255,36,.38)' },
  choicePressed: { transform: [{ scale: .98 }] },
  choiceCheck: { position: 'absolute', top: 7, right: 7, zIndex: 3, width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  choiceTag: { color: colors.text, fontFamily: fonts.display, fontSize: 24, lineHeight: 27 },
  versus: { width: 37, alignItems: 'center', justifyContent: 'center' },
  versusDash: { color: colors.textMuted, fontSize: 19 },
  versusText: { color: colors.textMuted, fontFamily: fonts.display, fontSize: 20, lineHeight: 23 },
  selectionBlock: { zIndex: 1, marginTop: 4 },
  selectionPill: { zIndex: 2, minHeight: 30, alignSelf: 'center', marginBottom: -15, paddingHorizontal: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#15200A', borderWidth: 1, borderColor: '#52621E' },
  selectionPillIcon: { width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  selectionPillText: { ...typography.eyebrow, color: colors.volt, letterSpacing: .55 },
  riskCard: { minHeight: 84, paddingTop: 13, borderRadius: 17, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(4,10,15,.88)', borderWidth: 1, borderColor: '#293942' },
  riskMetric: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  riskArrow: { color: colors.volt, fontSize: 24, fontWeight: '800' },
  riskLabel: { ...typography.metadata, color: colors.textMuted, letterSpacing: .55 },
  riskValueRow: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 3 },
  riskValue: { ...typography.bodyStrong, fontSize: 17 },
  riskUnit: { ...typography.label },
  riskDivider: { width: 1, height: 45, backgroundColor: '#293942' },
  choiceHint: { ...typography.metadata, zIndex: 1, minHeight: 38, color: colors.textMuted, textAlign: 'center', textAlignVertical: 'center', letterSpacing: .5 },
  rule: { ...typography.caption, zIndex: 1, color: colors.textMuted, textAlign: 'center' },
  submitError: { zIndex: 1, padding: 10, borderRadius: 12, backgroundColor: `${colors.danger}14`, borderWidth: 1, borderColor: `${colors.danger}66` },
  submitErrorTitle: { ...typography.control, color: colors.danger },
  submitErrorCopy: { ...typography.caption, marginTop: 3, color: '#F0A3AB' },
  reviewButton: { zIndex: 1, minHeight: 55, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: colors.volt, borderWidth: 1, borderColor: '#F1FF46' },
  reviewButtonDisabled: { opacity: .38 },
  reviewButtonText: { ...typography.action, color: '#080B0F', fontSize: 15, letterSpacing: .2 },
  countdown: { zIndex: 1, minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  countdownLabel: { ...typography.metadata, color: colors.textMuted, letterSpacing: .55 },
  countdownValue: { ...typography.control, color: colors.volt },
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
