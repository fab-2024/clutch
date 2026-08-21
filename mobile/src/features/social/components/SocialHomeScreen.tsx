import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { loadDuels } from '@/src/features/social/duels/api';
import type { DuelRow, DuelStatus } from '@/src/features/social/duels/types';
import { loadFriends } from '@/src/features/social/friends/api';
import type { FriendsData } from '@/src/features/social/friends/types';
import { loadLeagues } from '@/src/features/social/leagues/api';
import type { LeagueSummary } from '@/src/features/social/leagues/types';
import { loadFriendQuests } from '@/src/features/social/missions/api';
import type { FriendQuest, FriendQuestsData } from '@/src/features/social/missions/types';
import { colors, radius, spacing } from '@/src/theme';

const EMPTY_FRIENDS: FriendsData = { amis: [], recues: [], envoyees: [] };
const EMPTY_MISSIONS: FriendQuestsData = { actives: [], historique: [], duos: [], a_reveler: null };

type SocialSnapshot = {
  friends: FriendsData;
  leagues: LeagueSummary[];
  missions: FriendQuestsData;
  duels: DuelRow[];
};

type SocialDomain = keyof SocialSnapshot;
type SocialAvailability = Record<SocialDomain, boolean>;
type SocialRoute =
  | '/(tabs)/social/friends'
  | '/(tabs)/social/missions'
  | '/(tabs)/social/leagues'
  | '/(tabs)/social/duels'
  | '/(tabs)/social/faction'
  | '/(tabs)/matches';

type SocialAction = {
  id: string;
  glyph: string;
  eyebrow: string;
  title: string;
  meta: string;
  href: SocialRoute;
};

const EMPTY: SocialSnapshot = {
  friends: EMPTY_FRIENDS,
  leagues: [],
  missions: EMPTY_MISSIONS,
  duels: [],
};

const ALL_AVAILABLE: SocialAvailability = {
  friends: true,
  leagues: true,
  missions: true,
  duels: true,
};

const STARTER_STEPS: Array<{ number: string; title: string; meta: string; href: SocialRoute }> = [
  { number: '01', title: 'Trouve un joueur', meta: 'Un pseudo suffit pour ouvrir ton cercle.', href: '/(tabs)/social/friends' },
  { number: '02', title: 'Crée ton QG', meta: 'Lance une ligue privée ou rejoins un code.', href: '/(tabs)/social/leagues' },
  { number: '03', title: 'Provoque un duel', meta: 'Pose ton call, puis invite le camp opposé.', href: '/(tabs)/matches' },
];

export default function SocialHomeScreen() {
  const [data, setData] = useState<SocialSnapshot>(EMPTY);
  const [availability, setAvailability] = useState<SocialAvailability>(ALL_AVAILABLE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (refresh = false) => {
    const requestId = ++requestRef.current;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    const [friends, leagues, missions, duels] = await Promise.allSettled([
      loadFriends(),
      loadLeagues(),
      loadFriendQuests(),
      loadDuels(12),
    ]);

    if (requestId !== requestRef.current) return;

    const nextAvailability = {
      friends: friends.status === 'fulfilled',
      leagues: leagues.status === 'fulfilled',
      missions: missions.status === 'fulfilled',
      duels: duels.status === 'fulfilled',
    };
    const failed = Object.values(nextAvailability).filter((available) => !available).length;

    setAvailability(nextAvailability);
    setData({
      friends: friends.status === 'fulfilled' ? friends.value : EMPTY_FRIENDS,
      leagues: leagues.status === 'fulfilled' ? leagues.value : [],
      missions: missions.status === 'fulfilled' ? missions.value : EMPTY_MISSIONS,
      duels: duels.status === 'fulfilled' ? duels.value : [],
    });
    setError(
      failed === 4
        ? 'Impossible de charger ton QG Social.'
        : failed
          ? `${failed} espace${failed > 1 ? 's sont' : ' est'} momentanément indisponible${failed > 1 ? 's' : ''}.`
          : null,
    );
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  const incoming = data.friends.recues.length;
  const activeMissions = data.missions.actives.length;
  const activeDuels = data.duels.filter((duel) => isActiveDuel(duel));
  const priority = getPriority(data, activeDuels);
  const actions = buildActions(data, activeDuels);

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
        <Text style={styles.subtitle}>Ce qui bouge, ce qui t’attend et le prochain move à faire avec les autres.</Text>
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
          <Text style={styles.heroMeta}>{priority.meta}</Text>
          <View style={styles.heroFooter}><Text style={styles.heroAction}>{priority.action}</Text><Text style={styles.heroArrow}>→</Text></View>
        </Pressable>
      )}

      <View style={styles.stats}>
        <Stat value={metric(loading, availability.friends, data.friends.amis.length)} label="AMIS" href="/(tabs)/social/friends" featured />
        <Stat value={metric(loading, availability.friends, incoming)} label="DEMANDES" href="/(tabs)/social/friends" />
        <Stat value={metric(loading, availability.missions, activeMissions)} label="MISSIONS" href="/(tabs)/social/missions" />
        <Stat value={metric(loading, availability.duels, activeDuels.length)} label="DUELS" href="/(tabs)/social/duels" />
      </View>

      {!loading && actions.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionLabel}>À TON TOUR</Text>
            <Text style={styles.sectionMeta}>{actions.length} SIGNAL{actions.length > 1 ? 'AUX' : ''}</Text>
          </View>
          <View style={styles.actionList}>
            {actions.slice(0, 3).map((action) => <ActionRow key={action.id} action={action} />)}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionLabel}>TES ESPACES</Text>
          <Text style={styles.sectionMeta}>CHOISIS TON TERRAIN</Text>
        </View>
        <View style={styles.grid}>
          <SpaceCard glyph="◎" label="AMIS" title="Ton cercle" meta={countLabel(loading, availability.friends, data.friends.amis.length, 'joueur')} href="/(tabs)/social/friends" badge={incoming ? `${incoming} À TRAITER` : undefined} featured />
          <SpaceCard glyph="⚡" label="MISSIONS" title="À deux" meta={countLabel(loading, availability.missions, activeMissions, 'active', 'actives')} href="/(tabs)/social/missions" badge={data.missions.a_reveler ? 'À RÉVÉLER' : undefined} />
          <SpaceCard glyph="◇" label="LIGUES" title="Classements" meta={countLabel(loading, availability.leagues, data.leagues.length, 'rejointe', 'rejointes')} href="/(tabs)/social/leagues" />
          <SpaceCard glyph="⚔" label="DUELS" title="Face-à-face" meta={countLabel(loading, availability.duels, activeDuels.length, 'actif', 'actifs')} href="/(tabs)/social/duels" badge={activeDuels.length ? 'EN COURS' : undefined} />
        </View>
      </View>

      {!loading && allDomainsAvailable(availability) && !hasSocialFootprint(data) ? <StarterPath /> : null}

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

function Stat({ value, label, href, featured = false }: { value: number | string; label: string; href: SocialRoute; featured?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label.toLowerCase()} : ${value}`}
      onPress={() => router.replace(href as never)}
      style={({ pressed }) => [styles.stat, featured && styles.statFeatured, pressed && styles.pressed]}
    >
      <Text style={[styles.statValue, featured && styles.statValueFeatured]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function ActionRow({ action }: { action: SocialAction }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${action.eyebrow}. ${action.title}`}
      onPress={() => router.replace(action.href as never)}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
    >
      <View style={styles.actionGlyph}><Text style={styles.actionGlyphText}>{action.glyph}</Text></View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionEyebrow}>{action.eyebrow}</Text>
        <Text numberOfLines={2} style={styles.actionTitle}>{action.title}</Text>
        <Text style={styles.actionMeta}>{action.meta}</Text>
      </View>
      <Text style={styles.actionArrow}>→</Text>
    </Pressable>
  );
}

function SpaceCard({ glyph, label, title, meta, href, badge, featured = false }: { glyph: string; label: string; title: string; meta: string; href: SocialRoute; badge?: string; featured?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir ${label.toLowerCase()}. ${meta}`}
      onPress={() => router.replace(href as never)}
      style={({ pressed }) => [styles.spaceCard, featured && styles.spaceCardFeatured, pressed && styles.pressed]}
    >
      <View style={styles.spaceTop}>
        <Text style={[styles.spaceGlyph, featured && styles.spaceGlyphFeatured]}>{glyph}</Text>
        {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}
      </View>
      <Text style={styles.spaceLabel}>{label}</Text>
      <Text style={styles.spaceTitle}>{title}</Text>
      <View style={styles.spaceFooter}><Text style={styles.spaceMeta}>{meta}</Text><Text style={styles.spaceArrow}>→</Text></View>
    </Pressable>
  );
}

function StarterPath() {
  return (
    <View style={styles.starter}>
      <Text style={styles.starterEyebrow}>LANCER TON QG</Text>
      <Text style={styles.starterTitle}>TROIS MOVES. UNE PREMIÈRE RIVALITÉ.</Text>
      <View style={styles.starterList}>
        {STARTER_STEPS.map((step) => (
          <Pressable key={step.number} accessibilityRole="button" onPress={() => router.replace(step.href as never)} style={({ pressed }) => [styles.starterRow, pressed && styles.pressed]}>
            <Text style={styles.starterNumber}>{step.number}</Text>
            <View style={styles.starterCopy}><Text style={styles.starterStep}>{step.title}</Text><Text style={styles.starterMeta}>{step.meta}</Text></View>
            <Text style={styles.starterArrow}>→</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function getPriority(data: SocialSnapshot, activeDuels: DuelRow[]) {
  const incoming = data.friends.recues[0];
  const revealable = data.missions.a_reveler;
  const duel = activeDuels.find((item) => effectiveDuelStatus(item) === 'accepte') ?? activeDuels[0];
  const mission = data.missions.actives[0];

  if (incoming) return { eyebrow: 'DEMANDE EN ATTENTE', title: `${incoming.pseudo} veut rejoindre ton cercle.`, meta: 'Réponds maintenant pour débloquer vos prochains moves.', action: 'RÉPONDRE', href: '/(tabs)/social/friends' as SocialRoute };
  if (revealable) return { eyebrow: 'MISSION À RÉVÉLER', title: 'Un résultat social attend ton verdict.', meta: questPartnerLabel(revealable), action: 'DÉCOUVRIR', href: '/(tabs)/social/missions' as SocialRoute };
  if (duel) return { eyebrow: effectiveDuelStatus(duel) === 'accepte' ? 'DUEL VERROUILLÉ' : 'RIVALITÉ OUVERTE', title: `Ton face-à-face avec ${duelRival(duel)} est lancé.`, meta: duelMatchLabel(duel), action: 'VOIR LE DUEL', href: '/(tabs)/social/duels' as SocialRoute };
  if (mission) return { eyebrow: 'MISSION ACTIVE', title: 'Quelqu’un compte sur ton prochain call.', meta: questPartnerLabel(mission), action: 'CONTINUER', href: '/(tabs)/social/missions' as SocialRoute };
  return { eyebrow: 'PROCHAIN MOVE', title: 'Agrandis ton cercle pour déclencher de nouvelles rivalités.', meta: 'Trouve un joueur, crée une ligue ou transforme ton prochain call en duel.', action: 'TROUVER UN JOUEUR', href: '/(tabs)/social/friends' as SocialRoute };
}

function buildActions(data: SocialSnapshot, activeDuels: DuelRow[]): SocialAction[] {
  const actions: SocialAction[] = [];
  data.friends.recues.slice(0, 2).forEach((friend) => actions.push({ id: `friend-${friend.id}`, glyph: '◎', eyebrow: 'DEMANDE', title: `${friend.pseudo} veut rejoindre ton cercle.`, meta: 'Accepter ou refuser', href: '/(tabs)/social/friends' }));
  if (data.missions.a_reveler) actions.push({ id: `reveal-${data.missions.a_reveler.id}`, glyph: '⚡', eyebrow: 'À RÉVÉLER', title: 'Le résultat de ta mission est prêt.', meta: questPartnerLabel(data.missions.a_reveler), href: '/(tabs)/social/missions' });
  data.missions.actives.slice(0, 1).forEach((quest) => actions.push({ id: `mission-${quest.id}`, glyph: '⚡', eyebrow: 'MISSION', title: questTitle(quest), meta: `${quest.progression}/${quest.objectif} · ${questPartnerLabel(quest)}`, href: '/(tabs)/social/missions' }));
  activeDuels.slice(0, 2).forEach((duel) => actions.push({ id: `duel-${duel.token}`, glyph: '⚔', eyebrow: effectiveDuelStatus(duel) === 'accepte' ? 'DUEL VERROUILLÉ' : 'DUEL EN ATTENTE', title: `Face à ${duelRival(duel)}`, meta: duelMatchLabel(duel), href: '/(tabs)/social/duels' }));
  return actions;
}

function metric(loading: boolean, available: boolean, value: number) { return loading ? '—' : available ? value : '!'; }
function countLabel(loading: boolean, available: boolean, value: number, singular: string, plural = `${singular}s`) { return loading ? 'Chargement…' : available ? `${value} ${value === 1 ? singular : plural}` : 'Indisponible'; }
function effectiveDuelStatus(duel: DuelRow): DuelStatus { return duel.statut === 'en_attente' && duel.debut && new Date(duel.debut).getTime() <= Date.now() ? 'expire' : duel.statut; }
function isActiveDuel(duel: DuelRow) { const status = effectiveDuelStatus(duel); return status === 'en_attente' || status === 'accepte'; }
function duelRival(duel: DuelRow) { return duel.moi_role === 'createur' ? (duel.accepteur_pseudo || 'un rival') : (duel.createur_pseudo || 'ton rival'); }
function duelMatchLabel(duel: DuelRow) { return `${duel.tag_a || duel.equipe_a || 'A'} vs ${duel.tag_b || duel.equipe_b || 'B'}`; }
function questPartnerLabel(quest: FriendQuest) { return quest.partenaire?.pseudo ? `Avec ${quest.partenaire.pseudo}` : 'Mission à deux'; }
function questTitle(quest: FriendQuest) { if (quest.type === 'duel') return 'Termine votre duel.'; if (quest.type === 'revenge') return 'La revanche est ouverte.'; if (quest.type === 'league_push') return 'Poussez votre ligue ensemble.'; return 'Ton prochain call compte.'; }
function allDomainsAvailable(availability: SocialAvailability) { return Object.values(availability).every(Boolean); }
function hasSocialFootprint(data: SocialSnapshot) { return Boolean(data.friends.amis.length || data.friends.recues.length || data.friends.envoyees.length || data.leagues.length || data.missions.actives.length || data.missions.historique.length || data.duels.length); }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', padding: spacing.md, paddingBottom: 128, gap: 22 },
  intro: { gap: 8, paddingTop: 4 },
  eyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { maxWidth: 375, color: colors.text, fontSize: 35, lineHeight: 35, fontWeight: '900', letterSpacing: -1.6 },
  subtitle: { maxWidth: 360, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  error: { minHeight: 48, padding: 12, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' },
  errorText: { flex: 1, color: '#FF9AA2', fontSize: 11 }, retry: { color: colors.volt, fontSize: 8, fontWeight: '900' },
  heroSkeleton: { height: 260, borderRadius: 30, backgroundColor: '#10161D' },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 260, padding: 20, borderRadius: 30, justifyContent: 'flex-end', backgroundColor: '#10170D', borderWidth: 1, borderColor: '#48541E' },
  heroGlow: { position: 'absolute', right: -80, top: -95, width: 280, height: 280, borderRadius: 140, backgroundColor: '#526416', opacity: 0.32 },
  heroMark: { position: 'absolute', right: -5, top: -22, color: '#1A2411', fontSize: 185, lineHeight: 200, fontWeight: '900', letterSpacing: -16 },
  heroEyebrow: { zIndex: 2, color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  heroTitle: { zIndex: 2, maxWidth: 335, marginTop: 9, color: colors.text, fontSize: 29, lineHeight: 30, fontWeight: '900', letterSpacing: -1.2 },
  heroMeta: { zIndex: 2, maxWidth: 320, marginTop: 9, color: '#A4AFB9', fontSize: 10, lineHeight: 15 },
  heroFooter: { zIndex: 2, minHeight: 44, marginTop: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#35411E' },
  heroAction: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1 }, heroArrow: { color: colors.volt, fontSize: 20, fontWeight: '900' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minHeight: 82, padding: 11, justifyContent: 'center', borderRadius: 20, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  statFeatured: { backgroundColor: '#11170E', borderColor: '#414D1E' },
  statValue: { color: colors.text, fontSize: 23, fontWeight: '900', letterSpacing: -0.8 }, statValueFeatured: { color: colors.volt },
  statLabel: { marginTop: 5, color: colors.textMuted, fontSize: 6, fontWeight: '900', letterSpacing: 0.8 },
  section: { gap: 10 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, sectionMeta: { color: '#596570', fontSize: 7, fontWeight: '900' },
  actionList: { overflow: 'hidden', borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  actionRow: { minHeight: 84, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: '#192129' },
  actionGlyph: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E', borderWidth: 1, borderColor: '#3E4920' }, actionGlyphText: { color: colors.volt, fontSize: 17, fontWeight: '900' },
  actionCopy: { flex: 1, minWidth: 0 }, actionEyebrow: { color: colors.volt, fontSize: 7, fontWeight: '900', letterSpacing: 1 }, actionTitle: { marginTop: 3, color: colors.text, fontSize: 13, lineHeight: 16, fontWeight: '900' }, actionMeta: { marginTop: 4, color: colors.textMuted, fontSize: 8 }, actionArrow: { color: colors.volt, fontSize: 17, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  spaceCard: { flexBasis: '48.5%', minHeight: 170, padding: 15, borderRadius: 25, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  spaceCardFeatured: { backgroundColor: '#10160E', borderColor: '#414D1E' }, spaceTop: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  spaceGlyph: { color: colors.text, fontSize: 25, fontWeight: '900' }, spaceGlyphFeatured: { color: colors.volt }, badge: { maxWidth: 77, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 999, backgroundColor: '#1A230F' }, badgeText: { color: colors.volt, fontSize: 5, lineHeight: 7, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center' },
  spaceLabel: { marginTop: 17, color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  spaceTitle: { marginTop: 5, color: colors.text, fontSize: 17, fontWeight: '900' }, spaceFooter: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  spaceMeta: { flex: 1, color: colors.textMuted, fontSize: 9 }, spaceArrow: { color: colors.volt, fontSize: 14, fontWeight: '900' },
  starter: { overflow: 'hidden', padding: 18, borderRadius: 28, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#28323B' }, starterEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, starterTitle: { maxWidth: 330, marginTop: 8, color: colors.text, fontSize: 25, lineHeight: 26, fontWeight: '900', letterSpacing: -1 }, starterList: { marginTop: 17, borderTopWidth: 1, borderTopColor: '#222B32' },
  starterRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: '#192129' }, starterNumber: { width: 27, color: colors.volt, fontSize: 9, fontWeight: '900' }, starterCopy: { flex: 1, minWidth: 0 }, starterStep: { color: colors.text, fontSize: 12, fontWeight: '900' }, starterMeta: { marginTop: 4, color: colors.textMuted, fontSize: 9, lineHeight: 13 }, starterArrow: { color: colors.volt, fontSize: 16, fontWeight: '900' },
  faction: { minHeight: 105, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 25, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  factionMark: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151B11', borderWidth: 1, borderColor: '#3E4920' },
  factionGlyph: { color: colors.volt, fontSize: 22, fontWeight: '900' }, factionCopy: { flex: 1, minWidth: 0 },
  factionLabel: { color: colors.volt, fontSize: 7, fontWeight: '900', letterSpacing: 1 }, factionTitle: { marginTop: 4, color: colors.text, fontSize: 16, fontWeight: '900' }, factionMeta: { marginTop: 4, color: colors.textMuted, fontSize: 9 },
  factionArrow: { color: colors.volt, fontSize: 18, fontWeight: '900' }, pressed: { opacity: 0.74 },
});
