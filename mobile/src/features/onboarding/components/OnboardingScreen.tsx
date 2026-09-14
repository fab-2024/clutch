import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import {
  Apple,
  ArrowRight,
  ChevronDown,
  Gamepad2,
  Mail,
  Search,
  ShieldCheck,
  Trophy,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppAtmosphere } from '@/src/components/layout/AppAtmosphere';
import { createOAuthSignInUrl, type OAuthProvider } from '@/src/features/auth/api';
import { authErrorMessage } from '@/src/features/auth/messages';
import { accountConfirmationRedirect } from '@/src/features/auth/redirects';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import PlayerAvatar from '@/src/features/profile/avatars/PlayerAvatar';
import { ReactorScene } from '@/src/features/social/faction/reactor/ReactorScene';
import { errorFeedback, impactFeedback, selectionFeedback, successFeedback } from '@/src/lib/feedback';
import { useAuth } from '@/src/providers/AuthProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts, spacing, typography } from '@/src/theme';

import { loadTeamOrganizations, saveOnboarding } from '../api';
import { GAMES } from '../constants';
import {
  clearOnboardingDraft,
  EMPTY_ONBOARDING_DRAFT,
  markOnboardingSeen,
  readOnboardingDraft,
  writeOnboardingDraft,
} from '../draft';
import { GAME_BACKGROUNDS } from '../gameBackgrounds';
import type { GameId, OnboardingDraft, TeamOrganization } from '../types';
import { teamIdForOrganization } from '../utils';
import GameLogo from './GameLogo';
import TeamLogo from './TeamLogo';

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const RIVALRY_MARK_SOURCE = require('../../../../assets/brand/griff-rivalry-mark.png');
const RIVALRY_BACKGROUND_SOURCE = require('../../../../assets/onboarding/rivalry-crowd-v2.png');
const PURPLE_ARENA_SOURCE = require('../../../../assets/onboarding/purple-arena-v2.png');
const TEAM_CROWD_SOURCE = require('../../../../assets/onboarding/team-crowd-v2.png');

const DISCOVERY_GAMES = [
  { id: 'counter-strike-2', name: 'Counter-Strike 2', code: 'CS2', accent: '#F5A524' },
  { id: 'ea-sports-fc', name: 'EA SPORTS FC', code: 'FC', accent: '#F4F7FA' },
  { id: 'overwatch-2', name: 'Overwatch 2', code: 'OW', accent: '#F99E35' },
  { id: 'rainbow-six-siege', name: 'Rainbow Six Siege', code: 'R6', accent: '#DCE3E8' },
  { id: 'fortnite', name: 'Fortnite', code: 'FN', accent: '#35B8FF' },
  { id: 'other', name: 'Autre', code: '…', accent: '#8795A1' },
] as const;

export default function OnboardingScreen({ preview = false, previewStep }: { preview?: boolean; previewStep?: number }) {
  const { profile, refreshProfile, session, status } = useAuth();
  const { refresh: refreshEconomy } = useEconomy();
  const reduceMotion = useReducedMotion();
  const completionStarted = useRef(false);
  const draftWriteRef = useRef<Promise<void>>(Promise.resolve());
  const initialPreviewStepRef = useRef(preview && Number.isFinite(previewStep) ? Number(previewStep) : null);
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_ONBOARDING_DRAFT);
  const [organizations, setOrganizations] = useState<TeamOrganization[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [saving, setSaving] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    readOnboardingDraft()
      .then((saved) => {
        if (!active) return;
        const requestedStep = initialPreviewStepRef.current ?? saved.step;
        const safeStep = Math.min(6, Math.max(0, requestedStep)) as Step;
        setDraft({ ...saved, step: safeStep });
        setStep(safeStep);
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
    return () => { active = false; };
  }, []);

  const persistDraft = useCallback((next: OnboardingDraft) => {
    const write = draftWriteRef.current
      .catch(() => undefined)
      .then(() => writeOnboardingDraft(next));
    draftWriteRef.current = write;
    return write;
  }, []);

  const updateDraft = useCallback((nextStep: Step, patch: Partial<OnboardingDraft> = {}) => {
    const next = { ...draft, ...patch, step: nextStep };
    setDraft(next);
    setStep(nextStep);
    setError(null);
    void persistDraft(next).catch(() => undefined);
  }, [draft, persistDraft]);

  useEffect(() => {
    if (!hydrated || step !== 0) return;
    if (preview && previewStep === 0) return;
    const timer = setTimeout(() => updateDraft(1), preview ? 350 : 1350);
    return () => clearTimeout(timer);
  }, [hydrated, preview, previewStep, step, updateDraft]);

  useEffect(() => {
    if (!hydrated || step !== 5) return;
    let active = true;
    setLoadingTeams(true);
    const games = draft.favoriteGame ? [draft.favoriteGame] : GAMES.map((game) => game.id);
    loadTeamOrganizations(games)
      .then((data) => { if (active) setOrganizations(data); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Impossible de charger les équipes.'); })
      .finally(() => { if (active) setLoadingTeams(false); });
    return () => { active = false; };
  }, [draft.favoriteGame, hydrated, step]);

  const completeProfile = useCallback(async () => {
    if (!session?.user.id || saving || completionStarted.current) return;
    completionStarted.current = true;
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding(draft);
      void trackAnalyticsEvent({
        type: 'onboarding_termine',
        idempotencyKey: 'onboarding:v2:completed',
      }).catch(() => undefined);
      await Promise.all([refreshProfile(), refreshEconomy()]);
      await clearOnboardingDraft();
      successFeedback();
      router.replace('/(tabs)' as never);
    } catch (caught) {
      completionStarted.current = false;
      errorFeedback();
      setError(caught instanceof Error ? caught.message : 'Impossible de finaliser ton profil GRIFF.');
    } finally {
      setSaving(false);
    }
  }, [draft, refreshEconomy, refreshProfile, saving, session?.user.id]);

  useEffect(() => {
    if (!hydrated || preview || step !== 6 || !session || !profile || status !== 'ready') return;
    if (profile.est_developpeur || profile.onboarding_termine) {
      void clearOnboardingDraft().finally(() => router.replace('/(tabs)' as never));
      return;
    }
    void completeProfile();
  }, [completeProfile, hydrated, preview, profile, session, status, step]);

  function goForward() {
    selectionFeedback();
    updateDraft(Math.min(6, step + 1) as Step);
  }

  function selectGame(game: GameId) {
    selectionFeedback();
    updateDraft(4, {
      favoriteGame: game,
      favoriteTeamId: null,
      favoriteTeamKey: null,
      missingGame: '',
      missingTeam: '',
    });
  }

  function selectTeam(organization: TeamOrganization) {
    selectionFeedback();
    const games = draft.favoriteGame ? [draft.favoriteGame] : organization.games;
    updateDraft(5, {
      favoriteTeamKey: organization.key,
      favoriteTeamId: teamIdForOrganization(organization, games),
      missingTeam: '',
    });
  }

  function chooseMissingTeam() {
    selectionFeedback();
    updateDraft(5, {
      favoriteTeamKey: null,
      favoriteTeamId: null,
      missingTeam: draft.missingTeam || ' ',
    });
  }

  async function startOAuth(provider: OAuthProvider) {
    if (oauthLoading || preview) return;
    setOauthLoading(provider);
    setError(null);
    impactFeedback();
    try {
      const finalDraft = { ...draft, step: 6 };
      await Promise.all([persistDraft(finalDraft), markOnboardingSeen()]);
      const url = await createOAuthSignInUrl(provider, accountConfirmationRedirect());
      await Linking.openURL(url);
    } catch (caught) {
      errorFeedback();
      setError(authErrorMessage(caught, 'Cette connexion est indisponible pour le moment.'));
    } finally {
      setOauthLoading(null);
    }
  }

  async function openEmailAuth() {
    if (preview) return;
    const finalDraft = { ...draft, step: 6 };
    await Promise.all([persistDraft(finalDraft), markOnboardingSeen()]);
    selectionFeedback();
    router.push({ pathname: '/login', params: { mode: 'signup' } } as never);
  }

  if (!hydrated) {
    return (
      <View style={styles.loadingRoot}>
        <AppAtmosphere />
        <ActivityIndicator color={colors.volt} />
      </View>
    );
  }

  if (step === 0) return <LogoStep reduceMotion={reduceMotion} />;

  const gameReady = Boolean(draft.favoriteGame || draft.missingGame.trim().length >= 2);
  const teamReady = Boolean(draft.favoriteTeamId || draft.missingTeam.trim().length >= 2);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.shell}>
        <View key={step} style={styles.page}>
          {step >= 1 && step <= 3 ? (
            <EducationStep onNext={goForward} step={step} />
          ) : null}
          {step === 4 ? (
            <GameStep
              draft={draft}
              ready={gameReady}
              onNext={() => { impactFeedback(); updateDraft(5); }}
              onSelect={selectGame}
              onSelectMissing={(value) => updateDraft(4, {
                favoriteGame: null,
                favoriteTeamId: null,
                favoriteTeamKey: null,
                missingGame: value,
                missingTeam: '',
              })}
            />
          ) : null}
          {step === 5 ? (
            <TeamStep
              draft={draft}
              error={error}
              loading={loadingTeams}
              organizations={organizations}
              ready={teamReady}
              onChangeMissing={(value) => updateDraft(5, { favoriteTeamId: null, favoriteTeamKey: null, missingTeam: value })}
              onMissing={chooseMissingTeam}
              onNext={() => { impactFeedback(); updateDraft(6); void markOnboardingSeen(); }}
              onSelect={selectTeam}
            />
          ) : null}
          {step === 6 ? (
            <AuthStep
              error={error}
              loading={oauthLoading}
              saving={saving}
              onEmail={() => void openEmailAuth()}
              onOAuth={(provider) => void startOAuth(provider)}
            />
          ) : null}
        </View>
        <ProgressSegments step={step} />
      </View>
    </SafeAreaView>
  );
}

function LogoStep({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <View style={styles.logoRoot}>
      <AppAtmosphere />
      <LinearGradient pointerEvents="none" colors={['rgba(232,255,61,.07)', 'transparent']} style={styles.logoAura} />
      <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(700)} style={styles.logoStage}>
        <OnboardingLockup width={280} />
        <Text style={styles.logoBaseline}>L’ESPORT SE VIT ENSEMBLE</Text>
      </Animated.View>
    </View>
  );
}

function ScreenBrand() {
  return (
    <View style={styles.screenBrand}>
      <OnboardingLockup width={190} />
    </View>
  );
}

function ProgressSegments({ step }: { step: Step }) {
  return (
    <View accessibilityLabel={`Étape ${step} sur 6`} style={styles.progress}>
      {[1, 2, 3, 4, 5, 6].map((index) => (
        <View key={index} style={[styles.progressBar, index === step && styles.progressBarActive]} />
      ))}
    </View>
  );
}

function OnboardingMark({ decorative = false, size = 40 }: { decorative?: boolean; size?: number }) {
  return (
    <Image
      accessibilityElementsHidden={decorative}
      accessibilityLabel={decorative ? undefined : 'Logo GRIFF'}
      accessibilityRole={decorative ? undefined : 'image'}
      accessible={!decorative}
      resizeMode="contain"
      source={RIVALRY_MARK_SOURCE}
      style={{ width: size, height: size }}
    />
  );
}

function OnboardingLockup({ width }: { width: number }) {
  const markSize = width * .31;
  return (
    <View accessibilityLabel="GRIFF" accessibilityRole="image" accessible style={[styles.onboardingLockup, { width, height: markSize }]}>
      <OnboardingMark decorative size={markSize} />
      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.onboardingWordmark, { fontSize: markSize * .62, lineHeight: markSize * .68 }]}>GRIFF</Text>
    </View>
  );
}

function EducationStep({ onNext, step }: { onNext: () => void; step: number }) {
  if (step === 1) return <CallEducationStep onNext={onNext} />;
  if (step === 2) return <FragEducationStep onNext={onNext} />;
  return <FactionEducationStep onNext={onNext} />;
}

function CallEducationStep({ onNext }: { onNext: () => void }) {
  const [selectedTeam, setSelectedTeam] = useState<'KC' | 'M8'>('KC');

  function selectTeam(team: 'KC' | 'M8') {
    selectionFeedback();
    setSelectedTeam(team);
  }

  return (
    <View style={[styles.educationPage, styles.callEducationPage]}>
      <Image resizeMode="cover" source={RIVALRY_BACKGROUND_SOURCE} style={styles.fullBleedImage} />
      <LinearGradient
        colors={['rgba(1,7,20,.02)', 'rgba(1,7,20,.10)', 'rgba(1,8,20,.92)']}
        locations={[0, .54, .82]}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.storyChrome}>
        <ScreenBrand />
        <Text style={styles.storyTitle}>CHOISIS TON CAMP.</Text>

        <View accessibilityLabel="Match Karmine Corp contre Gentle Mates" style={styles.callMatchup}>
          <CallTeamCard accent="#00C8FF" active={selectedTeam === 'KC'} name="Karmine Corp" onPress={() => selectTeam('KC')} tag="KC" />
          <View style={styles.versusBadge}><Text style={styles.versusText}>VS</Text></View>
          <CallTeamCard accent="#FF7A45" active={selectedTeam === 'M8'} name="Gentle Mates" onPress={() => selectTeam('M8')} tag="M8" />
        </View>

        <PrimaryButton label="Continuer" onPress={onNext} tone="coral" />
      </View>
    </View>
  );
}

function CallTeamCard({ accent, active, name, onPress, tag }: {
  accent: string;
  active: boolean;
  name: string;
  onPress: () => void;
  tag: string;
}) {
  return (
    <Pressable
      accessibilityLabel={`Choisir ${name}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.callTeamCard, active && { borderColor: accent, backgroundColor: `${accent}1F` }, pressed && styles.pressed]}
    >
      <LinearGradient colors={[`${accent}24`, 'rgba(6,12,26,.92)']} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <TeamLogo accent={accent} contentScale={.92} frameless name={name} size={78} tag={tag} />
      <Text style={styles.callTeamTag}>{tag}</Text>
      <Text numberOfLines={1} style={styles.callTeamName}>{name}</Text>
      <View style={[styles.callChoice, active && { borderColor: accent, backgroundColor: accent }]}>
        <Text style={[styles.callChoiceText, active && styles.callChoiceTextActive]}>{active ? '✓' : '+'}</Text>
      </View>
    </Pressable>
  );
}

function FragEducationStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={[styles.educationPage, styles.fragEducationPage]}>
      <Image resizeMode="cover" source={PURPLE_ARENA_SOURCE} style={styles.fullBleedImage} />
      <LinearGradient
        colors={['rgba(10,4,42,.06)', 'rgba(15,3,48,.08)', 'rgba(5,2,22,.72)']}
        locations={[0, .58, 1]}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.storyChrome}>
        <ScreenBrand />
        <Text style={styles.storyTitle}>CHAQUE BON CALL COMPTE.</Text>

        <View style={styles.rewardStage}>
          <LinearGradient colors={['rgba(69,36,180,.94)', 'rgba(33,15,112,.96)']} style={styles.rewardCard}>
            <Gamepad2 color="#FFFFFF" size={66} strokeWidth={2.2} />
            <Text style={styles.rewardAmount}>+17{`\n`}FRAGS</Text>
          </LinearGradient>
          <View style={styles.rankCard}>
            <View style={styles.rankEmblem}><Trophy color="#E6E9F5" size={34} strokeWidth={1.8} /></View>
            <View style={styles.rankMovement}><Text style={styles.rankOld}>#12</Text><ArrowRight color="#BBA8FF" size={22} strokeWidth={2.8} /><Text style={styles.rankNew}>#5</Text></View>
          </View>
        </View>

        <PrimaryButton label="Continuer" onPress={onNext} tone="purple" />
      </View>
    </View>
  );
}

function FactionEducationStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={[styles.educationPage, styles.factionEducationPage]}>
      <LinearGradient
        colors={['#07131A', '#071017', '#03080D']}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.relicLimeGlow} />
      <View style={styles.storyChrome}>
        <ScreenBrand />
        <Text style={styles.storyTitle}>FAIS GRANDIR TA RELIQUE.</Text>

        <View accessibilityLabel="Relique collective au niveau 68 pour cent" style={styles.relicStage}>
          <View style={styles.relicScene}>
            <ReactorScene
              accent="#27A9FF"
              animateContribution={false}
              fillRatio={.68}
              height={440}
              onEvolutionComplete={() => undefined}
              reduceMotionOverride
              stage={5}
              teamName="GRIFF"
              teamTag="G"
            />
          </View>
          <LinearGradient colors={['rgba(8,20,38,.94)', 'rgba(5,13,25,.98)']} style={styles.relicMetricCard}>
            <View style={styles.relicPercentRing}>
              <Text style={styles.relicMetric}>68 %</Text>
            </View>
            <View style={styles.supporters}>
              <SupporterAvatar avatarId="void-dragon" label="Nova" />
              <SupporterAvatar avatarId="gale-agent" label="Vector" overlap />
              <SupporterAvatar avatarId="octane-stripe" label="Ember" overlap />
              <SupporterAvatar avatarId="orbital-orange" label="Byte" overlap />
              <View style={[styles.supporterAvatar, styles.supporterCount, styles.supporterOverlap]}><Text style={styles.supporterCountText}>+2,8K</Text></View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.storyBottomCompact}>
          <PrimaryButton label="Choisir mon jeu" onPress={onNext} tone="lime" />
        </View>
      </View>
    </View>
  );
}

function SupporterAvatar({ avatarId, label, overlap = false }: { avatarId: string; label: string; overlap?: boolean }) {
  return (
    <View style={[styles.supporterAvatar, overlap && styles.supporterOverlap]}>
      <PlayerAvatar avatarId={avatarId} label={label} size={36} />
    </View>
  );
}

function GameStep({ draft, onNext, onSelect, onSelectMissing, ready }: {
  draft: OnboardingDraft;
  onNext: () => void;
  onSelect: (game: GameId) => void;
  onSelectMissing: (value: string) => void;
  ready: boolean;
}) {
  const [showGameSheet, setShowGameSheet] = useState(false);
  return (
    <View style={[styles.selectionPage, styles.gameSelectionPage]}>
      <LinearGradient colors={['#05070B', '#081019', '#020509']} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <ScreenBrand />
      <View style={styles.selectionHeading}>
        <Text style={[styles.title, styles.centeredTitle]}>CHOISIS TON JEU.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.selectionScroll} showsVerticalScrollIndicator={false}>
        {GAMES.map((game) => {
          const active = draft.favoriteGame === game.id;
          return (
            <Pressable key={game.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onSelect(game.id)} style={({ pressed }) => [styles.gameCard, active && styles.gameCardActive, pressed && styles.pressed]}>
              <Image resizeMode="cover" source={GAME_BACKGROUNDS[game.id]} style={[StyleSheet.absoluteFill, styles.gameImage]} />
              <LinearGradient pointerEvents="none" colors={['rgba(5,9,12,.02)', 'rgba(5,9,12,.50)']} end={{ x: .5, y: 1 }} start={{ x: .5, y: 0 }} style={StyleSheet.absoluteFill} />
              <View style={[styles.gameLogo, { borderColor: game.accent }]}><GameLogo color={game.accent} game={game.id} size={40} /></View>
              <View style={styles.gameText}>
                <Text style={styles.gameName}>{game.name}</Text>
                <Text style={styles.gameDetail}>{game.copy}</Text>
              </View>
              <ChoiceIndicator active={active} />
            </Pressable>
          );
        })}
        <Pressable
          accessibilityLabel="Je ne vois pas mon jeu"
          accessibilityRole="button"
          onPress={() => { selectionFeedback(); setShowGameSheet(true); }}
          style={({ pressed }) => [styles.missingGameButton, Boolean(draft.missingGame.trim()) && styles.missingGameButtonActive, pressed && styles.pressed]}
        >
          <Text numberOfLines={1} style={styles.missingGameButtonText}>{draft.missingGame.trim() || 'Je ne vois pas mon jeu'}</Text>
          <ChevronDown color={draft.missingGame.trim() ? colors.volt : colors.textSecondary} size={19} />
        </Pressable>
      </ScrollView>
      <PrimaryButton disabled={!ready} label="Continuer" onPress={onNext} tone="coral" />
      <MissingGameSheet
        currentValue={draft.missingGame}
        onClose={() => setShowGameSheet(false)}
        onConfirm={(value) => { onSelectMissing(value); setShowGameSheet(false); }}
        visible={showGameSheet}
      />
    </View>
  );
}

function MissingGameSheet({ currentValue, onClose, onConfirm, visible }: {
  currentValue: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
  visible: boolean;
}) {
  const knownValue = DISCOVERY_GAMES.find((game) => game.name === currentValue)?.name ?? null;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(knownValue ?? (currentValue.trim() ? 'Autre' : null));
  const [customGame, setCustomGame] = useState(knownValue ? '' : currentValue);

  useEffect(() => {
    if (!visible) return;
    const nextKnownValue = DISCOVERY_GAMES.find((game) => game.name === currentValue)?.name ?? null;
    setQuery('');
    setSelected(nextKnownValue ?? (currentValue.trim() ? 'Autre' : null));
    setCustomGame(nextKnownValue ? '' : currentValue);
  }, [currentValue, visible]);

  const filteredGames = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    if (!normalized) return DISCOVERY_GAMES;
    return DISCOVERY_GAMES.filter((game) => game.id === 'other' || game.name.toLocaleLowerCase('fr').includes(normalized));
  }, [query]);

  const finalValue = selected === 'Autre' ? customGame.trim() : selected?.trim() ?? '';

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      visible={visible}
    >
      <SafeAreaView style={styles.gameSheetRoot}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text accessibilityRole="header" style={styles.sheetTitle}>Trouve ton jeu</Text>
          <Pressable accessibilityLabel="Fermer la liste des jeux" accessibilityRole="button" onPress={onClose} style={styles.sheetClose}>
            <X color={colors.text} size={20} />
          </Pressable>
        </View>
        <View style={styles.sheetSearch}>
          <Search color={colors.textSecondary} size={20} />
          <TextInput
            accessibilityLabel="Rechercher un jeu"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Rechercher un jeu"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={styles.sheetSearchInput}
            value={query}
          />
        </View>
        <ScrollView contentContainerStyle={styles.sheetList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {filteredGames.map((game) => {
            const active = selected === game.name;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                key={game.id}
                onPress={() => { selectionFeedback(); setSelected(game.name); }}
                style={({ pressed }) => [styles.sheetGameRow, pressed && styles.pressed]}
              >
                <View style={[styles.sheetGameIcon, { borderColor: `${game.accent}66` }]}>
                  <Text style={[styles.sheetGameCode, { color: game.accent }]}>{game.code}</Text>
                </View>
                <Text style={styles.sheetGameName}>{game.name}</Text>
                <View style={[styles.sheetRadio, active && styles.sheetRadioActive]}>{active ? <View style={styles.sheetRadioDot} /> : null}</View>
              </Pressable>
            );
          })}
          {filteredGames.length === 0 ? <Text style={styles.sheetEmpty}>Aucun résultat. Choisis « Autre » pour nous indiquer ton jeu.</Text> : null}
          {selected === 'Autre' ? (
            <TextInput
              accessibilityLabel="Nom de ton jeu"
              autoCapitalize="words"
              autoFocus
              maxLength={80}
              onChangeText={setCustomGame}
              placeholder="Nom de ton jeu"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              style={styles.sheetCustomInput}
              value={customGame}
            />
          ) : null}
        </ScrollView>
        <View style={styles.sheetFooter}>
          <PrimaryButton disabled={finalValue.length < 2} label="Valider" onPress={() => onConfirm(finalValue)} tone="blue" />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function TeamStep({ draft, error, loading, onChangeMissing, onMissing, onNext, onSelect, organizations, ready }: {
  draft: OnboardingDraft;
  error: string | null;
  loading: boolean;
  onChangeMissing: (value: string) => void;
  onMissing: () => void;
  onNext: () => void;
  onSelect: (organization: TeamOrganization) => void;
  organizations: TeamOrganization[];
  ready: boolean;
}) {
  const [query, setQuery] = useState('');
  const missingMode = draft.favoriteTeamId === null && draft.missingTeam.length > 0;
  const filteredOrganizations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    if (!normalized) return organizations;
    return organizations.filter((organization) => `${organization.name} ${organization.tag}`.toLocaleLowerCase('fr').includes(normalized));
  }, [organizations, query]);
  const visibleOrganizations = useMemo(() => {
    if (query.trim()) return filteredOrganizations.slice(0, 6);
    const selected = filteredOrganizations.find((organization) => organization.key === draft.favoriteTeamKey);
    const ordered = selected
      ? [selected, ...filteredOrganizations.filter((organization) => organization.key !== selected.key)]
      : filteredOrganizations;
    return ordered.slice(0, 6);
  }, [draft.favoriteTeamKey, filteredOrganizations, query]);
  return (
    <View style={[styles.selectionPage, styles.teamSelectionPage]}>
      <Image resizeMode="cover" source={TEAM_CROWD_SOURCE} style={styles.fullBleedImage} />
      <LinearGradient colors={['rgba(0,30,80,.03)', 'rgba(2,15,35,.42)', 'rgba(1,8,18,.98)']} locations={[0, .42, .72]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <ScreenBrand />
      <View style={styles.selectionHeading}>
        <Text style={styles.title}>QUI VAS-TU FAIRE GAGNER ?</Text>
        <View style={styles.teamSearch}>
          <Search color={colors.textSecondary} size={19} />
          <TextInput
            accessibilityLabel="Rechercher une équipe"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Rechercher une équipe"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={styles.teamSearchInput}
            value={query}
          />
        </View>
      </View>
      {loading ? <View style={styles.centerState}><ActivityIndicator color={colors.volt} /><Text style={styles.stateText}>Chargement des équipes…</Text></View> : (
        <ScrollView contentContainerStyle={styles.teamGrid} showsVerticalScrollIndicator={false}>
          {visibleOrganizations.map((organization, index) => {
            const active = draft.favoriteTeamKey === organization.key;
            const accent = `hsl(${(index * 47 + 194) % 360}, 68%, 58%)`;
            return (
              <Pressable key={organization.key} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onSelect(organization)} style={({ pressed }) => [styles.teamCard, active && styles.teamCardActive, pressed && styles.pressed]}>
                <TeamLogo accent={accent} contentScale={.82} name={organization.name} size={62} tag={organization.tag} tintColor={organization.name === 'Gentle Mates' ? '#FFFFFF' : undefined} uri={organization.logo} />
                <Text numberOfLines={2} style={styles.teamName}>{organization.name}</Text>
                <ChoiceIndicator active={active} compact />
              </Pressable>
            );
          })}
          {visibleOrganizations.length < 6 ? (
            <View style={styles.teamMissingCell}>
              <MissingChoice active={missingMode} compact label="Je ne vois pas mon équipe" placeholder="Nom de ton équipe" value={missingMode ? draft.missingTeam.trimStart() : ''} onChange={onChangeMissing} onPress={onMissing} />
            </View>
          ) : null}
        </ScrollView>
      )}
      {error ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text> : null}
      <PrimaryButton disabled={!ready || loading} label="Continuer" onPress={onNext} tone="blue" />
    </View>
  );
}

function MissingChoice({ active, compact = false, label, onChange, onPress, placeholder, value }: {
  active: boolean;
  compact?: boolean;
  label: string;
  onChange: (value: string) => void;
  onPress: () => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={[styles.missingCard, compact && styles.missingCardCompact, active && styles.missingCardActive]}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.missingTop}>
        <View style={styles.searchIcon}><Search color={active ? colors.volt : colors.textMuted} size={20} /></View>
        <Text style={[styles.missingLabel, active && styles.missingLabelActive]}>{label}</Text>
        <ChoiceIndicator active={active} />
      </Pressable>
      {active ? (
        <TextInput accessibilityLabel={placeholder} autoCapitalize="words" autoFocus maxLength={80} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#66737E" returnKeyType="done" style={styles.missingInput} value={value} />
      ) : null}
    </View>
  );
}

function ChoiceIndicator({ active, compact = false }: { active: boolean; compact?: boolean }) {
  return (
    <View style={[styles.choiceIndicator, compact && styles.choiceIndicatorCompact, active && styles.choiceIndicatorActive]}>
      <Text style={[styles.choiceIndicatorText, active && styles.choiceIndicatorTextActive]}>{active ? '✓' : '+'}</Text>
    </View>
  );
}

function AuthStep({ error, loading, onEmail, onOAuth, saving }: {
  error: string | null;
  loading: OAuthProvider | null;
  onEmail: () => void;
  onOAuth: (provider: OAuthProvider) => void;
  saving: boolean;
}) {
  const disabled = saving || loading !== null;
  return (
    <ScrollView contentContainerStyle={styles.authPage} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#05090D', '#090B0E', '#020406']} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.authCopperAura} />
      <ScreenBrand />
      <View style={styles.authHeading}>
        <Text style={[styles.title, styles.authTitle]}>TA SAISON COMMENCE.</Text>
      </View>
      <View style={styles.authAvatarStage}>
        <View style={styles.authAvatarRing}><PlayerAvatar avatarId="gale-agent" label="Vector" size={205} /></View>
        <Text style={styles.authAvatarName}>VECTOR</Text>
      </View>
      <View style={styles.providers}>
        <ProviderButton disabled={disabled} icon={<Apple color="#071016" size={23} fill="#071016" />} label="Continuer avec Apple" loading={loading === 'apple'} onPress={() => onOAuth('apple')} primary />
        <View style={styles.providerIcons}>
          <ProviderIconButton
            accessibilityLabel="Continuer avec Google"
            disabled={disabled}
            icon={<Text style={styles.googleLetter}>G</Text>}
            loading={loading === 'google'}
            onPress={() => onOAuth('google')}
          />
          <ProviderIconButton
            accessibilityLabel="Continuer avec Discord"
            disabled={disabled}
            icon={<Gamepad2 color="#B9C5FF" size={25} />}
            loading={loading === 'discord'}
            onPress={() => onOAuth('discord')}
          />
          <ProviderIconButton
            accessibilityLabel="Continuer avec une adresse e-mail"
            disabled={disabled}
            icon={<Mail color={colors.text} size={24} />}
            loading={false}
            onPress={onEmail}
          />
        </View>
      </View>
      {saving ? <View style={styles.savingRow}><ActivityIndicator color={colors.volt} /><Text style={styles.stateText}>Préparation de ton profil…</Text></View> : null}
      {error ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text> : null}
      <View style={styles.securityRow}>
        <ShieldCheck color="#82919D" size={18} />
        <Text style={styles.securityText}>Aucune mise d’argent · compte privé par défaut</Text>
      </View>
    </ScrollView>
  );
}

function ProviderIconButton({ accessibilityLabel, disabled, icon, loading, onPress }: {
  accessibilityLabel: string;
  disabled: boolean;
  icon: ReactNode;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.providerIconButton, disabled && !loading && styles.providerButtonDisabled, pressed && styles.pressed]}
    >
      {loading ? <ActivityIndicator color={colors.volt} /> : icon}
    </Pressable>
  );
}

function ProviderButton({ disabled, icon, label, loading, onPress, primary = false }: {
  disabled: boolean;
  icon: ReactNode;
  label: string;
  loading: boolean;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ busy: loading, disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.providerButton, primary && styles.providerButtonPrimary, disabled && !loading && styles.providerButtonDisabled, pressed && styles.pressed]}>
      <View style={styles.providerIcon}>{loading ? <ActivityIndicator color={primary ? '#071016' : colors.volt} /> : icon}</View>
      <Text style={[styles.providerLabel, primary && styles.providerLabelPrimary]}>{label}</Text>
      <ArrowRight color={primary ? '#071016' : '#73818C'} size={20} />
    </Pressable>
  );
}

const BUTTON_GRADIENTS = {
  lime: ['#F3FF8D', colors.volt, '#BCCE20'],
  coral: ['#FF8A4C', '#FF5A46', '#FF7A4E'],
  purple: ['#7D47FF', '#C851FF', '#A93DFF'],
  blue: ['#14D4F4', '#087CFF', '#245CFF'],
} as const;

function PrimaryButton({ disabled = false, label, onPress, tone = 'lime' }: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: keyof typeof BUTTON_GRADIENTS;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={{ top: 8, right: 4, bottom: 8, left: 4 }}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, disabled && styles.disabled, pressed && styles.pressed]}
      testID="onboarding-primary-button"
    >
      <LinearGradient
        pointerEvents="none"
        colors={BUTTON_GRADIENTS[tone]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <Text pointerEvents="none" style={styles.primaryLabel}>{label}</Text>
      <View pointerEvents="none"><ArrowRight color="#071016" size={21} strokeWidth={2.7} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: '#03070B' },
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.atmosphereBottom },
  shell: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center' },
  page: { flex: 1 },
  fullBleedImage: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  screenBrand: { height: 54, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  onboardingLockup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  onboardingWordmark: { flexShrink: 1, color: '#F8FAFC', fontFamily: fonts.display, fontStyle: 'italic', letterSpacing: .3 },
  progress: { position: 'absolute', zIndex: 60, left: 0, right: 0, bottom: 0, height: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  progressBar: { width: 30, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.24)' },
  progressBarActive: { width: 34, backgroundColor: '#FFFFFF' },
  logoRoot: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#05090C' },
  logoAura: { position: 'absolute', width: 520, height: 520, borderRadius: 260, transform: [{ scaleX: 1.2 }] },
  logoStage: { alignItems: 'center', gap: 24 },
  logoBaseline: { ...typography.label, color: '#7D8A94', letterSpacing: 3 },
  educationPage: { flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#050A12' },
  callEducationPage: { backgroundColor: '#061126' },
  fragEducationPage: { backgroundColor: '#0D0631' },
  factionEducationPage: { backgroundColor: '#04101C' },
  storyChrome: { flex: 1, zIndex: 2, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 44 },
  storyMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  storyEyebrow: { ...typography.eyebrow, letterSpacing: 1.35 },
  coralText: { color: '#FF8A74' },
  cyanText: { color: '#69D5FF' },
  voltText: { color: colors.volt },
  preMatchPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,.19)', backgroundColor: 'rgba(4,10,23,.66)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF765D', boxShadow: '0 0 9px rgba(255,118,93,.92)' },
  preMatchText: { ...typography.label, color: '#DDE8F4', fontSize: 9, lineHeight: 11, letterSpacing: .7 },
  callMatchup: { position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 'auto', marginBottom: 18 },
  callTeamCard: { position: 'relative', overflow: 'hidden', width: '47.5%', minHeight: 172, alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,.26)', backgroundColor: 'rgba(2,9,20,.78)', boxShadow: '0 16px 36px rgba(0,0,0,.44)' },
  callTeamTag: { marginTop: 6, color: '#F7FAFF', fontFamily: fonts.display, fontSize: 29, lineHeight: 30, letterSpacing: .8 },
  callTeamName: { ...typography.label, maxWidth: '92%', color: '#D7E0E8', fontSize: 10 },
  callChoice: { position: 'absolute', top: 10, right: 10, width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,.3)', backgroundColor: 'rgba(5,10,18,.64)' },
  callChoiceText: { color: '#D8E2EB', fontFamily: fonts.bold, fontSize: 13 },
  callChoiceTextActive: { color: '#06101A' },
  versusBadge: { position: 'absolute', zIndex: 3, left: '50%', width: 38, height: 38, marginLeft: -19, alignItems: 'center', justifyContent: 'center', borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,.28)', backgroundColor: '#091421', boxShadow: '0 8px 18px rgba(0,0,0,.42)' },
  versusText: { color: '#F6F8FB', fontFamily: fonts.display, fontSize: 17 },
  storyBottom: { gap: 8 },
  storyBottomCompact: { gap: 10 },
  storyTitle: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 49, lineHeight: 44, letterSpacing: -.6, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.72)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 14 },
  storyCopy: { ...typography.bodyComfort, maxWidth: 345, color: '#C2CBD4', lineHeight: 20 },
  selectionReceipt: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,.14)', backgroundColor: 'rgba(5,12,23,.70)' },
  receiptDot: { width: 7, height: 7, borderRadius: 4 },
  selectionReceiptText: { ...typography.label, flex: 1, color: '#F5F8FA', letterSpacing: .65 },
  lockedText: { ...typography.label, color: '#8996A3', fontSize: 9, letterSpacing: .65 },
  rewardStage: { flex: 1, minHeight: 330, alignItems: 'center', justifyContent: 'flex-end', gap: 22, paddingBottom: 20 },
  rewardCard: { width: '84%', minHeight: 174, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 22, borderRadius: 12, borderWidth: 2, borderColor: '#9E7CFF', boxShadow: '0 0 34px rgba(137,78,255,.82)' },
  rewardAmount: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 42, lineHeight: 38, letterSpacing: .2 },
  rewardLabel: { ...typography.label, color: '#CABEFF', fontSize: 9, letterSpacing: 1 },
  fragParticle: { position: 'absolute', zIndex: 3, opacity: .72 },
  fragParticleLeft: { left: 10, top: 64, transform: [{ rotate: '-16deg' }, { scale: .72 }] },
  fragParticleRight: { right: 9, top: 116, transform: [{ rotate: '19deg' }, { scale: .55 }] },
  fragParticleImage: { width: 44, height: 44 },
  rankCard: { width: '100%', minHeight: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(128,112,220,.62)', backgroundColor: 'rgba(8,13,42,.88)' },
  rankEmblem: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(187,168,255,.42)', backgroundColor: 'rgba(59,49,105,.62)' },
  rankLabel: { ...typography.label, color: '#A79CC5', fontSize: 9, letterSpacing: 1.2 },
  rankMovement: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankOld: { color: '#8B82AB', fontFamily: fonts.display, fontSize: 27, textDecorationLine: 'line-through' },
  rankNew: { color: '#D841FF', fontFamily: fonts.display, fontSize: 30, lineHeight: 31 },
  rankTrack: { overflow: 'hidden', height: 5, marginTop: 10, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.12)' },
  rankFill: { width: '76%', height: '100%', borderRadius: 4 },
  relicLimeGlow: { position: 'absolute', top: '18%', left: '-10%', width: '120%', height: '66%', borderRadius: 260, backgroundColor: 'rgba(16,132,255,.10)', boxShadow: '0 0 95px rgba(20,135,255,.42)' },
  relicStage: { flex: 1, minHeight: 380, alignItems: 'center', justifyContent: 'center', marginHorizontal: -16 },
  relicScene: { width: '118%', height: 440, overflow: 'hidden', opacity: 1 },
  relicMetricCard: { position: 'absolute', left: 18, right: 18, bottom: 8, minHeight: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(98,170,255,.62)', boxShadow: '0 14px 34px rgba(0,0,0,.52)' },
  relicPercentRing: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 34, borderWidth: 7, borderColor: colors.volt, transform: [{ rotate: '-8deg' }] },
  relicMetric: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 24, lineHeight: 26, letterSpacing: -.3, transform: [{ rotate: '8deg' }] },
  relicMetricLabel: { ...typography.label, color: '#BFC9D0', fontSize: 9, letterSpacing: 1.1 },
  supporters: { flexDirection: 'row', alignItems: 'center' },
  supporterAvatar: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 2, borderColor: '#0A1117', overflow: 'hidden', backgroundColor: '#101A22' },
  supporterOverlap: { marginLeft: -7 },
  supporterAvatarText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 8 },
  supporterCount: { width: 50, backgroundColor: '#17242D' },
  supporterCountText: { color: '#DDE7EC', fontFamily: fonts.bold, fontSize: 8 },
  relicProgressTrack: { overflow: 'hidden', height: 6, marginTop: 11, borderRadius: 5, backgroundColor: 'rgba(255,255,255,.13)' },
  relicProgressFill: { width: '68%', height: '100%', borderRadius: 5 },
  relicProgressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  relicProgressText: { ...typography.label, color: '#8B99A3', fontSize: 8, lineHeight: 10, letterSpacing: .6 },
  collectiveLine: { ...typography.label, color: '#DDE5EA', textAlign: 'center', letterSpacing: .9 },
  eyebrow: { ...typography.label, color: colors.volt, letterSpacing: 1.6 },
  title: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 45, lineHeight: 41, letterSpacing: -.35, textShadowColor: 'rgba(0,0,0,.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  centeredTitle: { textAlign: 'center' },
  copy: { ...typography.body, color: '#939EA8', lineHeight: 22 },
  selectionPage: { flex: 1, position: 'relative', overflow: 'hidden', paddingHorizontal: 15, paddingBottom: 43, gap: 10, backgroundColor: '#03070B' },
  gameSelectionPage: { backgroundColor: '#05070B' },
  teamSelectionPage: { backgroundColor: '#041024' },
  selectionHeading: { gap: 10 },
  selectionScroll: { gap: 9, paddingVertical: 2, paddingBottom: 8 },
  gameCard: { position: 'relative', minHeight: 116, overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-end', gap: 12, padding: 13, borderRadius: 19, borderWidth: 1.2, borderColor: '#38516A', backgroundColor: '#0D171F' },
  gameCardActive: { borderWidth: 2, borderColor: '#FF741F', backgroundColor: '#17100B', boxShadow: '0 0 22px rgba(255,105,24,.55)' },
  gameImage: { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 1 },
  gameLogo: { width: 58, height: 58, zIndex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 17, borderWidth: 1, backgroundColor: 'rgba(4,8,11,.74)' },
  gameText: { flex: 1, zIndex: 1, minWidth: 0 },
  gameName: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 23, lineHeight: 25, textShadowColor: 'rgba(0,0,0,.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  gameDetail: { ...typography.label, marginTop: 3, color: '#C8D0D8', textShadowColor: 'rgba(0,0,0,.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  missingGameButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#71859A', backgroundColor: 'rgba(5,12,22,.91)' },
  missingGameButtonActive: { borderColor: colors.volt, backgroundColor: 'rgba(25,32,20,.88)' },
  missingGameButtonText: { ...typography.bodyStrong, color: '#F0F4F7' },
  choiceIndicator: { width: 29, height: 29, zIndex: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: '#3A4C59', backgroundColor: '#081017' },
  choiceIndicatorCompact: { position: 'absolute', top: 8, right: 8, width: 23, height: 23 },
  choiceIndicatorActive: { borderColor: colors.volt, backgroundColor: colors.volt },
  choiceIndicatorText: { color: '#75828C', fontFamily: fonts.bold, fontSize: 14 },
  choiceIndicatorTextActive: { color: '#071016' },
  missingCard: { overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: '#263B49', backgroundColor: '#0D171F' },
  missingCardCompact: { minHeight: 126, justifyContent: 'center' },
  missingCardActive: { borderColor: colors.volt },
  missingTop: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14 },
  searchIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#12232E' },
  missingLabel: { flex: 1, ...typography.bodyStrong, color: '#A5AFB7' },
  missingLabelActive: { color: colors.text },
  missingInput: { height: 48, marginHorizontal: 12, marginBottom: 12, paddingHorizontal: 14, borderRadius: 14, color: colors.text, fontFamily: fonts.body, fontSize: 16, backgroundColor: '#071016', borderWidth: 1, borderColor: '#314653' },
  teamGrid: { flexGrow: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', gap: 9, paddingVertical: 2, paddingBottom: 8 },
  teamSearch: { height: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 15, borderWidth: 1.4, borderColor: '#1596FF', backgroundColor: 'rgba(4,24,44,.92)', boxShadow: '0 0 18px rgba(0,120,255,.25)' },
  teamSearchInput: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  teamCard: { position: 'relative', width: '31.6%', minHeight: 118, alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 17, borderWidth: 1, borderColor: '#29425B', backgroundColor: 'rgba(4,14,26,.92)' },
  teamCardActive: { borderWidth: 2, borderColor: '#49A7FF', backgroundColor: 'rgba(4,21,39,.96)', boxShadow: '0 0 22px rgba(50,139,255,.58)' },
  teamName: { ...typography.label, minHeight: 25, marginTop: 6, color: '#FFFFFF', textAlign: 'center' },
  teamMissingCell: { width: '100%' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateText: { ...typography.body, color: '#89959E' },
  primaryButton: { zIndex: 20, elevation: 5, overflow: 'hidden', minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 20, borderRadius: 17, backgroundColor: colors.volt, boxShadow: '0 10px 26px rgba(0,0,0,.35)' },
  primaryLabel: { color: '#071016', fontFamily: fonts.display, fontSize: 21, lineHeight: 23, letterSpacing: .1 },
  disabled: { opacity: .32 },
  pressed: { opacity: .76 },
  errorText: { ...typography.body, color: '#FF8A94' },
  authPage: { flexGrow: 1, minHeight: '100%', position: 'relative', overflow: 'hidden', paddingHorizontal: 15, paddingBottom: 44 },
  authCopperAura: { position: 'absolute', top: 145, left: '4%', width: '92%', height: 430, borderRadius: 240, backgroundColor: 'rgba(197,105,55,.16)', boxShadow: '0 0 95px rgba(191,93,45,.30)' },
  authHeading: { alignItems: 'center', gap: 7, marginBottom: 4 },
  authTitle: { maxWidth: 280, textAlign: 'center' },
  authCopy: { maxWidth: 350, textAlign: 'center' },
  authAvatarStage: { alignItems: 'center', justifyContent: 'center', minHeight: 275, marginBottom: 8 },
  authAvatarRing: { overflow: 'hidden', padding: 7, borderRadius: 120, borderWidth: 3, borderColor: '#D28A5E', backgroundColor: '#081019', boxShadow: '0 0 38px rgba(211,124,74,.48)' },
  authAvatarName: { marginTop: 10, color: '#FFFFFF', fontFamily: fonts.display, fontSize: 25, letterSpacing: 1.8 },
  providers: { gap: 12 },
  providerIcons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  providerIconButton: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, borderWidth: 1, borderColor: '#304553', backgroundColor: '#0A141C' },
  providerButton: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, borderRadius: 18, borderWidth: 1, borderColor: '#304553', backgroundColor: '#0A141C' },
  providerButtonPrimary: { borderColor: '#F7F6F2', backgroundColor: '#F7F6F2' },
  providerButtonDisabled: { opacity: .62 },
  providerIcon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  providerLabel: { flex: 1, ...typography.bodyStrong, color: colors.text },
  providerLabelPrimary: { color: '#071016' },
  googleLetter: { color: '#F7F6F2', fontFamily: fonts.bold, fontSize: 22 },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 3 },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#223440' },
  separatorText: { ...typography.label, color: '#65727C' },
  savingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 },
  previewNote: { ...typography.label, marginTop: 12, color: '#83909A', textAlign: 'center' },
  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 'auto', paddingTop: 18 },
  securityText: { ...typography.label, color: '#82919D' },
  legal: { ...typography.caption, marginTop: 14, color: '#65727C', textAlign: 'center' },
  gameSheetRoot: { flex: 1, backgroundColor: '#071321', paddingHorizontal: spacing.md },
  sheetHandle: { width: 42, height: 5, alignSelf: 'center', marginTop: 9, marginBottom: 12, borderRadius: 3, backgroundColor: '#718092' },
  sheetHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...typography.sectionTitle, color: colors.text },
  sheetClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#132331' },
  sheetSearch: { height: 50, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#267ED6', backgroundColor: '#0B1D2D' },
  sheetSearchInput: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  sheetList: { paddingVertical: 10, paddingBottom: 18 },
  sheetGameRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2C4253' },
  sheetGameIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, backgroundColor: '#11202D' },
  sheetGameCode: { fontFamily: fonts.display, fontSize: 17 },
  sheetGameName: { flex: 1, ...typography.bodyStrong, color: colors.text },
  sheetRadio: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1.5, borderColor: '#81909D' },
  sheetRadioActive: { borderColor: colors.info },
  sheetRadioDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.info },
  sheetEmpty: { ...typography.body, paddingVertical: 20, color: colors.textSecondary, textAlign: 'center' },
  sheetCustomInput: { height: 50, marginTop: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.info, color: colors.text, fontFamily: fonts.body, fontSize: 15, backgroundColor: '#0B1D2D' },
  sheetFooter: { paddingTop: 8, paddingBottom: 6 },
});
