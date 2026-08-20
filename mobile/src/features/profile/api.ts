import { supabase } from '@/src/lib/supabase';
import type { GameId } from '@/src/features/onboarding/types';

import { evaluateBadges, resolveBadgeSelection } from './badges';
import { calculateProfileXp, levelFromXp } from './progression';
import type {
  ProfileData,
  ProfileRanking,
  ProfileTeam,
  RawProfile,
  RecentPrediction,
} from './types';
import { toNumber } from './utils';

export async function loadProfileData(pseudo: string): Promise<ProfileData> {
  const { data, error } = await supabase.rpc('clutch_profil_public_v1', { p_pseudo: pseudo });
  if (error) throw error;
  if (!data) throw new Error('Profil Clutch introuvable.');

  const raw = data as RawProfile;
  const recap = raw.recap ?? {};
  const founder = Boolean(raw.est_fondateur);
  const badges = evaluateBadges(recap, founder);
  const pinnedBadges = resolveBadgeSelection(
    [raw.badge_vedette ?? '', ...(raw.badges_exposes ?? [])],
    badges,
    4,
  );
  const arsenalBadges = resolveBadgeSelection(raw.arsenal_exposes ?? [], badges, 5);
  const xp = calculateProfileXp(recap, badges);

  return {
    pseudo: raw.pseudo || pseudo,
    createdAt: raw.cree_le || new Date().toISOString(),
    profileTitle: raw.titre_profil ?? null,
    founder,
    publicProfile: raw.profil_public !== false,
    ranking: normalizeRanking(raw.classement),
    recap,
    currentStreak: toNumber(raw.serie_actuelle),
    favoriteTeam: raw.equipe_favorite ? normalizeTeam(raw.equipe_favorite) : null,
    bestGame: raw.meilleur_jeu
      ? {
          jeu: String(raw.meilleur_jeu.jeu || ''),
          pronostics: toNumber(raw.meilleur_jeu.pronostics),
          gagnes: toNumber(raw.meilleur_jeu.gagnes),
          precision_pct: toNumber(raw.meilleur_jeu.precision_pct),
        }
      : null,
    recent: Array.isArray(raw.forme_recente) ? raw.forme_recente.map(normalizeRecent) : [],
    badges,
    pinnedBadges,
    arsenalBadges,
    level: levelFromXp(xp),
  };
}

export async function saveProfileSettings(
  userId: string,
  games: GameId[],
  teamId: string,
  publicProfile: boolean,
) {
  const { data, error } = await supabase
    .from('profils')
    .update({
      jeux_suivis: games,
      equipe_favorite_id: teamId,
      profil_public: publicProfile,
    })
    .eq('id', userId)
    .select('jeux_suivis,equipe_favorite_id,profil_public')
    .single();

  if (error) throw error;
  return data;
}

function normalizeRanking(value?: Partial<ProfileRanking> | null): ProfileRanking {
  return {
    saison_id: value?.saison_id ?? null,
    saison_nom: value?.saison_nom ?? null,
    frags: toNumber(value?.frags ?? 1000),
    rang: value?.rang == null ? null : toNumber(value.rang),
    pronostics_regles: toNumber(value?.pronostics_regles),
    pronostics_gagnes: toNumber(value?.pronostics_gagnes),
    pic_frags: toNumber(value?.pic_frags ?? 1000),
  };
}

function normalizeTeam(value: Partial<ProfileTeam>): ProfileTeam {
  return {
    id: String(value.id ?? ''),
    nom: String(value.nom ?? ''),
    tag: String(value.tag ?? ''),
    jeu: String(value.jeu ?? ''),
    logo: value.logo ?? null,
    supporters: toNumber(value.supporters),
    relique: String(value.relique ?? 'Fiole'),
    relique_niveau: Math.max(1, toNumber(value.relique_niveau) || 1),
  };
}

function normalizeRecent(value: RecentPrediction): RecentPrediction {
  return {
    ...value,
    delta_frags: value.delta_frags == null ? null : toNumber(value.delta_frags),
    score_a: value.score_a == null ? null : toNumber(value.score_a),
    score_b: value.score_b == null ? null : toNumber(value.score_b),
  };
}
