import { Redirect } from 'expo-router';

import type { PartnerCampaignData, PartnerCampaignReport } from '../types';
import PartnerCampaignReportScreen from './PartnerCampaignReportScreen';
import PartnerCampaignScreen from './PartnerCampaignScreen';

const PREVIEW_CAMPAIGN: PartnerCampaignData = {
  campaign: {
    key: 'nova-week',
    name: 'Nova Week',
    partner: 'Nova',
    fictionalPartner: true,
    description: 'Une activation fictive où chaque action de supporter éclaire une partie de la collection Nova.',
    startsAt: '2026-08-22T00:00:00.000Z',
    endsAt: '2026-09-07T00:00:00.000Z',
    status: 'publie',
    accent: '#8B6CFF',
    collectionKey: 'nova-week',
  },
  eligible: true,
  joined: true,
  joinedAt: '2026-08-22T10:00:00.000Z',
  completed: false,
  completedAt: null,
  rewardClaimed: false,
  rewardClaimedAt: null,
  progress: { current: 3, goal: 7 },
  tasks: [
    { key: 'follow-3-matches', type: 'match_follow', title: 'Suivre 3 matchs', description: 'Ajoute trois affiches à ton suivi Nova. Aucun résultat n’est requis.', goal: 3, progress: 1, completed: false, order: 1 },
    { key: 'make-3-calls', type: 'calls', title: 'Faire 3 Calls', description: 'Trois prises de position suffisent, qu’elles soient justes ou non.', goal: 3, progress: 2, completed: false, order: 2 },
    { key: 'faction-signal', type: 'faction_mission', title: 'Activer le signal de faction', description: 'Participe une fois à la mission collective de ta faction.', goal: 1, progress: 0, completed: false, order: 3 },
  ],
  rewards: [
    { id: 'nova-cadre', slot: 'cadre_profil', family: 'cadre_avatar', name: 'Cadre Nova', description: 'Un cadre violet froid traversé par un signal de supernova.', rarity: 'rare', styleKey: 'frame-nova', accent: '#8B6CFF', owned: false, equipped: false },
    { id: 'nova-titre', slot: 'titre_profil', family: 'titre_supporter', name: 'Éclaireur Nova', description: 'Le titre des supporters qui ont traversé Nova Week.', rarity: 'rare', styleKey: 'title-nova', accent: '#AFA0FF', owned: false, equipped: false },
    { id: 'nova-relique', slot: 'effet_faction', family: 'signature_relique', name: 'Supernova Instable', description: 'Une variation de relique cosmique, purement visuelle.', rarity: 'epique', styleKey: 'faction-nova', accent: '#C77DFF', owned: false, equipped: false },
  ],
  matches: [
    { id: 'nova-preview-1', startsAt: '2026-08-23T17:00:00.000Z', status: 'a_venir', game: 'lol', event: 'LEC Summer', teamA: 'Karmine Corp', tagA: 'KC', teamB: 'G2 Esports', tagB: 'G2', followed: true },
    { id: 'nova-preview-2', startsAt: '2026-08-24T19:00:00.000Z', status: 'a_venir', game: 'valorant', event: 'VCT EMEA', teamA: 'Team Heretics', tagA: 'TH', teamB: 'Fnatic', tagB: 'FNC', followed: false },
    { id: 'nova-preview-3', startsAt: '2026-08-25T18:00:00.000Z', status: 'a_venir', game: 'lol', event: 'LEC Summer', teamA: 'Team BDS', tagA: 'BDS', teamB: 'SK Gaming', tagB: 'SK', followed: false },
  ],
  rewardRule: 'participation_uniquement',
  callAccuracyRewarded: false,
};

const PREVIEW_REPORT: PartnerCampaignReport = {
  campaign: {
    key: 'nova-week',
    name: 'Nova Week',
    partner: 'Nova',
    fictionalPartner: true,
    startsAt: '2026-08-22T00:00:00.000Z',
    endsAt: '2026-09-07T00:00:00.000Z',
    accent: '#8B6CFF',
  },
  live: {
    source: 'agregats_pilote_reels', eligibleUsers: 14, uniqueImpressions: 9, participants: 4, completions: 2, rewardsClaimed: 2, equippedItems: 2, usersWithEquippedItem: 2, participationRate: 28.6, completionRate: 50, claimRate: 100,
    retention7: { cohort: 0, retained: 0, rate: null }, retention30: { cohort: 0, retained: 0, rate: null },
  },
  demonstration: {
    source: 'donnees_synthetiques', label: 'PROJECTION COMMERCIALE FICTIVE', eligibleUsers: 12840, uniqueImpressions: 8610, participants: 3240, completions: 2196, rewardsClaimed: 1984, equippedItems: 1428, usersWithEquippedItem: 1428, participationRate: 25.2, completionRate: 67.8, claimRate: 90.3,
    retention7: { cohort: 0, retained: 0, rate: 47.2 }, retention30: { cohort: 0, retained: 0, rate: 28.6 },
  },
  partnerExport: { publishable: true, privacyThreshold: 5, blockedReason: null },
  privacy: { personalData: false, userIdentifiers: false, aggregatesOnly: true, smallCohortsMasked: true },
};

export function PartnerCampaignPreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <PartnerCampaignScreen previewData={PREVIEW_CAMPAIGN} />;
}

export function PartnerCampaignReportPreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <PartnerCampaignReportScreen previewReport={PREVIEW_REPORT} />;
}
