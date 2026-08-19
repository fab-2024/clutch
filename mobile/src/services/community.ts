import { supabase } from '@/src/lib/supabase';

export type CommunityFaction = {
  equipe_id: string;
  nom: string;
  tag: string;
  jeu: string;
  logo: string | null;
  membres: number;
  niveau_atteint: number;
  croissance_24h: number;
  croissance_7j: number;
  moi: boolean;
  dernier_evenement_id: string | null;
  dernier_evenement_niveau: number | null;
  dernier_evenement_nom: string | null;
  dernier_evenement_le: string | null;
  dernier_evenement_recompense_volts: number;
};

export type CommunityActivity = {
  user_id: string;
  pseudo: string;
  pronos_7j: number;
  gagnes_7j: number;
  rang: number;
};

export type CommunityArchive = {
  id: string;
  niveau: number;
  nom: string;
  seuil: number;
  recompense_volts: number;
  membres: number;
  cree_le: string;
};

export type CommunityMe = {
  user_id: string;
  pseudo: string;
  equipe_id: string;
  membre_depuis: string;
  pronos_depuis: number;
  mutations_vecues: number;
  pronos_7j: number;
  gagnes_7j: number;
  delta_frags_7j: number;
  rang_activite: number | null;
  total_activite: number | null;
  top_activite: CommunityActivity[];
  archives: CommunityArchive[];
};

export type CommunityData = {
  factions: CommunityFaction[];
  moi: CommunityMe | null;
};

export type CommunityForm = {
  level: number;
  code: string;
  name: string;
  threshold: number;
  reward: number;
  phrase: string;
};

export const COMMUNITY_FORMS: CommunityForm[] = [
  { level: 1, code: 'I', name: 'Fiole', threshold: 0, reward: 0, phrase: 'Le noyau vient de s’allumer.' },
  { level: 2, code: 'II', name: 'Flacon', threshold: 10, reward: 200, phrase: 'L’élixir commence à tenir sa charge.' },
  { level: 3, code: 'III', name: 'Bombonne', threshold: 50, reward: 300, phrase: 'La faction devient impossible à ignorer.' },
  { level: 4, code: 'IV', name: 'Calice', threshold: 100, reward: 500, phrase: 'Le récipient devient un véritable artefact.' },
  { level: 5, code: 'V', name: 'Alambic', threshold: 500, reward: 750, phrase: 'La charge se raffine au lieu de simplement grossir.' },
  { level: 6, code: 'VI', name: 'Cornue', threshold: 1000, reward: 1000, phrase: 'Le réacteur devient instable — dans le bon sens.' },
  { level: 7, code: 'VII', name: 'Océan', threshold: 5000, reward: 1500, phrase: 'La faction est devenue son propre environnement.' },
];

const OCEAN_SATURATION = 10_000;

export type FactionProgress = {
  level: number;
  current: CommunityForm;
  next: CommunityForm | null;
  progress: number;
  objective: number;
  remaining: number;
  max: boolean;
};

export async function loadCommunityData(): Promise<CommunityData> {
  const { data, error } = await supabase.rpc('clutch_communaute_dashboard_v4');
  if (error) throw error;

  const payload = (data ?? {}) as Partial<CommunityData>;
  return {
    factions: Array.isArray(payload.factions)
      ? payload.factions.map(normalizeFaction)
      : [],
    moi: payload.moi ? normalizeMe(payload.moi) : null,
  };
}

export function factionProgress(members: number, reachedLevel?: number | null): FactionProgress {
  const count = Math.max(0, Math.floor(Number(members) || 0));
  const derivedLevel = COMMUNITY_FORMS.reduce(
    (level, form) => (count >= form.threshold ? form.level : level),
    1,
  );
  const persisted = Number(reachedLevel);
  const level = Number.isFinite(persisted)
    ? Math.max(1, Math.min(COMMUNITY_FORMS.length, Math.floor(persisted)))
    : derivedLevel;

  const current = COMMUNITY_FORMS[level - 1];
  const next = level < COMMUNITY_FORMS.length ? COMMUNITY_FORMS[level] : null;
  const floor = current.threshold;
  const objective = next?.threshold ?? OCEAN_SATURATION;
  const denominator = Math.max(1, objective - floor);
  const progress = Math.max(0, Math.min(1, (count - floor) / denominator));
  const max = level === COMMUNITY_FORMS.length && count >= OCEAN_SATURATION;

  return {
    level,
    current,
    next,
    progress: max ? 1 : progress,
    objective,
    remaining: max ? 0 : Math.max(0, objective - count),
    max,
  };
}

export function teamHue(tag: string, name = '') {
  const known: Record<string, number> = {
    KC: 250,
    G2: 25,
    FNC: 45,
    MKOI: 300,
    VIT: 100,
    BDS: 340,
    TH: 15,
    SK: 205,
    GX: 150,
    RGE: 130,
    NAVI: 60,
    SPR: 215,
    FAZE: 8,
    MOUZ: 0,
    FLC: 160,
    AST: 355,
    SEN: 350,
    DRX: 230,
    FUT: 195,
    M8: 190,
    SLY: 165,
    T1: 10,
    TL: 235,
  };

  const normalized = String(tag || '').toUpperCase();
  if (known[normalized] != null) return known[normalized];

  let hash = 0;
  for (const char of String(name || tag)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % 360;
}

export function gameLabel(game: string) {
  const key = String(game || '').toLowerCase();
  if (key.includes('lol') || key.includes('league')) return 'LEAGUE OF LEGENDS';
  if (key.includes('valorant')) return 'VALORANT';
  if (key.includes('cs')) return 'COUNTER-STRIKE 2';
  return String(game || 'ESPORT').toUpperCase();
}

function normalizeFaction(value: CommunityFaction): CommunityFaction {
  return {
    ...value,
    membres: Number(value.membres ?? 0),
    niveau_atteint: Number(value.niveau_atteint ?? 1),
    croissance_24h: Number(value.croissance_24h ?? 0),
    croissance_7j: Number(value.croissance_7j ?? 0),
    dernier_evenement_recompense_volts: Number(value.dernier_evenement_recompense_volts ?? 0),
    moi: Boolean(value.moi),
  };
}

function normalizeMe(value: CommunityMe): CommunityMe {
  return {
    ...value,
    pronos_depuis: Number(value.pronos_depuis ?? 0),
    mutations_vecues: Number(value.mutations_vecues ?? 0),
    pronos_7j: Number(value.pronos_7j ?? 0),
    gagnes_7j: Number(value.gagnes_7j ?? 0),
    delta_frags_7j: Number(value.delta_frags_7j ?? 0),
    rang_activite: value.rang_activite == null ? null : Number(value.rang_activite),
    total_activite: value.total_activite == null ? null : Number(value.total_activite),
    top_activite: Array.isArray(value.top_activite)
      ? value.top_activite.map((item) => ({
          ...item,
          pronos_7j: Number(item.pronos_7j ?? 0),
          gagnes_7j: Number(item.gagnes_7j ?? 0),
          rang: Number(item.rang ?? 0),
        }))
      : [],
    archives: Array.isArray(value.archives)
      ? value.archives.map((item) => ({
          ...item,
          niveau: Number(item.niveau ?? 1),
          seuil: Number(item.seuil ?? 0),
          recompense_volts: Number(item.recompense_volts ?? 0),
          membres: Number(item.membres ?? 0),
        }))
      : [],
  };
}
