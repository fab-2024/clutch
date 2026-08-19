import { supabase } from '@/src/lib/supabase';

export type LeagueSummary = {
  id: string;
  nom: string;
  code: string;
  createur_id: string;
  cree_le: string;
  nb_membres: number;
};

export type GlobalRankRow = {
  rang: number;
  id: string;
  pseudo: string;
  frags: number;
  pic_frags: number;
  pronostics_regles: number;
  pronostics_gagnes: number;
  taux_reussite: number | null;
  provisoire: boolean;
  moi: boolean;
};

export type QuestPartner = { id?: string; pseudo?: string };
export type QuestMatch = { id?: string; tag_a?: string; tag_b?: string; equipe_a?: string; equipe_b?: string };
export type QuestLeague = { id?: string; nom?: string };

export type FriendQuest = {
  id: string;
  type: string;
  statut: string;
  progression: number;
  objectif: number;
  recompense_xp: number;
  recompense_volts: number;
  expire_le: string | null;
  moi_fait?: boolean;
  partenaire_fait?: boolean;
  partenaire?: QuestPartner | null;
  match?: QuestMatch | null;
  ligue?: QuestLeague | null;
};

export type DuoStreak = {
  user_id?: string;
  pseudo?: string;
  missions_terminees?: number;
  serie_semaines?: number;
};

export type FriendQuestsData = {
  actives: FriendQuest[];
  historique: FriendQuest[];
  duos: DuoStreak[];
  a_reveler: FriendQuest | null;
};

export type FriendRow = {
  id: string;
  pseudo: string;
  solde?: number;
  paris?: number;
  gagnes?: number;
  tag_favori?: string | null;
  depuis?: string;
};

export type FriendsData = {
  amis: FriendRow[];
  recues: FriendRow[];
  envoyees: FriendRow[];
};

export type PlayerSearchRow = {
  id: string;
  pseudo: string;
  relation: 'aucune' | 'demande_envoyee' | 'demande_recue' | 'ami' | string;
};

export type DuelRow = {
  token: string;
  match_id: string;
  statut: string;
  moi_role?: string;
  createur_pseudo?: string;
  accepteur_pseudo?: string | null;
  createur_choix?: 'a' | 'b';
  accepteur_choix?: 'a' | 'b' | null;
  equipe_a?: string;
  equipe_b?: string;
  tag_a?: string;
  tag_b?: string;
  jeu?: string;
  evenement?: string;
  debut?: string;
};

async function activeSeasonId() {
  const { data, error } = await supabase
    .from('v_saisons')
    .select('id')
    .eq('statut', 'en_cours')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export async function loadLeagues(): Promise<LeagueSummary[]> {
  const { data, error } = await supabase
    .from('v_mes_ligues')
    .select('id,nom,code,createur_id,cree_le,nb_membres')
    .order('cree_le', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, nb_membres: Number(row.nb_membres ?? 0) })) as LeagueSummary[];
}

export async function loadGlobalRanking(): Promise<GlobalRankRow[]> {
  const seasonId = await activeSeasonId();
  if (!seasonId) return [];
  const { data, error } = await supabase.rpc('clutch_classement_frags', { p_saison_id: seasonId });
  if (error) throw error;
  return Array.isArray(data)
    ? data.map((row) => ({
        ...row,
        rang: Number(row.rang ?? 0),
        frags: Number(row.frags ?? 0),
        pic_frags: Number(row.pic_frags ?? 0),
        pronostics_regles: Number(row.pronostics_regles ?? 0),
        pronostics_gagnes: Number(row.pronostics_gagnes ?? 0),
        taux_reussite: row.taux_reussite == null ? null : Number(row.taux_reussite),
        provisoire: Boolean(row.provisoire),
        moi: Boolean(row.moi),
      })) as GlobalRankRow[]
    : [];
}

export async function createLeague(name: string) {
  const { data, error } = await supabase.rpc('creer_ligue', { p_nom: name.trim() });
  if (error) throw error;
  return data;
}

export async function joinLeague(code: string) {
  const { data, error } = await supabase.rpc('rejoindre_ligue', { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  return data;
}

export async function loadFriendQuests(): Promise<FriendQuestsData> {
  const { data, error } = await supabase.rpc('clutch_friend_quests_dashboard_v1');
  if (error) throw error;
  const payload = (data ?? {}) as Partial<FriendQuestsData>;
  return {
    actives: normalizeQuests(payload.actives),
    historique: normalizeQuests(payload.historique),
    duos: Array.isArray(payload.duos) ? payload.duos : [],
    a_reveler: payload.a_reveler ? normalizeQuest(payload.a_reveler) : null,
  };
}

export async function loadFriends(): Promise<FriendsData> {
  const seasonId = await activeSeasonId();
  const { data, error } = await supabase.rpc('clutch_mes_amis', { p_saison_id: seasonId });
  if (error) throw error;
  const payload = (data ?? {}) as Partial<FriendsData>;
  return {
    amis: normalizeFriendRows(payload.amis),
    recues: normalizeFriendRows(payload.recues),
    envoyees: normalizeFriendRows(payload.envoyees),
  };
}

export async function searchPlayers(term: string): Promise<PlayerSearchRow[]> {
  const { data, error } = await supabase.rpc('clutch_chercher_joueurs', { p_terme: term.trim() });
  if (error) throw error;
  return Array.isArray(data) ? (data as PlayerSearchRow[]) : [];
}

export async function requestFriend(userId: string) {
  const { data, error } = await supabase.rpc('clutch_demander_ami', { p_user: userId });
  if (error) throw error;
  return data;
}

export async function answerFriendRequest(userId: string, accept: boolean) {
  const { data, error } = await supabase.rpc('clutch_repondre_demande', { p_user: userId, p_accepter: accept });
  if (error) throw error;
  return data;
}

export async function removeFriend(userId: string) {
  const { data, error } = await supabase.rpc('clutch_retirer_ami', { p_user: userId });
  if (error) throw error;
  return data;
}

export async function loadDuels(limit = 30): Promise<DuelRow[]> {
  const { data, error } = await supabase.rpc('clutch_mes_defis_match', { p_limite: limit });
  if (error) throw error;
  if (Array.isArray(data)) return data as DuelRow[];
  if (data && typeof data === 'object') {
    const payload = data as { defis?: DuelRow[]; duels?: DuelRow[]; items?: DuelRow[] };
    if (Array.isArray(payload.defis)) return payload.defis;
    if (Array.isArray(payload.duels)) return payload.duels;
    if (Array.isArray(payload.items)) return payload.items;
  }
  return [];
}

function normalizeQuests(value: FriendQuest[] | undefined) {
  return Array.isArray(value) ? value.map(normalizeQuest) : [];
}

function normalizeQuest(value: FriendQuest): FriendQuest {
  return {
    ...value,
    progression: Number(value.progression ?? 0),
    objectif: Math.max(1, Number(value.objectif ?? 1)),
    recompense_xp: Number(value.recompense_xp ?? 0),
    recompense_volts: Number(value.recompense_volts ?? 0),
  };
}

function normalizeFriendRows(value: FriendRow[] | undefined) {
  return Array.isArray(value)
    ? value.map((row) => ({
        ...row,
        solde: row.solde == null ? undefined : Number(row.solde),
        paris: row.paris == null ? undefined : Number(row.paris),
        gagnes: row.gagnes == null ? undefined : Number(row.gagnes),
      }))
    : [];
}
