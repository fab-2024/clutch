import type { ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Triangle from 'lucide-react-native/icons/triangle';
import UsersRound from 'lucide-react-native/icons/users-round';
import {
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { publicAppUrl } from '@/src/config/release';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import CollectiveRelic from '@/src/features/social/faction/components/CollectiveRelic';
import FactionEvolutionRail from '@/src/features/social/faction/components/FactionEvolutionRail';
import type {
  RelicDiagnostics,
  SupporterContributionPresentation,
} from '@/src/features/social/faction/relicState';
import type {
  CommunityFaction,
  CommunityMe,
  CommunityMutationPresentation,
  FactionProgress,
} from '@/src/features/social/faction/types';
import { factionProgress, gameLabel } from '@/src/features/social/faction/utils';
import { colors, fonts, typography } from '@/src/theme';
import { resolveTeamAccent } from '@/src/utils/teamColors';

type FactionRelicHeroV2Props = {
  faction: CommunityFaction | null;
  instabilityPreviewOverride?: { charge: number; objective: number };
  me: CommunityMe | null;
  mutationOverride?: CommunityMutationPresentation | null;
  onMutationPresented?: (eventId: string) => Promise<void> | void;
  onRelicDiagnosticsChange?: (diagnostics: RelicDiagnostics) => void;
  onSupporterContributionPresented?: (contributionId: string) => Promise<void> | void;
  relicProgressOverride?: FactionProgress;
  supporterContribution?: SupporterContributionPresentation | null;
};

export default function FactionRelicHeroV2({
  faction,
  instabilityPreviewOverride,
  me,
  mutationOverride,
  onMutationPresented,
  onRelicDiagnosticsChange,
  onSupporterContributionPresented,
  relicProgressOverride,
  supporterContribution,
}: FactionRelicHeroV2Props) {
  const { width: viewportWidth } = useWindowDimensions();
  const progress = relicProgressOverride ?? factionProgress(faction?.membres ?? 0, faction?.niveau_atteint);
  const mutation = mutationOverride === undefined ? me?.mutation_a_presenter : mutationOverride;
  const teamAccent = resolveTeamAccent({ name: faction?.nom, tag: faction?.tag });
  const hudAccent = relicHudAccent(faction, teamAccent);
  const progressPercent = Math.round(progress.progress * 100);
  const sceneHeight = relicSceneHeightForWidth(viewportWidth);

  async function inviteSupporters() {
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
      // Dismissing the system share sheet must not alter faction state.
    }
  }

  return (
    <>
      <View style={styles.identityHeader}>
        <View style={styles.identity}>
          <View style={styles.factionSeal}>
            {faction ? (
              <TeamLogo accent={teamAccent} contentScale={1} frameless name={faction.nom} size={54} tag={faction.tag} uri={faction.logo} />
            ) : (
              <Text style={styles.relicQuestion}>?</Text>
            )}
          </View>
          <View style={styles.identityCopy}>
            <Text adjustsFontSizeToFit minimumFontScale={.8} numberOfLines={1} style={styles.factionName}>{faction?.nom.toUpperCase() ?? 'AUCUNE FACTION'}</Text>
            <Text numberOfLines={2} style={styles.factionMeta}>
              {faction
                ? `${gameLabel(faction.jeu)} · ${formatNumber(progress.charge)} MEMBRE${progress.charge > 1 ? 'S' : ''}`
                : 'UNE RELIQUE ATTEND TES COULEURS'}
            </Text>
          </View>
          {faction ? (
            <View style={styles.growthBlock}>
              <Text style={styles.growthLabel}>ÉVOLUTION · 7 J</Text>
              <Text style={styles.growthValue}>{signed(faction.croissance_7j)}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.hero}>
        <LinearGradient
          colors={['#03090E', '#02070B', '#010407', '#020508']}
          end={{ x: .8, y: 1 }}
          start={{ x: .1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <CollectiveRelic
          accent={teamAccent}
          compact
          faction={faction}
          instabilityPreviewOverride={instabilityPreviewOverride}
          mutation={mutation}
          replayMutation={me?.derniere_mutation_presentee}
          onDiagnosticsChange={onRelicDiagnosticsChange}
          onMutationPresented={onMutationPresented}
          onSupporterContributionPresented={onSupporterContributionPresented}
          progress={progress}
          sceneHeight={sceneHeight}
          supporterContribution={supporterContribution}
        />

        {faction ? (
          <View style={styles.progressBlock}>
            <View
              accessibilityLabel={`${formatNumber(progress.charge)} supporters sur ${formatNumber(progress.objective)}`}
              accessibilityRole="progressbar"
              accessibilityValue={{
                max: progress.objective,
                min: progress.tierStart,
                now: Math.min(progress.charge, progress.objective),
                text: progress.max
                  ? 'Forme terminale'
                  : `${formatNumber(progress.remaining)} avant ${progress.next?.name ?? 'la prochaine forme'}`,
              }}
              testID="relic-hud"
              style={styles.progressMeter}
            >
              <RelicMetricCard
                accessibilityLabel={`Progression de l’étape, ${progress.max ? 'maximum atteint' : `${progressPercent} pour cent`}`}
                icon={<UsersRound color="#DCE5EA" size={18} strokeWidth={2.2} />}
                label="DE L’ÉTAPE"
                testID="relic-metric-progress"
                value={progress.max ? 'MAX' : `${progressPercent} %`}
              />
              <RelicMetricCard
                accent={hudAccent}
                accessibilityLabel={`Gain récent, ${signed(faction.croissance_24h)} points sur 24 heures`}
                emphasized
                icon={<Triangle color={hudAccent} fill={hudAccent} size={15} strokeWidth={2} testID="relic-metric-accent-icon" />}
                label="SUR 24 H"
                testID="relic-metric-growth"
                unit="PTS"
                value={signed(faction.croissance_24h)}
              />
              <RelicMetricCard
                accessibilityLabel={`${formatNumber(progress.charge)} membres de la faction`}
                icon={<UsersRound color="#DCE5EA" size={18} strokeWidth={2.2} />}
                label="MEMBRES"
                minimumFontScale={.58}
                testID="relic-metric-members"
                value={formatNumber(progress.charge)}
              />
            </View>
            <Text style={styles.lightHint}>L’éclairage s’éteint après la réaction.</Text>

            <Pressable
              accessibilityHint={`Partage une invitation à rejoindre ${faction.nom}`}
              accessibilityLabel="Inviter des supporters"
              accessibilityRole="button"
              onPress={() => void inviteSupporters()}
              style={({ pressed }) => [styles.inviteButton, pressed && styles.pressed]}
            >
              <LinearGradient
                colors={['#EEF933', '#D8E91D', '#B8CC12']}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={styles.inviteSurface}
              >
                <SupporterInviteIcon />
                <Text numberOfLines={2} style={styles.inviteText}>INVITER DES SUPPORTERS</Text>
              </LinearGradient>
            </Pressable>

            <FactionEvolutionRail comfortable progress={progress} />
          </View>
        ) : null}
      </View>
    </>
  );
}

type RelicMetricCardProps = {
  accent?: string;
  accessibilityLabel: string;
  emphasized?: boolean;
  icon: ReactNode;
  label: string;
  minimumFontScale?: number;
  testID: string;
  unit?: string;
  value: string;
};

function RelicMetricCard({ accent = '#DCE5EA', accessibilityLabel, emphasized = false, icon, label, minimumFontScale = .68, testID, unit, value }: RelicMetricCardProps) {
  return (
    <View accessibilityLabel={accessibilityLabel} accessible style={styles.metricCard} testID={testID}>
      <LinearGradient
        colors={['rgba(14,31,42,.98)', 'rgba(5,15,22,.98)', 'rgba(2,8,13,.99)']}
        locations={[0, .46, 1]}
        style={StyleSheet.absoluteFill}
      />
      {emphasized ? (
        <LinearGradient
          colors={[alpha(accent, .13), alpha(accent, 0)]}
          end={{ x: .5, y: 1 }}
          start={{ x: .5, y: 0 }}
          style={styles.metricAccentWash}
        />
      ) : null}
      <View pointerEvents="none" style={styles.metricInnerBorder} />
      <View pointerEvents="none" style={styles.metricTopReflection} />
      <View style={styles.metricContent}>
        <View style={styles.metricIcon}>{icon}</View>
        <View style={styles.metricCopy}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={minimumFontScale}
            numberOfLines={1}
            style={[styles.metricValue, emphasized && { color: accent, textShadowColor: alpha(accent, .48), textShadowRadius: 5 }]}
          >
            {value}{unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
          </Text>
          <Text numberOfLines={1} style={styles.metricLabel}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

function SupporterInviteIcon() {
  return (
    <View pointerEvents="none" style={styles.inviteGlyph}>
      <View style={[styles.inviteHead, styles.inviteHeadLeft]} />
      <View style={[styles.inviteHead, styles.inviteHeadCenter]} />
      <View style={[styles.inviteHead, styles.inviteHeadRight]} />
      <View style={[styles.inviteShoulder, styles.inviteShoulderLeft]} />
      <View style={[styles.inviteShoulder, styles.inviteShoulderCenter]} />
      <View style={[styles.inviteShoulder, styles.inviteShoulderRight]} />
    </View>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function signed(value: number) {
  return `${value >= 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`;
}

export function relicHudAccent(faction: Pick<CommunityFaction, 'nom' | 'tag'> | null, fallback: string) {
  const name = faction?.nom.trim().toLocaleLowerCase('fr-FR');
  const tag = faction?.tag.trim().toLocaleUpperCase('fr-FR');
  return name === 'fnatic' || tag === 'FNC' ? colors.volt : fallback;
}

function alpha(color: string, opacity: number) {
  if (!/^#[\da-f]{6}$/i.test(color)) return color;
  return `${color}${Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0')}`;
}

export function relicSceneHeightForWidth(width: number) {
  if (!Number.isFinite(width)) return 310;
  return Math.max(286, Math.min(324, Math.round(width * .84)));
}

const styles = StyleSheet.create({
  hero: {
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: -18,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 12,
    backgroundColor: '#0B1218',
  },
  relicQuestion: { ...typography.metricSmall, color: colors.text },
  identityHeader: { marginHorizontal: -18, paddingTop: 2, paddingBottom: 4 },
  identity: {
    zIndex: 4,
    minHeight: 82,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(4,9,13,.96)',
    borderWidth: 1,
    borderColor: '#2B3A43',
  },
  factionSeal: {
    width: 54,
    height: 54,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCopy: { flex: 1, minWidth: 0 },
  factionName: { ...typography.bodyStrong, fontSize: 17, lineHeight: 22, color: '#F8F9F7', letterSpacing: .1 },
  factionMeta: { ...typography.caption, fontSize: 11, lineHeight: 16, marginTop: 3, color: '#8D99A2' },
  growthBlock: { flexShrink: 0, alignItems: 'flex-end' },
  growthLabel: { ...typography.label, fontSize: 11, lineHeight: 16, color: colors.textMuted, letterSpacing: .15 },
  growthValue: { ...typography.metricSmall, fontSize: 24, lineHeight: 27, marginTop: 1, color: colors.text },
  progressBlock: { zIndex: 4, backgroundColor: 'transparent' },
  progressMeter: {
    position: 'relative',
    minHeight: 62,
    marginHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  metricCard: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    height: 60,
    overflow: 'hidden',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#316F91',
    backgroundColor: 'rgba(4,13,19,.98)',
    boxShadow: '0 0 9px rgba(47,153,211,.16), inset 0 0 12px rgba(33,111,156,.16)',
  },
  metricAccentWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 32,
  },
  metricInnerBorder: {
    position: 'absolute',
    inset: 3,
    borderRadius: 3.5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(116,190,229,.24)',
  },
  metricTopReflection: {
    position: 'absolute',
    top: 1,
    left: 5,
    right: 5,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(199,229,243,.34)',
  },
  metricContent: {
    flex: 1,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  metricIcon: { width: 19, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  metricCopy: { minWidth: 0, alignItems: 'flex-start', justifyContent: 'center' },
  metricValue: {
    maxWidth: '100%',
    color: '#EDF1EF',
    fontFamily: fonts.displayBold,
    fontSize: 19,
    lineHeight: 20,
    letterSpacing: -.1,
  },
  metricUnit: { fontSize: 9, lineHeight: 10, letterSpacing: .05 },
  metricLabel: {
    marginTop: 1,
    color: '#93A3AD',
    fontFamily: fonts.displayBold,
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: .12,
  },
  lightHint: {
    marginTop: 9,
    marginBottom: 7,
    color: '#81909A',
    fontFamily: fonts.medium,
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
  },
  inviteButton: {
    minHeight: 59,
    marginTop: 3,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 3,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#11180B',
    borderWidth: 1,
    borderColor: '#293214',
    boxShadow: '0 5px 14px rgba(0,0,0,.3)',
  },
  inviteSurface: {
    flex: 1,
    width: '100%',
    minHeight: 51,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: 'rgba(249,255,135,.72)',
  },
  inviteText: {
    flexShrink: 1,
    color: '#090C0E',
    fontFamily: fonts.displayBold,
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: .25,
    textAlign: 'center',
  },
  inviteGlyph: { position: 'relative', width: 27, height: 23 },
  inviteHead: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#090C0E' },
  inviteHeadLeft: { left: 2, top: 4 },
  inviteHeadCenter: { left: 10.5, top: 0 },
  inviteHeadRight: { right: 2, top: 4 },
  inviteShoulder: { position: 'absolute', height: 9, borderWidth: 2, borderColor: '#090C0E', borderBottomWidth: 0 },
  inviteShoulderLeft: { width: 9, left: 0, bottom: 1, borderTopLeftRadius: 7, borderTopRightRadius: 4 },
  inviteShoulderCenter: { width: 12, left: 7.5, bottom: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  inviteShoulderRight: { width: 9, right: 0, bottom: 1, borderTopLeftRadius: 4, borderTopRightRadius: 7 },
  pressed: { opacity: .76, transform: [{ scale: .992 }] },
});
