import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { GriffLockup } from '@/src/components/brand/GriffLogo';
import { Screen } from '@/src/components/layout/Screen';
import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { SupporterIdentity } from '@/src/features/shop/components/CosmeticRenderer';
import { errorFeedback, successFeedback } from '@/src/lib/feedback';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';
import { teamHue } from '@/src/utils/teams';

import {
  loadMatchResultReveal,
  loadNextUnseenMatchResult,
  markMatchResultRevealed,
} from '../api';
import { gradeAccent, gradeTransition, type GradeTransition } from '../grades';
import { openMatchResult, returnFromMatchResult } from '../matchCenterNavigation';
import {
  matchJourneySource,
  matchJourneySourceLabel,
  readMatchJourneySnapshot,
  type MatchJourneySearchParams,
  type MatchJourneySnapshot,
  type MatchJourneySource,
} from '../matchJourney';
import type { MatchResultReveal } from '../types';
import { gameLabel } from '../utils';

type ResultRevealScreenProps = {
  previewData?: MatchResultReveal;
  previewTransition?: MatchJourneySnapshot;
  previewTransitionSource?: MatchJourneySource;
};

type ExitTarget = 'calls' | 'history';

export default function ResultRevealScreen({ previewData, previewTransition, previewTransitionSource }: ResultRevealScreenProps) {
  const { profile, session } = useAuth();
  const { equipped } = useCosmetics();
  const { isShortLandscape } = useResponsiveLayout();
  const params = useLocalSearchParams<MatchJourneySearchParams & { id?: string | string[] }>();
  const routeMatchId = Array.isArray(params.id) ? params.id[0] : params.id;
  const matchId = previewData?.match_id ?? routeMatchId;
  const journeySource = matchJourneySource(params.journeyFrom);
  const journeySnapshot = readMatchJourneySnapshot(matchId, params);
  const { refresh: refreshEconomy } = useEconomy();
  const reduceMotion = useReducedMotion();
  const [result, setResult] = useState<MatchResultReveal | null>(previewData ?? null);
  const [loading, setLoading] = useState(!previewData);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const feedbackIdRef = useRef<string | null>(null);
  const revealProgress = useSharedValue(reduceMotion ? 1 : 0);
  const pseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'Supporter';

  const load = useCallback(async () => {
    if (previewData) {
      setResult(previewData);
      setLoading(false);
      return;
    }
    if (!matchId) {
      setError('Ce verdict ne possède pas de match associé.');
      setLoading(false);
      return;
    }

    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const nextResult = await loadMatchResultReveal(matchId);
      if (requestId !== requestRef.current) return;
      setResult(nextResult);
    } catch (caught) {
      if (requestId !== requestRef.current) return;
      setError(messageFrom(caught, 'Impossible de révéler ce résultat.'));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [matchId, previewData]);

  useEffect(() => {
    setResult(previewData ?? null);
    void load();
    return () => { requestRef.current += 1; };
  }, [load, previewData]);

  useEffect(() => {
    if (!result || previewTransition) return;
    revealProgress.value = reduceMotion ? 1 : 0;
    if (!reduceMotion) {
      revealProgress.value = withDelay(
        260,
        withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
      );
    }
    if (feedbackIdRef.current !== result.id) {
      feedbackIdRef.current = result.id;
      if (result.statut === 'gagne') successFeedback();
      else errorFeedback();
    }
    return () => cancelAnimation(revealProgress);
  }, [previewTransition, reduceMotion, result, revealProgress]);

  useEffect(() => {
    if (!session?.user.id || previewData || !result) return;
    void trackAnalyticsEvent({
      type: 'resultat_consulte',
      idempotencyKey: `result:${result.id}:view`,
    }).catch(() => undefined);
  }, [previewData, result, session?.user.id]);

  const transition = useMemo(
    () => result ? gradeTransition(result.grade_avant, result.grade_apres) : null,
    [result],
  );

  const auraStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + revealProgress.value * 0.22,
    transform: [{ scale: 0.76 + revealProgress.value * 0.34 }],
  }));
  const ratingFillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(4, revealProgress.value * 100)}%`,
  }));

  if (previewTransition) {
    return <ResultTransitionState snapshot={previewTransition} source={previewTransitionSource ?? 'match'} />;
  }

  async function leaveReveal(target: ExitTarget) {
    if (!result || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!previewData && !result.revele_le) {
        await markMatchResultRevealed(result.id);
        await refreshEconomy();
      }

      if (target === 'history') {
        router.replace('/(tabs)/profile');
        return;
      }

      if (!previewData && !result.revele_le && result.restants > 1) {
        const next = await loadNextUnseenMatchResult();
        if (next && next.id !== result.id) {
          openMatchResult({ id: next.match_id }, { replace: true, source: 'system' });
          return;
        }
      }

      router.replace({ pathname: '/(tabs)/matches', params: { view: 'calls' } });
    } catch (caught) {
      setError(messageFrom(caught, 'Le résultat reste affiché. Réessaie pour continuer.'));
      setBusy(false);
    }
  }

  if (loading) return journeySnapshot
    ? <ResultTransitionState snapshot={journeySnapshot} source={journeySource} />
    : <RevealState title="VERDICT EN APPROCHE…" copy="GRIFF vérifie le score et ton rating." />;
  if (!result) return <RevealState title="AUCUN VERDICT À RÉVÉLER." copy={error || 'Ce résultat n’est pas disponible dans ton historique.'} action="RETOUR AUX MATCHS" onPress={() => router.replace('/(tabs)/matches')} />;

  const won = result.statut === 'gagne';
  const tone = won ? colors.success : colors.danger;
  const teamAColor = teamColor(result.tag_a, result.equipe_a);
  const teamBColor = teamColor(result.tag_b, result.equipe_b);
  const choiceTag = result.choix === 'a' ? result.tag_a : result.tag_b;
  const choiceName = result.choix === 'a' ? result.equipe_a : result.equipe_b;
  const remaining = Math.max(0, result.restants - 1);
  const replay = Boolean(result.revele_le);
  const returnLabel = matchJourneySourceLabel(journeySource);
  const entrance = (delay: number) => reduceMotion ? undefined : FadeInDown.delay(delay).duration(460);

  return (
    <Screen>
      <LinearGradient colors={['#080D11', '#06090D', '#080A0D']} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.pageAuraClip}>
        <Animated.View style={[styles.pageAura, auraStyle, { backgroundColor: tone }]} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, isShortLandscape && styles.contentLandscape]} showsVerticalScrollIndicator={false}>
        <View style={[styles.topBar, isShortLandscape && styles.topBarLandscape]}>
          {replay && !previewData ? (
            <Pressable accessibilityLabel={`Revenir à ${returnLabel}`} accessibilityRole="button" onPress={() => returnFromMatchResult({
              id: result.match_id,
              equipe_a: result.equipe_a,
              equipe_b: result.equipe_b,
              evenement: result.evenement,
              format: result.format,
              jeu: result.jeu,
              score_a: result.score_a,
              score_b: result.score_b,
              tag_a: result.tag_a,
              tag_b: result.tag_b,
            }, journeySource)} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <Text style={styles.backText}>← {returnLabel}</Text>
            </Pressable>
          ) : (
            <View style={styles.brand}><GriffLockup width={100} /></View>
          )}
          <View style={styles.officialPill}><View style={[styles.officialDot, { backgroundColor: tone }]} /><Text style={styles.officialText}>{replay ? 'HISTORIQUE' : 'RÉSULTAT OFFICIEL'}</Text></View>
        </View>

        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(420)} style={[styles.hero, isShortLandscape && styles.heroLandscape]}>
          <LinearGradient colors={[`${tone}24`, 'rgba(8,12,16,.96)', '#080C10']} style={StyleSheet.absoluteFill} />
          <View style={[styles.heroGlow, { backgroundColor: tone }]} />
          <Text style={[styles.resultKicker, { color: tone }]}>{won ? 'CALL VALIDÉ' : 'CALL MANQUÉ'}</Text>
          <Text accessibilityRole="header" style={[styles.resultTitle, isShortLandscape && styles.resultTitleLandscape]}>{won ? 'BIEN LU.' : 'PAS CETTE FOIS.'}</Text>
          <Text numberOfLines={1} style={[styles.eventLine, isShortLandscape && styles.eventLineLandscape]}>{gameLabel(result.jeu)} · {result.evenement} · BO{result.format}</Text>

          {!isShortLandscape ? <View style={styles.revealIdentity}><SupporterIdentity compact cosmetics={equipped} meta="SIGNATURE DU VERDICT" pseudo={pseudo} /></View> : null}

          <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(120).duration(360)} style={[styles.scoreboard, isShortLandscape && styles.scoreboardLandscape]}>
            <RevealTeam accent={teamAColor} chosen={result.choix === 'a'} compact={isShortLandscape} name={result.equipe_a} tag={result.tag_a} winner={result.score_a > result.score_b} />
            <View style={styles.scoreCenter}>
              <Text style={[styles.score, isShortLandscape && styles.scoreLandscape]}>{result.score_a}<Text style={[styles.scoreDash, isShortLandscape && styles.scoreDashLandscape]}> — </Text>{result.score_b}</Text>
              <View style={styles.finalPill}><Text style={styles.finalText}>FINAL</Text></View>
            </View>
            <RevealTeam accent={teamBColor} chosen={result.choix === 'b'} compact={isShortLandscape} name={result.equipe_b} tag={result.tag_b} winner={result.score_b > result.score_a} />
          </Animated.View>

          <View style={[styles.choiceReceipt, isShortLandscape && styles.choiceReceiptLandscape]}>
            <View style={[styles.choiceMark, { borderColor: tone, backgroundColor: `${tone}16` }]}><Text style={[styles.choiceGlyph, { color: tone }]}>{won ? '✓' : '×'}</Text></View>
            <View style={styles.choiceCopy}><Text style={styles.choiceLabel}>TON CHOIX</Text><Text numberOfLines={1} style={styles.choiceName}>{choiceTag} · {choiceName}</Text></View>
            <Text style={[styles.verdictWord, { color: tone }]}>{won ? 'JUSTE' : 'FAUX'}</Text>
          </View>
        </Animated.View>

        {isShortLandscape ? (
          <Animated.View entering={entrance(180)} style={styles.revealIdentityOutside}>
            <SupporterIdentity compact cosmetics={equipped} meta="SIGNATURE DU VERDICT" pseudo={pseudo} />
          </Animated.View>
        ) : null}

        <Animated.View entering={entrance(220)} style={styles.ratingCard}>
          <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>RATING SAISONNIER</Text><Text style={styles.sectionTitle}>Tes Frags ont parlé.</Text></View><View style={[styles.deltaPill, { backgroundColor: `${tone}18`, borderColor: `${tone}66` }]}><CurrencyIcon color={tone} kind="frags" size={14} /><Text style={[styles.deltaText, { color: tone }]}>{signed(result.delta_frags)}</Text></View></View>
          <View style={styles.ratingFlow}>
            <Metric label="AVANT" value={formatNumber(result.frags_avant)} />
            <View style={styles.ratingArrow}><Text style={[styles.ratingArrowText, { color: tone }]}>→</Text></View>
            <Metric accent={tone} label="APRÈS" value={formatNumber(result.frags_apres)} />
          </View>
          <View style={styles.ratingTrack}><Animated.View style={[styles.ratingFill, ratingFillStyle, { backgroundColor: tone }]} /></View>
          <Text style={styles.ratingRule}>Calcul serveur figé · probabilité du call {Math.round(result.proba_figee * 100)} %</Text>
        </Animated.View>

        {transition ? (
          <Animated.View entering={entrance(310)} style={styles.rankingCard}>
            <GradeHeadline transition={transition} />
            <View style={styles.rankFlow}>
              <RankMetric grade={transition.before?.libelle ?? 'Bronze'} label="AVANT" rank={result.rang_avant} />
              <View style={styles.rankDivider} />
              <RankMetric accent={gradeAccent(transition.after)} grade={transition.after?.libelle ?? 'Bronze'} label="APRÈS" rank={result.rang_apres} />
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={entrance(390)} style={styles.proofCard}>
          <View style={styles.proofIcon}><Text style={styles.proofGlyph}>✓</Text></View>
          <View style={styles.proofCopy}>
            <Text style={styles.proofLabel}>{result.resultat_corrige ? `RÉSULTAT CORRIGÉ · RÉVISION ${result.revision_resultat}` : 'SOURCE DU VERDICT'}</Text>
            <Text style={styles.proofTitle}>{result.source_resultat_label}</Text>
            <Text style={styles.proofMeta}>{formatResolutionDate(result.regle_le)} · {result.regle_resolution.libelle.toLowerCase()}</Text>
            <Text numberOfLines={1} style={styles.proofReference}>RÉF. {result.identifiant_resultat_externe}</Text>
          </View>
        </Animated.View>

        {error ? <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View> : null}

        <Animated.View entering={entrance(470)} style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void leaveReveal('calls')} style={({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.primaryPressed]}>
            <Text style={styles.primaryText}>{busy ? 'VALIDATION…' : !replay && remaining > 0 ? `RÉSULTAT SUIVANT · ${remaining}` : 'FAIRE MON PROCHAIN CALL'}</Text>
            {!busy ? <Text style={styles.primaryArrow}>→</Text> : null}
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void leaveReveal('history')} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>VOIR MON HISTORIQUE</Text>
          </Pressable>
          {!replay ? <Text style={styles.seenHint}>Le verdict sera archivé après avoir continué.</Text> : null}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

function ResultTransitionState({
  snapshot,
  source,
}: {
  snapshot: MatchJourneySnapshot;
  source: MatchJourneySource;
}) {
  const { isShortLandscape } = useResponsiveLayout();
  const teamAColor = teamColor(snapshot.tagA, snapshot.teamA);
  const teamBColor = teamColor(snapshot.tagB, snapshot.teamB);
  const scoreReady = snapshot.scoreA !== null && snapshot.scoreB !== null;
  const context = [
    snapshot.game ? gameLabel(snapshot.game) : null,
    snapshot.event,
    snapshot.format ? `BO${snapshot.format}` : null,
  ].filter(Boolean).join(' · ');
  const origin = source === 'system' ? 'RÉSULTAT OFFICIEL' : `DEPUIS ${matchJourneySourceLabel(source)}`;

  return (
    <Screen>
      <LinearGradient colors={['#080D11', '#06090D', '#080A0D']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={[styles.content, isShortLandscape && styles.contentLandscape]} showsVerticalScrollIndicator={false}>
        <View style={[styles.topBar, isShortLandscape && styles.topBarLandscape]}>
          <View style={styles.brand}><GriffLockup width={100} /></View>
          <View style={styles.officialPill}><View style={[styles.officialDot, { backgroundColor: colors.volt }]} /><Text style={styles.officialText}>VÉRIFICATION</Text></View>
        </View>

        <View style={[styles.hero, styles.transitionHero, isShortLandscape && styles.heroLandscape, isShortLandscape && styles.transitionHeroLandscape]}>
          <LinearGradient colors={['rgba(232,255,61,.08)', 'rgba(8,12,16,.96)', '#080C10']} style={StyleSheet.absoluteFill} />
          <Text style={styles.transitionKicker}>{origin}</Text>
          <Text accessibilityRole="header" style={[styles.transitionTitle, isShortLandscape && styles.transitionTitleLandscape]}>VERDICT EN APPROCHE.</Text>
          {context ? <Text numberOfLines={1} style={[styles.eventLine, isShortLandscape && styles.eventLineLandscape]}>{context}</Text> : null}

          <View style={[styles.scoreboard, isShortLandscape && styles.scoreboardLandscape]}>
            <RevealTeam accent={teamAColor} chosen={false} compact={isShortLandscape} name={snapshot.teamA} tag={snapshot.tagA} winner={false} />
            <View style={styles.scoreCenter}>
              <Text style={[styles.score, isShortLandscape && styles.scoreLandscape]}>{scoreReady ? `${snapshot.scoreA} — ${snapshot.scoreB}` : 'VS'}</Text>
              <View style={styles.finalPill}><Text style={styles.finalText}>{scoreReady ? 'FINAL' : 'SYNCHRO'}</Text></View>
            </View>
            <RevealTeam accent={teamBColor} chosen={false} compact={isShortLandscape} name={snapshot.teamB} tag={snapshot.tagB} winner={false} />
          </View>
        </View>

        <SkeletonGroup label={`Chargement du verdict, ${snapshot.teamA} contre ${snapshot.teamB}`} style={styles.ratingCard} testID="result-transition-loading">
          <View style={styles.sectionHeader}>
            <View style={styles.transitionSkeletonCopy}><Skeleton height={9} radius="pill" tone="subtle" width={118} /><Skeleton height={24} radius="sm" width={186} /></View>
            <Skeleton height={39} radius="md" width={70} />
          </View>
          <View style={styles.ratingFlow}>
            <Skeleton height={62} radius="md" width="42%" />
            <View style={styles.ratingArrow}><Text style={styles.ratingArrowText}>→</Text></View>
            <Skeleton height={62} radius="md" width="42%" />
          </View>
          <Skeleton height={4} radius="pill" tone="highlight" width="100%" />
          <Skeleton height={10} radius="pill" tone="subtle" width="72%" />
        </SkeletonGroup>
      </ScrollView>
    </Screen>
  );
}

function RevealTeam({ accent, chosen, compact, name, tag, winner }: { accent: string; chosen: boolean; compact: boolean; name: string; tag: string; winner: boolean }) {
  return (
    <View accessibilityLabel={`${name}${winner ? ', vainqueur' : ''}${chosen ? ', ton choix' : ''}`} style={[styles.team, compact && styles.teamLandscape]}>
      <View style={[styles.teamLogoWrap, compact && styles.teamLogoWrapLandscape, chosen && { borderColor: accent }]}><TeamLogo accent={accent} name={name} size={compact ? 58 : 62} tag={tag} /></View>
      <Text style={[styles.teamTag, winner && { color: accent }]}>{tag}</Text>
      <Text numberOfLines={1} style={styles.teamName}>{name}</Text>
      {chosen ? <View style={[styles.yourChoice, { backgroundColor: accent }]}><Text style={styles.yourChoiceText}>TON CALL</Text></View> : null}
    </View>
  );
}

function Metric({ accent, label, value }: { accent?: string; label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, accent ? { color: accent } : null]}>{value}</Text><View style={styles.metricUnit}><CurrencyIcon color={accent ?? colors.textMuted} kind="frags" size={12} /><Text style={styles.metricUnitText}>FRAGS</Text></View></View>;
}

function GradeHeadline({ transition }: { transition: GradeTransition }) {
  const content = transition.kind === 'promotion'
    ? { eyebrow: 'PROMOTION', title: `${transition.before?.libelle} → ${transition.after?.libelle}`, copy: 'Ton call te fait franchir un nouveau seuil.' }
    : transition.kind === 'demotion'
      ? { eyebrow: 'RÉTROGRADATION', title: `${transition.before?.libelle} → ${transition.after?.libelle}`, copy: 'Le grade suit ton rating. Le prochain call peut relancer la remontée.' }
      : { eyebrow: 'GRADE MAINTENU', title: transition.after?.libelle ?? 'Bronze', copy: 'Ton rating évolue, ton grade reste dans le même palier.' };
  const accent = transition.kind === 'demotion' ? colors.danger : gradeAccent(transition.after);
  return <View style={styles.gradeHeader}><View style={[styles.gradeMark, { borderColor: accent, backgroundColor: `${accent}16` }]}><Text style={[styles.gradeGlyph, { color: accent }]}>◆</Text></View><View style={styles.gradeCopy}><Text style={[styles.gradeEyebrow, { color: accent }]}>{content.eyebrow}</Text><Text style={styles.gradeTitle}>{content.title}</Text><Text style={styles.gradeText}>{content.copy}</Text></View></View>;
}

function RankMetric({ accent, grade, label, rank }: { accent?: string; grade: string; label: string; rank: number | null }) {
  return <View style={styles.rankMetric}><Text style={styles.rankLabel}>{label}</Text><Text style={[styles.rankValue, accent ? { color: accent } : null]}>{rank == null ? '—' : `#${formatNumber(rank)}`}</Text><Text numberOfLines={1} style={styles.rankGrade}>{grade.toUpperCase()}</Text></View>;
}

function RevealState({ action, copy, onPress, title }: { action?: string; copy: string; onPress?: () => void; title: string }) {
  return <Screen><LinearGradient colors={['#0B1115', '#070A0E']} style={StyleSheet.absoluteFill} /><View style={styles.state}><View style={styles.stateMark}><Text style={styles.stateGlyph}>C</Text></View><Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateCopy}>{copy}</Text>{action && onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={styles.stateButton}><Text style={styles.stateButtonText}>{action}</Text></Pressable> : null}</View></Screen>;
}

function teamColor(tag: string, name: string) { return `hsl(${teamHue(tag, name)}, 72%, 59%)`; }
function signed(value: number) { return `${value >= 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`; }
function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }
function formatResolutionDate(value: string) { return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '').toUpperCase(); }
function messageFrom(value: unknown, fallback: string) { return value instanceof Error && value.message ? value.message : fallback; }

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 42, gap: 14 },
  contentLandscape: { maxWidth: layout.wideContentMaxWidth, paddingTop: 4, paddingBottom: 34, gap: 10 },
  pageAuraClip: { position: 'absolute', inset: 0, overflow: 'hidden' },
  pageAura: { position: 'absolute', alignSelf: 'center', top: -180, width: 480, height: 480, borderRadius: 240, filter: 'blur(70px)' },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  topBarLandscape: { minHeight: 40 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  brandGlyph: { color: '#06090C', fontFamily: fonts.display, fontSize: 21, lineHeight: 23, letterSpacing: -2 },
  brandText: { color: colors.text, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 2.5 },
  backButton: { minHeight: 40, justifyContent: 'center', paddingRight: 12 },
  backText: { ...typography.action, color: colors.textMuted, letterSpacing: .5 },
  officialPill: { minHeight: 31, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: '#0B1116', borderWidth: 1, borderColor: '#2A343D' },
  officialDot: { width: 6, height: 6, borderRadius: 3 },
  officialText: { ...typography.label, color: colors.textSubtle, letterSpacing: .4 },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 420, padding: 18, borderRadius: 31, alignItems: 'center', backgroundColor: '#0A0F13', borderWidth: 1, borderColor: '#273039' },
  heroLandscape: { minHeight: 315, padding: 14, borderRadius: 25 },
  transitionHero: { minHeight: 360, justifyContent: 'flex-start' },
  transitionHeroLandscape: { minHeight: 235 },
  transitionKicker: { ...typography.eyebrow, marginTop: 5, color: colors.volt, letterSpacing: 1.1 },
  transitionTitle: { ...typography.displayMedium, marginTop: 6, color: colors.text, textAlign: 'center' },
  transitionTitleLandscape: { marginTop: 3, fontSize: 31, lineHeight: 33 },
  transitionSkeletonCopy: { gap: 7 },
  heroGlow: { position: 'absolute', top: -150, width: 360, height: 300, borderRadius: 180, opacity: .18 },
  resultKicker: { ...typography.eyebrow, marginTop: 5, letterSpacing: 1.4 },
  resultTitle: { ...typography.displayLarge, marginTop: 6, color: colors.text, textAlign: 'center' },
  resultTitleLandscape: { marginTop: 3, fontSize: 36, lineHeight: 38 },
  eventLine: { ...typography.caption, maxWidth: '92%', marginTop: 8, color: colors.textMuted, textAlign: 'center' },
  eventLineLandscape: { marginTop: 4 },
  revealIdentity: { width: '100%', marginTop: 13 },
  revealIdentityOutside: { width: '100%' },
  scoreboard: { width: '100%', minHeight: 190, marginTop: 17, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreboardLandscape: { minHeight: 130, marginTop: 8, paddingVertical: 6 },
  team: { width: 92, alignItems: 'center', gap: 5 },
  teamLandscape: { width: 78, gap: 3 },
  teamLogoWrap: { padding: 3, borderRadius: 23, borderWidth: 1, borderColor: 'transparent', backgroundColor: '#060A0D' },
  teamLogoWrapLandscape: { borderRadius: 21 },
  teamTag: { ...typography.cardTitle, color: colors.text, textAlign: 'center' },
  teamName: { ...typography.caption, width: '100%', color: colors.textMuted, textAlign: 'center' },
  yourChoice: { minHeight: 20, marginTop: 2, paddingHorizontal: 7, borderRadius: 7, justifyContent: 'center' },
  yourChoiceText: { ...typography.eyebrow, color: '#070A0D', fontSize: 8, lineHeight: 10, letterSpacing: .3 },
  scoreCenter: { flex: 1, alignItems: 'center', gap: 8 },
  score: { color: colors.text, fontFamily: fonts.display, fontSize: 48, lineHeight: 50, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  scoreLandscape: { fontSize: 40, lineHeight: 42 },
  scoreDash: { color: '#4F5963', fontSize: 28 },
  scoreDashLandscape: { fontSize: 23 },
  finalPill: { minHeight: 23, paddingHorizontal: 9, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: '#151C22', borderWidth: 1, borderColor: '#303B45' },
  finalText: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .7 },
  choiceReceipt: { width: '100%', minHeight: 67, marginTop: 'auto', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, backgroundColor: 'rgba(5,9,12,.72)', borderWidth: 1, borderColor: '#26313A' },
  choiceReceiptLandscape: { minHeight: 56, borderRadius: 16 },
  choiceMark: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  choiceGlyph: { fontSize: 20, lineHeight: 22, fontWeight: '900' },
  choiceCopy: { flex: 1, minWidth: 0 },
  choiceLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .6 },
  choiceName: { ...typography.bodyStrong, marginTop: 3, color: colors.text },
  verdictWord: { ...typography.action, letterSpacing: .5 },
  ratingCard: { minHeight: 235, padding: 17, borderRadius: 26, gap: 16, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  sectionEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .7 },
  sectionTitle: { ...typography.cardTitle, marginTop: 4, color: colors.text },
  deltaPill: { minHeight: 39, paddingHorizontal: 10, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1 },
  deltaText: { ...typography.bodyStrong, fontVariant: ['tabular-nums'] },
  ratingFlow: { flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1 },
  metricLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .6 },
  metricValue: { ...typography.metricLarge, marginTop: 4, color: colors.text, fontVariant: ['tabular-nums'] },
  metricUnit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricUnitText: { ...typography.caption, color: colors.textMuted },
  ratingArrow: { width: 42, alignItems: 'center' },
  ratingArrowText: { fontSize: 23, fontWeight: '800' },
  ratingTrack: { height: 4, overflow: 'hidden', borderRadius: 3, backgroundColor: '#202832' },
  ratingFill: { height: '100%', borderRadius: 3 },
  ratingRule: { ...typography.caption, color: colors.textMuted },
  rankingCard: { minHeight: 225, padding: 17, borderRadius: 26, gap: 16, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  gradeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gradeMark: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  gradeGlyph: { fontSize: 19 },
  gradeCopy: { flex: 1, minWidth: 0 },
  gradeEyebrow: { ...typography.eyebrow, letterSpacing: .8 },
  gradeTitle: { ...typography.cardTitle, marginTop: 3, color: colors.text },
  gradeText: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  rankFlow: { flexDirection: 'row', alignItems: 'stretch', padding: 12, borderRadius: 18, backgroundColor: '#080C10', borderWidth: 1, borderColor: '#222B34' },
  rankMetric: { flex: 1, alignItems: 'center', gap: 3 },
  rankLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .5 },
  rankValue: { ...typography.metric, color: colors.text, fontVariant: ['tabular-nums'] },
  rankGrade: { ...typography.caption, maxWidth: '100%', color: colors.textMuted },
  rankDivider: { width: 1, marginHorizontal: 11, backgroundColor: '#27313A' },
  proofCard: { minHeight: 91, padding: 14, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#090E12', borderWidth: 1, borderColor: '#25303A' },
  proofIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#131A0E', borderWidth: 1, borderColor: '#39461B' },
  proofGlyph: { color: colors.volt, fontSize: 18, fontWeight: '900' },
  proofCopy: { flex: 1, minWidth: 0 },
  proofLabel: { ...typography.eyebrow, color: colors.volt, letterSpacing: .6 },
  proofTitle: { ...typography.bodyStrong, marginTop: 3, color: colors.text },
  proofMeta: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  proofReference: { ...typography.eyebrow, marginTop: 4, color: colors.textSubtle, letterSpacing: .35 },
  errorCard: { padding: 12, borderRadius: radius.md, backgroundColor: '#1B1013', borderWidth: 1, borderColor: '#55252E' },
  errorText: { ...typography.body, color: '#FFA0A8', textAlign: 'center' },
  actions: { gap: 9, paddingTop: 3 },
  primaryButton: { minHeight: 58, paddingHorizontal: 17, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.volt },
  primaryPressed: { opacity: .7, transform: [{ scale: .99 }] },
  primaryText: { ...typography.action, color: '#080A0D', letterSpacing: .45 },
  primaryArrow: { color: '#080A0D', fontSize: 18, lineHeight: 19, fontWeight: '900' },
  secondaryButton: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#2B3540' },
  secondaryText: { ...typography.action, color: colors.textSubtle, letterSpacing: .35 },
  seenHint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  state: { flex: 1, minHeight: 540, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateMark: { width: 64, height: 64, marginBottom: 8, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  stateGlyph: { color: '#080A0D', fontFamily: fonts.display, fontSize: 36, lineHeight: 38, letterSpacing: -3 },
  stateTitle: { ...typography.sectionTitle, color: colors.text, textAlign: 'center' },
  stateCopy: { ...typography.body, maxWidth: 320, color: colors.textMuted, textAlign: 'center' },
  stateButton: { minHeight: 49, marginTop: 10, paddingHorizontal: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  stateButtonText: { ...typography.action, color: '#080A0D' },
  pressed: { opacity: .72 },
});
