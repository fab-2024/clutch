import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { signOut } from '@/src/features/auth/api';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, layout, radius, spacing } from '@/src/theme';
import { teamHue } from '@/src/utils/teams';

import { loadProfileData } from '../api';
import type { ProfileBadge, ProfileData, RecentPrediction } from '../types';

type ProfileScreenProps = {
  profilePseudo?: string;
  publicView?: boolean;
};

export default function ProfileScreen({ profilePseudo, publicView = false }: ProfileScreenProps) {
  const { profile, session } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const ownPseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'joueur';
  const pseudo = profilePseudo?.trim() || ownPseudo;

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try { setData(await loadProfileData(pseudo)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Impossible de charger le profil.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.equipe_favorite_id, profile?.profil_public, pseudo]);

  useEffect(() => { void load(); }, [load]);

  const accuracy = useMemo(() => {
    const total = data?.ranking.pronostics_regles ?? 0;
    const wins = data?.ranking.pronostics_gagnes ?? 0;
    return total ? Math.round((wins / total) * 100) : 0;
  }, [data]);

  const hue = data?.favoriteTeam ? teamHue(data.favoriteTeam.tag, data.favoriteTeam.nom) : 76;
  const teamColor = `hsl(${hue}, 68%, 55%)`;
  const obtained = data?.badges.filter((badge) => badge.obtained) ?? [];

  async function leaveSession() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
    } catch {
      setSignOutError('Déconnexion impossible. Vérifie ta connexion puis réessaie.');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
      >
        <ProfileHeader publicProfile={data?.publicProfile !== false} publicView={publicView} />

        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable></View> : null}

        {!publicView ? (
          <Pressable accessibilityLabel="Modifier les paramètres du profil" accessibilityRole="button" onPress={() => router.push('/settings/profile')} style={({ pressed }) => [styles.settingsEntry, pressed && styles.pressed]}>
            <View style={styles.settingsMark}><Text style={styles.settingsGlyph}>⚙</Text></View>
            <View style={styles.settingsCopy}><Text style={styles.settingsLabel}>PARAMÈTRES</Text><Text style={styles.settingsTitle}>Jeux, faction et visibilité</Text></View>
            <Text style={styles.settingsArrow}>→</Text>
          </Pressable>
        ) : null}

        <View style={[styles.hero, { borderColor: `${teamColor}66` }]}>
          <View style={[styles.heroGlow, { backgroundColor: teamColor }]} />
          <Text style={[styles.watermark, { color: teamColor }]}>{data?.favoriteTeam?.tag || 'CLUTCH'}</Text>
          <Text style={styles.heroEyebrow}>IDENTITÉ // ÉTENDARD</Text>

          <View style={styles.identityRow}>
            <Emblem level={data?.level.level ?? 0} />
            <View style={styles.identityCopy}>
              <Text style={styles.levelLine}>{loading ? 'NIVEAU —' : `NIVEAU ${data?.level.level} · ${data?.level.title?.toUpperCase()}`}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.pseudo}>{data?.pseudo || pseudo}</Text>
              <Text style={styles.profileTitle}>{data?.profileTitle || data?.level.prestigeLabel || 'Recrue'}</Text>
            </View>
          </View>

          <View style={styles.badgeStrip}>
            {(loading ? [] : data?.pinnedBadges ?? []).map((badge) => <BadgeToken key={badge.key} badge={badge} />)}
            {!loading && Array.from({ length: Math.max(0, 4 - (data?.pinnedBadges.length ?? 0)) }).map((_, index) => <View key={`empty-${index}`} style={styles.emptyBadge}><Text style={styles.emptyBadgeText}>+</Text></View>)}
          </View>

          <View style={styles.xpBlock}>
            <View style={styles.xpTop}><Text style={styles.xpLabel}>PROGRESSION PERMANENTE</Text><Text style={styles.xpValue}>{loading ? '—' : `${formatNumber(data?.level.xp ?? 0)} XP`}</Text></View>
            <View style={styles.track}><View style={[styles.trackFill, { width: `${Math.max(2, Math.round((data?.level.progress ?? 0) * 100))}%` }]} /></View>
            <Text style={styles.xpHint}>{loading ? 'Synchronisation…' : `${formatNumber(data?.level.remaining ?? 0)} XP avant le niveau suivant`}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <Stat label="RATING" value={loading ? '—' : formatNumber(data?.ranking.frags ?? 0)} detail="FRAGS" featured />
          <Stat label="RANG" value={loading ? '—' : data?.ranking.rang ? `#${data.ranking.rang}` : '—'} detail="SAISON" />
          <Stat label="RÉUSSITE" value={loading ? '—' : `${accuracy}%`} detail={`${data?.ranking.pronostics_gagnes ?? 0}/${data?.ranking.pronostics_regles ?? 0}`} />
          <Stat label="SÉRIE" value={loading ? '—' : `${data?.currentStreak ?? 0}`} detail="VICTOIRES" />
        </View>

        <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>FACTION</Text><Text style={styles.sectionTitle}>TA COULEUR DANS CLUTCH.</Text></View></View>
        {data?.favoriteTeam ? (
          <Pressable onPress={() => router.push('/(tabs)/social/faction')} style={({ pressed }) => [styles.factionCard, pressed && styles.pressed]}>
            <View style={[styles.factionGlow, { backgroundColor: teamColor }]} />
            <View style={[styles.teamMark, { borderColor: teamColor }]}><Text style={[styles.teamMarkText, { color: teamColor }]}>{data.favoriteTeam.tag}</Text></View>
            <View style={styles.factionCopy}><Text style={styles.factionEyebrow}>RELIQUE · FORME {roman(data.favoriteTeam.relique_niveau)}</Text><Text style={styles.factionName}>{data.favoriteTeam.nom}</Text><Text style={styles.factionMeta}>{data.favoriteTeam.relique} · {formatNumber(data.favoriteTeam.supporters)} supporter{data.favoriteTeam.supporters > 1 ? 's' : ''}</Text></View>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        ) : (
          <View style={styles.emptyCard}><Text style={styles.emptyEyebrow}>SANS FACTION</Text><Text style={styles.emptyTitle}>Ton étendard attend encore une couleur.</Text><Text style={styles.emptyText}>Choisis ton équipe favorite pour faire apparaître la relique ici.</Text></View>
        )}

        <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>ARSENAL</Text><Text style={styles.sectionTitle}>CE QUE TU AS DÉCROCHÉ.</Text></View><Text style={styles.sectionCount}>{obtained.length}/{data?.badges.length ?? 0}</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.arsenalRail}>
          {(data?.arsenalBadges.length ? data.arsenalBadges : obtained.slice(0, 6)).map((badge) => <ArsenalCard key={badge.key} badge={badge} />)}
          {!loading && !obtained.length ? <View style={styles.arsenalEmpty}><Text style={styles.arsenalEmptyTitle}>ARSENAL VIDE.</Text><Text style={styles.arsenalEmptyText}>Tes premiers badges apparaîtront ici automatiquement.</Text></View> : null}
        </ScrollView>

        <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>VERDICTS</Text><Text style={styles.sectionTitle}>TA FORME RÉCENTE.</Text></View>{data?.bestGame ? <Text style={styles.sectionCount}>{gameName(data.bestGame.jeu)} · {Math.round(data.bestGame.precision_pct)}%</Text> : null}</View>
        <View style={styles.verdicts}>
          {(data?.recent ?? []).slice(0, 5).map((item) => <VerdictRow key={item.id} item={item} />)}
          {!loading && !data?.recent.length ? <View style={styles.emptyCard}><Text style={styles.emptyEyebrow}>AUCUN VERDICT</Text><Text style={styles.emptyTitle}>Ton historique commence avec ton premier call.</Text><Pressable onPress={() => router.push('/(tabs)/matches')}><Text style={styles.inlineAction}>ENTRER DANS L’ARENA →</Text></Pressable></View> : null}
        </View>

        {!publicView ? (
          <>
            <View style={styles.accountCard}>
              <View style={styles.accountCopy}><Text style={styles.accountLabel}>COMPTE</Text><Text numberOfLines={1} style={styles.accountEmail}>{session?.user.email}</Text></View>
              <Pressable accessibilityLabel="Se déconnecter" accessibilityRole="button" disabled={signingOut} onPress={() => void leaveSession()} style={({ pressed }) => [styles.logout, signingOut && styles.disabled, pressed && styles.pressed]}><Text style={styles.logoutText}>{signingOut ? 'DÉCONNEXION…' : 'SE DÉCONNECTER'}</Text></Pressable>
            </View>
            {signOutError ? <Text style={styles.accountError}>{signOutError}</Text> : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ProfileHeader({ publicProfile, publicView }: { publicProfile: boolean; publicView: boolean }) {
  return (
    <View style={styles.header}>
      {publicView ? (
        <Pressable accessibilityLabel="Revenir au Social" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>← SOCIAL</Text></Pressable>
      ) : (
        <View style={styles.brandRow}><View style={styles.logoBox}><Text style={styles.logoGlyph}>C</Text></View><View style={styles.wordmarkRow}><Text style={styles.wordmark}>CLUTCH</Text><View style={styles.dot} /></View></View>
      )}
      <View style={styles.visibility}><View style={[styles.visibilityDot, !publicProfile && styles.visibilityDotPrivate]} /><Text style={styles.visibilityText}>{publicProfile ? 'PUBLIC' : 'PRIVÉ'}</Text></View>
    </View>
  );
}

function Emblem({ level }: { level: number }) {
  return <View style={styles.emblemOuter}><View style={styles.emblem}><View style={styles.emblemCut} /><Text style={styles.emblemLevel}>{level}</Text></View></View>;
}

function BadgeToken({ badge }: { badge: ProfileBadge }) {
  const tone = rarityColor(badge.rarity);
  return <View style={[styles.badgeToken, { borderColor: tone }]}><Text style={[styles.badgeGlyph, { color: tone }]}>{familyGlyph(badge.family)}</Text></View>;
}

function ArsenalCard({ badge }: { badge: ProfileBadge }) {
  const tone = rarityColor(badge.rarity);
  return <View style={styles.arsenalCard}><View style={[styles.arsenalMedal, { borderColor: tone }]}><Text style={[styles.arsenalGlyph, { color: tone }]}>{familyGlyph(badge.family)}</Text></View><Text numberOfLines={2} style={styles.arsenalName}>{badge.name}</Text><Text style={[styles.arsenalRarity, { color: tone }]}>{badge.rarity.toUpperCase()}</Text></View>;
}

function Stat({ label, value, detail, featured = false }: { label: string; value: string; detail: string; featured?: boolean }) {
  return <View style={[styles.stat, featured && styles.statFeatured]}><Text style={styles.statLabel}>{label}</Text><Text style={[styles.statValue, featured && styles.statValueFeatured]}>{value}</Text><Text style={styles.statDetail}>{detail}</Text></View>;
}

function VerdictRow({ item }: { item: RecentPrediction }) {
  const won = item.statut === 'gagne';
  const choice = item.choix === 'a' ? item.tag_a : item.tag_b;
  const delta = Math.abs(Number(item.delta_frags ?? 0));
  return (
    <View style={styles.verdictRow}>
      <View style={[styles.verdictMark, won ? styles.verdictMarkWin : styles.verdictMarkLoss]}><Text style={[styles.verdictLetter, won ? styles.verdictWin : styles.verdictLoss]}>{won ? 'W' : 'L'}</Text></View>
      <View style={styles.verdictCopy}><Text style={styles.verdictTitle}>{choice} · {item.evenement}</Text><Text style={styles.verdictMeta}>{gameName(item.jeu)} · {item.tag_a} vs {item.tag_b}</Text></View>
      <Text style={[styles.delta, won ? styles.verdictWin : styles.verdictLoss]}>{won ? '+' : '−'}{formatNumber(delta)}</Text>
    </View>
  );
}

function rarityColor(rarity: ProfileBadge['rarity']) { if (rarity === 'mythique') return '#FF5DDF'; if (rarity === 'legendaire') return '#FFB84D'; if (rarity === 'epique') return '#A982FF'; if (rarity === 'rare') return '#63B8FF'; return '#AAB4BE'; }
function familyGlyph(family: string) { const value = family.toLowerCase(); if (value.includes('social')) return '◎'; if (value.includes('audace')) return '⚡'; if (value.includes('commun')) return '✦'; if (value.includes('régular')) return '↗'; if (value.includes('connaissance')) return '◇'; return '◆'; }
function roman(level: number) { return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][Math.max(0, Math.min(6, Number(level || 1) - 1))]; }
function gameName(game: string) { const key = String(game || '').toLowerCase(); if (key.includes('lol') || key.includes('league')) return 'LoL'; if (key.includes('valorant')) return 'VAL'; if (key.includes('cs')) return 'CS2'; return 'ESPORT'; }
function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: layout.tabBarContentInset, gap: 22 },
  header: { minHeight: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#171D23' }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, logoBox: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt }, logoGlyph: { color: '#06090C', fontSize: 25, lineHeight: 28, fontWeight: '900', letterSpacing: -2 }, wordmarkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 }, wordmark: { color: colors.text, fontSize: 17, fontWeight: '900', letterSpacing: 3.1 }, dot: { width: 5, height: 5, marginBottom: 3, borderRadius: 3, backgroundColor: colors.volt }, back: { minHeight: 38, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#28313A' }, backText: { color: colors.text, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 }, visibility: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#28313A' }, visibilityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt }, visibilityDotPrivate: { backgroundColor: '#FFB84D' }, visibilityText: { color: colors.text, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  error: { marginHorizontal: spacing.md, padding: 12, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027', flexDirection: 'row', gap: 10, justifyContent: 'space-between' }, errorText: { flex: 1, color: '#FF9AA2', fontSize: 11 }, retry: { color: colors.volt, fontSize: 8, fontWeight: '900' },
  settingsEntry: { minHeight: 76, marginHorizontal: spacing.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 21, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, settingsMark: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E', borderWidth: 1, borderColor: '#3A461D' }, settingsGlyph: { color: colors.volt, fontSize: 16, fontWeight: '900' }, settingsCopy: { flex: 1 }, settingsLabel: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1 }, settingsTitle: { marginTop: 4, color: colors.text, fontSize: 13, fontWeight: '900' }, settingsArrow: { color: colors.volt, fontSize: 17, fontWeight: '900' },
  hero: { position: 'relative', overflow: 'hidden', marginHorizontal: spacing.md, minHeight: 370, padding: 20, borderRadius: 31, backgroundColor: '#0A0F14', borderWidth: 1, gap: 18 }, heroGlow: { position: 'absolute', right: -120, top: -80, width: 310, height: 310, borderRadius: 155, opacity: 0.15 }, watermark: { position: 'absolute', right: -14, top: 80, fontSize: 86, lineHeight: 90, fontWeight: '900', opacity: 0.09, letterSpacing: -5 }, heroEyebrow: { zIndex: 2, color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  identityRow: { zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 15 }, emblemOuter: { width: 94, height: 94, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: '#121812', borderWidth: 1, borderColor: '#48541E' }, emblem: { width: 68, height: 68, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt }, emblemCut: { position: 'absolute', right: -2, width: 27, height: 38, borderTopLeftRadius: 20, borderBottomLeftRadius: 20, backgroundColor: '#121812' }, emblemLevel: { marginLeft: -6, color: '#080A0C', fontSize: 22, fontWeight: '900' }, identityCopy: { flex: 1, minWidth: 0 }, levelLine: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 }, pseudo: { marginTop: 4, color: colors.text, fontSize: 34, lineHeight: 36, fontWeight: '900', letterSpacing: -1.5 }, profileTitle: { marginTop: 4, color: colors.volt, fontSize: 11, fontWeight: '900' },
  badgeStrip: { zIndex: 2, minHeight: 64, flexDirection: 'row', gap: 10, alignItems: 'center' }, badgeToken: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D1319', borderWidth: 1.2 }, badgeGlyph: { fontSize: 19, fontWeight: '900' }, emptyBadge: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C1116', borderWidth: 1, borderColor: '#25303A', borderStyle: 'dashed' }, emptyBadgeText: { color: '#596570', fontSize: 18, fontWeight: '700' },
  xpBlock: { zIndex: 2, marginTop: 'auto', padding: 14, borderRadius: 18, backgroundColor: '#080D11', borderWidth: 1, borderColor: '#202A32', gap: 8 }, xpTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, xpLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 }, xpValue: { color: colors.text, fontSize: 12, fontWeight: '900' }, track: { height: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: '#182028' }, trackFill: { height: '100%', borderRadius: 999, backgroundColor: colors.volt }, xpHint: { color: colors.textMuted, fontSize: 8 },
  statsGrid: { marginHorizontal: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, stat: { flexBasis: '48.5%', minHeight: 102, padding: 14, borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, statFeatured: { backgroundColor: '#11170E', borderColor: '#414D1E' }, statLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1 }, statValue: { marginTop: 10, color: colors.text, fontSize: 25, fontWeight: '900', letterSpacing: -1 }, statValueFeatured: { color: colors.volt }, statDetail: { marginTop: 'auto', color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  sectionHeading: { marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }, sectionEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 }, sectionTitle: { marginTop: 4, maxWidth: 290, color: colors.text, fontSize: 24, lineHeight: 25, fontWeight: '900', letterSpacing: -0.9 }, sectionCount: { maxWidth: 105, color: colors.textMuted, fontSize: 8, fontWeight: '900', textAlign: 'right' },
  factionCard: { position: 'relative', overflow: 'hidden', minHeight: 110, marginHorizontal: spacing.md, padding: 15, borderRadius: 25, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, factionGlow: { position: 'absolute', left: -60, width: 180, height: 180, borderRadius: 90, opacity: 0.12 }, teamMark: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#090E12', borderWidth: 1 }, teamMarkText: { fontSize: 13, fontWeight: '900' }, factionCopy: { flex: 1 }, factionEyebrow: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 }, factionName: { marginTop: 4, color: colors.text, fontSize: 17, fontWeight: '900' }, factionMeta: { marginTop: 4, color: colors.textMuted, fontSize: 9 }, arrow: { color: colors.volt, fontSize: 18, fontWeight: '900' },
  arsenalRail: { gap: 10, paddingHorizontal: spacing.md }, arsenalCard: { width: 132, minHeight: 170, padding: 14, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, arsenalMedal: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2, backgroundColor: '#0D1319' }, arsenalGlyph: { fontSize: 21, fontWeight: '900' }, arsenalName: { marginTop: 17, color: colors.text, fontSize: 13, fontWeight: '900' }, arsenalRarity: { marginTop: 'auto', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 }, arsenalEmpty: { width: 250, minHeight: 150, justifyContent: 'center', padding: 18, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, arsenalEmptyTitle: { color: colors.text, fontSize: 19, fontWeight: '900' }, arsenalEmptyText: { marginTop: 7, color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  verdicts: { marginHorizontal: spacing.md, overflow: 'hidden', borderRadius: 23, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, verdictRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#192129' }, verdictMark: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 }, verdictMarkWin: { backgroundColor: '#0E1C14', borderColor: '#23583A' }, verdictMarkLoss: { backgroundColor: '#1A1012', borderColor: '#5A2730' }, verdictLetter: { fontSize: 12, fontWeight: '900' }, verdictWin: { color: colors.success }, verdictLoss: { color: colors.danger }, verdictCopy: { flex: 1, minWidth: 0 }, verdictTitle: { color: colors.text, fontSize: 11, fontWeight: '900' }, verdictMeta: { marginTop: 3, color: colors.textMuted, fontSize: 8 }, delta: { fontSize: 11, fontWeight: '900' },
  emptyCard: { marginHorizontal: spacing.md, minHeight: 150, justifyContent: 'center', padding: 20, borderRadius: 25, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 8 }, emptyEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1 }, emptyTitle: { maxWidth: 320, color: colors.text, fontSize: 20, lineHeight: 22, fontWeight: '900' }, emptyText: { color: colors.textMuted, fontSize: 10, lineHeight: 16 }, inlineAction: { marginTop: 5, color: colors.volt, fontSize: 9, fontWeight: '900' },
  accountCard: { marginHorizontal: spacing.md, minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, accountCopy: { flex: 1, minWidth: 0 }, accountLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1 }, accountEmail: { marginTop: 5, color: colors.text, fontSize: 11, fontWeight: '800' }, logout: { minHeight: 39, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171015', borderWidth: 1, borderColor: '#43252F' }, logoutText: { color: '#FF8B96', fontSize: 8, fontWeight: '900' }, accountError: { marginHorizontal: spacing.md, marginTop: -14, color: '#FF9AA2', fontSize: 10, lineHeight: 15 }, disabled: { opacity: 0.48 }, pressed: { opacity: 0.74 },
});
