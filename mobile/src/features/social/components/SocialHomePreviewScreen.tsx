import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { previewRoutesEnabled } from '@/src/components/dev/PreviewRoute';
import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
import ProfileHeaderButton from '@/src/features/profile/components/ProfileHeaderButton';
import { COMMUNITY_FORMS } from '@/src/features/social/faction/constants';
import type {
  RelicDiagnostics,
  SupporterContributionPresentation,
} from '@/src/features/social/faction/relicState';
import { relicContainerForPreview } from '@/src/features/social/faction/relicArtwork';
import type { CommunityData, CommunityFaction, CommunityMutationPresentation } from '@/src/features/social/faction/types';
import { communityFormForLevel, factionProgress } from '@/src/features/social/faction/utils';
import { colors, typography } from '@/src/theme';

import { SocialHomeExperience, type FactionHeroVariant } from './SocialHomeScreen';
import SocialSectionNav from './SocialSectionNav';

const PREVIEW_COMMUNITY: CommunityData = {
  factions: [
    previewFaction('g2', 'G2 Esports', 'G2', 1, 18),
    previewFaction('fnc', 'Fnatic', 'FNC', 1, 12),
    previewFaction('kc', 'Karmine Corp', 'KC', 1, 21, true),
    previewFaction('bds', 'Team BDS', 'BDS', 1, 8),
    previewFaction('th', 'Team Heretics', 'TH', 1, 5),
    previewFaction('sk', 'SK Gaming', 'SK', 1, 3),
  ],
  moi: {
    user_id: 'preview-user',
    pseudo: 'Pierre-Louis',
    equipe_id: 'kc',
    membre_depuis: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    pronos_depuis: 84,
    mutations_vecues: 3,
    pronos_7j: 12,
    gagnes_7j: 8,
    delta_frags_7j: 36,
    rang_activite: 4,
    total_activite: 218,
    top_activite: [
      { user_id: 'member-1', pseudo: 'Aiden', pronos_7j: 19, gagnes_7j: 14, rang: 1 },
      { user_id: 'member-2', pseudo: 'Kayo', pronos_7j: 17, gagnes_7j: 12, rang: 2 },
      { user_id: 'member-3', pseudo: 'Nova', pronos_7j: 14, gagnes_7j: 10, rang: 3 },
      { user_id: 'preview-user', pseudo: 'Pierre-Louis', pronos_7j: 12, gagnes_7j: 8, rang: 4 },
      { user_id: 'member-5', pseudo: 'Ryu', pronos_7j: 11, gagnes_7j: 7, rang: 5 },
    ],
    archives: [],
    mutation_a_presenter: null,
  },
};

const CHARGE_PRESETS = [0, 1, 99, 100, 499, 500, 1_999, 2_000, 4_999, 5_000, 9_999, 10_000];
const TESTABLE_FORMS = COMMUNITY_FORMS.filter((form) => form.level >= 1 && form.level <= 5);
const MUTATION_TRANSITIONS = [
  { fromLevel: 1, toLevel: 2 },
  { fromLevel: 2, toLevel: 3 },
  { fromLevel: 3, toLevel: 4 },
  { fromLevel: 4, toLevel: 5 },
  { fromLevel: 5, toLevel: 6 },
  { fromLevel: 1, toLevel: 5 },
] as const;

export default function SocialHomePreviewScreen({
  factionHeroVariant = 'current',
  lab = false,
}: {
  factionHeroVariant?: FactionHeroVariant;
  lab?: boolean;
}) {
  const {
    activity,
    clean,
    form,
    instability: instabilityParam,
    lab: labParam,
    mutationFrom: mutationFromParam,
    mutationTo: mutationToParam,
  } = useLocalSearchParams<{
    activity?: string;
    clean?: string;
    form?: string;
    instability?: string;
    lab?: string;
    mutationFrom?: string;
    mutationTo?: string;
  }>();
  const showLab = lab || labParam === '1' || clean === '0';
  const requestedContainer = relicContainerForPreview(form);
  const requestedForm = TESTABLE_FORMS.find((item) => item.container === requestedContainer) ?? TESTABLE_FORMS[0];
  const requestedInstability = parseInstabilityPercent(instabilityParam);
  const requestedMutationFrom = mutationFromParam ? previewMutationLevel(mutationFromParam) : null;
  const requestedMutationTo = mutationToParam ? previewMutationLevel(mutationToParam) : null;
  const [charge, setCharge] = useState(() => chargeForInstability(requestedForm.level, requestedInstability));
  const [instabilityOverride, setInstabilityOverride] = useState<{ charge: number; objective: number } | undefined>(
    requestedInstability === null ? undefined : { charge: requestedInstability, objective: 100 },
  );
  const [mutation, setMutation] = useState<CommunityMutationPresentation | null>(null);
  const [selectedMutation, setSelectedMutation] = useState({ fromLevel: 1, toLevel: 2 });
  const [presentedMutationEventId, setPresentedMutationEventId] = useState<string | null>(null);
  const [supporterContribution, setSupporterContribution] = useState<SupporterContributionPresentation | null>(null);
  const [diagnostics, setDiagnostics] = useState<RelicDiagnostics>({
    tier: 'calm',
    ratio: 0,
    mutationFromForm: null,
    mutationToForm: null,
    mutationEventId: null,
    mutationEventPresented: false,
  });
  const previewSessionId = useRef(Date.now().toString(36));
  const eventSequence = useRef(0);
  const previewProgress = factionProgress(charge);
  const relicProgressOverride = instabilityOverride ? {
    ...previewProgress,
    charge: instabilityOverride.charge >= instabilityOverride.objective
      ? previewProgress.objective
      : previewProgress.charge,
    progress: Math.max(0, Math.min(1, instabilityOverride.charge / instabilityOverride.objective)),
    remaining: instabilityOverride.charge >= instabilityOverride.objective
      ? 0
      : previewProgress.remaining,
  } : undefined;
  const data = useMemo<CommunityData>(() => {
    const moi = activity === 'empty' && PREVIEW_COMMUNITY.moi
      ? {
          ...PREVIEW_COMMUNITY.moi,
          pseudo: 'FabTheTap',
          pronos_7j: 0,
          gagnes_7j: 0,
          delta_frags_7j: 0,
          rang_activite: 1,
          total_activite: 1,
          top_activite: [],
        }
      : PREVIEW_COMMUNITY.moi;

    return {
      ...PREVIEW_COMMUNITY,
      moi,
      factions: PREVIEW_COMMUNITY.factions.map((faction) => faction.equipe_id === 'kc'
        ? { ...faction, membres: charge, niveau_atteint: factionProgress(charge).level }
        : faction),
    };
  }, [activity, charge]);

  useEffect(() => {
    if (requestedMutationFrom !== null && requestedMutationTo !== null && requestedMutationTo > requestedMutationFrom) {
      const target = communityFormForLevel(requestedMutationTo);
      eventSequence.current += 1;
      const nextMutation = {
        id: `preview-query-mutation-${previewSessionId.current}-${eventSequence.current}`,
        from_level: requestedMutationFrom,
        to_level: requestedMutationTo,
        name: target.name,
        threshold: target.threshold,
        reward: target.reward,
        awakened: target.state === 'awakened',
        occurred_at: new Date().toISOString(),
      } satisfies CommunityMutationPresentation;
      setCharge(target.threshold);
      setInstabilityOverride(undefined);
      setSupporterContribution(null);
      setSelectedMutation({ fromLevel: requestedMutationFrom, toLevel: requestedMutationTo });
      setPresentedMutationEventId(null);
      setMutation(nextMutation);
      return;
    }
    setCharge(chargeForInstability(requestedForm.level, requestedInstability));
    setInstabilityOverride(requestedInstability === null
      ? undefined
      : { charge: requestedInstability, objective: 100 });
    setMutation(null);
    setSupporterContribution(null);
  }, [requestedForm.level, requestedInstability, requestedMutationFrom, requestedMutationTo]);

  if (!previewRoutesEnabled) return <Redirect href="/" />;

  const playMutation = (fromLevel: number, toLevel: number) => {
    const target = communityFormForLevel(toLevel);
    eventSequence.current += 1;
    setInstabilityOverride(undefined);
    setSupporterContribution(null);
    setCharge(target.threshold);
    setSelectedMutation({ fromLevel, toLevel });
    setPresentedMutationEventId(null);
    setMutation({
      id: `preview-mutation-${previewSessionId.current}-${eventSequence.current}`,
      from_level: fromLevel,
      to_level: toLevel,
      name: target.name,
      threshold: target.threshold,
      reward: target.reward,
      awakened: target.state === 'awakened',
      occurred_at: new Date().toISOString(),
    });
  };

  const selectForm = (level: number) => {
    const preservedInstability = instabilityOverride
      ? Math.round((instabilityOverride.charge / Math.max(1, instabilityOverride.objective)) * 100)
      : null;
    setCharge(chargeForInstability(level, preservedInstability));
    setMutation(null);
    setSupporterContribution(null);
  };

  const playSupporterArrival = (amount: number) => {
    eventSequence.current += 1;
    const fromCharge = charge;
    const toCharge = Math.min(50_000, fromCharge + amount);
    setMutation(null);
    setInstabilityOverride(undefined);
    setCharge(toCharge);
    setSupporterContribution({
      id: `preview-supporter-${Date.now()}-${eventSequence.current}`,
      amount,
      fromCharge,
      toCharge,
    });
  };

  const selectInstability = (percent: number) => {
    const level = Math.max(1, previewProgress.current.level);
    setCharge(chargeForInstability(level, percent));
    setInstabilityOverride({ charge: percent, objective: 100 });
    setMutation(null);
    setSupporterContribution(null);
  };

  const experience = (
      <View style={{ flex: 1 }}>
        <GriffHeader
          economy={{ frags: 1842, volts: 680 }}
          leading={<ProfileHeaderButton preview />}
          variant="wallet"
        />
        <SocialSectionNav activeOverride="faction" variant={factionHeroVariant === 'v2' ? 'v2' : 'default'} />
        {showLab ? <View style={previewStyles.panel}>
          <View style={previewStyles.panelTop}>
            <View>
              <Text style={previewStyles.eyebrow}>LABO RELIQUE · DEV UNIQUEMENT</Text>
              <Text style={previewStyles.title}>{previewProgress.current.name.toUpperCase()} · {charge.toLocaleString('fr-FR')}</Text>
            </View>
          </View>
          <View style={previewStyles.controlRow}>
            <Text style={previewStyles.controlLabel}>RÉCIPIENTS</Text>
            <ScrollView contentContainerStyle={previewStyles.chips} horizontal showsHorizontalScrollIndicator={false} style={previewStyles.controlScroll}>
              {TESTABLE_FORMS.map((form) => (
                <Pressable
                  accessibilityLabel={`Afficher le récipient ${form.name}`}
                  accessibilityRole="button"
                  key={form.state}
                  onPress={() => selectForm(form.level)}
                  style={[previewStyles.chip, previewProgress.current.container === form.container && previewStyles.chipActive]}
                >
                  <Text style={[previewStyles.chipText, previewProgress.current.container === form.container && previewStyles.chipTextActive]}>{form.code} · {form.name.toUpperCase()}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={previewStyles.controlRow}>
            <Text style={previewStyles.controlLabel}>SUPPORTERS</Text>
            <View style={previewStyles.chips}>
              {[1, 5, 20].map((amount) => (
                <Pressable
                  accessibilityLabel={`Ajouter ${amount} supporter${amount > 1 ? 's' : ''}`}
                  accessibilityRole="button"
                  key={amount}
                  onPress={() => playSupporterArrival(amount)}
                  style={previewStyles.supporterButton}
                >
                  <Text style={previewStyles.supporterText}>+{amount} SUPPORTER{amount > 1 ? 'S' : ''}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={previewStyles.controlRow}>
            <Text style={previewStyles.controlLabel}>INSTABILITÉ</Text>
            <ScrollView contentContainerStyle={previewStyles.chips} horizontal showsHorizontalScrollIndicator={false} style={previewStyles.controlScroll}>
              {[49, 50, 74, 75, 89, 90, 99, 100].map((percent) => (
                <Pressable
                  accessibilityLabel={`Afficher la progression à ${percent} pour cent`}
                  accessibilityRole="button"
                  key={percent}
                  onPress={() => selectInstability(percent)}
                  style={[previewStyles.chip, instabilityOverride?.charge === percent && previewStyles.chipActive]}
                >
                  <Text style={[previewStyles.chipText, instabilityOverride?.charge === percent && previewStyles.chipTextActive]}>{percent} %</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={previewStyles.controlRow}>
            <Text style={previewStyles.controlLabel}>MUTATIONS</Text>
            <ScrollView contentContainerStyle={previewStyles.chips} horizontal showsHorizontalScrollIndicator={false} style={previewStyles.controlScroll}>
              {MUTATION_TRANSITIONS.map((transition) => (
                <Pressable
                  accessibilityRole="button"
                  key={`${transition.fromLevel}-${transition.toLevel}`}
                  onPress={() => playMutation(transition.fromLevel, transition.toLevel)}
                  style={[
                    previewStyles.mutationButton,
                    selectedMutation.fromLevel === transition.fromLevel
                      && selectedMutation.toLevel === transition.toLevel
                      && previewStyles.mutationButtonActive,
                  ]}
                >
                  <Text style={previewStyles.mutationText}>{communityFormForLevel(transition.fromLevel).name.toUpperCase()} → {communityFormForLevel(transition.toLevel).name.toUpperCase()}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={previewStyles.chargeEditor}>
            <Text style={previewStyles.controlLabel}>CHARGE</Text>
            <Pressable onPress={() => { setInstabilityOverride(undefined); setSupporterContribution(null); setCharge((value) => Math.max(0, value - 100)); }} style={previewStyles.stepButton}><Text style={previewStyles.stepText}>−100</Text></Pressable>
            <TextInput
              accessibilityLabel="Charge artificielle de la relique"
              keyboardType="number-pad"
              onChangeText={(value) => {
                setInstabilityOverride(undefined);
                setSupporterContribution(null);
                setCharge(Math.max(0, Math.min(50_000, Number(value.replace(/\D/g, '')) || 0)));
              }}
              style={previewStyles.input}
              value={String(charge)}
            />
            <Pressable onPress={() => { setInstabilityOverride(undefined); setSupporterContribution(null); setCharge((value) => Math.min(50_000, value + 100)); }} style={previewStyles.stepButton}><Text style={previewStyles.stepText}>+100</Text></Pressable>
            <ScrollView contentContainerStyle={previewStyles.chips} horizontal showsHorizontalScrollIndicator={false} style={previewStyles.controlScroll}>
              {CHARGE_PRESETS.map((value) => (
                <Pressable key={value} onPress={() => { setCharge(value); setMutation(null); setInstabilityOverride(undefined); setSupporterContribution(null); }} style={[previewStyles.chip, charge === value && previewStyles.chipActive]}>
                  <Text style={[previewStyles.chipText, charge === value && previewStyles.chipTextActive]}>{value.toLocaleString('fr-FR')}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={previewStyles.diagnostics}>
            <Text style={previewStyles.diagnostic}>TIER · {diagnostics.tier}</Text>
            <Text style={previewStyles.diagnostic}>RATIO · {(diagnostics.ratio * 100).toFixed(1)} %</Text>
            <Text style={previewStyles.diagnostic}>DE · {diagnostics.mutationFromForm ?? '—'}</Text>
            <Text style={previewStyles.diagnostic}>VERS · {diagnostics.mutationToForm ?? '—'}</Text>
            <Text style={previewStyles.diagnostic}>EVENT · {diagnostics.mutationEventId ?? presentedMutationEventId ?? '—'}</Text>
            <Text style={previewStyles.diagnostic}>PRÉSENTÉ · {diagnostics.mutationEventPresented || Boolean(presentedMutationEventId) ? 'OUI' : 'NON'}</Text>
          </View>
        </View> : null}
        <SocialHomeExperience
          data={data}
          error={null}
          factionHeroVariant={factionHeroVariant}
          favoriteTeamId="kc"
          instabilityPreviewOverride={instabilityOverride}
          loading={false}
          mutationOverride={mutation}
          onRelicDiagnosticsChange={setDiagnostics}
          relicProgressOverride={relicProgressOverride}
          onMutationPresented={(eventId) => {
            setPresentedMutationEventId(eventId);
            setMutation((current) => current?.id === eventId ? null : current);
          }}
          onSupporterContributionPresented={(contributionId) => setSupporterContribution((current) => (
            current?.id === contributionId ? null : current
          ))}
          refreshing={false}
          supporterContribution={supporterContribution}
          onRefresh={noop}
          onRetry={noop}
        />
    </View>
  );

  return <Screen>{experience}</Screen>;
}

function previewFaction(
  equipe_id: string,
  nom: string,
  tag: string,
  membres: number,
  croissance_7j: number,
  moi = false,
): CommunityFaction {
  return {
    equipe_id,
    nom,
    tag,
    jeu: 'lol',
    logo: null,
    membres,
    niveau_atteint: factionProgress(membres).level,
    croissance_24h: Math.max(1, Math.round(croissance_7j / 3)),
    croissance_7j,
    moi,
    dernier_evenement_id: null,
    dernier_evenement_niveau: null,
    dernier_evenement_nom: null,
    dernier_evenement_le: null,
    dernier_evenement_recompense_volts: 0,
  };
}

function parseInstabilityPercent(value: string | undefined) {
  if (value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, parsed));
}

function chargeForInstability(level: number, percent: number | null) {
  const current = communityFormForLevel(level);
  if (percent === null) return current.threshold;
  const next = communityFormForLevel(Math.min(6, level + 1));
  const span = Math.max(1, next.threshold - current.threshold);
  const visualRatio = Math.min(.999, Math.max(0, percent / 100));
  return Math.min(next.threshold - 1, current.threshold + Math.floor(span * visualRatio));
}

function previewMutationLevel(value: string) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 6) return Math.floor(numeric);
  const container = relicContainerForPreview(value.toLowerCase());
  return TESTABLE_FORMS.find((form) => form.container === container)?.level ?? 1;
}

function noop() {}

const previewStyles = StyleSheet.create({
  panel: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, backgroundColor: '#0B1218', borderBottomWidth: 1, borderBottomColor: '#2C361B' },
  panelTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .6 },
  title: { ...typography.label, marginTop: 3, color: '#E8ECE9' },
  controlRow: { minHeight: 31, flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlScroll: { flex: 1 },
  controlLabel: { ...typography.label, width: 82, flexShrink: 0, color: '#87939A' },
  chargeEditor: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 7 },
  stepButton: { minHeight: 30, paddingHorizontal: 9, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111A22' },
  stepText: { ...typography.label, color: '#C8D0D4' },
  input: { width: 86, height: 32, paddingHorizontal: 9, borderRadius: 10, color: '#F3F5F4', backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#3A461F', textAlign: 'center' },
  chips: { gap: 6, paddingRight: 12 },
  chip: { minHeight: 27, paddingHorizontal: 9, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111A22', borderWidth: 1, borderColor: '#2B353B' },
  chipActive: { backgroundColor: colors.volt, borderColor: colors.volt },
  chipText: { ...typography.label, color: '#8D999F' },
  chipTextActive: { color: '#080B0D' },
  supporterButton: { minHeight: 29, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B170C', borderWidth: 1, borderColor: '#6D5427' },
  supporterText: { ...typography.label, color: '#F1C56D' },
  mutationButton: { minHeight: 29, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17170E', borderWidth: 1, borderColor: '#615128' },
  mutationButtonActive: { backgroundColor: '#302814', borderColor: '#D7B773' },
  mutationText: { ...typography.label, color: '#D7B773' },
  diagnostics: { minHeight: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingTop: 2 },
  diagnostic: { ...typography.label, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, color: '#87B6BE', backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#203A42' },
});
