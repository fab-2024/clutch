import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { publicAppUrl } from '@/src/config/release';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { relicSignatureTheme } from '@/src/features/shop/components/CosmeticRenderer';
import CollectiveRelic from '@/src/features/social/faction/components/CollectiveRelic';
import FactionEvolutionRail from '@/src/features/social/faction/components/FactionEvolutionRail';
import {
  resolveRelicInstability,
  type RelicDiagnostics,
  type SupporterContributionPresentation,
} from '@/src/features/social/faction/relicState';
import type {
  CommunityFaction,
  CommunityMe,
  CommunityMutationPresentation,
  FactionProgress,
} from '@/src/features/social/faction/types';
import { factionProgress, gameLabel } from '@/src/features/social/faction/utils';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors, fonts, typography } from '@/src/theme';

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
  const { equipped } = useCosmetics();
  const progress = relicProgressOverride ?? factionProgress(faction?.membres ?? 0, faction?.niveau_atteint);
  const instability = resolveRelicInstability(
    instabilityPreviewOverride?.charge ?? progress.charge,
    instabilityPreviewOverride?.objective ?? progress.objective,
  );
  const signature = relicSignatureTheme(equipped.factionEffect);
  const mutation = mutationOverride === undefined ? me?.mutation_a_presenter : mutationOverride;
  const status = progress.awakened
    ? 'CŒUR ÉVEILLÉ'
    : instability.tier === 'mutationReady'
      ? 'MUTATION PRÊTE'
      : progress.level > 0
        ? `FORME ${progress.current.code}`
        : 'DORMANT';

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
    <View style={styles.hero}>
      <LinearGradient
        colors={['#03090E', '#02070B', '#010407', '#020508']}
        end={{ x: .8, y: 1 }}
        start={{ x: .1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.heroAura, { backgroundColor: signature.aura, boxShadow: signature.glow }]} />
      <View style={styles.coldAura} />

      <View style={styles.heroTop}>
        <View style={styles.heroHeading}>
          <Text style={styles.heroEyebrow}>QG SOCIAL · FACTION</Text>
        </View>
        <View style={styles.levelPill}>
          <View style={styles.levelDot} />
          <Text style={styles.levelText}>{status}</Text>
        </View>
      </View>

      <CollectiveRelic
        compact
        faction={faction}
        instabilityPreviewOverride={instabilityPreviewOverride}
        mutation={mutation}
        onDiagnosticsChange={onRelicDiagnosticsChange}
        onMutationPresented={onMutationPresented}
        onSupporterContributionPresented={onSupporterContributionPresented}
        progress={progress}
        supporterContribution={supporterContribution}
      />

      <View style={styles.identity}>
        <View style={styles.factionSeal}>
          {faction ? (
            <TeamLogo accent={colors.volt} name={faction.nom} size={34} tag={faction.tag} uri={faction.logo} />
          ) : (
            <Text style={styles.relicQuestion}>?</Text>
          )}
        </View>
        <View style={styles.identityCopy}>
          <Text numberOfLines={1} style={styles.factionName}>{faction?.nom.toUpperCase() ?? 'AUCUNE FACTION'}</Text>
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

      {faction ? (
        <View style={styles.progressBlock}>
          <Text style={styles.relicForm}>RELIQUE · {progress.current.name.toUpperCase()}</Text>
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
            style={styles.progressMeter}
          >
            <RelicProgressArcs />
            <View style={styles.progressContent}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={.68}
                numberOfLines={1}
                style={styles.progressCount}
              >
                <Text style={styles.progressCharge}>{progress.max ? '10 000+' : formatNumber(progress.charge)}</Text>
                {!progress.max ? <Text style={styles.progressObjective}> / {formatNumber(progress.objective)}</Text> : null}
              </Text>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={.72}
                numberOfLines={1}
                style={styles.thresholdText}
              >
                <Text style={styles.thresholdValue}>{progress.max ? 'MAX' : formatNumber(progress.remaining)}</Text>
                <Text style={styles.thresholdLabel}>
                  {progress.max ? '  FORME TERMINALE' : `  AVANT ${progress.next?.name.toUpperCase()}`}
                </Text>
              </Text>
            </View>
          </View>

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
  );
}

function RelicProgressArcs() {
  return (
    <Svg
      preserveAspectRatio="none"
      style={styles.progressArcs}
      testID="relic-progress-arcs"
      viewBox="0 0 400 112"
      width="100%"
      height="100%"
    >
      <Path
        d="M 22 55 C 92 13 308 13 378 55"
        fill="none"
        opacity={.12}
        stroke={colors.volt}
        strokeLinecap="round"
        strokeWidth={12}
      />
      <Path
        d="M 43 72 C 112 104 288 104 357 72"
        fill="none"
        opacity={.1}
        stroke={colors.volt}
        strokeLinecap="round"
        strokeWidth={10}
      />
      <Path
        d="M 22 55 C 92 13 308 13 378 55"
        fill="none"
        opacity={.86}
        stroke={colors.volt}
        strokeLinecap="round"
        strokeWidth={2.5}
      />
      <Path
        d="M 43 72 C 112 104 288 104 357 72"
        fill="none"
        opacity={.92}
        stroke={colors.volt}
        strokeLinecap="round"
        strokeWidth={3}
      />
    </Svg>
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

const styles = StyleSheet.create({
  hero: {
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: -18,
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#010406',
  },
  heroAura: {
    position: 'absolute',
    width: 330,
    height: 330,
    left: 30,
    top: 62,
    borderRadius: 165,
    opacity: .42,
  },
  coldAura: {
    position: 'absolute',
    width: 330,
    height: 360,
    left: -90,
    top: 90,
    borderRadius: 180,
    backgroundColor: 'rgba(23,123,145,.035)',
    boxShadow: '0 0 84px rgba(32,140,162,.055)',
  },
  heroTop: {
    zIndex: 6,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroHeading: { flex: 1, minWidth: 0 },
  heroEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .9 },
  levelPill: {
    flexShrink: 0,
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(5,10,14,.84)',
    borderWidth: 1,
    borderColor: '#30414B',
  },
  levelDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.volt },
  levelText: { ...typography.label, color: '#D6DCE0', letterSpacing: .3 },
  relicQuestion: { ...typography.metricSmall, color: colors.volt },
  identity: {
    zIndex: 4,
    minHeight: 62,
    marginHorizontal: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 11,
    backgroundColor: 'rgba(4,9,13,.96)',
    borderWidth: 1,
    borderColor: '#2B3A43',
  },
  factionSeal: {
    width: 45,
    height: 45,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#060A0D',
    borderWidth: 1,
    borderColor: colors.volt,
  },
  identityCopy: { flex: 1, minWidth: 0 },
  factionName: { ...typography.bodyStrong, color: '#F8F9F7', letterSpacing: .1 },
  factionMeta: { ...typography.caption, marginTop: 2, color: '#8D99A2' },
  growthBlock: { flexShrink: 0, alignItems: 'flex-end' },
  growthLabel: { ...typography.label, color: colors.textMuted, letterSpacing: .15 },
  growthValue: { ...typography.metricSmall, marginTop: 1, color: colors.volt },
  progressBlock: { zIndex: 4, marginTop: 8 },
  relicForm: {
    color: colors.volt,
    fontFamily: fonts.displayBold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: .45,
  },
  progressMeter: {
    position: 'relative',
    minHeight: 112,
    marginTop: -1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressArcs: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  progressContent: {
    zIndex: 2,
    width: '100%',
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCount: {
    width: '100%',
    color: '#F0F2F2',
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 31,
    letterSpacing: -.45,
    textAlign: 'center',
  },
  progressCharge: { color: colors.volt, fontFamily: fonts.display, fontSize: 30, lineHeight: 32 },
  progressObjective: { color: '#F0F2F2', fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
  thresholdText: {
    width: '100%',
    marginTop: 3,
    color: '#AEB7BD',
    fontFamily: fonts.displayBold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: .15,
    textAlign: 'center',
  },
  thresholdValue: { color: colors.volt, fontFamily: fonts.display, fontSize: 20, lineHeight: 21 },
  thresholdLabel: { color: '#AEB7BD', fontFamily: fonts.displayBold, fontSize: 14, lineHeight: 18 },
  inviteButton: {
    minHeight: 59,
    marginTop: 3,
    marginHorizontal: 9,
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
