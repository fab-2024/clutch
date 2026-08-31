import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Link2 from 'lucide-react-native/icons/link-2';
import Swords from 'lucide-react-native/icons/swords';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { StateView } from '@/src/components/ui/StateView';
import { DuelMissionsSection } from '@/src/features/social/missions/components/DuelMissionsSection';
import { MissionsSheet } from '@/src/features/social/missions/components/MissionsSheet';
import { useFriendMissions } from '@/src/features/social/missions/hooks/useFriendMissions';
import type { FriendQuestsData } from '@/src/features/social/missions/types';
import { selectionFeedback } from '@/src/lib/feedback';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

import { loadDuels } from '../api';
import type { DuelRow, DuelStatus } from '../types';

export type DuelsMissionsPreviewData = {
  duels: DuelRow[];
  missions: FriendQuestsData;
};

type DuelsScreenProps = {
  initialMissionsOpen?: boolean;
  onMissionsClosed?: () => void;
  previewData?: DuelsMissionsPreviewData;
};

export default function DuelsScreen({
  initialMissionsOpen = false,
  onMissionsClosed,
  previewData,
}: DuelsScreenProps = {}) {
  const [duels, setDuels] = useState<DuelRow[]>(() => previewData?.duels ?? []);
  const [loading, setLoading] = useState(!previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteExpanded, setInviteExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missionsOpen, setMissionsOpen] = useState(initialMissionsOpen);
  const missionTriggerRef = useRef<View>(null);
  const {
    data: missions,
    error: missionsError,
    loading: missionsLoading,
    refreshing: missionsRefreshing,
    reload: reloadMissions,
  } = useFriendMissions({
    enabled: !previewData,
    initialData: previewData?.missions,
  });

  const load = useCallback(async (refresh = false) => {
    if (previewData) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try { setDuels(await loadDuels()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Impossible de charger tes duels.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [previewData]);

  useEffect(() => {
    if (!previewData) void load();
  }, [load, previewData]);

  useEffect(() => {
    if (initialMissionsOpen) setMissionsOpen(true);
  }, [initialMissionsOpen]);

  const active = duels.filter((duel) => {
    const status = effectiveStatus(duel);
    return status === 'en_attente' || status === 'accepte';
  });
  const finished = duels.filter((duel) => duel.statut === 'termine');
  const featured = active[0] ?? duels[0] ?? null;
  const invitationToken = extractToken(inviteCode);

  function openDuel(token: string) {
    router.push({ pathname: '/duel/[token]', params: { token } });
  }

  function openInvitation() {
    const token = extractToken(inviteCode);
    if (!token) return;
    setInviteCode('');
    setInviteExpanded(false);
    openDuel(token);
  }

  const refreshAll = useCallback(async () => {
    await Promise.all([load(true), reloadMissions(true)]);
  }, [load, reloadMissions]);

  const openMissions = useCallback(() => {
    selectionFeedback();
    setMissionsOpen(true);
  }, []);

  const closeMissions = useCallback(() => {
    setMissionsOpen(false);
  }, []);

  const finishMissionsClose = useCallback(() => {
    if (initialMissionsOpen) onMissionsClosed?.();
  }, [initialMissionsOpen, onMissionsClosed]);

  const retryMissions = useCallback(() => {
    const hasContent = missions.actives.length > 0 || missions.duos.length > 0 || missions.historique.length > 0;
    void reloadMissions(hasContent);
  }, [missions, reloadMissions]);

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing || missionsRefreshing} onRefresh={() => void refreshAll()} tintColor={colors.volt} />}
      >
        {error && !duels.length ? (
          <StateView
            action={{ label: 'RÉESSAYER', onPress: () => void load() }}
            compact
            description={error}
            title="Défis indisponibles"
            variant="error"
          />
        ) : error ? (
          <DuelRefreshNotice message={error} onRetry={() => void load(true)} />
        ) : null}

        <View style={styles.featuredSection}>
          <View style={styles.featuredHeading}>
            <Text style={styles.featuredLabel}>DUEL EN COURS</Text>
            <DuelSectionStatus duel={featured} loading={loading} />
          </View>
          {loading
            ? <DuelHeroSkeleton />
            : featured
              ? <DuelHero duel={featured} onOpen={() => openDuel(featured.token)} />
              : error
                ? null
                : <EmptyDuelHero />}
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>SOCIAL // DÉFIS</Text>
          <Text style={styles.title}>À TOI DE JOUER.</Text>
          <Text style={styles.subtitle}>Crée un face-à-face ou rejoins un rival.</Text>
        </View>

        <CreateDuelCard onPress={() => router.push('/(tabs)/matches')} />

        <JoinDuelCard
          expanded={inviteExpanded}
          inviteCode={inviteCode}
          invitationToken={invitationToken}
          onChangeCode={setInviteCode}
          onOpenInvitation={openInvitation}
          onToggle={() => setInviteExpanded((expanded) => !expanded)}
        />

        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statValue}>{active.length}</Text><Text style={styles.statLabel}>ACTIF{active.length > 1 ? 'S' : ''}</Text></View>
          <View style={styles.divider} />
          <View style={styles.stat}><Text style={styles.statValue}>{finished.length}</Text><Text style={styles.statLabel}>TERMINÉ{finished.length > 1 ? 'S' : ''}</Text></View>
          <View style={styles.divider} />
          <View style={styles.rivalriesSummary}>
            <Text style={styles.rivalriesSummaryText}>TES RIVALITÉS</Text>
            <ChevronRight color={colors.textMuted} size={20} strokeWidth={2.4} />
          </View>
        </View>

        <View style={styles.rivalryList}>
          {loading ? <DuelListSkeleton /> : duels.length ? duels.map((duel) => <DuelCard key={duel.token} duel={duel} onOpen={() => openDuel(duel.token)} />) : error ? null : <View style={styles.emptyList}><Text style={styles.emptyListText}>Ton premier duel apparaîtra ici après un challenge.</Text></View>}
        </View>

        <DuelMissionsSection
          data={missions}
          error={missionsError}
          loading={missionsLoading}
          onOpen={openMissions}
          onRetry={retryMissions}
          ref={missionTriggerRef}
        />
      </ScrollView>

      <MissionsSheet
        data={missions}
        error={missionsError}
        loading={missionsLoading}
        onClose={closeMissions}
        onClosed={finishMissionsClose}
        onRetry={retryMissions}
        returnFocusRef={missionTriggerRef}
        visible={missionsOpen}
      />
    </>
  );
}

function DuelSectionStatus({ duel, loading }: { duel: DuelRow | null; loading: boolean }) {
  const status = duel ? effectiveStatus(duel) : null;
  const active = status === 'en_attente' || status === 'accepte';
  const label = loading
    ? 'CHARGEMENT'
    : duel && status
      ? `${statusLabel(status)} · ${gameLabel(duel.jeu)}`
      : 'AUCUN ACTIF';

  return (
    <View style={styles.featuredStatus}>
      <View style={[styles.featuredStatusDot, active && styles.featuredStatusDotActive]} />
      <Text style={styles.featuredStatusText}>{label}</Text>
    </View>
  );
}

function CreateDuelCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityHint="Ouvre la liste des matchs pour choisir un call"
      accessibilityLabel="Créer un nouveau duel classé"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, styles.createCard, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={['#211058', '#4A164D', '#7A2737']}
        end={{ x: 1, y: .85 }}
        start={{ x: 0, y: .15 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[styles.actionIcon, styles.createIcon]}
      >
        <Swords color="#E26AC8" size={112} strokeWidth={1.55} />
      </View>
      <View style={styles.actionCardContent}>
        <Text style={styles.actionEyebrow}>NOUVEAU DUEL</Text>
        <Text style={styles.actionTitle}>CRÉER UN DUEL</Text>
        <Text style={styles.actionCopy}>Choisis un match et défie quelqu’un.</Text>
        <View style={styles.actionCta}>
          <Text style={styles.actionCtaText}>CHOISIR UN MATCH</Text>
          <ChevronRight color="#0A0D10" size={22} strokeWidth={2.5} />
        </View>
      </View>
    </Pressable>
  );
}

function JoinDuelCard({
  expanded,
  invitationToken,
  inviteCode,
  onChangeCode,
  onOpenInvitation,
  onToggle,
}: {
  expanded: boolean;
  invitationToken: string;
  inviteCode: string;
  onChangeCode: (value: string) => void;
  onOpenInvitation: () => void;
  onToggle: () => void;
}) {
  return (
    <View style={[styles.actionCard, styles.joinCard, expanded && styles.joinCardExpanded]}>
      <LinearGradient
        colors={['#00344A', '#004E69', '#026D88']}
        end={{ x: 1, y: .8 }}
        start={{ x: 0, y: .15 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[styles.actionIcon, styles.joinIcon]}
      >
        <Link2 color="#22C7EA" size={104} strokeWidth={1.55} />
      </View>
      <View style={styles.actionCardContent}>
        <Text style={styles.actionEyebrow}>INVITATION</Text>
        <Text style={styles.actionTitle}>REJOINDRE UN RIVAL</Text>
        <Text style={styles.actionCopy}>Utilise son code ou son lien.</Text>
        <Pressable
          accessibilityLabel={expanded ? 'Masquer la saisie du code' : 'Entrer un code de duel'}
          accessibilityRole="button"
          onPress={onToggle}
          style={({ pressed }) => [styles.actionCta, pressed && styles.actionCtaPressed]}
        >
          <Text style={styles.actionCtaText}>{expanded ? 'MASQUER LE CODE' : 'ENTRER UN CODE'}</Text>
          <ChevronRight
            color="#0A0D10"
            size={22}
            strokeWidth={2.5}
            style={expanded ? styles.chevronExpanded : undefined}
          />
        </Pressable>

        {expanded ? (
          <View style={styles.inviteEditor}>
            <TextInput
              accessibilityLabel="Code ou lien d’invitation au duel"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={onChangeCode}
              onSubmitEditing={onOpenInvitation}
              placeholder="Colle le code ou le lien"
              placeholderTextColor={colors.textSecondary}
              value={inviteCode}
              style={styles.inviteInput}
            />
            <Pressable
              accessibilityHint="Ouvre le face-à-face correspondant au code saisi"
              accessibilityRole="button"
              accessibilityState={{ disabled: !invitationToken }}
              aria-disabled={!invitationToken}
              disabled={!invitationToken}
              onPress={onOpenInvitation}
              style={({ pressed }) => [styles.inviteButton, !invitationToken && styles.disabled, pressed && styles.pressed]}
            >
              <Text style={styles.inviteButtonText}>OUVRIR L’INVITATION</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DuelHero({ duel, onOpen }: { duel: DuelRow; onOpen: () => void }) {
  const creator = duel.moi_role === 'createur';
  const targeted = duel.moi_role === 'cible';
  const rival = creator ? (duel.accepteur_pseudo || 'EN ATTENTE') : (duel.createur_pseudo || 'RIVAL');
  const myChoice = creator ? duel.createur_choix : targeted ? opposite(duel.createur_choix) : duel.accepteur_choix;
  const myTag = myChoice === 'a' ? (duel.tag_a || duel.equipe_a || 'A') : myChoice === 'b' ? (duel.tag_b || duel.equipe_b || 'B') : '—';
  const rivalTag = myChoice === 'a' ? (duel.tag_b || duel.equipe_b || 'B') : myChoice === 'b' ? (duel.tag_a || duel.equipe_a || 'A') : '?';
  const status = effectiveStatus(duel);
  const callState = status === 'termine'
    ? 'VERDICT DISPONIBLE'
    : status === 'accepte'
      ? 'CALLS VERROUILLÉS'
      : targeted
        ? 'À TOI DE RÉPONDRE'
        : 'EN ATTENTE DU RIVAL';
  return (
    <Pressable
      accessibilityHint="Ouvre le détail de ce duel"
      accessibilityLabel={`Duel ${myTag} contre ${rivalTag}, rival ${rival}, statut ${statusLabel(status)}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={['#05254A', '#071018', '#2E1702']}
        end={{ x: 1, y: .5 }}
        start={{ x: 0, y: .5 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.heroBlue} />
      <View pointerEvents="none" style={styles.heroAmber} />
      <View style={styles.faceoff}>
        <DuelPlayer side="left" tag={myTag} />
        <View style={styles.vsBlock}>
          <Text style={styles.vs}>VS</Text>
          <Text numberOfLines={1} style={styles.heroMeta}>{gameLabel(duel.jeu)} · {duel.evenement || 'MATCH'}</Text>
        </View>
        <DuelPlayer pending={rival === 'EN ATTENTE'} side="right" tag={rivalTag} />
      </View>
      <View style={styles.heroFooter}>
        <View style={styles.heroCallState}>
          <TrendingUp color="#42B7FF" size={19} strokeWidth={2.5} />
          <Text style={styles.heroCallText}>{callState}</Text>
        </View>
        <View style={styles.heroFollow}>
          <Text style={styles.heroFollowText}>SUIVRE</Text>
          <ChevronRight color={colors.text} size={20} strokeWidth={2.6} />
        </View>
      </View>
    </Pressable>
  );
}

function DuelPlayer({ pending = false, side, tag }: { pending?: boolean; side: 'left' | 'right'; tag: string }) {
  return (
    <View style={[styles.player, side === 'right' && styles.playerRight]}>
      <View style={[styles.playerMark, side === 'right' && styles.playerMarkRight]}>
        <Text style={styles.playerMarkText}>{pending ? '?' : String(tag).slice(0, 2)}</Text>
      </View>
      <View style={[styles.playerCopy, side === 'right' && styles.playerCopyRight]}>
        <Text style={[styles.playerRole, side === 'right' && styles.playerRoleRight]}>{side === 'left' ? 'TOI' : 'RIVAL'}</Text>
        <Text numberOfLines={1} style={styles.playerTag}>{tag}</Text>
      </View>
    </View>
  );
}

function EmptyDuelHero() {
  return (
    <View style={styles.emptyHero}>
      <Text style={styles.emptyEyebrow}>AUCUNE RIVALITÉ ACTIVE</Text>
      <Text style={styles.emptyTitle}>TON PROCHAIN FACE-À-FACE T’ATTEND.</Text>
      <Text style={styles.emptyText}>Choisis un match pour lancer le premier round.</Text>
    </View>
  );
}

function DuelCard({ duel, onOpen }: { duel: DuelRow; onOpen: () => void }) {
  const creator = duel.moi_role === 'createur';
  const targeted = duel.moi_role === 'cible';
  const rival = creator ? (duel.accepteur_pseudo || 'En attente') : (duel.createur_pseudo || 'Rival');
  const myChoice = creator ? duel.createur_choix : targeted ? opposite(duel.createur_choix) : duel.accepteur_choix;
  const myTag = myChoice === 'a' ? (duel.tag_a || duel.equipe_a || 'A') : myChoice === 'b' ? (duel.tag_b || duel.equipe_b || 'B') : '—';
  const status = effectiveStatus(duel);
  return (
    <Pressable
      accessibilityHint="Ouvre le détail de cette rivalité"
      accessibilityLabel={`${myTag} contre ${rival}, statut ${statusLabel(status)}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardMain}>
        <Text style={styles.cardEyebrow}>{targeted ? 'REÇU' : 'CLASSÉ'} · {gameLabel(duel.jeu)} · {duel.evenement || 'MATCH'}</Text>
        <Text style={styles.cardTitle}>{myTag} <Text style={styles.cardVs}>VS</Text> {rival}</Text>
        <Text style={styles.cardDate}>{formatDate(duel.debut)}</Text>
      </View>
      <Status status={status} />
    </Pressable>
  );
}

function Status({ status }: { status: DuelStatus }) {
  const label = statusLabel(status);
  const active = status === 'en_attente' || status === 'accepte';
  return <View style={[styles.status, active && styles.statusActive]}><View style={[styles.statusDot, active && styles.statusDotActive]} /><Text style={[styles.statusText, active && styles.statusTextActive]}>{label}</Text></View>;
}

function DuelRefreshNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View accessibilityLiveRegion="assertive" style={styles.error}>
      <View style={styles.errorCopy}>
        <Text accessibilityRole="alert" style={styles.errorTitle}>ACTUALISATION IMPOSSIBLE</Text>
        <Text style={styles.errorText}>{message}</Text>
      </View>
      <Button label="RÉESSAYER" onPress={onRetry} size="compact" variant="secondary" />
    </View>
  );
}

function DuelHeroSkeleton() {
  return (
    <SkeletonGroup label="Chargement des défis" style={styles.heroSkeleton} testID="duels-loading">
      <View style={styles.heroSkeletonFaceoff}>
        <View style={styles.heroSkeletonPlayer}>
          <Skeleton height={52} radius="lg" width={52} />
          <View style={styles.heroSkeletonCopy}>
            <Skeleton height={8} radius="pill" tone="subtle" width={34} />
            <Skeleton height={20} radius="pill" width={54} />
          </View>
        </View>
        <View style={styles.heroSkeletonVersus}>
          <Skeleton height={30} radius="sm" width={42} />
          <Skeleton height={8} radius="pill" tone="subtle" width={58} />
        </View>
        <View style={[styles.heroSkeletonPlayer, styles.heroSkeletonPlayerRight]}>
          <View style={styles.heroSkeletonCopy}>
            <Skeleton height={8} radius="pill" tone="subtle" width={34} />
            <Skeleton height={20} radius="pill" width={54} />
          </View>
          <Skeleton height={52} radius="lg" width={52} />
        </View>
      </View>
      <View style={styles.heroSkeletonFooter}>
        <Skeleton height={10} radius="pill" tone="subtle" width="38%" />
        <Skeleton height={10} radius="pill" width={64} />
      </View>
    </SkeletonGroup>
  );
}

function DuelListSkeleton() {
  return (
    <SkeletonGroup style={styles.listSkeleton} testID="duels-list-loading">
      {[0, 1].map((item) => (
        <View key={item} style={styles.listSkeletonRow}>
          <View style={styles.listSkeletonCopy}>
            <Skeleton height={8} radius="pill" tone="subtle" width="38%" />
            <Skeleton height={17} radius="pill" width="72%" />
            <Skeleton height={8} radius="pill" tone="subtle" width="54%" />
          </View>
          <Skeleton height={34} radius="pill" width={88} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

function gameLabel(value?: string) { const game = String(value || '').toLowerCase(); if (game.includes('rocket') || game === 'rl') return 'RL'; if (game.includes('lol')) return 'LOL'; if (game.includes('valorant')) return 'VAL'; return 'ESPORT'; }
function formatDate(value?: string) { if (!value) return 'Date à venir'; const date = new Date(value); if (!Number.isFinite(date.getTime())) return 'Date à venir'; return date.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function effectiveStatus(duel: DuelRow): DuelStatus { return duel.statut === 'en_attente' && duel.debut && new Date(duel.debut).getTime() <= Date.now() ? 'expire' : duel.statut; }
function statusLabel(status: DuelStatus) { return status === 'termine' ? 'TERMINÉ' : status === 'accepte' ? 'VERROUILLÉ' : status === 'annule' ? 'ANNULÉ' : status === 'expire' ? 'EXPIRÉ' : 'EN ATTENTE'; }
function opposite(choice?: 'a' | 'b') { return choice === 'a' ? 'b' : choice === 'b' ? 'a' : undefined; }
function extractToken(value: string) { const cleaned = value.trim().split(/[?#]/)[0].replace(/\/+$/, ''); const token = cleaned.split('/').pop()?.toLowerCase() || ''; return /^[a-f0-9]{12,64}$/.test(token) ? token : ''; }

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    padding: spacing.md,
    paddingBottom: layout.tabBarContentInset,
    gap: 20,
  },
  featuredSection: { gap: 9 },
  featuredHeading: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  featuredLabel: {
    ...typography.eyebrow,
    color: colors.textSecondary,
    letterSpacing: .8,
  },
  featuredStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  featuredStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.textDisabled,
  },
  featuredStatusDotActive: { backgroundColor: colors.live },
  featuredStatusText: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: .35,
  },
  intro: {
    gap: 7,
    paddingTop: 8,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.volt,
    letterSpacing: 1.1,
  },
  title: {
    ...typography.displayMedium,
    maxWidth: 365,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodyComfort,
    maxWidth: 360,
    color: colors.textMuted,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.liveSurface,
    borderWidth: 1,
    borderColor: colors.liveBorder,
  },
  errorCopy: { flex: 1, minWidth: 0 },
  errorTitle: { ...typography.control, color: colors.liveText },
  errorText: { ...typography.metadata, marginTop: 2, color: colors.textSecondary },
  heroSkeleton: {
    minHeight: 176,
    padding: 16,
    justifyContent: 'space-between',
    borderRadius: 24,
    backgroundColor: '#0B1218',
    borderWidth: 1,
    borderColor: '#30414E',
  },
  heroSkeletonFaceoff: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroSkeletonPlayer: {
    width: '34%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  heroSkeletonPlayerRight: { justifyContent: 'flex-end' },
  heroSkeletonCopy: { gap: 6 },
  heroSkeletonVersus: { width: '28%', alignItems: 'center', gap: 7 },
  heroSkeletonFooter: {
    minHeight: 38,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#30414E',
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 176,
    justifyContent: 'space-between',
    borderRadius: 24,
    backgroundColor: '#0B1218',
    borderWidth: 1,
    borderColor: '#285F91',
  },
  heroBlue: {
    position: 'absolute',
    left: -70,
    top: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#0A63AF',
    opacity: .16,
  },
  heroAmber: {
    position: 'absolute',
    right: -70,
    top: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#D56600',
    opacity: .17,
  },
  faceoff: {
    zIndex: 2,
    minHeight: 122,
    paddingHorizontal: 15,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  player: {
    width: '35%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerRight: { flexDirection: 'row-reverse' },
  playerMark: {
    width: 52,
    height: 52,
    flexShrink: 0,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1723',
    borderWidth: 1,
    borderColor: '#56B7F0',
  },
  playerMarkRight: {
    backgroundColor: '#211205',
    borderColor: '#F18C28',
  },
  playerMarkText: {
    ...typography.cardTitle,
    color: colors.text,
  },
  playerCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 9,
  },
  playerCopyRight: {
    marginLeft: 0,
    marginRight: 9,
    alignItems: 'flex-end',
  },
  playerRole: {
    ...typography.eyebrow,
    color: '#45B9FF',
    letterSpacing: .45,
  },
  playerRoleRight: { color: '#FF8C27' },
  playerTag: {
    ...typography.displaySmall,
    width: '100%',
    color: colors.text,
  },
  vsBlock: {
    width: '28%',
    minWidth: 0,
    alignItems: 'center',
  },
  vs: {
    ...typography.metricLarge,
    color: colors.text,
    fontSize: 32,
    lineHeight: 35,
  },
  heroMeta: {
    ...typography.metadata,
    width: '100%',
    marginTop: 4,
    color: colors.textMuted,
    textAlign: 'center',
  },
  heroFooter: {
    zIndex: 2,
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: 'rgba(4,9,13,.72)',
    borderTopWidth: 1,
    borderTopColor: '#30414E',
  },
  heroCallState: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroCallText: {
    ...typography.control,
    flexShrink: 1,
    color: '#42B7FF',
  },
  heroFollow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroFollowText: { ...typography.control, color: colors.text },
  status: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    backgroundColor: '#111A22',
    borderWidth: 1,
    borderColor: '#30414E',
  },
  statusActive: { backgroundColor: '#171E0E', borderColor: '#3D491D' },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textMuted },
  statusDotActive: { backgroundColor: colors.volt },
  statusText: { ...typography.metadata, color: colors.textMuted, letterSpacing: .2 },
  statusTextActive: { color: colors.volt },
  actionCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 20,
    borderRadius: 26,
    borderWidth: 1,
  },
  createCard: {
    minHeight: 196,
    justifyContent: 'center',
    borderColor: '#5D3A88',
  },
  joinCard: {
    minHeight: 174,
    justifyContent: 'center',
    borderColor: '#08708F',
  },
  joinCardExpanded: { minHeight: 292 },
  actionCardContent: {
    zIndex: 2,
    width: '72%',
    minWidth: 0,
  },
  actionEyebrow: {
    ...typography.eyebrow,
    color: colors.volt,
    letterSpacing: .8,
  },
  actionTitle: {
    ...typography.displaySmall,
    marginTop: 7,
    color: colors.text,
  },
  actionCopy: {
    ...typography.bodyComfort,
    marginTop: 5,
    color: '#B9C0C8',
  },
  actionCta: {
    alignSelf: 'flex-start',
    minHeight: 48,
    marginTop: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    borderRadius: 11,
    backgroundColor: '#F5F7F8',
    boxShadow: '0 5px 15px rgba(0,0,0,.22)',
  },
  actionCtaPressed: { opacity: .78 },
  actionCtaText: {
    ...typography.control,
    color: '#0A0D10',
    letterSpacing: .35,
  },
  actionIcon: {
    position: 'absolute',
    zIndex: 1,
    right: -8,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: .82,
  },
  createIcon: {
    top: 34,
    transform: [{ rotate: '-7deg' }],
  },
  joinIcon: {
    top: 30,
    right: -4,
    transform: [{ rotate: '-8deg' }],
  },
  chevronExpanded: { transform: [{ rotate: '90deg' }] },
  inviteEditor: {
    width: '100%',
    marginTop: 12,
    gap: 9,
  },
  inviteInput: {
    ...typography.bodyStrong,
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: 11,
    backgroundColor: 'rgba(4,12,17,.92)',
    borderWidth: 1,
    borderColor: '#1D8CAB',
    color: colors.text,
  },
  inviteButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.volt,
  },
  inviteButtonText: {
    ...typography.control,
    color: '#080A0C',
    letterSpacing: .4,
  },
  stats: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderRadius: 22,
    backgroundColor: '#111A22',
    borderWidth: 1,
    borderColor: '#30414E',
  },
  stat: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statValue: { ...typography.metric, color: colors.text },
  statLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .4 },
  divider: { width: 1, height: 36, backgroundColor: colors.border },
  rivalriesSummary: {
    flex: 1.25,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  rivalriesSummaryText: {
    ...typography.eyebrow,
    flexShrink: 1,
    color: colors.textMuted,
    letterSpacing: .35,
    textAlign: 'right',
  },
  rivalryList: { gap: 9 },
  card: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 22,
    backgroundColor: '#111A22',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardMain: { flex: 1, minWidth: 0 },
  cardEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .4 },
  cardTitle: { ...typography.cardTitle, marginTop: 4, color: colors.text },
  cardVs: { color: colors.volt },
  cardDate: { ...typography.caption, marginTop: 4, color: colors.textMuted },
  emptyHero: {
    minHeight: 142,
    justifyContent: 'center',
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#111A22',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 7,
  },
  emptyEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 },
  emptyTitle: { ...typography.displaySmall, maxWidth: 320, color: colors.text },
  emptyText: { ...typography.body, maxWidth: 330, color: colors.textMuted },
  emptyList: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#111A22',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyListText: { ...typography.body, color: colors.textMuted },
  listSkeleton: { gap: 9 },
  listSkeletonRow: {
    minHeight: 92,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    backgroundColor: '#111A22',
    borderWidth: 1,
    borderColor: colors.border,
  },
  listSkeletonCopy: { flex: 1, minWidth: 0, gap: 7 },
  disabled: { opacity: .45 },
  pressed: { opacity: .75 },
});
