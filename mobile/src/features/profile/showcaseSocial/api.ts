import { normalizeEquipped } from '@/src/features/shop/api';
import { parsePublicVisualEffects } from '@/src/features/consumables/model';
import { GrowthError } from '@/src/lib/growthErrors';
import { publicPseudo } from '@/src/lib/publicLinks';
import { supabase } from '@/src/lib/supabase';

import { parseMilestone, parseShowcase } from './model';
import type { ShowcasePreferences } from './types';

async function request(name: string, args: Record<string, unknown>, viewerId?: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const query = supabase.rpc(name, args).abortSignal(controller.signal);
    if (viewerId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id !== viewerId) throw new GrowthError('authentication_required');
      query.setHeader('Authorization', `Bearer ${session.access_token}`);
    }
    const { data, error } = await query;
    if (error) throw new GrowthError(error.message === 'authentication_required' ? error.message : error.code ?? 'network');
    return data;
  } catch (error) { throw error instanceof GrowthError ? error : new GrowthError('network'); }
  finally { clearTimeout(timeout); }
}

function showcase(value: unknown) {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : null;
  return parseShowcase(value, normalizeEquipped(raw?.cosmetiques));
}

async function showcaseWithEffects(value: unknown, pseudo: string, viewerId?: string) {
  const result = showcase(value);
  if (!result) return result;
  try {
    const effects = parsePublicVisualEffects(await request('clutch_effets_vitrine_p3', { p_pseudo: pseudo || result.pseudo }, viewerId));
    return { ...result, effects };
  } catch (error) {
    if (error instanceof GrowthError && ['PGRST202', '42883'].includes(error.reason)) return result;
    throw error;
  }
}

export async function loadPublicShowcase(pseudo: string, viewerId?: string, countVisit = true) {
  if (!publicPseudo(pseudo)) return null;
  return showcaseWithEffects(await request(viewerId && countVisit ? 'clutch_visiter_vitrine_v1' : 'clutch_vitrine_v1', { p_pseudo: pseudo }, viewerId), pseudo, viewerId);
}

export async function setShowcaseLike(pseudo: string, liked: boolean, viewerId: string) {
  return showcaseWithEffects(await request('clutch_aimer_vitrine_v1', { p_pseudo: pseudo, p_aime: liked }, viewerId), pseudo, viewerId);
}

export async function saveShowcasePreferences(preferences: ShowcasePreferences, ownerId: string) {
  return showcaseWithEffects(await request('clutch_preferences_vitrine_v1', { p_visibilite: preferences.visibility,
    p_rang: preferences.showRank, p_serie: preferences.showStreak, p_jalons: preferences.showMilestones,
    p_notifications: preferences.likeNotifications }, ownerId), '', ownerId);
}

export async function prepareMilestoneShare(milestone: number, ownerId: string) {
  const result = parseMilestone(await request('clutch_partage_jalon_v1', { p_palier: milestone }, ownerId));
  if (!result) throw new GrowthError('milestone_not_public');
  return result;
}

export async function loadPublicMilestone(pseudo: string, milestone: number) {
  if (!publicPseudo(pseudo)) return null;
  return parseMilestone(await request('clutch_jalon_public_v1', { p_pseudo: pseudo, p_palier: milestone }));
}
