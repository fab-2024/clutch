import { t, type TranslationKey } from './i18n';

const messages: Record<string, TranslationKey> = {
  authentication_required: 'growth.error.auth', '28000': 'growth.error.auth', '42501': 'growth.error.auth',
  rate_limited: 'growth.error.rate', invite_invalid: 'invite.error.invalid', invite_self: 'invite.error.self',
  invite_already_attributed: 'invite.error.attributed', invite_not_new_account: 'invite.error.existing',
  milestone_not_public: 'growth.error.milestone', public_origin_missing: 'growth.error.config',
  storage_unavailable: 'growth.error.storage', share_unavailable: 'growth.error.share',
};

export class GrowthError extends Error {
  constructor(readonly reason: string) { super(t(messages[reason] ?? 'growth.error.network')); this.name = 'GrowthError'; }
}

export function growthError(error: unknown) {
  return error instanceof GrowthError ? error.message : t('growth.error.network');
}

export function growthPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new GrowthError('invalid_response');
  const data = value as Record<string, unknown>;
  if (typeof data.erreur === 'string') throw new GrowthError(data.erreur);
  return data;
}

export function growthCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new GrowthError('invalid_response');
  return value;
}
