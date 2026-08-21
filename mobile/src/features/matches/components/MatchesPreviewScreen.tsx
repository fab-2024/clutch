import { Redirect } from 'expo-router';

import type { ArenaMatch, ArenaPrediction } from '../types';
import { MatchesExperience } from './MatchesScreen';

const NOW = new Date();

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
    id: 'preview-navi-faze',
    date: dateAt(2, 18, 0),
    game: 'cs2',
    teamA: 'Natus Vincere',
    tagA: 'NAVI',
    teamB: 'FaZe Clan',
    tagB: 'FAZE',
    event: 'BLAST Premier',
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
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <MatchesExperience
      error={null}
      finished={PREVIEW_FINISHED}
      followedGames={['lol', 'valorant', 'cs2']}
      isAdmin={false}
      loading={false}
      refreshing={false}
      upcoming={PREVIEW_UPCOMING}
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
    equipe_b: teamB,
    tag_b: tagB,
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
