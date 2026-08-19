import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { teamHue } from '@/src/services/community';
import {
  type ProfileBadge,
  type ProfileData,
  type RecentPrediction,
  loadProfileData,
} from '@/src/services/profile';
import { supabase } from '@/src/lib/supabase';
import { colors, radius, spacing } from '@/src/theme/tokens';

export default function ProfileScreen() {
  const { profile, session } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'joueur';

  const load = useCallback(async (refresh = false) => {
    if (!pseudo) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setData(await loadProfileData(pseudo));
    } catch (caught) {
      console.error(caught);
      setError(caught instanceof Error ? caught.message : 'Impossible de charger le profil.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pseudo]);

  useEffect(() => {
    void load();
  }, [load]);

  const accuracy = useMemo(() => {
    const total = data?.ranking.pronostics_regles ?? 0;
    const wins = data?.ranking.pronostics_gagnes ?? 0;
    return total ? Math.round((wins / total) * 100) : 0;
  }, [data]);

  const teamColor = data?.favoriteTeam
    ? `hsl(${teamHue(data.favoriteTeam.tag, data.favoriteTeam.nom)}, 62%, 52%)`
    : colors.volt;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.volt}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>IDENTITÉ // PROFIL</Text>
            <Text style={styles.topTitle}>Ton étendard.</Text>
          </View>
          <View style={[styles.visibilityPill, !data?.publicProfile && styles.visibilityPillPrivate]}>
            <View style={[styles.visibilityDot, !data?.publicProfile && styles.visibilityDotPrivate]} />
            <Text style={styles.visibilityText}>{data?.publicProfile === false ? 'PRIVÉ' : 'PUBLIC'}</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void load()}>
              <Text style={styles.retryText}>RÉESSAYER</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.heroShell}>
          <View style={[styles.standard, { borderColor: teamColor }]}>
            <View style={[styles.standardGlow, { backgroundColor: teamColor }]} />
            <Text style={[styles.teamWatermark, { color: teamColor }]}>
              {data?.favoriteTeam?.tag || 'CLUTCH'}
            </Text>

            <View style={styles.standardTop}>
              <View>
                <Text style={styles.standardEyebrow}>ÉTENDARD</Text>
                <Text style={styles.standardMeta}>
                  {data?.favoriteTeam
                    ? `${data.favoriteTeam.nom} · ${gameName(data.favoriteTeam.jeu)}`
                    : 'Aucune faction choisie'}
                </Text>
              </View>
              <Text style={styles.standardCount}>{data?.pinnedBadges.length ?? 0}/4</Text>
            </View>

            <View style={styles.pinnedRow}>
              {loading ? (
                <>
                  <BadgePlaceholder large />
                  <BadgePlaceholder />
                  <BadgePlaceholder />
                  <BadgePlaceholder />
                </>
              ) : (
                <>
                  {(data?.pinnedBadges ?? []).map((badge, index) => (
                    <BadgeMedal key={badge.key} badge={badge} large={index === 0} />
                  ))}
                  {Array.from({ length: Math.max(0, 4 - (data?.pinnedBadges.length ?? 0)) }).map((_, index) => (
                    <BadgePlaceholder key={`empty-${index}`} large={(data?.pinnedBadges.length ?? 0) === 0 && index === 0} />
                  ))}
                </>
              )}
            </View>
          </View>

          <View style={styles.identityBlock}>
            <ClutchEmblem
              level={data?.level.level ?? 0}
              prestige={data?.level.prestige ?? 'recrue'}
            />

            <View style={styles.identityCopy}>
              <Text style={styles.levelLine}>
                {loading ? 'NIVEAU —' : `NIVEAU ${data?.level.level} · ${data?.level.title?.toUpperCase()}`}
              </Text>
              <Text style={styles.pseudo}>{data?.pseudo || pseudo}</Text>
              <Text style={styles.profileTitle}>
                {data?.profileTitle || data?.level.prestigeLabel || 'Recrue'}
              </Text>
              <Text style={styles.memberMeta}>
                {data?.favoriteTeam ? `Fan de ${data.favoriteTeam.nom}` : 'Sans faction'}
                {data?.createdAt ? ` · depuis ${formatMonthYear(data.createdAt)}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.xpBlock}>
            <View style={styles.xpTop}>
              <View>
                <Text style={styles.xpEyebrow}>PROGRESSION PERMANENTE</Text>
                <Text style={styles.xpValue}>{loading ? '— XP' : `${formatNumber(data?.level.xp ?? 0)} XP`}</Text>
              </View>
              <Text style={styles.xpRemaining}>
                {loading ? '—' : `${formatNumber(data?.level.remaining ?? 0)} avant le niveau suivant`}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(2, Math.round((data?.level.progress ?? 0) * 100))}%` },
                ]}
              />
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <ProfileStat
            eyebrow="RATING"
            value={loading ? '—' : formatNumber(data?.ranking.frags ?? 0)}
            detail="Frags"
            featured
          />
          <ProfileStat
            eyebrow="RANG"
            value={loading ? '—' : data?.ranking.rang ? `#${data.ranking.rang}` : '—'}
            detail={data?.ranking.saison_nom || 'Saison'}
          />
          <ProfileStat
            eyebrow="PRÉCISION"
            value={loading ? '—' : `${accuracy}%`}
            detail={`${data?.ranking.pronostics_gagnes ?? 0}/${data?.ranking.pronostics_regles ?? 0} validés`}
          />
          <ProfileStat
            eyebrow="SÉRIE"
            value={loading ? '—' : data?.currentStreak ? `${data.currentStreak}` : '—'}
            detail="victoires"
          />
        </View>

        <SectionHeader eyebrow="FACTION" title="Ta couleur dans Clutch" />
        {data?.favoriteTeam ? (
          <Pressable
            onPress={() => router.push('/(tabs)/community')}
            style={({ pressed }) => [styles.factionCard, pressed && styles.pressed]}
          >
            <View style={[styles.factionAccent, { backgroundColor: teamColor }]} />
            <View style={styles.factionIdentity}>
              <View style={[styles.teamMark, { borderColor: teamColor }]}>
                <Text style={[styles.teamMarkText, { color: teamColor }]}>{data.favoriteTeam.tag}</Text>
              </View>
              <View style={styles.factionCopy}>
                <Text style={styles.factionName}>{data.favoriteTeam.nom}</Text>
                <Text style={styles.factionMeta}>
                  {formatNumber(data.favoriteTeam.supporters)} supporter{data.favoriteTeam.supporters > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <View style={styles.relicCompact}>
              <View style={[styles.relicCore, { borderColor: teamColor }]}>
                <View style={[styles.relicLiquid, { backgroundColor: teamColor }]} />
                <View style={styles.relicNucleus} />
              </View>
              <View>
                <Text style={styles.relicEyebrow}>RELIQUE · FORME {roman(data.favoriteTeam.relique_niveau)}</Text>
                <Text style={styles.relicName}>{data.favoriteTeam.relique}</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune faction sur ton étendard.</Text>
            <Text style={styles.emptyText}>Choisis une équipe favorite pour donner une couleur à ton profil.</Text>
          </View>
        )}

        <View style={styles.sectionWithMeta}>
          <SectionHeader eyebrow="ARSENAL" title="Badges décrochés" compact />
          <Text style={styles.sectionMeta}>
            {data?.badges.filter((badge) => badge.obtained).length ?? 0}/{data?.badges.length ?? 0}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.arsenalRail}
        >
          {(data?.arsenalBadges.length ? data.arsenalBadges : data?.badges.filter((badge) => badge.obtained).slice(0, 5) ?? []).map((badge) => (
            <View key={badge.key} style={styles.arsenalItem}>
              <BadgeMedal badge={badge} />
              <Text numberOfLines={2} style={styles.arsenalName}>{badge.name}</Text>
              <Text style={styles.arsenalRarity}>{rarityLabel(badge.rarity).toUpperCase()}</Text>
            </View>
          ))}
          {!loading && !data?.badges.some((badge) => badge.obtained) ? (
            <View style={styles.arsenalEmpty}>
              <Text style={styles.arsenalEmptyTitle}>Ton Arsenal est vide.</Text>
              <Text style={styles.arsenalEmptyText}>Tes premiers badges apparaîtront ici automatiquement.</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.sectionWithMeta}>
          <SectionHeader eyebrow="VERDICTS" title="Ta forme récente" compact />
          {data?.bestGame ? (
            <View style={styles.bestGamePill}>
              <Text style={styles.bestGameText}>{gameName(data.bestGame.jeu)} · {Math.round(data.bestGame.precision_pct)}%</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.recentList}>
          {(data?.recent ?? []).map((item) => <RecentRow key={item.id} item={item} />)}
          {!loading && !data?.recent.length ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Pas encore de verdict.</Text>
              <Text style={styles.emptyText}>Tes derniers pronostics réglés laisseront leur trace ici.</Text>
              <Pressable onPress={() => router.push('/(tabs)/matches')}>
                <Text style={styles.inlineAction}>ALLER DANS L’ARENA →</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.accountCard}>
          <View style={styles.accountCopy}>
            <Text style={styles.accountEyebrow}>COMPTE</Text>
            <Text numberOfLines={1} style={styles.accountEmail}>{session?.user.email}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void supabase.auth.signOut()}
            style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
          >
            <Text style={styles.logoutText}>SE DÉCONNECTER</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function ClutchEmblem({ level, prestige }: { level: number; prestige: ProfileData['level']['prestige'] }) {
  const scale = prestige === 'clutch' ? 1.14 : prestige === 'master' ? 1.1 : prestige === 'elite' ? 1.07 : 1;
  return (
    <View style={[styles.emblemOuter, prestige !== 'recrue' && styles.emblemOuterActive]}>
      {prestige !== 'recrue' ? <View style={styles.emblemOrbit} /> : null}
      <View style={[styles.emblem, { transform: [{ scale }] }]}>
        <View style={styles.emblemCutout} />
        <Text style={styles.emblemLevel}>{level}</Text>
      </View>
    </View>
  );
}

function BadgeMedal({ badge, large = false }: { badge: ProfileBadge; large?: boolean }) {
  const tone = rarityColor(badge.rarity);
  return (
    <View style={[styles.badgeWrap, large && styles.badgeWrapLarge]}>
      <View style={[styles.badgeRing, large && styles.badgeRingLarge, { borderColor: tone }]}>
        <View style={[styles.badgeCore, { backgroundColor: `${tone}22` }]}>
          <Text style={[styles.badgeGlyph, large && styles.badgeGlyphLarge, { color: tone }]}>
            {familyGlyph(badge.family)}
          </Text>
        </View>
      </View>
      {large ? <View style={[styles.badgeRibbon, { backgroundColor: tone }]} /> : null}
    </View>
  );
}

function BadgePlaceholder({ large = false }: { large?: boolean }) {
  return (
    <View style={[styles.badgeWrap, large && styles.badgeWrapLarge]}>
      <View style={[styles.badgePlaceholder, large && styles.badgePlaceholderLarge]}>
        <Text style={styles.badgePlaceholderText}>+</Text>
      </View>
    </View>
  );
}

function ProfileStat({
  eyebrow,
  value,
  detail,
  featured = false,
}: {
  eyebrow: string;
  value: string;
  detail: string;
  featured?: boolean;
}) {
  return (
    <View style={[styles.statCard, featured && styles.statCardFeatured]}>
      <Text style={styles.statEyebrow}>{eyebrow}</Text>
      <Text style={[styles.statValue, featured && styles.statValueFeatured]}>{value}</Text>
      <Text numberOfLines={1} style={styles.statDetail}>{detail}</Text>
    </View>
  );
}

function SectionHeader({ eyebrow, title, compact = false }: { eyebrow: string; title: string; compact?: boolean }) {
  return (
    <View style={[styles.sectionHeader, compact && styles.sectionHeaderCompact]}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function RecentRow({ item }: { item: RecentPrediction }) {
  const won = item.statut === 'gagne';
  const chosen = item.choix === 'a' ? item.equipe_a : item.equipe_b;
  const delta = Math.abs(Number(item.delta_frags ?? 0));
  return (
    <Pressable
      onPress={() => router.push(`/match/${item.match_id}`)}
      style={({ pressed }) => [styles.recentRow, pressed && styles.pressed]}
    >
      <View style={[styles.verdictMark, won ? styles.verdictWin : styles.verdictLoss]}>
        <Text style={styles.verdictGlyph}>{won ? '✓' : '×'}</Text>
      </View>
      <View style={styles.recentCopy}>
        <Text style={styles.recentGame}>{gameName(item.jeu)} · {item.evenement}</Text>
        <Text numberOfLines={1} style={styles.recentChoice}>{chosen}</Text>
        <Text style={styles.recentMatch}>{item.tag_a} {score(item.score_a)}–{score(item.score_b)} {item.tag_b}</Text>
      </View>
      <View style={styles.deltaWrap}>
        <Text style={[styles.delta, won ? styles.deltaWin : styles.deltaLoss]}>
          {won ? '+' : '−'}{formatNumber(delta)}
        </Text>
        <Text style={styles.deltaUnit}>FRAGS</Text>
      </View>
    </Pressable>
  );
}

function rarityColor(rarity: ProfileBadge['rarity']) {
  if (rarity === 'mythique') return '#FFCE5C';
  if (rarity === 'legendaire') return '#FF9A4D';
  if (rarity === 'epique') return '#B77CFF';
  if (rarity === 'rare') return '#6AA9FF';
  return '#AAB4C0';
}

function rarityLabel(rarity: ProfileBadge['rarity']) {
  if (rarity === 'mythique') return 'Mythique';
  if (rarity === 'legendaire') return 'Légendaire';
  if (rarity === 'epique') return 'Épique';
  if (rarity === 'rare') return 'Rare';
  return 'Commun';
}

function familyGlyph(family: string) {
  if (family === 'Audace') return '▲';
  if (family === 'Précision') return '◎';
  if (family === 'Social') return '◇';
  if (family === 'Communauté') return '◈';
  if (family === 'Régularité') return '≋';
  if (family === 'Connaissance') return '⌁';
  if (family === 'Collection') return '✦';
  return 'C';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

function formatMonthYear(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

function gameName(game: string) {
  const key = String(game || '').toLowerCase();
  if (key.includes('lol') || key.includes('league')) return 'LoL';
  if (key.includes('valorant')) return 'VAL';
  if (key.includes('cs')) return 'CS2';
  return String(game || 'ESPORT').toUpperCase();
}

function score(value: number | null) {
  return value == null ? '—' : String(value);
}

function roman(level: number) {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][Math.max(0, Math.min(6, level - 1))];
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  topBar: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  eyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  topTitle: { marginTop: 4, color: colors.text, fontSize: 28, lineHeight: 32, fontWeight: '900', letterSpacing: -0.9 },
  visibilityPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: '#121A12', borderWidth: 1, borderColor: '#293A24' },
  visibilityPillPrivate: { backgroundColor: colors.surface, borderColor: colors.border },
  visibilityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt },
  visibilityDotPrivate: { backgroundColor: colors.textMuted },
  visibilityText: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  errorBanner: { padding: spacing.md, borderRadius: radius.md, backgroundColor: '#1B1114', borderWidth: 1, borderColor: '#4B252C', gap: spacing.sm },
  errorText: { color: '#FF929A', fontSize: 12, lineHeight: 18 },
  retryText: { color: colors.text, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroShell: { gap: spacing.md },
  standard: { minHeight: 178, overflow: 'hidden', padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#0B1016', borderWidth: 1, justifyContent: 'space-between' },
  standardGlow: { position: 'absolute', width: 210, height: 210, borderRadius: 105, right: -75, top: -105, opacity: 0.13 },
  teamWatermark: { position: 'absolute', right: -8, bottom: -26, fontSize: 92, fontWeight: '900', letterSpacing: -7, opacity: 0.07 },
  standardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  standardEyebrow: { color: colors.text, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  standardMeta: { marginTop: 5, color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  standardCount: { color: colors.textMuted, fontSize: 10, fontWeight: '900' },
  pinnedRow: { minHeight: 82, flexDirection: 'row', alignItems: 'flex-end', gap: 13 },
  badgeWrap: { width: 50, height: 56, alignItems: 'center', justifyContent: 'center' },
  badgeWrapLarge: { width: 70, height: 76 },
  badgeRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, padding: 3, backgroundColor: '#090D12' },
  badgeRingLarge: { width: 62, height: 62, borderRadius: 31, borderWidth: 2.5 },
  badgeCore: { flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  badgeGlyph: { fontSize: 17, fontWeight: '900' },
  badgeGlyphLarge: { fontSize: 23 },
  badgeRibbon: { position: 'absolute', bottom: 0, width: 20, height: 11, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, opacity: 0.78 },
  badgePlaceholder: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderStyle: 'dashed', borderColor: '#33404C', alignItems: 'center', justifyContent: 'center' },
  badgePlaceholderLarge: { width: 60, height: 60, borderRadius: 30 },
  badgePlaceholderText: { color: '#56616D', fontSize: 18, fontWeight: '700' },
  identityBlock: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: 4 },
  emblemOuter: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  emblemOuterActive: { borderRadius: 42, backgroundColor: '#161D0E' },
  emblemOrbit: { position: 'absolute', width: 78, height: 78, borderRadius: 39, borderWidth: 1, borderColor: '#5D6B27', transform: [{ rotate: '24deg' }] },
  emblem: { width: 62, height: 62, borderRadius: 18, backgroundColor: colors.volt, alignItems: 'center', justifyContent: 'center' },
  emblemCutout: { position: 'absolute', width: 29, height: 31, borderRadius: 16, backgroundColor: '#080B0F', right: -5, top: 15 },
  emblemLevel: { position: 'absolute', bottom: -8, right: -5, minWidth: 25, paddingHorizontal: 5, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: '#070A0E', color: colors.text, borderWidth: 1, borderColor: colors.border, fontSize: 9, fontWeight: '900', textAlign: 'center' },
  identityCopy: { flex: 1, minWidth: 0 },
  levelLine: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  pseudo: { marginTop: 3, color: colors.text, fontSize: 27, lineHeight: 31, fontWeight: '900', letterSpacing: -0.8 },
  profileTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  memberMeta: { marginTop: 3, color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  xpBlock: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  xpTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
  xpEyebrow: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  xpValue: { marginTop: 3, color: colors.text, fontSize: 15, fontWeight: '900' },
  xpRemaining: { flex: 1, color: colors.textMuted, fontSize: 9, textAlign: 'right' },
  progressTrack: { height: 6, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.surfaceElevated },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.volt },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { width: '48.5%', minHeight: 92, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'space-between' },
  statCardFeatured: { borderColor: '#4B5724', backgroundColor: '#10150D' },
  statEyebrow: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  statValue: { color: colors.text, fontSize: 23, lineHeight: 27, fontWeight: '900', letterSpacing: -0.5 },
  statValueFeatured: { color: colors.volt },
  statDetail: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  sectionHeader: { gap: 3 },
  sectionHeaderCompact: { flex: 1 },
  sectionEyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  sectionTitle: { color: colors.text, fontSize: 20, lineHeight: 24, fontWeight: '900', letterSpacing: -0.4 },
  sectionWithMeta: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  sectionMeta: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  factionCard: { overflow: 'hidden', padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: spacing.lg },
  factionAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  factionIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  teamMark: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  teamMarkText: { fontSize: 15, fontWeight: '900' },
  factionCopy: { flex: 1, minWidth: 0 },
  factionName: { color: colors.text, fontSize: 17, fontWeight: '900' },
  factionMeta: { marginTop: 3, color: colors.textMuted, fontSize: 10 },
  relicCompact: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  relicCore: { width: 38, height: 46, overflow: 'hidden', borderRadius: 13, borderWidth: 1.5, backgroundColor: '#101720', justifyContent: 'flex-end', alignItems: 'center' },
  relicLiquid: { width: '100%', height: '54%', opacity: 0.42 },
  relicNucleus: { position: 'absolute', bottom: 9, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.volt },
  relicEyebrow: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  relicName: { marginTop: 2, color: colors.text, fontSize: 14, fontWeight: '900' },
  arrow: { marginLeft: 'auto', color: colors.volt, fontSize: 21, fontWeight: '900' },
  emptyCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: spacing.sm },
  emptyTitle: { color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  emptyText: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  inlineAction: { marginTop: 2, color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  arsenalRail: { gap: spacing.sm, paddingRight: spacing.lg },
  arsenalItem: { width: 94, minHeight: 128, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  arsenalName: { marginTop: 7, color: colors.text, fontSize: 10, lineHeight: 13, fontWeight: '800', textAlign: 'center' },
  arsenalRarity: { marginTop: 4, color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  arsenalEmpty: { width: 280, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  arsenalEmptyTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  arsenalEmptyText: { marginTop: 5, color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  bestGamePill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bestGameText: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  recentList: { gap: spacing.sm },
  recentRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  verdictMark: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  verdictWin: { backgroundColor: '#133020' },
  verdictLoss: { backgroundColor: '#32161B' },
  verdictGlyph: { color: colors.text, fontSize: 14, fontWeight: '900' },
  recentCopy: { flex: 1, minWidth: 0 },
  recentGame: { color: colors.textMuted, fontSize: 8, fontWeight: '800' },
  recentChoice: { marginTop: 3, color: colors.text, fontSize: 12, fontWeight: '900' },
  recentMatch: { marginTop: 2, color: colors.textMuted, fontSize: 8 },
  deltaWrap: { alignItems: 'flex-end' },
  delta: { fontSize: 14, fontWeight: '900' },
  deltaWin: { color: colors.success },
  deltaLoss: { color: colors.danger },
  deltaUnit: { marginTop: 1, color: colors.textMuted, fontSize: 7, fontWeight: '900' },
  accountCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  accountCopy: { flex: 1, minWidth: 0 },
  accountEyebrow: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  accountEmail: { marginTop: 3, color: colors.text, fontSize: 10 },
  logout: { minHeight: 38, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: '#3A252A', backgroundColor: '#180F12', alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: '#FF858E', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
});
