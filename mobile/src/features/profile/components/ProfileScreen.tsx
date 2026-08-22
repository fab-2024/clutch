import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { CurrencyIcon, type CurrencyKind } from '@/src/components/ui/CurrencyIcon';
import { signOut } from '@/src/features/auth/api';
import { gradeAccent } from '@/src/features/ranking/grades';
import { CosmeticAvatar } from '@/src/features/shop/components/CosmeticRenderer';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';
import { teamHue } from '@/src/utils/teams';

import { loadProfileData } from '../api';
import type { ProfileBadge, ProfileData, ProfileRanking, RecentPrediction } from '../types';
import ProfileShareCard from './ProfileShareCard';

type ProfileScreenProps = {
  previewData?: ProfileData;
  profilePseudo?: string;
  publicView?: boolean;
};

export default function ProfileScreen({ previewData, profilePseudo, publicView = false }: ProfileScreenProps) {
  const { profile, session } = useAuth();
  const { equipped } = useCosmetics();
  const { refresh: refreshEconomy, volts } = useEconomy();
  const [data, setData] = useState<ProfileData | null>(previewData ?? null);
  const [loading, setLoading] = useState(!previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const ownPseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'joueur';
  const pseudo = profilePseudo?.trim() || ownPseudo;

  const load = useCallback(async (refresh = false) => {
    if (previewData) {
      setData(previewData);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [nextProfile] = await Promise.all([
        loadProfileData(pseudo),
        refresh ? refreshEconomy() : Promise.resolve(),
      ]);
      setData(nextProfile);
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Impossible de charger le profil.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [previewData, profile?.equipe_favorite_id, profile?.profil_public, pseudo, refreshEconomy]);

  useEffect(() => { void load(); }, [load]);

  const accuracy = useMemo(() => {
    const total = data?.ranking.pronostics_regles ?? 0;
    const wins = data?.ranking.pronostics_gagnes ?? 0;
    return total ? Math.round((wins / total) * 100) : 0;
  }, [data]);

  const hue = data?.favoriteTeam ? teamHue(data.favoriteTeam.tag, data.favoriteTeam.nom) : 76;
  const teamColor = `hsl(${hue}, 68%, 55%)`;
  const hasLiveCosmetics = Boolean(equipped.frame || equipped.title || equipped.core || equipped.factionEffect || equipped.profileCard);
  const cosmetics = !previewData && !publicView && hasLiveCosmetics ? equipped : data?.cosmetics;
  const frameAccent = cosmetics?.frame?.accent ?? teamColor;
  const obtained = data?.badges.filter((badge) => badge.obtained) ?? [];
  const settledCalls = data?.ranking.pronostics_regles ?? 0;
  const placementGoal = data?.ranking.grade.objectif_placements ?? 5;
  const unranked = !loading && settledCalls === 0;
  const provisional = !loading && Boolean(data?.ranking.provisoire);
  const placementsRemaining = data?.ranking.placements_restants ?? Math.max(0, placementGoal - settledCalls);

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

        {!publicView ? (
          <Pressable accessibilityLabel="Ouvrir le Locker cosmétique" accessibilityRole="button" onPress={() => router.push('/shop' as never)} style={({ pressed }) => [styles.shopEntry, pressed && styles.pressed]}>
            <View style={styles.shopMark}><CurrencyIcon color="#080A0C" kind="volts" size={22} /></View>
            <View style={styles.shopCopy}>
              <Text style={styles.shopLabel}>LOCKER COSMÉTIQUE</Text>
              <Text style={styles.shopTitle}>Ta collection et ton identité équipée</Text>
              <Text style={styles.shopPromise}>Visible partout. Aucun avantage compétitif.</Text>
            </View>
            <View style={styles.shopBalance}><Text style={styles.shopBalanceValue}>{volts == null ? '—' : formatNumber(volts)}</Text><Text style={styles.shopBalanceLabel}>VOLTS</Text></View>
          </Pressable>
        ) : null}

        {!publicView ? (
          <Pressable accessibilityLabel="Ouvrir le journal des Volts" accessibilityRole="button" onPress={() => router.push('/economy' as never)} style={({ pressed }) => [styles.ledgerEntry, pressed && styles.pressed]}>
            <View style={styles.ledgerMark}><Text style={styles.ledgerGlyph}>≋</Text></View>
            <View style={styles.ledgerCopy}><Text style={styles.ledgerLabel}>JOURNAL DES VOLTS</Text><Text style={styles.ledgerTitle}>Chaque gain et dépense, ligne par ligne</Text></View>
            <Text style={styles.ledgerArrow}>→</Text>
          </Pressable>
        ) : null}

        <View style={[styles.hero, { borderColor: withAlpha(frameAccent, '88') }]}>
          <View style={[styles.heroGlow, { backgroundColor: frameAccent }]} />
          <Text style={[styles.watermark, { color: teamColor }]}>{data?.favoriteTeam?.tag || 'CLUTCH'}</Text>
          <View style={styles.heroEyebrowRow}>
            <Text style={styles.heroEyebrow}>IDENTITÉ // ÉTENDARD</Text>
            {cosmetics?.frame ? <Text style={[styles.cosmeticTag, { color: frameAccent }]}>{cosmetics.frame.name.toUpperCase()}</Text> : null}
          </View>

          <View style={styles.identityRow}>
            <CosmeticAvatar cosmetics={cosmetics} fallback={`${data?.level.level ?? 0}`} label={data?.pseudo || pseudo} size={94} />
            <View style={styles.identityCopy}>
              <Text style={styles.levelLine}>{loading ? 'NIVEAU —' : `NIVEAU ${data?.level.level} · ${data?.level.title?.toUpperCase()}`}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.pseudo}>{data?.pseudo || pseudo}</Text>
              <Text style={[styles.profileTitle, { color: cosmetics?.title?.accent ?? colors.volt }]}>{cosmetics?.title?.name || data?.profileTitle || data?.level.prestigeLabel || 'Starter'}</Text>
            </View>
          </View>

          <View style={styles.badgeStrip}>
            {(loading ? [] : data?.pinnedBadges ?? []).map((badge) => <BadgeToken key={badge.key} badge={badge} />)}
            {!loading && Array.from({ length: Math.max(0, 4 - (data?.pinnedBadges.length ?? 0)) }).map((_, index) => (
              <View accessibilityLabel="Emplacement de badge vide" key={`empty-${index}`} style={styles.emptyBadge}>
                <Text style={styles.emptyBadgeText}>+</Text>
                <Text style={styles.emptyBadgeLabel}>BADGE</Text>
              </View>
            ))}
          </View>

          <View style={styles.xpBlock}>
            <View style={styles.xpTop}><Text style={styles.xpLabel}>PROGRESSION PERMANENTE</Text><Text style={styles.xpValue}>{loading ? '—' : `${formatNumber(data?.level.xp ?? 0)} XP`}</Text></View>
            <View style={styles.track}><View style={[styles.trackFill, { width: `${Math.max(2, Math.round((data?.level.progress ?? 0) * 100))}%` }]} /></View>
            <Text style={styles.xpHint}>{loading ? 'Synchronisation…' : `${formatNumber(data?.level.remaining ?? 0)} XP avant le niveau suivant`}</Text>
          </View>
        </View>

        {!loading && (unranked || provisional) ? (
          <RankingStateCard
            placementGoal={placementGoal}
            placementsRemaining={placementsRemaining}
            publicView={publicView}
            unranked={unranked}
          />
        ) : !loading && data?.ranking.grade.classe ? <GradeProgressCard ranking={data.ranking} /> : null}

        <View style={styles.statsGrid}>
          <Stat currency="frags" label="RATING" value={loading ? '—' : formatNumber(data?.ranking.frags ?? 0)} detail={unranked ? 'BASE DE DÉPART' : 'FRAGS'} featured />
          <Stat compact={unranked || provisional} label="RANG" value={loading ? '—' : unranked ? 'NON CLASSÉ' : provisional ? 'PLACEMENT' : data?.ranking.rang ? `#${data.ranking.rang}` : '—'} detail={unranked ? 'FAIS TON 1ER CALL' : provisional ? `${placementsRemaining} RESTANT${placementsRemaining > 1 ? 'S' : ''}` : data?.ranking.percentile == null ? 'SAISON' : `PERCENTILE ${formatDecimal(data.ranking.percentile)}`} />
          <Stat label="RÉUSSITE" value={loading ? '—' : unranked ? '—' : `${accuracy}%`} detail={unranked ? 'AUCUN VERDICT' : `${data?.ranking.pronostics_gagnes ?? 0}/${settledCalls}`} />
          <Stat label="SÉRIE" value={loading ? '—' : unranked ? '—' : `${data?.currentStreak ?? 0}`} detail={unranked ? 'NON COMMENCÉE' : 'VICTOIRES'} />
        </View>

        {!loading && data ? (
          <ProfileShareCard
            accuracy={accuracy}
            cosmetic={cosmetics?.profileCard}
            frags={data.ranking.frags}
            grade={unranked || provisional ? 'En placement' : data.ranking.grade.libelle || 'Non classé'}
            profileTitle={cosmetics?.title?.name || data.profileTitle || data.level.prestigeLabel || 'Starter'}
            pseudo={data.pseudo || pseudo}
            publicProfile={data.publicProfile}
            rank={data.ranking.rang}
            teamTag={data.favoriteTeam?.tag || 'CLUTCH'}
          />
        ) : null}

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

function BadgeToken({ badge }: { badge: ProfileBadge }) {
  const tone = rarityColor(badge.rarity);
  return <View style={[styles.badgeToken, { borderColor: tone }]}><Text style={[styles.badgeGlyph, { color: tone }]}>{familyGlyph(badge.family)}</Text></View>;
}

function ArsenalCard({ badge }: { badge: ProfileBadge }) {
  const tone = rarityColor(badge.rarity);
  return <View style={styles.arsenalCard}><View style={[styles.arsenalMedal, { borderColor: tone }]}><Text style={[styles.arsenalGlyph, { color: tone }]}>{familyGlyph(badge.family)}</Text></View><Text numberOfLines={2} style={styles.arsenalName}>{badge.name}</Text><Text style={[styles.arsenalRarity, { color: tone }]}>{badge.rarity.toUpperCase()}</Text></View>;
}

function RankingStateCard({ placementGoal, placementsRemaining, publicView, unranked }: { placementGoal: number; placementsRemaining: number; publicView: boolean; unranked: boolean }) {
  const title = publicView
    ? 'RANG EN CONSTRUCTION.'
    : unranked
      ? 'FAIS TON PREMIER CALL.'
      : `ENCORE ${placementsRemaining} VERDICT${placementsRemaining > 1 ? 'S' : ''}.`;
  const copy = unranked
    ? `${placementGoal} verdicts classés révèlent le grade et le rang de saison. Le risque exact est toujours visible avant de choisir.`
    : `${placementGoal - placementsRemaining}/${placementGoal} placements terminés. Le grade et le rang apparaîtront une fois la série complétée.`;

  return (
    <View style={styles.rankingState}>
      <View style={styles.rankingStateStep}><Text style={styles.rankingStateStepValue}>{placementGoal - placementsRemaining}/{placementGoal}</Text><Text style={styles.rankingStateStepLabel}>PLACEMENTS</Text></View>
      <View style={styles.rankingStateCopy}>
        <Text style={styles.rankingStateEyebrow}>OBJECTIF DE SAISON</Text>
        <Text style={styles.rankingStateTitle}>{title}</Text>
        <Text style={styles.rankingStateText}>{copy}</Text>
        {!publicView ? <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/matches')}><Text style={styles.rankingStateAction}>VOIR LES MATCHS OUVERTS →</Text></Pressable> : null}
      </View>
    </View>
  );
}

function GradeProgressCard({ ranking }: { ranking: ProfileRanking }) {
  const grade = ranking.grade;
  const accent = gradeAccent(grade);
  const progress = Math.max(0, Math.min(100, Math.round(grade.progression * 100)));
  const next = grade.prochain_libelle
    ? `${formatNumber(Math.max(0, Number(grade.prochain_minimum ?? ranking.frags) - ranking.frags))} Frags avant ${grade.prochain_libelle}`
    : 'Palier saisonnier maximal atteint';
  return (
    <View style={[styles.gradeCard, { borderColor: `${accent}66` }]}>
      <View style={styles.gradeTop}>
        <View style={[styles.gradeMark, { borderColor: accent, backgroundColor: `${accent}16` }]}><Text style={[styles.gradeGlyph, { color: accent }]}>◆</Text></View>
        <View style={styles.gradeIdentity}><Text style={[styles.gradeEyebrow, { color: accent }]}>GRADE SAISONNIER</Text><Text style={styles.gradeName}>{grade.libelle?.toUpperCase()}</Text><Text style={styles.gradeSeason}>{ranking.saison_nom?.toUpperCase() ?? 'SAISON ACTIVE'}</Text></View>
        <View style={styles.gradeRank}><Text style={styles.gradeRankValue}>{ranking.rang ? `#${ranking.rang}` : '—'}</Text><Text style={styles.gradeRankLabel}>RANG EXACT</Text></View>
      </View>
      <View style={styles.gradeProgressTop}><Text style={styles.gradeProgressLabel}>{next.toUpperCase()}</Text><Text style={[styles.gradeProgressValue, { color: accent }]}>{progress}%</Text></View>
      <View style={styles.gradeTrack}><View style={[styles.gradeTrackFill, { width: `${Math.max(2, progress)}%`, backgroundColor: accent }]} /></View>
      <View style={styles.gradeRecords}>
        <GradeRecord label="PERCENTILE" value={ranking.percentile == null ? '—' : formatDecimal(ranking.percentile)} />
        <View style={styles.gradeRecordDivider} />
        <GradeRecord label="MEILLEUR GRADE" value={ranking.meilleur_grade?.libelle?.toUpperCase() ?? grade.libelle?.toUpperCase() ?? '—'} />
        <View style={styles.gradeRecordDivider} />
        <GradeRecord label="MEILLEUR RANG" value={ranking.meilleur_rang ? `#${ranking.meilleur_rang}` : ranking.rang ? `#${ranking.rang}` : '—'} />
      </View>
    </View>
  );
}

function GradeRecord({ label, value }: { label: string; value: string }) {
  return <View style={styles.gradeRecord}><Text numberOfLines={1} style={styles.gradeRecordValue}>{value}</Text><Text numberOfLines={1} style={styles.gradeRecordLabel}>{label}</Text></View>;
}

function Stat({ compact = false, currency, label, value, detail, featured = false }: { compact?: boolean; currency?: CurrencyKind; label: string; value: string; detail: string; featured?: boolean }) {
  return (
    <View style={[styles.stat, featured && styles.statFeatured]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, compact && styles.statValueCompact, featured && styles.statValueFeatured]}>{value}</Text>
      <View style={styles.statDetailRow}>
        {currency ? <CurrencyIcon kind={currency} size={12} /> : null}
        <Text style={styles.statDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function VerdictRow({ item }: { item: RecentPrediction }) {
  const won = item.statut === 'gagne';
  const choice = item.choix === 'a' ? item.tag_a : item.tag_b;
  const delta = Math.abs(Number(item.delta_frags ?? 0));
  return (
    <Pressable accessibilityLabel={`Ouvrir le verdict ${choice}, ${item.evenement}, ${won ? 'plus' : 'moins'} ${formatNumber(delta)} Frags`} accessibilityRole="button" onPress={() => router.push({ pathname: '/result/[id]', params: { id: item.match_id } })} style={({ pressed }) => [styles.verdictRow, pressed && styles.pressed]}>
      <View style={[styles.verdictMark, won ? styles.verdictMarkWin : styles.verdictMarkLoss]}><Text style={[styles.verdictLetter, won ? styles.verdictWin : styles.verdictLoss]}>{won ? 'W' : 'L'}</Text></View>
      <View style={styles.verdictCopy}><Text style={styles.verdictTitle}>{choice} · {item.evenement}</Text><Text style={styles.verdictMeta}>{gameName(item.jeu)} · {item.tag_a} vs {item.tag_b}</Text></View>
      <View style={styles.deltaRow}>
        <CurrencyIcon color={won ? colors.success : colors.danger} kind="frags" size={13} />
        <Text style={[styles.delta, won ? styles.verdictWin : styles.verdictLoss]}>{won ? '+' : '−'}{formatNumber(delta)}</Text>
      </View>
    </Pressable>
  );
}

function rarityColor(rarity: ProfileBadge['rarity']) { if (rarity === 'mythique') return '#FF5DDF'; if (rarity === 'legendaire') return '#FFB84D'; if (rarity === 'epique') return '#A982FF'; if (rarity === 'rare') return '#63B8FF'; return '#AAB4BE'; }
function familyGlyph(family: string) { const value = family.toLowerCase(); if (value.includes('social')) return '◎'; if (value.includes('audace')) return '⚡'; if (value.includes('commun')) return '✦'; if (value.includes('régular')) return '↗'; if (value.includes('connaissance')) return '◇'; return '◆'; }
function roman(level: number) { return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][Math.max(0, Math.min(6, Number(level || 1) - 1))]; }
function gameName(game: string) { const key = String(game || '').toLowerCase(); if (key.includes('lol') || key.includes('league')) return 'LoL'; if (key.includes('valorant')) return 'VAL'; if (key.includes('cs')) return 'CS2'; return 'ESPORT'; }
function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }
function formatDecimal(value: number) { return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(Number(value || 0)); }
function withAlpha(color: string, alpha: string) { return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color; }

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: layout.tabBarContentInset, gap: 22 },
  header: { minHeight: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#171D23' }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, logoBox: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt }, logoGlyph: { color: '#06090C', fontFamily: fonts.display, fontSize: 25, lineHeight: 28, letterSpacing: -2 }, wordmarkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 }, wordmark: { color: colors.text, fontFamily: fonts.bold, fontSize: 17, letterSpacing: 3.1 }, dot: { width: 5, height: 5, marginBottom: 3, borderRadius: 3, backgroundColor: colors.volt }, back: { minHeight: 40, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#28313A' }, backText: { ...typography.action, color: colors.text, letterSpacing: 0.6 }, visibility: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#28313A' }, visibilityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt }, visibilityDotPrivate: { backgroundColor: '#FFB84D' }, visibilityText: { ...typography.label, color: colors.text, letterSpacing: 0.5 },
  error: { marginHorizontal: spacing.md, padding: 12, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027', flexDirection: 'row', gap: 10, justifyContent: 'space-between' }, errorText: { ...typography.body, flex: 1, color: '#FF9AA2' }, retry: { ...typography.action, color: colors.volt },
  settingsEntry: { minHeight: 82, marginHorizontal: spacing.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 21, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, settingsMark: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E', borderWidth: 1, borderColor: '#3A461D' }, settingsGlyph: { color: colors.volt, fontSize: 16, fontWeight: '900' }, settingsCopy: { flex: 1 }, settingsLabel: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 }, settingsTitle: { ...typography.bodyStrong, marginTop: 4, color: colors.text }, settingsArrow: { color: colors.volt, fontSize: 17, fontWeight: '900' },
  shopEntry: { minHeight: 104, marginHorizontal: spacing.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, backgroundColor: '#10160E', borderWidth: 1, borderColor: '#45521E' },
  shopMark: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt, boxShadow: '0 0 20px rgba(232,255,61,.16)' },
  shopCopy: { flex: 1, minWidth: 0 },
  shopLabel: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 },
  shopTitle: { ...typography.bodyStrong, marginTop: 4, color: colors.text },
  shopPromise: { ...typography.caption, marginTop: 2, color: colors.textMuted },
  shopBalance: { minWidth: 55, alignItems: 'flex-end' },
  shopBalanceValue: { ...typography.metricSmall, color: colors.text },
  shopBalanceLabel: { ...typography.label, marginTop: 2, color: colors.textMuted, letterSpacing: .4 },
  ledgerEntry: { minHeight: 68, marginHorizontal: spacing.md, marginTop: -10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 19, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#28313A' },
  ledgerMark: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151C0E', borderWidth: 1, borderColor: '#3A461D' },
  ledgerGlyph: { color: colors.volt, fontSize: 19, lineHeight: 21, fontWeight: '900' },
  ledgerCopy: { flex: 1, minWidth: 0 },
  ledgerLabel: { ...typography.eyebrow, color: colors.volt, letterSpacing: .65 },
  ledgerTitle: { ...typography.caption, marginTop: 3, color: colors.textSubtle },
  ledgerArrow: { color: colors.volt, fontSize: 17, fontWeight: '900' },
  hero: { position: 'relative', overflow: 'hidden', marginHorizontal: spacing.md, minHeight: 390, padding: 20, borderRadius: 31, backgroundColor: '#0A0F14', borderWidth: 1, gap: 18 }, heroGlow: { position: 'absolute', right: -120, top: -80, width: 310, height: 310, borderRadius: 155, opacity: 0.15 }, watermark: { position: 'absolute', right: -14, top: 80, fontFamily: fonts.display, fontSize: 86, lineHeight: 90, opacity: 0.09, letterSpacing: -5 }, heroEyebrowRow: { zIndex: 2, minHeight: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, heroEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.2 }, cosmeticTag: { ...typography.label, flexShrink: 1, letterSpacing: .45, textAlign: 'right' },
  identityRow: { zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 15 }, identityCopy: { flex: 1, minWidth: 0 }, levelLine: { ...typography.label, color: colors.textMuted, letterSpacing: 0.6 }, pseudo: { marginTop: 4, color: colors.text, fontFamily: fonts.bold, fontSize: 34, lineHeight: 38, letterSpacing: -1.5 }, profileTitle: { ...typography.bodyStrong, marginTop: 4 },
  badgeStrip: { zIndex: 2, minHeight: 70, flexDirection: 'row', gap: 10, alignItems: 'center' }, badgeToken: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D1319', borderWidth: 1.2 }, badgeGlyph: { fontSize: 19, fontWeight: '900' }, emptyBadge: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C1116', borderWidth: 1, borderColor: '#25303A', borderStyle: 'dashed' }, emptyBadgeText: { color: '#66727D', fontSize: 16, lineHeight: 17, fontWeight: '700' }, emptyBadgeLabel: { ...typography.caption, marginTop: 2, color: '#596570', letterSpacing: .25 },
  xpBlock: { zIndex: 2, marginTop: 'auto', padding: 14, borderRadius: 18, backgroundColor: '#080D11', borderWidth: 1, borderColor: '#202A32', gap: 8 }, xpTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, xpLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 0.5 }, xpValue: { ...typography.bodyStrong, color: colors.text }, track: { height: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: '#182028' }, trackFill: { height: '100%', borderRadius: 999, backgroundColor: colors.volt }, xpHint: { ...typography.caption, color: colors.textMuted },
  rankingState: { minHeight: 160, marginHorizontal: spacing.md, padding: 14, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#414D1E' }, rankingStateStep: { width: 82, height: 92, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E0A', borderWidth: 1, borderColor: '#4A5822' }, rankingStateStepValue: { ...typography.metric, color: colors.volt }, rankingStateStepLabel: { ...typography.label, marginTop: 4, color: colors.textMuted, letterSpacing: .25, textAlign: 'center' }, rankingStateCopy: { flex: 1, minWidth: 0 }, rankingStateEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 }, rankingStateTitle: { ...typography.cardTitle, marginTop: 5, color: colors.text }, rankingStateText: { ...typography.body, marginTop: 5, color: colors.textMuted }, rankingStateAction: { ...typography.action, marginTop: 8, color: colors.volt, letterSpacing: .3 },
  gradeCard: { marginHorizontal: spacing.md, padding: 15, borderRadius: 25, gap: 13, backgroundColor: '#0B1015', borderWidth: 1 },
  gradeTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  gradeMark: { width: 49, height: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  gradeGlyph: { fontSize: 18 },
  gradeIdentity: { flex: 1, minWidth: 0 },
  gradeEyebrow: { ...typography.eyebrow, letterSpacing: .7 },
  gradeName: { ...typography.cardTitle, marginTop: 3, color: colors.text },
  gradeSeason: { ...typography.caption, marginTop: 2, color: colors.textMuted },
  gradeRank: { alignItems: 'flex-end' },
  gradeRankValue: { ...typography.metricSmall, color: colors.text },
  gradeRankLabel: { ...typography.label, marginTop: 2, color: colors.textMuted, fontSize: 9 },
  gradeProgressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  gradeProgressLabel: { ...typography.label, flex: 1, color: colors.textMuted, letterSpacing: .25 },
  gradeProgressValue: { ...typography.bodyStrong },
  gradeTrack: { height: 7, overflow: 'hidden', borderRadius: 4, backgroundColor: '#202A32' },
  gradeTrackFill: { height: '100%', borderRadius: 4 },
  gradeRecords: { minHeight: 58, padding: 9, borderRadius: 16, flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#080C10', borderWidth: 1, borderColor: '#202932' },
  gradeRecord: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  gradeRecordValue: { ...typography.bodyStrong, color: colors.text },
  gradeRecordLabel: { ...typography.label, marginTop: 3, color: colors.textMuted, fontSize: 8, textAlign: 'center' },
  gradeRecordDivider: { width: 1, marginVertical: 5, backgroundColor: '#27313A' },
  statsGrid: { marginHorizontal: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, stat: { flexBasis: '48.5%', minHeight: 122, padding: 14, borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, statFeatured: { backgroundColor: '#11170E', borderColor: '#414D1E' }, statLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .7 }, statValue: { ...typography.metric, marginTop: 10, color: colors.text }, statValueCompact: { fontSize: 20, lineHeight: 22, letterSpacing: -.3 }, statValueFeatured: { color: colors.frag }, statDetailRow: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }, statDetail: { ...typography.caption, color: colors.textMuted },
  sectionHeading: { marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }, sectionEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1 }, sectionTitle: { ...typography.sectionTitle, marginTop: 4, maxWidth: 290, color: colors.text }, sectionCount: { ...typography.label, maxWidth: 105, color: colors.textMuted, textAlign: 'right' },
  factionCard: { position: 'relative', overflow: 'hidden', minHeight: 126, marginHorizontal: spacing.md, padding: 15, borderRadius: 25, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, factionGlow: { position: 'absolute', left: -60, width: 180, height: 180, borderRadius: 90, opacity: 0.12 }, teamMark: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#090E12', borderWidth: 1 }, teamMarkText: { ...typography.bodyStrong }, factionCopy: { flex: 1 }, factionEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: 0.6 }, factionName: { ...typography.cardTitle, marginTop: 4, color: colors.text }, factionMeta: { ...typography.caption, marginTop: 4, color: colors.textMuted }, arrow: { color: colors.volt, fontSize: 18, fontWeight: '900' },
  arsenalRail: { gap: 10, paddingHorizontal: spacing.md }, arsenalCard: { width: 148, minHeight: 184, padding: 14, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, arsenalMedal: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2, backgroundColor: '#0D1319' }, arsenalGlyph: { fontSize: 21, fontWeight: '900' }, arsenalName: { ...typography.bodyStrong, marginTop: 17, color: colors.text }, arsenalRarity: { ...typography.eyebrow, marginTop: 'auto', letterSpacing: 0.5 }, arsenalEmpty: { width: 270, minHeight: 166, justifyContent: 'center', padding: 18, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, arsenalEmptyTitle: { ...typography.cardTitle, color: colors.text }, arsenalEmptyText: { ...typography.body, marginTop: 7, color: colors.textMuted },
  verdicts: { marginHorizontal: spacing.md, overflow: 'hidden', borderRadius: 23, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, verdictRow: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#192129' }, verdictMark: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 }, verdictMarkWin: { backgroundColor: '#0E1C14', borderColor: '#23583A' }, verdictMarkLoss: { backgroundColor: '#1A1012', borderColor: '#5A2730' }, verdictLetter: { ...typography.bodyStrong }, verdictWin: { color: colors.success }, verdictLoss: { color: colors.danger }, verdictCopy: { flex: 1, minWidth: 0 }, verdictTitle: { ...typography.bodyStrong, color: colors.text }, verdictMeta: { ...typography.caption, marginTop: 3, color: colors.textMuted }, deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, delta: { ...typography.bodyStrong },
  emptyCard: { marginHorizontal: spacing.md, minHeight: 176, justifyContent: 'center', padding: 20, borderRadius: 25, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 8 }, emptyEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 }, emptyTitle: { ...typography.cardTitle, maxWidth: 320, color: colors.text }, emptyText: { ...typography.body, color: colors.textMuted }, inlineAction: { ...typography.action, marginTop: 5, color: colors.volt },
  accountCard: { marginHorizontal: spacing.md, minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, accountCopy: { flex: 1, minWidth: 0 }, accountLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .7 }, accountEmail: { ...typography.bodyStrong, marginTop: 5, color: colors.text }, logout: { minHeight: 44, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171015', borderWidth: 1, borderColor: '#43252F' }, logoutText: { ...typography.action, color: '#FF8B96' }, accountError: { ...typography.body, marginHorizontal: spacing.md, marginTop: -14, color: '#FF9AA2' }, disabled: { opacity: 0.48 }, pressed: { opacity: 0.74 },
});
