import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import {
  Apple,
  ArrowLeft,
  ArrowRight,
  Gamepad2,
  Mail,
  Search,
  ShieldCheck,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GriffLockup, GriffMark } from '@/src/components/brand/GriffLogo';
import { AppAtmosphere } from '@/src/components/layout/AppAtmosphere';
import { createOAuthSignInUrl, type OAuthProvider } from '@/src/features/auth/api';
import { authErrorMessage } from '@/src/features/auth/messages';
import { accountConfirmationRedirect } from '@/src/features/auth/redirects';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
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

const GRIFF_LOCKUP_SOURCE = require('../../../../assets/brand/griff-lockup.png');

const EDUCATION: {
  eyebrow: string;
  title: string;
  copy: string;
  accent: string;
  icon: LucideIcon;
  metric: string;
  metricLabel: string;
}[] = [
  {
    eyebrow: '01 · FAIS TON CALL',
    title: 'CHOISIS TON CAMP.',
    copy: 'Avant le début d’un match, choisis l’équipe qui va gagner. Le barème est affiché et reste fixe.',
    accent: '#FF765D',
    icon: Trophy,
    metric: 'FNC  VS  KC',
    metricLabel: 'TON CHOIX · FNC',
  },
  {
    eyebrow: '02 · GAGNE DES FRAGS',
    title: 'CHAQUE BON CALL COMPTE.',
    copy: 'Un pronostic juste rapporte des Frags. Ils font progresser ton rang pendant toute la saison.',
    accent: '#37E6C5',
    icon: Zap,
    metric: '+17 FRAGS',
    metricLabel: 'CALL RÉUSSI',
  },
  {
    eyebrow: '03 · REJOINS TA FACTION',
    title: 'PROGRESSEZ ENSEMBLE.',
    copy: 'Soutiens ton équipe, agrandis sa communauté et fais évoluer sa relique collective.',
    accent: colors.volt,
    icon: Users,
    metric: '68 %',
    metricLabel: 'PROCHAIN PALIER',
  },
];

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

  function goBack() {
    selectionFeedback();
    updateDraft(Math.max(1, step - 1) as Step);
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

  function chooseMissingGame() {
    selectionFeedback();
    updateDraft(4, {
      favoriteGame: null,
      favoriteTeamId: null,
      favoriteTeamKey: null,
      missingTeam: '',
      missingGame: draft.missingGame || ' ',
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
      <AppAtmosphere />
      <View style={styles.shell}>
        <OnboardingHeader onBack={step > 1 ? goBack : undefined} step={step} />
        <View key={step} style={styles.page}>
          {step >= 1 && step <= 3 ? (
            <EducationStep content={EDUCATION[step - 1]} onNext={goForward} step={step} />
          ) : null}
          {step === 4 ? (
            <GameStep
              draft={draft}
              ready={gameReady}
              onChangeMissing={(value) => updateDraft(4, { favoriteGame: null, missingGame: value })}
              onMissing={chooseMissingGame}
              onNext={() => { impactFeedback(); updateDraft(5); }}
              onSelect={selectGame}
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
              preview={preview}
              saving={saving}
              onEmail={() => void openEmailAuth()}
              onOAuth={(provider) => void startOAuth(provider)}
            />
          ) : null}
        </View>
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
        <Image accessibilityLabel="GRIFF" accessibilityRole="image" resizeMode="contain" source={GRIFF_LOCKUP_SOURCE} style={styles.launchLogo} />
        <Text style={styles.logoBaseline}>L’ESPORT SE VIT ENSEMBLE</Text>
      </Animated.View>
    </View>
  );
}

function OnboardingHeader({ onBack, step }: { onBack?: () => void; step: Step }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {onBack ? (
          <Pressable accessibilityLabel="Revenir à l’étape précédente" accessibilityRole="button" onPress={onBack} style={styles.backCircle}>
            <ArrowLeft color={colors.text} size={20} strokeWidth={2.2} />
          </Pressable>
        ) : <GriffMark decorative size={34} />}
      </View>
      <View accessibilityLabel={`Étape ${step} sur 6`} style={styles.progress}>
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <View key={index} style={[styles.progressBar, index <= step && styles.progressBarActive]} />
        ))}
      </View>
      <Text style={styles.stepCount}>0{step}/06</Text>
    </View>
  );
}

function EducationStep({ content, onNext, step }: { content: (typeof EDUCATION)[number]; onNext: () => void; step: number }) {
  const Icon = content.icon;
  return (
    <View style={styles.educationPage}>
      <View style={styles.educationVisual}>
        <LinearGradient pointerEvents="none" colors={[`${content.accent}22`, 'rgba(8,15,21,.96)']} style={StyleSheet.absoluteFill} />
        <View style={[styles.orbit, { borderColor: `${content.accent}50` }]} />
        <View style={[styles.educationIcon, { borderColor: content.accent }]}>
          <Icon color={content.accent} size={42} strokeWidth={1.8} />
        </View>
        <Text style={[styles.metric, { color: content.accent }]}>{content.metric}</Text>
        <Text style={styles.metricLabel}>{content.metricLabel}</Text>
        {step === 1 ? (
          <View style={styles.versusDots}><View style={styles.teamDot} /><View style={[styles.teamDot, styles.teamDotBlue]} /></View>
        ) : null}
      </View>
      <View style={styles.copyBlock}>
        <Text style={[styles.eyebrow, { color: content.accent }]}>{content.eyebrow}</Text>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.copy}>{content.copy}</Text>
      </View>
      <PrimaryButton label={step === 3 ? 'Choisir mon jeu' : 'Continuer'} onPress={onNext} />
    </View>
  );
}

function GameStep({ draft, onChangeMissing, onMissing, onNext, onSelect, ready }: {
  draft: OnboardingDraft;
  onChangeMissing: (value: string) => void;
  onMissing: () => void;
  onNext: () => void;
  onSelect: (game: GameId) => void;
  ready: boolean;
}) {
  const missingMode = draft.favoriteGame === null && draft.missingGame.length > 0;
  return (
    <View style={styles.selectionPage}>
      <View style={styles.selectionHeading}>
        <Text style={styles.eyebrow}>TON UNIVERS</Text>
        <Text style={styles.title}>QUEL EST TON JEU FAVORI ?</Text>
        <Text style={styles.copy}>Il personnalisera tes matchs et ton classement. Tu pourras le modifier plus tard.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.selectionScroll} showsVerticalScrollIndicator={false}>
        {GAMES.map((game) => {
          const active = draft.favoriteGame === game.id;
          return (
            <Pressable key={game.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onSelect(game.id)} style={({ pressed }) => [styles.gameCard, active && styles.gameCardActive, pressed && styles.pressed]}>
              <Image resizeMode="cover" source={GAME_BACKGROUNDS[game.id]} style={[StyleSheet.absoluteFill, styles.gameImage]} />
              <LinearGradient pointerEvents="none" colors={['rgba(5,9,12,.92)', 'rgba(5,9,12,.30)']} end={{ x: 1, y: .5 }} start={{ x: 0, y: .5 }} style={StyleSheet.absoluteFill} />
              <View style={[styles.gameLogo, { borderColor: game.accent }]}><GameLogo color={game.accent} game={game.id} size={31} /></View>
              <View style={styles.gameText}>
                <Text style={styles.gameName}>{game.name}</Text>
                <Text style={styles.gameDetail}>{game.copy}</Text>
              </View>
              <ChoiceIndicator active={active} />
            </Pressable>
          );
        })}
        <MissingChoice active={missingMode} label="Je ne vois pas mon jeu" placeholder="Nom de ton jeu" value={missingMode ? draft.missingGame.trimStart() : ''} onChange={onChangeMissing} onPress={onMissing} />
      </ScrollView>
      <PrimaryButton disabled={!ready} label="Continuer" onPress={onNext} />
    </View>
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
  const missingMode = draft.favoriteTeamId === null && draft.missingTeam.length > 0;
  return (
    <View style={styles.selectionPage}>
      <View style={styles.selectionHeading}>
        <Text style={styles.eyebrow}>TA FACTION</Text>
        <Text style={styles.title}>QUELLE ÉQUIPE SOUTIENS-TU ?</Text>
        <Text style={styles.copy}>Ton équipe donne une identité à ton profil et t’unit à sa communauté.</Text>
      </View>
      {loading ? <View style={styles.centerState}><ActivityIndicator color={colors.volt} /><Text style={styles.stateText}>Chargement des équipes…</Text></View> : (
        <ScrollView contentContainerStyle={styles.teamGrid} showsVerticalScrollIndicator={false}>
          {organizations.map((organization, index) => {
            const active = draft.favoriteTeamKey === organization.key;
            const accent = `hsl(${(index * 47 + 194) % 360}, 68%, 58%)`;
            return (
              <Pressable key={organization.key} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onSelect(organization)} style={({ pressed }) => [styles.teamCard, active && styles.teamCardActive, pressed && styles.pressed]}>
                <TeamLogo accent={accent} name={organization.name} size={55} tag={organization.tag} uri={organization.logo} />
                <Text numberOfLines={2} style={styles.teamName}>{organization.name}</Text>
                <ChoiceIndicator active={active} compact />
              </Pressable>
            );
          })}
          <View style={styles.teamMissingCell}>
            <MissingChoice active={missingMode} compact label="Je ne vois pas mon équipe" placeholder="Nom de ton équipe" value={missingMode ? draft.missingTeam.trimStart() : ''} onChange={onChangeMissing} onPress={onMissing} />
          </View>
        </ScrollView>
      )}
      {error ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text> : null}
      <PrimaryButton disabled={!ready || loading} label="Continuer vers la connexion" onPress={onNext} />
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

function AuthStep({ error, loading, onEmail, onOAuth, preview, saving }: {
  error: string | null;
  loading: OAuthProvider | null;
  onEmail: () => void;
  onOAuth: (provider: OAuthProvider) => void;
  preview: boolean;
  saving: boolean;
}) {
  const disabled = saving || loading !== null;
  return (
    <ScrollView contentContainerStyle={styles.authPage} showsVerticalScrollIndicator={false}>
      <View style={styles.authBrand}><GriffLockup width={152} /></View>
      <View style={styles.authHeading}>
        <Text style={styles.eyebrow}>DERNIÈRE ÉTAPE</Text>
        <Text style={[styles.title, styles.authTitle]}>GARDE TA PROGRESSION.</Text>
        <Text style={[styles.copy, styles.authCopy]}>Crée ton compte pour retrouver tes calls, ton rang et ta faction sur tous tes appareils.</Text>
      </View>
      <View style={styles.providers}>
        <ProviderButton disabled={disabled} icon={<Apple color="#071016" size={23} fill="#071016" />} label="Continuer avec Apple" loading={loading === 'apple'} onPress={() => onOAuth('apple')} primary />
        <ProviderButton disabled={disabled} icon={<Text style={styles.googleLetter}>G</Text>} label="Continuer avec Google" loading={loading === 'google'} onPress={() => onOAuth('google')} />
        <ProviderButton disabled={disabled} icon={<Gamepad2 color="#B9C5FF" size={23} />} label="Continuer avec Discord" loading={loading === 'discord'} onPress={() => onOAuth('discord')} />
        <View style={styles.separator}><View style={styles.separatorLine} /><Text style={styles.separatorText}>OU</Text><View style={styles.separatorLine} /></View>
        <ProviderButton disabled={disabled} icon={<Mail color={colors.text} size={22} />} label="Continuer avec une adresse e-mail" loading={false} onPress={onEmail} />
      </View>
      {saving ? <View style={styles.savingRow}><ActivityIndicator color={colors.volt} /><Text style={styles.stateText}>Préparation de ton profil…</Text></View> : null}
      {error ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text> : null}
      {preview ? <Text style={styles.previewNote}>Aperçu : les boutons de connexion sont désactivés.</Text> : null}
      <View style={styles.securityRow}>
        <ShieldCheck color="#82919D" size={18} />
        <Text style={styles.securityText}>Aucune mise d’argent · compte privé par défaut</Text>
      </View>
      <Text style={styles.legal}>En continuant, tu acceptes les Conditions d’utilisation et la Politique de confidentialité de GRIFF.</Text>
    </ScrollView>
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

function PrimaryButton({ disabled = false, label, onPress }: { disabled?: boolean; label: string; onPress: () => void }) {
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
        colors={['#F3FF8D', colors.volt, '#BCCE20']}
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
  root: { flex: 1, overflow: 'hidden', backgroundColor: colors.atmosphereBottom },
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.atmosphereBottom },
  shell: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: spacing.md },
  page: { flex: 1 },
  header: { height: 62, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerSide: { width: 38, alignItems: 'flex-start' },
  backCircle: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#0D1820', borderWidth: 1, borderColor: '#263B49' },
  progress: { flex: 1, flexDirection: 'row', gap: 5 },
  progressBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#172833' },
  progressBarActive: { backgroundColor: colors.volt },
  stepCount: { width: 40, ...typography.label, color: '#73818B', textAlign: 'right' },
  logoRoot: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#05090C' },
  logoAura: { position: 'absolute', width: 520, height: 520, borderRadius: 260, transform: [{ scaleX: 1.2 }] },
  logoStage: { alignItems: 'center', gap: 24 },
  launchLogo: { width: 274, height: 74 },
  logoBaseline: { ...typography.label, color: '#7D8A94', letterSpacing: 3 },
  educationPage: { flex: 1, paddingBottom: 18, gap: 24 },
  educationVisual: { position: 'relative', overflow: 'hidden', minHeight: 335, marginTop: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 32, borderWidth: 1, borderColor: '#263B49', backgroundColor: '#091119' },
  orbit: { position: 'absolute', width: 250, height: 250, borderRadius: 125, borderWidth: 1 },
  educationIcon: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', borderRadius: 28, borderWidth: 1.5, backgroundColor: 'rgba(5,9,12,.86)' },
  metric: { marginTop: 22, fontFamily: fonts.display, fontSize: 31, lineHeight: 35, letterSpacing: 1 },
  metricLabel: { ...typography.label, marginTop: 5, color: '#96A2AC', letterSpacing: 1.2 },
  versusDots: { position: 'absolute', top: 24, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between' },
  teamDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#FF765D', boxShadow: '0 0 16px rgba(255,118,93,.75)' },
  teamDotBlue: { backgroundColor: '#35B8FF', boxShadow: '0 0 16px rgba(53,184,255,.75)' },
  copyBlock: { gap: 7 },
  eyebrow: { ...typography.label, color: colors.volt, letterSpacing: 1.6 },
  title: { ...typography.displayLarge, color: colors.text, letterSpacing: .2 },
  copy: { ...typography.body, color: '#939EA8', lineHeight: 22 },
  selectionPage: { flex: 1, paddingBottom: 18, gap: 14 },
  selectionHeading: { paddingTop: 10, gap: 6 },
  selectionScroll: { gap: 9, paddingVertical: 4, paddingBottom: 12 },
  gameCard: { position: 'relative', minHeight: 104, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: '#263B49', backgroundColor: '#0D171F' },
  gameCardActive: { borderColor: colors.volt, backgroundColor: '#111A14' },
  gameImage: { opacity: .72 },
  gameLogo: { width: 54, height: 54, zIndex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 17, borderWidth: 1, backgroundColor: 'rgba(4,8,11,.8)' },
  gameText: { flex: 1, zIndex: 1, minWidth: 0 },
  gameName: { ...typography.cardTitle, color: colors.text },
  gameDetail: { ...typography.label, marginTop: 4, color: '#8D99A3' },
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
  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4, paddingBottom: 12 },
  teamCard: { position: 'relative', width: '31.8%', minHeight: 126, alignItems: 'center', justifyContent: 'center', padding: 9, borderRadius: 18, borderWidth: 1, borderColor: '#263B49', backgroundColor: '#0D171F' },
  teamCardActive: { borderColor: colors.volt, backgroundColor: '#111A14' },
  teamName: { ...typography.label, minHeight: 31, marginTop: 8, color: colors.text, textAlign: 'center' },
  teamMissingCell: { width: '100%' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateText: { ...typography.body, color: '#89959E' },
  primaryButton: { zIndex: 20, elevation: 5, overflow: 'hidden', minHeight: 58, marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 20, borderRadius: 18, backgroundColor: colors.volt },
  primaryLabel: { ...typography.action, color: '#071016', letterSpacing: .3 },
  disabled: { opacity: .32 },
  pressed: { opacity: .76 },
  errorText: { ...typography.body, color: '#FF8A94' },
  authPage: { flexGrow: 1, paddingTop: 12, paddingBottom: 22 },
  authBrand: { alignItems: 'center', marginBottom: 30 },
  authHeading: { alignItems: 'center', gap: 7, marginBottom: 24 },
  authTitle: { textAlign: 'center' },
  authCopy: { maxWidth: 350, textAlign: 'center' },
  providers: { gap: 10 },
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
  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  securityText: { ...typography.label, color: '#82919D' },
  legal: { ...typography.caption, marginTop: 14, color: '#65727C', textAlign: 'center' },
});
