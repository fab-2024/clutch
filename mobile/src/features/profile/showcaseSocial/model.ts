import type { EquippedCosmetics } from '@/src/features/shop/types';
import { GrowthError, growthCount, growthPayload } from '@/src/lib/growthErrors';
import { publicPseudo, SHARED_MILESTONES } from '@/src/lib/publicLinks';

import type { PublicMilestone, PublicShowcase, ShowcaseVisibility } from './types';

const nullableCount = (value: unknown) => value == null ? null : growthCount(value);
const textOrNull = (value: unknown) => typeof value === 'string' ? value : null;
export function parseShowcase(value: unknown, cosmetics: EquippedCosmetics): PublicShowcase | null {
  if (value === null) return null;
  const raw = growthPayload(value);
  const pseudo = publicPseudo(raw.pseudo);
  if (!pseudo || !['publique', 'cercle', 'privee'].includes(String(raw.visibilite))
    || typeof raw.proprietaire !== 'boolean' || typeof raw.peut_aimer !== 'boolean' || typeof raw.aime !== 'boolean'
    || typeof raw.montrer_rang !== 'boolean' || typeof raw.montrer_serie !== 'boolean' || typeof raw.montrer_jalons !== 'boolean') {
    throw new GrowthError('invalid_response');
  }
  const ranking = raw.classement ? growthPayload(raw.classement) : null;
  const streak = raw.serie ? growthPayload(raw.serie) : null;
  const team = raw.equipe ? growthPayload(raw.equipe) : null;
  const grade = ranking?.grade && typeof ranking.grade === 'object' ? ranking.grade as Record<string, unknown> : null;
  // Same legacy-placement compatibility rule as the existing profile screen.
  const frags = ranking?.provisoire === true && ranking.pronostics_regles === 0 && ranking.frags === 1000
    ? 0 : ranking ? growthCount(ranking.frags) : 0;
  return {
    pseudo, avatarId: textOrNull(raw.avatar_id), title: textOrNull(raw.titre), team: textOrNull(team?.nom),
    ranking: raw.montrer_rang && ranking ? { frags, rank: nullableCount(ranking.rang), label: textOrNull(grade?.libelle) } : null,
    streak: streak ? { current: raw.montrer_serie ? nullableCount(streak.actuelle) : null,
      best: raw.montrer_serie ? nullableCount(streak.meilleure) : null, milestone: raw.montrer_jalons ? nullableCount(streak.jalon) : null } : null,
    cosmetics, owner: raw.proprietaire, publicProfile: raw.profil_public === true,
    preferences: { visibility: raw.visibilite as ShowcaseVisibility, showRank: raw.montrer_rang, showStreak: raw.montrer_serie,
      showMilestones: raw.montrer_jalons, likeNotifications: raw.notifications_likes === true },
    likes: growthCount(raw.likes), liked: raw.aime, canLike: raw.peut_aimer,
    // Defense in depth: visitor responses can never become owner analytics.
    views: raw.proprietaire ? nullableCount(raw.vues) : null,
    weeklyViews: raw.proprietaire ? nullableCount(raw.vues_semaine) : null,
    previousWeeklyViews: raw.proprietaire ? nullableCount(raw.vues_semaine_precedente) : null,
  };
}

export function parseMilestone(value: unknown): PublicMilestone | null {
  if (value === null) return null;
  const raw = growthPayload(value);
  const pseudo = publicPseudo(raw.pseudo);
  if (!pseudo || !SHARED_MILESTONES.some((days) => days === raw.palier)
    || typeof raw.obtenu_le !== 'string' || !Number.isFinite(Date.parse(raw.obtenu_le))) throw new GrowthError('invalid_response');
  return { pseudo, milestone: raw.palier as number, earnedAt: raw.obtenu_le };
}

export function optimisticLike(value: PublicShowcase, liked: boolean): PublicShowcase {
  if (!value.canLike || value.liked === liked) return value;
  return { ...value, liked, likes: Math.max(0, value.likes + (liked ? 1 : -1)) };
}
