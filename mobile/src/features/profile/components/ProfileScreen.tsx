import { router } from 'expo-router';
import Settings2 from 'lucide-react-native/icons/settings-2';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { CurrencyIcon, type CurrencyKind } from '@/src/components/ui/CurrencyIcon';
import { FeatureStateView } from '@/src/components/ui/FeatureStateView';
import { StateView } from '@/src/components/ui/StateView';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { openMatchResult } from '@/src/features/matches/matchCenterNavigation';
import { gradeAccent, isZeroRank, ZERO_RANK_ACCENT } from '@/src/features/ranking/grades';
import AchievementBadgeArtwork from '@/src/features/profile/achievementBadges/components/AchievementBadgeArtwork';
import { resolveOwnedLevelFrames } from '@/src/features/profile/levelFrames/catalog';
import { useLevelFrameEquipment } from '@/src/features/profile/levelFrames/useLevelFrameEquipment';
import { loadProfileSafetyState } from '@/src/features/safety/api';
import { ProfileSafetyActions } from '@/src/features/safety';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { useEconomy } from '@/src/providers/EconomyProvider';
import { colors, layout, radius, spacing, typography } from '@/src/theme';
import { teamHue } from '@/src/utils/teams';

import { loadProfileData } from '../api';
import type { ProfileBadge, ProfileData, ProfileRanking, RecentPrediction } from '../types';
import OwnProfileOverview from './OwnProfileOverview';
import ProfileShowcaseCard from './ProfileShowcaseCard';
import ProfileShareCard from './ProfileShareCard';

type ProfileScreenProps = {
  previewData?: ProfileData;
  profilePseudo?: string;
  publicView?: boolean;
};

export default function ProfileScreen({ previewData, profilePseudo, publicView = false }: ProfileScreenProps) {
  const { profile, session } = useAuth();
  const { equipped } = useCosmetics();
  const { refresh: refreshEconomy } = useEconomy();
  const [data, setData] = useState<ProfileData | null>(previewData ?? null);
  const [loading, setLoading] = useState(!previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicBlocked, setPublicBlocked] = useState(false);

  const ownPseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'joueur';
  const pseudo = profilePseudo?.trim() || ownPseudo;
  const handlePublicBlocked = useCallback(() => setPublicBlocked(true), []);
  const ownedLevelFrames = useMemo(
    () => resolveOwnedLevelFrames({ founder: data?.founder, preview: Boolean(previewData) }),
    [data?.founder, previewData],
  );
  const levelFrameEquipment = useLevelFrameEquipment(
    previewData ? `preview-${pseudo}` : pseudo,
    ownedLevelFrames,
  );

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
      if (publicView) {
        setPublicBlocked(false);
        const safety = await loadProfileSafetyState(pseudo);
        if (safety?.iBlock || safety?.blocksMe) {
          setData(null);
          setPublicBlocked(true);
          return;
        }
      }
      const [nextProfile] = await Promise.all([
        loadProfileData(pseudo),
        refresh ? refreshEconomy() : Promise.resolve(),
      ]);
      setData(nextProfile);
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Impossible de charger le profil.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [previewData, pseudo, publicView, refreshEconomy]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!publicView || !profilePseudo?.trim()) return;
    const day = new Date().toISOString().slice(0, 10);
    void trackAnalyticsEvent({
      type: 'profil_public_consulte',
      idempotencyKey: `public-profile:view:${day}`,
    }).catch(() => undefined);
  }, [profilePseudo, publicView]);

  const accuracy = useMemo(() => {
    const total = data?.ranking.pronostics_regles ?? 0;
    const wins = data?.ranking.pronostics_gagnes ?? 0;
    return total ? Math.round((wins / total) * 100) : 0;
  }, [data]);

  const hue = data?.favoriteTeam ? teamHue(data.favoriteTeam.tag, data.favoriteTeam.nom) : 76;
  const teamColor = `hsl(${hue}, 68%, 55%)`;
  const hasLiveCosmetics = Boolean(equipped.frame || equipped.title || equipped.core || equipped.factionEffect || equipped.profileCard);
  const cosmetics = !previewData && !publicView && hasLiveCosmetics ? equipped : data?.cosmetics;
  const obtained = data?.badges.filter((badge) => badge.obtained) ?? [];
  const settledCalls = data?.ranking.pronostics_regles ?? 0;
  const starting = Boolean(!loading && data && isZeroRank(data.ranking.frags));
  const rankLabel = loading
    ? 'SYNCHRO'
    : data?.ranking.grade.libelle?.toUpperCase() ?? 'BRONZE';
  const rankColor = starting ? ZERO_RANK_ACCENT : gradeAccent(data?.ranking.grade);
  const profileTitle = cosmetics?.title?.name || data?.profileTitle || data?.level.prestigeLabel || 'Starter';

  if (publicView && publicBlocked) {
    return (
      <Screen>
        <View style={styles.blockedState}>
          <Text style={styles.blockedStateEyebrow}>SÉCURITÉ ACTIVE</Text>
          <Text style={styles.blockedStateTitle}>PROFIL MASQUÉ.</Text>
          <Text style={styles.blockedStateCopy}>Ce compte et le tien ne peuvent plus interagir.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.blockedStateButton}><Text style={styles.blockedStateButtonText}>RETOUR AU SOCIAL</Text></Pressable>
        </View>
      </Screen>
    );
  }

  if (!publicView) {
    return (
      <Screen>
        <ScrollView
          contentContainerStyle={[styles.content, styles.privateContent]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
        >
          <ProfileHeader
            onOpenSettings={() => router.push('/settings/profile')}
            publicProfile={data?.publicProfile !== false}
            publicView={false}
          />

          {error ? (
            <FeatureStateView
              compact
              domain="profile"
              onRetry={() => void load()}
              presentation={data ? 'inline' : 'panel'}
              style={styles.stateInset}
              testID="profile-error-state"
              variant="error"
            />
          ) : null}

          {error && !data ? null : <OwnProfileOverview
            cosmetics={cosmetics}
            data={data}
            loading={loading}
            levelFrameVariant={levelFrameEquipment.variant}
            onModify={() => router.push('/settings/profile')}
            onOpenActivations={() => router.push((previewData ? '/campaign-preview' : '/campaign/nova-week') as never)}
            onOpenBadges={() => router.push({
              pathname: previewData ? '/shop-preview' : '/shop',
              params: { scope: 'owned', tab: 'badges' },
            } as never)}
            onOpenFaction={() => router.push('/(tabs)/social/faction')}
            onOpenJerseys={() => router.push({
              pathname: previewData ? '/showcase-preview' : '/showcase',
              params: { section: 'collection' },
            } as never)}
            onOpenRank={() => router.push('/(tabs)/rank')}
            onOpenShowcase={() => router.push((previewData ? '/showcase-preview' : '/showcase') as never)}
            onOpenTrophies={() => router.push({
              pathname: previewData ? '/shop-preview' : '/shop',
              params: { scope: 'owned', tab: 'rings' },
            } as never)}
            onOpenVisitor={() => router.push({ pathname: '/u/[pseudo]', params: { pseudo: data?.pseudo || pseudo } })}
            pseudo={data?.pseudo || pseudo}
            rankAccent={rankColor}
            rankLabel={rankLabel}
          />}
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
      >
        <ProfileHeader publicProfile={data?.publicProfile !== false} publicView={publicView} />

        {error ? (
          <FeatureStateView
            compact
            domain="profile"
            onRetry={() => void load()}
            presentation={data ? 'inline' : 'panel'}
            style={styles.stateInset}
            testID="public-profile-error-state"
            variant="error"
          />
        ) : null}

        {publicView ? <ProfileSafetyActions onBlocked={handlePublicBlocked} pseudo={pseudo} /> : null}

        <ProfileShowcaseCard
          cosmetics={cosmetics}
          level={data?.level.level ?? 0}
          loading={loading}
          levelFrameVariant={levelFrameEquipment.variant}
          onOpenLoadout={publicView ? undefined : () => router.push((previewData ? '/shop-preview' : '/shop') as never)}
          onOpenShowcase={publicView ? undefined : () => router.push((previewData ? '/showcase-preview' : '/showcase') as never)}
          profileTitle={profileTitle}
          pseudo={data?.pseudo || pseudo}
          rankAccent={rankColor}
          rankLabel={rankLabel}
          relicLevel={data?.favoriteTeam?.relique_niveau ?? 1}
          teamTag={data?.favoriteTeam?.tag || 'GRIFF'}
        />

        {!publicView ? (
          <View style={styles.profileTools}>
            <Pressable accessibilityLabel="Modifier les paramètres du profil" accessibilityRole="button" onPress={() => router.push('/settings/profile')} style={({ pressed }) => [styles.settingsEntry, styles.toolEntry, pressed && styles.pressed]}>
              <View style={styles.settingsMark}><Text style={styles.settingsGlyph}>⚙</Text></View>
              <View style={styles.settingsCopy}><Text style={styles.settingsLabel}>PARAMÈTRES</Text><Text style={styles.settingsTitle}>Jeux, faction et visibilité</Text></View>
              <Text style={styles.settingsArrow}>→</Text>
            </Pressable>
            <Pressable accessibilityLabel="Ouvrir le journal des Volts" accessibilityRole="button" onPress={() => router.push('/economy' as never)} style={({ pressed }) => [styles.ledgerEntry, styles.toolEntry, pressed && styles.pressed]}>
              <View style={styles.ledgerMark}><Text style={styles.ledgerGlyph}>≋</Text></View>
              <View style={styles.ledgerCopy}><Text style={styles.ledgerLabel}>JOURNAL DES VOLTS</Text><Text style={styles.ledgerTitle}>Chaque gain et dépense, ligne par ligne</Text></View>
              <Text style={styles.ledgerArrow}>→</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.xpBlock}>
          <View style={styles.xpTop}><Text style={styles.xpLabel}>NIVEAU {data?.level.level ?? '—'} · {data?.level.title?.toUpperCase() ?? 'PROGRESSION PERMANENTE'}</Text><Text style={styles.xpValue}>{loading ? '—' : `${formatNumber(data?.level.xp ?? 0)} XP`}</Text></View>
          <View style={styles.track}><View style={[styles.trackFill, { width: `${Math.max(2, Math.round((data?.level.progress ?? 0) * 100))}%` }]} /></View>
          <Text style={styles.xpHint}>{loading ? 'Synchronisation…' : `${formatNumber(data?.level.remaining ?? 0)} XP avant le niveau suivant`}</Text>
        </View>

        {!loading && data?.ranking.grade.classe ? <GradeProgressCard ranking={data.ranking} /> : null}

        <View style={styles.statsGrid}>
          <Stat currency="frags" label="RATING" value={loading ? '—' : formatNumber(data?.ranking.frags ?? 0)} detail={starting ? 'DÉPART DE SAISON' : 'FRAGS'} featured />
          <Stat label="RANG" value={loading ? '—' : data?.ranking.rang ? `#${data.ranking.rang}` : '—'} detail={data?.ranking.percentile == null ? 'SAISON' : `PERCENTILE ${formatDecimal(data.ranking.percentile)}`} />
          <Stat label="RÉUSSITE" value={loading || settledCalls === 0 ? '—' : `${accuracy}%`} detail={settledCalls === 0 ? 'AUCUN VERDICT' : `${data?.ranking.pronostics_gagnes ?? 0}/${settledCalls}`} />
          <Stat label="SÉRIE" value={loading || settledCalls === 0 ? '—' : `${data?.currentStreak ?? 0}`} detail={settledCalls === 0 ? 'NON COMMENCÉE' : 'VICTOIRES'} />
        </View>

        {!loading && data ? (
          <ProfileShareCard
            accuracy={accuracy}
            cosmetic={cosmetics?.profileCard}
            frags={data.ranking.frags}
            grade={data.ranking.grade.libelle || 'Bronze'}
            profileTitle={profileTitle}
            pseudo={data.pseudo || pseudo}
            publicProfile={data.publicProfile}
            rank={data.ranking.rang}
            teamTag={data.favoriteTeam?.tag || 'GRIFF'}
          />
        ) : null}

        <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>FACTION</Text><Text style={styles.sectionTitle}>TA COULEUR DANS GRIFF.</Text></View></View>
        {data?.favoriteTeam ? (
          <Pressable onPress={() => router.push('/(tabs)/social/faction')} style={({ pressed }) => [styles.factionCard, pressed && styles.pressed]}>
            <View style={[styles.teamMark, { borderColor: teamColor }]}><Text style={[styles.teamMarkText, { color: teamColor }]}>{data.favoriteTeam.tag}</Text></View>
            <View style={styles.factionCopy}><Text style={styles.factionEyebrow}>RELIQUE · FORME {roman(data.favoriteTeam.relique_niveau)}</Text><Text style={styles.factionName}>{data.favoriteTeam.nom}</Text><Text style={styles.factionMeta}>{data.favoriteTeam.relique} · {formatNumber(data.favoriteTeam.supporters)} supporter{data.favoriteTeam.supporters > 1 ? 's' : ''}</Text></View>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        ) : !loading ? (
          <StateView
            compact
            description="Aucune équipe favorite n’est affichée sur ce profil."
            style={styles.stateInset}
            testID="profile-faction-empty"
            title="Aucune faction affichée"
            variant="empty"
          />
        ) : null}

        <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>ARSENAL</Text><Text style={styles.sectionTitle}>CE QUE TU AS DÉCROCHÉ.</Text></View><Text style={styles.sectionCount}>{obtained.length}/{data?.badges.length ?? 0}</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.arsenalRail}>
          {(data?.arsenalBadges.length ? data.arsenalBadges : obtained.slice(0, 6)).map((badge) => <ArsenalCard key={badge.key} badge={badge} />)}
          {!loading && !obtained.length ? <View style={styles.arsenalEmpty}><Text style={styles.arsenalEmptyTitle}>ARSENAL VIDE.</Text><Text style={styles.arsenalEmptyText}>Tes premiers badges apparaîtront ici automatiquement.</Text></View> : null}
        </ScrollView>

        <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>VERDICTS</Text><Text style={styles.sectionTitle}>TA FORME RÉCENTE.</Text></View>{data?.bestGame ? <Text style={styles.sectionCount}>{gameName(data.bestGame.jeu)} · {Math.round(data.bestGame.precision_pct)}%</Text> : null}</View>
        {data?.recent.length ? (
          <View style={styles.verdicts}>
            {data.recent.slice(0, 5).map((item) => <VerdictRow key={item.id} item={item} />)}
          </View>
        ) : !loading ? (
          <StateView
            action={{ label: 'VOIR LES MATCHS', onPress: () => router.push('/(tabs)/matches') }}
            compact
            description="Les verdicts réglés apparaîtront ici."
            style={styles.stateInset}
            testID="profile-verdicts-empty"
            title="Aucun verdict récent"
            variant="empty"
          />
        ) : null}

      </ScrollView>
    </Screen>
  );
}

function ProfileHeader({
  onOpenSettings,
  publicProfile,
  publicView,
}: {
  onOpenSettings?: () => void;
  publicProfile: boolean;
  publicView: boolean;
}) {
  if (!publicView) {
    return (
      <View style={styles.privateHeader}>
        <Pressable
          accessibilityLabel="Revenir à l’onglet précédent"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.privateHeaderBack, pressed && styles.pressed]}
        >
          <Text style={styles.privateHeaderBackText}>← RETOUR</Text>
        </Pressable>
        <View style={styles.privateHeaderCopy}>
          <Text style={styles.privateHeaderEyebrow}>{publicProfile ? 'PROFIL PUBLIC' : 'PROFIL PRIVÉ'}</Text>
          <Text style={styles.privateHeaderTitle}>MON PROFIL</Text>
        </View>
        {onOpenSettings ? (
          <Pressable
            accessibilityLabel="Ouvrir les paramètres"
            accessibilityRole="button"
            onPress={onOpenSettings}
            style={({ pressed }) => [styles.privateHeaderSettings, pressed && styles.pressed]}
          >
            <Settings2 color={colors.textSecondary} size={20} strokeWidth={1.9} />
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Revenir au Social" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>← SOCIAL</Text></Pressable>
      <View style={styles.headerActions}>
        <View style={styles.visibility}><View style={[styles.visibilityDot, !publicProfile && styles.visibilityDotPrivate]} /><Text style={styles.visibilityText}>{publicProfile ? 'PUBLIC' : 'PRIVÉ'}</Text></View>
        {onOpenSettings ? (
          <Pressable
            accessibilityLabel="Ouvrir les paramètres"
            accessibilityRole="button"
            onPress={onOpenSettings}
            style={({ pressed }) => [styles.headerSettings, pressed && styles.pressed]}
          >
            <Text style={styles.headerSettingsGlyph}>⚙</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ArsenalCard({ badge }: { badge: ProfileBadge }) {
  const tone = rarityColor(badge.rarity);
  return <View style={styles.arsenalCard}><View style={styles.arsenalArtwork}><AchievementBadgeArtwork badge={badge} showStand={false} size={58} /></View><Text numberOfLines={2} style={styles.arsenalName}>{badge.name}</Text><Text style={[styles.arsenalRarity, { color: tone }]}>{badgeRarityLabel(badge.rarity)}</Text></View>;
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
    <Pressable accessibilityLabel={`Ouvrir le verdict ${choice}, ${item.evenement}, ${won ? 'plus' : 'moins'} ${formatNumber(delta)} Frags`} accessibilityRole="button" onPress={() => openMatchResult({
      id: item.match_id,
      equipe_a: item.equipe_a,
      equipe_b: item.equipe_b,
      evenement: item.evenement,
      jeu: item.jeu,
      score_a: item.score_a,
      score_b: item.score_b,
      tag_a: item.tag_a,
      tag_b: item.tag_b,
    }, { source: 'profile' })} style={({ pressed }) => [styles.verdictRow, pressed && styles.pressed]}>
      <View style={[styles.verdictMark, won ? styles.verdictMarkWin : styles.verdictMarkLoss]}><Text style={[styles.verdictLetter, won ? styles.verdictWin : styles.verdictLoss]}>{won ? 'W' : 'L'}</Text></View>
      <View style={styles.verdictCopy}><Text style={styles.verdictTitle}>{choice} · {item.evenement}</Text><Text style={styles.verdictMeta}>{gameName(item.jeu)} · {item.tag_a} vs {item.tag_b}</Text></View>
      <View style={styles.deltaRow}>
        <CurrencyIcon color={won ? colors.success : colors.danger} kind="frags" size={13} />
        <Text style={[styles.delta, won ? styles.verdictWin : styles.verdictLoss]}>{won ? '+' : '−'}{formatNumber(delta)}</Text>
      </View>
    </Pressable>
  );
}

function rarityColor(rarity: ProfileBadge['rarity']) { if (rarity === 'legendary') return '#FFB84D'; if (rarity === 'secret') return '#D1D7DC'; if (rarity === 'epic') return '#A982FF'; if (rarity === 'rare') return '#63B8FF'; return '#AAB4BE'; }
function badgeRarityLabel(rarity: ProfileBadge['rarity']) { if (rarity === 'legendary') return 'LÉGENDAIRE'; if (rarity === 'secret') return 'SECRET'; if (rarity === 'epic') return 'ÉPIQUE'; if (rarity === 'rare') return 'RARE'; return 'COMMUN'; }
function roman(level: number) { return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][Math.max(0, Math.min(6, Number(level || 1) - 1))]; }
function gameName(game: string) { const key = String(game || '').toLowerCase(); if (key.includes('lol') || key.includes('league')) return 'LoL'; if (key.includes('valorant')) return 'VAL'; if (key.includes('cs')) return 'CS2'; return 'ESPORT'; }
function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }
function formatDecimal(value: number) { return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(Number(value || 0)); }
const styles = StyleSheet.create({
  blockedState: { flex: 1, minHeight: 560, margin: spacing.lg, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#303A43' },
  blockedStateEyebrow: { ...typography.eyebrow, color: colors.volt },
  blockedStateTitle: { ...typography.displayMedium, color: colors.text, textAlign: 'center' },
  blockedStateCopy: { ...typography.body, maxWidth: 320, color: colors.textMuted, textAlign: 'center' },
  blockedStateButton: { minHeight: 48, marginTop: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.volt },
  blockedStateButtonText: { ...typography.action, color: '#080A0C' },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: layout.tabBarContentInset, gap: 22 },
  privateContent: { gap: 12 },
  privateHeader: { minHeight: 72, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  privateHeaderBack: { minHeight: 44, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.borderStrong },
  privateHeaderBackText: { ...typography.action, color: colors.text, letterSpacing: 0.45 },
  privateHeaderCopy: { flex: 1, minWidth: 0 },
  privateHeaderEyebrow: { ...typography.metadata, color: colors.volt, letterSpacing: 0.65 },
  privateHeaderTitle: { ...typography.sectionTitle, marginTop: 2, color: colors.text },
  privateHeaderSettings: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.borderStrong },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#171D23' }, back: { minHeight: 40, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#28313A' }, backText: { ...typography.action, color: colors.text, letterSpacing: 0.6 }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 }, visibility: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#28313A' }, visibilityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt }, visibilityDotPrivate: { backgroundColor: '#FFB84D' }, visibilityText: { ...typography.label, color: colors.text, letterSpacing: 0.5 }, headerSettings: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#28313A' }, headerSettingsGlyph: { color: colors.text, fontSize: 17, lineHeight: 20, fontWeight: '900' },
  stateInset: { marginHorizontal: spacing.md },
  profileTools: { marginHorizontal: spacing.md, gap: 9 },
  toolEntry: { marginHorizontal: 0, marginTop: 0 },
  settingsEntry: { minHeight: 82, marginHorizontal: spacing.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 21, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, settingsMark: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E', borderWidth: 1, borderColor: '#3A461D' }, settingsGlyph: { color: colors.volt, fontSize: 16, fontWeight: '900' }, settingsCopy: { flex: 1 }, settingsLabel: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 }, settingsTitle: { ...typography.bodyStrong, marginTop: 4, color: colors.text }, settingsArrow: { color: colors.volt, fontSize: 17, fontWeight: '900' },
  ledgerEntry: { minHeight: 68, marginHorizontal: spacing.md, marginTop: -10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 19, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#28313A' },
  ledgerMark: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151C0E', borderWidth: 1, borderColor: '#3A461D' },
  ledgerGlyph: { color: colors.volt, fontSize: 19, lineHeight: 21, fontWeight: '900' },
  ledgerCopy: { flex: 1, minWidth: 0 },
  ledgerLabel: { ...typography.eyebrow, color: colors.volt, letterSpacing: .65 },
  ledgerTitle: { ...typography.caption, marginTop: 3, color: colors.textSubtle },
  ledgerArrow: { color: colors.volt, fontSize: 17, fontWeight: '900' },
  xpBlock: { marginHorizontal: spacing.md, padding: 14, borderRadius: 18, backgroundColor: '#080D11', borderWidth: 1, borderColor: '#202A32', gap: 8 }, xpTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 }, xpLabel: { ...typography.label, flex: 1, color: colors.textMuted, letterSpacing: 0.5 }, xpValue: { ...typography.bodyStrong, color: colors.text }, track: { height: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: '#182028' }, trackFill: { height: '100%', borderRadius: 999, backgroundColor: colors.volt }, xpHint: { ...typography.caption, color: colors.textMuted },
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
  gradeRankLabel: { ...typography.label, marginTop: 2, color: colors.textMuted },
  gradeProgressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  gradeProgressLabel: { ...typography.label, flex: 1, color: colors.textMuted, letterSpacing: .25 },
  gradeProgressValue: { ...typography.bodyStrong },
  gradeTrack: { height: 7, overflow: 'hidden', borderRadius: 4, backgroundColor: '#202A32' },
  gradeTrackFill: { height: '100%', borderRadius: 4 },
  gradeRecords: { minHeight: 58, paddingTop: 9, flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  gradeRecord: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  gradeRecordValue: { ...typography.bodyStrong, color: colors.text },
  gradeRecordLabel: { ...typography.label, marginTop: 3, color: colors.textMuted, textAlign: 'center' },
  gradeRecordDivider: { width: 1, marginVertical: 5, backgroundColor: '#27313A' },
  statsGrid: { marginHorizontal: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, stat: { flexBasis: '48.5%', minHeight: 122, padding: 14, borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, statFeatured: { backgroundColor: '#11170E', borderColor: '#414D1E' }, statLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .7 }, statValue: { ...typography.metric, marginTop: 10, color: colors.text }, statValueCompact: { fontSize: 20, lineHeight: 22, letterSpacing: -.3 }, statValueFeatured: { color: colors.frag }, statDetailRow: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }, statDetail: { ...typography.caption, color: colors.textMuted },
  sectionHeading: { marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }, sectionEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1 }, sectionTitle: { ...typography.sectionTitle, marginTop: 4, maxWidth: 290, color: colors.text }, sectionCount: { ...typography.label, maxWidth: 105, color: colors.textMuted, textAlign: 'right' },
  factionCard: { position: 'relative', overflow: 'hidden', minHeight: 126, marginHorizontal: spacing.md, padding: 15, borderRadius: 25, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, teamMark: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#090E12', borderWidth: 1 }, teamMarkText: { ...typography.bodyStrong }, factionCopy: { flex: 1 }, factionEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: 0.6 }, factionName: { ...typography.cardTitle, marginTop: 4, color: colors.text }, factionMeta: { ...typography.caption, marginTop: 4, color: colors.textMuted }, arrow: { color: colors.volt, fontSize: 18, fontWeight: '900' },
  arsenalRail: { gap: 10, paddingHorizontal: spacing.md }, arsenalCard: { width: 148, minHeight: 184, padding: 14, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, arsenalArtwork: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 20, backgroundColor: '#080D11' }, arsenalName: { ...typography.bodyStrong, marginTop: 11, color: colors.text }, arsenalRarity: { ...typography.eyebrow, marginTop: 'auto', letterSpacing: 0.5 }, arsenalEmpty: { width: 270, minHeight: 166, justifyContent: 'center', padding: 18, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, arsenalEmptyTitle: { ...typography.cardTitle, color: colors.text }, arsenalEmptyText: { ...typography.body, marginTop: 7, color: colors.textMuted },
  verdicts: { marginHorizontal: spacing.md, overflow: 'hidden', borderRadius: 23, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, verdictRow: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#192129' }, verdictMark: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 }, verdictMarkWin: { backgroundColor: '#0E1C14', borderColor: '#23583A' }, verdictMarkLoss: { backgroundColor: '#1A1012', borderColor: '#5A2730' }, verdictLetter: { ...typography.bodyStrong }, verdictWin: { color: colors.success }, verdictLoss: { color: colors.danger }, verdictCopy: { flex: 1, minWidth: 0 }, verdictTitle: { ...typography.bodyStrong, color: colors.text }, verdictMeta: { ...typography.caption, marginTop: 3, color: colors.textMuted }, deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, delta: { ...typography.bodyStrong },
  disabled: { opacity: 0.48 }, pressed: { opacity: 0.74 },
});
