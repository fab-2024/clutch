import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GriffLockup } from '@/src/components/brand/GriffLogo';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { errorFeedback, impactFeedback, selectionFeedback, successFeedback } from '@/src/lib/feedback';
import { useAuth } from '@/src/providers/AuthProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts, spacing, typography } from '@/src/theme';

import { loadTeamOrganizations, saveOnboarding } from '../api';
import { GAMES } from '../constants';
import { GAME_BACKGROUNDS } from '../gameBackgrounds';
import type { GameId, TeamOrganization } from '../types';
import { teamIdForOrganization } from '../utils';
import GameLogo from './GameLogo';
import TeamLogo from './TeamLogo';

type Step = 0 | 1;

export default function OnboardingScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const { refresh: refreshEconomy } = useEconomy();
  const reduceMotion = useReducedMotion();
  const initialGames = useMemo(
    () => GAMES.map((game) => game.id).filter((id) => profile?.jeux_suivis?.includes(id)),
    [profile?.jeux_suivis],
  );

  const [step, setStep] = useState<Step>(0);
  const [games, setGames] = useState<GameId[]>(initialGames);
  const [organizations, setOrganizations] = useState<TeamOrganization[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialGames.length || games.length) return;
    setGames(initialGames);
  }, [games.length, initialGames]);

  useEffect(() => {
    if (!session?.user.id) return;
    void trackAnalyticsEvent({
      type: 'onboarding_commence',
      idempotencyKey: 'onboarding:v1:started',
    }).catch(() => undefined);
  }, [session?.user.id]);

  async function goToTeams() {
    if (!games.length) return;
    setLoadingTeams(true);
    setError(null);
    try {
      const data = await loadTeamOrganizations(games);
      setOrganizations(data);
      if (profile?.equipe_favorite_id) {
        const current = data.find((organization) => organization.teams.some((team) => team.id === profile.equipe_favorite_id));
        setSelectedTeam(current?.key ?? null);
      } else {
        setSelectedTeam(null);
      }
      impactFeedback();
      setStep(1);
    } catch (caught) {
      errorFeedback();
      setError(caught instanceof Error ? caught.message : 'Impossible de charger les factions.');
    } finally {
      setLoadingTeams(false);
    }
  }

  async function finish() {
    if (!session?.user.id || !selectedTeam || saving) return;
    const organization = organizations.find((item) => item.key === selectedTeam);
    const teamId = organization ? teamIdForOrganization(organization, games) : null;
    if (!teamId) return;

    setSaving(true);
    setError(null);
    try {
      await saveOnboarding(games, teamId);
      void trackAnalyticsEvent({
        type: 'onboarding_termine',
        idempotencyKey: 'onboarding:v1:completed',
      }).catch(() => undefined);
      await Promise.all([refreshProfile(), refreshEconomy()]);
      successFeedback();
      router.replace('/(tabs)' as never);
    } catch (caught) {
      errorFeedback();
      setError(caught instanceof Error ? caught.message : 'Impossible de finaliser ton entrée dans GRIFF.');
    } finally {
      setSaving(false);
    }
  }

  function toggleGame(id: GameId) {
    selectionFeedback();
    setGames((current) => current.includes(id) ? current.filter((game) => game !== id) : [...current, id]);
    setSelectedTeam(null);
  }

  function moveToStep(next: Step) {
    selectionFeedback();
    setError(null);
    setStep(next);
  }

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient
        colors={[colors.backgroundDeep, '#0B110E', colors.backgroundDeep]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.ambientLayer}>
        <View style={styles.ambientVolt} />
        <View style={styles.ambientBlue} />
      </View>
      <View style={styles.shell}>
        <OnboardingTop step={step} />

        <Animated.View
          key={step}
          entering={reduceMotion ? undefined : FadeInDown.duration(420)}
          style={styles.stepFrame}
        >
          {step === 0 ? (
            <GamesStep
              selected={games}
              loading={loadingTeams}
              onToggle={toggleGame}
              onNext={() => void goToTeams()}
            />
          ) : (
            <TeamsStep
              games={games}
              organizations={organizations}
              selected={selectedTeam}
              saving={saving}
              error={error}
              onBack={() => moveToStep(0)}
              onSelect={(key) => { selectionFeedback(); setSelectedTeam(key); }}
              onFinish={() => void finish()}
            />
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function OnboardingTop({ step }: { step: Step }) {
  return (
    <View style={styles.top}>
      <View style={styles.brandRow}>
        <GriffLockup width={102} />
      </View>
      <View style={styles.progress}>
        {[0, 1].map((index) => <View key={index} style={[styles.progressBar, index <= step && styles.progressBarActive]} />)}
      </View>
      <Text style={styles.stepLabel}>0{step + 1} / 02</Text>
    </View>
  );
}

function GamesStep({
  selected,
  loading,
  onToggle,
  onNext,
}: {
  selected: GameId[];
  loading: boolean;
  onToggle: (id: GameId) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.stepBody}>
      <View style={styles.stepHeadline}>
        <Text style={styles.stepTitle}>QUELS JEUX{`\n`}SUIS-TU ?</Text>
        <Text style={styles.stepText}>Sélectionne au moins un jeu. Tu pourras changer ça plus tard dans tes paramètres.</Text>
      </View>

      <View style={styles.gamesGrid}>
        {GAMES.map((game) => {
          const active = selected.includes(game.id);
          return (
            <Pressable
              key={game.id}
              accessibilityLabel={`${game.name}${active ? ', sélectionné' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onToggle(game.id)}
              style={({ pressed }) => [styles.gameCard, active && styles.gameCardActive, pressed && styles.pressed]}
            >
              <Image
                resizeMode="cover"
                source={GAME_BACKGROUNDS[game.id]}
                style={[StyleSheet.absoluteFill, styles.gameBackdrop]}
              />
              <LinearGradient
                colors={['rgba(4,7,10,.94)', 'rgba(4,7,10,.62)', 'rgba(4,7,10,.18)']}
                end={{ x: 0.94, y: 0.5 }}
                start={{ x: 0, y: 0 }}
                style={[StyleSheet.absoluteFill, styles.nonInteractive]}
              />
              <LinearGradient
                colors={active ? [`${game.accent}24`, 'transparent', `${game.accent}16`] : ['transparent', 'transparent', 'rgba(0,0,0,.18)']}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={[StyleSheet.absoluteFill, styles.nonInteractive]}
              />
              <View style={[styles.gameMark, { borderColor: game.accent }, active && { backgroundColor: `${game.accent}22` }]}>
                <GameLogo color={game.accent} game={game.id} size={34} />
              </View>
              <View style={styles.gameCopy}>
                <Text style={styles.gameShort}>{game.short}</Text>
                <Text style={styles.gameName}>{game.name}</Text>
                <Text style={styles.gameDetail}>{game.copy}</Text>
              </View>
              <View style={[styles.check, active && styles.checkActive]}>
                <Text style={[styles.checkText, active && styles.checkTextActive]}>{active ? '✓' : '+'}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.bottomActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !selected.length || loading, busy: loading }}
          disabled={!selected.length || loading}
          onPress={onNext}
          style={({ pressed }) => [styles.nextButton, (!selected.length || loading) && styles.disabled, pressed && styles.pressed]}
        >
          {loading ? <ActivityIndicator color="#080A0C" /> : <Text style={styles.nextText}>Continuer →</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function TeamsStep({
  games,
  organizations,
  selected,
  saving,
  error,
  onBack,
  onSelect,
  onFinish,
}: {
  games: GameId[];
  organizations: TeamOrganization[];
  selected: string | null;
  saving: boolean;
  error: string | null;
  onBack: () => void;
  onSelect: (key: string) => void;
  onFinish: () => void;
}) {
  return (
    <View style={styles.stepBody}>
      <View style={styles.stepHeadline}>
        <Text style={styles.stepTitle}>QUELLE ÉQUIPE{`\n`}SOUTIENS-TU ?</Text>
        <Text style={styles.stepText}>Ta faction donne une identité à ton profil et fait évoluer une relique collective.</Text>
      </View>

      <ScrollView style={styles.teamsScroll} contentContainerStyle={styles.teamsGrid} showsVerticalScrollIndicator={false}>
        {organizations.map((organization, index) => {
          const active = selected === organization.key;
          const hue = (index * 47 + 194) % 360;
          const accent = `hsl(${hue}, 68%, 58%)`;
          return (
            <Pressable
              key={organization.key}
              accessibilityLabel={`${organization.name}${active ? ', ta faction' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(organization.key)}
              style={({ pressed }) => [styles.teamCard, active && styles.teamCardActive, pressed && styles.pressed]}
            >
              <View style={[styles.teamAura, { backgroundColor: accent }]} />
              <TeamLogo
                accent={accent}
                name={organization.name}
                size={59}
                tag={organization.tag}
                uri={organization.logo}
              />
              <Text numberOfLines={2} style={styles.teamName}>{organization.name}</Text>
              <View style={styles.gameDots}>
                {games.map((game) => (
                  <View key={game} style={[styles.gameDot, organization.games.includes(game) && styles.gameDotActive]} />
                ))}
              </View>
              {active ? <View style={styles.selectedPill}><Text style={styles.selectedPillText}>Ta faction</Text></View> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text> : null}

      <View style={styles.bottomActions}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}><Text style={styles.backText}>← Retour</Text></Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !selected || saving, busy: saving }}
          disabled={!selected || saving}
          onPress={onFinish}
          style={({ pressed }) => [styles.nextButton, (!selected || saving) && styles.disabled, pressed && styles.pressed]}
        >
          {saving ? <ActivityIndicator color="#080A0C" /> : <Text style={styles.nextText}>Entrer dans GRIFF →</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: colors.backgroundDeep },
  ambientLayer: { position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' },
  ambientVolt: { position: 'absolute', top: -100, right: -140, width: 330, height: 330, borderRadius: 165, backgroundColor: '#BBD21F', opacity: 0.11 },
  ambientBlue: { position: 'absolute', bottom: -170, left: -150, width: 350, height: 350, borderRadius: 175, backgroundColor: '#16496F', opacity: 0.1 },
  shell: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: spacing.md },
  stepFrame: { flex: 1 },
  top: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center' },
  progress: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  progressBar: { width: 27, height: 3, borderRadius: 3, backgroundColor: '#242C33' },
  progressBarActive: { backgroundColor: colors.volt },
  stepLabel: { ...typography.label, color: colors.textMuted, letterSpacing: .5 },

  stepBody: { flex: 1, paddingTop: 28, paddingBottom: 16, gap: 24 },
  stepHeadline: { gap: 8 },
  stepTitle: { ...typography.displayLarge, color: colors.text },
  stepText: { ...typography.body, maxWidth: 360, color: '#89939D' },
  gamesGrid: { gap: 10 },
  gameCard: { position: 'relative', minHeight: 126, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 13, padding: 13, borderRadius: 21, backgroundColor: '#090D12', borderWidth: 1, borderColor: '#273039' },
  gameCardActive: { borderColor: colors.volt, boxShadow: '0 0 18px rgba(224,255,59,.12)' },
  gameBackdrop: { width: '100%', height: '100%', opacity: .82, pointerEvents: 'none' },
  nonInteractive: { pointerEvents: 'none' },
  gameMark: { width: 58, height: 58, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,8,11,.72)', zIndex: 1 },
  gameCopy: { flex: 1, minWidth: 0, zIndex: 1 },
  gameShort: { ...typography.bodyStrong, color: colors.text },
  gameName: { ...typography.label, marginTop: 2, color: '#A4ADB6' },
  gameDetail: { ...typography.body, marginTop: 5, color: '#83909B' },
  check: { width: 30, height: 30, zIndex: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#52606C', backgroundColor: 'rgba(5,8,11,.68)' },
  checkActive: { backgroundColor: colors.volt, borderColor: colors.volt },
  checkText: { color: '#71808C', fontFamily: fonts.bold, fontSize: 14 },
  checkTextActive: { color: '#080A0C' },

  teamsScroll: { flex: 1, marginHorizontal: -2 },
  teamsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, padding: 2, paddingBottom: 12 },
  teamCard: { position: 'relative', width: '31.6%', minHeight: 146, overflow: 'hidden', alignItems: 'center', padding: 10, borderRadius: 19, backgroundColor: '#090D12', borderWidth: 1, borderColor: '#1D252D' },
  teamCardActive: { backgroundColor: '#0E130C', borderColor: colors.volt },
  teamAura: { position: 'absolute', width: 90, height: 90, top: -48, right: -42, borderRadius: 45, opacity: 0.12, pointerEvents: 'none' },
  teamName: { ...typography.label, width: '100%', marginTop: 9, color: colors.text, textAlign: 'center' },
  gameDots: { flexDirection: 'row', gap: 4, marginTop: 7 },
  gameDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#252E36' },
  gameDotActive: { backgroundColor: colors.volt },
  selectedPill: { position: 'absolute', top: 7, right: 7, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.volt },
  selectedPillText: { ...typography.label, color: '#080A0C' },

  bottomActions: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { minHeight: 54, paddingHorizontal: 5, justifyContent: 'center' },
  backText: { ...typography.action, color: '#747F89', letterSpacing: .3 },
  nextButton: { flex: 1, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  nextText: { ...typography.action, color: '#080A0C', letterSpacing: .3 },
  disabled: { opacity: .35 },
  errorText: { ...typography.body, color: '#FF7C87' },
  pressed: { opacity: .77 },
});
