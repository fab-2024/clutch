import { router } from 'expo-router';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import CloudUpload from 'lucide-react-native/icons/cloud-upload';
import Save from 'lucide-react-native/icons/save';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import type { ClutchProfile } from '@/src/features/auth/types';
import { signOut } from '@/src/features/auth/api';
import { loadTeamOrganizations } from '@/src/features/onboarding/api';
import { GAMES } from '@/src/features/onboarding/constants';
import type { GameId, TeamOrganization } from '@/src/features/onboarding/types';
import { teamIdForOrganization } from '@/src/features/onboarding/utils';
import {
  deactivateCurrentDevicePushToken,
  loadNotificationPreferences,
  requestAndRegisterPushToken,
  saveNotificationPreferences,
  detectedTimezone,
  type NotificationPreferences,
} from '@/src/features/notifications';
import { errorFeedback, successFeedback } from '@/src/lib/feedback';
import { useAuth } from '@/src/providers/AuthProvider';
import { useSnackbar } from '@/src/providers/SnackbarProvider';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

import { saveFavoriteTeam, saveProfilePreferences } from '../api';
import { useQueuedAutosave, type AutosaveStatus } from '../hooks/useQueuedAutosave';
import { FavoriteTeamConfirmationSheet } from './FavoriteTeamConfirmationSheet';

export type ProfileSettingsPreviewState = {
  notifications: NotificationPreferences;
  organizations: TeamOrganization[];
  profile: ClutchProfile;
  saveDelayMs?: number;
};

type ProfileSettingsScreenProps = {
  previewState?: ProfileSettingsPreviewState;
};

type ProfilePreferencesDraft = {
  games: GameId[];
  publicProfile: boolean;
};

export default function ProfileSettingsScreen({ previewState }: ProfileSettingsScreenProps = {}) {
  const { profile, refreshProfile, session } = useAuth();
  const { isCompactWidth, isShortLandscape } = useResponsiveLayout();
  const { showSnackbar } = useSnackbar();
  const activeProfile = previewState?.profile ?? profile;
  const userId = previewState?.profile.id ?? session?.user.id;
  const initialGames = GAMES.map((game) => game.id).filter((id) => activeProfile?.jeux_suivis.includes(id));
  const initialProfileDraft = { games: initialGames, publicProfile: activeProfile?.profil_public !== false };
  const [games, setGames] = useState<GameId[]>(() => initialGames);
  const [organizations, setOrganizations] = useState<TeamOrganization[]>(() => previewState?.organizations ?? []);
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null);
  const [pendingOrganization, setPendingOrganization] = useState<TeamOrganization | null>(null);
  const [publicProfile, setPublicProfile] = useState(activeProfile?.profil_public !== false);
  const [loadingTeams, setLoadingTeams] = useState(!previewState);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(previewState?.notifications ?? null);
  const [loadingNotifications, setLoadingNotifications] = useState(!previewState);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [focusedCard, setFocusedCard] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const teamRequest = useRef(0);
  const teamReturnFocusRef = useRef<View | null>(null);
  const teamCardRefs = useRef(new Map<string, View>());
  const pointerFocus = useRef(false);
  const profileDraftRef = useRef<ProfilePreferencesDraft>(initialProfileDraft);

  const profileAutosave = useQueuedAutosave({
    initialValue: initialProfileDraft,
    onError: (caught, retry) => {
      errorFeedback();
      showSnackbar({
        action: {
          accessibilityLabel: 'Réessayer la synchronisation du profil',
          label: 'RÉESSAYER',
          onPress: retry,
        },
        message: settingsError(caught),
        tone: 'error',
      });
    },
    save: async (draft: ProfilePreferencesDraft) => {
      if (previewState) {
        await previewSaveDelay(previewState.saveDelayMs);
        return draft;
      }
      if (!userId) throw new Error('La session ne permet plus de modifier ce profil.');
      const result = await saveProfilePreferences(userId, draft.games, draft.publicProfile);
      void refreshProfile().catch(() => undefined);
      return result;
    },
    signature: profilePreferencesSignature,
  });

  const notificationAutosave = useQueuedAutosave({
    initialValue: previewState?.notifications ?? null,
    onError: (caught, retry) => {
      errorFeedback();
      showSnackbar({
        action: {
          accessibilityLabel: 'Réessayer la synchronisation des notifications',
          label: 'RÉESSAYER',
          onPress: retry,
        },
        message: notificationSettingsError(caught),
        tone: 'error',
      });
    },
    save: async (preferences: NotificationPreferences | null) => {
      if (!preferences) throw new Error('Les préférences de notification ne sont pas disponibles.');
      if (previewState) {
        await previewSaveDelay(previewState.saveDelayMs);
        return preferences;
      }
      return saveNotificationPreferences(preferences);
    },
    signature: notificationSignature,
  });
  const resetNotificationAutosave = notificationAutosave.reset;

  useEffect(() => {
    if (previewState) {
      const localized = { ...previewState.notifications, timezone: detectedTimezone() };
      setNotificationPreferences(localized);
      resetNotificationAutosave(localized);
      setLoadingNotifications(false);
      return;
    }

    let active = true;
    setLoadingNotifications(true);
    loadNotificationPreferences()
      .then((preferences) => {
        if (!active) return;
        const localized = { ...preferences, timezone: detectedTimezone() };
        setNotificationPreferences(localized);
        resetNotificationAutosave(localized);
      })
      .catch(() => {
        if (active) setError('Impossible de charger les préférences de notification.');
      })
      .finally(() => {
        if (active) setLoadingNotifications(false);
      });
    return () => { active = false; };
  }, [previewState, resetNotificationAutosave]);

  useEffect(() => {
    const requestId = ++teamRequest.current;
    if (!games.length) {
      setOrganizations([]);
      setSelectedOrganization(null);
      setLoadingTeams(false);
      return;
    }

    if (previewState) {
      const next = previewState.organizations.filter((organization) => (
        organization.games.some((game) => games.includes(game))
      ));
      setOrganizations(next);
      setSelectedOrganization((current) => {
        if (current && next.some((organization) => organization.key === current)) return current;
        return next.find((organization) => organization.teams.some((team) => team.id === activeProfile?.equipe_favorite_id))?.key ?? null;
      });
      setLoadingTeams(false);
      return;
    }

    setLoadingTeams(true);
    setError(null);
    loadTeamOrganizations(games)
      .then((next) => {
        if (requestId !== teamRequest.current) return;
        setOrganizations(next);
        setSelectedOrganization((current) => {
          if (current && next.some((organization) => organization.key === current)) return current;
          return next.find((organization) => organization.teams.some((team) => team.id === activeProfile?.equipe_favorite_id))?.key ?? null;
        });
      })
      .catch(() => {
        if (requestId !== teamRequest.current) return;
        setOrganizations([]);
        setSelectedOrganization(null);
        setError('Impossible de charger les équipes pour le moment.');
      })
      .finally(() => {
        if (requestId === teamRequest.current) setLoadingTeams(false);
      });
  }, [activeProfile?.equipe_favorite_id, games, previewState]);

  const currentOrganization = organizations.find((organization) => organization.key === selectedOrganization) ?? null;
  const syncStatus = aggregateAutosaveStatus(profileAutosave.status, notificationAutosave.status);

  function toggleGame(id: GameId) {
    const nextGames = games.includes(id)
      ? games.filter((game) => game !== id)
      : [...games, id];
    const draft = { ...profileDraftRef.current, games: nextGames };
    profileDraftRef.current = draft;
    setGames(nextGames);
    if (nextGames.length) profileAutosave.commit(draft);
  }

  function toggleVisibility() {
    const draft = { ...profileDraftRef.current, publicProfile: !profileDraftRef.current.publicProfile };
    profileDraftRef.current = draft;
    setPublicProfile(draft.publicProfile);
    if (draft.games.length) profileAutosave.commit(draft);
  }

  function toggleNotification(key: NotificationToggleKey) {
    setPushMessage(null);
    setNotificationPreferences((current) => {
      if (!current) return current;
      const next = { ...current, [key]: !current[key] };
      notificationAutosave.commit(next);
      return next;
    });
  }

  function openTeamConfirmation(organization: TeamOrganization) {
    if (organization.key === selectedOrganization || teamSaving) return;
    teamReturnFocusRef.current = teamCardRefs.current.get(organization.key) ?? null;
    setTeamError(null);
    setPendingOrganization(organization);
  }

  function handleCardFocus(key: string) {
    if (!pointerFocus.current) setFocusedCard(key);
  }

  function handleCardBlur(key: string) {
    setFocusedCard((current) => current === key ? null : current);
  }

  function closeTeamConfirmation() {
    if (teamSaving) return;
    setPendingOrganization(null);
    setTeamError(null);
  }

  async function confirmTeamChange() {
    if (!pendingOrganization || !userId || teamSaving) return;
    const teamId = teamIdForOrganization(pendingOrganization, games);
    if (!teamId) return;
    setTeamSaving(true);
    setTeamError(null);
    try {
      if (previewState) await previewSaveDelay(previewState.saveDelayMs);
      else await saveFavoriteTeam(userId, teamId);
      setSelectedOrganization(pendingOrganization.key);
      setPendingOrganization(null);
      successFeedback();
      showSnackbar({
        message: `${pendingOrganization.name} devient ta faction pour les 7 prochains jours.`,
        tone: 'success',
      });
      if (!previewState) void refreshProfile().catch(() => undefined);
    } catch (caught) {
      errorFeedback();
      setTeamError(settingsError(caught));
    } finally {
      setTeamSaving(false);
    }
  }

  async function enablePushOnDevice() {
    if (pushBusy) return;
    setPushBusy(true);
    setPushMessage(null);
    const result = await requestAndRegisterPushToken();
    if (result.status === 'registered') {
      setNotificationPreferences((current) => current ? { ...current, activeDevices: result.activeDevices } : current);
      setPushMessage('APPAREIL ENREGISTRÉ · LES ALERTES GRIFF SONT ACTIVES.');
    } else if (result.status === 'denied') {
      setPushMessage('AUTORISATION REFUSÉE · ACTIVE-LA DANS LES RÉGLAGES DU TÉLÉPHONE.');
    } else if (result.status === 'unconfigured') {
      setPushMessage('LA BUILD MOBILE DOIT D’ABORD ÊTRE LIÉE À UN PROJET EAS.');
    } else if (result.status === 'unsupported') {
      setPushMessage('L’APERÇU WEB SYNCHRONISE LES CHOIX, PAS LES JETONS PUSH.');
    } else {
      setPushMessage(result.message.toUpperCase());
    }
    setPushBusy(false);
  }

  async function leaveSession() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      await deactivateCurrentDevicePushToken();
      await signOut();
    } catch {
      setSignOutError('Déconnexion impossible. Vérifie ta connexion puis réessaie.');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen>
      <ScrollView style={styles.root} contentContainerStyle={[styles.content, isShortLandscape && styles.contentLandscape]} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, isShortLandscape && styles.headerLandscape]}>
          <Pressable accessibilityLabel="Revenir au profil" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>← MOI</Text></Pressable>
          <View style={styles.headerMark}><Text style={styles.headerMarkText}>⚙</Text></View>
        </View>

        <View style={[styles.introStatus, isShortLandscape && styles.introStatusLandscape]}>
          <View style={[styles.intro, isShortLandscape && styles.introLandscape]}>
            <Text style={styles.eyebrow}>MOI // PARAMÈTRES</Text>
            <Text style={styles.title}>RÈGLE TON TERRAIN.</Text>
            <Text style={styles.subtitle}>Tes choix alimentent le Hub, les matchs proposés et l’identité publique de ton profil.</Text>
          </View>

          <View style={[styles.syncWrap, isShortLandscape && styles.syncWrapLandscape]}>
            <AutosaveIndicator
              blocked={!games.length}
              compact={isShortLandscape}
              onRetry={() => {
                if (profileAutosave.status === 'error') profileAutosave.retry();
                if (notificationAutosave.status === 'error') notificationAutosave.retry();
              }}
              status={syncStatus}
            />
          </View>
        </View>
        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}

        <View style={styles.section}>
          <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>01 // JEUX SUIVIS</Text><Text style={styles.sectionTitle}>TES TERRAINS.</Text></View><Text style={styles.sectionMeta}>{games.length}/3</Text></View>
          <View style={styles.gamesGrid}>
            {GAMES.map((game) => {
              const active = games.includes(game.id);
              const focusKey = `game:${game.id}`;
              return (
                <Pressable
                  key={game.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  onBlur={() => handleCardBlur(focusKey)}
                  onFocus={() => handleCardFocus(focusKey)}
                  onPointerDown={() => {
                    pointerFocus.current = true;
                    setFocusedCard(null);
                  }}
                  onPointerUp={() => { pointerFocus.current = false; }}
                  onPress={() => toggleGame(game.id)}
                  onPressIn={() => { pointerFocus.current = true; }}
                  onPressOut={() => { pointerFocus.current = false; }}
                  style={({ pressed }) => [styles.gameCard, active && styles.gameCardActive, focusedCard === focusKey && styles.cardFocused, pressed && styles.pressed]}
                >
                  <View style={[styles.gameMark, { borderColor: game.accent }, active && { backgroundColor: `${game.accent}22` }]}><Text style={[styles.gameCode, { color: game.accent }]}>{game.code}</Text></View>
                  <Text style={styles.gameShort}>{game.short}</Text>
                  <Text numberOfLines={isCompactWidth ? 2 : 1} style={[styles.gameName, isCompactWidth && styles.gameNameCompact]}>{game.name}</Text>
                  <Text style={[styles.gameState, active && styles.gameStateActive]}>{active ? 'SUIVI ✓' : 'AJOUTER'}</Text>
                </Pressable>
              );
            })}
          </View>
          {!games.length ? <Text style={styles.validation}>Choisis au moins un jeu pour continuer.</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>02 // ÉQUIPE FAVORITE</Text><Text style={styles.sectionTitle}>TA COULEUR.</Text></View></View>
          <Text style={styles.sectionCopy}>Ce choix n’est jamais enregistré automatiquement : une confirmation explicite déclenche le verrouillage de 7 jours.</Text>
          {loadingTeams ? <View style={styles.teamSkeleton} /> : organizations.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamRail}>
              {organizations.map((organization) => {
                const active = selectedOrganization === organization.key;
                const focusKey = `team:${organization.key}`;
                return (
                  <Pressable
                    key={organization.key}
                    accessibilityHint={active ? 'Faction actuellement active' : 'Ouvre la confirmation du verrouillage de 7 jours'}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    onBlur={() => handleCardBlur(focusKey)}
                    onFocus={() => handleCardFocus(focusKey)}
                    onPointerDown={() => {
                      pointerFocus.current = true;
                      setFocusedCard(null);
                    }}
                    onPointerUp={() => { pointerFocus.current = false; }}
                    onPress={() => openTeamConfirmation(organization)}
                    onPressIn={() => { pointerFocus.current = true; }}
                    onPressOut={() => { pointerFocus.current = false; }}
                    ref={(node) => {
                      if (node) teamCardRefs.current.set(organization.key, node);
                      else teamCardRefs.current.delete(organization.key);
                    }}
                    style={({ pressed }) => [styles.teamCard, active && styles.teamCardActive, focusedCard === focusKey && styles.cardFocused, pressed && styles.pressed]}
                  >
                    <View style={[styles.teamMark, active && styles.teamMarkActive]}><Text style={[styles.teamTag, active && styles.teamTagActive]}>{organization.tag.slice(0, 4)}</Text></View>
                    <Text numberOfLines={2} style={styles.teamName}>{organization.name}</Text>
                    <Text style={[styles.teamGames, active && styles.teamGamesActive]}>{organization.games.map(gameLabel).join(' · ')}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : games.length ? <Text style={styles.validation}>Aucune équipe disponible pour cette sélection.</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>03 // VISIBILITÉ</Text><Text style={styles.sectionTitle}>TON PROFIL.</Text></View></View>
          <Pressable
            accessibilityLabel="Profil public"
            accessibilityRole="switch"
            accessibilityState={{ checked: publicProfile }}
            onPress={toggleVisibility}
            style={({ pressed }) => [styles.visibilityCard, pressed && styles.pressed]}
          >
            <View style={styles.visibilityCopy}><Text style={styles.visibilityTitle}>{publicProfile ? 'PROFIL PUBLIC' : 'PROFIL PRIVÉ'}</Text><Text style={styles.visibilityMeta}>{publicProfile ? 'Les joueurs peuvent ouvrir ton identité GRIFF.' : 'Toi seul peux consulter ton profil complet.'}</Text></View>
            <View style={[styles.switchTrack, publicProfile && styles.switchTrackActive]}><View style={[styles.switchThumb, publicProfile && styles.switchThumbActive]} /></View>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View><Text style={styles.sectionEyebrow}>04 // NOTIFICATIONS</Text><Text style={styles.sectionTitle}>SEULEMENT QUAND ÇA COMPTE.</Text></View>
            <Text style={styles.sectionMeta}>{notificationPreferences?.activeDevices ?? 0} APP.</Text>
          </View>
          <Text style={styles.sectionCopy}>Aucun rappel générique : chaque alerte correspond à un match, un verdict ou une progression réelle. Fuseau · {notificationPreferences?.timezone ?? detectedTimezone()}</Text>

          {loadingNotifications ? <View style={styles.notificationSkeleton} /> : notificationPreferences ? (
            <View style={styles.notificationCard}>
              <Text style={styles.notificationGroup}>MATCHS</Text>
              <NotificationToggle label="Verrouillage imminent" detail="15 min avant un marché pertinent" enabled={notificationPreferences.lockImminent} onPress={() => toggleNotification('lockImminent')} />
              <NotificationToggle label="Début du match" detail="Quand une affiche suivie commence" enabled={notificationPreferences.matchStart} onPress={() => toggleNotification('matchStart')} />
              <NotificationToggle label="Verdict" detail="Quand les Frags sont définitivement réglés" enabled={notificationPreferences.verdict} onPress={() => toggleNotification('verdict')} />
              <Text style={[styles.notificationGroup, styles.notificationGroupSpaced]}>PROGRESSION & SOCIAL</Text>
              <NotificationToggle label="Promotion" detail="Seulement lors d’un vrai changement de grade" enabled={notificationPreferences.promotion} onPress={() => toggleNotification('promotion')} />
              <NotificationToggle label="Mutation" detail="Quand la relique de ta faction évolue" enabled={notificationPreferences.mutation} onPress={() => toggleNotification('mutation')} />
              <NotificationToggle label="Duel reçu" detail="Quand un ami te cible sur un match classé" enabled={notificationPreferences.duelReceived} onPress={() => toggleNotification('duelReceived')} />
            </View>
          ) : null}

          <View style={styles.deviceCard}>
            <View style={styles.deviceCopy}>
              <Text style={styles.deviceTitle}>{Platform.OS === 'web' ? 'APERÇU WEB' : 'CET APPAREIL'}</Text>
              <Text style={styles.deviceMeta}>{Platform.OS === 'web' ? 'Tes choix sont enregistrés ici. Le jeton push s’active depuis la build iPhone ou Android.' : notificationPreferences?.activeDevices ? `${notificationPreferences.activeDevices} appareil${notificationPreferences.activeDevices > 1 ? 's' : ''} actif${notificationPreferences.activeDevices > 1 ? 's' : ''}.` : 'Autorise GRIFF à recevoir les événements sélectionnés.'}</Text>
            </View>
            {Platform.OS !== 'web' ? <Pressable accessibilityRole="button" disabled={pushBusy} onPress={() => void enablePushOnDevice()} style={({ pressed }) => [styles.deviceButton, (pressed || pushBusy) && styles.pressed]}><Text style={styles.deviceButtonText}>{pushBusy ? 'ACTIVATION…' : notificationPreferences?.activeDevices ? 'RESYNCHRONISER' : 'ACTIVER'}</Text></Pressable> : null}
          </View>
          {pushMessage ? <Text style={styles.pushMessage}>{pushMessage}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>05 // COMPTE & DONNÉES</Text><Text style={styles.sectionTitle}>TU GARDES LA MAIN.</Text></View></View>
          <View style={styles.accountLinks}>
            <AccountLink label="Confidentialité, sécurité et blocages" onPress={() => router.push('/settings/safety')} />
            <AccountLink label="Compte, données et suppression" onPress={() => router.push('/settings/account')} />
            <AccountLink label="Politique de confidentialité" onPress={() => router.push('/legal/privacy')} />
            <AccountLink label="Conditions d’utilisation" onPress={() => router.push('/legal/terms')} />
            <AccountLink label="Support" onPress={() => router.push('/support')} />
          </View>
          <Pressable
            accessibilityLabel="Se déconnecter"
            accessibilityRole="button"
            accessibilityState={{ busy: signingOut, disabled: signingOut }}
            disabled={signingOut}
            onPress={() => void leaveSession()}
            style={({ pressed }) => [styles.logout, signingOut && styles.disabled, pressed && !signingOut && styles.pressed]}
          >
            <Text style={styles.logoutText}>{signingOut ? 'DÉCONNEXION…' : 'SE DÉCONNECTER'}</Text>
            <Text style={styles.logoutArrow}>→</Text>
          </Pressable>
          {signOutError ? <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.signOutError}>{signOutError}</Text> : null}
        </View>
      </ScrollView>

      <FavoriteTeamConfirmationSheet
        busy={teamSaving}
        currentOrganization={currentOrganization}
        error={teamError}
        onClose={closeTeamConfirmation}
        onConfirm={() => void confirmTeamChange()}
        organization={pendingOrganization}
        returnFocusRef={teamReturnFocusRef}
      />
    </Screen>
  );
}

function settingsError(caught: unknown) {
  const message = caught instanceof Error ? caught.message : '';
  if (message.includes('Changement de faction bloqué')) return message;
  if (message.toLowerCase().includes('row-level security')) return 'La session ne permet plus de modifier ce profil. Reconnecte-toi puis réessaie.';
  return message || 'Impossible d’enregistrer les paramètres.';
}

function notificationSettingsError(caught: unknown) {
  const message = caught instanceof Error ? caught.message : '';
  return message || 'Les préférences de notification n’ont pas pu être synchronisées.';
}

function profilePreferencesSignature(value: ProfilePreferencesDraft) {
  return `${[...value.games].sort().join('|')}::${value.publicProfile}`;
}

function aggregateAutosaveStatus(...statuses: AutosaveStatus[]): AutosaveStatus {
  if (statuses.includes('error')) return 'error';
  if (statuses.includes('saving')) return 'saving';
  if (statuses.includes('saved')) return 'saved';
  return 'idle';
}

async function previewSaveDelay(duration = 520) {
  await new Promise((resolve) => setTimeout(resolve, duration));
}

function gameLabel(game: GameId) {
  if (game === 'valorant') return 'VAL';
  if (game === 'rocket_league') return 'RL';
  return game.toUpperCase();
}

type NotificationToggleKey = 'lockImminent' | 'matchStart' | 'verdict' | 'promotion' | 'mutation' | 'duelReceived';

function notificationSignature(preferences: NotificationPreferences | null) {
  if (!preferences) return '';
  return [
    preferences.timezone,
    preferences.lockImminent,
    preferences.matchStart,
    preferences.verdict,
    preferences.promotion,
    preferences.mutation,
    preferences.duelReceived,
  ].join('|');
}

function AutosaveIndicator({
  blocked,
  compact = false,
  onRetry,
  status,
}: {
  blocked: boolean;
  compact?: boolean;
  onRetry: () => void;
  status: AutosaveStatus;
}) {
  const presentation = blocked
    ? { label: 'CHOISIS AU MOINS UN JEU', tone: 'error' as const }
    : status === 'error'
      ? { label: 'ÉCHEC D’ENREGISTREMENT', tone: 'error' as const }
      : status === 'saving'
        ? { label: 'ENREGISTREMENT…', tone: 'saving' as const }
        : status === 'saved'
          ? { label: 'ENREGISTRÉ', tone: 'saved' as const }
          : { label: 'ENREGISTREMENT AUTO ACTIF', tone: 'idle' as const };
  const content = (
    <>
      <AutosaveIcon tone={presentation.tone} />
      <Text numberOfLines={compact ? 2 : 1} style={[styles.syncLabel, presentation.tone === 'error' && styles.syncLabelError]}>{presentation.label}</Text>
      {presentation.tone === 'error' && !blocked ? <Text style={styles.syncRetry}>RÉESSAYER</Text> : null}
    </>
  );

  if (presentation.tone === 'error' && !blocked) {
    return (
      <Pressable
        accessibilityLabel="Synchronisation interrompue, réessayer"
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.syncStatus, compact && styles.syncStatusLandscape, styles.syncStatusError, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      accessible
      accessibilityLabel={presentation.label}
      style={[styles.syncStatus, compact && styles.syncStatusLandscape, blocked && styles.syncStatusError]}
    >
      {content}
    </View>
  );
}

function AutosaveIcon({ tone }: { tone: 'error' | 'idle' | 'saved' | 'saving' }) {
  const iconProps = { size: 16, strokeWidth: 2.2 };
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.syncIcon}>
      {tone === 'error' ? <TriangleAlert {...iconProps} color={colors.danger} /> : null}
      {tone === 'saving' ? <CloudUpload {...iconProps} color={colors.info} /> : null}
      {tone === 'saved' ? <CircleCheck {...iconProps} color={colors.success} /> : null}
      {tone === 'idle' ? <Save {...iconProps} color={colors.textMuted} /> : null}
    </View>
  );
}

function NotificationToggle({
  detail,
  enabled,
  label,
  onPress,
}: {
  detail: string;
  enabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      onPress={onPress}
      style={({ pressed }) => [styles.notificationRow, pressed && styles.pressed]}
    >
      <View style={styles.notificationCopy}>
        <Text style={styles.notificationTitle}>{label}</Text>
        <Text style={styles.notificationDetail}>{detail}</Text>
      </View>
      <View style={[styles.switchTrack, enabled && styles.switchTrackActive]}><View style={[styles.switchThumb, enabled && styles.switchThumbActive]} /></View>
    </Pressable>
  );
}

function AccountLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.accountLink, pressed && styles.pressed]}>
      <Text style={styles.accountLinkLabel}>{label}</Text><Text style={styles.accountLinkArrow}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: spacing.md, paddingBottom: 72, gap: 25 },
  contentLandscape: { maxWidth: layout.wideContentMaxWidth, paddingBottom: 40, gap: 16 },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#171D23' },
  headerLandscape: { minHeight: 56 },
  back: { minHeight: 38, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#28313A' },
  backText: { ...typography.action, color: colors.text, letterSpacing: .4 },
  headerMark: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt }, headerMarkText: { color: '#080A0C', fontSize: 17, fontWeight: '900' },
  introStatus: { gap: 25 },
  introStatusLandscape: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  intro: { gap: 8 },
  introLandscape: { flex: 1, minWidth: 0 },
  syncWrap: { width: '100%' },
  syncWrapLandscape: { width: 210, flexShrink: 0 },
  eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.1 }, title: { ...typography.displayMedium, maxWidth: 360, color: colors.text }, subtitle: { ...typography.body, maxWidth: 360, color: colors.textMuted },
  syncStatus: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: radius.md, backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.borderSubtle },
  syncStatusLandscape: { minHeight: 52 },
  syncStatusError: { backgroundColor: '#1A1012', borderColor: '#4A2027' },
  syncIcon: { width: 18, alignItems: 'center', justifyContent: 'center' },
  syncLabel: { ...typography.metadata, flex: 1, color: colors.textSecondary, letterSpacing: .25 },
  syncLabelError: { color: '#FF9AA2' },
  syncRetry: { ...typography.action, color: colors.volt },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' }, errorText: { ...typography.body, color: '#FF9AA2' },
  section: { gap: 12 }, sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }, sectionEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 }, sectionTitle: { ...typography.sectionTitle, marginTop: 4, color: colors.text }, sectionMeta: { ...typography.label, color: colors.textMuted }, sectionCopy: { ...typography.body, color: colors.textMuted },
  gamesGrid: { flexDirection: 'row', gap: 8 },
  gameCard: { flex: 1, minHeight: 170, padding: 11, borderRadius: 21, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, outlineStyle: 'solid', outlineWidth: 2, outlineColor: 'transparent' }, gameCardActive: { backgroundColor: '#11170E', borderColor: '#48541E' },
  gameMark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: '#0A0F14' }, gameCode: { ...typography.cardTitle }, gameShort: { ...typography.bodyStrong, marginTop: 15, color: colors.text }, gameName: { ...typography.caption, marginTop: 3, color: colors.textMuted }, gameNameCompact: { minHeight: 28 }, gameState: { ...typography.label, marginTop: 'auto', color: colors.textMuted, letterSpacing: .3 }, gameStateActive: { color: colors.volt },
  validation: { ...typography.caption, color: '#FF9AA2' },
  teamRail: { gap: 9, paddingRight: spacing.md }, teamSkeleton: { height: 182, borderRadius: 24, backgroundColor: '#10161D' },
  teamCard: { width: 154, minHeight: 182, padding: 13, borderRadius: 23, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, outlineStyle: 'solid', outlineWidth: 2, outlineColor: 'transparent' }, teamCardActive: { backgroundColor: '#11170E', borderColor: '#48541E' },
  cardFocused: { outlineColor: colors.focus, outlineOffset: 2 },
  teamMark: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111820', borderWidth: 1, borderColor: '#303A43' }, teamMarkActive: { backgroundColor: colors.volt, borderColor: colors.volt }, teamTag: { ...typography.action, color: colors.text }, teamTagActive: { color: '#080A0C' }, teamName: { ...typography.bodyStrong, marginTop: 16, color: colors.text }, teamGames: { ...typography.label, marginTop: 'auto', color: colors.textMuted }, teamGamesActive: { color: colors.volt },
  visibilityCard: { minHeight: 116, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 15, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, visibilityCopy: { flex: 1, minWidth: 0 }, visibilityTitle: { ...typography.cardTitle, color: colors.text }, visibilityMeta: { ...typography.body, marginTop: 5, color: colors.textMuted },
  notificationSkeleton: { height: 390, borderRadius: 24, backgroundColor: '#10161D' },
  notificationCard: { overflow: 'hidden', padding: 14, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  notificationGroup: { ...typography.eyebrow, marginBottom: 5, color: colors.volt, letterSpacing: .8 },
  notificationGroupSpaced: { marginTop: 14 },
  notificationRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1, borderBottomColor: '#182028' },
  notificationCopy: { flex: 1, minWidth: 0 },
  notificationTitle: { ...typography.bodyStrong, color: colors.text },
  notificationDetail: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  deviceCard: { minHeight: 92, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 21, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#3D491D' },
  deviceCopy: { flex: 1, minWidth: 0 },
  deviceTitle: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 },
  deviceMeta: { ...typography.caption, marginTop: 5, color: '#A6B080' },
  deviceButton: { minHeight: 42, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.volt },
  deviceButtonText: { ...typography.action, color: '#080A0C' },
  pushMessage: { ...typography.label, color: colors.textMuted, letterSpacing: .25 },
  accountLinks: { overflow: 'hidden', borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  accountLink: { minHeight: 56, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#182028' },
  accountLinkLabel: { ...typography.bodyStrong, color: colors.text },
  accountLinkArrow: { color: colors.volt, fontSize: 18 },
  logout: { minHeight: 54, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 17, backgroundColor: '#171015', borderWidth: 1, borderColor: '#4A2730' },
  logoutText: { ...typography.action, color: '#FF8B96', letterSpacing: .3 },
  logoutArrow: { color: '#FF8B96', fontSize: 18, fontWeight: '900' },
  signOutError: { ...typography.body, color: '#FF9AA2' },
  switchTrack: { width: 52, height: 30, padding: 3, borderRadius: 16, justifyContent: 'center', backgroundColor: '#242D35' }, switchTrackActive: { backgroundColor: colors.volt }, switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#75808C' }, switchThumbActive: { alignSelf: 'flex-end', backgroundColor: '#080A0C' },
  disabled: { opacity: 0.42 }, pressed: { opacity: 0.74 },
});
