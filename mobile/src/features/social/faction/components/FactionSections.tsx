import { ScrollView, Text, View } from 'react-native';

import { teamHue } from '@/src/utils/teams';

import { COMMUNITY_FORMS } from '../constants';
import type { CommunityFaction, CommunityMe, FactionProgress } from '../types';
import { factionProgress, gameLabel } from '../utils';
import { styles } from './FactionScreen.styles';

export function FactionHero({
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

export function FactionWar({ factions, featuredId }: { factions: CommunityFaction[]; featuredId: string }) {
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

export function MyImpact({ me, faction }: { me: CommunityMe; faction: CommunityFaction }) {
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

export function MutationArchive({ me, progress }: { me: CommunityMe; progress: FactionProgress }) {
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

export function FormsCollection({ faction }: { faction: CommunityFaction }) {
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

export function VisitorNotice() {
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

export function EmptyCommunity() {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyMark}><Text style={styles.emptyMarkText}>✦</Text></View>
      <Text style={styles.emptyTitle}>Les réacteurs sont éteints.</Text>
      <Text style={styles.emptyCopy}>Aucune faction active n’est actuellement remontée par Supabase.</Text>
    </View>
  );
}

export function CommunitySkeleton() {
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
