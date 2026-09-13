import { Redirect, useLocalSearchParams } from 'expo-router';

import type { ArenaMatch, ArenaPrediction } from '../types';
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

export default function MatchesPreviewScreen() {
  const { teams } = useLocalSearchParams<{ teams?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <MatchesExperience
      error={null}
      finished={PREVIEW_FINISHED}
      headerEconomy={{ frags: 1842, volts: 680 }}
      loading={false}
      refreshing={false}
      upcoming={teams === 'imported' ? [...PREVIEW_IMPORTED_MATCHES, ...PREVIEW_UPCOMING.slice(1)] : PREVIEW_UPCOMING}
      onRefresh={noop}
      onRetry={noop}
    />
  );
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
