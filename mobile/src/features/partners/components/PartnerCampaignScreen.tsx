import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import {
  claimPartnerCampaignRewards,
  followPartnerCampaignMatch,
  joinPartnerCampaign,
  loadPartnerCampaign,
  participateInPartnerFactionMission,
} from '../api';
import type {
  PartnerCampaignData,
  PartnerCampaignMatch,
  PartnerCampaignReward,
  PartnerCampaignTask,
} from '../types';

type PartnerCampaignScreenProps = {
  previewData?: PartnerCampaignData;
};

export default function PartnerCampaignScreen({ previewData }: PartnerCampaignScreenProps) {
  const params = useLocalSearchParams<{ key?: string | string[] }>();
  const campaignKey = firstParam(params.key) || 'nova-week';
  const { profile } = useAuth();
  const { refresh: refreshCosmetics } = useCosmetics();
  const [data, setData] = useState<PartnerCampaignData | null>(previewData ?? null);
  const [loading, setLoading] = useState(!previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const impressionRef = useRef('');

  const load = useCallback(async (refresh = false) => {
    if (previewData) {
      setData(previewData);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setData(await loadPartnerCampaign(campaignKey));
    } catch (caught) {
      setError(messageFrom(caught, 'Impossible de charger cette activation.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaignKey, previewData]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!data || previewData) return;
    const day = new Date().toISOString().slice(0, 10);
    const eventKey = `campaign:${data.campaign.key}:${day}`;
    if (impressionRef.current === eventKey) return;

    impressionRef.current = eventKey;
    void trackAnalyticsEvent({
      type: 'collection_affichee',
      campaignKey: data.campaign.key,
      idempotencyKey: eventKey,
    }).catch(() => {
      if (impressionRef.current === eventKey) impressionRef.current = '';
    });
  }, [data, previewData]);

  const run = useCallback(async (
    key: string,
    action: () => Promise<PartnerCampaignData>,
    success: string,
  ) => {
    if (busy) return false;
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      const next = await action();
      setData(next);
      setMessage(success);
      return true;
    } catch (caught) {
      setError(messageFrom(caught, 'Action Nova impossible.'));
      return false;
    } finally {
      setBusy(null);
    }
  }, [busy]);

  async function claimRewards() {
    const claimed = await run(
      'claim',
      () => claimPartnerCampaignRewards(campaignKey),
      'Le lot Nova est maintenant permanent dans ton Locker.',
    );
    if (claimed) await refreshCosmetics();
  }

  if (loading && !data) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color="#AFA0FF" />
          <Text style={styles.loadingText}>ALIGNEMENT DE LA SUPERNOVA…</Text>
        </View>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>SIGNAL INTROUVABLE.</Text>
          <Text style={styles.muted}>{error ?? 'Cette activation n’est pas disponible.'}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>REVENIR</Text></Pressable>
        </View>
      </Screen>
    );
  }

  const progress = data.progress.goal
    ? Math.min(100, Math.round((data.progress.current / data.progress.goal) * 100))
    : 0;
  const followTask = data.tasks.find((task) => task.type === 'match_follow');
  const claimable = data.completed && !data.rewardClaimed;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#AFA0FF" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Revenir au Locker" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>← LOCKER</Text></Pressable>
          <View style={styles.headerCopy}><Text style={styles.headerEyebrow}>ACTIVATION // PROTOTYPE</Text><Text style={styles.headerTitle}>{data.campaign.partner.toUpperCase()}</Text></View>
          <Pressable accessibilityLabel="Actualiser la progression" accessibilityRole="button" disabled={refreshing} onPress={() => void load(true)} style={({ pressed }) => [styles.sync, pressed && styles.pressed]}><Text style={styles.syncText}>SYNCHRO</Text></Pressable>
        </View>

        <View style={styles.hero}>
          <LinearGradient colors={['#2A1858', '#100D1F', '#070A0F']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
          <View style={styles.heroPlanet}><View style={styles.heroPlanetCore} /></View>
          <View style={styles.heroOrbit}><View style={styles.heroOrbitNode} /></View>
          <View style={styles.heroTop}><Text style={styles.fictionPill}>{data.campaign.fictionalPartner ? 'PARTENAIRE FICTIF' : 'PARTENAIRE'}</Text><Text style={styles.heroDate}>{dateRange(data.campaign.startsAt, data.campaign.endsAt)}</Text></View>
          <Text style={styles.heroKicker}>NOVA // 01</Text>
          <Text style={styles.heroTitle}>NOVA{`\n`}WEEK</Text>
          <Text style={styles.heroDescription}>{data.campaign.description}</Text>
          <View style={styles.progressPanel}>
            <View style={styles.progressHeader}><Text style={styles.progressLabel}>{data.rewardClaimed ? 'COLLECTION DÉBLOQUÉE' : data.completed ? 'SIGNAL COMPLET' : data.joined ? 'SIGNAL EN COURS' : 'SIGNAL EN ATTENTE'}</Text><Text style={styles.progressValue}>{data.progress.current}/{data.progress.goal}</Text></View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(data.joined ? 3 : 0, progress)}%` }]} /></View>
          </View>
          {!data.joined ? (
            <Pressable
              accessibilityLabel="Rejoindre Nova Week"
              accessibilityRole="button"
              accessibilityState={{ disabled: !data.eligible || Boolean(busy) }}
              disabled={!data.eligible || Boolean(busy)}
              onPress={() => void run('join', () => joinPartnerCampaign(campaignKey), 'Tu participes maintenant à Nova Week.')}
              style={({ pressed }) => [styles.primaryButton, !data.eligible && styles.disabled, pressed && styles.pressed]}
            >
              {busy === 'join' ? <ActivityIndicator color="#090A0D" /> : <Text style={styles.primaryButtonText}>REJOINDRE L’ACTIVATION</Text>}
            </Pressable>
          ) : null}
          {!data.eligible && !data.joined ? <Text style={styles.eligibilityHint}>Choisis au moins un jeu et une faction dans ton profil pour devenir éligible.</Text> : null}
        </View>

        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable></View> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}

        <SectionHeader eyebrow="PARCOURS // PARTICIPATION" meta={`${data.tasks.filter((task) => task.completed).length}/${data.tasks.length}`} title="TROIS SIGNAUX. AUCUN SCORE REQUIS." />
        <View style={styles.taskList}>
          {data.tasks.map((task) => (
            <TaskCard
              busy={busy}
              campaignKey={campaignKey}
              data={data}
              key={task.key}
              onRun={run}
              task={task}
            />
          ))}
        </View>

        {followTask ? (
          <View style={styles.matchSection}>
            <View style={styles.matchSectionHeader}><View><Text style={styles.sectionEyebrow}>SUIVI NOVA</Text><Text style={styles.matchSectionTitle}>PROCHAINES AFFICHES</Text></View><Text style={styles.sectionMeta}>{followTask.progress}/{followTask.goal}</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchRail}>
              {data.matches.map((match) => (
                <CampaignMatchCard
                  busy={Boolean(busy)}
                  joined={data.joined}
                  key={match.id}
                  match={match}
                  onFollow={() => void run(`match:${match.id}`, () => followPartnerCampaignMatch(campaignKey, match.id), `${match.tagA}–${match.tagB} rejoint ton suivi Nova.`)}
                />
              ))}
            </ScrollView>
            {!data.matches.length ? <Text style={styles.emptyText}>Aucune affiche compatible pour le moment. Le suivi se remplira avec le prochain calendrier.</Text> : null}
          </View>
        ) : null}

        <SectionHeader eyebrow="LOT FIXE // 3 OBJETS" meta={data.rewardClaimed ? 'ACQUIS' : 'À DÉBLOQUER'} title="LA COLLECTION SUPERNOVA." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rewardRail}>
          {data.rewards.map((reward) => <RewardCard key={reward.id} reward={reward} />)}
        </ScrollView>
        <View style={[styles.claimPanel, claimable && styles.claimPanelReady]}>
          <View style={styles.claimCopy}><Text style={styles.claimEyebrow}>{data.rewardClaimed ? 'LOT RÉCLAMÉ' : claimable ? 'COFFRE OUVERT' : 'COFFRE VERROUILLÉ'}</Text><Text style={styles.claimTitle}>{data.rewardClaimed ? 'Tes objets restent à toi.' : claimable ? 'La supernova est stable.' : 'Complète les trois signaux.'}</Text><Text style={styles.claimText}>Cadre, titre et variation de relique. Connus à l’avance, permanents, sans effet compétitif.</Text></View>
          <Pressable
            accessibilityLabel="Réclamer les récompenses Nova"
            accessibilityRole="button"
            accessibilityState={{ disabled: !claimable || Boolean(busy) }}
            disabled={!claimable || Boolean(busy)}
            onPress={() => void claimRewards()}
            style={({ pressed }) => [styles.claimButton, !claimable && styles.claimButtonLocked, pressed && styles.pressed]}
          >
            {busy === 'claim' ? <ActivityIndicator color="#090A0D" /> : <Text style={[styles.claimButtonText, !claimable && styles.claimButtonTextLocked]}>{data.rewardClaimed ? 'RÉCLAMÉ ✓' : 'RÉCLAMER LE LOT'}</Text>}
          </Pressable>
        </View>

        <View style={styles.fairnessCard}>
          <View style={styles.fairnessIcon}><Text style={styles.fairnessGlyph}>◎</Text></View>
          <View style={styles.fairnessCopy}><Text style={styles.fairnessEyebrow}>MESURE RESPONSABLE</Text><Text style={styles.fairnessTitle}>Participation, jamais précision.</Text><Text style={styles.fairnessText}>Nova Week compte tes actions, pas le résultat de tes Calls. Aucun identifiant publicitaire, aucune donnée personnelle envoyée au partenaire.</Text></View>
        </View>

        {profile?.est_admin || previewData ? (
          <Pressable accessibilityLabel="Voir le rapport partenaire agrégé" accessibilityRole="button" onPress={() => router.push((previewData ? '/campaign-report-preview' : `/admin/campaigns/${data.campaign.key}`) as never)} style={({ pressed }) => [styles.reportLink, pressed && styles.pressed]}><View><Text style={styles.reportEyebrow}>PARTENAIRE // INTERNE</Text><Text style={styles.reportTitle}>Voir le rapport agrégé</Text></View><Text style={styles.reportArrow}>→</Text></Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function TaskCard({ busy, campaignKey, data, onRun, task }: {
  busy: string | null;
  campaignKey: string;
  data: PartnerCampaignData;
  onRun: (key: string, action: () => Promise<PartnerCampaignData>, success: string) => Promise<boolean>;
  task: PartnerCampaignTask;
}) {
  const meta = taskMeta(task.type);
  const pct = Math.min(100, Math.round((task.progress / task.goal) * 100));
  const factionBusy = busy === `task:${task.key}`;
  return (
    <View style={[styles.taskCard, task.completed && styles.taskCardComplete]}>
      <View style={[styles.taskIcon, task.completed && styles.taskIconComplete]}><Text style={[styles.taskIconText, task.completed && styles.taskIconTextComplete]}>{task.completed ? '✓' : meta.glyph}</Text></View>
      <View style={styles.taskCopy}>
        <View style={styles.taskTop}><Text style={styles.taskEyebrow}>{meta.eyebrow}</Text><Text style={[styles.taskCount, task.completed && styles.taskCountComplete]}>{task.progress}/{task.goal}</Text></View>
        <Text style={styles.taskTitle}>{task.title.toUpperCase()}</Text>
        <Text style={styles.taskDescription}>{task.description}</Text>
        <View style={styles.taskTrack}><View style={[styles.taskFill, task.completed && styles.taskFillComplete, { width: `${Math.max(task.progress ? 4 : 0, pct)}%` }]} /></View>
        {task.type === 'calls' && !task.completed ? <Pressable accessibilityRole="button" disabled={!data.joined} onPress={() => router.push('/(tabs)/matches')}><Text style={[styles.taskAction, !data.joined && styles.taskActionDisabled]}>{data.joined ? 'ALLER DANS L’ARENA →' : 'REJOINS D’ABORD NOVA WEEK'}</Text></Pressable> : null}
        {task.type === 'faction_mission' && !task.completed ? (
          <Pressable
            accessibilityRole="button"
            disabled={!data.joined || Boolean(busy)}
            onPress={() => void onRun(`task:${task.key}`, () => participateInPartnerFactionMission(campaignKey), 'Le signal de ta faction est activé.')}
            style={[styles.taskInlineButton, (!data.joined || Boolean(busy)) && styles.taskInlineButtonDisabled]}
          >
            {factionBusy ? <ActivityIndicator color="#090A0D" size="small" /> : <Text style={styles.taskInlineButtonText}>ACTIVER LE SIGNAL</Text>}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function CampaignMatchCard({ busy, joined, match, onFollow }: { busy: boolean; joined: boolean; match: PartnerCampaignMatch; onFollow: () => void }) {
  return (
    <View style={[styles.matchCard, match.followed && styles.matchCardFollowed]}>
      <View style={styles.matchTop}><Text style={styles.matchGame}>{gameLabel(match.game)}</Text><Text style={styles.matchDate}>{match.status === 'en_cours' ? 'LIVE' : shortDate(match.startsAt)}</Text></View>
      <Text numberOfLines={1} style={styles.matchEvent}>{match.event.toUpperCase()}</Text>
      <View style={styles.versus}><Text style={styles.teamTag}>{match.tagA}</Text><Text style={styles.vs}>VS</Text><Text style={styles.teamTag}>{match.tagB}</Text></View>
      <Text numberOfLines={1} style={styles.matchNames}>{match.teamA} · {match.teamB}</Text>
      <Pressable accessibilityRole="button" disabled={match.followed || !joined || busy} onPress={onFollow} style={[styles.followButton, match.followed && styles.followButtonDone, (!joined || busy) && styles.disabled]}><Text style={[styles.followButtonText, match.followed && styles.followButtonTextDone]}>{match.followed ? 'SUIVI ✓' : joined ? 'AJOUTER AU SUIVI' : 'REJOINDRE D’ABORD'}</Text></Pressable>
    </View>
  );
}

function RewardCard({ reward }: { reward: PartnerCampaignReward }) {
  return (
    <View style={[styles.rewardCard, { borderColor: `${reward.accent}72` }]}>
      <RewardVisual reward={reward} />
      <Text style={[styles.rewardRarity, { color: reward.accent }]}>{reward.rarity.toUpperCase()}</Text>
      <Text numberOfLines={2} style={styles.rewardName}>{reward.name}</Text>
      <Text numberOfLines={2} style={styles.rewardDescription}>{reward.description}</Text>
      <Text style={styles.rewardState}>{reward.owned ? 'DANS TON LOCKER ✓' : slotLabel(reward.slot)}</Text>
    </View>
  );
}

function RewardVisual({ reward }: { reward: PartnerCampaignReward }) {
  if (reward.slot === 'cadre_profil') return <View style={[styles.rewardVisual, styles.frameVisual, { borderColor: reward.accent }]}><View style={[styles.frameCore, { backgroundColor: `${reward.accent}2A` }]}><Text style={[styles.frameCoreText, { color: reward.accent }]}>N</Text></View><View style={[styles.frameCorner, { borderColor: reward.accent }]} /></View>;
  if (reward.slot === 'titre_profil') return <View style={styles.rewardVisual}><Text style={styles.titlePseudo}>JOUEUR_01</Text><Text style={[styles.titleValue, { color: reward.accent }]}>{reward.name.toUpperCase()}</Text><View style={[styles.titleLine, { backgroundColor: reward.accent }]} /></View>;
  return <View style={styles.rewardVisual}><View style={[styles.relicAura, { backgroundColor: `${reward.accent}20` }]} /><View style={[styles.relicNeck, { borderColor: reward.accent }]} /><View style={[styles.relicBody, { borderColor: reward.accent }]}><View style={[styles.relicLiquid, { backgroundColor: `${reward.accent}4A` }]} /><View style={[styles.relicHeart, { backgroundColor: reward.accent, boxShadow: `0 0 14px ${reward.accent}` }]} /></View></View>;
}

function SectionHeader({ eyebrow, meta, title }: { eyebrow: string; meta: string; title: string }) { return <View style={styles.sectionHeader}><View style={styles.sectionHeaderCopy}><Text style={styles.sectionEyebrow}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text></View><Text style={styles.sectionMeta}>{meta}</Text></View>; }
function firstParam(value?: string | string[]) { return Array.isArray(value) ? value[0] : value; }
function taskMeta(type: PartnerCampaignTask['type']) { if (type === 'match_follow') return { glyph: '◉', eyebrow: 'SIGNAL 01 // SUIVI' }; if (type === 'calls') return { glyph: '◎', eyebrow: 'SIGNAL 02 // ARENA' }; return { glyph: '✦', eyebrow: 'SIGNAL 03 // FACTION' }; }
function slotLabel(slot: PartnerCampaignReward['slot']) { if (slot === 'cadre_profil') return 'CADRE DE PROFIL'; if (slot === 'titre_profil') return 'TITRE SUPPORTER'; return 'VARIATION DE RELIQUE'; }
function gameLabel(game: string) { if (game === 'lol') return 'LEAGUE OF LEGENDS'; if (game === 'valorant') return 'VALORANT'; if (game === 'rocket_league') return 'ROCKET LEAGUE'; return game.toUpperCase(); }
function shortDate(value: string) { return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase(); }
function dateRange(start: string, end: string) { const format = (value: string) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase(); return `${format(start)} — ${format(end)}`; }
function messageFrom(value: unknown, fallback: string) { return value instanceof Error && value.message ? value.message : fallback; }

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: 54, gap: 20 },
  center: { flex: 1, minHeight: 520, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { ...typography.eyebrow, color: '#AFA0FF', letterSpacing: 1 },
  errorTitle: { ...typography.displaySmall, color: colors.text, textAlign: 'center' },
  muted: { ...typography.body, maxWidth: 320, color: colors.textMuted, textAlign: 'center' },
  header: { minHeight: 72, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#1A1725' },
  back: { minHeight: 42, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#302A42' },
  backText: { ...typography.action, color: colors.text },
  headerCopy: { flex: 1, minWidth: 0 },
  headerEyebrow: { ...typography.eyebrow, color: '#887EA1', letterSpacing: .7 },
  headerTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 24, lineHeight: 25 },
  sync: { width: 47, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#171221', borderWidth: 1, borderColor: '#463769' },
  syncText: { ...typography.label, color: '#AFA0FF', fontSize: 9 },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 520, marginHorizontal: spacing.md, padding: 20, borderRadius: 31, borderWidth: 1, borderColor: '#5F4788' },
  heroPlanet: { position: 'absolute', right: -54, top: 64, width: 240, height: 240, borderRadius: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: '#281A4B', boxShadow: '0 0 80px rgba(139,108,255,.28)' },
  heroPlanetCore: { width: 162, height: 162, borderRadius: 81, backgroundColor: '#8B6CFF', opacity: .16, boxShadow: '0 0 54px rgba(199,125,255,.55)' },
  heroOrbit: { position: 'absolute', right: -95, top: 19, width: 332, height: 332, borderRadius: 166, borderWidth: 1, borderColor: 'rgba(175,160,255,.28)', transform: [{ rotate: '-18deg' }] },
  heroOrbitNode: { position: 'absolute', left: 31, top: 56, width: 11, height: 11, borderRadius: 6, backgroundColor: '#C77DFF', boxShadow: '0 0 14px #C77DFF' },
  heroTop: { zIndex: 2, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  fictionPill: { ...typography.label, paddingHorizontal: 9, paddingVertical: 7, overflow: 'hidden', color: '#D9D2F4', borderRadius: 999, backgroundColor: 'rgba(8,8,14,.58)', borderWidth: 1, borderColor: '#594775' },
  heroDate: { ...typography.label, paddingTop: 8, color: '#AEA5C5' },
  heroKicker: { ...typography.eyebrow, zIndex: 2, marginTop: 54, color: '#C0B1FF', letterSpacing: 1.4 },
  heroTitle: { zIndex: 2, maxWidth: 310, marginTop: 4, color: colors.text, fontFamily: fonts.display, fontSize: 70, lineHeight: 61, letterSpacing: -2.4 },
  heroDescription: { ...typography.bodyStrong, zIndex: 2, maxWidth: 310, marginTop: 16, color: '#D7D1E6' },
  progressPanel: { zIndex: 2, marginTop: 'auto', padding: 13, borderRadius: 18, backgroundColor: 'rgba(5,6,11,.72)', borderWidth: 1, borderColor: '#403650' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  progressLabel: { ...typography.eyebrow, color: '#C0B1FF', letterSpacing: .55 },
  progressValue: { ...typography.label, color: colors.text, fontVariant: ['tabular-nums'] },
  progressTrack: { height: 7, marginTop: 9, overflow: 'hidden', borderRadius: 5, backgroundColor: '#24202C' },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: '#AFA0FF', boxShadow: '0 0 12px rgba(175,160,255,.7)' },
  primaryButton: { zIndex: 2, minHeight: 54, marginTop: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#AFA0FF' },
  primaryButtonText: { ...typography.action, color: '#090A0D', letterSpacing: .5 },
  secondaryButton: { minHeight: 47, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#111A22' },
  secondaryButtonText: { ...typography.action, color: colors.text },
  eligibilityHint: { ...typography.caption, zIndex: 2, marginTop: 9, color: '#C8BEDC', textAlign: 'center' },
  error: { marginHorizontal: spacing.md, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, backgroundColor: '#1A1018', borderWidth: 1, borderColor: '#5A294E' },
  errorText: { ...typography.body, flex: 1, color: '#FF9CCF' },
  retry: { ...typography.action, color: '#C0B1FF' },
  message: { ...typography.label, marginHorizontal: spacing.md, padding: 12, color: '#CFC5FF', textAlign: 'center', borderRadius: 15, backgroundColor: '#171324', borderWidth: 1, borderColor: '#4B3C6A' },
  sectionHeader: { minHeight: 78, marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 },
  sectionHeaderCopy: { flex: 1, minWidth: 0 },
  sectionEyebrow: { ...typography.eyebrow, color: '#AFA0FF', letterSpacing: .75 },
  sectionTitle: { ...typography.sectionTitle, maxWidth: 330, marginTop: 4, color: colors.text },
  sectionMeta: { ...typography.label, color: '#9187A5' },
  taskList: { marginHorizontal: spacing.md, gap: 10 },
  taskCard: { minHeight: 150, padding: 14, flexDirection: 'row', gap: 12, borderRadius: 23, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#292634' },
  taskCardComplete: { backgroundColor: '#111021', borderColor: '#594B78' },
  taskIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#1B1726', borderWidth: 1, borderColor: '#463A60' },
  taskIconComplete: { backgroundColor: '#AFA0FF', borderColor: '#AFA0FF' },
  taskIconText: { color: '#C4B8F4', fontFamily: fonts.display, fontSize: 20 },
  taskIconTextComplete: { color: '#090A0D' },
  taskCopy: { flex: 1, minWidth: 0 },
  taskTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  taskEyebrow: { ...typography.eyebrow, color: '#AFA0FF', letterSpacing: .5 },
  taskCount: { ...typography.label, color: '#81788F', fontVariant: ['tabular-nums'] },
  taskCountComplete: { color: '#CFC5FF' },
  taskTitle: { ...typography.cardTitle, marginTop: 4, color: colors.text },
  taskDescription: { ...typography.caption, marginTop: 4, color: colors.textMuted },
  taskTrack: { height: 5, marginTop: 10, overflow: 'hidden', borderRadius: 4, backgroundColor: '#211F29' },
  taskFill: { height: '100%', borderRadius: 4, backgroundColor: '#7764AE' },
  taskFillComplete: { backgroundColor: '#AFA0FF' },
  taskAction: { ...typography.action, marginTop: 11, color: '#BFB2FF' },
  taskActionDisabled: { color: '#5F5969' },
  taskInlineButton: { minHeight: 40, marginTop: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#AFA0FF' },
  taskInlineButtonDisabled: { opacity: .35 },
  taskInlineButtonText: { ...typography.action, color: '#090A0D' },
  matchSection: { gap: 10 },
  matchSectionHeader: { marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  matchSectionTitle: { ...typography.cardTitle, marginTop: 3, color: colors.text },
  matchRail: { gap: 10, paddingHorizontal: spacing.md },
  matchCard: { width: 238, minHeight: 218, padding: 14, borderRadius: 23, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#2A2833' },
  matchCardFollowed: { backgroundColor: '#121020', borderColor: '#5A4B7B' },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  matchGame: { ...typography.eyebrow, flex: 1, color: '#AFA0FF', letterSpacing: .45 },
  matchDate: { ...typography.label, color: '#898092', fontSize: 9 },
  matchEvent: { ...typography.caption, marginTop: 7, color: '#77707F' },
  versus: { minHeight: 58, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13, borderRadius: 16, backgroundColor: '#111A22' },
  teamTag: { color: colors.text, fontFamily: fonts.display, fontSize: 23 },
  vs: { ...typography.label, color: '#6C6672' },
  matchNames: { ...typography.caption, marginTop: 8, color: colors.textMuted, textAlign: 'center' },
  followButton: { minHeight: 42, marginTop: 'auto', alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#AFA0FF' },
  followButtonDone: { backgroundColor: '#19162A', borderWidth: 1, borderColor: '#544671' },
  followButtonText: { ...typography.action, color: '#090A0D' },
  followButtonTextDone: { color: '#C6BBF8' },
  emptyText: { ...typography.body, marginHorizontal: spacing.md, color: colors.textMuted },
  rewardRail: { gap: 10, paddingHorizontal: spacing.md },
  rewardCard: { width: 184, minHeight: 300, padding: 12, borderRadius: 23, backgroundColor: '#111A22', borderWidth: 1 },
  rewardVisual: { position: 'relative', height: 126, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#282431' },
  frameVisual: { width: '100%', borderWidth: 2 },
  frameCore: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 23 },
  frameCoreText: { fontFamily: fonts.display, fontSize: 32 },
  frameCorner: { position: 'absolute', right: -1, top: -1, width: 58, height: 47, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 17 },
  titlePseudo: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  titleValue: { marginTop: 5, fontFamily: fonts.semibold, fontSize: 9, letterSpacing: .4 },
  titleLine: { width: 42, height: 3, marginTop: 12 },
  relicAura: { position: 'absolute', width: 91, height: 91, borderRadius: 46 },
  relicNeck: { width: 24, height: 28, marginBottom: -4, borderWidth: 1.5, borderBottomWidth: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#11131B' },
  relicBody: { width: 73, height: 70, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', borderRadius: 31, borderWidth: 1.5, backgroundColor: 'rgba(20,18,31,.9)' },
  relicLiquid: { position: 'absolute', left: 3, right: 3, bottom: 3, height: 39, borderBottomLeftRadius: 27, borderBottomRightRadius: 27 },
  relicHeart: { width: 11, height: 24, marginBottom: 19, borderRadius: 6 },
  rewardRarity: { ...typography.eyebrow, marginTop: 11, letterSpacing: .5 },
  rewardName: { ...typography.cardTitle, minHeight: 40, marginTop: 4, color: colors.text },
  rewardDescription: { ...typography.caption, minHeight: 34, marginTop: 4, color: colors.textMuted },
  rewardState: { ...typography.label, marginTop: 'auto', color: '#AFA0FF', fontSize: 9 },
  claimPanel: { minHeight: 204, marginHorizontal: spacing.md, padding: 17, borderRadius: 25, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#2D2936', gap: 14 },
  claimPanelReady: { backgroundColor: '#151126', borderColor: '#6C55A0', boxShadow: '0 0 28px rgba(139,108,255,.12)' },
  claimCopy: { flex: 1 },
  claimEyebrow: { ...typography.eyebrow, color: '#AFA0FF', letterSpacing: .7 },
  claimTitle: { ...typography.sectionTitle, marginTop: 4, color: colors.text },
  claimText: { ...typography.body, marginTop: 6, color: colors.textMuted },
  claimButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#AFA0FF' },
  claimButtonLocked: { backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  claimButtonText: { ...typography.action, color: '#090A0D' },
  claimButtonTextLocked: { color: '#6C6E76' },
  fairnessCard: { minHeight: 158, marginHorizontal: spacing.md, padding: 16, flexDirection: 'row', gap: 13, borderRadius: 24, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#30414E' },
  fairnessIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#191426' },
  fairnessGlyph: { color: '#AFA0FF', fontFamily: fonts.display, fontSize: 25 },
  fairnessCopy: { flex: 1, minWidth: 0 },
  fairnessEyebrow: { ...typography.eyebrow, color: '#AFA0FF', letterSpacing: .55 },
  fairnessTitle: { ...typography.cardTitle, marginTop: 4, color: colors.text },
  fairnessText: { ...typography.caption, marginTop: 6, color: colors.textMuted },
  reportLink: { minHeight: 86, marginHorizontal: spacing.md, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 22, backgroundColor: '#151126', borderWidth: 1, borderColor: '#594677' },
  reportEyebrow: { ...typography.eyebrow, color: '#AFA0FF', letterSpacing: .6 },
  reportTitle: { ...typography.cardTitle, marginTop: 4, color: colors.text },
  reportArrow: { color: '#AFA0FF', fontFamily: fonts.display, fontSize: 25 },
  pressed: { opacity: .76 },
  disabled: { opacity: .38 },
});
