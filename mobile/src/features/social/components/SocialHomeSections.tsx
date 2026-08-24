import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { publicAppUrl } from '@/src/config/release';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { CosmeticAvatar, relicSignatureTheme } from '@/src/features/shop/components/CosmeticRenderer';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import CollectiveRelic from '@/src/features/social/faction/components/CollectiveRelic';
import FactionEvolutionRail, { FactionRelicMiniature } from '@/src/features/social/faction/components/FactionEvolutionRail';
import type {
  CommunityActivity,
  CommunityFaction,
  CommunityMe,
  CommunityMutationPresentation,
} from '@/src/features/social/faction/types';
import { factionProgress, gameLabel } from '@/src/features/social/faction/utils';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors } from '@/src/theme';

import { styles } from './SocialHomeScreen.styles';

export function FactionRelicHero({
  faction,
  me,
  mutationOverride,
  onMutationPresented,
  reduceMotionOverride,
}: {
  faction: CommunityFaction | null;
  me: CommunityMe | null;
  mutationOverride?: CommunityMutationPresentation | null;
  onMutationPresented?: (eventId: string) => Promise<void> | void;
  reduceMotionOverride?: boolean;
}) {
  const { equipped } = useCosmetics();
  const progress = factionProgress(faction?.membres ?? 0, faction?.niveau_atteint);
  const pct = Math.round(progress.progress * 100);
  const title = faction ? 'PORTE TES COULEURS.' : 'CHOISIS TES COULEURS.';
  const actionTitle = progress.max
    ? 'FAIRE RAYONNER LA FACTION'
    : `RALLIER ${formatNumber(progress.remaining)} SUPPORTER${progress.remaining > 1 ? 'S' : ''}`;
  const signature = relicSignatureTheme(equipped.factionEffect);
  const effectAccent = signature.accent;
  const mutation = mutationOverride === undefined ? me?.mutation_a_presenter : mutationOverride;

  async function rallySupporters() {
    if (!faction) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    }
    const url = publicAppUrl('/') ?? '';
    const message = `Rejoins la faction ${faction.nom} sur GRIFF et aide notre relique à atteindre la forme ${progress.next?.name ?? 'ultime'}.`;
    const shareText = url ? `${message} ${url}` : message;
    try {
      if (Platform.OS === 'web' && globalThis.navigator?.clipboard) {
        await globalThis.navigator.clipboard.writeText(shareText);
      } else {
        await Share.share({ message: shareText, ...(url ? { url } : {}) });
      }
    } catch {
      // The system share sheet can be dismissed without changing the faction state.
    }
  }

  return (
    <View style={styles.factionHero}>
      <LinearGradient colors={['#07131D', '#061018', '#04090E', '#050A0D']} end={{ x: .8, y: 1 }} start={{ x: .1, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.heroAura, { backgroundColor: signature.aura, boxShadow: signature.glow }]} />
      <View style={styles.heroAuraCold} />
      <View style={styles.heroGridLineA} />
      <View style={styles.heroGridLineB} />

      <View style={styles.heroTop}>
        <View style={styles.heroHeading}>
          <Text style={styles.heroEyebrow}>QG SOCIAL // FACTION</Text>
          <Text style={styles.heroTitle}>{title}</Text>
        </View>
        <View style={styles.levelPill}>
          <View style={styles.levelDot} />
          <Text style={styles.levelText}>{progress.awakened ? 'CŒUR ÉVEILLÉ' : progress.level > 0 ? `FORME ${progress.current.code}` : 'DORMANT'}</Text>
        </View>
      </View>

      <CollectiveRelic
        accent={effectAccent}
        faction={faction}
        mutation={mutation}
        onMutationPresented={onMutationPresented}
        progress={progress}
        reduceMotionOverride={reduceMotionOverride}
      />

      <View style={styles.factionIdentity}>
        <View style={styles.factionSeal}>
          {faction ? (
            <TeamLogo accent={colors.volt} name={faction.nom} size={34} tag={faction.tag} uri={faction.logo} />
          ) : (
            <Text style={styles.relicQuestion}>?</Text>
          )}
        </View>
        <View style={styles.factionIdentityCopy}>
          <Text style={styles.factionName}>{faction?.nom.toUpperCase() ?? 'AUCUNE FACTION'}</Text>
          <Text style={styles.factionMeta}>{faction ? `${gameLabel(faction.jeu)} · ${formatNumber(faction.membres)} MEMBRE${faction.membres > 1 ? 'S' : ''}` : 'UNE RELIQUE ATTEND TES COULEURS'}</Text>
        </View>
        {faction ? (
          <View style={styles.factionGrowthBlock}>
            <Text style={styles.factionGrowthLabel}>SUPPORTERS ·</Text>
            <Text style={styles.factionGrowth}>{signed(faction.croissance_7j)}</Text>
          </View>
        ) : null}
      </View>

      {faction ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressHeadline}>
            <Text style={styles.relicForm}>{progress.max ? 'ÉVEIL TOTAL' : progress.current.name.toUpperCase()}</Text>
            <Text style={styles.progressValue}>{progress.max ? '10 000+' : `${formatNumber(faction.membres)} / ${formatNumber(progress.objective)}`}</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress.max ? 100 : pct}%` }]} /></View>
          <View style={styles.progressFoot}>
            <Text style={styles.progressNext}>{progress.max ? 'CŒUR ÉVEILLÉ' : `PROCHAINE MUTATION · ${progress.next?.name.toUpperCase()}`}</Text>
          </View>
          <FactionEvolutionRail progress={progress} />
          <Pressable
            accessibilityHint={`Partage une invitation à rejoindre ${faction.nom}`}
            accessibilityLabel={actionTitle}
            accessibilityRole="button"
            onPress={() => void rallySupporters()}
            style={({ pressed }) => [styles.rallyButton, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={['#EEF933', '#D8E91D', '#B8CC12']}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={styles.rallySurface}
            >
              <View pointerEvents="none" style={[styles.rallyFacet, styles.rallyFacetLeft]} />
              <View pointerEvents="none" style={[styles.rallyFacet, styles.rallyFacetRight]} />
              <View style={styles.rallyIcon}><SupporterGroupIcon /></View>
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.rallyText}>{actionTitle}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function FactionWar({ factions, mine }: { factions: CommunityFaction[]; mine: CommunityFaction | null }) {
  const rows = factions.slice(0, 3);

  return (
    <View style={styles.warSection}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionEyebrow}>LA GUERRE DES FACTIONS</Text>
          <Text style={styles.sectionTitle}>QUI DOMINE LE TERRAIN ?</Text>
        </View>
        <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>24 H</Text></View>
      </View>
      <View style={styles.warCard}>
        {rows.map((faction) => {
          const rank = factions.findIndex((item) => item.equipe_id === faction.equipe_id) + 1;
          const selected = faction.equipe_id === mine?.equipe_id;
          const relicProgress = factionProgress(faction.membres, faction.niveau_atteint);
          const relicLevel = Math.max(1, Math.min(5, relicProgress.level));
          return (
            <View
              accessible
              accessibilityLabel={`${rank}. ${faction.nom}, ${faction.membres} supporter${faction.membres > 1 ? 's' : ''}, ${signed(faction.croissance_7j)} en sept jours${selected ? ', ma faction' : ''}`}
              accessibilityRole="summary"
              key={faction.equipe_id}
              style={[styles.warRow, selected && styles.warRowMine]}
            >
              <View style={[styles.warRankBadge, rank === 1 && styles.warRankBadgeFirst]}>
                <Text style={[styles.warRank, rank === 1 && styles.warRankFirst]}>{rank}</Text>
              </View>
              <FactionRelicMiniature faction={faction} level={relicLevel} size={34} state={selected ? 'current' : 'complete'} />
              <View style={styles.warTeam}>
                <View style={styles.warNameLine}>
                  <Text numberOfLines={1} style={styles.warName}>{faction.nom}</Text>
                  {selected ? <View style={styles.minePill}><Text style={styles.minePillText}>MA FACTION</Text></View> : null}
                </View>
                <Text numberOfLines={1} style={styles.warMeta}>{gameLabel(faction.jeu)} · {relicProgress.current.name}</Text>
              </View>
              <View style={styles.warScore}>
                <Text style={styles.warMembers}>{formatNumber(faction.membres)}</Text>
                <Text style={styles.warMemberLabel}>SUPPORTERS</Text>
                <Text style={[
                  styles.warGrowth,
                  faction.croissance_7j > 0 && styles.warGrowthPositive,
                  faction.croissance_7j < 0 && styles.warGrowthNegative,
                ]}>{signed(faction.croissance_7j)} EN 7 J</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function FactionMemberRanking({ faction, me }: { faction: CommunityFaction; me: CommunityMe }) {
  const { equipped } = useCosmetics();
  const ranking = me.top_activite.length ? me.top_activite : [fallbackActivity(me)];
  const placement = me.rang_activite && me.total_activite
    ? `#${me.rang_activite} SUR ${me.total_activite}`
    : 'EN PLACEMENT';

  return (
    <View style={styles.memberSection}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionEyebrow}>DANS TA FACTION</Text>
          <Text style={styles.sectionTitle}>TON CLASSEMENT {faction.tag}</Text>
        </View>
        <Text style={styles.memberPlacement}>{placement}</Text>
      </View>

      <View style={styles.memberSummary}>
        <View style={styles.memberRankBlock}>
          <Text style={styles.memberRankValue}>{me.rang_activite ? `#${me.rang_activite}` : '—'}</Text>
          <Text style={styles.memberRankLabel}>RANG INTERNE</Text>
        </View>
        <View style={styles.memberDivider} />
        <MemberStat label="CALLS · 7J" value={String(me.pronos_7j)} />
        <MemberStat label="VALIDÉS" value={String(me.gagnes_7j)} />
        <MemberStat label="FRAGS · 7J" value={signed(me.delta_frags_7j)} featured />
      </View>

      <View style={styles.memberList}>
        {ranking.slice(0, 5).map((person) => (
          <FactionMemberRow cosmetics={equipped} key={person.user_id} person={person} mine={person.user_id === me.user_id} />
        ))}
      </View>
    </View>
  );
}

function MemberStat({ featured = false, label, value }: { featured?: boolean; label: string; value: string }) {
  return (
    <View style={styles.memberStat}>
      <Text style={[styles.memberStatValue, featured && styles.memberStatValueFeatured]}>{value}</Text>
      <Text style={styles.memberStatLabel}>{label}</Text>
    </View>
  );
}

function SupporterGroupIcon() {
  return (
    <View pointerEvents="none" style={styles.supporterGlyph}>
      <View style={[styles.supporterHead, styles.supporterHeadLeft]} />
      <View style={[styles.supporterHead, styles.supporterHeadCenter]} />
      <View style={[styles.supporterHead, styles.supporterHeadRight]} />
      <View style={[styles.supporterShoulder, styles.supporterShoulderLeft]} />
      <View style={[styles.supporterShoulder, styles.supporterShoulderCenter]} />
      <View style={[styles.supporterShoulder, styles.supporterShoulderRight]} />
    </View>
  );
}

function FactionMemberRow({ cosmetics, mine, person }: { cosmetics: EquippedCosmetics; mine: boolean; person: CommunityActivity }) {
  return (
    <View style={[styles.memberRow, mine && styles.memberRowMine]}>
      <Text style={[styles.memberRowRank, mine && styles.memberRowRankMine]}>#{person.rang}</Text>
      {mine
        ? <CosmeticAvatar cosmetics={cosmetics} label={person.pseudo} size={42} />
        : <View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{initials(person.pseudo)}</Text></View>}
      <View style={styles.memberCopy}>
        <Text numberOfLines={1} style={styles.memberName}>{person.pseudo}{mine ? ' · TOI' : ''}</Text>
        <Text style={styles.memberMeta}>{person.pronos_7j} call{person.pronos_7j > 1 ? 's' : ''} · {person.gagnes_7j} validé{person.gagnes_7j > 1 ? 's' : ''}</Text>
      </View>
      <Text style={styles.memberPrecision}>{person.pronos_7j ? `${Math.round((person.gagnes_7j / person.pronos_7j) * 100)}%` : '—'}</Text>
    </View>
  );
}

export function EmptyFactions() {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyMark}>✦</Text>
      <Text style={styles.emptyTitle}>LA GUERRE N’A PAS ENCORE COMMENCÉ.</Text>
      <Text style={styles.emptyText}>Les factions et leur classement apparaîtront ici dès que les premières équipes seront actives.</Text>
    </View>
  );
}

export function FactionHeroSkeleton() {
  return <View style={styles.heroSkeleton}><View style={styles.skeletonTitle} /><View style={styles.skeletonRelic} /><View style={styles.skeletonLine} /></View>;
}

function fallbackActivity(me: CommunityMe): CommunityActivity {
  return {
    user_id: me.user_id,
    pseudo: me.pseudo,
    pronos_7j: me.pronos_7j,
    gagnes_7j: me.gagnes_7j,
    rang: me.rang_activite ?? 1,
  };
}

function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(value); }
function signed(value: number) { return `${value >= 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`; }
function initials(value: string) {
  const parts = value.trim().split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase();
}
