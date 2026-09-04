import { effectIsActive, parseConsumableReceipt, parsePublicVisualEffects, parseVisualConsumablesState, remainingEffectLabel } from '../model';

const OWNER = '10000000-0000-4000-8000-000000000001';
const OPERATION = '20000000-0000-4000-8000-000000000002';
const MOVEMENT = '30000000-0000-4000-8000-000000000003';
const payload = {
  expansion_disponible: true,
  solde_volts: 215,
  impact_classement: false,
  conversion_frags: false,
  consommables: [
    { type: 'showcase_spotlight', stock: 1, stock_max: 3, prix_volts: 60, actif_jusqua: null },
    { type: 'profile_pulse', stock: 2, stock_max: 3, prix_volts: 45, actif_jusqua: '2026-09-05T08:00:00Z' },
  ],
  historique: [{ id: '40000000-0000-4000-8000-000000000004', operation_id: OPERATION,
    type: 'showcase_spotlight', action: 'purchase', cree_le: '2026-09-04T08:00:00Z' }],
};

describe('P3 visual consumable model', () => {
  it('accepts only the complete non-competitive server projection', () => {
    expect(parseVisualConsumablesState(payload, OWNER, 42)).toMatchObject({
      ownerId: OWNER, balanceVolts: 215, affectsRanking: false, convertsToFrags: false, receivedAt: 42,
      items: [{ type: 'showcase_spotlight', stock: 1 }, { type: 'profile_pulse', stock: 2 }],
    });
    expect(() => parseVisualConsumablesState({ ...payload, impact_classement: true }, OWNER)).toThrow('invalid_response');
    expect(() => parseVisualConsumablesState({ ...payload, consommables: [payload.consommables[0]] }, OWNER)).toThrow('invalid_response');
    expect(() => parseVisualConsumablesState({ ...payload, consommables: [
      { ...payload.consommables[0], prix_volts: 1 }, payload.consommables[1],
    ] }, OWNER)).toThrow('invalid_response');
  });

  it('pins operation, action and movement when parsing receipts', () => {
    const receipt = parseConsumableReceipt({ operation_id: OPERATION, action: 'purchase', applique: true,
      mouvement_id: MOVEMENT, etat: payload }, OWNER, { operationId: OPERATION, action: 'purchase' });
    expect(receipt).toMatchObject({ operationId: OPERATION, action: 'purchase', applied: true, movementId: MOVEMENT });
    expect(() => parseConsumableReceipt({ operation_id: OPERATION, action: 'purchase', applique: true,
      mouvement_id: null, etat: payload }, OWNER, { operationId: OPERATION, action: 'purchase' })).toThrow('invalid_response');
    expect(() => parseConsumableReceipt({ operation_id: OPERATION, action: 'activation', applique: true,
      mouvement_id: MOVEMENT, etat: payload }, OWNER, { operationId: OPERATION, action: 'activation' })).toThrow('invalid_response');
  });

  it('parses public effects and calculates a bounded countdown', () => {
    const effects = parsePublicVisualEffects([{ type: 'profile_pulse', actif_jusqua: '2026-09-05T08:00:00Z' }]);
    expect(effects).toEqual([{ type: 'profile_pulse', activeUntil: '2026-09-05T08:00:00Z' }]);
    expect(effectIsActive(payloadToItem(), Date.parse('2026-09-05T07:00:00Z'))).toBe(true);
    expect(remainingEffectLabel('2026-09-05T08:00:00Z', Date.parse('2026-09-05T06:29:30Z'))).toBe('1 H 31');
  });
});

function payloadToItem() {
  return parseVisualConsumablesState(payload, OWNER).items[1];
}
