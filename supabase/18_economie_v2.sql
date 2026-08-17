-- =====================================================================
--  Clutch — 18_economie_v2.sql
--  Frags V2 : rating compétitif non dépensable + pronostics classés.
--
--  Migration ADDITIVE : l'ancien moteur de mise (`paris`, `participations.solde`)
--  reste en place pour compatibilité pendant la transition UI.
--
--  Nouvelle doctrine :
--    · Frags = score compétitif saisonnier, jamais une monnaie.
--    · Volts = seule monnaie dépensable dans la Boutique.
--    · Un pronostic classé n'engage aucun solde.
--    · Seul un pronostic classé réglé peut modifier les Frags.
--    · Correct   : +K × (1 - p)
--    · Incorrect : -K × p
--    · p est bornée à 15–85 % pour le scoring.
--    · K = 60 sur les 5 premiers pronostics classés, puis K = 40.
--    · Tous les joueurs utilisent la même probabilité figée pour un match.
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public;

create or replace function public.clutch_frags_initial()
returns integer language sql immutable as $$ select 1000 $$;
create or replace function public.clutch_frags_k()
returns integer language sql immutable as $$ select 40 $$;
create or replace function public.clutch_frags_k_placement()
returns integer language sql immutable as $$ select 60 $$;
create or replace function public.clutch_frags_nb_placements()
returns integer language sql immutable as $$ select 5 $$;
create or replace function public.clutch_frags_proba_min()
returns numeric language sql immutable as $$ select 0.15::numeric $$;
create or replace function public.clutch_frags_proba_max()
returns numeric language sql immutable as $$ select 0.85::numeric $$;

create or replace function public.clutch_borner_proba_frags(p_proba numeric)
returns numeric language plpgsql immutable as $$
begin
  if p_proba is null or p_proba <= 0 or p_proba >= 1 then
    raise exception 'probabilite invalide : %', p_proba using errcode = '22023';
  end if;
  return least(clutch_frags_proba_max(), greatest(clutch_frags_proba_min(), p_proba));
end;
$$;

create or replace function public.clutch_delta_frags(p_proba numeric,p_gagnant boolean,p_k integer default 40)
returns integer language plpgsql immutable as $$
declare v_p numeric := clutch_borner_proba_frags(p_proba);
begin
  if p_k <= 0 then raise exception 'coefficient K invalide : %', p_k using errcode = '22023'; end if;
  if p_gagnant then return round(p_k * (1 - v_p))::integer; end if;
  return -round(p_k * v_p)::integer;
end;
$$;

create or replace function public.clutch_soft_reset_frags(p_frags integer)
returns integer language sql immutable as $$ select round(1000 + 0.4 * (p_frags - 1000))::integer $$;

create table if not exists public.matchs_scoring_frags (
  match_id text primary key references public.matchs(id) on delete cascade,
  proba_a numeric(8,7) not null check (proba_a > 0 and proba_a < 1),
  proba_b numeric(8,7) not null check (proba_b > 0 and proba_b < 1),
  source text not null default 'elo_v1',
  figee_le timestamptz not null default now(),
  check (abs((proba_a + proba_b) - 1) < 0.000001)
);
alter table public.matchs_scoring_frags enable row level security;

create or replace function private.clutch_creer_snapshot_frags()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare v_elo_a integer; v_elo_b integer; v_p_map numeric; v_p_a numeric;
begin
  select elo into v_elo_a from equipes where id = new.equipe_a_id;
  select elo into v_elo_b from equipes where id = new.equipe_b_id;
  if v_elo_a is null or v_elo_b is null then raise exception 'Elo introuvable pour le match %', new.id; end if;
  v_p_map := clutch_proba_map(v_elo_a,v_elo_b);
  select coalesce(sum(proba),0) into v_p_a from clutch_distribution(v_p_map,new.format) where score_a > score_b;
  insert into matchs_scoring_frags(match_id,proba_a,proba_b,source)
  values(new.id,v_p_a,1-v_p_a,'elo_v1') on conflict(match_id) do nothing;
  return new;
end;
$$;
revoke all on function private.clutch_creer_snapshot_frags() from public;
drop trigger if exists frags_snapshot_nouveau_match on public.matchs;
create trigger frags_snapshot_nouveau_match after insert on public.matchs for each row execute function private.clutch_creer_snapshot_frags();

insert into public.matchs_scoring_frags(match_id,proba_a,proba_b,source)
select m.id,x.p_a,1-x.p_a,'elo_v1'
from public.matchs m
join public.equipes ea on ea.id=m.equipe_a_id
join public.equipes eb on eb.id=m.equipe_b_id
cross join lateral (
  select coalesce(sum(d.proba),0)::numeric as p_a
  from clutch_distribution(clutch_proba_map(ea.elo,eb.elo),m.format) d
  where d.score_a>d.score_b
) x
where not exists(select 1 from public.matchs_scoring_frags ms where ms.match_id=m.id)
on conflict(match_id) do nothing;

create table if not exists public.classements_frags (
  saison_id text not null references public.saisons(id) on delete cascade,
  user_id uuid not null references public.profils(id) on delete cascade,
  frags integer not null default 1000,
  pic_frags integer not null default 1000,
  pronostics_regles integer not null default 0 check(pronostics_regles>=0),
  pronostics_gagnes integer not null default 0 check(pronostics_gagnes>=0),
  rejoint_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  primary key(saison_id,user_id),
  check(pronostics_gagnes<=pronostics_regles)
);
create index if not exists classements_frags_saison_idx on public.classements_frags(saison_id,frags desc,pronostics_gagnes desc);
alter table public.classements_frags enable row level security;
drop policy if exists classements_frags_mon_score on public.classements_frags;
create policy classements_frags_mon_score on public.classements_frags for select to authenticated using((select auth.uid())=user_id);

create table if not exists public.pronostics_classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profils(id) on delete cascade,
  match_id text not null references public.matchs(id) on delete cascade,
  saison_id text not null references public.saisons(id) on delete cascade,
  choix text not null check(choix in('a','b')),
  proba_figee numeric(8,7) not null check(proba_figee>0 and proba_figee<1),
  proba_scoring numeric(8,7) not null check(proba_scoring between 0.15 and 0.85),
  k_frags integer not null check(k_frags in(40,60)),
  statut text not null default 'en_cours' check(statut in('en_cours','gagne','perdu','annule')),
  delta_frags integer,
  cree_le timestamptz not null default now(),
  regle_le timestamptz,
  unique(user_id,match_id)
);
create index if not exists pronostics_classes_user_saison_idx on public.pronostics_classes(user_id,saison_id,cree_le desc);
create index if not exists pronostics_classes_match_idx on public.pronostics_classes(match_id) where statut='en_cours';
alter table public.pronostics_classes enable row level security;
drop policy if exists pronostics_classes_mes_pronos on public.pronostics_classes;
create policy pronostics_classes_mes_pronos on public.pronostics_classes for select to authenticated using((select auth.uid())=user_id);

create or replace function public.clutch_projection_match_frags(p_match_id text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_match record; v_snap record; v_nb integer:=0; v_k integer; v_pa numeric; v_pb numeric;
begin
  select id,saison_id,statut,debut into v_match from matchs where id=p_match_id;
  if not found then raise exception 'Match introuvable.' using errcode='P0002'; end if;
  select * into v_snap from matchs_scoring_frags where match_id=p_match_id;
  if not found then raise exception 'Probabilite de classement absente pour ce match.'; end if;
  if v_user is not null then select count(*)::integer into v_nb from pronostics_classes where user_id=v_user and saison_id=v_match.saison_id and statut<>'annule'; end if;
  v_k:=case when v_nb<clutch_frags_nb_placements() then clutch_frags_k_placement() else clutch_frags_k() end;
  v_pa:=clutch_borner_proba_frags(v_snap.proba_a); v_pb:=clutch_borner_proba_frags(v_snap.proba_b);
  return jsonb_build_object('match_id',p_match_id,'figee_le',v_snap.figee_le,'source',v_snap.source,'k',v_k,'placements_restants',greatest(0,clutch_frags_nb_placements()-v_nb),'choix',jsonb_build_array(
    jsonb_build_object('cle','a','proba',v_snap.proba_a,'proba_scoring',v_pa,'gain',clutch_delta_frags(v_pa,true,v_k),'perte',clutch_delta_frags(v_pa,false,v_k)),
    jsonb_build_object('cle','b','proba',v_snap.proba_b,'proba_scoring',v_pb,'gain',clutch_delta_frags(v_pb,true,v_k),'perte',clutch_delta_frags(v_pb,false,v_k))));
end;
$$;

create or replace function public.placer_pronostic_classe(p_match_id text,p_choix text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_match record; v_snap record; v_nb integer; v_k integer; v_proba numeric; v_scoring numeric; v_prono pronostics_classes%rowtype;
begin
  if v_user is null then raise exception 'Connecte-toi pour pronostiquer.' using errcode='28000'; end if;
  if p_choix not in('a','b') then raise exception 'Choix classe invalide.' using errcode='22023'; end if;
  select id,saison_id,statut,debut into v_match from matchs where id=p_match_id for update;
  if not found then raise exception 'Match introuvable.' using errcode='P0002'; end if;
  if v_match.statut<>'a_venir' or v_match.debut<=now() then raise exception 'Les pronostics sont fermes sur ce match.'; end if;
  if(select statut from v_saisons where id=v_match.saison_id)<>'en_cours' then raise exception 'Cette saison n''est pas ouverte aux pronostics.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text||'|'||v_match.saison_id,0));
  if exists(select 1 from pronostics_classes where user_id=v_user and match_id=p_match_id) then raise exception 'Tu as deja un pronostic classe sur ce match.' using errcode='23505'; end if;
  select * into v_snap from matchs_scoring_frags where match_id=p_match_id;
  if not found then raise exception 'Probabilite de classement absente pour ce match.'; end if;
  select count(*)::integer into v_nb from pronostics_classes where user_id=v_user and saison_id=v_match.saison_id and statut<>'annule';
  v_k:=case when v_nb<clutch_frags_nb_placements() then clutch_frags_k_placement() else clutch_frags_k() end;
  v_proba:=case when p_choix='a' then v_snap.proba_a else v_snap.proba_b end;
  v_scoring:=clutch_borner_proba_frags(v_proba);
  insert into classements_frags(saison_id,user_id,frags,pic_frags) values(v_match.saison_id,v_user,clutch_frags_initial(),clutch_frags_initial()) on conflict(saison_id,user_id) do nothing;
  insert into pronostics_classes(user_id,match_id,saison_id,choix,proba_figee,proba_scoring,k_frags)
  values(v_user,p_match_id,v_match.saison_id,p_choix,v_proba,v_scoring,v_k) returning * into v_prono;
  return to_jsonb(v_prono)||jsonb_build_object('gain_si_correct',clutch_delta_frags(v_scoring,true,v_k),'perte_si_faux',clutch_delta_frags(v_scoring,false,v_k),'placement',v_k=clutch_frags_k_placement());
end;
$$;

create or replace function private.clutch_resoudre_pronostics_classes()
returns trigger language plpgsql security definer set search_path=public,private as $$
declare r pronostics_classes%rowtype; v_gagnant boolean; v_delta integer; v_frags_avant integer; v_frags_apres integer;
begin
  if new.statut='annule' and old.statut is distinct from 'annule' then update pronostics_classes set statut='annule',delta_frags=0,regle_le=now() where match_id=new.id and statut='en_cours'; return new; end if;
  if new.statut<>'termine' or old.statut='termine' then return new; end if;
  if new.score_a is null or new.score_b is null or new.score_a=new.score_b then raise exception 'Impossible de regler les Frags : score final invalide pour %',new.id; end if;
  for r in select * from pronostics_classes where match_id=new.id and statut='en_cours' order by cree_le,id for update loop
    v_gagnant:=case when r.choix='a' then new.score_a>new.score_b else new.score_b>new.score_a end;
    v_delta:=clutch_delta_frags(r.proba_scoring,v_gagnant,r.k_frags);
    insert into classements_frags(saison_id,user_id,frags,pic_frags) values(r.saison_id,r.user_id,clutch_frags_initial(),clutch_frags_initial()) on conflict(saison_id,user_id) do nothing;
    select frags into v_frags_avant from classements_frags where saison_id=r.saison_id and user_id=r.user_id for update;
    v_frags_apres:=v_frags_avant+v_delta;
    update classements_frags set frags=v_frags_apres,pic_frags=greatest(pic_frags,v_frags_apres),pronostics_regles=pronostics_regles+1,pronostics_gagnes=pronostics_gagnes+case when v_gagnant then 1 else 0 end,maj_le=now() where saison_id=r.saison_id and user_id=r.user_id;
    update pronostics_classes set statut=case when v_gagnant then 'gagne' else 'perdu' end,delta_frags=v_delta,regle_le=now() where id=r.id;
  end loop;
  return new;
end;
$$;
revoke all on function private.clutch_resoudre_pronostics_classes() from public;
drop trigger if exists frags_regler_pronostics on public.matchs;
create trigger frags_regler_pronostics after update of statut,score_a,score_b on public.matchs for each row execute function private.clutch_resoudre_pronostics_classes();

create or replace function public.clutch_etat_frags(p_saison_id text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_c record; v_places integer;
begin
  if v_user is null then raise exception 'Authentification requise.' using errcode='28000'; end if;
  select * into v_c from classements_frags where saison_id=p_saison_id and user_id=v_user;
  select count(*)::integer into v_places from pronostics_classes where saison_id=p_saison_id and user_id=v_user and statut<>'annule';
  return jsonb_build_object('saison_id',p_saison_id,'frags',coalesce(v_c.frags,clutch_frags_initial()),'pic_frags',coalesce(v_c.pic_frags,clutch_frags_initial()),'pronostics_regles',coalesce(v_c.pronostics_regles,0),'pronostics_gagnes',coalesce(v_c.pronostics_gagnes,0),'placements_restants',greatest(0,clutch_frags_nb_placements()-v_places),'provisoire',v_places<clutch_frags_nb_placements());
end;
$$;

create or replace function public.clutch_mes_pronostics_classes(p_saison_id text)
returns table(id uuid,match_id text,saison_id text,choix text,proba_figee numeric,proba_scoring numeric,k_frags integer,statut text,delta_frags integer,cree_le timestamptz,regle_le timestamptz,equipe_a text,equipe_b text,score_a integer,score_b integer,debut timestamptz)
language sql stable security definer set search_path=public as $$
select p.id,p.match_id,p.saison_id,p.choix,p.proba_figee,p.proba_scoring,p.k_frags,p.statut,p.delta_frags,p.cree_le,p.regle_le,m.equipe_a,m.equipe_b,m.score_a,m.score_b,m.debut
from pronostics_classes p join v_matchs m on m.id=p.match_id where p.user_id=auth.uid() and p.saison_id=p_saison_id order by p.cree_le desc;
$$;

create or replace function public.clutch_classement_frags(p_saison_id text)
returns table(rang bigint,id uuid,pseudo text,frags integer,pic_frags integer,pronostics_regles integer,pronostics_gagnes integer,taux_reussite numeric,provisoire boolean,moi boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Authentification requise.' using errcode='28000'; end if;
  return query select row_number() over(order by c.frags desc,c.pronostics_gagnes desc,c.maj_le asc),pr.id,pr.pseudo,c.frags,c.pic_frags,c.pronostics_regles,c.pronostics_gagnes,case when c.pronostics_regles=0 then 0::numeric else round(c.pronostics_gagnes::numeric/c.pronostics_regles*100,1) end,c.pronostics_regles<clutch_frags_nb_placements(),pr.id=auth.uid()
  from classements_frags c join profils pr on pr.id=c.user_id where c.saison_id=p_saison_id order by c.frags desc,c.pronostics_gagnes desc,c.maj_le asc;
end;
$$;

do $$ declare r text; begin
  foreach r in array array['public','anon'] loop
    if r='public' then
      revoke execute on function public.placer_pronostic_classe(text,text) from public;
      revoke execute on function public.clutch_etat_frags(text) from public;
      revoke execute on function public.clutch_mes_pronostics_classes(text) from public;
      revoke execute on function public.clutch_classement_frags(text) from public;
    elsif exists(select 1 from pg_roles where rolname=r) then
      execute format('revoke execute on function public.placer_pronostic_classe(text,text) from %I',r);
      execute format('revoke execute on function public.clutch_etat_frags(text) from %I',r);
      execute format('revoke execute on function public.clutch_mes_pronostics_classes(text) from %I',r);
      execute format('revoke execute on function public.clutch_classement_frags(text) from %I',r);
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname='authenticated') then
    grant execute on function public.placer_pronostic_classe(text,text) to authenticated;
    grant execute on function public.clutch_etat_frags(text) to authenticated;
    grant execute on function public.clutch_mes_pronostics_classes(text) to authenticated;
    grant execute on function public.clutch_classement_frags(text) to authenticated;
    grant execute on function public.clutch_projection_match_frags(text) to authenticated;
  end if;
end $$;
