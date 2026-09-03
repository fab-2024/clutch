import { t } from '@/src/lib/i18n';

export const DAILY_VOLT_BONUS = 10;

export type DailyBonusReceipt = {
  userId: string;
  awarded: boolean;
  amount: number;
  balance: number;
  movementId: string;
  rewardDay: string;
  timeZone: string;
  awardedAt: string;
  serverNow: string;
  nextAvailableAt: string;
};

export class DailyBonusError extends Error {
  constructor(readonly code: string, readonly retryable: boolean) {
    super(t('economy.errors.dailyBonusUnavailable'));
    this.name = 'DailyBonusError';
  }
}

export function parseDailyBonusReceipt(value: unknown, expectedUserId: string): DailyBonusReceipt {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const validTimestamp = (entry: unknown): entry is string => (
    typeof entry === 'string' && Number.isFinite(Date.parse(entry))
  );
  if (
    raw.user_id !== expectedUserId
    || typeof raw.attribue !== 'boolean'
    || typeof raw.montant !== 'number'
    || raw.montant !== (raw.attribue ? DAILY_VOLT_BONUS : 0)
    || raw.montant_quotidien !== DAILY_VOLT_BONUS
    || typeof raw.solde !== 'number' || !Number.isSafeInteger(raw.solde) || raw.solde < 0
    || typeof raw.mouvement_id !== 'string' || !raw.mouvement_id
    || typeof raw.jour !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.jour)
    || typeof raw.fuseau !== 'string' || !raw.fuseau
    || !validTimestamp(raw.attribue_le) || !validTimestamp(raw.heure_serveur)
    || !validTimestamp(raw.prochain_bonus_le)
    || Date.parse(raw.prochain_bonus_le) <= Date.parse(raw.heure_serveur)
  ) {
    throw new DailyBonusError('invalid_response', false);
  }
  return {
    userId: expectedUserId,
    awarded: raw.attribue,
    amount: raw.montant,
    balance: raw.solde,
    movementId: raw.mouvement_id,
    rewardDay: raw.jour,
    timeZone: raw.fuseau,
    awardedAt: raw.attribue_le,
    serverNow: raw.heure_serveur,
    nextAvailableAt: raw.prochain_bonus_le,
  };
}

export function nextBonusDelay(receipt: DailyBonusReceipt, requestElapsedMs = 0) {
  // Neither the device's calendar nor its wall clock grants a reward. Scheduling
  // is only a hint, based on the interval returned by the server (including DST).
  return Math.max(1_000, Math.min(
    27 * 60 * 60 * 1_000,
    Date.parse(receipt.nextAvailableAt) - Date.parse(receipt.serverNow) - requestElapsedMs,
  ));
}
