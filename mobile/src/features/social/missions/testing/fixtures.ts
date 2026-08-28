import type { FriendQuestsData } from '../types';

export const FRIEND_MISSIONS_FIXTURE: FriendQuestsData = {
  actives: [
    {
      id: 'active-duo-calls',
      type: 'duo_calls',
      statut: 'active',
      progression: 2,
      objectif: 4,
      recompense_xp: 100,
      recompense_volts: 25,
      expire_le: '2099-08-28T12:00:00.000Z',
      partenaire: { id: 'nova', pseudo: 'Nova' },
    },
    {
      id: 'active-opposition',
      type: 'opposition',
      statut: 'active',
      progression: 1,
      objectif: 2,
      recompense_xp: 80,
      recompense_volts: 15,
      expire_le: '2099-08-29T12:00:00.000Z',
      partenaire: { id: 'kayo', pseudo: 'Kayo' },
      match: { id: 'match-1', tag_a: 'G2', tag_b: 'FNC' },
    },
  ],
  duos: [
    { user_id: 'nova', pseudo: 'Nova', missions_terminees: 8, serie_semaines: 4 },
  ],
  historique: [
    {
      id: 'history-same-side',
      type: 'same_side',
      statut: 'terminee',
      progression: 1,
      objectif: 1,
      recompense_xp: 60,
      recompense_volts: 10,
      expire_le: null,
      partenaire: { id: 'nova', pseudo: 'Nova' },
    },
  ],
  a_reveler: null,
};

export const EMPTY_FRIEND_MISSIONS_FIXTURE: FriendQuestsData = {
  actives: [],
  duos: [],
  historique: [],
  a_reveler: null,
};
