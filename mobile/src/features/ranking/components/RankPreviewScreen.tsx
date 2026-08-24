import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SeasonalGradeState } from '../grades';
import type { RankDashboard, RankLeaderboardRow } from '../types';
import RankScreen from './RankScreen';

type PreviewMode = 'placement0' | 'placement3' | 'platine';

const PREVIEW_MODES: { key: PreviewMode; label: string }[] = [
  { key: 'placement0', label: '0 / 5' },
  { key: 'placement3', label: '3 / 5' },
  { key: 'platine', label: 'PLATINE 1 432' },
];

const ARGENT: SeasonalGradeState = {
  classe: true,
  objectif_placements: 5,
  placements_restants: 0,
  progression: 0.91,
  cle: 'argent',
  libelle: 'Argent',
  ordre: 1,
  minimum: 850,
  plafond: 1050,
  prochaine_cle: 'or',
  prochain_libelle: 'Or',
  prochain_minimum: 1050,
};

const OR: SeasonalGradeState = {
  ...ARGENT,
  progression: 0.58,
  cle: 'or',
  libelle: 'Or',
  ordre: 2,
  minimum: 1050,
  plafond: 1250,
  prochaine_cle: 'platine',
  prochain_libelle: 'Platine',
  prochain_minimum: 1250,
};

const PLATINE: SeasonalGradeState = {
  ...ARGENT,
  progression: 0.63,
  cle: 'platine',
  libelle: 'Platine',
  ordre: 3,
  minimum: 1250,
  plafond: 1450,
  prochaine_cle: 'diamant',
  prochain_libelle: 'Diamant',
  prochain_minimum: 1450,
};

const DIAMANT: SeasonalGradeState = {
  ...ARGENT,
  progression: 0.7,
  cle: 'diamant',
  libelle: 'Diamant',
  ordre: 4,
  minimum: 1450,
  plafond: 1650,
  prochaine_cle: 'mythique',
  prochain_libelle: 'Mythique',
  prochain_minimum: 1650,
  prochain_objectif_pronostics: 30,
  prochains_pronostics_restants: 0,
};

const MYTHIQUE: SeasonalGradeState = {
  ...ARGENT,
  progression: 1,
  cle: 'mythique',
  libelle: 'Mythique',
  ordre: 5,
  minimum: 1650,
  plafond: undefined,
  prochaine_cle: undefined,
  prochain_libelle: undefined,
  prochain_minimum: undefined,
};

const PLACEMENT: SeasonalGradeState = {
  classe: false,
  objectif_placements: 5,
  placements_restants: 2,
  progression: 0.6,
};

const GLOBAL: RankLeaderboardRow[] = [
  row('nova', 'Nova', 1, 1724, 42, 31, MYTHIQUE),
  row('akira', 'Akira', 2, 1591, 36, 27, DIAMANT),
  row('aya', 'Aya', 28, 1168, 24, 17, OR),
  row('melo', 'Melo', 147, 1036, 18, 12, ARGENT),
  row('pierre-louis', 'Pierre-Louis', 148, 1032, 16, 10, ARGENT, true),
  row('sora', 'Sora', 149, 1027, 22, 14, ARGENT),
];

const BASE_PREVIEW: RankDashboard = {
  season: {
    id: 'preview-season',
    name: 'Saison 1 · Été 2026',
    startsAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(),
  },
  state: {
    frags: 1032,
    peakFrags: 1084,
    settledCalls: 16,
    wonCalls: 10,
    placementsRemaining: 0,
    provisional: false,
    grade: ARGENT,
    rank: 148,
    percentile: 84.3,
    classifiedPlayers: 942,
    bestGrade: { cle: 'or', libelle: 'Or', ordre: 2, minimum: 1050 },
    bestRank: 121,
  },
  leaderboards: {
    global: GLOBAL,
    cercle: [
      row('akira', 'Akira', 1, 1591, 36, 27, DIAMANT),
      row('pierre-louis', 'Pierre-Louis', 2, 1032, 16, 10, ARGENT, true),
      row('zoe', 'Zoé', null, 1014, 3, 2, PLACEMENT),
    ],
    faction: [
      row('nova', 'Nova', 1, 1724, 42, 31, MYTHIQUE),
      row('nox', 'Nox', 2, 1376, 28, 19, PLATINE),
      row('pierre-louis', 'Pierre-Louis', 18, 1032, 16, 10, ARGENT, true),
      row('lina', 'Lina', null, 1007, 4, 3, { ...PLACEMENT, placements_restants: 1 }),
    ],
  },
  recentMovements: [
    movement('move-1', 'TH', 'SK', 'valorant', 'gagne', 24),
    movement('move-2', 'KC', 'G2', 'lol', 'perdu', -16),
    movement('move-3', 'FNC', 'BDS', 'lol', 'gagne', 11),
  ],
  rules: {
    base: 1000,
    placements: 5,
    placementK: 60,
    rankedK: 40,
  },
  reward: {
    status: 'a_annoncer',
    title: 'Récompense de fin de saison',
    detail: 'Ta récompense finale est protégée par ton meilleur grade atteint, même si ton rating redescend.',
  },
};

export default function RankPreviewScreen() {
  const params = useLocalSearchParams<{
    clean?: string | string[];
    mode?: string | string[];
    narrow?: string | string[];
    reduced?: string | string[];
  }>();
  const requestedMode = readParam(params.mode);
  const requestedNarrow = readParam(params.narrow) === '1';
  const requestedReduced = readParam(params.reduced) === '1';
  const clean = readParam(params.clean) === '1';
  const [mode, setMode] = useState<PreviewMode>(isPreviewMode(requestedMode) ? requestedMode : 'placement0');
  const [narrow, setNarrow] = useState(requestedNarrow);
  const [reduceMotion, setReduceMotion] = useState(requestedReduced);

  useEffect(() => {
    if (isPreviewMode(requestedMode)) setMode(requestedMode);
  }, [requestedMode]);
  useEffect(() => setNarrow(requestedNarrow), [requestedNarrow]);
  useEffect(() => setReduceMotion(requestedReduced), [requestedReduced]);

  const dashboard = useMemo(() => dashboardForMode(mode), [mode]);

  return (
    <View style={previewStyles.root}>
      {!clean ? (
        <View style={previewStyles.controls}>
          <View accessibilityRole="tablist" style={previewStyles.controlGroup}>
            {PREVIEW_MODES.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === item.key }}
                onPress={() => setMode(item.key)}
                style={[previewStyles.control, mode === item.key && previewStyles.controlActive]}
              >
                <Text style={[previewStyles.controlText, mode === item.key && previewStyles.controlTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: reduceMotion }}
            onPress={() => setReduceMotion((enabled) => !enabled)}
            style={[previewStyles.control, reduceMotion && previewStyles.controlActive]}
          >
            <Text style={[previewStyles.controlText, reduceMotion && previewStyles.controlTextActive]}>MOUVEMENT RÉDUIT</Text>
          </Pressable>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: narrow }}
            onPress={() => setNarrow((enabled) => !enabled)}
            style={[previewStyles.control, narrow && previewStyles.controlActive]}
          >
            <Text style={[previewStyles.controlText, narrow && previewStyles.controlTextActive]}>ÉCRAN ÉTROIT</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[previewStyles.viewport, narrow && previewStyles.narrowViewport]}>
        <RankScreen previewData={dashboard} previewReduceMotion={reduceMotion} />
      </View>
    </View>
  );
}

function dashboardForMode(mode: PreviewMode): RankDashboard {
  if (mode === 'platine') {
    return {
      ...BASE_PREVIEW,
      state: {
        ...BASE_PREVIEW.state!,
        frags: 1432,
        peakFrags: 1451,
        settledCalls: 29,
        wonCalls: 19,
        placementsRemaining: 0,
        provisional: false,
        grade: { ...PLATINE, progression: 0.91 },
        rank: 84,
        percentile: 91.2,
        bestGrade: { cle: 'platine', libelle: 'Platine', ordre: 3, minimum: 1250 },
        bestRank: 72,
      },
    };
  }

  const settledCalls = mode === 'placement3' ? 3 : 0;
  const placementsRemaining = mode === 'placement3' ? 2 : 5;
  return {
    ...BASE_PREVIEW,
    state: {
      ...BASE_PREVIEW.state!,
      frags: 1000,
      peakFrags: 1000,
      settledCalls,
      wonCalls: mode === 'placement3' ? 2 : 0,
      placementsRemaining,
      provisional: true,
      grade: {
        ...PLACEMENT,
        placements_restants: placementsRemaining,
        progression: settledCalls / 5,
      },
      rank: null,
      percentile: null,
      bestGrade: null,
      bestRank: null,
    },
  };
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isPreviewMode(value: string | undefined): value is PreviewMode {
  return value === 'placement0' || value === 'placement3' || value === 'platine';
}

const previewStyles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#02070C',
  },
  controls: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#263641',
    backgroundColor: '#071018',
  },
  controlGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  control: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#334550',
    borderRadius: 9,
    backgroundColor: '#0A151E',
  },
  controlActive: {
    borderColor: '#E8FF3D',
    backgroundColor: '#20290F',
  },
  controlText: {
    color: '#8C99A8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  controlTextActive: {
    color: '#E8FF3D',
  },
  viewport: {
    flex: 1,
    width: '100%',
  },
  narrowViewport: {
    width: 320,
    maxWidth: '100%',
  },
});

function row(
  id: string,
  pseudo: string,
  rank: number | null,
  frags: number,
  settledCalls: number,
  wonCalls: number,
  grade: SeasonalGradeState,
  me = false,
): RankLeaderboardRow {
  return {
    id,
    pseudo,
    rank,
    frags,
    peakFrags: frags + 38,
    settledCalls,
    wonCalls,
    accuracy: settledCalls ? Math.round((wonCalls / settledCalls) * 1000) / 10 : 0,
    provisional: !grade.classe,
    me,
    grade,
  };
}

function movement(
  id: string,
  teamA: string,
  teamB: string,
  game: string,
  status: 'gagne' | 'perdu',
  deltaFrags: number,
) {
  return {
    id,
    matchId: id + '-match',
    teamA,
    teamB,
    game,
    status,
    deltaFrags,
    settledAt: new Date().toISOString(),
  };
}
