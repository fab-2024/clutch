import { parseCallStreakState } from '../model';

export const OWNER = '11111111-1111-4111-8111-111111111111';
export const OTHER_OWNER = '22222222-2222-4222-8222-222222222222';
export const OPERATION = '33333333-3333-4333-8333-333333333333';
export const OTHER_OPERATION = '44444444-4444-4444-8444-444444444444';
export const MOVEMENT = '55555555-5555-4555-8555-555555555555';

export const payload = {
  version: 1, user_id: OWNER, jour: '2026-09-03', fuseau: 'Europe/Paris',
  heure_serveur: '2026-09-03T08:00:00Z', fin_journee: '2026-09-03T22:00:00Z',
  serie_actuelle: 6, meilleure_serie: 14, jours_valides: 28, dernier_jour_valide: '2026-09-02',
  jour_valide: false, match_eligible_id: 'pandascore-123', opportunite_du_jour: true,
  stock_protecteurs: 1, stock_max: 2, prix_protecteur: 90, operation_achat: OPERATION,
  protection_utilisee: false, jalon_selectionne: 14, solde_volts: 310,
  historique: [
    { jour: '2026-09-01', etat: 'valide', calls: 3 },
    { jour: '2026-09-02', etat: 'valide', calls: 1 },
    { jour: '2026-09-03', etat: 'a_faire', calls: 0 },
  ],
  jalons: [3, 7, 14].map((palier) => ({ palier, obtenu_le: '2026-08-15T10:00:00Z' })),
  protecteurs_historique: [{ id: MOVEMENT, type: 'bienvenue', quantite: 1, stock_apres: 1, cree_le: '2026-08-01T08:00:00Z' }],
};
export const state = parseCallStreakState(payload, OWNER);
export const receipt = { operationId: OPERATION, purchased: true, movementId: MOVEMENT,
  state: { ...state, volts: 220, protectors: 2, purchaseOperationId: OTHER_OPERATION, serverNow: '2026-09-03T08:00:01Z' } };
