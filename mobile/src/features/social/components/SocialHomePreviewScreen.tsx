import { Redirect } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
import { COMMUNITY_FORMS } from '@/src/features/social/faction/constants';
import type { CommunityData, CommunityFaction, CommunityMutationPresentation } from '@/src/features/social/faction/types';
import { communityFormForLevel, factionProgress } from '@/src/features/social/faction/utils';
import { colors, typography } from '@/src/theme';

import { SocialHomeExperience } from './SocialHomeScreen';
import SocialSectionNav from './SocialSectionNav';

const PREVIEW_COMMUNITY: CommunityData = {
  factions: [
    previewFaction('g2', 'G2 Esports', 'G2', 286, 18),
    previewFaction('fnc', 'Fnatic', 'FNC', 244, 12),
    previewFaction('kc', 'Karmine Corp', 'KC', 312, 21, true),
    previewFaction('bds', 'Team BDS', 'BDS', 175, 8),
    previewFaction('th', 'Team Heretics', 'TH', 142, 5),
    previewFaction('sk', 'SK Gaming', 'SK', 119, 3),
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

export default function SocialHomePreviewScreen() {
  const [charge, setCharge] = useState(312);
  const [mutation, setMutation] = useState<CommunityMutationPresentation | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const eventSequence = useRef(0);
  const data = useMemo<CommunityData>(() => ({
    ...PREVIEW_COMMUNITY,
    factions: PREVIEW_COMMUNITY.factions.map((faction) => faction.equipe_id === 'kc'
      ? { ...faction, membres: charge, niveau_atteint: factionProgress(charge).level }
      : faction),
  }), [charge]);

  if (!__DEV__) return <Redirect href="/" />;

  const playMutation = (toLevel: number) => {
    const target = communityFormForLevel(toLevel);
    const current = factionProgress(charge).level;
    eventSequence.current += 1;
    setCharge(target.threshold);
    setMutation({
      id: `preview-mutation-${eventSequence.current}`,
      from_level: Math.min(Math.max(1, current), Math.max(1, toLevel - 1)),
      to_level: toLevel,
      name: target.name,
      threshold: target.threshold,
      reward: target.reward,
      awakened: target.state === 'awakened',
      occurred_at: new Date().toISOString(),
    });
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <GriffHeader economy={{ frags: 1842, volts: 680 }} />
        <SocialSectionNav activeOverride="faction" />
        <View style={previewStyles.panel}>
          <View style={previewStyles.panelTop}>
            <View>
              <Text style={previewStyles.eyebrow}>LABO RELIQUE · DEV UNIQUEMENT</Text>
              <Text style={previewStyles.title}>{factionProgress(charge).current.name.toUpperCase()} · {charge.toLocaleString('fr-FR')}</Text>
            </View>
            <Pressable onPress={() => setReduceMotion((value) => !value)} style={[previewStyles.motionButton, reduceMotion && previewStyles.motionButtonActive]}>
              <Text style={[previewStyles.motionText, reduceMotion && previewStyles.motionTextActive]}>MOUVEMENTS RÉDUITS {reduceMotion ? 'ON' : 'OFF'}</Text>
            </Pressable>
          </View>
          <View style={previewStyles.chargeEditor}>
            <Text style={previewStyles.editorLabel}>CHARGE</Text>
            <Pressable onPress={() => setCharge((value) => Math.max(0, value - 100))} style={previewStyles.stepButton}><Text style={previewStyles.stepText}>−100</Text></Pressable>
            <TextInput
              accessibilityLabel="Charge artificielle de la relique"
              keyboardType="number-pad"
              onChangeText={(value) => setCharge(Math.max(0, Math.min(50_000, Number(value.replace(/\D/g, '')) || 0)))}
              style={previewStyles.input}
              value={String(charge)}
            />
            <Pressable onPress={() => setCharge((value) => Math.min(50_000, value + 100))} style={previewStyles.stepButton}><Text style={previewStyles.stepText}>+100</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={previewStyles.chips} horizontal showsHorizontalScrollIndicator={false}>
            {CHARGE_PRESETS.map((value) => (
              <Pressable key={value} onPress={() => { setCharge(value); setMutation(null); }} style={[previewStyles.chip, charge === value && previewStyles.chipActive]}>
                <Text style={[previewStyles.chipText, charge === value && previewStyles.chipTextActive]}>{value.toLocaleString('fr-FR')}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView contentContainerStyle={previewStyles.chips} horizontal showsHorizontalScrollIndicator={false}>
            {COMMUNITY_FORMS.filter((form) => form.level >= 2).map((form) => (
              <Pressable key={form.state} onPress={() => playMutation(form.level)} style={previewStyles.mutationButton}>
                <Text style={previewStyles.mutationText}>{form.state === 'awakened' ? 'ÉVEIL FINAL' : `MUTER → ${form.name.toUpperCase()}`}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <SocialHomeExperience
          data={data}
          error={null}
          favoriteTeamId="kc"
          loading={false}
          mutationOverride={mutation}
          onMutationPresented={(eventId) => setMutation((current) => current?.id === eventId ? null : current)}
          reduceMotionOverride={reduceMotion}
          refreshing={false}
          onRefresh={noop}
          onRetry={noop}
        />
      </View>
    </Screen>
  );
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
  chargeEditor: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 7 },
  editorLabel: { ...typography.label, color: '#87939A' },
  stepButton: { minHeight: 30, paddingHorizontal: 9, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151C20' },
  stepText: { ...typography.label, color: '#C8D0D4' },
  input: { width: 86, height: 32, paddingHorizontal: 9, borderRadius: 10, color: '#F3F5F4', backgroundColor: '#070A0C', borderWidth: 1, borderColor: '#3A461F', textAlign: 'center' },
  chips: { gap: 6, paddingRight: 12 },
  chip: { minHeight: 27, paddingHorizontal: 9, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#13191D', borderWidth: 1, borderColor: '#2B353B' },
  chipActive: { backgroundColor: colors.volt, borderColor: colors.volt },
  chipText: { ...typography.label, color: '#8D999F' },
  chipTextActive: { color: '#080B0D' },
  mutationButton: { minHeight: 29, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17170E', borderWidth: 1, borderColor: '#615128' },
  mutationText: { ...typography.label, color: '#D7B773' },
});
