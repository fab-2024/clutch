import { router } from 'expo-router';
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
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>SOCIAL // DÉFIS</Text>
          <Text style={styles.title}>UN CALL. DEUX JOUEURS.</Text>
          <Text style={styles.subtitle}>Le même marché classé « vainqueur de la série », deux camps opposés et aucune mise supplémentaire.</Text>
        </View>

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

        {loading ? <DuelHeroSkeleton /> : featured ? <DuelHero duel={featured} onOpen={() => openDuel(featured.token)} /> : error ? null : <EmptyDuelHero />}

        <DuelMissionsSection
          data={missions}
          error={missionsError}
          loading={missionsLoading}
          onOpen={openMissions}
          onRetry={retryMissions}
          ref={missionTriggerRef}
        />

        <Pressable
          accessibilityHint="Ouvre la liste des matchs pour choisir un call"
          accessibilityLabel="Créer un nouveau duel classé"
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/matches')}
          style={({ pressed }) => [styles.newDuel, pressed && styles.pressed]}
        >
          <View><Text style={styles.newDuelEyebrow}>NOUVEAU DUEL CLASSÉ</Text><Text style={styles.newDuelTitle}>Choisis ton match.</Text><Text style={styles.newDuelCopy}>Pose ton call puis cible un ami du Cercle ou partage une invitation ouverte.</Text></View>
          <View style={styles.newDuelArrow}><Text style={styles.newDuelArrowText}>→</Text></View>
        </Pressable>

        <View style={styles.inviteCard}>
          <View style={styles.inviteCopy}><Text style={styles.inviteEyebrow}>REJOINDRE UN RIVAL</Text><Text style={styles.inviteTitle}>Tu as reçu un code ?</Text></View>
          <TextInput
            accessibilityLabel="Code ou lien d’invitation au duel"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setInviteCode}
            onSubmitEditing={openInvitation}
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
            onPress={openInvitation}
            style={({ pressed }) => [styles.inviteButton, !invitationToken && styles.disabled, pressed && styles.pressed]}
          >
            <Text style={styles.inviteButtonText}>OUVRIR L’INVITATION</Text>
          </Pressable>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statValue}>{active.length}</Text><Text style={styles.statLabel}>ACTIFS</Text></View>
          <View style={styles.divider} />
          <View style={styles.stat}><Text style={styles.statValue}>{finished.length}</Text><Text style={styles.statLabel}>TERMINÉS</Text></View>
          <View style={styles.divider} />
          <View style={styles.stat}><Text style={styles.statValue}>{duels.length}</Text><Text style={styles.statLabel}>TOTAL</Text></View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>TES RIVALITÉS</Text><Text style={styles.sectionMeta}>{duels.length}</Text></View>
          {loading ? <DuelListSkeleton /> : duels.length ? duels.map((duel) => <DuelCard key={duel.token} duel={duel} onOpen={() => openDuel(duel.token)} />) : error ? null : <View style={styles.emptyList}><Text style={styles.emptyListText}>Ton premier duel apparaîtra ici après un challenge.</Text></View>}
        </View>
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

function DuelHero({ duel, onOpen }: { duel: DuelRow; onOpen: () => void }) {
  const creator = duel.moi_role === 'createur';
  const targeted = duel.moi_role === 'cible';
  const rival = creator ? (duel.accepteur_pseudo || 'EN ATTENTE') : (duel.createur_pseudo || 'RIVAL');
  const mine = creator ? 'TOI' : (duel.accepteur_pseudo || 'TOI');
  const myChoice = creator ? duel.createur_choix : targeted ? opposite(duel.createur_choix) : duel.accepteur_choix;
  const myTag = myChoice === 'a' ? (duel.tag_a || duel.equipe_a || 'A') : myChoice === 'b' ? (duel.tag_b || duel.equipe_b || 'B') : '—';
  const rivalTag = myChoice === 'a' ? (duel.tag_b || duel.equipe_b || 'B') : myChoice === 'b' ? (duel.tag_a || duel.equipe_a || 'A') : '?';
  const status = effectiveStatus(duel);
  return (
    <Pressable
      accessibilityHint="Ouvre le détail de ce duel"
      accessibilityLabel={`Duel ${myTag} contre ${rivalTag}, rival ${rival}, statut ${statusLabel(status)}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
    >
      <View style={styles.heroBlue} /><View style={styles.heroRed} />
      <View style={styles.heroTop}><Text style={styles.heroMeta}>{gameLabel(duel.jeu)} · CLASSÉ · {duel.evenement || 'MATCH'}</Text><Status status={status} /></View>
      <Text style={styles.heroKicker}>{duel.statut === 'termine' ? 'VERDICT FINAL' : targeted ? 'DUEL REÇU' : 'FACE-À-FACE'}</Text>
      <View style={styles.faceoff}>
        <Player side="left" pseudo={mine} tag={myTag} />
        <View style={styles.vsBlock}><Text style={styles.vs}>VS</Text><View style={styles.vsLine} /></View>
        <Player side="right" pseudo={rival} tag={rivalTag} />
      </View>
      <Text style={styles.heroDate}>{formatDate(duel.debut)}</Text>
    </Pressable>
  );
}

function Player({ side, pseudo, tag }: { side: 'left' | 'right'; pseudo: string; tag: string }) {
  return (
    <View style={[styles.player, side === 'right' && styles.playerRight]}>
      <View style={[styles.playerMark, side === 'right' && styles.playerMarkRight]}><Text style={styles.playerTag}>{tag}</Text></View>
      <Text numberOfLines={1} style={styles.playerPseudo}>{pseudo}</Text>
      <Text style={styles.playerRole}>{side === 'left' ? 'TON CAMP' : 'RIVAL'}</Text>
    </View>
  );
}

function EmptyDuelHero() {
  return (
    <View style={styles.emptyHero}>
      <Text style={styles.emptyEyebrow}>AUCUNE RIVALITÉ ACTIVE</Text>
      <Text style={styles.emptyTitle}>TON PREMIER FACE-À-FACE COMMENCE DANS L’ARENA.</Text>
      <Text style={styles.emptyText}>Prends position sur un match, puis défie quelqu’un qui assume le camp opposé.</Text>
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
      <View style={styles.heroSkeletonTop}>
        <Skeleton height={9} radius="pill" tone="subtle" width="54%" />
        <Skeleton height={32} radius="pill" width={94} />
      </View>
      <Skeleton height={9} radius="pill" tone="subtle" style={styles.heroSkeletonKicker} width={86} />
      <View style={styles.heroSkeletonFaceoff}>
        <View style={styles.heroSkeletonPlayer}>
          <Skeleton height={76} radius="lg" width={76} />
          <Skeleton height={16} radius="pill" width="88%" />
          <Skeleton height={8} radius="pill" tone="subtle" width="48%" />
        </View>
        <View style={styles.heroSkeletonVersus}>
          <Skeleton height={42} radius="sm" width={48} />
          <Skeleton height={3} radius="pill" width={26} />
        </View>
        <View style={[styles.heroSkeletonPlayer, styles.heroSkeletonPlayerRight]}>
          <Skeleton height={76} radius="lg" width={76} />
          <Skeleton height={16} radius="pill" width="88%" />
          <Skeleton height={8} radius="pill" tone="subtle" width="48%" />
        </View>
      </View>
      <Skeleton height={9} radius="pill" tone="subtle" style={styles.heroSkeletonDate} width={104} />
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

function gameLabel(value?: string) { const game = String(value || '').toLowerCase(); if (game.includes('lol')) return 'LOL'; if (game.includes('valorant')) return 'VAL'; if (game.includes('cs')) return 'CS2'; return 'ESPORT'; }
function formatDate(value?: string) { if (!value) return 'Date à venir'; const date = new Date(value); if (!Number.isFinite(date.getTime())) return 'Date à venir'; return date.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function effectiveStatus(duel: DuelRow): DuelStatus { return duel.statut === 'en_attente' && duel.debut && new Date(duel.debut).getTime() <= Date.now() ? 'expire' : duel.statut; }
function statusLabel(status: DuelStatus) { return status === 'termine' ? 'TERMINÉ' : status === 'accepte' ? 'VERROUILLÉ' : status === 'annule' ? 'ANNULÉ' : status === 'expire' ? 'EXPIRÉ' : 'EN ATTENTE'; }
function opposite(choice?: 'a' | 'b') { return choice === 'a' ? 'b' : choice === 'b' ? 'a' : undefined; }
function extractToken(value: string) { const cleaned = value.trim().split(/[?#]/)[0].replace(/\/+$/, ''); const token = cleaned.split('/').pop()?.toLowerCase() || ''; return /^[a-f0-9]{12,64}$/.test(token) ? token : ''; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.md, paddingBottom: layout.tabBarContentInset, gap: 22 },
  intro: { gap: 8, paddingTop: 4 }, eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.1 }, title: { ...typography.displayMedium, maxWidth: 365, color: colors.text }, subtitle: { ...typography.body, maxWidth: 360, color: colors.textMuted },
  error: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: 12, borderRadius: radius.md, backgroundColor: colors.liveSurface, borderWidth: 1, borderColor: colors.liveBorder }, errorCopy: { flex: 1, minWidth: 0 }, errorTitle: { ...typography.control, color: colors.liveText }, errorText: { ...typography.metadata, marginTop: 2, color: colors.textSecondary },
  heroSkeleton: { minHeight: 340, padding: 18, justifyContent: 'space-between', borderRadius: 30, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#28323B' },
  heroSkeletonTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heroSkeletonKicker: { alignSelf: 'center' },
  heroSkeletonFaceoff: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroSkeletonPlayer: { width: '38%', alignItems: 'flex-start', gap: 8 },
  heroSkeletonPlayerRight: { alignItems: 'flex-end' },
  heroSkeletonVersus: { width: 54, alignItems: 'center', gap: 6 },
  heroSkeletonDate: { alignSelf: 'center' },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 340, padding: 18, borderRadius: 30, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#28323B' }, heroBlue: { position: 'absolute', left: -70, bottom: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: '#123A67', opacity: 0.55 }, heroRed: { position: 'absolute', right: -70, bottom: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: '#5B173C', opacity: 0.5 },
  heroTop: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, heroMeta: { ...typography.label, flex: 1, color: colors.textMuted, letterSpacing: .35 }, heroKicker: { ...typography.eyebrow, zIndex: 2, marginTop: 30, color: colors.textMuted, letterSpacing: 1.4, textAlign: 'center' },
  faceoff: { zIndex: 2, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, player: { width: '38%', alignItems: 'flex-start' }, playerRight: { alignItems: 'flex-end' }, playerMark: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#101C27', borderWidth: 1, borderColor: '#315B7A' }, playerMarkRight: { backgroundColor: '#23121D', borderColor: '#78345A' }, playerTag: { ...typography.metricSmall, color: colors.text }, playerPseudo: { ...typography.cardTitle, width: '100%', marginTop: 10, color: colors.text }, playerRole: { ...typography.eyebrow, marginTop: 3, color: colors.textMuted, letterSpacing: .4 },
  vsBlock: { width: 54, alignItems: 'center' }, vs: { ...typography.metricLarge, color: colors.text, fontSize: 39, lineHeight: 42 }, vsLine: { width: 26, height: 3, marginTop: 6, backgroundColor: colors.volt }, heroDate: { ...typography.caption, zIndex: 2, marginTop: 28, color: colors.textMuted, textAlign: 'center' },
  status: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderRadius: 999, backgroundColor: '#11161C', borderWidth: 1, borderColor: '#242D35' }, statusActive: { backgroundColor: '#171E0E', borderColor: '#3D491D' }, statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textMuted }, statusDotActive: { backgroundColor: colors.volt }, statusText: { ...typography.metadata, color: colors.textMuted, letterSpacing: .2 }, statusTextActive: { color: colors.volt },
  newDuel: { minHeight: 122, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 17, borderRadius: 25, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#414D1E' }, newDuelEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 }, newDuelTitle: { ...typography.cardTitle, marginTop: 4, color: colors.text }, newDuelCopy: { ...typography.body, marginTop: 4, maxWidth: 275, color: colors.textMuted }, newDuelArrow: { marginLeft: 'auto', width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt }, newDuelArrowText: { color: '#080A0C', fontSize: 17, fontWeight: '900' },
  inviteCard: { padding: 16, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 10 }, inviteCopy: { gap: 4 }, inviteEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .7 }, inviteTitle: { ...typography.cardTitle, color: colors.text }, inviteInput: { ...typography.bodyStrong, minHeight: 48, paddingHorizontal: 13, borderRadius: 14, backgroundColor: '#070B0F', borderWidth: 1, borderColor: '#263039', color: colors.text }, inviteButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.volt }, inviteButtonText: { ...typography.control, color: '#080A0C', letterSpacing: .4 },
  stats: { minHeight: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 16, borderRadius: 23, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, stat: { minWidth: 70, alignItems: 'center' }, statValue: { ...typography.metric, color: colors.text }, statLabel: { ...typography.eyebrow, marginTop: 3, color: colors.textMuted, letterSpacing: .5 }, divider: { width: 1, height: 36, backgroundColor: colors.border },
  section: { gap: 9 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between' }, sectionLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .8 }, sectionMeta: { ...typography.label, color: colors.textMuted },
  card: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, cardMain: { flex: 1, minWidth: 0 }, cardEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .4 }, cardTitle: { ...typography.cardTitle, marginTop: 4, color: colors.text }, cardVs: { color: colors.volt }, cardDate: { ...typography.caption, marginTop: 4, color: colors.textMuted },
  emptyHero: { minHeight: 280, justifyContent: 'center', padding: 24, borderRadius: 30, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border, gap: 10 }, emptyEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 }, emptyTitle: { ...typography.displaySmall, maxWidth: 320, color: colors.text }, emptyText: { ...typography.body, maxWidth: 330, color: colors.textMuted },
  emptyList: { padding: 18, borderRadius: 20, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, emptyListText: { ...typography.body, color: colors.textMuted },
  listSkeleton: { gap: 9 },
  listSkeletonRow: { minHeight: 92, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  listSkeletonCopy: { flex: 1, minWidth: 0, gap: 7 },
  disabled: { opacity: 0.45 }, pressed: { opacity: 0.75 },
});
