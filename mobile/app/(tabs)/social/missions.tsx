import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { loadFriendQuests, type FriendQuest, type FriendQuestsData } from '@/src/services/social';
import { colors, radius, spacing } from '@/src/theme/tokens';

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
    refresh ? setRefreshing(true) : setLoading(true);
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
        <View style={styles.introTop}><View><Text style={styles.eyebrow}>FRIEND QUESTS</Text><Text style={styles.title}>Quelqu’un compte sur ton prochain call.</Text></View><View style={styles.counter}><Text style={styles.counterValue}>{loading ? '—' : data.actives.length}</Text><Text style={styles.counterLabel}>/ 3</Text></View></View>
        <Text style={styles.subtitle}>Missions courtes à deux. Ici tu gagnes de l’XP et des Volts — jamais des Frags gratuits.</Text>
      </View>

      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
      {loading ? <View style={styles.skeleton} /> : hero ? <HeroQuest quest={hero} /> : <EmptyMissions />}

      {data.actives.length > 1 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EN COURS</Text>
          {data.actives.slice(1, 3).map((quest) => <QuestCard key={quest.id} quest={quest} />)}
        </View>
      ) : null}

      {data.duos.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>DUO STREAKS</Text><Text style={styles.sectionMeta}>{data.duos.length}</Text></View>
          <View style={styles.duoCard}>
            {data.duos.slice(0, 6).map((duo, index) => (
              <View key={`${duo.user_id ?? duo.pseudo}-${index}`} style={styles.duoRow}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{initials(duo.pseudo || 'Duo')}</Text></View>
                <View style={styles.duoCopy}><Text style={styles.duoName}>{duo.pseudo || 'Duo'}</Text><Text style={styles.duoMeta}>{Number(duo.missions_terminees || 0)} mission(s) ensemble</Text></View>
                <Text style={styles.streak}>🔥 {Number(duo.serie_semaines || 0)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>HISTORIQUE</Text><Text style={styles.sectionMeta}>{data.historique.length}</Text></View>
        <View style={styles.historyCard}>
          {data.historique.length ? data.historique.slice(0, 6).map((quest) => {
            const meta = metaFor(quest);
            return <View key={quest.id} style={styles.historyRow}><Text style={styles.historyIcon}>{meta.icon}</Text><View style={styles.historyCopy}><Text style={styles.historyTitle}>{meta.title}</Text><Text style={styles.historyMeta}>avec {quest.partenaire?.pseudo || 'un joueur'} · {quest.statut.toUpperCase()}</Text></View><Text style={styles.historyReward}>{quest.statut === 'terminee' ? reward(quest) : '—'}</Text></View>;
          }) : <Text style={styles.emptyHistory}>Tes premières missions terminées apparaîtront ici.</Text>}
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
      <View style={styles.heroTop}><View style={styles.heroIcon}><Text style={styles.heroIconText}>{meta.icon}</Text></View><View style={styles.heroHeading}><Text style={styles.heroEyebrow}>{meta.eyebrow}</Text><Text style={styles.heroTitle}>{meta.title}</Text></View><View style={styles.partner}><Text style={styles.partnerLabel}>AVEC</Text><Text style={styles.partnerName}>{quest.partenaire?.pseudo || 'TON POTE'}</Text></View></View>
      <Text style={styles.heroDesc}>{description(quest)}</Text>
      <View style={styles.status}><Text style={styles.statusText}>{quest.partenaire_fait ? `${quest.partenaire?.pseudo || 'Ton pote'} a avancé.` : 'Le prochain move compte.'}</Text><Text style={styles.statusYou}>{quest.moi_fait ? 'TA PART ✓' : 'À TOI'}</Text></View>
      <View style={styles.progressRow}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View><Text style={styles.progressText}>{quest.progression}/{quest.objectif}</Text></View>
      <View style={styles.heroFooter}><View><Text style={styles.rewardLabel}>RÉCOMPENSE · CHACUN</Text><Text style={styles.rewardValue}>{reward(quest)}</Text><Text style={styles.time}>⏱ {timeLeft(quest.expire_le)}</Text></View><Pressable onPress={() => router.push('/(tabs)/matches')} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}><Text style={styles.ctaText}>JOUER →</Text></Pressable></View>
    </View>
  );
}

function QuestCard({ quest }: { quest: FriendQuest }) {
  const meta = metaFor(quest);
  const pct = Math.min(100, Math.round((quest.progression / Math.max(1, quest.objectif)) * 100));
  return <View style={styles.card}><View style={styles.cardTop}><Text style={styles.cardIcon}>{meta.icon}</Text><View style={styles.cardCopy}><Text style={styles.cardEyebrow}>{meta.eyebrow}</Text><Text style={styles.cardTitle}>{meta.title}</Text></View><Text style={styles.cardTime}>{timeLeft(quest.expire_le)}</Text></View><Text style={styles.cardDesc}>{description(quest)}</Text><View style={styles.cardTrack}><View style={[styles.cardTrackFill, { width: `${pct}%` }]} /></View><Text style={styles.cardReward}>{quest.progression}/{quest.objectif} · {reward(quest)}</Text></View>;
}

function EmptyMissions() {
  return <View style={styles.empty}><Text style={styles.emptyIcon}>⚔</Text><Text style={styles.emptyTitle}>Pas encore de mission active.</Text><Text style={styles.emptyText}>Ajoute un ami, rejoins une ligue ou termine un duel : Clutch générera ensuite des missions contextuelles.</Text><Pressable onPress={() => router.replace('/(tabs)/social/friends')} style={styles.emptyCta}><Text style={styles.emptyCtaText}>TROUVER UN RIVAL</Text></Pressable></View>;
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
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', padding: spacing.md, paddingBottom: 120, gap: spacing.lg },
  intro: { gap: 8, paddingTop: 6 }, introTop: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  eyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  title: { flex: 1, color: colors.text, fontSize: 29, lineHeight: 32, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  counter: { minWidth: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E', borderWidth: 1, borderColor: '#414D1E' }, counterValue: { color: colors.volt, fontSize: 20, fontWeight: '900' }, counterLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' }, errorText: { color: '#FF9AA2', fontSize: 11 },
  hero: { position: 'relative', overflow: 'hidden', padding: 18, borderRadius: 26, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#3A461D', gap: 15 }, heroGlow: { position: 'absolute', right: -45, top: -45, width: 180, height: 180, borderRadius: 90, backgroundColor: '#202B0D', opacity: 0.55 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 2 }, heroIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E' }, heroIconText: { fontSize: 19 }, heroHeading: { flex: 1 }, heroEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1 }, heroTitle: { marginTop: 2, color: colors.text, fontSize: 17, fontWeight: '900' }, partner: { alignItems: 'flex-end' }, partnerLabel: { color: colors.textMuted, fontSize: 7, fontWeight: '900' }, partnerName: { marginTop: 2, color: colors.text, fontSize: 10, fontWeight: '900' },
  heroDesc: { zIndex: 2, color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '700' }, status: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 11, borderRadius: radius.md, backgroundColor: '#0D141A' }, statusText: { flex: 1, color: colors.textMuted, fontSize: 10 }, statusYou: { color: colors.volt, fontSize: 8, fontWeight: '900' },
  progressRow: { zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }, progressTrack: { flex: 1, height: 8, borderRadius: 999, overflow: 'hidden', backgroundColor: '#182028' }, progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.volt }, progressText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  heroFooter: { zIndex: 2, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }, rewardLabel: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 }, rewardValue: { marginTop: 4, color: colors.text, fontSize: 13, fontWeight: '900' }, time: { marginTop: 4, color: colors.textMuted, fontSize: 9 }, cta: { minHeight: 44, paddingHorizontal: 17, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt }, ctaText: { color: '#090B0D', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  section: { gap: 9 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between' }, sectionLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, sectionMeta: { color: colors.textMuted, fontSize: 9, fontWeight: '900' },
  card: { padding: 14, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 10 }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 9 }, cardIcon: { fontSize: 16 }, cardCopy: { flex: 1 }, cardEyebrow: { color: colors.volt, fontSize: 7, fontWeight: '900' }, cardTitle: { color: colors.text, fontSize: 13, fontWeight: '900' }, cardTime: { color: colors.textMuted, fontSize: 8 }, cardDesc: { color: colors.textMuted, fontSize: 10, lineHeight: 15 }, cardTrack: { height: 5, borderRadius: 999, overflow: 'hidden', backgroundColor: '#182028' }, cardTrackFill: { height: '100%', backgroundColor: colors.volt }, cardReward: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  duoCard: { paddingHorizontal: 13, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, duoRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#182028' }, avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated }, avatarText: { color: colors.text, fontSize: 8, fontWeight: '900' }, duoCopy: { flex: 1 }, duoName: { color: colors.text, fontSize: 11, fontWeight: '900' }, duoMeta: { marginTop: 2, color: colors.textMuted, fontSize: 8 }, streak: { color: colors.volt, fontSize: 10, fontWeight: '900' },
  historyCard: { paddingHorizontal: 13, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, historyRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: '#182028' }, historyIcon: { fontSize: 15 }, historyCopy: { flex: 1 }, historyTitle: { color: colors.text, fontSize: 10, fontWeight: '900' }, historyMeta: { marginTop: 2, color: colors.textMuted, fontSize: 8 }, historyReward: { maxWidth: 90, color: colors.volt, fontSize: 8, fontWeight: '900', textAlign: 'right' }, emptyHistory: { paddingVertical: 18, color: colors.textMuted, fontSize: 10 },
  empty: { alignItems: 'center', padding: 26, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 8 }, emptyIcon: { fontSize: 24 }, emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' }, emptyText: { color: colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center' }, emptyCta: { marginTop: 4, minHeight: 42, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.volt }, emptyCtaText: { color: '#080A0C', fontSize: 9, fontWeight: '900' }, skeleton: { height: 300, borderRadius: 26, backgroundColor: '#10161D' }, pressed: { opacity: 0.75 },
});
