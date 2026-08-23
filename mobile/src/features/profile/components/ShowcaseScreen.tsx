import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { gradeAccent } from '@/src/features/ranking/grades';
import { loadCosmeticShop } from '@/src/features/shop/api';
import { CosmeticAvatar, CosmeticItemPreview } from '@/src/features/shop/components/CosmeticRenderer';
import type { CosmeticItem, CosmeticShopData, EquippedCosmetics } from '@/src/features/shop/types';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, fonts, layout, spacing, typography } from '@/src/theme';

import { loadProfileData } from '../api';
import type { ProfileBadge, ProfileData } from '../types';
import { ProfileRelicThumbnail } from './ProfileShowcaseCard';

type ShowcaseScreenProps = {
  previewProfile?: ProfileData;
  previewShop?: CosmeticShopData;
};

export default function ShowcaseScreen({ previewProfile, previewShop }: ShowcaseScreenProps) {
  const { profile, session } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(previewProfile ?? null);
  const [shopData, setShopData] = useState<CosmeticShopData | null>(previewShop ?? null);
  const [loading, setLoading] = useState(!previewProfile || !previewShop);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const trackedRef = useRef(false);
  const pseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'Supporter';

  const load = useCallback(async (refresh = false) => {
    if (previewProfile && previewShop) {
      setProfileData(previewProfile);
      setShopData(previewShop);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const requestId = ++requestRef.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [nextProfile, nextShop] = await Promise.all([
        loadProfileData(pseudo),
        loadCosmeticShop(),
      ]);
      if (requestId !== requestRef.current) return;
      setProfileData(nextProfile);
      setShopData(nextShop);
    } catch (caught) {
      if (requestId === requestRef.current) {
        setError(caught instanceof Error ? caught.message : 'Impossible d’ouvrir ta Vitrine.');
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [previewProfile, previewShop, pseudo]);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  useEffect(() => {
    if (previewProfile || loading || !profileData || trackedRef.current) return;
    trackedRef.current = true;
    const day = new Date().toISOString().slice(0, 10);
    void trackAnalyticsEvent({
      type: 'collection_affichee',
      idempotencyKey: `showcase:${day}`,
    }).catch(() => { trackedRef.current = false; });
  }, [loading, previewProfile, profileData]);

  const ownedItems = useMemo(
    () => shopData?.items.filter((item) => item.owned) ?? [],
    [shopData?.items],
  );
  const trophies = useMemo(
    () => profileData?.badges.filter((badge) => badge.obtained) ?? [],
    [profileData?.badges],
  );
  const relics = useMemo(
    () => ownedItems.filter((item) => item.slot === 'effet_faction'),
    [ownedItems],
  );
  const teamItems = useMemo(
    () => ownedItems.filter((item) => Boolean(item.team)),
    [ownedItems],
  );
  const seasonItems = useMemo(
    () => ownedItems.filter((item) => Boolean(item.seasonId)),
    [ownedItems],
  );
  const partnerItems = useMemo(
    () => ownedItems.filter((item) => item.source === 'partenaire' || Boolean(item.brandKey || item.campaignKey)),
    [ownedItems],
  );

  const cosmetics = resolveEquipped(shopData, profileData?.cosmetics);
  const grade = profileData?.ranking.grade;
  const rankLabel = loading
    ? 'SYNCHRO'
    : !profileData?.ranking.pronostics_regles
      ? 'NON CLASSÉ'
      : profileData.ranking.provisoire
        ? 'PLACEMENT'
        : grade?.libelle?.toUpperCase() ?? 'NON CLASSÉ';
  const rankColor = gradeAccent(grade);
  const bannerAccent = cosmetics?.profileCard?.accent ?? rankColor;
  const profileTitle = cosmetics?.title?.name || profileData?.profileTitle || profileData?.level.prestigeLabel || 'Starter';
  const equippedCount = cosmetics ? Object.values(cosmetics).filter(Boolean).length : 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Revenir à Moi" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>← MOI</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>PROFIL // COLLECTION</Text>
            <Text style={styles.headerTitle}>MA VITRINE</Text>
          </View>
          <View accessible accessibilityLabel={`${ownedItems.length} objets possédés`} style={styles.objectCount}>
            <Text style={styles.objectCountValue}>{loading ? '—' : ownedItems.length}</Text>
            <Text style={styles.objectCountLabel}>OBJETS</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable>
          </View>
        ) : null}

        <View style={[styles.hero, { borderColor: alpha(bannerAccent, '72') }]}>
          <LinearGradient colors={[alpha(bannerAccent, '38'), '#11161D', '#070A0E']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
          <View style={[styles.heroGlow, { backgroundColor: bannerAccent }]} />
          <Text style={[styles.heroWatermark, { color: bannerAccent }]}>{profileData?.favoriteTeam?.tag || 'GRIFF'}</Text>
          <View style={styles.heroMeta}>
            <Text numberOfLines={1} style={styles.bannerName}>{cosmetics?.profileCard?.name?.toUpperCase() ?? 'BANNIÈRE ORIGINE'}</Text>
            <Text style={[styles.heroRank, { color: rankColor }]}>{rankLabel}</Text>
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.heroIdentity}>{(profileData?.pseudo || pseudo).toUpperCase()} — {rankLabel}</Text>
          <View style={styles.heroStage}>
            <View style={styles.avatarBlock}>
              <CosmeticAvatar cosmetics={cosmetics} fallback={`${profileData?.level.level ?? 0}`} label={profileData?.pseudo || pseudo} size={88} />
              <Text numberOfLines={1} style={[styles.heroTitle, { color: cosmetics?.title?.accent ?? colors.volt }]}>{profileTitle.toUpperCase()}</Text>
              <Text numberOfLines={1} style={styles.heroFrame}>{cosmetics?.frame?.name?.toUpperCase() ?? 'CADRE ORIGINE'}</Text>
            </View>
            <ProfileRelicThumbnail
              accent={cosmetics?.factionEffect?.accent ?? rankColor}
              level={profileData?.favoriteTeam?.relique_niveau ?? 1}
              name={cosmetics?.factionEffect?.name ?? 'Forme Origine'}
            />
          </View>
          <View style={styles.heroStats}>
            <HeroStat label="TROPHÉES" value={loading ? '—' : trophies.length} />
            <View style={styles.heroDivider} />
            <HeroStat label="OBJETS" value={loading ? '—' : ownedItems.length} />
            <View style={styles.heroDivider} />
            <HeroStat label="ÉQUIPÉS" value={loading ? '—' : equippedCount} />
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.volt} />
            <Text style={styles.loadingText}>Installation de ta collection…</Text>
          </View>
        ) : (
          <>
            <ShowcaseSection count={trophies.length} eyebrow="PARCOURS" title="Trophées" copy="Les preuves durables de tes accomplissements.">
              {trophies.length
                ? trophies.map((badge) => <TrophyCard badge={badge} key={badge.key} />)
                : <EmptyCategory copy="Tes prochains exploits laisseront leur première trace ici." />}
            </ShowcaseSection>

            <ShowcaseSection count={relics.length} eyebrow="SIGNATURE" title="Reliques" copy="Les formes et mutations qui incarnent ton identité.">
              {relics.length
                ? relics.map((item) => <ShowcaseItemCard item={item} key={item.id} pseudo={profileData?.pseudo || pseudo} />)
                : <EmptyCategory copy="Équipe ou débloque une relique pour l’exposer ici." />}
            </ShowcaseSection>

            <ShowcaseSection count={teamItems.length} eyebrow="FANDOM" title="Objets d’équipes" copy="Les pièces qui portent les couleurs que tu défends.">
              {teamItems.length
                ? teamItems.map((item) => <ShowcaseItemCard item={item} key={item.id} pseudo={profileData?.pseudo || pseudo} />)
                : <EmptyCategory copy="Les futures collections officielles de tes équipes apparaîtront ici." />}
            </ShowcaseSection>

            <ShowcaseSection count={seasonItems.length} eyebrow="ARCHIVES" title="Souvenirs de saisons" copy="Une mémoire visible de chaque saison traversée.">
              {seasonItems.length
                ? seasonItems.map((item) => <ShowcaseItemCard item={item} key={item.id} pseudo={profileData?.pseudo || pseudo} />)
                : <EmptyCategory copy="Ta première récompense saisonnière ouvrira ces archives." />}
            </ShowcaseSection>

            <ShowcaseSection count={partnerItems.length} eyebrow="COLLABORATIONS" title="Objets partenaires" copy="Les éditions obtenues pendant les activations officielles.">
              {partnerItems.length
                ? partnerItems.map((item) => <ShowcaseItemCard item={item} key={item.id} pseudo={profileData?.pseudo || pseudo} />)
                : <EmptyCategory copy="Aucune édition partenaire dans ta collection pour le moment." />}
            </ShowcaseSection>
          </>
        )}

        <View style={styles.loadoutCard}>
          <View style={styles.loadoutCopy}>
            <Text style={styles.loadoutEyebrow}>LOADOUT ACTIF</Text>
            <Text style={styles.loadoutTitle}>CHOISIS CE QUI LAISSE TA MARQUE.</Text>
            <Text style={styles.loadoutText}>Tes objets équipés ressortent du profil jusque dans Rank, Social et les résultats de calls.</Text>
          </View>
          <Pressable accessibilityLabel="Modifier mon Loadout" accessibilityRole="button" onPress={() => router.push((previewProfile ? '/shop-preview' : '/shop') as never)} style={({ pressed }) => [styles.loadoutAction, pressed && styles.pressed]}>
            <Text style={styles.loadoutActionText}>MODIFIER MON LOADOUT</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function ShowcaseSection({ children, copy, count, eyebrow, title }: { children: ReactNode; copy: string; count: number; eyebrow: string; title: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionText}>{copy}</Text>
        </View>
        <Text style={styles.sectionCount}>{count.toString().padStart(2, '0')}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>{children}</ScrollView>
    </View>
  );
}

function TrophyCard({ badge }: { badge: ProfileBadge }) {
  const accent = badgeAccent(badge.rarity);
  return (
    <View accessible accessibilityLabel={`${badge.name}, trophée ${badge.rarity}`} style={[styles.trophyCard, { borderColor: alpha(accent, '65') }]}>
      <LinearGradient colors={[alpha(accent, '24'), '#0A0F14']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.trophyMark, { borderColor: accent }]}><Text style={[styles.trophyGlyph, { color: accent }]}>{badgeGlyph(badge.family)}</Text></View>
      <Text numberOfLines={2} style={styles.trophyName}>{badge.name}</Text>
      <Text style={[styles.trophyRarity, { color: accent }]}>{badge.rarity.toUpperCase()}</Text>
    </View>
  );
}

function ShowcaseItemCard({ item, pseudo }: { item: CosmeticItem; pseudo: string }) {
  return (
    <View accessible accessibilityLabel={`${item.name}, ${item.rarity}${item.equipped ? ', équipé' : ''}`} style={[styles.itemCard, item.equipped && { borderColor: alpha(item.accent, '88') }]}>
      <CosmeticItemPreview item={item} pseudo={pseudo} />
      <View style={styles.itemTopline}>
        <Text style={[styles.itemRarity, { color: item.accent }]}>{item.rarity.toUpperCase()}</Text>
        {item.equipped ? <Text style={styles.equipped}>ÉQUIPÉ</Text> : null}
      </View>
      <Text numberOfLines={2} style={styles.itemName}>{item.name}</Text>
      <Text numberOfLines={1} style={styles.itemOrigin}>{itemOrigin(item)}</Text>
    </View>
  );
}

function EmptyCategory({ copy }: { copy: string }) {
  return (
    <View style={styles.emptyCategory}>
      <Text style={styles.emptyGlyph}>◇</Text>
      <View style={styles.emptyCopy}><Text style={styles.emptyTitle}>EMPLACEMENT LIBRE</Text><Text style={styles.emptyText}>{copy}</Text></View>
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: number | string }) {
  return <View style={styles.heroStat}><Text style={styles.heroStatValue}>{value}</Text><Text style={styles.heroStatLabel}>{label}</Text></View>;
}

function resolveEquipped(shop: CosmeticShopData | null, fallback?: EquippedCosmetics | null) {
  if (!shop) return fallback ?? null;
  const equipped = shop.equipped;
  return Object.values(equipped).some(Boolean) ? equipped : fallback ?? equipped;
}

function badgeAccent(rarity: ProfileBadge['rarity']) {
  if (rarity === 'mythique') return '#FF5DDF';
  if (rarity === 'legendaire') return '#FFB84D';
  if (rarity === 'epique') return '#A982FF';
  if (rarity === 'rare') return '#63B8FF';
  return '#AAB4BE';
}

function badgeGlyph(family: string) {
  const value = family.toLowerCase();
  if (value.includes('social')) return '◎';
  if (value.includes('audace')) return '⚡';
  if (value.includes('régular')) return '↗';
  if (value.includes('connaissance')) return '◇';
  return '◆';
}

function itemOrigin(item: CosmeticItem) {
  if (item.team) return `${item.team.name} · ${item.team.tag}`.toUpperCase();
  if (item.brandKey) return item.brandKey.replaceAll('_', ' ').toUpperCase();
  if (item.seasonId) return `SAISON · ${item.seasonId.replaceAll('_', ' ').toUpperCase()}`;
  if (item.source === 'founder_pack') return 'PACK FONDATEUR';
  if (item.source === 'mission') return 'MISSION';
  return item.collectionKey.replaceAll('_', ' ').toUpperCase();
}

function alpha(color: string, opacity: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${opacity}` : color;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: 48, gap: 24 },
  header: { minHeight: 82, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#171D23' },
  back: { minHeight: 42, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#2B3540' },
  backText: { ...typography.action, color: colors.text, letterSpacing: .5 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .85 },
  headerTitle: { ...typography.sectionTitle, marginTop: 2, color: colors.text },
  objectCount: { minWidth: 52, alignItems: 'flex-end' },
  objectCountValue: { ...typography.metricSmall, color: colors.text },
  objectCountLabel: { ...typography.label, color: colors.textMuted },
  error: { marginHorizontal: spacing.md, padding: 13, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' },
  errorText: { ...typography.body, flex: 1, color: '#FF9AA2' },
  retry: { ...typography.action, color: colors.volt },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 344, marginHorizontal: spacing.md, padding: 18, borderRadius: 31, backgroundColor: '#0A0F14', borderWidth: 1 },
  heroGlow: { position: 'absolute', width: 320, height: 280, top: -190, left: -70, borderRadius: 150, opacity: .22 },
  heroWatermark: { position: 'absolute', right: -8, top: 50, fontFamily: fonts.display, fontSize: 96, lineHeight: 100, letterSpacing: -6, opacity: .06 },
  heroMeta: { zIndex: 2, minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  bannerName: { ...typography.eyebrow, flex: 1, color: colors.textMuted, letterSpacing: .7 },
  heroRank: { ...typography.label, letterSpacing: .55 },
  heroIdentity: { zIndex: 2, marginTop: 10, color: colors.text, fontFamily: fonts.display, fontSize: 31, lineHeight: 33 },
  heroStage: { zIndex: 2, minHeight: 184, marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  avatarBlock: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  heroTitle: { ...typography.bodyStrong, maxWidth: 165, marginTop: 8 },
  heroFrame: { ...typography.label, maxWidth: 165, marginTop: 2, color: colors.textMuted },
  heroStats: { zIndex: 2, minHeight: 56, marginTop: 5, paddingVertical: 8, flexDirection: 'row', alignItems: 'stretch', borderRadius: 17, backgroundColor: 'rgba(5,8,11,.64)', borderWidth: 1, borderColor: '#28323A' },
  heroStat: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroStatValue: { ...typography.metricSmall, color: colors.text },
  heroStatLabel: { ...typography.label, marginTop: 2, color: colors.textMuted, fontSize: 8 },
  heroDivider: { width: 1, marginVertical: 5, backgroundColor: '#2B343C' },
  loading: { minHeight: 220, marginHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 25, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  loadingText: { ...typography.body, color: colors.textMuted },
  section: { gap: 12 },
  sectionHead: { marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .9 },
  sectionTitle: { ...typography.sectionTitle, marginTop: 3, color: colors.text },
  sectionText: { ...typography.caption, maxWidth: 300, marginTop: 4, color: colors.textMuted },
  sectionCount: { color: '#46515D', fontFamily: fonts.display, fontSize: 34, lineHeight: 34 },
  rail: { minHeight: 230, paddingHorizontal: spacing.md, gap: 10 },
  trophyCard: { position: 'relative', overflow: 'hidden', width: 154, minHeight: 206, padding: 14, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1 },
  trophyMark: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: 'rgba(6,9,12,.72)', borderWidth: 1.5 },
  trophyGlyph: { fontSize: 25, fontWeight: '900' },
  trophyName: { ...typography.bodyStrong, marginTop: 19, color: colors.text },
  trophyRarity: { ...typography.eyebrow, marginTop: 'auto', letterSpacing: .45 },
  itemCard: { width: 178, minHeight: 224, padding: 9, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  itemTopline: { minHeight: 17, marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  itemRarity: { ...typography.eyebrow, letterSpacing: .4 },
  equipped: { ...typography.label, color: colors.volt, fontSize: 8 },
  itemName: { ...typography.bodyStrong, marginTop: 4, color: colors.text },
  itemOrigin: { ...typography.caption, marginTop: 'auto', color: colors.textMuted, fontSize: 9 },
  emptyCategory: { width: 342, minHeight: 188, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 24, backgroundColor: '#0A0F14', borderWidth: 1, borderStyle: 'dashed', borderColor: '#2A343D' },
  emptyGlyph: { color: '#4B5661', fontFamily: fonts.display, fontSize: 43 },
  emptyCopy: { flex: 1 },
  emptyTitle: { ...typography.eyebrow, color: colors.text, letterSpacing: .65 },
  emptyText: { ...typography.body, marginTop: 6, color: colors.textMuted },
  loadoutCard: { marginHorizontal: spacing.md, padding: 18, gap: 16, borderRadius: 26, backgroundColor: '#10160E', borderWidth: 1, borderColor: '#45521E' },
  loadoutCopy: { gap: 4 },
  loadoutEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 },
  loadoutTitle: { ...typography.sectionTitle, color: colors.text },
  loadoutText: { ...typography.body, color: colors.textMuted },
  loadoutAction: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: colors.volt },
  loadoutActionText: { ...typography.action, color: '#070A0E', letterSpacing: .55 },
  pressed: { opacity: .76, transform: [{ scale: .995 }] },
});
