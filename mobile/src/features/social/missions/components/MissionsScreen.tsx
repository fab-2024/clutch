import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

import { loadFriendQuests } from '../api';
import type { FriendQuest, FriendQuestsData } from '../types';

const EMPTY: FriendQuestsData = { actives: [], historique: [], duos: [], a_reveler: null };

const META: Record<string, { icon: string; eyebrow: string; title: string }> = {
  duo_calls: { icon: '⚡', eyebrow: 'MISSION DUO', title: 'DOUBLE CALL' },
  same_side: { icon: '🤝', eyebrow: 'SAME CALL', title: 'MÊME CAMP' },
  opposition: { icon: '⚔', eyebrow: 'OPPOSITION', title: 'CAMPS OPPOSÉS' },
  duel: { icon: '🔥', eyebrow: 'FACE-À-FACE', title: 'RÈGLE ÇA EN DUEL' },
  revenge: { icon: '↺', eyebrow: 'REVANCHE', title: 'REPRENDS LA MAIN' },
  league_push: { icon: '↑', eyebrow: 'LEAGUE PUSH', title: 'POUSSEZ ENSEMBLE' },
};

export default function MissionsScreen() {
  const [data, setData] = useState<FriendQuestsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try { setData(await loadFriendQuests()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Impossible de charger tes missions.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const hero = data.actives[0] ?? null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
    >
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>⚡ SOCIAL // MISSIONS</Text>
        <Text style={styles.title}>QUELQU’UN COMPTE SUR TOI.</Text>
        <Text style={styles.subtitle}>Des objectifs courts à deux. XP et Volts à la clé. Jamais de Frags gratuits.</Text>
      </View>

      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
      {loading ? <View style={styles.skeleton} /> : hero ? <HeroQuest quest={hero} /> : <EmptyMissions />}

      {data.actives.length > 1 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>EN COURS</Text><Text style={styles.sectionMeta}>{data.actives.length}/3</Text></View>
          {data.actives.slice(1, 3).map((quest) => <QuestCard key={quest.id} quest={quest} />)}
        </View>
      ) : null}

      {data.duos.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>DUO STREAKS</Text><Text style={styles.sectionMeta}>{data.duos.length}</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.duoRail}>
            {data.duos.slice(0, 8).map((duo, index) => (
              <View key={`${duo.user_id ?? duo.pseudo}-${index}`} style={styles.duoCard}>
                <View style={styles.duoAvatar}><Text style={styles.duoAvatarText}>{initials(duo.pseudo || 'Duo')}</Text></View>
                <Text numberOfLines={1} style={styles.duoName}>{duo.pseudo || 'Duo'}</Text>
                <Text style={styles.duoStreak}>🔥 {Number(duo.serie_semaines || 0)} sem.</Text>
                <Text style={styles.duoMeta}>{Number(duo.missions_terminees || 0)} missions</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>DERNIÈRES MISSIONS</Text><Text style={styles.sectionMeta}>{data.historique.length}</Text></View>
        <View style={styles.historyCard}>
          {data.historique.length ? data.historique.slice(0, 6).map((quest) => {
            const meta = metaFor(quest);
            return (
              <View key={quest.id} style={styles.historyRow}>
                <Text style={styles.historyIcon}>{meta.icon}</Text>
                <View style={styles.historyCopy}><Text style={styles.historyTitle}>{meta.title}</Text><Text style={styles.historyMeta}>avec {quest.partenaire?.pseudo || 'un joueur'}</Text></View>
                <Text style={styles.historyReward}>{quest.statut === 'terminee' ? reward(quest) : quest.statut.toUpperCase()}</Text>
              </View>
            );
          }) : <Text style={styles.emptyHistory}>Tes missions terminées laisseront leur trace ici.</Text>}
        </View>
      </View>
    </ScrollView>
  );
}

function HeroQuest({ quest }: { quest: FriendQuest }) {
  const meta = metaFor(quest);
  const pct = Math.min(100, Math.round((quest.progression / Math.max(1, quest.objectif)) * 100));
  return (
    <View style={styles.hero}>
      <View style={styles.heroGlow} />
      <Text style={styles.heroNumber}>0{Math.min(9, quest.progression + 1)}</Text>
      <View style={styles.heroTop}>
        <View style={styles.heroIcon}><Text style={styles.heroIconText}>{meta.icon}</Text></View>
        <View style={styles.heroIdentity}><Text style={styles.heroEyebrow}>{meta.eyebrow}</Text><Text style={styles.partner}>AVEC {(quest.partenaire?.pseudo || 'TON POTE').toUpperCase()}</Text></View>
      </View>
      <Text style={styles.heroTitle}>{meta.title}</Text>
      <Text style={styles.heroDesc}>{description(quest)}</Text>
      <View style={styles.stateRow}><Text style={styles.stateCopy}>{quest.partenaire_fait ? `${quest.partenaire?.pseudo || 'Ton pote'} a déjà avancé.` : 'Le prochain move compte.'}</Text><Text style={styles.stateYou}>{quest.moi_fait ? 'TA PART ✓' : 'À TOI DE JOUER'}</Text></View>
      <View style={styles.progressHeader}><Text style={styles.progressText}>{quest.progression} / {quest.objectif}</Text><Text style={styles.time}>⏱ {timeLeft(quest.expire_le)}</Text></View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
      <View style={styles.heroFooter}>
        <View><Text style={styles.rewardLabel}>RÉCOMPENSE · CHACUN</Text><MissionReward quest={quest} /></View>
        <Pressable onPress={() => router.push('/(tabs)/matches')} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}><Text style={styles.ctaText}>JOUER</Text><Text style={styles.ctaArrow}>→</Text></Pressable>
      </View>
    </View>
  );
}

function MissionReward({ quest }: { quest: FriendQuest }) {
  const hasXp = quest.recompense_xp > 0;
  const hasVolts = quest.recompense_volts > 0;

  if (!hasXp && !hasVolts) return <Text style={styles.rewardAmount}>XP social</Text>;

  return (
    <View accessible accessibilityLabel={reward(quest)} style={styles.rewardValueRow}>
      {hasXp ? <Text style={styles.rewardAmount}>+{quest.recompense_xp} XP</Text> : null}
      {hasXp && hasVolts ? <Text style={styles.rewardSeparator}>·</Text> : null}
      {hasVolts ? (
        <View style={styles.voltReward}>
          <CurrencyIcon color={colors.volt} kind="volts" size={14} />
          <Text style={styles.rewardAmount}>+{quest.recompense_volts}</Text>
        </View>
      ) : null}
    </View>
  );
}

function QuestCard({ quest }: { quest: FriendQuest }) {
  const meta = metaFor(quest);
  const pct = Math.min(100, Math.round((quest.progression / Math.max(1, quest.objectif)) * 100));
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}><Text style={styles.cardIcon}>{meta.icon}</Text><View style={styles.cardCopy}><Text style={styles.cardEyebrow}>{meta.eyebrow}</Text><Text style={styles.cardTitle}>{meta.title}</Text></View><Text style={styles.cardTime}>{timeLeft(quest.expire_le)}</Text></View>
      <Text style={styles.cardDesc}>{description(quest)}</Text>
      <View style={styles.cardTrack}><View style={[styles.cardTrackFill, { width: `${pct}%` }]} /></View>
      <Text style={styles.cardReward}>{quest.progression}/{quest.objectif} · {reward(quest)}</Text>
    </View>
  );
}

function EmptyMissions() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEyebrow}>AUCUNE MISSION ACTIVE</Text>
      <Text style={styles.emptyTitle}>TON PROCHAIN RIVAL N’EST PAS ENCORE LÀ.</Text>
      <Text style={styles.emptyText}>Ajoute un ami, rejoins une ligue ou termine un duel. Clutch créera ensuite des missions contextuelles.</Text>
      <Pressable onPress={() => router.replace('/(tabs)/social/friends')} style={styles.emptyCta}><Text style={styles.emptyCtaText}>TROUVER UN RIVAL</Text></Pressable>
    </View>
  );
}

function metaFor(q: FriendQuest) { return META[q.type] ?? META.duo_calls; }
function reward(q: FriendQuest) { const parts = []; if (q.recompense_xp) parts.push(`+${q.recompense_xp} XP`); if (q.recompense_volts) parts.push(`+${q.recompense_volts} V`); return parts.join(' · ') || 'XP social'; }
function description(q: FriendQuest) {
  const p = q.partenaire?.pseudo || 'ton pote';
  if (q.type === 'duo_calls') return `Toi + ${p} devez poser ${q.objectif} calls. Chacun doit participer.`;
  if (q.type === 'same_side') return `Choisissez le même camp sur ${matchLabel(q)} sans révéler le choix de l’autre avant ton call.`;
  if (q.type === 'opposition') return `Finissez sur des camps opposés sur ${matchLabel(q)}.`;
  if (q.type === 'duel') return `Termine un duel avec ${p} avant expiration.`;
  if (q.type === 'revenge') return `Bats ${p} dans votre prochain duel.`;
  if (q.type === 'league_push') return `Cumulez ${q.objectif} Frags réellement gagnés à deux${q.ligue?.nom ? ` dans ${q.ligue.nom}` : ''}.`;
  return 'Une mission sociale Clutch.';
}
function matchLabel(q: FriendQuest) { const m = q.match; return m ? `${m.tag_a || m.equipe_a || 'A'} vs ${m.tag_b || m.equipe_b || 'B'}` : 'ce match'; }
function timeLeft(value: string | null) { if (!value) return '—'; const ms = Math.max(0, new Date(value).getTime() - Date.now()); const min = Math.ceil(ms / 60000); if (min < 60) return `${min} min`; const h = Math.floor(min / 60); if (h < 24) return `${h} h`; return `${Math.floor(h / 24)} j`; }
function initials(value: string) { const parts = value.trim().split(/[\s._-]+/).filter(Boolean); return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : (parts[0] || '?').slice(0, 2).toUpperCase(); }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.md, paddingBottom: layout.tabBarContentInset, gap: 22 },
  intro: { gap: 8, paddingTop: 4 },
  eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.1 },
  title: { ...typography.displayMedium, maxWidth: 360, color: colors.text },
  subtitle: { ...typography.body, maxWidth: 360, color: colors.textMuted },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' },
  errorText: { ...typography.body, color: '#FF9AA2' },
  skeleton: { height: 372, borderRadius: 30, backgroundColor: '#10161D' },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 372, padding: 20, borderRadius: 30, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#48541E', gap: 14 },
  heroGlow: { position: 'absolute', right: -70, top: 5, width: 240, height: 240, borderRadius: 120, backgroundColor: '#2B3510', opacity: 0.52 },
  heroNumber: { ...typography.metricLarge, position: 'absolute', right: 14, bottom: -18, color: '#111A12', fontSize: 128, lineHeight: 128, letterSpacing: -10 },
  heroTop: { zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  heroIconText: { fontSize: 20 },
  heroIdentity: { gap: 3 }, heroEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 }, partner: { ...typography.label, color: colors.textMuted, letterSpacing: .3 },
  heroTitle: { ...typography.displayMedium, zIndex: 2, maxWidth: 310, color: colors.text },
  heroDesc: { ...typography.bodyStrong, zIndex: 2, maxWidth: 330, color: colors.text },
  stateRow: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#222B32' },
  stateCopy: { ...typography.caption, flex: 1, color: colors.textMuted }, stateYou: { ...typography.label, color: colors.volt },
  progressHeader: { zIndex: 2, flexDirection: 'row', justifyContent: 'space-between' }, progressText: { ...typography.bodyStrong, color: colors.text }, time: { ...typography.caption, color: colors.textMuted },
  progressTrack: { zIndex: 2, height: 8, borderRadius: 999, overflow: 'hidden', backgroundColor: '#182028' }, progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.volt },
  heroFooter: { zIndex: 2, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 2 },
  rewardLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .4 }, rewardValueRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }, rewardAmount: { ...typography.bodyStrong, color: colors.text }, rewardSeparator: { ...typography.label, color: colors.textMuted }, voltReward: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cta: { minHeight: 48, minWidth: 112, paddingHorizontal: 16, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.volt }, ctaText: { ...typography.action, color: '#080A0C', letterSpacing: .4 }, ctaArrow: { color: '#080A0C', fontSize: 16, fontWeight: '900' },
  section: { gap: 9 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between' }, sectionLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .8 }, sectionMeta: { ...typography.label, color: colors.textMuted },
  card: { padding: 15, borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 10 }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 9 }, cardIcon: { fontSize: 17 }, cardCopy: { flex: 1 }, cardEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .35 }, cardTitle: { ...typography.cardTitle, color: colors.text }, cardTime: { ...typography.caption, color: colors.textMuted }, cardDesc: { ...typography.body, color: colors.textMuted }, cardTrack: { height: 5, borderRadius: 999, overflow: 'hidden', backgroundColor: '#182028' }, cardTrackFill: { height: '100%', backgroundColor: colors.volt }, cardReward: { ...typography.label, color: colors.text },
  duoRail: { gap: 10, paddingRight: spacing.md }, duoCard: { width: 138, minHeight: 162, padding: 13, borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, duoAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E' }, duoAvatarText: { ...typography.label, color: colors.volt }, duoName: { ...typography.bodyStrong, marginTop: 11, color: colors.text }, duoStreak: { ...typography.label, marginTop: 'auto', color: colors.text }, duoMeta: { ...typography.caption, marginTop: 2, color: colors.textMuted },
  historyCard: { overflow: 'hidden', borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, historyRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#192129' }, historyIcon: { fontSize: 16 }, historyCopy: { flex: 1 }, historyTitle: { ...typography.bodyStrong, color: colors.text }, historyMeta: { ...typography.caption, marginTop: 3, color: colors.textMuted }, historyReward: { ...typography.label, maxWidth: 96, color: colors.volt, textAlign: 'right' }, emptyHistory: { ...typography.body, padding: 18, color: colors.textMuted },
  empty: { minHeight: 290, justifyContent: 'center', padding: 24, borderRadius: 30, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border, gap: 10 }, emptyEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 }, emptyTitle: { ...typography.displaySmall, maxWidth: 320, color: colors.text }, emptyText: { ...typography.body, maxWidth: 330, color: colors.textMuted }, emptyCta: { alignSelf: 'flex-start', marginTop: 6, minHeight: 46, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt }, emptyCtaText: { ...typography.action, color: '#080A0C', letterSpacing: .4 },
  pressed: { opacity: 0.75 },
});
