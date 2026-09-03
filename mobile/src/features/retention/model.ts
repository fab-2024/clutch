import { t } from '@/src/lib/i18n';

import { STREAK_MILESTONES, type CallStreakState, type StreakDayStatus, type StreakMilestone } from './types';

export class CallStreakError extends Error {
  constructor(readonly code: string, readonly definitive = false) {
    super(code === 'protector_stock_full' ? t('streak.error.stockFull')
      : code === 'insufficient_volts' ? t('streak.error.insufficientVolts')
        : code === 'streak_milestone_locked' ? t('streak.error.milestoneLocked')
          : t('streak.error.unavailable'));
    this.name = 'CallStreakError';
  }
}

export const isUuid = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const isDay = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const isTimestamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const isMilestone = (value: unknown): value is StreakMilestone => STREAK_MILESTONES.includes(value as StreakMilestone);
const fail = (): never => { throw new CallStreakError('invalid_response'); };
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail();

// Reject mismatched owners, invented stock/prices and broken dates. A malformed
// purchase response must NEVER cause the durable operation key to be removed.
export function parseCallStreakState(value: unknown, ownerId: string): CallStreakState {
  const raw = object(value);
  if (raw.version !== 1 || raw.user_id !== ownerId || !isDay(raw.jour)
    || typeof raw.fuseau !== 'string' || !raw.fuseau || !isTimestamp(raw.heure_serveur) || !isTimestamp(raw.fin_journee)
    || Date.parse(raw.fin_journee) <= Date.parse(raw.heure_serveur)
    || !isCount(raw.serie_actuelle) || !isCount(raw.meilleure_serie) || !isCount(raw.jours_valides)
    || raw.serie_actuelle > raw.meilleure_serie || raw.meilleure_serie > raw.jours_valides
    || (raw.dernier_jour_valide !== null && !isDay(raw.dernier_jour_valide))
    || typeof raw.jour_valide !== 'boolean' || typeof raw.opportunite_du_jour !== 'boolean'
    || (raw.match_eligible_id !== null && (typeof raw.match_eligible_id !== 'string' || !raw.match_eligible_id))
    || !isCount(raw.stock_protecteurs) || raw.stock_protecteurs > 2 || raw.stock_max !== 2 || raw.prix_protecteur !== 90
    || !isUuid(raw.operation_achat) || typeof raw.protection_utilisee !== 'boolean'
    || (raw.jalon_selectionne !== null && !isMilestone(raw.jalon_selectionne)) || !isCount(raw.solde_volts)
    || !Array.isArray(raw.historique) || raw.historique.length > 14 || !Array.isArray(raw.jalons)
    || !Array.isArray(raw.protecteurs_historique) || raw.protecteurs_historique.length > 20) return fail();

  const history = raw.historique.map((value) => {
    const row = object(value);
    if (!isDay(row.jour) || !['valide', 'protege', 'neutre', 'manque', 'a_faire', 'inactif'].includes(String(row.etat))
      || !isCount(row.calls) || ((row.etat === 'valide') !== (row.calls > 0))) return fail();
    return { day: row.jour, status: row.etat as StreakDayStatus, calls: row.calls };
  });
  const best = raw.meilleure_serie;
  const milestones = raw.jalons.map((value) => {
    const row = object(value);
    if (!isMilestone(row.palier) || !isTimestamp(row.obtenu_le) || row.palier > best) return fail();
    return { days: row.palier, earnedAt: row.obtenu_le };
  });
  const today = raw.jour;
  if (new Set(history.map((day) => day.day)).size !== history.length
    || history.some((day, index) => day.day > today || (index > 0 && day.day <= history[index - 1].day))
    || new Set(milestones.map((milestone) => milestone.days)).size !== milestones.length
    || (raw.jour_valide && (raw.serie_actuelle === 0 || raw.dernier_jour_valide !== raw.jour))) return fail();
  if (raw.jalon_selectionne !== null && !milestones.some((milestone) => milestone.days === raw.jalon_selectionne)) return fail();
  const protectorHistory = raw.protecteurs_historique.map((value) => {
    const row = object(value);
    if (!isUuid(row.id) || !['bienvenue', 'achat', 'utilisation'].includes(String(row.type))
      || row.quantite !== (row.type === 'utilisation' ? -1 : 1) || !isCount(row.stock_apres)
      || row.stock_apres > 2 || !isTimestamp(row.cree_le)) return fail();
    return { id: row.id, kind: row.type as 'bienvenue' | 'achat' | 'utilisation', quantity: row.quantite as number, stockAfter: row.stock_apres, createdAt: row.cree_le };
  });
  return {
    userId: ownerId, day: raw.jour, timeZone: raw.fuseau, serverNow: raw.heure_serveur, dayEndsAt: raw.fin_journee,
    current: raw.serie_actuelle, best: raw.meilleure_serie, totalValidatedDays: raw.jours_valides,
    lastValidatedDay: raw.dernier_jour_valide as string | null, todayValidated: raw.jour_valide,
    eligibleMatchId: raw.match_eligible_id as string | null, hadOpportunityToday: raw.opportunite_du_jour,
    protectors: raw.stock_protecteurs, maxProtectors: 2, protectorPrice: 90, purchaseOperationId: raw.operation_achat,
    protectionUsed: raw.protection_utilisee, selectedMilestone: raw.jalon_selectionne as StreakMilestone | null,
    volts: raw.solde_volts, history, milestones, protectorHistory,
  };
}

export function remainingStreakMs(state: CallStreakState, elapsedMs = 0) {
  return Math.max(0, Date.parse(state.dayEndsAt) - Date.parse(state.serverNow) - Math.max(0, elapsedMs));
}

export function streakDayMessage(state: CallStreakState) {
  if (state.todayValidated) return t('streak.day.validated');
  if (!state.eligibleMatchId) return state.hadOpportunityToday ? t('streak.day.noMoreCalls') : t('streak.day.noOpportunity');
  return t('streak.day.pending');
}

export function remainingStreakLabel(ms: number) {
  if (ms <= 0) return t('streak.day.refreshing');
  const minutes = Math.ceil(ms / 60_000);
  return minutes < 60 ? t('streak.time.minutes', { count: minutes }) : t('streak.time.hours', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
}
