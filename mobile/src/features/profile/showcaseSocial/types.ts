import type { EquippedCosmetics } from '@/src/features/shop/types';
import type { PublicVisualEffect } from '@/src/features/consumables/types';

export type ShowcaseVisibility = 'publique' | 'cercle' | 'privee';
export type ShowcasePreferences = {
  visibility: ShowcaseVisibility; showRank: boolean; showStreak: boolean; showMilestones: boolean; likeNotifications: boolean;
};
export type PublicShowcase = {
  pseudo: string; avatarId: string | null; title: string | null; team: string | null;
  ranking: { frags: number; rank: number | null; label: string | null } | null;
  streak: { current: number | null; best: number | null; milestone: number | null } | null;
  cosmetics: EquippedCosmetics; owner: boolean; publicProfile: boolean; preferences: ShowcasePreferences;
  effects: PublicVisualEffect[];
  likes: number; liked: boolean; canLike: boolean; views: number | null; weeklyViews: number | null; previousWeeklyViews: number | null;
};
export type PublicMilestone = { pseudo: string; milestone: number; earnedAt: string };
