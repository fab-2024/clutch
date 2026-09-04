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
import PlayerAvatar from '@/src/features/profile/avatars/PlayerAvatar';
import { PLAYER_AVATARS } from '@/src/features/profile/avatars/catalog';
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
import { t } from '@/src/lib/i18n';
import StreakNotificationPreferences from '@/src/features/notifications/components/StreakNotificationPreferences';
import { useAuth } from '@/src/providers/AuthProvider';
import { useSnackbar } from '@/src/providers/SnackbarProvider';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

import { saveFavoriteTeam, saveProfileAvatar, saveProfilePreferences } from '../api';
import { useQueuedAutosave, type AutosaveStatus } from '../hooks/useQueuedAutosave';
import { FavoriteTeamConfirmationSheet } from './FavoriteTeamConfirmationSheet';
import LanguagePreferences from './LanguagePreferences';

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
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(activeProfile?.avatar_id ?? null);
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
          accessibilityLabel: t('settings.autosave.profileRetry'),
          label: t('settings.autosave.retry'),
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
      if (!userId) throw new Error(t('settings.error.session'));
      const result = await saveProfilePreferences(userId, draft.games, draft.publicProfile);
      void refreshProfile().catch(() => undefined);
      return result;
    },
    signature: profilePreferencesSignature,
  });

  const avatarAutosave = useQueuedAutosave({
    initialValue: activeProfile?.avatar_id ?? null,
    onError: (caught, retry) => {
      errorFeedback();
      showSnackbar({
        action: {
          accessibilityLabel: t('settings.autosave.avatarRetry'),
          label: t('settings.autosave.retry'),
          onPress: retry,
        },
        message: settingsError(caught),
        tone: 'error',
      });
    },
    save: async (avatarId: string | null) => {
      if (!avatarId) throw new Error(t('settings.error.avatarRequired'));
      if (previewState) {
        await previewSaveDelay(previewState.saveDelayMs);
        return { avatar_id: avatarId };
      }
      if (!userId) throw new Error(t('settings.error.session'));
      const result = await saveProfileAvatar(userId, avatarId);
      void refreshProfile().catch(() => undefined);
      return result;
    },
    signature: (avatarId) => avatarId ?? '',
  });

  const notificationAutosave = useQueuedAutosave({
    initialValue: previewState?.notifications ?? null,
    onError: (caught, retry) => {
      errorFeedback();
      showSnackbar({
        action: {
          accessibilityLabel: t('settings.autosave.notificationRetry'),
          label: t('settings.autosave.retry'),
          onPress: retry,
        },
        message: notificationSettingsError(caught),
        tone: 'error',
      });
    },
    save: async (preferences: NotificationPreferences | null) => {
      if (!preferences) throw new Error(t('settings.error.notificationUnavailable'));
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
        if (active) setError(t('settings.error.notificationLoad'));
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
        setError(t('settings.error.teamLoad'));
      })
      .finally(() => {
        if (requestId === teamRequest.current) setLoadingTeams(false);
      });
  }, [activeProfile?.equipe_favorite_id, games, previewState]);

  const currentOrganization = organizations.find((organization) => organization.key === selectedOrganization) ?? null;
  const syncStatus = aggregateAutosaveStatus(
    profileAutosave.status,
    avatarAutosave.status,
    notificationAutosave.status,
  );

  function chooseAvatar(avatarId: string) {
    if (avatarId === selectedAvatarId) return;
    setSelectedAvatarId(avatarId);
    avatarAutosave.commit(avatarId);
  }

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

  function syncNotificationLocale(locale: NotificationPreferences['locale']) {
    setNotificationPreferences((current) => {
      if (!current) return current;
      const next = { ...current, locale };
      if (current.expansionAvailable) notificationAutosave.commit(next);
      else showSnackbar({ message: t('language.notificationError'), tone: 'info' });
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
        message: t('settings.team.changed', { team: pendingOrganization.name }),
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
      setPushMessage(t('settings.notifications.registered'));
    } else if (result.status === 'denied') {
      setPushMessage(t('settings.notifications.denied'));
    } else if (result.status === 'unconfigured') {
      setPushMessage(t('settings.notifications.unconfigured'));
    } else if (result.status === 'unsupported') {
      setPushMessage(t('settings.notifications.unsupported'));
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
      setSignOutError(t('settings.account.signOutError'));
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen>
      <ScrollView style={styles.root} contentContainerStyle={[styles.content, isShortLandscape && styles.contentLandscape]} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, isShortLandscape && styles.headerLandscape]}>
          <Pressable accessibilityLabel={t('settings.backLabel')} accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>{t('settings.back')}</Text></Pressable>
          <View style={styles.headerMark}><Text style={styles.headerMarkText}>⚙</Text></View>
        </View>

        <View style={[styles.introStatus, isShortLandscape && styles.introStatusLandscape]}>
          <View style={[styles.intro, isShortLandscape && styles.introLandscape]}>
            <Text style={styles.eyebrow}>{t('settings.eyebrow')}</Text>
            <Text style={styles.title}>{t('settings.title')}</Text>
            <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
          </View>

          <View style={[styles.syncWrap, isShortLandscape && styles.syncWrapLandscape]}>
            <AutosaveIndicator
              blocked={!games.length}
              compact={isShortLandscape}
              onRetry={() => {
                if (profileAutosave.status === 'error') profileAutosave.retry();
                if (avatarAutosave.status === 'error') avatarAutosave.retry();
                if (notificationAutosave.status === 'error') notificationAutosave.retry();
              }}
              status={syncStatus}
            />
          </View>
        </View>
        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View><Text style={styles.sectionEyebrow}>{t('settings.avatar.eyebrow')}</Text><Text style={styles.sectionTitle}>{t('settings.avatar.title')}</Text></View>
            <Text style={styles.sectionMeta}>{t('settings.avatar.choices', { count: PLAYER_AVATARS.length })}</Text>
          </View>
          <Text style={styles.sectionCopy}>{t('settings.avatar.copy')}</Text>
          <View style={styles.avatarGrid}>
            {PLAYER_AVATARS.map((avatar) => {
              const active = avatar.id === selectedAvatarId;
              const focusKey = `avatar:${avatar.id}`;
              return (
                <Pressable
                  key={avatar.id}
                  accessibilityLabel={t('settings.avatar.choose', { avatar: avatar.label })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onBlur={() => handleCardBlur(focusKey)}
                  onFocus={() => handleCardFocus(focusKey)}
                  onPress={() => chooseAvatar(avatar.id)}
                  style={({ pressed }) => [
                    styles.avatarChoice,
                    active && styles.avatarChoiceActive,
                    focusedCard === focusKey && styles.cardFocused,
                    pressed && styles.pressed,
                  ]}
                >
                  <PlayerAvatar avatarId={avatar.id} label={avatar.label} size={78} />
                  <Text numberOfLines={2} style={[styles.avatarLabel, active && styles.avatarLabelActive]}>{avatar.label}</Text>
                  {active ? <View style={styles.avatarSelected}><Text style={styles.avatarSelectedText}>✓</Text></View> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>{t('settings.games.eyebrow')}</Text><Text style={styles.sectionTitle}>{t('settings.games.title')}</Text></View><Text style={styles.sectionMeta}>{games.length}/3</Text></View>
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
                  <Text style={[styles.gameState, active && styles.gameStateActive]}>{t(active ? 'settings.games.following' : 'settings.games.add')}</Text>
                </Pressable>
              );
            })}
          </View>
          {!games.length ? <Text style={styles.validation}>{t('settings.games.required')}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>{t('settings.team.eyebrow')}</Text><Text style={styles.sectionTitle}>{t('settings.team.title')}</Text></View></View>
          <Text style={styles.sectionCopy}>{t('settings.team.copy')}</Text>
          {loadingTeams ? <View style={styles.teamSkeleton} /> : organizations.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamRail}>
              {organizations.map((organization) => {
                const active = selectedOrganization === organization.key;
                const focusKey = `team:${organization.key}`;
                return (
                  <Pressable
                    key={organization.key}
                    accessibilityHint={t(active ? 'settings.team.currentHint' : 'settings.team.confirmHint')}
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
          ) : games.length ? <Text style={styles.validation}>{t('settings.team.empty')}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>{t('settings.visibility.eyebrow')}</Text><Text style={styles.sectionTitle}>{t('settings.visibility.title')}</Text></View></View>
          <Pressable
            accessibilityLabel={t('settings.visibility.label')}
            accessibilityRole="switch"
            accessibilityState={{ checked: publicProfile }}
            onPress={toggleVisibility}
            style={({ pressed }) => [styles.visibilityCard, pressed && styles.pressed]}
          >
            <View style={styles.visibilityCopy}><Text style={styles.visibilityTitle}>{t(publicProfile ? 'settings.visibility.public' : 'settings.visibility.private')}</Text><Text style={styles.visibilityMeta}>{t(publicProfile ? 'settings.visibility.publicDetail' : 'settings.visibility.privateDetail')}</Text></View>
            <View style={[styles.switchTrack, publicProfile && styles.switchTrackActive]}><View style={[styles.switchThumb, publicProfile && styles.switchThumbActive]} /></View>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>{t('settings.language.eyebrow')}</Text><Text style={styles.sectionTitle}>{t('settings.language.title')}</Text></View></View>
          <LanguagePreferences onLocaleChange={syncNotificationLocale} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View><Text style={styles.sectionEyebrow}>{t('settings.notifications.eyebrow')}</Text><Text style={styles.sectionTitle}>{t('settings.notifications.title')}</Text></View>
            <Text style={styles.sectionMeta}>{t('settings.notifications.devices', { count: notificationPreferences?.activeDevices ?? 0 })}</Text>
          </View>
          <Text style={styles.sectionCopy}>{t('settings.notifications.copy', { zone: notificationPreferences?.timezone ?? detectedTimezone() })}</Text>

          {loadingNotifications ? <View style={styles.notificationSkeleton} /> : notificationPreferences ? (
            <View style={styles.notificationCard}>
              <Text style={styles.notificationGroup}>{t('settings.notifications.matches')}</Text>
              <NotificationToggle label={t('settings.notifications.lock')} detail={t('settings.notifications.lockDetail')} enabled={notificationPreferences.lockImminent} onPress={() => toggleNotification('lockImminent')} />
              <NotificationToggle label={t('settings.notifications.matchStart')} detail={t('settings.notifications.matchStartDetail')} enabled={notificationPreferences.matchStart} onPress={() => toggleNotification('matchStart')} />
              <NotificationToggle label={t('settings.notifications.verdict')} detail={t('settings.notifications.verdictDetail')} enabled={notificationPreferences.verdict} onPress={() => toggleNotification('verdict')} />
              <Text style={[styles.notificationGroup, styles.notificationGroupSpaced]}>{t('settings.notifications.social')}</Text>
              <NotificationToggle label={t('settings.notifications.promotion')} detail={t('settings.notifications.promotionDetail')} enabled={notificationPreferences.promotion} onPress={() => toggleNotification('promotion')} />
              <NotificationToggle label={t('settings.notifications.mutation')} detail={t('settings.notifications.mutationDetail')} enabled={notificationPreferences.mutation} onPress={() => toggleNotification('mutation')} />
              <NotificationToggle label={t('settings.notifications.duel')} detail={t('settings.notifications.duelDetail')} enabled={notificationPreferences.duelReceived} onPress={() => toggleNotification('duelReceived')} />
              <StreakNotificationPreferences preferences={notificationPreferences} onChange={(next) => {
                setNotificationPreferences(next);
                notificationAutosave.commit(next);
              }} />
              <AccountLink label={t('showcase.social.entry')}
                onPress={() => router.push((previewState ? '/growth-preview?section=activity' : '/showcase-activity') as never)} />
            </View>
          ) : null}

          <View style={styles.deviceCard}>
            <View style={styles.deviceCopy}>
              <Text style={styles.deviceTitle}>{t(Platform.OS === 'web' ? 'settings.notifications.web' : 'settings.notifications.device')}</Text>
              <Text style={styles.deviceMeta}>{Platform.OS === 'web' ? t('settings.notifications.webDetail') : notificationPreferences?.activeDevices ? t('settings.notifications.activeDevices', { count: notificationPreferences.activeDevices }) : t('settings.notifications.authorize')}</Text>
            </View>
            {Platform.OS !== 'web' ? <Pressable accessibilityRole="button" disabled={pushBusy} onPress={() => void enablePushOnDevice()} style={({ pressed }) => [styles.deviceButton, (pressed || pushBusy) && styles.pressed]}><Text style={styles.deviceButtonText}>{t(pushBusy ? 'settings.notifications.activating' : notificationPreferences?.activeDevices ? 'settings.notifications.resync' : 'settings.notifications.activate')}</Text></Pressable> : null}
          </View>
          {pushMessage ? <Text style={styles.pushMessage}>{pushMessage}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>{t('settings.account.eyebrow')}</Text><Text style={styles.sectionTitle}>{t('settings.account.title')}</Text></View></View>
          <View style={styles.accountLinks}>
            <AccountLink label={t('settings.account.safety')} onPress={() => router.push('/settings/safety')} />
            <AccountLink label={t('settings.account.data')} onPress={() => router.push('/settings/account')} />
            <AccountLink label={t('settings.account.privacy')} onPress={() => router.push('/legal/privacy')} />
            <AccountLink label={t('settings.account.terms')} onPress={() => router.push('/legal/terms')} />
            <AccountLink label={t('settings.account.support')} onPress={() => router.push('/support')} />
          </View>
          <Pressable
            accessibilityLabel={t('settings.account.signOutLabel')}
            accessibilityRole="button"
            accessibilityState={{ busy: signingOut, disabled: signingOut }}
            disabled={signingOut}
            onPress={() => void leaveSession()}
            style={({ pressed }) => [styles.logout, signingOut && styles.disabled, pressed && !signingOut && styles.pressed]}
          >
            <Text style={styles.logoutText}>{t(signingOut ? 'settings.account.signingOut' : 'settings.account.signOut')}</Text>
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
  if (message.includes('Changement de faction bloqué')) return t('settings.error.teamLocked');
  if (message.toLowerCase().includes('row-level security')) return t('settings.error.session');
  return message || t('settings.error.profile');
}

function notificationSettingsError(caught: unknown) {
  const message = caught instanceof Error ? caught.message : '';
  return message || t('settings.error.notifications');
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
    preferences.locale,
    preferences.timezone,
    preferences.lockImminent,
    preferences.matchStart,
    preferences.verdict,
    preferences.promotion,
    preferences.mutation,
    preferences.duelReceived,
    preferences.streakRisk,
    preferences.streakProtected,
    preferences.quietHoursEnabled,
    preferences.quietHoursStart,
    preferences.quietHoursEnd,
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
    ? { label: t('settings.autosave.chooseGame'), tone: 'error' as const }
    : status === 'error'
      ? { label: t('settings.autosave.failed'), tone: 'error' as const }
      : status === 'saving'
        ? { label: t('settings.autosave.saving'), tone: 'saving' as const }
        : status === 'saved'
          ? { label: t('settings.autosave.saved'), tone: 'saved' as const }
          : { label: t('settings.autosave.active'), tone: 'idle' as const };
  const content = (
    <>
      <AutosaveIcon tone={presentation.tone} />
      <Text numberOfLines={compact ? 2 : 1} style={[styles.syncLabel, presentation.tone === 'error' && styles.syncLabelError]}>{presentation.label}</Text>
      {presentation.tone === 'error' && !blocked ? <Text style={styles.syncRetry}>{t('settings.autosave.retry')}</Text> : null}
    </>
  );

  if (presentation.tone === 'error' && !blocked) {
    return (
      <Pressable
        accessibilityLabel={t('settings.autosave.retryLabel')}
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
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#30414E' },
  headerLandscape: { minHeight: 56 },
  back: { minHeight: 38, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
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
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatarChoice: { position: 'relative', width: '31%', minHeight: 126, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 7, borderRadius: 21, backgroundColor: '#111A22', borderWidth: 1, borderColor: colors.border, outlineStyle: 'solid', outlineWidth: 2, outlineColor: 'transparent' },
  avatarChoiceActive: { backgroundColor: '#15210F', borderColor: colors.volt },
  avatarLabel: { ...typography.caption, minHeight: 28, color: colors.textSecondary, textAlign: 'center' },
  avatarLabelActive: { color: colors.text },
  avatarSelected: { position: 'absolute', top: 6, right: 6, width: 21, height: 21, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.volt, borderWidth: 2, borderColor: '#0B1218' },
  avatarSelectedText: { color: '#080A0C', fontSize: 12, fontWeight: '900' },
  gamesGrid: { flexDirection: 'row', gap: 8 },
  gameCard: { flex: 1, minHeight: 170, padding: 11, borderRadius: 21, backgroundColor: '#111A22', borderWidth: 1, borderColor: colors.border, outlineStyle: 'solid', outlineWidth: 2, outlineColor: 'transparent' }, gameCardActive: { backgroundColor: '#11170E', borderColor: '#48541E' },
  gameMark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: '#111A22' }, gameCode: { ...typography.cardTitle }, gameShort: { ...typography.bodyStrong, marginTop: 15, color: colors.text }, gameName: { ...typography.caption, marginTop: 3, color: colors.textMuted }, gameNameCompact: { minHeight: 28 }, gameState: { ...typography.label, marginTop: 'auto', color: colors.textMuted, letterSpacing: .3 }, gameStateActive: { color: colors.volt },
  validation: { ...typography.caption, color: '#FF9AA2' },
  teamRail: { gap: 9, paddingRight: spacing.md }, teamSkeleton: { height: 182, borderRadius: 24, backgroundColor: '#111A22' },
  teamCard: { width: 154, minHeight: 182, padding: 13, borderRadius: 23, backgroundColor: '#111A22', borderWidth: 1, borderColor: colors.border, outlineStyle: 'solid', outlineWidth: 2, outlineColor: 'transparent' }, teamCardActive: { backgroundColor: '#11170E', borderColor: '#48541E' },
  cardFocused: { outlineColor: colors.focus, outlineOffset: 2 },
  teamMark: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111820', borderWidth: 1, borderColor: '#30414E' }, teamMarkActive: { backgroundColor: colors.volt, borderColor: colors.volt }, teamTag: { ...typography.action, color: colors.text }, teamTagActive: { color: '#080A0C' }, teamName: { ...typography.bodyStrong, marginTop: 16, color: colors.text }, teamGames: { ...typography.label, marginTop: 'auto', color: colors.textMuted }, teamGamesActive: { color: colors.volt },
  visibilityCard: { minHeight: 116, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 15, borderRadius: 24, backgroundColor: '#111A22', borderWidth: 1, borderColor: colors.border }, visibilityCopy: { flex: 1, minWidth: 0 }, visibilityTitle: { ...typography.cardTitle, color: colors.text }, visibilityMeta: { ...typography.body, marginTop: 5, color: colors.textMuted },
  notificationSkeleton: { height: 390, borderRadius: 24, backgroundColor: '#111A22' },
  notificationCard: { overflow: 'hidden', padding: 14, borderRadius: 24, backgroundColor: '#111A22', borderWidth: 1, borderColor: colors.border },
  notificationGroup: { ...typography.eyebrow, marginBottom: 5, color: colors.volt, letterSpacing: .8 },
  notificationGroupSpaced: { marginTop: 14 },
  notificationRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1, borderBottomColor: '#30414E' },
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
  accountLinks: { overflow: 'hidden', borderRadius: 24, backgroundColor: '#111A22', borderWidth: 1, borderColor: colors.border },
  accountLink: { minHeight: 56, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#30414E' },
  accountLinkLabel: { ...typography.bodyStrong, color: colors.text },
  accountLinkArrow: { color: colors.volt, fontSize: 18 },
  logout: { minHeight: 54, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 17, backgroundColor: '#171015', borderWidth: 1, borderColor: '#4A2730' },
  logoutText: { ...typography.action, color: '#FF8B96', letterSpacing: .3 },
  logoutArrow: { color: '#FF8B96', fontSize: 18, fontWeight: '900' },
  signOutError: { ...typography.body, color: '#FF9AA2' },
  switchTrack: { width: 52, height: 30, padding: 3, borderRadius: 16, justifyContent: 'center', backgroundColor: '#152633' }, switchTrackActive: { backgroundColor: colors.volt }, switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#75808C' }, switchThumbActive: { alignSelf: 'flex-end', backgroundColor: '#0B1218' },
  disabled: { opacity: 0.42 }, pressed: { opacity: 0.74 },
});
