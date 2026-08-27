import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { GriffLockup } from '@/src/components/brand/GriffLogo';
import { Screen } from '@/src/components/layout/Screen';
import { Button } from '@/src/components/ui/Button';
import { StateView } from '@/src/components/ui/StateView';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { createDuel } from '@/src/features/social/duels/api';
import { errorFeedback, impactFeedback, selectionFeedback, successFeedback } from '@/src/lib/feedback';
import { useAuth } from '@/src/providers/AuthProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors } from '@/src/theme';

import { submitRankedPrediction } from '../api';
import { useMatchCenterData } from '../hooks/useMatchCenterData';
import { returnFromMatchCenter } from '../matchCenterNavigation';
import type { MatchCenterData } from '../types';
import { gameLabel, matchPhase, predictionIsOpen } from '../utils';
import {
  CallContract,
  HeroTeam,
  LoadingCard,
  LockedPrediction,
  PredictionZone,
  ProbabilityBar,
  ProjectionMeta,
  RelatedMatches,
  formatMatchDate,
  formatTime,
} from './MatchCenterSections';
import { styles } from './MatchCenterScreen.styles';
import { PredictionConfirmationSheet } from './PredictionConfirmationSheet';

type MatchCenterScreenProps = {
  previewData?: MatchCenterData;
};

export default function MatchCenterScreen({ previewData }: MatchCenterScreenProps) {
  const { session } = useAuth();
  const { refresh: refreshEconomy } = useEconomy();
  const params = useLocalSearchParams<{
    id?: string | string[];
    duel?: string | string[];
    duelRivalId?: string | string[];
    duelRivalPseudo?: string | string[];
  }>();
  const routeMatchId = Array.isArray(params.id) ? params.id[0] : params.id;
  const matchId = previewData?.match.id ?? routeMatchId;
  const duelToken = Array.isArray(params.duel) ? params.duel[0] : params.duel;
  const duelRivalId = Array.isArray(params.duelRivalId) ? params.duelRivalId[0] : params.duelRivalId;
  const duelRivalPseudo = Array.isArray(params.duelRivalPseudo) ? params.duelRivalPseudo[0] : params.duelRivalPseudo;
  const [selected, setSelected] = useState<'a' | 'b' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [duelBusy, setDuelBusy] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [restoreConfirmationFocus, setRestoreConfirmationFocus] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duelError, setDuelError] = useState<string | null>(null);
  const callStartedRef = useRef<string | null>(null);
  const confirmationTriggerRef = useRef<View>(null);
  const clearSelectionOnCloseRef = useRef(false);
  const { data, error, load, loading, refreshing } = useMatchCenterData({
    matchId,
    onResolved: refreshEconomy,
    previewData,
    userId: session?.user.id,
  });

  useEffect(() => {
    callStartedRef.current = null;
    clearSelectionOnCloseRef.current = false;
    setSelected(null);
    setSubmitError(null);
    setConfirmationOpen(false);
    setRestoreConfirmationFocus(true);
  }, [matchId, previewData]);

  const match = data?.match ?? null;
  const projection = data?.projection ?? null;
  const prediction = data?.prediction ?? null;
  const phase = match ? matchPhase(match) : null;
  const open = Boolean(match && predictionIsOpen(match));
  const predictionPickerOpen = Boolean(open && !prediction && projection?.choix?.length);

  const choiceA = useMemo(
    () => projection?.choix?.find((choice) => choice.cle === 'a') ?? null,
    [projection],
  );
  const choiceB = useMemo(
    () => projection?.choix?.find((choice) => choice.cle === 'b') ?? null,
    [projection],
  );
  const selectedChoice = selected === 'a' ? choiceA : selected === 'b' ? choiceB : null;

  useEffect(() => {
    if (!session?.user.id || previewData || !match?.id) return;
    void trackAnalyticsEvent({
      type: 'match_consulte',
      idempotencyKey: `match:${match.id}:view`,
    }).catch(() => undefined);
  }, [match?.id, previewData, session?.user.id]);

  function selectPrediction(choice: 'a' | 'b') {
    selectionFeedback();
    if (!previewData && match?.id && callStartedRef.current !== match.id) {
      callStartedRef.current = match.id;
      void trackAnalyticsEvent({
        type: 'call_commence',
        idempotencyKey: `match:${match.id}:call-started`,
      }).catch(() => {
        if (callStartedRef.current === match.id) callStartedRef.current = null;
      });
    }
    setSelected(choice);
    setSubmitError(null);
    setConfirmationOpen(false);
  }

  function reviewPrediction() {
    if (!match || !selected || !selectedChoice || submitting) return;
    clearSelectionOnCloseRef.current = false;
    setRestoreConfirmationFocus(true);
    setConfirmationOpen(true);
  }

  async function lockPrediction(targetMatchId: string, choice: 'a' | 'b') {
    impactFeedback();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitRankedPrediction(targetMatchId, choice);
      successFeedback();
      void trackAnalyticsEvent({
        type: 'call_verrouille',
        idempotencyKey: `match:${targetMatchId}:call-locked`,
      }).catch(() => undefined);
      clearSelectionOnCloseRef.current = true;
      setRestoreConfirmationFocus(false);
      setConfirmationOpen(false);
      await load();
      if (duelToken) {
        router.replace({ pathname: '/duel/[token]', params: { token: duelToken } });
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Réessaie dans un instant.';
      errorFeedback();
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const closeConfirmation = useCallback(() => {
    clearSelectionOnCloseRef.current = false;
    setRestoreConfirmationFocus(true);
    setConfirmationOpen(false);
  }, []);

  const changeChoiceFromConfirmation = useCallback(() => {
    clearSelectionOnCloseRef.current = true;
    setRestoreConfirmationFocus(false);
    setConfirmationOpen(false);
  }, []);

  const finishConfirmationClose = useCallback(() => {
    if (clearSelectionOnCloseRef.current) {
      setSelected(null);
      setSubmitError(null);
    }
    clearSelectionOnCloseRef.current = false;
  }, []);

  async function launchDuel() {
    if (!match || duelBusy) return;
    setDuelBusy(true); setDuelError(null);
    try {
      const created = await createDuel(match.id, duelRivalId);
      router.push({ pathname: '/duel/[token]', params: { token: created.token } });
    } catch (caught) {
      setDuelError(caught instanceof Error ? caught.message : 'Impossible de créer ce duel.');
    } finally { setDuelBusy(false); }
  }

  function returnToArena() {
    returnFromMatchCenter(duelToken);
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
          <Pressable accessibilityLabel={duelToken ? 'Retour au duel' : 'Revenir à l’écran précédent'} accessibilityRole="button" onPress={returnToArena} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={[styles.backArrow, predictionPickerOpen && styles.pickerBackArrow]}>←</Text>
            <Text style={[styles.backText, predictionPickerOpen && styles.pickerBackText]}>
              {predictionPickerOpen && match ? `${match.tag_a} VS ${match.tag_b}` : duelToken ? 'DUEL' : 'RETOUR'}
            </Text>
          </Pressable>
          {predictionPickerOpen ? null : <GriffLockup width={92} />}
        </View>

        {loading ? <LoadingCard /> : null}

        {error ? (
          <StateView
            action={{ label: 'RÉESSAYER', onPress: () => void load() }}
            compact
            description={error}
            title="Match Center indisponible"
            variant="error"
          />
        ) : null}

        {match ? (
          <>
            {predictionPickerOpen ? (
              <PredictionZone
                data={data!}
                open={open}
                selected={selected}
                onSelect={selectPrediction}
              />
            ) : (
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

                <CallContract data={data!} />

                {prediction ? (
                  <LockedPrediction data={data!} />
                ) : (
                  <PredictionZone data={data!} open={open} selected={selected} onSelect={selectPrediction} />
                )}
              </>
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
                  <Text style={styles.duelActionEyebrow}>{duelRivalId ? 'DUEL CIBLÉ · MARCHÉ CLASSÉ' : 'FACE-À-FACE · MARCHÉ CLASSÉ'}</Text>
                  <Text style={styles.duelActionTitle}>{duelRivalId ? `Défie ${duelRivalPseudo || 'ton rival'} sur ce call.` : 'Quelqu’un assume le camp opposé ?'}</Text>
                  <Text style={styles.duelActionText}>{duelRivalId ? 'L’invitation apparaîtra dans son Cercle et déclenchera une alerte s’il l’a autorisée.' : 'Crée une invitation liée à ce vrai pronostic et partage-la à ton rival.'}</Text>
                </View>
                {duelError ? <Text style={styles.duelActionError}>{duelError}</Text> : null}
                <Pressable accessibilityRole="button" disabled={duelBusy} onPress={() => void launchDuel()} style={({ pressed }) => [styles.duelActionButton, (pressed || duelBusy) && styles.confirmPressed]}><Text style={styles.duelActionButtonText}>{duelBusy ? 'CRÉATION…' : duelRivalId ? `DÉFIER ${(duelRivalPseudo || 'CE RIVAL').toUpperCase()} →` : 'DÉFIER UN RIVAL →'}</Text></Pressable>
              </View>
            ) : null}

            {selectedChoice && !prediction ? (
              <View style={styles.ticket}>
                {submitError ? <View style={styles.submitError}><Text style={styles.submitErrorTitle}>PRONOSTIC NON ENREGISTRÉ</Text><Text style={styles.submitErrorCopy}>{submitError}</Text></View> : null}
                <Button
                  accessibilityHint="Ouvre le récapitulatif avant le verrouillage définitif"
                  fullWidth
                  label="VERROUILLER MON CALL"
                  onPress={reviewPrediction}
                  ref={confirmationTriggerRef}
                  testID="prediction-review-trigger"
                />
                <Button
                  fullWidth
                  label="CHANGER MON CHOIX"
                  onPress={() => {
                    setSelected(null);
                    setSubmitError(null);
                  }}
                  size="compact"
                  variant="ghost"
                />
              </View>
            ) : null}

            {predictionPickerOpen ? <CallContract data={data!} /> : null}

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

      {match && selected && selectedChoice ? (
        <PredictionConfirmationSheet
          error={submitError}
          gain={selectedChoice.gain}
          loss={selectedChoice.perte}
          onChangeChoice={changeChoiceFromConfirmation}
          onClose={closeConfirmation}
          onClosed={finishConfirmationClose}
          onConfirm={() => void lockPrediction(match.id, selected)}
          returnFocusRef={restoreConfirmationFocus ? confirmationTriggerRef : undefined}
          submitting={submitting}
          teamName={selected === 'a' ? match.equipe_a : match.equipe_b}
          teamTag={selected === 'a' ? match.tag_a : match.tag_b}
          visible={confirmationOpen}
        />
      ) : null}
    </Screen>
  );
}
