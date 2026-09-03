import { EMPTY_EQUIPPED_COSMETICS } from '@/src/features/shop/types';
import { invitationCode, milestonePath, publicPseudo } from '@/src/lib/publicLinks';

import { optimisticLike, parseMilestone, parseShowcase } from '../model';

jest.mock('@/src/config/release', () => ({ publicAppOrigin: 'https://clutch.example' }));
export const rawShowcase = {
  pseudo: 'Nova', avatar_id: null, titre: null, equipe: null,
  classement: { frags: 0, rang: null }, serie: { actuelle: 3, meilleure: 7, jalon: 3 },
  proprietaire: false, profil_public: true, visibilite: 'publique', montrer_rang: true, montrer_serie: true, montrer_jalons: true,
  notifications_likes: null, likes: 2, aime: false, peut_aimer: true, vues: null, vues_semaine: null,
};

describe('public growth projections', () => {
  it('retains real zeroes without fabricated rank or visitor statistics', () => {
    const value = parseShowcase({ ...rawShowcase, vues: 900, vues_semaine: 300 }, EMPTY_EQUIPPED_COSMETICS)!;
    expect(value.ranking).toEqual({ frags: 0, rank: null, label: null });
    expect(value.views).toBeNull();
    expect(value.weeklyViews).toBeNull();
    expect(value.previousWeeklyViews).toBeNull();
  });
  it('only owners receive view analytics and honors every display toggle', () => {
    const value = parseShowcase({ ...rawShowcase, proprietaire: true, vues: 3, vues_semaine: 2, vues_semaine_precedente: 1,
      montrer_rang: false, montrer_serie: false, montrer_jalons: false }, EMPTY_EQUIPPED_COSMETICS)!;
    expect(value.views).toBe(3);
    expect(value.ranking).toBeNull();
    expect(value.streak).toEqual({ current: null, best: null, milestone: null });
  });
  it('does not present legacy placement seed points as earned Frags', () => {
    expect(parseShowcase({ ...rawShowcase, classement: { frags: 1000, provisoire: true, pronostics_regles: 0 } }, EMPTY_EQUIPPED_COSMETICS)?.ranking?.frags).toBe(0);
  });
  it('applies optimistic likes once, clamps totals, and never permits owner likes', () => {
    const value = parseShowcase(rawShowcase, EMPTY_EQUIPPED_COSMETICS)!;
    const liked = optimisticLike(value, true);
    expect(liked.likes).toBe(3);
    expect(optimisticLike(liked, true)).toBe(liked);
    expect(optimisticLike(liked, false).likes).toBe(2);
    expect(optimisticLike({ ...value, canLike: false }, true).liked).toBe(false);
  });
  it.each([{ likes: -1 }, { likes: '99' }, { visibilite: 'friends' }, { proprietaire: 'yes' }])('rejects inconsistent responses %j', (override) => {
    expect(() => parseShowcase({ ...rawShowcase, ...override }, EMPTY_EQUIPPED_COSMETICS)).toThrow();
  });
  it('requires an earned timestamp and supported milestone', () => {
    expect(parseMilestone(null)).toBeNull();
    expect(parseMilestone({ pseudo: 'Nova', palier: 7, obtenu_le: '2026-09-03T09:00:00Z' })?.milestone).toBe(7);
    for (const row of [{ pseudo: 'Nova', palier: 999, obtenu_le: '2026-09-03' }, { pseudo: 'Nova', palier: 3, obtenu_le: 'invalid' }]) {
      expect(() => parseMilestone(row)).toThrow();
    }
  });
  it('accepts personal codes and same-origin links only', () => {
    const code = '0123456789abcdef0123456789abcdef';
    expect(invitationCode(code.toUpperCase())).toBe(code);
    expect(invitationCode(`https://clutch.example/i/${code}`)).toBe(code);
    expect(invitationCode(`https://evil.example/i/${code}`)).toBeNull();
    expect(invitationCode(`https://clutch.example/i/${code}?owner=another`)).toBeNull();
    expect(publicPseudo('../settings')).toBeNull();
    expect(milestonePath('Étoile', 7)).toBe('/s/%C3%89toile/7');
    expect(milestonePath('Nova', 999)).toBeNull();
  });
});
