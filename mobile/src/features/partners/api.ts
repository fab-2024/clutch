import { supabase } from '@/src/lib/supabase';

import type {
  PartnerCampaign,
  PartnerCampaignData,
  PartnerCampaignDemoMetrics,
  PartnerCampaignMatch,
  PartnerCampaignMetrics,
  PartnerCampaignReport,
  PartnerCampaignReward,
  PartnerCampaignTask,
  PartnerCampaignTaskType,
  RetentionMetric,
} from './types';

export async function loadPartnerCampaign(campaignKey: string): Promise<PartnerCampaignData> {
  const { data, error } = await supabase.rpc('clutch_campagne_partenaire_v1', {
    p_campagne_key: campaignKey.trim(),
  });
  if (error) throw error;
  return normalizeCampaignData(data);
}

export async function joinPartnerCampaign(campaignKey: string): Promise<PartnerCampaignData> {
  const { data, error } = await supabase.rpc('clutch_rejoindre_campagne_partenaire_v1', {
    p_campagne_key: campaignKey.trim(),
  });
  if (error) throw error;
  return normalizeCampaignData(data);
}

export async function followPartnerCampaignMatch(campaignKey: string, matchId: string): Promise<PartnerCampaignData> {
  const { data, error } = await supabase.rpc('clutch_suivre_match_campagne_v1', {
    p_campagne_key: campaignKey.trim(),
    p_match_id: matchId.trim(),
  });
  if (error) throw error;
  return normalizeCampaignData(data);
}

export async function participateInPartnerFactionMission(campaignKey: string): Promise<PartnerCampaignData> {
  const { data, error } = await supabase.rpc('clutch_participer_mission_faction_campagne_v1', {
    p_campagne_key: campaignKey.trim(),
  });
  if (error) throw error;
  return normalizeCampaignData(data);
}

export async function claimPartnerCampaignRewards(campaignKey: string): Promise<PartnerCampaignData> {
  const { data, error } = await supabase.rpc('clutch_reclamer_recompenses_campagne_v1', {
    p_campagne_key: campaignKey.trim(),
  });
  if (error) throw error;
  return normalizeCampaignData(data);
}

export async function loadPartnerCampaignReport(campaignKey: string): Promise<PartnerCampaignReport> {
  const { data, error } = await supabase.rpc('clutch_rapport_campagne_partenaire_v1', {
    p_campagne_key: campaignKey.trim(),
  });
  if (error) throw error;
  return normalizeCampaignReport(data);
}

function normalizeCampaignData(value: unknown): PartnerCampaignData {
  const row = asRecord(value);
  const progress = asRecord(row.progression);
  const campaign = normalizeCampaign(row.campagne);
  return {
    campaign,
    eligible: row.eligible === true,
    joined: row.rejointe === true,
    joinedAt: nullableString(row.rejointe_le),
    completed: row.terminee === true,
    completedAt: nullableString(row.terminee_le),
    rewardClaimed: row.recompense_reclamee === true,
    rewardClaimedAt: nullableString(row.recompense_reclamee_le),
    progress: {
      current: nonNegativeInteger(progress.actuelle),
      goal: nonNegativeInteger(progress.objectif),
    },
    tasks: Array.isArray(row.taches)
      ? row.taches.map(normalizeTask).filter((task): task is PartnerCampaignTask => task !== null)
      : [],
    rewards: Array.isArray(row.recompenses)
      ? row.recompenses.map(normalizeReward).filter((reward): reward is PartnerCampaignReward => reward !== null)
      : [],
    matches: Array.isArray(row.matchs)
      ? row.matchs.map(normalizeMatch).filter((match): match is PartnerCampaignMatch => match !== null)
      : [],
    rewardRule: 'participation_uniquement',
    callAccuracyRewarded: false,
    newParticipation: typeof row.nouvelle_participation === 'boolean'
      ? row.nouvelle_participation
      : undefined,
  };
}

function normalizeCampaign(value: unknown): PartnerCampaign {
  const row = asRecord(value);
  return {
    key: requiredString(row.key, 'campagne'),
    name: requiredString(row.nom, 'nom de campagne'),
    partner: requiredString(row.partenaire, 'partenaire'),
    fictionalPartner: row.partenaire_fictif === true,
    description: stringValue(row.description),
    startsAt: requiredString(row.debut, 'début'),
    endsAt: requiredString(row.fin, 'fin'),
    status: stringValue(row.statut) || 'publie',
    accent: colorValue(row.accent),
    collectionKey: stringValue(row.collection_key) || 'partenaire',
  };
}

function normalizeTask(value: unknown): PartnerCampaignTask | null {
  const row = asRecord(value);
  const type = stringValue(row.type) as PartnerCampaignTaskType;
  if (!['match_follow', 'calls', 'faction_mission'].includes(type)) return null;
  const key = stringValue(row.key);
  if (!key) return null;
  const goal = Math.max(1, nonNegativeInteger(row.objectif));
  return {
    key,
    type,
    title: stringValue(row.titre) || 'Mission Nova',
    description: stringValue(row.description),
    goal,
    progress: Math.min(goal, nonNegativeInteger(row.progression)),
    completed: row.terminee === true,
    order: Math.max(1, nonNegativeInteger(row.ordre)),
  };
}

function normalizeReward(value: unknown): PartnerCampaignReward | null {
  const row = asRecord(value);
  const slot = stringValue(row.emplacement) as PartnerCampaignReward['slot'];
  if (!['cadre_profil', 'titre_profil', 'effet_faction'].includes(slot)) return null;
  const id = stringValue(row.id);
  const styleKey = stringValue(row.style_key);
  if (!id || !styleKey) return null;
  return {
    id,
    slot,
    family: stringValue(row.famille),
    name: stringValue(row.nom) || 'Récompense Nova',
    description: stringValue(row.description),
    rarity: stringValue(row.rarete) || 'rare',
    styleKey,
    accent: colorValue(row.accent),
    owned: row.possede === true,
    equipped: row.equipe === true,
  };
}

function normalizeMatch(value: unknown): PartnerCampaignMatch | null {
  const row = asRecord(value);
  const id = stringValue(row.id);
  const status = row.statut === 'en_cours' ? 'en_cours' : 'a_venir';
  if (!id) return null;
  return {
    id,
    startsAt: requiredString(row.debut, 'date du match'),
    status,
    game: stringValue(row.jeu),
    event: stringValue(row.evenement),
    teamA: stringValue(row.equipe_a),
    tagA: stringValue(row.tag_a) || 'A',
    teamB: stringValue(row.equipe_b),
    tagB: stringValue(row.tag_b) || 'B',
    followed: row.suivi === true,
  };
}

function normalizeCampaignReport(value: unknown): PartnerCampaignReport {
  const row = asRecord(value);
  const campaign = normalizeCampaign({ ...asRecord(row.campagne), collection_key: 'nova-week', statut: 'publie', description: '' });
  const live = normalizeMetrics(row.live);
  const demonstration = normalizeDemoMetrics(row.demonstration);
  const exportRow = asRecord(row.export_partenaire);
  const privacy = asRecord(row.confidentialite);
  return {
    campaign: {
      key: campaign.key,
      name: campaign.name,
      partner: campaign.partner,
      fictionalPartner: campaign.fictionalPartner,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      accent: campaign.accent,
    },
    live,
    demonstration,
    partnerExport: {
      publishable: exportRow.publiable === true,
      privacyThreshold: nonNegativeInteger(exportRow.seuil_confidentialite),
      blockedReason: nullableString(exportRow.raison_blocage),
    },
    privacy: {
      personalData: privacy.donnees_personnelles === true,
      userIdentifiers: privacy.identifiants_utilisateur === true,
      aggregatesOnly: privacy.agregats_uniquement === true,
      smallCohortsMasked: privacy.cohortes_faibles_masquees === true,
    },
  };
}

function normalizeMetrics(value: unknown): PartnerCampaignMetrics {
  const row = asRecord(value);
  return {
    source: stringValue(row.source),
    eligibleUsers: nonNegativeInteger(row.utilisateurs_eligibles),
    uniqueImpressions: nonNegativeInteger(row.impressions_uniques),
    participants: nonNegativeInteger(row.participants),
    completions: nonNegativeInteger(row.completions),
    rewardsClaimed: nonNegativeInteger(row.recompenses_reclamees),
    equippedItems: nonNegativeInteger(row.objets_equipes),
    usersWithEquippedItem: nonNegativeInteger(row.utilisateurs_avec_objet_equipe),
    participationRate: finiteNumber(row.taux_participation_pct),
    completionRate: finiteNumber(row.taux_completion_pct),
    claimRate: finiteNumber(row.taux_reclamation_pct),
    retention7: normalizeRetention(row.retention_j7),
    retention30: normalizeRetention(row.retention_j30),
  };
}

function normalizeDemoMetrics(value: unknown): PartnerCampaignDemoMetrics {
  const row = asRecord(value);
  return {
    source: stringValue(row.source) || 'donnees_synthetiques',
    label: stringValue(row.libelle) || 'PROJECTION FICTIVE',
    eligibleUsers: nonNegativeInteger(row.utilisateurs_eligibles),
    uniqueImpressions: nonNegativeInteger(row.impressions_uniques),
    participants: nonNegativeInteger(row.participants),
    completions: nonNegativeInteger(row.completions),
    rewardsClaimed: nonNegativeInteger(row.recompenses_reclamees),
    equippedItems: nonNegativeInteger(row.objets_equipes),
    usersWithEquippedItem: nonNegativeInteger(row.utilisateurs_avec_objet_equipe),
    participationRate: finiteNumber(row.taux_participation_pct),
    completionRate: finiteNumber(row.taux_completion_pct),
    claimRate: finiteNumber(row.taux_reclamation_pct),
    retention7: { cohort: 0, retained: 0, rate: nullableNumber(row.retention_j7_pct) },
    retention30: { cohort: 0, retained: 0, rate: nullableNumber(row.retention_j30_pct) },
  };
}

function normalizeRetention(value: unknown): RetentionMetric {
  const row = asRecord(value);
  return {
    cohort: nonNegativeInteger(row.cohorte),
    retained: nonNegativeInteger(row.retenus),
    rate: nullableNumber(row.taux_pct),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function requiredString(value: unknown, field: string) {
  const text = stringValue(value);
  if (!text) throw new Error(`Champ ${field} absent de la campagne partenaire.`);
  return text;
}

function nullableString(value: unknown) {
  return stringValue(value) || null;
}

function nonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function nullableNumber(value: unknown) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function colorValue(value: unknown) {
  const color = stringValue(value);
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : '#8B6CFF';
}
