-- Phase 13 — Friend Quests
-- Social retention built from real friends, predictions, duels and leagues.
-- Rewards: XP + Volts only. This migration never credits or debits Frags.

alter table public.volts_mouvements drop constraint if exists volts_mouvements_origine_check;
alter table public.volts_mouvements
  add constraint volts_mouvements_origine_check
  check (origine = any (array['badge','saison','call','achat','ajustement','pari','faction','friend_quest']::text[]));

create table if not exists public.friend_quests (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profils(id) on delete cascade,
  user_b uuid not null references public.profils(id) on delete cascade,
  owner_id uuid not null references public.profils(id) on delete cascade,
  type text not null check (type in ('duo_calls','same_side','opposition','duel','revenge','league_push')),
  match_id text references public.matchs(id) on delete set null,
  league_id uuid references public.ligues(id) on delete set null,
  objectif integer not null check (objectif > 0),
  progression integer not null default 0 check (progression >= 0),
  recompense_xp integer not null default 0 check (recompense_xp >= 0),
  recompense_volts integer not null default 0 check (recompense_volts >= 0),
  statut text not null default 'active' check (statut in ('active','terminee','ratee','expiree')),
  cle text not null unique,
  cree_le timestamptz not null default now(),
  expire_le timestamptz not null,
  terminee_le timestamptz,
  revele_a_le timestamptz,
  revele_b_le timestamptz,
  check (user_a < user_b),
  check (owner_id = user_a or owner_id = user_b),
  check (expire_le > cree_le)
);

create index if not exists friend_quests_user_a_active_idx on public.friend_quests(user_a, statut, expire_le desc);
create index if not exists friend_quests_user_b_active_idx on public.friend_quests(user_b, statut, expire_le desc);
create index if not exists friend_quests_pair_history_idx on public.friend_quests(user_a, user_b, terminee_le desc);
create index if not exists friend_quests_match_idx on public.friend_quests(match_id) where match_id is not null;
create index if not exists friend_quests_league_idx on public.friend_quests(league_id) where league_id is not null;

alter table public.friend_quests enable row level security;
revoke all on public.friend_quests from anon, authenticated;

create table if not exists public.friend_duo_stats (
  user_a uuid not null references public.profils(id) on delete cascade,
  user_b uuid not null references public.profils(id) on delete cascade,
  missions_terminees integer not null default 0 check (missions_terminees >= 0),
  serie_semaines integer not null default 0 check (serie_semaines >= 0),
  semaine_derniere date,
  maj_le timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

alter table public.friend_duo_stats enable row level security;
revoke all on public.friend_duo_stats from anon, authenticated;

create or replace function private.clutch_friend_quest_refresh_one(p_quest uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.friend_quests%rowtype;
  v_progress integer := 0;
  v_a integer := 0;
  v_b integer := 0;
  v_choice_a text;
  v_choice_b text;
  v_complete boolean := false;
  v_fail boolean := false;
  v_week date := date_trunc('week', now() at time zone 'Europe/Paris')::date;
begin
  select * into q from public.friend_quests where id=p_quest for update;
  if not found or q.statut <> 'active' then return; end if;

  if q.expire_le <= now() then
    update public.friend_quests set statut='expiree' where id=q.id and statut='active';
    return;
  end if;

  if q.type='duo_calls' then
    select count(*)::integer into v_a from public.pronostics_classes where user_id=q.user_a and cree_le>=q.cree_le;
    select count(*)::integer into v_b from public.pronostics_classes where user_id=q.user_b and cree_le>=q.cree_le;
    v_progress := least(q.objectif, v_a+v_b);
    v_complete := v_progress>=q.objectif and v_a>0 and v_b>0;
  elsif q.type in ('same_side','opposition') then
    select choix into v_choice_a from public.pronostics_classes where user_id=q.user_a and match_id=q.match_id order by cree_le desc limit 1;
    select choix into v_choice_b from public.pronostics_classes where user_id=q.user_b and match_id=q.match_id order by cree_le desc limit 1;
    v_progress := (case when v_choice_a is null then 0 else 1 end) + (case when v_choice_b is null then 0 else 1 end);
    if v_choice_a is not null and v_choice_b is not null then
      if q.type='same_side' then v_complete := v_choice_a=v_choice_b; else v_complete := v_choice_a<>v_choice_b; end if;
      v_fail := not v_complete;
    end if;
  elsif q.type='duel' then
    select count(*)::integer into v_progress
    from public.defis_match d
    where d.statut='termine' and d.termine_le>=q.cree_le
      and ((d.createur_id=q.user_a and d.accepteur_id=q.user_b) or (d.createur_id=q.user_b and d.accepteur_id=q.user_a));
    v_progress := least(1,v_progress);
    v_complete := v_progress>=1;
  elsif q.type='revenge' then
    select count(*)::integer into v_progress
    from public.defis_match d
    join public.pronostics_classes pc on pc.id=d.createur_pronostic_id
    join public.pronostics_classes pa on pa.id=d.accepteur_pronostic_id
    where d.statut='termine' and d.termine_le>=q.cree_le
      and ((d.createur_id=q.owner_id and d.accepteur_id=case when q.owner_id=q.user_a then q.user_b else q.user_a end and pc.statut='gagne')
        or (d.accepteur_id=q.owner_id and d.createur_id=case when q.owner_id=q.user_a then q.user_b else q.user_a end and pa.statut='gagne'));
    v_progress := least(1,v_progress);
    v_complete := v_progress>=1;
  elsif q.type='league_push' then
    select coalesce(sum(greatest(coalesce(delta_frags,0),0)),0)::integer into v_progress
    from public.pronostics_classes
    where user_id in (q.user_a,q.user_b) and regle_le>=q.cree_le and statut in ('gagne','perdu');
    v_progress := least(q.objectif,v_progress);
    v_complete := v_progress>=q.objectif;
  end if;

  update public.friend_quests set progression=v_progress where id=q.id;

  if v_fail then
    update public.friend_quests set statut='ratee', progression=v_progress, terminee_le=now() where id=q.id and statut='active';
    return;
  end if;
  if not v_complete then return; end if;

  update public.friend_quests
     set statut='terminee', progression=objectif, terminee_le=now()
   where id=q.id and statut='active';
  if not found then return; end if;

  if q.recompense_volts>0 then
    perform public.clutch_crediter_volts(q.user_a,q.recompense_volts,'friend_quest',q.id::text);
    perform public.clutch_crediter_volts(q.user_b,q.recompense_volts,'friend_quest',q.id::text);
  end if;

  insert into public.friend_duo_stats(user_a,user_b,missions_terminees,serie_semaines,semaine_derniere,maj_le)
  values(q.user_a,q.user_b,1,1,v_week,now())
  on conflict(user_a,user_b) do update set
    missions_terminees=public.friend_duo_stats.missions_terminees+1,
    serie_semaines=case
      when public.friend_duo_stats.semaine_derniere=excluded.semaine_derniere then public.friend_duo_stats.serie_semaines
      when public.friend_duo_stats.semaine_derniere=excluded.semaine_derniere-7 then public.friend_duo_stats.serie_semaines+1
      else 1 end,
    semaine_derniere=excluded.semaine_derniere,
    maj_le=now();
end;
$$;
revoke execute on function private.clutch_friend_quest_refresh_one(uuid) from public, anon, authenticated;

create or replace function private.clutch_friend_quests_refresh_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare r record;
begin
  for r in select id from public.friend_quests where statut='active' and (user_a=p_user or user_b=p_user)
  loop perform private.clutch_friend_quest_refresh_one(r.id); end loop;
end;
$$;
revoke execute on function private.clutch_friend_quests_refresh_user(uuid) from public, anon, authenticated;

create or replace function private.clutch_friend_quests_ensure(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_active integer;
  v_friend1 uuid;
  v_friend2 uuid;
  v_friend3 uuid;
  v_other uuid;
  v_a uuid;
  v_b uuid;
  v_day date := (now() at time zone 'Europe/Paris')::date;
  v_day_end timestamptz := ((now() at time zone 'Europe/Paris')::date + 1)::timestamp at time zone 'Europe/Paris';
  v_match record;
  v_league uuid;
  v_last record;
  v_type text;
  v_key text;
  v_expire timestamptz;
begin
  if p_user is null then return; end if;
  perform private.clutch_friend_quests_refresh_user(p_user);
  update public.friend_quests set statut='expiree' where statut='active' and expire_le<=now() and (user_a=p_user or user_b=p_user);

  select count(*)::integer into v_active from public.friend_quests where statut='active' and expire_le>now() and (user_a=p_user or user_b=p_user);
  if v_active>=3 then return; end if;

  with friends as (
    select case when a=p_user then b else a end as friend_id,
           row_number() over(order by coalesce((select max(d.termine_le) from public.defis_match d where d.statut='termine' and ((d.createur_id=p_user and d.accepteur_id=case when am.a=p_user then am.b else am.a end) or (d.accepteur_id=p_user and d.createur_id=case when am.a=p_user then am.b else am.a end))),am.repondu_le,am.cree_le) desc, case when a=p_user then b else a end) rn
    from public.amities am where statut='acceptee' and (a=p_user or b=p_user)
  )
  select (max(friend_id::text) filter(where rn=1))::uuid,
         (max(friend_id::text) filter(where rn=2))::uuid,
         (max(friend_id::text) filter(where rn=3))::uuid
  into v_friend1,v_friend2,v_friend3 from friends;
  if v_friend1 is null then return; end if;
  v_friend2:=coalesce(v_friend2,v_friend1); v_friend3:=coalesce(v_friend3,v_friend2,v_friend1);

  if v_active<3 then
    v_other:=v_friend1; v_a:=least(p_user,v_other); v_b:=greatest(p_user,v_other);
    select d.termine_le,
           case when (d.createur_id=p_user and pc.statut='perdu') or (d.accepteur_id=p_user and pa.statut='perdu') then true else false end as lost
    into v_last
    from public.defis_match d
    join public.pronostics_classes pc on pc.id=d.createur_pronostic_id
    join public.pronostics_classes pa on pa.id=d.accepteur_pronostic_id
    where d.statut='termine' and ((d.createur_id=p_user and d.accepteur_id=v_other) or (d.accepteur_id=p_user and d.createur_id=v_other))
    order by d.termine_le desc nulls last limit 1;
    if v_last.lost is true then
      v_type:='revenge'; v_key:='revenge|'||v_day||'|'||p_user||'|'||v_other; v_expire:=now()+interval '48 hours';
      insert into public.friend_quests(user_a,user_b,owner_id,type,objectif,recompense_xp,recompense_volts,cle,expire_le)
      values(v_a,v_b,p_user,v_type,1,140,40,v_key,v_expire) on conflict(cle) do nothing;
    else
      v_type:='duo_calls'; v_key:='duo|'||v_day||'|'||v_a||'|'||v_b; v_expire:=v_day_end;
      if v_expire>now()+interval '30 minutes' then
        insert into public.friend_quests(user_a,user_b,owner_id,type,objectif,recompense_xp,recompense_volts,cle,expire_le)
        values(v_a,v_b,p_user,v_type,3,100,25,v_key,v_expire) on conflict(cle) do nothing;
      end if;
    end if;
  end if;

  select count(*)::integer into v_active from public.friend_quests where statut='active' and expire_le>now() and (user_a=p_user or user_b=p_user);

  if v_active<3 then
    v_other:=v_friend2; v_a:=least(p_user,v_other); v_b:=greatest(p_user,v_other);
    select m.id,m.debut into v_match
    from public.matchs m
    where m.statut='a_venir' and m.debut>now()+interval '15 minutes' and m.debut<now()+interval '36 hours'
      and not exists(select 1 from public.pronostics_classes p where p.user_id=p_user and p.match_id=m.id)
    order by m.debut asc,m.id limit 1;
    if v_match.id is not null then
      v_type:=case when mod(abs(hashtext(v_a::text||v_b::text||v_day::text)),2)=0 then 'same_side' else 'opposition' end;
      v_key:=v_type||'|'||v_day||'|'||v_a||'|'||v_b||'|'||v_match.id;
      v_expire:=least(v_day_end,v_match.debut-interval '5 minutes');
      if v_expire>now()+interval '10 minutes' then
        insert into public.friend_quests(user_a,user_b,owner_id,type,match_id,objectif,recompense_xp,recompense_volts,cle,expire_le)
        values(v_a,v_b,p_user,v_type,v_match.id,2,120,30,v_key,v_expire) on conflict(cle) do nothing;
      end if;
    end if;
  end if;

  select count(*)::integer into v_active from public.friend_quests where statut='active' and expire_le>now() and (user_a=p_user or user_b=p_user);

  if v_active<3 then
    v_other:=v_friend3; v_a:=least(p_user,v_other); v_b:=greatest(p_user,v_other);
    select ml1.ligue_id into v_league
    from public.membres_ligue ml1 join public.membres_ligue ml2 on ml2.ligue_id=ml1.ligue_id and ml2.user_id=v_other
    where ml1.user_id=p_user order by ml1.rejoint_le desc limit 1;
    if v_league is not null and v_day_end>now()+interval '30 minutes' then
      v_key:='league|'||v_day||'|'||v_a||'|'||v_b||'|'||v_league;
      insert into public.friend_quests(user_a,user_b,owner_id,type,league_id,objectif,recompense_xp,recompense_volts,cle,expire_le)
      values(v_a,v_b,p_user,'league_push',v_league,60,140,40,v_key,v_day_end) on conflict(cle) do nothing;
    else
      v_key:='duel|'||v_day||'|'||v_a||'|'||v_b;
      insert into public.friend_quests(user_a,user_b,owner_id,type,objectif,recompense_xp,recompense_volts,cle,expire_le)
      values(v_a,v_b,p_user,'duel',1,110,25,v_key,now()+interval '48 hours') on conflict(cle) do nothing;
    end if;
  end if;
end;
$$;
revoke execute on function private.clutch_friend_quests_ensure(uuid) from public, anon, authenticated;

create or replace function private.clutch_friend_quests_prono_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.clutch_friend_quests_refresh_user(new.user_id);
  return new;
end; $$;
revoke execute on function private.clutch_friend_quests_prono_trigger() from public, anon, authenticated;

drop trigger if exists friend_quests_prono_refresh on public.pronostics_classes;
create trigger friend_quests_prono_refresh
after insert or update of statut,delta_frags,choix on public.pronostics_classes
for each row execute function private.clutch_friend_quests_prono_trigger();

create or replace function private.clutch_friend_quests_duel_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.statut='termine' and old.statut is distinct from new.statut then
    perform private.clutch_friend_quests_refresh_user(new.createur_id);
    if new.accepteur_id is not null then perform private.clutch_friend_quests_refresh_user(new.accepteur_id); end if;
  end if;
  return new;
end; $$;
revoke execute on function private.clutch_friend_quests_duel_trigger() from public, anon, authenticated;

drop trigger if exists friend_quests_duel_refresh on public.defis_match;
create trigger friend_quests_duel_refresh
after update of statut on public.defis_match
for each row execute function private.clutch_friend_quests_duel_trigger();

create or replace function public.clutch_friend_quests_dashboard_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_active jsonb; v_history jsonb; v_reveal jsonb; v_duos jsonb;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  perform private.clutch_friend_quests_ensure(v_user);
  perform private.clutch_friend_quests_refresh_user(v_user);

  select coalesce(jsonb_agg(to_jsonb(x) order by x.expire_le,x.cree_le),'[]'::jsonb) into v_active from (
    select q.id,q.type,q.objectif,q.progression,q.recompense_xp,q.recompense_volts,q.statut,q.cree_le,q.expire_le,q.match_id,q.league_id,
      jsonb_build_object('id',p.id,'pseudo',p.pseudo,'profil_public',p.profil_public) partenaire,
      case when q.owner_id=v_user then true else false end as mission_perso,
      case when q.match_id is null then null else jsonb_build_object('id',m.id,'jeu',m.jeu,'evenement',m.evenement,'debut',m.debut,'equipe_a',m.equipe_a,'equipe_b',m.equipe_b,'tag_a',m.tag_a,'tag_b',m.tag_b) end match,
      case when q.league_id is null then null else jsonb_build_object('id',l.id,'nom',l.nom,'code',l.code) end ligue,
      case when q.type='duo_calls' then exists(select 1 from public.pronostics_classes pp where pp.user_id=v_user and pp.cree_le>=q.cree_le)
           when q.type in ('same_side','opposition') then exists(select 1 from public.pronostics_classes pp where pp.user_id=v_user and pp.match_id=q.match_id)
           when q.type='league_push' then exists(select 1 from public.pronostics_classes pp where pp.user_id=v_user and pp.regle_le>=q.cree_le and coalesce(pp.delta_frags,0)>0)
           else false end as moi_fait,
      case when q.type='duo_calls' then exists(select 1 from public.pronostics_classes pp where pp.user_id=p.id and pp.cree_le>=q.cree_le)
           when q.type in ('same_side','opposition') then exists(select 1 from public.pronostics_classes pp where pp.user_id=p.id and pp.match_id=q.match_id)
           when q.type='league_push' then exists(select 1 from public.pronostics_classes pp where pp.user_id=p.id and pp.regle_le>=q.cree_le and coalesce(pp.delta_frags,0)>0)
           else false end as partenaire_fait
    from public.friend_quests q
    join public.profils p on p.id=case when q.user_a=v_user then q.user_b else q.user_a end
    left join public.v_matchs m on m.id=q.match_id
    left join public.ligues l on l.id=q.league_id
    where q.statut='active' and q.expire_le>now() and (q.user_a=v_user or q.user_b=v_user)
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.terminee_le desc),'[]'::jsonb) into v_history from (
    select q.id,q.type,q.objectif,q.progression,q.recompense_xp,q.recompense_volts,q.statut,q.cree_le,q.expire_le,q.terminee_le,
      jsonb_build_object('id',p.id,'pseudo',p.pseudo,'profil_public',p.profil_public) partenaire
    from public.friend_quests q join public.profils p on p.id=case when q.user_a=v_user then q.user_b else q.user_a end
    where q.statut in ('terminee','ratee','expiree') and (q.user_a=v_user or q.user_b=v_user)
    order by q.terminee_le desc nulls last,q.expire_le desc limit 12
  ) x;

  select to_jsonb(x) into v_reveal from (
    select q.id,q.type,q.objectif,q.progression,q.recompense_xp,q.recompense_volts,q.terminee_le,
      jsonb_build_object('id',p.id,'pseudo',p.pseudo,'profil_public',p.profil_public) partenaire,
      ds.missions_terminees,ds.serie_semaines
    from public.friend_quests q
    join public.profils p on p.id=case when q.user_a=v_user then q.user_b else q.user_a end
    left join public.friend_duo_stats ds on ds.user_a=q.user_a and ds.user_b=q.user_b
    where q.statut='terminee' and (q.user_a=v_user or q.user_b=v_user)
      and ((q.user_a=v_user and q.revele_a_le is null) or (q.user_b=v_user and q.revele_b_le is null))
    order by q.terminee_le desc limit 1
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.missions_terminees desc,x.serie_semaines desc),'[]'::jsonb) into v_duos from (
    select case when ds.user_a=v_user then ds.user_b else ds.user_a end as user_id,p.pseudo,ds.missions_terminees,ds.serie_semaines,ds.semaine_derniere
    from public.friend_duo_stats ds join public.profils p on p.id=case when ds.user_a=v_user then ds.user_b else ds.user_a end
    where ds.user_a=v_user or ds.user_b=v_user order by ds.missions_terminees desc,ds.serie_semaines desc limit 8
  ) x;

  return jsonb_build_object('actives',v_active,'historique',v_history,'a_reveler',v_reveal,'duos',v_duos);
end;
$$;
revoke execute on function public.clutch_friend_quests_dashboard_v1() from public, anon;
grant execute on function public.clutch_friend_quests_dashboard_v1() to authenticated, service_role;

create or replace function public.clutch_friend_quest_mark_revealed_v1(p_quest uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_count integer;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  update public.friend_quests set
    revele_a_le=case when user_a=v_user then coalesce(revele_a_le,now()) else revele_a_le end,
    revele_b_le=case when user_b=v_user then coalesce(revele_b_le,now()) else revele_b_le end
  where id=p_quest and statut='terminee' and (user_a=v_user or user_b=v_user);
  get diagnostics v_count=row_count; return v_count>0;
end; $$;
revoke execute on function public.clutch_friend_quest_mark_revealed_v1(uuid) from public, anon;
grant execute on function public.clutch_friend_quest_mark_revealed_v1(uuid) to authenticated, service_role;

create or replace function public.clutch_mon_xp_quetes_v1()
returns integer language sql stable security definer set search_path='' as $$
  select case when auth.uid() is null then 0 else coalesce(sum(recompense_xp),0)::integer end
  from public.friend_quests where statut='terminee' and (user_a=auth.uid() or user_b=auth.uid());
$$;
revoke execute on function public.clutch_mon_xp_quetes_v1() from public, anon;
grant execute on function public.clutch_mon_xp_quetes_v1() to authenticated, service_role;

create or replace function public.clutch_xp_quetes_public_v1(p_pseudo text)
returns integer language plpgsql stable security definer set search_path='' as $$
declare v_id uuid; v_public boolean;
begin
  select id,profil_public into v_id,v_public from public.profils where lower(pseudo)=lower(trim(p_pseudo)) limit 1;
  if v_id is null then return 0; end if;
  if not v_public and auth.uid() is distinct from v_id then return 0; end if;
  return coalesce((select sum(recompense_xp)::integer from public.friend_quests where statut='terminee' and (user_a=v_id or user_b=v_id)),0);
end; $$;
revoke execute on function public.clutch_xp_quetes_public_v1(text) from public;
grant execute on function public.clutch_xp_quetes_public_v1(text) to anon, authenticated, service_role;
