import { Redirect, useLocalSearchParams } from 'expo-router';

import type { ArenaMatch, ArenaPrediction, MyCallItem, MyCallsDashboard, MyCallState } from '../types';
import { MatchesExperience } from './MatchesScreen';

const NOW = new Date();

const PREVIEW_IMPORTED_MATCHES: ArenaMatch[] = [
  previewMatch({
    id: 'preview-live-blg-we', date: NOW, game: 'lol', event: 'LPL · Playoffs', status: 'en_cours',
    teamA: 'Bilibili Gaming', tagA: 'BLG', teamB: 'Team WE', tagB: 'WE', scoreA: 0, scoreB: 0,
    logoA: 'https://cdn-api.pandascore.co/images/team/image/1566/qw_yi_qu_j.png',
    logoB: 'https://cdn-api.pandascore.co/images/team/image/2574/300px-Team_WElogo_square.png',
  }),
  previewMatch({
    id: 'preview-live-fearx-dplus', date: NOW, game: 'lol', event: 'LCK · Playoffs', status: 'en_cours',
    teamA: 'BNK FEARX', tagA: 'BFX', teamB: 'Dplus KIA', tagB: 'DK', scoreA: 0, scoreB: 0,
    logoA: 'https://cdn-api.pandascore.co/images/team/image/134115/663px_fear_x_icon_lightmode.png',
    logoB: 'https://cdn-api.pandascore.co/images/team/image/132531/800px_dplus_lightmode.png',
  }),
];

const PREVIEW_UPCOMING: ArenaMatch[] = [
  previewMatch({
    id: 'preview-live-g2-fnc',
    date: NOW,
    game: 'lol',
    teamA: 'G2 Esports',
    tagA: 'G2',
    teamB: 'Fnatic',
    tagB: 'FNC',
    event: 'LEC Summer',
    status: 'en_cours',
    scoreA: 1,
    scoreB: 0,
    prediction: prediction('preview-live-g2-fnc', 'a'),
  }),
  previewMatch({
    id: 'preview-kc-bds',
    date: futureToday(3),
    game: 'lol',
    teamA: 'Karmine Corp',
    tagA: 'KC',
    teamB: 'Team BDS',
    tagB: 'BDS',
    event: 'LEC Summer',
    prediction: prediction('preview-kc-bds', 'a'),
  }),
  previewMatch({
    id: 'preview-th-gx',
    date: dateAt(1, 19, 30),
    game: 'valorant',
    teamA: 'Team Heretics',
    tagA: 'TH',
    teamB: 'GiantX',
    tagB: 'GX',
    event: 'VCT EMEA',
  }),
  previewMatch({
    id: 'preview-koi-sk',
    date: dateAt(1, 21, 0),
    game: 'lol',
    teamA: 'Movistar KOI',
    tagA: 'KOI',
    teamB: 'SK Gaming',
    tagB: 'SK',
    event: 'LEC Summer',
  }),
  previewMatch({
    id: 'preview-kc-vit-rl',
    date: dateAt(2, 18, 0),
    game: 'rocket_league',
    teamA: 'Karmine Corp',
    tagA: 'KC',
    teamB: 'Team Vitality',
    tagB: 'VIT',
    event: 'RLCS Major',
  }),
];

const PREVIEW_FINISHED: ArenaMatch[] = [
  previewMatch({
    id: 'preview-final-kc-fnc',
    date: dateAt(-1, 20, 0),
    game: 'lol',
    teamA: 'Karmine Corp',
    tagA: 'KC',
    teamB: 'Fnatic',
    tagB: 'FNC',
    event: 'LEC Summer',
    status: 'termine',
    scoreA: 2,
    scoreB: 1,
    prediction: prediction('preview-final-kc-fnc', 'a', 'gagne', 18),
  }),
  previewMatch({
    id: 'preview-final-g2-bds',
    date: dateAt(-2, 18, 30),
    game: 'lol',
    teamA: 'G2 Esports',
    tagA: 'G2',
    teamB: 'Team BDS',
    tagB: 'BDS',
    event: 'LEC Summer',
    status: 'termine',
    scoreA: 0,
    scoreB: 2,
    prediction: prediction('preview-final-g2-bds', 'a', 'perdu', -14),
  }),
];

const PREVIEW_CALLS: MyCallsDashboard = {
  saison_id: 'preview-season',
  saison_nom: 'Saison Zéro',
  compteurs: { ouverts: 2, verrouilles: 2, reussis: 1, manques: 1 },
  ouverts: [callItem(PREVIEW_UPCOMING[2], 'ouvert'), callItem(PREVIEW_UPCOMING[3], 'ouvert')],
  verrouilles: [
    callItem(PREVIEW_UPCOMING[0], 'verrouille', 'a', { a: 61, b: 39 }),
    callItem(PREVIEW_UPCOMING[1], 'verrouille', 'a', { a: 44, b: 56 }),
  ],
  reussis: [callItem(PREVIEW_FINISHED[0], 'reussi', 'a', { a: 67, b: 33 }, 18)],
  manques: [callItem(PREVIEW_FINISHED[1], 'manque', 'a', { a: 72, b: 28 }, -14)],
};

export default function MatchesPreviewScreen() {
  const { teams } = useLocalSearchParams<{ teams?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <MatchesExperience
      calls={PREVIEW_CALLS}
      error={null}
      finished={PREVIEW_FINISHED}
      followedGames={['lol', 'valorant', 'rocket_league']}
      headerEconomy={{ frags: 1842, volts: 680 }}
      isAdmin={false}
      loading={false}
      refreshing={false}
      upcoming={teams === 'imported' ? [...PREVIEW_IMPORTED_MATCHES, ...PREVIEW_UPCOMING.slice(1)] : PREVIEW_UPCOMING}
      onRefresh={noop}
      onRetry={noop}
    />
  );
}

function callItem(
  match: ArenaMatch,
  state: MyCallState,
  choice: 'a' | 'b' | null = null,
  split?: { a: number; b: number },
  delta: number | null = null,
): MyCallItem {
  const now = new Date().toISOString();
  const resolved = state === 'reussi' || state === 'manque';
  return {
    id: `call-${match.id}`,
    pronostic_id: choice ? `prediction-${match.id}` : null,
    match_id: match.id,
    saison_id: match.saison_id,
    etat: state,
    jeu: match.jeu,
    evenement: match.evenement,
    format: match.format,
    debut: match.debut,
    statut_match: match.statut,
    equipe_a: match.equipe_a,
    tag_a: match.tag_a,
    equipe_b: match.equipe_b,
    tag_b: match.tag_b,
    score_a: match.score_a,
    score_b: match.score_b,
    choix: choice,
    statut: state === 'verrouille' ? 'en_cours' : state === 'reussi' ? 'gagne' : state === 'manque' ? 'perdu' : null,
    delta_frags: delta,
    verrouille_le: choice ? now : null,
    ferme_le: match.debut,
    regle_le: resolved ? now : null,
    participants: split ? 128 : 127,
    distribution: split ? { total: 128, a: Math.round(split.a * 1.28), b: Math.round(split.b * 1.28), a_pct: split.a, b_pct: split.b } : null,
    regle_resolution: {
      cle: 'vainqueur_match',
      libelle: 'Vainqueur de la série',
      detail: 'Le call est réussi si l’équipe choisie remporte le score final de la série.',
    },
    source_resultat: resolved ? 'validation_clutch' : null,
    source_resultat_label: resolved ? 'Validation GRIFF' : null,
    identifiant_resultat_externe: resolved ? `clutch:${match.id}:${match.score_a}-${match.score_b}` : null,
    revision_resultat: resolved ? 1 : 0,
    resultat_corrige: false,
  };
}

type PreviewMatchInput = {
  date: Date;
  event: string;
  game: string;
  id: string;
  logoA?: string;
  logoB?: string;
  prediction?: ArenaPrediction | null;
  scoreA?: number | null;
  scoreB?: number | null;
  status?: ArenaMatch['statut'];
  tagA: string;
  tagB: string;
  teamA: string;
  teamB: string;
};

function previewMatch({
  date,
  event,
  game,
  id,
  logoA,
  logoB,
  prediction: matchPrediction = null,
  scoreA = null,
  scoreB = null,
  status = 'a_venir',
  tagA,
  tagB,
  teamA,
  teamB,
}: PreviewMatchInput): ArenaMatch {
  return {
    id,
    saison_id: 'preview-season',
    debut: date.toISOString(),
    jeu: game,
    equipe_a: teamA,
    tag_a: tagA,
    logo_a: logoA,
    equipe_b: teamB,
    tag_b: tagB,
    logo_b: logoB,
    evenement: event,
    format: 3,
    statut: status,
    score_a: scoreA,
    score_b: scoreB,
    prediction: matchPrediction,
  };
}

function prediction(
  matchId: string,
  choice: ArenaPrediction['choix'],
  status = 'en_attente',
  delta: number | null = null,
): ArenaPrediction {
  return { match_id: matchId, choix: choice, statut: status, delta_frags: delta };
}

function dateAt(dayOffset: number, hour: number, minute: number) {
  const date = new Date(NOW);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function futureToday(hours: number) {
  const date = new Date(NOW.getTime() + hours * 60 * 60 * 1000);
  return date;
}

function noop() {}
