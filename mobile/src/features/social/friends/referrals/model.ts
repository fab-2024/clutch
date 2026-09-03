import { GrowthError, growthCount, growthPayload } from '@/src/lib/growthErrors';
import { INVITATION_CODE } from '@/src/lib/publicLinks';

import type { InvitationInfo, ReferralDashboard, ReferralReward } from './types';

export function parseInvitation(value: unknown): InvitationInfo | null {
  if (value === null) return null;
  const raw = growthPayload(value);
  if (raw.valide !== true || (raw.parrain !== null && typeof raw.parrain !== 'string')) throw new GrowthError('invalid_response');
  return { inviter: raw.parrain, reward: growthCount(raw.recompense_volts), dailyCap: growthCount(raw.plafond_jour), monthlyCap: growthCount(raw.plafond_mois) };
}

export function parseReferrals(value: unknown): ReferralDashboard {
  const raw = growthPayload(value);
  if ((raw.code !== null && (typeof raw.code !== 'string' || !INVITATION_CODE.test(raw.code)))
    || typeof raw.deja_parraine !== 'boolean' || !Array.isArray(raw.historique)) throw new GrowthError('invalid_response');
  return {
    code: raw.code as string | null, shares: growthCount(raw.partages), registered: growthCount(raw.inscrits), active: growthCount(raw.actives),
    volts: growthCount(raw.volts_recus), rewardedToday: growthCount(raw.recompenses_jour), rewardedThisMonth: growthCount(raw.recompenses_mois),
    reward: growthCount(raw.montant), dailyCap: growthCount(raw.plafond_jour), monthlyCap: growthCount(raw.plafond_mois), alreadyReferred: raw.deja_parraine,
    history: raw.historique.slice(0, 25).map((entry) => {
      const row = growthPayload(entry);
      if (typeof row.id !== 'string' || typeof row.inscrit_le !== 'string' || !Number.isFinite(Date.parse(row.inscrit_le))
        || (row.active_le !== null && (typeof row.active_le !== 'string' || !Number.isFinite(Date.parse(row.active_le))))
        || !['en_attente', 'attribuee', 'plafonnee', 'verification'].includes(String(row.recompense))) throw new GrowthError('invalid_response');
      return { id: row.id, registeredAt: row.inscrit_le, activatedAt: row.active_le as string | null, reward: row.recompense as ReferralReward };
    }),
  };
}
