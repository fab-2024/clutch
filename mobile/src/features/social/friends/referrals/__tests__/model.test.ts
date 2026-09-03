import { parseInvitation, parseReferrals } from '../model';

const dashboard = { code: null, partages: 0, inscrits: 0, actives: 0, volts_recus: 0, recompenses_jour: 0,
  recompenses_mois: 0, montant: 30, plafond_jour: 5, plafond_mois: 20, deja_parraine: false, historique: [] };

describe('invitation contracts', () => {
  it('does not invent statistics on a failed or missing response', () => {
    expect(() => parseReferrals(null)).toThrow();
    expect(() => parseReferrals({ ...dashboard, inscrits: '4' })).toThrow();
    expect(parseReferrals(dashboard)).toMatchObject({ active: 0, registered: 0, reward: 30, dailyCap: 5, monthlyCap: 20 });
  });
  it('recognizes server rejections without displaying database internals', () => {
    expect(() => parseReferrals({ erreur: 'rate_limited' })).toThrow('Trop de tentatives');
    expect(() => parseReferrals({ erreur: 'private_table_schema_secret' })).not.toThrow('private_table_schema_secret');
  });
  it('does not give an identity to a private inviter', () => {
    expect(parseInvitation({ valide: true, parrain: null, recompense_volts: 30, plafond_jour: 5, plafond_mois: 20 })?.inviter).toBeNull();
    expect(parseInvitation(null)).toBeNull();
  });
  it('whitelists anonymous referral history fields', () => {
    const value = parseReferrals({ ...dashboard, historique: [{ id: 'receipt', inscrit_le: '2026-09-03T08:00:00Z',
      active_le: null, recompense: 'en_attente', filleul_id: 'secret', email: 'secret@example.invalid' }] });
    expect(JSON.stringify(value)).not.toContain('secret');
    expect(value.history[0].activatedAt).toBeNull();
  });
});
