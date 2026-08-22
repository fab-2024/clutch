import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { createDuel } from '@/src/features/social/duels/api';
import { useAuth } from '@/src/providers/AuthProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors } from '@/src/theme';

import { submitRankedPrediction } from '../api';
import { useMatchCenterData } from '../hooks/useMatchCenterData';
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
  RiskCell,
  formatMatchDate,
  formatTime,
} from './MatchCenterSections';
import { styles } from './MatchCenterScreen.styles';

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
  const [webConfirmationOpen, setWebConfirmationOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duelError, setDuelError] = useState<string | null>(null);
  const { data, error, load, loading, refreshing } = useMatchCenterData({
    matchId,
    onResolved: refreshEconomy,
    previewData,
    userId: session?.user.id,
  });

  useEffect(() => {
    setSelected(null);
    setSubmitError(null);
    setWebConfirmationOpen(false);
  }, [matchId, previewData]);

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
      const created = await createDuel(match.id, duelRivalId);
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

            <CallContract data={data!} />

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
