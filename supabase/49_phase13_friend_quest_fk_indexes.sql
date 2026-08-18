-- Cover the remaining Phase 13 foreign keys reported by the Supabase advisor.

create index if not exists friend_quests_owner_idx on public.friend_quests(owner_id);
create index if not exists friend_duo_stats_user_b_idx on public.friend_duo_stats(user_b);
