import { cosmeticPackItemById } from '@/src/features/shop/teamPackCatalog';
import { EMPTY_EQUIPPED_COSMETICS, type EquippedCosmetic } from '@/src/features/shop/types';
import type { ReferralDashboard } from '@/src/features/social/friends/referrals/types';

import type { PublicShowcase } from './types';

function item(id: string): EquippedCosmetic | null {
  const value = cosmeticPackItemById(id);
  return value ? { ...value, level: 1, styleKey: id } : null;
}

// Explicit preview-only fixtures. Never substituted for a failed server read.
export const PREVIEW_SHOWCASE: PublicShowcase = {
  pseudo: 'Nova', avatarId: 'chaos-smile', title: 'Architecte', team: 'Karmine Corp',
  ranking: { frags: 248, rank: 86, label: 'Bronze' }, streak: { current: 7, best: 14, milestone: 7 },
  cosmetics: { ...EMPTY_EQUIPPED_COSMETICS, frame: item('neon-protocol-phase-frame'),
    title: item('neon-protocol-architect-title'), core: item('neon-protocol-glyph-node'),
    profileCard: item('neon-protocol-share-card'), showcase: { ...EMPTY_EQUIPPED_COSMETICS.showcase,
      jersey: item('neon-protocol-armor-vega'), material: item('neon-protocol-room') } },
  owner: false, publicProfile: true, preferences: { visibility: 'publique', showRank: true, showStreak: true, showMilestones: true, likeNotifications: true },
  effects: [{ type: 'showcase_spotlight', activeUntil: '2099-09-04T18:00:00.000Z' }],
  likes: 12, liked: false, canLike: true, views: null, weeklyViews: null, previousWeeklyViews: null,
};
export const PREVIEW_SHOWCASE_OWNER: PublicShowcase = { ...PREVIEW_SHOWCASE, owner: true, canLike: false, views: 86, weeklyViews: 24, previousWeeklyViews: 16 };
export const PREVIEW_INVITATIONS: ReferralDashboard = {
  code: '0123456789abcdef0123456789abcdef', shares: 4, registered: 3, active: 2, volts: 60,
  rewardedToday: 1, rewardedThisMonth: 2, reward: 30, dailyCap: 5, monthlyCap: 20, alreadyReferred: false,
  history: [
    { id: 'preview-1', registeredAt: '2026-09-03T08:00:00Z', activatedAt: '2026-09-03T09:00:00Z', reward: 'attribuee' },
    { id: 'preview-2', registeredAt: '2026-09-02T14:00:00Z', activatedAt: '2026-09-02T15:00:00Z', reward: 'attribuee' },
    { id: 'preview-3', registeredAt: '2026-09-02T12:00:00Z', activatedAt: null, reward: 'en_attente' },
  ],
};
