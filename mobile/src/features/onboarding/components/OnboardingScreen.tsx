import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { AppAtmosphere } from '@/src/components/layout/AppAtmosphere';
import { createOAuthSignInUrl, type OAuthProvider } from '@/src/features/auth/api';
import { authErrorMessage } from '@/src/features/auth/messages';
import { accountConfirmationRedirect } from '@/src/features/auth/redirects';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { errorFeedback, impactFeedback, selectionFeedback, successFeedback } from '@/src/lib/feedback';
import { useAuth } from '@/src/providers/AuthProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts } from '@/src/theme';

import { loadTeamOrganizations, saveOnboarding } from '../api';
import { GAMES } from '../constants';
import {
  clearOnboardingDraft,
  EMPTY_ONBOARDING_DRAFT,
  markOnboardingSeen,
  readOnboardingDraft,
  writeOnboardingDraft,
} from '../draft';
import type { GameId, OnboardingDraft, TeamOrganization } from '../types';
import { teamIdForOrganization } from '../utils';
import ReferenceOnboardingScreen from './ReferenceOnboardingScreen';

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const RIVALRY_MARK_SOURCE = require('../../../../assets/brand/griff-rivalry-mark.png');

export default function OnboardingScreen({ preview = false, previewStep }: { preview?: boolean; previewStep?: number }) {
  const { profile, refreshProfile, session, status } = useAuth();
  const { refresh: refreshEconomy } = useEconomy();
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
    let active = true;
    readOnboardingDraft()
      .then((saved) => {
        if (!active) return;
        const requestedStep = initialPreviewStepRef.current ?? saved.step;
        const safeStep = Math.min(6, Math.max(0, requestedStep)) as Step;
        const restored = preview ? {
          ...saved,
          favoriteGame: 'lol' as GameId,
          favoriteTeamKey: 'karmine corp',
          favoriteTeamId: 'lol-kc',
          missingGame: '',
          missingTeam: '',
        } : saved;
        setDraft({ ...restored, step: safeStep });
        setStep(safeStep);
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
    return () => { active = false; };
  }, [preview]);

  useEffect(() => {
    if (!hydrated || step !== 0) return;
    if (preview && previewStep === 0) return;
    const timer = setTimeout(() => updateDraft(1), preview ? 250 : 900);
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

  useEffect(() => {
    if (!hydrated || preview || step !== 5 || draft.favoriteTeamId || draft.missingTeam.trim()) return;
    const karmineCorp = organizations.find((organization) => organization.name === 'Karmine Corp');
    if (!karmineCorp) return;
    updateDraft(5, {
      favoriteTeamKey: karmineCorp.key,
      favoriteTeamId: teamIdForOrganization(karmineCorp, draft.favoriteGame ? [draft.favoriteGame] : karmineCorp.games),
      missingTeam: '',
    });
  }, [draft.favoriteGame, draft.favoriteTeamId, draft.missingTeam, hydrated, organizations, preview, step, updateDraft]);

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
    if (step === 3 && !draft.favoriteGame) {
      updateDraft(4, {
        favoriteGame: 'lol',
        favoriteTeamId: null,
        favoriteTeamKey: null,
        missingGame: '',
        missingTeam: '',
      });
      return;
    }
    updateDraft(Math.min(6, step + 1) as Step);
  }

  function goBack() {
    if (step <= 1) return;
    selectionFeedback();
    updateDraft((step - 1) as Step);
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

  function selectMissingTeam(name: string) {
    selectionFeedback();
    updateDraft(5, {
      favoriteTeamKey: name.toLocaleLowerCase('fr'),
      favoriteTeamId: null,
      missingTeam: name,
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

  if (step === 0) return <LogoStep />;

  const gameReady = Boolean(draft.favoriteGame || draft.missingGame.trim().length >= 2);
  const teamReady = Boolean(draft.favoriteTeamId || draft.missingTeam.trim().length >= 2);

  return (
    <ReferenceOnboardingScreen
      draft={draft}
      error={error}
      gameReady={gameReady}
      loadingTeams={loadingTeams}
      organizations={organizations}
      preview={preview}
      step={step}
      teamReady={teamReady}
      onAdvance={goForward}
      onBack={goBack}
      onEmail={() => void openEmailAuth()}
      onGameNext={() => { impactFeedback(); updateDraft(5); }}
      onOAuth={(provider) => void startOAuth(provider)}
      onSelectGame={selectGame}
      onSelectMissingGame={(value) => updateDraft(4, {
        favoriteGame: null,
        favoriteTeamId: null,
        favoriteTeamKey: null,
        missingGame: value,
        missingTeam: '',
      })}
      onSelectMissingTeam={selectMissingTeam}
      onSelectTeam={selectTeam}
      onTeamNext={() => { impactFeedback(); updateDraft(6); void markOnboardingSeen(); }}
    />
  );
}

function LogoStep() {
  return (
    <View style={styles.logoRoot}>
      <AppAtmosphere />
      <View style={styles.logoLockup}>
        <Image resizeMode="contain" source={RIVALRY_MARK_SOURCE} style={styles.logoMark} />
        <Text style={styles.logoWord}>GRIFF</Text>
      </View>
      <Text style={styles.logoBaseline}>L’ESPORT SE VIT ENSEMBLE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.atmosphereBottom },
  logoRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: '#05090C' },
  logoLockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { width: 88, height: 88 },
  logoWord: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 54, fontStyle: 'italic' },
  logoBaseline: { color: '#7D8A94', fontFamily: fonts.bold, fontSize: 12, letterSpacing: 3 },
});
