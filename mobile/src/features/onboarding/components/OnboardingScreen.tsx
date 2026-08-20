import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radius, spacing } from '@/src/theme';

import { loadTeamOrganizations, saveOnboarding } from '../api';
import { GAMES } from '../constants';
import type { GameId, TeamOrganization } from '../types';
import { teamIdForOrganization } from '../utils';

type Step = 0 | 1 | 2;

export default function OnboardingScreen() {
  const { session, profile, refreshProfile } = useAuth();
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
      setStep(2);
    } catch (caught) {
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
      await saveOnboarding(games, teamId, session.user.id);
      await refreshProfile();
      router.replace('/(tabs)' as never);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de finaliser ton entrée dans Clutch.');
    } finally {
      setSaving(false);
    }
  }

  function toggleGame(id: GameId) {
    setGames((current) => current.includes(id) ? current.filter((game) => game !== id) : [...current, id]);
    setSelectedTeam(null);
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.shell}>
        <OnboardingTop step={step} />

        {step === 0 ? (
          <WelcomeStep onNext={() => setStep(1)} />
        ) : step === 1 ? (
          <GamesStep
            selected={games}
            loading={loadingTeams}
            onBack={() => setStep(0)}
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
            onBack={() => setStep(1)}
            onSelect={setSelectedTeam}
            onFinish={() => void finish()}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function OnboardingTop({ step }: { step: Step }) {
  return (
    <View style={styles.top}>
      <View style={styles.brandRow}>
        <View style={styles.logo}><Text style={styles.logoText}>C</Text></View>
        <Text style={styles.brand}>CLUTCH<Text style={styles.brandDot}>.</Text></Text>
      </View>
      <View style={styles.progress}>
        {[0, 1, 2].map((index) => <View key={index} style={[styles.progressBar, index <= step && styles.progressBarActive]} />)}
      </View>
      <Text style={styles.stepLabel}>0{step + 1} / 03</Text>
    </View>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.welcome}>
      <View style={styles.impactStage}>
        <View style={styles.impactRingOuter} />
        <View style={styles.impactRingInner} />
        <View style={styles.impactSlashLeft} />
        <View style={styles.impactSlashRight} />
        <Text style={styles.impactC}>C</Text>
      </View>

      <View style={styles.heroCopy}>
        <Text style={styles.kicker}>LE PRONO ESPORT ENTRE POTES</Text>
        <Text style={styles.heroTitle}>BIENVENUE{`\n`}DANS CLUTCH.</Text>
        <Text style={styles.heroText}>
          Prends position sur les matchs qui comptent, grimpe au rating et construis ton identité avec ta faction.
        </Text>
      </View>

      <View style={styles.promiseRow}>
        <Promise number="01" title="PRENDS POSITION" copy="Un camp. Un verdict." />
        <Promise number="02" title="GRIMPE" copy="Ton rating garde la trace." />
        <Promise number="03" title="REPRÉSENTE" copy="Ta faction évolue avec toi." />
      </View>

      <Pressable onPress={onNext} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>COMMENCER</Text>
        <Text style={styles.primaryButtonArrow}>→</Text>
      </Pressable>
    </View>
  );
}

function Promise({ number, title, copy }: { number: string; title: string; copy: string }) {
  return (
    <View style={styles.promise}>
      <Text style={styles.promiseNumber}>{number}</Text>
      <Text style={styles.promiseTitle}>{title}</Text>
      <Text style={styles.promiseCopy}>{copy}</Text>
    </View>
  );
}

function GamesStep({
  selected,
  loading,
  onBack,
  onToggle,
  onNext,
}: {
  selected: GameId[];
  loading: boolean;
  onBack: () => void;
  onToggle: (id: GameId) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.stepBody}>
      <View style={styles.stepHeadline}>
        <Text style={styles.kicker}>TON FEED, TES RÈGLES</Text>
        <Text style={styles.stepTitle}>CHOISIS TES{`\n`}TERRAINS.</Text>
        <Text style={styles.stepText}>Sélectionne au moins un jeu. Tu pourras changer ça plus tard dans tes paramètres.</Text>
      </View>

      <View style={styles.gamesGrid}>
        {GAMES.map((game) => {
          const active = selected.includes(game.id);
          return (
            <Pressable
              key={game.id}
              onPress={() => onToggle(game.id)}
              style={({ pressed }) => [styles.gameCard, active && styles.gameCardActive, pressed && styles.pressed]}
            >
              <View style={[styles.gameMark, { borderColor: game.accent }, active && { backgroundColor: `${game.accent}22` }]}>
                <Text style={[styles.gameCode, { color: game.accent }]}>{game.code}</Text>
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
        <Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backText}>← RETOUR</Text></Pressable>
        <Pressable
          disabled={!selected.length || loading}
          onPress={onNext}
          style={({ pressed }) => [styles.nextButton, (!selected.length || loading) && styles.disabled, pressed && styles.pressed]}
        >
          {loading ? <ActivityIndicator color="#080A0C" /> : <Text style={styles.nextText}>CONTINUER →</Text>}
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
        <Text style={styles.kicker}>UNE COULEUR À PORTER</Text>
        <Text style={styles.stepTitle}>CHOISIS TES{`\n`}COULEURS.</Text>
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
              onPress={() => onSelect(organization.key)}
              style={({ pressed }) => [styles.teamCard, active && styles.teamCardActive, pressed && styles.pressed]}
            >
              <View style={[styles.teamLogo, { borderColor: accent }, active && { backgroundColor: `hsla(${hue}, 68%, 58%, .16)` }]}>
                <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.teamTag, { color: accent }]}>{organization.tag}</Text>
              </View>
              <Text numberOfLines={1} style={styles.teamName}>{organization.name}</Text>
              <View style={styles.gameDots}>
                {games.map((game) => (
                  <View key={game} style={[styles.gameDot, organization.games.includes(game) && styles.gameDotActive]} />
                ))}
              </View>
              {active ? <View style={styles.selectedPill}><Text style={styles.selectedPillText}>TA FACTION</Text></View> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.bottomActions}>
        <Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backText}>← RETOUR</Text></Pressable>
        <Pressable
          disabled={!selected || saving}
          onPress={onFinish}
          style={({ pressed }) => [styles.nextButton, (!selected || saving) && styles.disabled, pressed && styles.pressed]}
        >
          {saving ? <ActivityIndicator color="#080A0C" /> : <Text style={styles.nextText}>ENTRER DANS CLUTCH →</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05080B' },
  shell: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: spacing.md },
  top: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  logoText: { color: '#07090B', fontSize: 20, fontWeight: '900', letterSpacing: -1.5 },
  brand: { color: colors.text, fontSize: 13, fontWeight: '900', letterSpacing: 2.3 },
  brandDot: { color: colors.volt },
  progress: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  progressBar: { width: 27, height: 3, borderRadius: 3, backgroundColor: '#242C33' },
  progressBarActive: { backgroundColor: colors.volt },
  stepLabel: { color: '#65717D', fontSize: 8, fontWeight: '900', letterSpacing: 1 },

  welcome: { flex: 1, paddingBottom: 18 },
  impactStage: { height: 250, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  impactRingOuter: { position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: '#252E35' },
  impactRingInner: { position: 'absolute', width: 156, height: 156, borderRadius: 78, borderWidth: 1, borderColor: '#394321' },
  impactSlashLeft: { position: 'absolute', width: 190, height: 1, backgroundColor: '#344019', transform: [{ rotate: '42deg' }] },
  impactSlashRight: { position: 'absolute', width: 190, height: 1, backgroundColor: '#202931', transform: [{ rotate: '-42deg' }] },
  impactC: { color: colors.volt, fontSize: 112, lineHeight: 122, fontWeight: '900', letterSpacing: -12 },
  heroCopy: { gap: 9 },
  kicker: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: colors.text, fontSize: 43, lineHeight: 43, fontWeight: '900', letterSpacing: -2 },
  heroText: { maxWidth: 360, color: '#929BA5', fontSize: 13, lineHeight: 19 },
  promiseRow: { flexDirection: 'row', gap: 8, marginTop: 22 },
  promise: { flex: 1, minHeight: 96, padding: 11, borderRadius: 16, backgroundColor: '#090D11', borderWidth: 1, borderColor: '#1E262D' },
  promiseNumber: { color: colors.volt, fontSize: 8, fontWeight: '900' },
  promiseTitle: { marginTop: 12, color: colors.text, fontSize: 9, fontWeight: '900', letterSpacing: .4 },
  promiseCopy: { marginTop: 5, color: '#6D7883', fontSize: 8, lineHeight: 12 },
  primaryButton: { minHeight: 58, marginTop: 'auto', borderRadius: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.volt },
  primaryButtonText: { color: '#07090B', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  primaryButtonArrow: { color: '#07090B', fontSize: 20, fontWeight: '900' },

  stepBody: { flex: 1, paddingTop: 28, paddingBottom: 16, gap: 24 },
  stepHeadline: { gap: 8 },
  stepTitle: { color: colors.text, fontSize: 41, lineHeight: 41, fontWeight: '900', letterSpacing: -1.8 },
  stepText: { maxWidth: 360, color: '#89939D', fontSize: 12, lineHeight: 18 },
  gamesGrid: { gap: 10 },
  gameCard: { minHeight: 98, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 13, borderRadius: 21, backgroundColor: '#090D12', borderWidth: 1, borderColor: '#1D252D' },
  gameCardActive: { backgroundColor: '#0D120C', borderColor: '#4B5920' },
  gameMark: { width: 58, height: 58, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1015' },
  gameCode: { fontSize: 24, fontWeight: '900' },
  gameCopy: { flex: 1, minWidth: 0 },
  gameShort: { color: colors.text, fontSize: 14, fontWeight: '900' },
  gameName: { marginTop: 2, color: '#A4ADB6', fontSize: 10, fontWeight: '700' },
  gameDetail: { marginTop: 7, color: '#69747E', fontSize: 8 },
  check: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#303A43' },
  checkActive: { backgroundColor: colors.volt, borderColor: colors.volt },
  checkText: { color: '#71808C', fontSize: 15, fontWeight: '900' },
  checkTextActive: { color: '#080A0C' },

  teamsScroll: { flex: 1, marginHorizontal: -2 },
  teamsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, padding: 2, paddingBottom: 12 },
  teamCard: { position: 'relative', width: '31.6%', minHeight: 126, alignItems: 'center', padding: 10, borderRadius: 19, backgroundColor: '#090D12', borderWidth: 1, borderColor: '#1D252D' },
  teamCardActive: { backgroundColor: '#0E130C', borderColor: colors.volt },
  teamLogo: { width: 55, height: 55, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C1116' },
  teamTag: { maxWidth: 46, fontSize: 12, fontWeight: '900' },
  teamName: { width: '100%', marginTop: 9, color: colors.text, fontSize: 9, lineHeight: 12, fontWeight: '900', textAlign: 'center' },
  gameDots: { flexDirection: 'row', gap: 4, marginTop: 7 },
  gameDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#252E36' },
  gameDotActive: { backgroundColor: colors.volt },
  selectedPill: { position: 'absolute', top: 7, right: 7, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.volt },
  selectedPillText: { color: '#080A0C', fontSize: 5, fontWeight: '900' },

  bottomActions: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { minHeight: 54, paddingHorizontal: 5, justifyContent: 'center' },
  backText: { color: '#747F89', fontSize: 9, fontWeight: '900', letterSpacing: .8 },
  nextButton: { flex: 1, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  nextText: { color: '#080A0C', fontSize: 9, fontWeight: '900', letterSpacing: .9 },
  disabled: { opacity: .35 },
  errorText: { color: '#FF7C87', fontSize: 10, lineHeight: 14 },
  pressed: { opacity: .77 },
});
