import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
import { COMMUNITY_FORMS } from '@/src/features/social/faction/constants';
import type {
  RelicMotionDiagnostics,
  RelicMotionCommand,
  RelicMotionCommandKind,
  RelicMotionPreview,
  SupporterContributionPresentation,
} from '@/src/features/social/faction/relicMotion';
import { MUTATION_CAPTURE_TIMES_MS } from '@/src/features/social/faction/relicMotion';
import { relicContainerForPreview } from '@/src/features/social/faction/relicArtwork';
import type { CommunityData, CommunityFaction, CommunityMutationPresentation } from '@/src/features/social/faction/types';
import { communityFormForLevel, factionProgress } from '@/src/features/social/faction/utils';
import { colors, typography } from '@/src/theme';

import { SocialHomeExperience } from './SocialHomeScreen';
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
const MOTION_COMMANDS: { kind: RelicMotionCommandKind; label: string }[] = [
  { kind: 'idle', label: 'REPOS' },
  { kind: 'tap', label: 'TOUCHER RAPIDE' },
  { kind: 'cancelledCharge', label: 'CHARGE ANNULÉE' },
  { kind: 'resonance', label: 'RÉSONANCE' },
];
const MUTATION_TRANSITIONS = [
  { fromLevel: 1, toLevel: 2 },
  { fromLevel: 2, toLevel: 3 },
  { fromLevel: 3, toLevel: 4 },
  { fromLevel: 4, toLevel: 5 },
  { fromLevel: 1, toLevel: 5 },
] as const;

export default function SocialHomePreviewScreen() {
  const {
    clean,
    form,
    instability: instabilityParam,
    motion,
    mutationFrom: mutationFromParam,
    mutationMs: mutationMsParam,
    mutationTo: mutationToParam,
    reduced: reducedParam,
  } = useLocalSearchParams<{
    clean?: string;
    form?: string;
    instability?: string;
    motion?: string;
    mutationFrom?: string;
    mutationMs?: string;
    mutationTo?: string;
    reduced?: string;
  }>();
  const requestedContainer = relicContainerForPreview(form);
  const requestedForm = TESTABLE_FORMS.find((item) => item.container === requestedContainer) ?? TESTABLE_FORMS[0];
  const requestedInstability = parseInstabilityPercent(instabilityParam);
  const requestedMutationFrom = mutationFromParam ? previewMutationLevel(mutationFromParam) : null;
  const requestedMutationTo = mutationToParam ? previewMutationLevel(mutationToParam) : null;
  const requestedMutationMs = parseMutationPreviewMs(mutationMsParam);
  const [charge, setCharge] = useState(() => chargeForInstability(requestedForm.level, requestedInstability));
  const [instabilityOverride, setInstabilityOverride] = useState<{ charge: number; objective: number } | undefined>(
    requestedInstability === null ? undefined : { charge: requestedInstability, objective: 100 },
  );
  const [mutation, setMutation] = useState<CommunityMutationPresentation | null>(null);
  const [mutationInterruptSignal, setMutationInterruptSignal] = useState(0);
  const [mutationPreviewMs, setMutationPreviewMs] = useState<number | null>(null);
  const [selectedMutation, setSelectedMutation] = useState({ fromLevel: 1, toLevel: 2 });
  const [presentedMutationEventId, setPresentedMutationEventId] = useState<string | null>(null);
  const [motionCommand, setMotionCommand] = useState<RelicMotionCommand | null>(null);
  const [supporterContribution, setSupporterContribution] = useState<SupporterContributionPresentation | null>(null);
  const [reduceMotion, setReduceMotion] = useState(reducedParam === '1');
  const [diagnostics, setDiagnostics] = useState<RelicMotionDiagnostics>({
    state: 'idle',
    tier: 'calm',
    ratio: 0,
    pendingAmount: 0,
    aggregatedCount: 0,
    mutationFromForm: null,
    mutationToForm: null,
    mutationElapsedMs: 0,
    mutationEventId: null,
    mutationEventPresented: false,
  });
  const eventSequence = useRef(0);
  const motionSequence = useRef(0);
  const previewScenarioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motionPreviewOverride: RelicMotionPreview | undefined = motion === 'tap'
    ? 'tapPeak'
    : motion === 'resonance'
      ? 'resonancePeak'
      : motion === 'arrival'
        ? 'supporterPeak'
      : undefined;
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
  const data = useMemo<CommunityData>(() => ({
    ...PREVIEW_COMMUNITY,
    factions: PREVIEW_COMMUNITY.factions.map((faction) => faction.equipe_id === 'kc'
      ? { ...faction, membres: charge, niveau_atteint: factionProgress(charge).level }
      : faction),
  }), [charge]);

  useEffect(() => {
    if (requestedMutationFrom !== null && requestedMutationTo !== null && requestedMutationTo > requestedMutationFrom) {
      const target = communityFormForLevel(requestedMutationTo);
      eventSequence.current += 1;
      const nextMutation = {
        id: `preview-query-mutation-${eventSequence.current}`,
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
      setMotionCommand(null);
      setSupporterContribution(null);
      setSelectedMutation({ fromLevel: requestedMutationFrom, toLevel: requestedMutationTo });
      setMutationPreviewMs(requestedMutationMs);
      setPresentedMutationEventId(null);
      setReduceMotion(reducedParam === '1');
      setMutation(nextMutation);
      return;
    }
    setCharge(chargeForInstability(requestedForm.level, requestedInstability));
    setInstabilityOverride(requestedInstability === null
      ? undefined
      : { charge: requestedInstability, objective: 100 });
    setMutation(null);
    setMutationPreviewMs(null);
    setMotionCommand(null);
    setSupporterContribution(null);
    setReduceMotion(reducedParam === '1');
  }, [reducedParam, requestedForm.level, requestedInstability, requestedMutationFrom, requestedMutationMs, requestedMutationTo]);

  useEffect(() => () => {
    if (previewScenarioTimerRef.current) clearTimeout(previewScenarioTimerRef.current);
  }, []);

  if (!__DEV__) return <Redirect href="/" />;

  const playMutation = (fromLevel: number, toLevel: number, freezeMs: number | null = null) => {
    const target = communityFormForLevel(toLevel);
    if (previewScenarioTimerRef.current) clearTimeout(previewScenarioTimerRef.current);
    previewScenarioTimerRef.current = null;
    eventSequence.current += 1;
    setMotionCommand(null);
    setInstabilityOverride(undefined);
    setSupporterContribution(null);
    setCharge(target.threshold);
    setMutationPreviewMs(freezeMs);
    setSelectedMutation({ fromLevel, toLevel });
    setPresentedMutationEventId(null);
    setMutation({
      id: `preview-mutation-${eventSequence.current}`,
      from_level: fromLevel,
      to_level: toLevel,
      name: target.name,
      threshold: target.threshold,
      reward: target.reward,
      awakened: target.state === 'awakened',
      occurred_at: new Date().toISOString(),
    });
  };

  const playInterruptedMutation = () => {
    playMutation(selectedMutation.fromLevel, selectedMutation.toLevel);
    previewScenarioTimerRef.current = setTimeout(() => {
      previewScenarioTimerRef.current = null;
      setMutationInterruptSignal((value) => value + 1);
    }, 1_400);
  };

  const playMutationWithContribution = () => {
    const targetCharge = communityFormForLevel(selectedMutation.toLevel).threshold;
    playMutation(selectedMutation.fromLevel, selectedMutation.toLevel);
    previewScenarioTimerRef.current = setTimeout(() => {
      previewScenarioTimerRef.current = null;
      eventSequence.current += 1;
      setSupporterContribution({
        id: `preview-supporter-during-mutation-${eventSequence.current}`,
        amount: 5,
        fromCharge: targetCharge,
        toCharge: targetCharge + 5,
      });
      setCharge((value) => Math.min(50_000, value + 5));
    }, 900);
  };

  const playMotion = (kind: RelicMotionCommandKind) => {
    motionSequence.current += 1;
    setMutation(null);
    setMutationPreviewMs(null);
    setSupporterContribution(null);
    setMotionCommand({ id: motionSequence.current, kind });
  };

  const selectForm = (level: number) => {
    const form = communityFormForLevel(level);
    setCharge(form.threshold);
    setMutation(null);
    setMutationPreviewMs(null);
    setInstabilityOverride(undefined);
    setSupporterContribution(null);
    playMotion('idle');
  };

  const playSupporterArrival = (amount: number) => {
    eventSequence.current += 1;
    const fromCharge = charge;
    const toCharge = Math.min(50_000, fromCharge + amount);
    setMutation(null);
    setMutationPreviewMs(null);
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
    setMutationPreviewMs(null);
    setSupporterContribution(null);
    playMotion('idle');
  };

  const experience = (
    <View style={{ flex: 1 }}>
        <GriffHeader economy={{ frags: 1842, volts: 680 }} variant="social" />
        <SocialSectionNav activeOverride="faction" />
        {clean !== '1' ? <View style={previewStyles.panel}>
          <View style={previewStyles.panelTop}>
            <View>
              <Text style={previewStyles.eyebrow}>LABO RELIQUE · DEV UNIQUEMENT</Text>
              <Text style={previewStyles.title}>{previewProgress.current.name.toUpperCase()} · {charge.toLocaleString('fr-FR')}</Text>
            </View>
            <Pressable onPress={() => setReduceMotion((value) => !value)} style={[previewStyles.motionButton, reduceMotion && previewStyles.motionButtonActive]}>
              <Text style={[previewStyles.motionText, reduceMotion && previewStyles.motionTextActive]}>MOUVEMENTS RÉDUITS {reduceMotion ? 'ON' : 'OFF'}</Text>
            </Pressable>
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
            <Text style={previewStyles.controlLabel}>ANIMATIONS</Text>
            <ScrollView contentContainerStyle={previewStyles.chips} horizontal showsHorizontalScrollIndicator={false} style={previewStyles.controlScroll}>
              {MOTION_COMMANDS.map((command) => (
                <Pressable
                  accessibilityLabel={`Jouer l’animation ${command.label.toLowerCase()}`}
                  accessibilityRole="button"
                  key={command.kind}
                  onPress={() => playMotion(command.kind)}
                  style={[previewStyles.animationButton, motionCommand?.kind === command.kind && previewStyles.animationButtonActive]}
                >
                  <Text style={[previewStyles.animationText, motionCommand?.kind === command.kind && previewStyles.animationTextActive]}>{command.label}</Text>
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
          <View style={previewStyles.controlRow}>
            <Text style={previewStyles.controlLabel}>TIMELINE</Text>
            <ScrollView contentContainerStyle={previewStyles.chips} horizontal showsHorizontalScrollIndicator={false} style={previewStyles.controlScroll}>
              {MUTATION_CAPTURE_TIMES_MS.map((elapsedMs) => (
                <Pressable
                  accessibilityRole="button"
                  key={elapsedMs}
                  onPress={() => playMutation(selectedMutation.fromLevel, selectedMutation.toLevel, elapsedMs)}
                  style={[previewStyles.chip, mutationPreviewMs === elapsedMs && previewStyles.chipActive]}
                >
                  <Text style={[previewStyles.chipText, mutationPreviewMs === elapsedMs && previewStyles.chipTextActive]}>{elapsedMs} MS</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={previewStyles.controlRow}>
            <Text style={previewStyles.controlLabel}>SCÉNARIOS</Text>
            <View style={previewStyles.chips}>
              <Pressable accessibilityRole="button" onPress={playInterruptedMutation} style={previewStyles.scenarioButton}>
                <Text style={previewStyles.scenarioText}>INTERROMPRE À 1 400 MS</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={playMutationWithContribution} style={previewStyles.scenarioButton}>
                <Text style={previewStyles.scenarioText}>+5 PENDANT MUTATION</Text>
              </Pressable>
            </View>
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
            <Text style={previewStyles.diagnostic}>ÉTAT · {diagnostics.state}</Text>
            <Text style={previewStyles.diagnostic}>TIER · {diagnostics.tier}</Text>
            <Text style={previewStyles.diagnostic}>RATIO · {(diagnostics.ratio * 100).toFixed(1)} %</Text>
            <Text style={previewStyles.diagnostic}>ATTENTE · +{diagnostics.pendingAmount}</Text>
            <Text style={previewStyles.diagnostic}>AGRÉGÉES · {diagnostics.aggregatedCount}</Text>
            <Text style={previewStyles.diagnostic}>DE · {diagnostics.mutationFromForm ?? '—'}</Text>
            <Text style={previewStyles.diagnostic}>VERS · {diagnostics.mutationToForm ?? '—'}</Text>
            <Text style={previewStyles.diagnostic}>TEMPS · {mutationPreviewMs ?? (diagnostics.state === 'mutating' ? 'LIVE / 2 900' : diagnostics.mutationElapsedMs)} MS</Text>
            <Text style={previewStyles.diagnostic}>EVENT · {diagnostics.mutationEventId ?? presentedMutationEventId ?? '—'}</Text>
            <Text style={previewStyles.diagnostic}>PRÉSENTÉ · {diagnostics.mutationEventPresented || Boolean(presentedMutationEventId) ? 'OUI' : 'NON'}</Text>
          </View>
        </View> : null}
        <SocialHomeExperience
          data={data}
          error={null}
          favoriteTeamId="kc"
          instabilityPreviewOverride={instabilityOverride}
          loading={false}
          mutationOverride={mutation}
          mutationInterruptSignal={mutationInterruptSignal}
          mutationPreviewMs={mutationPreviewMs}
          motionPreviewOverride={motionPreviewOverride}
          onRelicDiagnosticsChange={setDiagnostics}
          relicLabMode
          relicMotionCommand={motionCommand}
          relicProgressOverride={relicProgressOverride}
          onMutationPresented={(eventId) => {
            setPresentedMutationEventId(eventId);
            if (mutationPreviewMs === null) {
              setMutation((current) => current?.id === eventId ? null : current);
            }
          }}
          onSupporterContributionPresented={(contributionId) => setSupporterContribution((current) => (
            current?.id === contributionId ? null : current
          ))}
          reduceMotionOverride={reduceMotion}
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
  if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 5) return Math.floor(numeric);
  const container = relicContainerForPreview(value.toLowerCase());
  return TESTABLE_FORMS.find((form) => form.container === container)?.level ?? 1;
}

function parseMutationPreviewMs(value: string | undefined) {
  if (value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(2_900, Math.round(parsed)));
}

function noop() {}

const previewStyles = StyleSheet.create({
  panel: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, backgroundColor: '#0B1013', borderBottomWidth: 1, borderBottomColor: '#2C361B' },
  panelTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .6 },
  title: { ...typography.label, marginTop: 3, color: '#E8ECE9' },
  motionButton: { minHeight: 30, paddingHorizontal: 9, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#161D20', borderWidth: 1, borderColor: '#354047' },
  motionButtonActive: { backgroundColor: '#202A11', borderColor: '#64752B' },
  motionText: { ...typography.label, color: '#829099' },
  motionTextActive: { color: colors.volt },
  controlRow: { minHeight: 31, flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlScroll: { flex: 1 },
  controlLabel: { ...typography.label, width: 82, flexShrink: 0, color: '#87939A' },
  chargeEditor: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 7 },
  stepButton: { minHeight: 30, paddingHorizontal: 9, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151C20' },
  stepText: { ...typography.label, color: '#C8D0D4' },
  input: { width: 86, height: 32, paddingHorizontal: 9, borderRadius: 10, color: '#F3F5F4', backgroundColor: '#070A0C', borderWidth: 1, borderColor: '#3A461F', textAlign: 'center' },
  chips: { gap: 6, paddingRight: 12 },
  chip: { minHeight: 27, paddingHorizontal: 9, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#13191D', borderWidth: 1, borderColor: '#2B353B' },
  chipActive: { backgroundColor: colors.volt, borderColor: colors.volt },
  chipText: { ...typography.label, color: '#8D999F' },
  chipTextActive: { color: '#080B0D' },
  animationButton: { minHeight: 29, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C171C', borderWidth: 1, borderColor: '#24505A' },
  animationButtonActive: { backgroundColor: '#12323B', borderColor: '#31D7E2' },
  animationText: { ...typography.label, color: '#78AAB2' },
  animationTextActive: { color: '#BDF8FA' },
  supporterButton: { minHeight: 29, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B170C', borderWidth: 1, borderColor: '#6D5427' },
  supporterText: { ...typography.label, color: '#F1C56D' },
  mutationButton: { minHeight: 29, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17170E', borderWidth: 1, borderColor: '#615128' },
  mutationButtonActive: { backgroundColor: '#302814', borderColor: '#D7B773' },
  mutationText: { ...typography.label, color: '#D7B773' },
  scenarioButton: { minHeight: 29, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1115', borderWidth: 1, borderColor: '#62384A' },
  scenarioText: { ...typography.label, color: '#E6A5BE' },
  diagnostics: { minHeight: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingTop: 2 },
  diagnostic: { ...typography.label, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, color: '#87B6BE', backgroundColor: '#091419', borderWidth: 1, borderColor: '#203A42' },
});
