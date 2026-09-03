import { supabase } from '@/src/lib/supabase';

import { DailyBonusError, parseDailyBonusReceipt } from './dailyBonus';

import type {
  PlayerEconomy,
  VoltLedger,
  VoltMovement,
  VoltMovementSource,
} from './types';

type FragsState = {
  frags?: number | null;
};

export async function claimDailyVoltBonus(userId: string, timeZone: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    // The account, amount, date and idempotency key are never supplied by the
    // client. The timezone is only a suggestion for the first-ever claim.
    const { data, error } = await supabase
      .rpc('clutch_reclamer_bonus_quotidien_v1', { p_fuseau: timeZone })
      .abortSignal(controller.signal);
    if (error) {
      const code = typeof error.code === 'string' ? error.code : 'network';
      throw new DailyBonusError(code, !['28000', '42501', '22023', 'PGRST202', '42883'].includes(code));
    }
    return parseDailyBonusReceipt(data, userId);
  } catch (error) {
    if (error instanceof DailyBonusError) throw error;
    throw new DailyBonusError('network', true);
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadPlayerEconomy(userId: string): Promise<PlayerEconomy> {
  const [seasonResult, voltsResult] = await Promise.all([
    supabase
      .from('v_saisons')
      .select('id')
      .eq('statut', 'en_cours')
      .limit(1)
      .maybeSingle(),
    supabase.rpc('clutch_solde_volts', { p_user: userId }),
  ]);

  if (seasonResult.error) throw seasonResult.error;
  if (voltsResult.error) throw voltsResult.error;

  const seasonId = typeof seasonResult.data?.id === 'string' ? seasonResult.data.id : null;
  let frags: number | null = null;

  if (seasonId) {
    const { data, error } = await supabase.rpc('clutch_etat_frags', { p_saison_id: seasonId });
    if (error) throw error;
    frags = toBalance((data as FragsState | null)?.frags);
  }

  return {
    frags,
    volts: toBalance(voltsResult.data),
    seasonId,
  };
}

export async function loadVoltLedger(limit = 24, before: string | null = null): Promise<VoltLedger> {
  const { data, error } = await supabase.rpc('clutch_journal_volts_v1', {
    p_limit: Math.max(1, Math.min(Math.round(limit), 100)),
    p_before: before,
  });

  if (error) throw error;

  const raw = recordValue(data);
  const integrity = recordValue(raw.integrite);
  return {
    balance: nonNegativeInteger(raw.solde),
    movements: arrayValue(raw.mouvements).map(parseVoltMovement).filter((item): item is VoltMovement => item !== null),
    hasMore: raw.has_more === true,
    integrity: {
      convertsToFrags: falseLiteral(integrity.conversion_volts_vers_frags),
      affectsRanking: falseLiteral(integrity.impact_classement),
    },
  };
}

function toBalance(value: unknown): number | null {
  const balance = Number(value);
  return Number.isFinite(balance) ? Math.max(0, Math.round(balance)) : null;
}

const VOLT_SOURCES: VoltMovementSource[] = [
  'bonus_quotidien',
  'onboarding',
  'progression',
  'mission',
  'activation',
  'exceptionnelle',
  'achat_cosmetique',
  'achat_consommable',
  'ajustement',
];

function parseVoltMovement(value: unknown): VoltMovement | null {
  const raw = recordValue(value);
  const id = stringValue(raw.id);
  const createdAt = stringValue(raw.date);
  const idempotencyKey = stringValue(raw.cle_idempotence);
  if (!id || !createdAt || !idempotencyKey) return null;

  const linkedObject = recordValue(raw.objet);
  const objectId = stringValue(linkedObject.id);
  const sourceValue = stringValue(raw.source_economique) as VoltMovementSource;

  return {
    id,
    amount: integerValue(raw.montant),
    source: VOLT_SOURCES.includes(sourceValue) ? sourceValue : 'ajustement',
    origin: stringValue(raw.origine),
    reference: stringValue(raw.reference),
    object: objectId
      ? {
          id: objectId,
          name: stringValue(linkedObject.nom) || objectId,
          slot: stringValue(linkedObject.emplacement),
        }
      : null,
    campaignKey: nullableString(raw.campagne_key),
    createdAt,
    idempotencyKey,
    balanceAfter: nonNegativeInteger(raw.solde_apres),
  };
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nullableString(value: unknown): string | null {
  const result = stringValue(value).trim();
  return result || null;
}

function integerValue(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? Math.round(result) : 0;
}

function nonNegativeInteger(value: unknown): number {
  return Math.max(0, integerValue(value));
}

function falseLiteral(value: unknown): false {
  if (value !== false) throw new Error('Le contrat d’intégrité des Volts est invalide.');
  return false;
}
