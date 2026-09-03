import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { previewRoutesEnabled } from '@/src/components/dev/PreviewRoute';
import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
import ProfileHeaderButton from '@/src/features/profile/components/ProfileHeaderButton';
import { COMMUNITY_FORMS } from '@/src/features/social/faction/constants';
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

const TESTABLE_FORMS = COMMUNITY_FORMS.filter((form) => form.level >= 1 && form.level <= 5);

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
  const [supporterEditorOpen, setSupporterEditorOpen] = useState(false);
  const [supporterDraft, setSupporterDraft] = useState(() => String(
    requestedInstability ?? chargeForInstability(requestedForm.level, requestedInstability),
  ));
  const previewSessionId = useRef(Date.now().toString(36));
  const eventSequence = useRef(0);
  const previewProgress = factionProgress(charge);
  const supporterCount = Math.round(instabilityOverride?.charge ?? charge);
  const relicProgressOverride = instabilityOverride ? {
    ...previewProgress,
    charge: supporterCount,
    progress: Math.max(0, Math.min(1, instabilityOverride.charge / instabilityOverride.objective)),
    remaining: Math.max(0, previewProgress.objective - supporterCount),
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
        ? { ...faction, membres: supporterCount, niveau_atteint: previewProgress.level }
        : faction),
    };
  }, [activity, previewProgress.level, supporterCount]);

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
      setSupporterDraft(String(target.threshold));
      setInstabilityOverride(undefined);
      setMutation(nextMutation);
      return;
    }
    const nextCharge = chargeForInstability(requestedForm.level, requestedInstability);
    setCharge(nextCharge);
    setSupporterDraft(String(requestedInstability ?? nextCharge));
    setInstabilityOverride(requestedInstability === null
      ? undefined
      : { charge: requestedInstability, objective: 100 });
    setMutation(null);
  }, [requestedForm.level, requestedInstability, requestedMutationFrom, requestedMutationTo]);

  if (!previewRoutesEnabled) return <Redirect href="/" />;

  const playMutation = (fromLevel: number, toLevel: number) => {
    const target = communityFormForLevel(toLevel);
    eventSequence.current += 1;
    setInstabilityOverride(undefined);
    setCharge(target.threshold);
    setSupporterDraft(String(target.threshold));
    setSupporterEditorOpen(false);
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

  const resetRelicPreview = () => {
    setCharge(communityFormForLevel(1).threshold);
    setSupporterDraft(String(communityFormForLevel(1).threshold));
    setSupporterEditorOpen(false);
    setInstabilityOverride(undefined);
    setMutation(null);
  };

  const applySupporterCount = (value: number) => {
    const normalized = Math.max(0, Math.min(100, Math.round(value)));
    setSupporterDraft(String(normalized));
    setCharge(chargeForInstability(requestedForm.level, normalized));
    setInstabilityOverride({ charge: normalized, objective: 100 });
    setMutation(null);
  };

  const handleSupporterDraftChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 3);
    setSupporterDraft(digits);
    if (digits) applySupporterCount(Number(digits));
  };

  const toggleSupporterEditor = () => {
    setSupporterDraft(String(supporterCount));
    setSupporterEditorOpen((current) => !current);
  };

  const experience = (
      <View style={{ flex: 1 }}>
        <GriffHeader
          economy={{ frags: 1842, volts: 680 }}
          leading={<ProfileHeaderButton preview />}
          variant="wallet"
        />
        <SocialSectionNav activeOverride="faction" />
        {showLab ? <View style={previewStyles.panel}>
          <View style={previewStyles.panelTop}>
            <View>
              <Text style={previewStyles.eyebrow}>LABO RELIQUE · DEV UNIQUEMENT</Text>
              <Text style={previewStyles.title}>{previewProgress.current.name.toUpperCase()} · {supporterCount.toLocaleString('fr-FR')}</Text>
            </View>
            <View style={[previewStyles.status, mutation && previewStyles.statusReady]}>
              <Text style={[previewStyles.statusText, mutation && previewStyles.statusTextReady]}>
                {mutation ? 'MUTATION PRÊTE' : 'AU REPOS'}
              </Text>
            </View>
          </View>
          <Text style={previewStyles.instructions}>
            Touche la relique pour la réaction simple. Prépare la mutation, puis touche-la à nouveau pour l’explosion.
          </Text>
          <View style={previewStyles.actions}>
            <Pressable
              accessibilityLabel={supporterEditorOpen
                ? 'Fermer le réglage du nombre de supporters'
                : `Régler le nombre de supporters, actuellement ${supporterCount}`}
              accessibilityRole="button"
              onPress={toggleSupporterEditor}
              style={[previewStyles.supporterButton, supporterEditorOpen && previewStyles.supporterButtonOpen]}
            >
              <Text style={previewStyles.supporterButtonText}>SUPPORTERS · {supporterCount}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Réinitialiser la relique en Ampoule"
              accessibilityRole="button"
              onPress={resetRelicPreview}
              style={previewStyles.secondaryButton}
            >
              <Text style={previewStyles.secondaryButtonText}>RÉINITIALISER</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Préparer la mutation de l’Ampoule vers la Fiole"
              accessibilityRole="button"
              disabled={Boolean(mutation)}
              onPress={() => playMutation(1, 2)}
              style={[previewStyles.primaryButton, mutation && previewStyles.primaryButtonDisabled]}
            >
              <Text style={previewStyles.primaryButtonText}>
                {mutation ? 'TOUCHE LA RELIQUE' : 'PRÉPARER LA MUTATION'}
              </Text>
            </Pressable>
          </View>
          {supporterEditorOpen ? (
            <View style={previewStyles.supporterEditor}>
              <Text style={previewStyles.supporterEditorLabel}>REMPLISSAGE</Text>
              <View style={previewStyles.supporterInputGroup}>
                <TextInput
                  accessibilityLabel="Nombre de supporters entre 0 et 100"
                  inputMode="numeric"
                  keyboardType="number-pad"
                  maxLength={3}
                  onBlur={() => {
                    if (!supporterDraft) applySupporterCount(0);
                  }}
                  onChangeText={handleSupporterDraftChange}
                  onSubmitEditing={() => setSupporterEditorOpen(false)}
                  returnKeyType="done"
                  selectTextOnFocus
                  style={previewStyles.supporterInput}
                  value={supporterDraft}
                />
                <Text style={previewStyles.supporterInputSuffix}>/ 100</Text>
              </View>
              <View
                accessibilityLabel={`Remplissage de la relique à ${supporterCount} pour cent`}
                accessibilityRole="progressbar"
                style={previewStyles.supporterTrack}
              >
                <View
                  style={[
                    previewStyles.supporterTrackFill,
                    { width: `${supporterCount}%` as `${number}%` },
                  ]}
                />
              </View>
              <Text style={previewStyles.supporterHint}>MISE À JOUR EN DIRECT</Text>
            </View>
          ) : null}
        </View> : null}
        <SocialHomeExperience
          avatarId="chaos-smile"
          data={data}
          error={null}
          factionHeroVariant={factionHeroVariant}
          favoriteTeamId="kc"
          instabilityPreviewOverride={instabilityOverride}
          loading={false}
          mutationOverride={mutation}
          relicProgressOverride={relicProgressOverride}
          onMutationPresented={(eventId) => {
            setMutation((current) => current?.id === eventId ? null : current);
          }}
          refreshing={false}
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
  panel: { paddingHorizontal: 16, paddingVertical: 12, gap: 10, backgroundColor: '#0B1218', borderBottomWidth: 1, borderBottomColor: '#2C361B' },
  panelTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .6 },
  title: { ...typography.label, marginTop: 3, color: '#E8ECE9' },
  status: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#2B353B' },
  statusReady: { backgroundColor: '#302814', borderColor: '#D7B773' },
  statusText: { ...typography.label, color: '#8D999F' },
  statusTextReady: { color: '#F1C56D' },
  instructions: { ...typography.body, maxWidth: 620, color: '#AAB4B8' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  supporterButton: { minHeight: 36, paddingHorizontal: 13, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1021', borderWidth: 1, borderColor: '#694576' },
  supporterButtonOpen: { backgroundColor: '#281631', borderColor: '#B17CC1' },
  supporterButtonText: { ...typography.label, color: '#E1C6E8' },
  supporterEditor: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, backgroundColor: '#120D18', borderWidth: 1, borderColor: '#422B4D' },
  supporterEditorLabel: { ...typography.eyebrow, color: '#BFA7C7', letterSpacing: .5 },
  supporterInputGroup: { minHeight: 30, paddingHorizontal: 9, borderRadius: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#080A0D', borderWidth: 1, borderColor: '#684873' },
  supporterInput: { width: 42, padding: 0, color: '#FFFFFF', fontFamily: typography.label.fontFamily, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  supporterInputSuffix: { ...typography.label, marginLeft: 4, color: '#8F9AA0' },
  supporterTrack: { width: 150, height: 7, overflow: 'hidden', borderRadius: 99, backgroundColor: '#07090B', borderWidth: 1, borderColor: '#35263B' },
  supporterTrackFill: { height: '100%', borderRadius: 99, backgroundColor: '#8E3AA4' },
  supporterHint: { ...typography.eyebrow, color: '#778187', letterSpacing: .4 },
  secondaryButton: { minHeight: 36, paddingHorizontal: 13, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111A22', borderWidth: 1, borderColor: '#344149' },
  secondaryButtonText: { ...typography.label, color: '#C8D0D4' },
  primaryButton: { minHeight: 36, paddingHorizontal: 14, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt, borderWidth: 1, borderColor: colors.volt },
  primaryButtonDisabled: { backgroundColor: '#302814', borderColor: '#D7B773' },
  primaryButtonText: { ...typography.label, color: '#080B0D' },
});
