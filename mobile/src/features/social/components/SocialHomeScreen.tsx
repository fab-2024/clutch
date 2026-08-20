import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { loadDuels } from '@/src/features/social/duels/api';
import type { DuelRow } from '@/src/features/social/duels/types';
import { loadFriends } from '@/src/features/social/friends/api';
import type { FriendsData } from '@/src/features/social/friends/types';
import { loadLeagues } from '@/src/features/social/leagues/api';
import type { LeagueSummary } from '@/src/features/social/leagues/types';
import { loadFriendQuests } from '@/src/features/social/missions/api';
import type { FriendQuestsData } from '@/src/features/social/missions/types';
import { colors, radius, spacing } from '@/src/theme';

const EMPTY_FRIENDS: FriendsData = { amis: [], recues: [], envoyees: [] };
const EMPTY_MISSIONS: FriendQuestsData = { actives: [], historique: [], duos: [], a_reveler: null };

type SocialSnapshot = {
  friends: FriendsData;
  leagues: LeagueSummary[];
  missions: FriendQuestsData;
  duels: DuelRow[];
};

const EMPTY: SocialSnapshot = {
  friends: EMPTY_FRIENDS,
  leagues: [],
  missions: EMPTY_MISSIONS,
  duels: [],
};

export default function SocialHomeScreen() {
  const [data, setData] = useState<SocialSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    const [friends, leagues, missions, duels] = await Promise.allSettled([
      loadFriends(),
      loadLeagues(),
      loadFriendQuests(),
      loadDuels(12),
    ]);

    const failed = [friends, leagues, missions, duels].filter((result) => result.status === 'rejected').length;
    setData({
      friends: friends.status === 'fulfilled' ? friends.value : EMPTY_FRIENDS,
      leagues: leagues.status === 'fulfilled' ? leagues.value : [],
      missions: missions.status === 'fulfilled' ? missions.value : EMPTY_MISSIONS,
      duels: duels.status === 'fulfilled' ? duels.value : [],
    });
    if (failed) {
      setError(failed === 4 ? 'Impossible de charger ton QG Social.' : 'Une partie du QG Social est momentanément indisponible.');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const incoming = data.friends.recues.length;
  const revealable = Boolean(data.missions.a_reveler);
  const activeMissions = data.missions.actives.length;
  const priority = incoming
    ? { eyebrow: 'DEMANDES EN ATTENTE', title: `${incoming} joueur${incoming > 1 ? 's veulent' : ' veut'} rejoindre ton cercle.`, action: 'RÉPONDRE', href: '/(tabs)/social/friends' }
    : revealable
      ? { eyebrow: 'MISSION À RÉVÉLER', title: 'Un résultat social attend ton verdict.', action: 'DÉCOUVRIR', href: '/(tabs)/social/missions' }
      : activeMissions
        ? { eyebrow: 'MISSION ACTIVE', title: 'Quelqu’un compte sur ton prochain call.', action: 'CONTINUER', href: '/(tabs)/social/missions' }
        : { eyebrow: 'PROCHAIN MOVE', title: 'Agrandis ton cercle pour déclencher de nouvelles rivalités.', action: 'TROUVER UN JOUEUR', href: '/(tabs)/social/friends' };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
    >
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>SOCIAL // QG</Text>
        <Text style={styles.title}>TOUT TON CERCLE. UN SEUL POINT DE DÉPART.</Text>
        <Text style={styles.subtitle}>Retrouve ce qui demande ton attention, puis entre directement dans l’action.</Text>
      </View>

      {error ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable>
        </View>
      ) : null}

      {loading ? <View style={styles.heroSkeleton} /> : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${priority.eyebrow}. ${priority.title}`}
          onPress={() => router.replace(priority.href as never)}
          style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
        >
          <View style={styles.heroGlow} />
          <Text style={styles.heroMark}>S</Text>
          <Text style={styles.heroEyebrow}>{priority.eyebrow}</Text>
          <Text style={styles.heroTitle}>{priority.title}</Text>
          <View style={styles.heroFooter}><Text style={styles.heroAction}>{priority.action}</Text><Text style={styles.heroArrow}>→</Text></View>
        </Pressable>
      )}

      <View style={styles.stats}>
        <Stat value={loading ? '—' : data.friends.amis.length} label="AMIS" featured />
        <Stat value={loading ? '—' : incoming} label="DEMANDES" />
        <Stat value={loading ? '—' : activeMissions} label="MISSIONS" />
        <Stat value={loading ? '—' : data.leagues.length} label="LIGUES" />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionLabel}>TES ESPACES</Text>
        <Text style={styles.sectionMeta}>CHOISIS TON TERRAIN</Text>
      </View>
      <View style={styles.grid}>
        <SpaceCard glyph="◎" label="AMIS" title="Ton cercle" meta={`${data.friends.amis.length} joueur${data.friends.amis.length > 1 ? 's' : ''}`} href="/(tabs)/social/friends" featured />
        <SpaceCard glyph="⚡" label="MISSIONS" title="À deux" meta={`${activeMissions} active${activeMissions > 1 ? 's' : ''}`} href="/(tabs)/social/missions" />
        <SpaceCard glyph="◇" label="LIGUES" title="Classements" meta={`${data.leagues.length} rejointe${data.leagues.length > 1 ? 's' : ''}`} href="/(tabs)/social/leagues" />
        <SpaceCard glyph="⚔" label="DUELS" title="Face-à-face" meta={`${data.duels.length} duel${data.duels.length > 1 ? 's' : ''}`} href="/(tabs)/social/duels" />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ouvrir la faction"
        onPress={() => router.replace('/(tabs)/social/faction')}
        style={({ pressed }) => [styles.faction, pressed && styles.pressed]}
      >
        <View style={styles.factionMark}><Text style={styles.factionGlyph}>✦</Text></View>
        <View style={styles.factionCopy}><Text style={styles.factionLabel}>FACTION</Text><Text style={styles.factionTitle}>Ta couleur dans Clutch.</Text><Text style={styles.factionMeta}>Progression collective, activité et reliques.</Text></View>
        <Text style={styles.factionArrow}>→</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ value, label, featured = false }: { value: number | string; label: string; featured?: boolean }) {
  return <View style={[styles.stat, featured && styles.statFeatured]}><Text style={[styles.statValue, featured && styles.statValueFeatured]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function SpaceCard({ glyph, label, title, meta, href, featured = false }: { glyph: string; label: string; title: string; meta: string; href: string; featured?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir ${label.toLowerCase()}`}
      onPress={() => router.replace(href as never)}
      style={({ pressed }) => [styles.spaceCard, featured && styles.spaceCardFeatured, pressed && styles.pressed]}
    >
      <Text style={[styles.spaceGlyph, featured && styles.spaceGlyphFeatured]}>{glyph}</Text>
      <Text style={styles.spaceLabel}>{label}</Text>
      <Text style={styles.spaceTitle}>{title}</Text>
      <Text style={styles.spaceMeta}>{meta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', padding: spacing.md, paddingBottom: 128, gap: 22 },
  intro: { gap: 8, paddingTop: 4 },
  eyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { maxWidth: 375, color: colors.text, fontSize: 35, lineHeight: 35, fontWeight: '900', letterSpacing: -1.6 },
  subtitle: { maxWidth: 360, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  error: { minHeight: 48, padding: 12, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' },
  errorText: { flex: 1, color: '#FF9AA2', fontSize: 11 }, retry: { color: colors.volt, fontSize: 8, fontWeight: '900' },
  heroSkeleton: { height: 240, borderRadius: 30, backgroundColor: '#10161D' },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 240, padding: 20, borderRadius: 30, justifyContent: 'flex-end', backgroundColor: '#10170D', borderWidth: 1, borderColor: '#48541E' },
  heroGlow: { position: 'absolute', right: -80, top: -95, width: 280, height: 280, borderRadius: 140, backgroundColor: '#526416', opacity: 0.32 },
  heroMark: { position: 'absolute', right: -5, top: -22, color: '#1A2411', fontSize: 185, lineHeight: 200, fontWeight: '900', letterSpacing: -16 },
  heroEyebrow: { zIndex: 2, color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  heroTitle: { zIndex: 2, maxWidth: 335, marginTop: 9, color: colors.text, fontSize: 30, lineHeight: 31, fontWeight: '900', letterSpacing: -1.2 },
  heroFooter: { zIndex: 2, minHeight: 44, marginTop: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#35411E' },
  heroAction: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1 }, heroArrow: { color: colors.volt, fontSize: 20, fontWeight: '900' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minHeight: 82, padding: 11, justifyContent: 'center', borderRadius: 20, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  statFeatured: { backgroundColor: '#11170E', borderColor: '#414D1E' },
  statValue: { color: colors.text, fontSize: 23, fontWeight: '900', letterSpacing: -0.8 }, statValueFeatured: { color: colors.volt },
  statLabel: { marginTop: 5, color: colors.textMuted, fontSize: 6, fontWeight: '900', letterSpacing: 0.8 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, sectionMeta: { color: '#596570', fontSize: 7, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  spaceCard: { flexBasis: '48.5%', minHeight: 162, padding: 15, borderRadius: 25, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  spaceCardFeatured: { backgroundColor: '#10160E', borderColor: '#414D1E' },
  spaceGlyph: { color: colors.text, fontSize: 25, fontWeight: '900' }, spaceGlyphFeatured: { color: colors.volt },
  spaceLabel: { marginTop: 20, color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  spaceTitle: { marginTop: 5, color: colors.text, fontSize: 17, fontWeight: '900' },
  spaceMeta: { marginTop: 'auto', color: colors.textMuted, fontSize: 9 },
  faction: { minHeight: 105, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 25, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  factionMark: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151B11', borderWidth: 1, borderColor: '#3E4920' },
  factionGlyph: { color: colors.volt, fontSize: 22, fontWeight: '900' }, factionCopy: { flex: 1, minWidth: 0 },
  factionLabel: { color: colors.volt, fontSize: 7, fontWeight: '900', letterSpacing: 1 }, factionTitle: { marginTop: 4, color: colors.text, fontSize: 16, fontWeight: '900' }, factionMeta: { marginTop: 4, color: colors.textMuted, fontSize: 9 },
  factionArrow: { color: colors.volt, fontSize: 18, fontWeight: '900' },
  pressed: { opacity: 0.74 },
});
