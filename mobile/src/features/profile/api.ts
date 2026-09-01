import { supabase } from '@/src/lib/supabase';
import type { GameId } from '@/src/features/onboarding/types';
import { normalizeGradeState, normalizeGradeSummary } from '@/src/features/ranking/grades';
import { loadProfileCosmetics } from '@/src/features/shop/api';

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
  const [profileResult, progressionResult, cosmetics] = await Promise.all([
    supabase.rpc('clutch_profil_public_v1', { p_pseudo: pseudo }),
    supabase.rpc('clutch_progression_profil_v1', { p_pseudo: pseudo }),
    loadProfileCosmetics(pseudo),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (progressionResult.error) throw progressionResult.error;
  if (!profileResult.data || !progressionResult.data) throw new Error('Profil GRIFF introuvable.');

  const raw = profileResult.data as RawProfile;
  const progression = progressionResult.data as Partial<ProfileRanking>;
  const recap = raw.recap ?? {};
  const founder = Boolean(raw.est_fondateur);
  const ranking = normalizeRanking({ ...raw.classement, ...progression });
  const badges = evaluateBadges({
    now: new Date().toISOString(),
    ranking,
    recap,
  });
  const pinnedBadges = resolveBadgeSelection(
    [raw.badge_vedette ?? '', ...(raw.badges_exposes ?? [])],
    badges,
    4,
  );
  const arsenalBadges = resolveBadgeSelection(raw.arsenal_exposes ?? [], badges, 5, true);
  const xp = calculateProfileXp(recap, badges);

  return {
    avatarId: raw.avatar_id ?? null,
    pseudo: raw.pseudo || pseudo,
    createdAt: raw.cree_le || new Date().toISOString(),
    profileTitle: raw.titre_profil ?? null,
    founder,
    publicProfile: raw.profil_public !== false,
    ranking,
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
    cosmetics,
  };
}

export async function saveProfilePreferences(
  userId: string,
  games: GameId[],
  publicProfile: boolean,
) {
  const { data, error } = await supabase
    .from('profils')
    .update({
      jeux_suivis: games,
      profil_public: publicProfile,
    })
    .eq('id', userId)
    .select('jeux_suivis,profil_public')
    .single();

  if (error) throw error;
  return data;
}

export async function saveFavoriteTeam(userId: string, teamId: string) {
  const { data, error } = await supabase
    .from('profils')
    .update({ equipe_favorite_id: teamId })
    .eq('id', userId)
    .select('equipe_favorite_id')
    .single();

  if (error) throw error;
  return data;
}

export async function saveProfileAvatar(userId: string, avatarId: string) {
  const { data, error } = await supabase
    .from('profils')
    .update({ avatar_id: avatarId })
    .eq('id', userId)
    .select('avatar_id')
    .single();

  if (error) throw error;
  return data;
}

function normalizeRanking(value?: Partial<ProfileRanking> | null): ProfileRanking {
  const settled = toNumber(value?.pronostics_regles);
  const rawFrags = toNumber(value?.frags);
  const frags = settled === 0 && value?.provisoire === true && rawFrags === 1000 ? 0 : rawFrags;
  return {
    saison_id: value?.saison_id ?? null,
    saison_nom: value?.saison_nom ?? null,
    frags,
    rang: value?.rang == null ? null : toNumber(value.rang),
    pronostics_regles: settled,
    pronostics_gagnes: toNumber(value?.pronostics_gagnes),
    pic_frags: toNumber(value?.pic_frags ?? frags),
    placements_restants: 0,
    provisoire: false,
    grade: normalizeGradeState(value?.grade, { frags, settledCalls: settled }),
    percentile: value?.percentile == null ? null : toNumber(value.percentile),
    joueurs_classes: toNumber(value?.joueurs_classes),
    meilleur_grade: normalizeGradeSummary(value?.meilleur_grade),
    meilleur_rang: value?.meilleur_rang == null ? null : toNumber(value.meilleur_rang),
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
