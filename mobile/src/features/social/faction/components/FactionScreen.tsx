import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radius, spacing } from '@/src/theme';
import { teamHue } from '@/src/utils/teams';

import { loadCommunityData } from '../api';
import { COMMUNITY_FORMS } from '../constants';
import type {
  CommunityData,
  CommunityFaction,
  CommunityMe,
  FactionProgress,
} from '../types';
import { factionProgress, gameLabel } from '../utils';

const EMPTY_DATA: CommunityData = { factions: [], moi: null };

export default function FactionScreen() {
  const { profile } = useAuth();
  const [data, setData] = useState<CommunityData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setData(await loadCommunityData());
    } catch (caught) {
      console.error(caught);
      setError(caught instanceof Error ? caught.message : 'Impossible de charger les factions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mine = useMemo(
    () => data.factions.find(
      (faction) => faction.moi || faction.equipe_id === profile?.equipe_favorite_id,
    ) ?? null,
    [data.factions, profile?.equipe_favorite_id],
  );
  const featured = mine ?? data.factions[0] ?? null;
  const rank = featured
    ? Math.max(1, data.factions.findIndex((faction) => faction.equipe_id === featured.equipe_id) + 1)
    : 0;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.volt}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>FACTION // RÉACTEUR COLLECTIF</Text>
          <Text style={styles.title}>Votre énergie prend forme.</Text>
          <Text style={styles.subtitle}>
            Chaque membre compte pour un supporter. L’activité fait vivre la faction, sans gonfler artificiellement la relique.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void load()}>
              <Text style={styles.retry}>RÉESSAYER</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? <CommunitySkeleton /> : featured ? (
          <>
            <FactionHero faction={featured} rank={rank} isMine={Boolean(mine)} />
            {!mine ? <VisitorNotice /> : null}
            <FactionWar factions={data.factions} featuredId={featured.equipe_id} />
            {mine && data.moi ? <MyImpact me={data.moi} faction={mine} /> : null}
            {mine && data.moi ? <MutationArchive me={data.moi} progress={factionProgress(mine.membres, mine.niveau_atteint)} /> : null}
            <FormsCollection faction={featured} />
          </>
        ) : (
          <EmptyCommunity />
        )}
      </ScrollView>
    </Screen>
  );
}

function FactionHero({
  faction,
  rank,
  isMine,
}: {
  faction: CommunityFaction;
  rank: number;
  isMine: boolean;
}) {
  const progress = factionProgress(faction.membres, faction.niveau_atteint);
  const hue = teamHue(faction.tag, faction.nom);
  const accent = `hsl(${hue}, 62%, 58%)`;
  const accentSoft = `hsla(${hue}, 62%, 58%, 0.14)`;
  const pct = Math.round(progress.progress * 100);
  const signal = progress.max
    ? 'FORME TERMINALE'
    : progress.progress >= 0.9
      ? 'MUTATION IMMINENTE'
      : progress.progress >= 0.5
        ? 'CHARGE EN HAUSSE'
        : 'RÉACTEUR STABLE';

  return (
    <View style={[styles.hero, { borderColor: `hsla(${hue}, 62%, 58%, 0.34)` }]}>
      <View style={[styles.heroAura, { backgroundColor: accentSoft }]} />

      <View style={styles.identityRow}>
        <View style={styles.identityLeft}>
          <TeamBadge faction={faction} size="large" />
          <View style={styles.identityCopy}>
            <Text style={styles.identityEyebrow}>{isMine ? 'MA FACTION' : 'FACTION EN TÊTE'}</Text>
            <Text numberOfLines={1} style={styles.factionName}>{faction.nom}</Text>
            <Text style={styles.factionMeta}>{gameLabel(faction.jeu)} · {faction.tag}</Text>
          </View>
        </View>
        <View style={styles.rankPill}><Text style={styles.rankText}>#{rank}</Text></View>
      </View>

      <View style={styles.signalRow}>
        <View style={[styles.signalDot, { backgroundColor: accent }]} />
        <Text style={styles.signalText}>{signal}</Text>
        {!progress.max ? <Text style={styles.signalRemaining}>{formatNumber(progress.remaining)} avant {progress.next?.name}</Text> : null}
      </View>

      <RelicStage faction={faction} progress={progress} accent={accent} hue={hue} />

      <View style={styles.chargeBlock}>
        <View style={styles.chargeHeadline}>
          <View>
            <Text style={styles.chargeEyebrow}>{progress.max ? 'SATURATION' : 'CHARGE COLLECTIVE'}</Text>
            <Text style={styles.chargeValue}>
              {progress.max ? 'MAX' : `${formatNumber(faction.membres)} / ${formatNumber(progress.objective)}`}
            </Text>
          </View>
          <Text style={[styles.chargePct, { color: accent }]}>{progress.max ? 100 : pct}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${progress.max ? 100 : pct}%`, backgroundColor: accent }]} />
        </View>
        <Text style={styles.chargeHint}>
          {progress.max
            ? 'La faction a atteint sa forme terminale.'
            : `${formatNumber(progress.remaining)} supporter${progress.remaining > 1 ? 's' : ''} avant la mutation en ${progress.next?.name}.`}
        </Text>
      </View>

      {progress.next ? (
        <View style={styles.nextMutation}>
          <View style={styles.nextMutationMark}><Text style={styles.nextMutationCode}>{progress.next.code}</Text></View>
          <View style={styles.nextMutationCopy}>
            <Text style={styles.nextMutationEyebrow}>PROCHAINE MUTATION</Text>
            <Text style={styles.nextMutationTitle}>{progress.next.name}</Text>
            <Text style={styles.nextMutationDetail}>Seuil {formatNumber(progress.next.threshold)} supporters</Text>
          </View>
          <View style={styles.rewardPill}>
            <Text style={styles.rewardValue}>+{formatNumber(progress.next.reward)}</Text>
            <Text style={styles.rewardUnit}>VOLTS</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function RelicStage({
  faction,
  progress,
  accent,
  hue,
}: {
  faction: CommunityFaction;
  progress: FactionProgress;
  accent: string;
  hue: number;
}) {
  const dimensions = relicDimensions(progress.level);
  return (
    <View style={styles.relicStage}>
      <View style={[styles.relicGlow, { backgroundColor: `hsla(${hue}, 70%, 58%, 0.16)` }]} />
      <View style={[styles.ring, styles.ringOuter, { borderColor: `hsla(${hue}, 70%, 58%, 0.18)` }]} />
      <View style={[styles.ring, styles.ringInner, { borderColor: `hsla(${hue}, 70%, 58%, 0.12)` }]} />

      <View style={styles.relicShell}>
        <View style={styles.cork} />
        <View style={[styles.neck, { width: dimensions.neckWidth }]} />
        <View
          style={[
            styles.vessel,
            {
              width: dimensions.width,
              height: dimensions.height,
              borderRadius: dimensions.radius,
              borderColor: `hsla(${hue}, 55%, 76%, 0.45)`,
            },
          ]}
        >
          <View
            style={[
              styles.liquid,
              {
                height: `${Math.max(18, Math.round(progress.progress * 72 + 18))}%`,
                backgroundColor: `hsla(${hue}, 68%, 52%, 0.72)`,
              },
            ]}
          />
          <View style={[styles.core, { borderColor: accent }]}>
            <View style={styles.coreInner} />
          </View>
          <View style={styles.glassShine} />
        </View>
        <View style={[styles.relicCharm, { borderColor: accent }]}>
          <Text style={[styles.relicCharmText, { color: accent }]}>{faction.tag.slice(0, 2)}</Text>
        </View>
      </View>

      <View style={styles.relicLabel}>
        <Text style={styles.formCode}>FORME {progress.current.code}</Text>
        <Text style={styles.formName}>{progress.current.name}</Text>
        <Text style={styles.formPhrase}>{progress.current.phrase}</Text>
      </View>
    </View>
  );
}

function FactionWar({ factions, featuredId }: { factions: CommunityFaction[]; featuredId: string }) {
  if (!factions.length) return null;
  const leaderGrowth = Number(factions[0]?.croissance_24h ?? 0);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionEyebrow}>GUERRE DES FACTIONS</Text>
          <Text style={styles.sectionTitle}>Qui prend de la vitesse ?</Text>
        </View>
        <Text style={styles.sectionMeta}>24 H</Text>
      </View>

      <View style={styles.rankingCard}>
        {factions.slice(0, 8).map((faction, index) => {
          const progress = factionProgress(faction.membres, faction.niveau_atteint);
          const focused = faction.equipe_id === featuredId;
          const gap = Math.max(0, leaderGrowth - Number(faction.croissance_24h ?? 0));
          return (
            <View key={faction.equipe_id} style={[styles.rankRow, focused && styles.rankRowFocused]}>
              <Text style={[styles.rankNumber, index === 0 && styles.rankNumberLeader]}>#{index + 1}</Text>
              <TeamBadge faction={faction} size="small" />
              <View style={styles.rankTeamCopy}>
                <View style={styles.rankTeamLine}>
                  <Text style={styles.rankTag}>{faction.tag}</Text>
                  {faction.moi ? <View style={styles.mePill}><Text style={styles.mePillText}>TOI</Text></View> : null}
                </View>
                <Text numberOfLines={1} style={styles.rankDetail}>
                  {progress.current.name} · {formatNumber(faction.membres)} supporter{faction.membres > 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.speedBlock}>
                <Text style={[styles.speedValue, faction.croissance_24h > 0 && styles.speedPositive]}>
                  {growthLabel(faction.croissance_24h)}
                </Text>
                <Text style={styles.speedHint}>{index === 0 ? 'EN TÊTE' : gap ? `${gap} derrière` : 'AU CONTACT'}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MyImpact({ me, faction }: { me: CommunityMe; faction: CommunityFaction }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionEyebrow}>TON IMPACT · 7 JOURS</Text>
          <Text style={styles.sectionTitle}>Tu portes {faction.tag}.</Text>
        </View>
        <Text style={styles.sectionMeta}>{activityPlacement(me)}</Text>
      </View>

      <View style={styles.impactCard}>
        <View style={styles.impactStats}>
          <ImpactStat label="PRONOS" value={String(me.pronos_7j)} />
          <ImpactStat label="VALIDÉS" value={String(me.gagnes_7j)} />
          <ImpactStat
            label="FRAGS · 7J"
            value={`${me.delta_frags_7j >= 0 ? '+' : ''}${formatNumber(me.delta_frags_7j)}`}
            positive={me.delta_frags_7j >= 0}
            negative={me.delta_frags_7j < 0}
          />
        </View>

        <View style={styles.impactDivider} />
        <Text style={styles.topLabel}>CEUX QUI MAINTIENNENT LE RÉACTEUR VIVANT</Text>
        {me.top_activite.length ? me.top_activite.map((person) => (
          <View key={person.user_id} style={styles.contributorRow}>
            <Text style={styles.contributorRank}>#{person.rang}</Text>
            <View style={styles.contributorAvatar}>
              <Text style={styles.contributorInitials}>{initials(person.pseudo)}</Text>
            </View>
            <View style={styles.contributorCopy}>
              <Text numberOfLines={1} style={styles.contributorName}>{person.pseudo}</Text>
              <Text style={styles.contributorDetail}>{person.pronos_7j} prono{person.pronos_7j > 1 ? 's' : ''} · {person.gagnes_7j} validé{person.gagnes_7j > 1 ? 's' : ''}</Text>
            </View>
            {person.user_id === me.user_id ? <View style={styles.youBadge}><Text style={styles.youBadgeText}>TOI</Text></View> : null}
          </View>
        )) : (
          <Text style={styles.inlineEmpty}>Pas encore d’activité cette semaine.</Text>
        )}
      </View>
    </View>
  );
}

function ImpactStat({
  label,
  value,
  positive = false,
  negative = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <View style={styles.impactStat}>
      <Text style={styles.impactStatLabel}>{label}</Text>
      <Text style={[styles.impactStatValue, positive && styles.positive, negative && styles.negative]}>{value}</Text>
    </View>
  );
}

function MutationArchive({ me, progress }: { me: CommunityMe; progress: FactionProgress }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionEyebrow}>ARCHIVES DE MUTATION</Text>
          <Text style={styles.sectionTitle}>L’histoire de la relique.</Text>
        </View>
        <Text style={styles.sectionMeta}>{me.mutations_vecues} VÉCUE{me.mutations_vecues > 1 ? 'S' : ''}</Text>
      </View>

      <View style={styles.archiveCard}>
        <ArchiveRow code="I" title="Fiole" detail="Origine · le noyau s’allume" origin />
        {me.archives.length ? me.archives.map((archive) => (
          <ArchiveRow
            key={archive.id}
            code={COMMUNITY_FORMS[Math.max(0, archive.niveau - 1)]?.code ?? String(archive.niveau)}
            title={archive.nom}
            detail={`${formatDate(archive.cree_le)} · ${formatNumber(archive.membres)} supporters`}
            reward={archive.recompense_volts}
          />
        )) : (
          <View style={styles.archiveEmpty}>
            <Text style={styles.archiveEmptyText}>
              Première mutation à {progress.next ? formatNumber(progress.next.threshold) : '—'} supporters.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ArchiveRow({
  code,
  title,
  detail,
  reward,
  origin = false,
}: {
  code: string;
  title: string;
  detail: string;
  reward?: number;
  origin?: boolean;
}) {
  return (
    <View style={styles.archiveRow}>
      <View style={[styles.archiveMark, origin && styles.archiveMarkOrigin]}>
        <Text style={[styles.archiveCode, origin && styles.archiveCodeOrigin]}>{code}</Text>
      </View>
      <View style={styles.archiveCopy}>
        <Text style={styles.archiveTitle}>{title}</Text>
        <Text style={styles.archiveDetail}>{detail}</Text>
      </View>
      {reward ? <Text style={styles.archiveReward}>+{formatNumber(reward)} V</Text> : null}
    </View>
  );
}

function FormsCollection({ faction }: { faction: CommunityFaction }) {
  const progress = factionProgress(faction.membres, faction.niveau_atteint);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionEyebrow}>COLLECTION DE FORMES</Text>
          <Text style={styles.sectionTitle}>7 mutations permanentes.</Text>
        </View>
        <Text style={styles.sectionMeta}>{progress.level}/7</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formsRail}>
        {COMMUNITY_FORMS.map((form) => {
          const unlocked = form.level <= progress.level;
          const current = form.level === progress.level;
          return (
            <View key={form.level} style={[styles.formCard, unlocked && styles.formCardUnlocked, current && styles.formCardCurrent]}>
              <Text style={[styles.formCardCode, unlocked && styles.formCardCodeUnlocked]}>{form.code}</Text>
              <Text style={styles.formCardName}>{form.name}</Text>
              <Text style={styles.formCardThreshold}>{form.threshold === 0 ? 'ORIGINE' : `${formatNumber(form.threshold)} SUPPORTERS`}</Text>
              <View style={[styles.formState, unlocked && styles.formStateUnlocked]}>
                <Text style={[styles.formStateText, unlocked && styles.formStateTextUnlocked]}>{current ? 'ACTUELLE' : unlocked ? 'ACQUISE' : 'VERROUILLÉE'}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TeamBadge({ faction, size }: { faction: CommunityFaction; size: 'small' | 'large' }) {
  const hue = teamHue(faction.tag, faction.nom);
  const dimension = size === 'large' ? 52 : 38;
  return (
    <View
      style={[
        styles.teamBadge,
        {
          width: dimension,
          height: dimension,
          borderRadius: size === 'large' ? 17 : 12,
          backgroundColor: `hsl(${hue}, 52%, 38%)`,
          borderColor: `hsl(${hue}, 58%, 66%)`,
        },
      ]}
    >
      <Text style={[styles.teamBadgeText, size === 'large' && styles.teamBadgeTextLarge]}>{faction.tag}</Text>
    </View>
  );
}

function VisitorNotice() {
  return (
    <View style={styles.visitorNotice}>
      <View style={styles.visitorIcon}><Text style={styles.visitorIconText}>✦</Text></View>
      <View style={styles.visitorCopy}>
        <Text style={styles.visitorTitle}>Tu n’as pas encore de faction sur ce compte.</Text>
        <Text style={styles.visitorText}>La sélection de faction sera intégrée à la refonte mobile du Profil. En attendant, tu peux suivre la guerre collective ici.</Text>
      </View>
    </View>
  );
}

function EmptyCommunity() {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyMark}><Text style={styles.emptyMarkText}>✦</Text></View>
      <Text style={styles.emptyTitle}>Les réacteurs sont éteints.</Text>
      <Text style={styles.emptyCopy}>Aucune faction active n’est actuellement remontée par Supabase.</Text>
    </View>
  );
}

function CommunitySkeleton() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonHeader} />
      <View style={styles.skeletonRelic} />
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: '68%' }]} />
    </View>
  );
}

function relicDimensions(level: number) {
  const values = [
    { width: 88, height: 108, neckWidth: 34, radius: 38 },
    { width: 102, height: 116, neckWidth: 40, radius: 34 },
    { width: 120, height: 120, neckWidth: 46, radius: 28 },
    { width: 126, height: 126, neckWidth: 44, radius: 48 },
    { width: 138, height: 116, neckWidth: 48, radius: 34 },
    { width: 150, height: 122, neckWidth: 52, radius: 42 },
    { width: 164, height: 128, neckWidth: 56, radius: 54 },
  ];
  return values[Math.max(0, Math.min(values.length - 1, level - 1))];
}

function growthLabel(value: number) {
  const n = Number(value || 0);
  return n > 0 ? `+${n}` : String(n);
}

function activityPlacement(me: CommunityMe) {
  const rank = Number(me.rang_activite || 0);
  const total = Number(me.total_activite || 0);
  if (!rank || !total) return '—';
  if (total > 5) return `TOP ${Math.max(1, Math.ceil((rank / total) * 100))}%`;
  return `#${rank}/${total}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Date inconnue';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(value: string) {
  const parts = String(value || '?').trim().split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  header: { gap: 8, paddingTop: 4 },
  eyebrow: { color: colors.volt, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, maxWidth: 380 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' },
  errorText: { flex: 1, color: '#FF9AA2', fontSize: 12, lineHeight: 17 },
  retry: { color: colors.volt, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  hero: { position: 'relative', overflow: 'hidden', borderRadius: 28, borderWidth: 1, backgroundColor: '#0A0F14', padding: 18, gap: 18 },
  heroAura: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: 80, alignSelf: 'center', opacity: 0.9 },
  identityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, zIndex: 2 },
  identityLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityCopy: { flex: 1, minWidth: 0 },
  identityEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  factionName: { marginTop: 2, color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  factionMeta: { marginTop: 3, color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  rankPill: { minWidth: 44, height: 36, paddingHorizontal: 12, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  rankText: { color: colors.text, fontSize: 13, fontWeight: '900' },
  teamBadge: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.2 },
  teamBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.2 },
  teamBadgeTextLarge: { fontSize: 13 },
  signalRow: { zIndex: 2, minHeight: 34, borderRadius: 17, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0D141A', borderWidth: 1, borderColor: colors.border },
  signalDot: { width: 7, height: 7, borderRadius: 4 },
  signalText: { color: colors.text, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  signalRemaining: { flex: 1, color: colors.textMuted, fontSize: 9, textAlign: 'right' },
  relicStage: { zIndex: 2, minHeight: 270, alignItems: 'center', justifyContent: 'center', paddingTop: 8 },
  relicGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, top: 20 },
  ring: { position: 'absolute', borderWidth: 1, borderRadius: 999 },
  ringOuter: { width: 210, height: 210, top: 10 },
  ringInner: { width: 150, height: 150, top: 40 },
  relicShell: { height: 180, width: 190, alignItems: 'center', justifyContent: 'flex-end' },
  cork: { width: 36, height: 17, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: '#332A21', borderWidth: 1, borderColor: '#5B4A39', zIndex: 3 },
  neck: { height: 28, marginTop: -2, backgroundColor: 'rgba(173,198,210,0.08)', borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(188,214,227,0.28)' },
  vessel: { position: 'relative', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(173,198,210,0.045)', borderWidth: 1.2 },
  liquid: { position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.88 },
  core: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, backgroundColor: 'rgba(7,10,14,0.72)' },
  coreInner: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.volt },
  glassShine: { position: 'absolute', width: 5, top: 12, bottom: 18, left: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.17)' },
  relicCharm: { position: 'absolute', right: 29, top: 56, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: '#080C10' },
  relicCharmText: { fontSize: 8, fontWeight: '900' },
  relicLabel: { marginTop: 14, alignItems: 'center', gap: 2 },
  formCode: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  formName: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.6 },
  formPhrase: { marginTop: 2, color: colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center', maxWidth: 280 },
  chargeBlock: { zIndex: 2, padding: 14, borderRadius: radius.md, backgroundColor: 'rgba(6,10,14,0.78)', borderWidth: 1, borderColor: colors.border, gap: 10 },
  chargeHeadline: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  chargeEyebrow: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  chargeValue: { marginTop: 3, color: colors.text, fontSize: 16, fontWeight: '900' },
  chargePct: { fontSize: 21, fontWeight: '900' },
  track: { height: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.surfaceElevated },
  trackFill: { height: '100%', borderRadius: 999 },
  chargeHint: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  nextMutation: { zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: radius.md, backgroundColor: '#0E141A', borderWidth: 1, borderColor: colors.border },
  nextMutationMark: { width: 40, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border },
  nextMutationCode: { color: colors.textMuted, fontSize: 12, fontWeight: '900' },
  nextMutationCopy: { flex: 1, minWidth: 0 },
  nextMutationEyebrow: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  nextMutationTitle: { marginTop: 2, color: colors.text, fontSize: 14, fontWeight: '900' },
  nextMutationDetail: { marginTop: 2, color: colors.textMuted, fontSize: 9 },
  rewardPill: { alignItems: 'flex-end' },
  rewardValue: { color: colors.volt, fontSize: 13, fontWeight: '900' },
  rewardUnit: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  visitorNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 15, borderRadius: radius.lg, backgroundColor: '#0C1117', borderWidth: 1, borderColor: colors.border },
  visitorIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#131A22' },
  visitorIconText: { color: colors.volt, fontSize: 17 },
  visitorCopy: { flex: 1, gap: 4 },
  visitorTitle: { color: colors.text, fontSize: 13, lineHeight: 17, fontWeight: '900' },
  visitorText: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  section: { gap: 13 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  sectionTitle: { marginTop: 4, color: colors.text, fontSize: 20, lineHeight: 24, fontWeight: '900', letterSpacing: -0.5 },
  sectionMeta: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  rankingCard: { overflow: 'hidden', borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  rankRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#171F28' },
  rankRowFocused: { backgroundColor: '#10171E' },
  rankNumber: { width: 24, color: colors.textMuted, fontSize: 11, fontWeight: '900' },
  rankNumberLeader: { color: colors.volt },
  rankTeamCopy: { flex: 1, minWidth: 0 },
  rankTeamLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rankTag: { color: colors.text, fontSize: 12, fontWeight: '900' },
  mePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: '#202812' },
  mePillText: { color: colors.volt, fontSize: 6, fontWeight: '900', letterSpacing: 0.5 },
  rankDetail: { marginTop: 3, color: colors.textMuted, fontSize: 9 },
  speedBlock: { alignItems: 'flex-end', minWidth: 68 },
  speedValue: { color: colors.text, fontSize: 13, fontWeight: '900' },
  speedPositive: { color: colors.success },
  speedHint: { marginTop: 3, color: colors.textMuted, fontSize: 7, fontWeight: '800' },
  impactCard: { padding: 15, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 14 },
  impactStats: { flexDirection: 'row', gap: 8 },
  impactStat: { flex: 1, minWidth: 0, padding: 11, borderRadius: radius.md, backgroundColor: '#10161D', borderWidth: 1, borderColor: '#1C2530' },
  impactStatLabel: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  impactStatValue: { marginTop: 5, color: colors.text, fontSize: 16, fontWeight: '900' },
  positive: { color: colors.success },
  negative: { color: colors.danger },
  impactDivider: { height: 1, backgroundColor: colors.border },
  topLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  contributorRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9 },
  contributorRank: { width: 24, color: colors.textMuted, fontSize: 10, fontWeight: '900' },
  contributorAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated },
  contributorInitials: { color: colors.text, fontSize: 8, fontWeight: '900' },
  contributorCopy: { flex: 1, minWidth: 0 },
  contributorName: { color: colors.text, fontSize: 11, fontWeight: '800' },
  contributorDetail: { marginTop: 2, color: colors.textMuted, fontSize: 8 },
  youBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999, backgroundColor: '#222A13' },
  youBadgeText: { color: colors.volt, fontSize: 7, fontWeight: '900' },
  inlineEmpty: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  archiveCard: { overflow: 'hidden', borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  archiveRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#171F28' },
  archiveMark: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#131A22', borderWidth: 1, borderColor: colors.border },
  archiveMarkOrigin: { backgroundColor: '#222A13', borderColor: '#3B4820' },
  archiveCode: { color: colors.textMuted, fontSize: 9, fontWeight: '900' },
  archiveCodeOrigin: { color: colors.volt },
  archiveCopy: { flex: 1, minWidth: 0 },
  archiveTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  archiveDetail: { marginTop: 3, color: colors.textMuted, fontSize: 9 },
  archiveReward: { color: colors.volt, fontSize: 10, fontWeight: '900' },
  archiveEmpty: { padding: 16 },
  archiveEmptyText: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  formsRail: { gap: 10, paddingRight: spacing.md },
  formCard: { width: 126, minHeight: 146, padding: 13, borderRadius: radius.lg, backgroundColor: '#090D12', borderWidth: 1, borderColor: '#171E27' },
  formCardUnlocked: { backgroundColor: '#0D1318', borderColor: '#27313C' },
  formCardCurrent: { borderColor: '#59651E', backgroundColor: '#11170E' },
  formCardCode: { color: '#4E5863', fontSize: 20, fontWeight: '900' },
  formCardCodeUnlocked: { color: colors.volt },
  formCardName: { marginTop: 15, color: colors.text, fontSize: 15, fontWeight: '900' },
  formCardThreshold: { marginTop: 4, color: colors.textMuted, fontSize: 7, fontWeight: '800' },
  formState: { marginTop: 'auto', alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999, backgroundColor: '#11161C' },
  formStateUnlocked: { backgroundColor: '#222A13' },
  formStateText: { color: '#59636E', fontSize: 6, fontWeight: '900', letterSpacing: 0.6 },
  formStateTextUnlocked: { color: colors.volt },
  emptyCard: { alignItems: 'center', padding: 28, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 9 },
  emptyMark: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141B22' },
  emptyMarkText: { color: colors.volt, fontSize: 22 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyCopy: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  skeleton: { minHeight: 460, padding: 18, borderRadius: 28, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border, gap: 16 },
  skeletonHeader: { width: '62%', height: 28, borderRadius: 10, backgroundColor: '#141B22' },
  skeletonRelic: { width: 150, height: 190, borderRadius: 60, alignSelf: 'center', backgroundColor: '#11181F' },
  skeletonLine: { width: '100%', height: 12, borderRadius: 6, backgroundColor: '#141B22' },
});
