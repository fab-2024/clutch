-- Hard cap: no player can receive a fourth active Friend Quest, even when
-- their partner opens another dashboard concurrently.

create or replace function private.clutch_friend_quest_capacity_guard()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.statut='active' then
    if (select count(*) from public.friend_quests q where q.statut='active' and q.expire_le>now() and (q.user_a=new.user_a or q.user_b=new.user_a)) >= 3
       or (select count(*) from public.friend_quests q where q.statut='active' and q.expire_le>now() and (q.user_a=new.user_b or q.user_b=new.user_b)) >= 3 then
      return null;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function private.clutch_friend_quest_capacity_guard() from public, anon, authenticated;

drop trigger if exists friend_quests_capacity_guard on public.friend_quests;
create trigger friend_quests_capacity_guard
before insert on public.friend_quests
for each row execute function private.clutch_friend_quest_capacity_guard();
