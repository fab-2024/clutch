-- Phase 13 — Friend Quest XP is part of the existing permanent XP contract.
-- The browser keeps one progression model: recap -> xpDetailleeV2 -> level.

alter function public.recap_badges() rename to recap_badges_base_v13;

create or replace function public.recap_badges()
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(public.recap_badges_base_v13(),'{}'::jsonb)
    || jsonb_build_object(
      'xp_quetes', coalesce((
        select sum(q.recompense_xp)::integer
        from public.friend_quests q
        where q.statut='terminee'
          and (q.user_a=auth.uid() or q.user_b=auth.uid())
      ),0)
    );
$$;

revoke execute on function public.recap_badges_base_v13() from public, anon, authenticated;
revoke execute on function public.recap_badges() from public, anon;
grant execute on function public.recap_badges() to authenticated, service_role;

alter function private.clutch_recap_badges_user_v1(uuid) rename to clutch_recap_badges_user_base_v13;

create or replace function private.clutch_recap_badges_user_v1(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(private.clutch_recap_badges_user_base_v13(p_user),'{}'::jsonb)
    || jsonb_build_object(
      'xp_quetes', coalesce((
        select sum(q.recompense_xp)::integer
        from public.friend_quests q
        where q.statut='terminee'
          and (q.user_a=p_user or q.user_b=p_user)
      ),0)
    );
$$;

revoke execute on function private.clutch_recap_badges_user_base_v13(uuid) from public, anon, authenticated;
revoke execute on function private.clutch_recap_badges_user_v1(uuid) from public, anon, authenticated;
