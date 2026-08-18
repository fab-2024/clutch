-- Phase 10 — Ligues V3 social-first

create table if not exists public.ligue_reactions (
  ligue_id uuid not null references public.ligues(id) on delete cascade,
  event_key text not null,
  user_id uuid not null references public.profils(id) on delete cascade,
  reaction text not null check (reaction in ('fire','eyes','skull','w','l')),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  primary key (ligue_id, event_key, user_id),
  check (length(event_key) between 1 and 180)
);

create index if not exists ligue_reactions_event_idx on public.ligue_reactions(ligue_id, event_key);
create index if not exists ligue_reactions_user_idx on public.ligue_reactions(user_id, maj_le desc);

alter table public.ligue_reactions enable row level security;
revoke all on table public.ligue_reactions from anon, authenticated;

create or replace function public.clutch_ligue_public(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_ligue public.ligues%rowtype;
  v_saison_id text;
  v_saison_nom text;
  v_nb integer;
  v_createur text;
  v_leader text;
  v_leader_frags integer;
begin
  if v_code = '' or length(v_code) > 12 or v_code !~ '^[A-Z0-9]+$' then return null; end if;
  select * into v_ligue from public.ligues where code = v_code limit 1;
  if not found then return null; end if;

  select s.id, s.nom into v_saison_id, v_saison_nom
  from public.saisons s
  order by case when now() >= s.debut and now() < s.fin then 0 else 1 end, s.debut desc
  limit 1;

  select count(*)::integer into v_nb from public.membres_ligue ml where ml.ligue_id = v_ligue.id;
  select p.pseudo into v_createur from public.profils p where p.id = v_ligue.createur_id;
  select p.pseudo, coalesce(c.frags, public.clutch_frags_initial())
  into v_leader, v_leader_frags
  from public.membres_ligue ml
  join public.profils p on p.id = ml.user_id
  left join public.classements_frags c on c.user_id = ml.user_id and c.saison_id = v_saison_id
  where ml.ligue_id = v_ligue.id
  order by coalesce(c.frags, public.clutch_frags_initial()) desc,
           coalesce(c.pronostics_gagnes, 0) desc,
           ml.rejoint_le asc,
           p.id asc
  limit 1;

  return jsonb_build_object(
    'id', v_ligue.id, 'code', v_ligue.code, 'nom', v_ligue.nom,
    'nb_membres', coalesce(v_nb, 0), 'createur_pseudo', v_createur,
    'leader_pseudo', v_leader, 'leader_frags', v_leader_frags,
    'saison_id', v_saison_id, 'saison_nom', v_saison_nom
  );
end;
$$;

create or replace function public.clutch_ligue_dashboard_v1(p_ligue_id uuid, p_saison_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_moi uuid := auth.uid();
  v_result jsonb;
begin
  if v_moi is null then raise exception 'authentification requise' using errcode = '28000'; end if;
  if p_ligue_id is null or p_saison_id is null then raise exception 'ligue et saison requises' using errcode = '22023'; end if;
  if not exists (select 1 from public.membres_ligue ml where ml.ligue_id = p_ligue_id and ml.user_id = v_moi) then
    raise exception 'tu ne fais pas partie de cette ligue' using errcode = '42501';
  end if;

  with weekly as (
    select p.user_id,
           coalesce(sum(p.delta_frags) filter (where p.statut in ('gagne','perdu') and p.regle_le >= now() - interval '7 days'), 0)::integer as net_7j
    from public.pronostics_classes p
    join public.membres_ligue ml on ml.user_id = p.user_id and ml.ligue_id = p_ligue_id
    where p.saison_id = p_saison_id
    group by p.user_id
  ), ranking_base as (
    select pr.id, pr.pseudo, coalesce(eq.tag, '') as tag_favori,
           coalesce(c.frags, public.clutch_frags_initial())::integer as frags,
           coalesce(c.pronostics_regles, 0)::integer as pronostics_regles,
           coalesce(c.pronostics_gagnes, 0)::integer as pronostics_gagnes,
           coalesce(w.net_7j, 0)::integer as net_7j,
           (coalesce(c.frags, public.clutch_frags_initial()) - coalesce(w.net_7j, 0))::integer as frags_7j,
           ml.rejoint_le
    from public.membres_ligue ml
    join public.profils pr on pr.id = ml.user_id
    left join public.classements_frags c on c.user_id = ml.user_id and c.saison_id = p_saison_id
    left join weekly w on w.user_id = ml.user_id
    left join public.equipes eq on eq.id = pr.equipe_favorite_id
    where ml.ligue_id = p_ligue_id
  ), ranked as (
    select rb.*,
           row_number() over (order by rb.frags desc, rb.pronostics_gagnes desc, rb.rejoint_le asc, rb.id asc)::integer as rang,
           row_number() over (order by rb.frags_7j desc, rb.pronostics_gagnes desc, rb.rejoint_le asc, rb.id asc)::integer as rang_7j
    from ranking_base rb
  ), me as (
    select * from ranked where id = v_moi
  ), target as (
    select r.* from ranked r, me where r.rang = me.rang - 1 limit 1
  ), pursuer as (
    select r.* from ranked r, me where r.rang = me.rang + 1 limit 1
  ), upcoming_base as (
    select m.id, m.jeu, m.format, m.debut, m.evenement, m.equipe_a, m.equipe_b, m.tag_a, m.tag_b,
           count(pc.id)::integer as participants,
           count(pc.id) filter (where pc.choix = 'a')::integer as choix_a_brut,
           count(pc.id) filter (where pc.choix = 'b')::integer as choix_b_brut,
           max(pc.choix) filter (where pc.user_id = v_moi) as mon_choix,
           max(pc.choix) filter (where pc.user_id = (select id from target)) as cible_choix
    from public.v_matchs m
    left join public.pronostics_classes pc
      on pc.match_id = m.id and pc.saison_id = p_saison_id
     and exists (select 1 from public.membres_ligue lm where lm.ligue_id = p_ligue_id and lm.user_id = pc.user_id)
    where m.saison_id = p_saison_id and m.statut = 'a_venir'
      and m.debut > now() and m.debut <= now() + interval '36 hours'
    group by m.id, m.jeu, m.format, m.debut, m.evenement, m.equipe_a, m.equipe_b, m.tag_a, m.tag_b
    order by m.debut asc
    limit 5
  ), duel_raw as (
    select dm.token, dm.termine_le, dm.createur_id, dm.accepteur_id,
           case when pc.statut = 'gagne' then dm.createur_id when pa.statut = 'gagne' then dm.accepteur_id else null end as gagnant_id
    from public.defis_match dm
    join public.pronostics_classes pc on pc.id = dm.createur_pronostic_id
    join public.pronostics_classes pa on pa.id = dm.accepteur_pronostic_id
    where dm.statut = 'termine'
      and exists (select 1 from public.membres_ligue x where x.ligue_id = p_ligue_id and x.user_id = dm.createur_id)
      and exists (select 1 from public.membres_ligue y where y.ligue_id = p_ligue_id and y.user_id = dm.accepteur_id)
  ), duel_norm as (
    select d.*,
           case when d.createur_id::text < d.accepteur_id::text then d.createur_id else d.accepteur_id end as p1,
           case when d.createur_id::text < d.accepteur_id::text then d.accepteur_id else d.createur_id end as p2
    from duel_raw d where d.gagnant_id is not null
  ), duel_pairs as (
    select p1, p2, count(*)::integer as duels,
           count(*) filter (where gagnant_id = p1)::integer as p1_wins,
           count(*) filter (where gagnant_id = p2)::integer as p2_wins,
           max(termine_le) as dernier_duel
    from duel_norm group by p1, p2
    order by count(*) desc, max(termine_le) desc limit 5
  ), feed_base as (
    select 'prono:' || p.id::text as event_key, 'prediction'::text as type, p.regle_le as moment,
           p.user_id as acteur_id, pr.pseudo as acteur_pseudo,
           jsonb_build_object('statut',p.statut,'delta_frags',coalesce(p.delta_frags,0),'match_id',p.match_id,'tag_a',m.tag_a,'tag_b',m.tag_b,'evenement',m.evenement) as payload
    from public.pronostics_classes p
    join public.membres_ligue ml on ml.user_id = p.user_id and ml.ligue_id = p_ligue_id
    join public.profils pr on pr.id = p.user_id
    join public.v_matchs m on m.id = p.match_id
    where p.saison_id = p_saison_id and p.statut in ('gagne','perdu') and p.regle_le >= now() - interval '7 days'
    union all
    select 'join:' || ml.user_id::text, 'join'::text, ml.rejoint_le, ml.user_id, pr.pseudo, '{}'::jsonb
    from public.membres_ligue ml join public.profils pr on pr.id = ml.user_id
    where ml.ligue_id = p_ligue_id and ml.rejoint_le >= now() - interval '7 days'
    union all
    select 'duel:' || dm.token, 'duel'::text, dm.termine_le,
           case when pc.statut = 'gagne' then dm.createur_id else dm.accepteur_id end,
           case when pc.statut = 'gagne' then pcrea.pseudo else pacc.pseudo end,
           jsonb_build_object('gagnant',case when pc.statut='gagne' then pcrea.pseudo else pacc.pseudo end,'perdant',case when pc.statut='gagne' then pacc.pseudo else pcrea.pseudo end,'match_id',dm.match_id,'tag_a',m.tag_a,'tag_b',m.tag_b)
    from public.defis_match dm
    join public.pronostics_classes pc on pc.id = dm.createur_pronostic_id
    join public.pronostics_classes pa on pa.id = dm.accepteur_pronostic_id
    join public.profils pcrea on pcrea.id = dm.createur_id
    join public.profils pacc on pacc.id = dm.accepteur_id
    join public.v_matchs m on m.id = dm.match_id
    where dm.statut='termine' and dm.termine_le >= now() - interval '7 days'
      and exists (select 1 from public.membres_ligue x where x.ligue_id=p_ligue_id and x.user_id=dm.createur_id)
      and exists (select 1 from public.membres_ligue y where y.ligue_id=p_ligue_id and y.user_id=dm.accepteur_id)
  ), feed_limited as (
    select * from feed_base where moment is not null order by moment desc limit 24
  )
  select jsonb_build_object(
    'ligue', (select jsonb_build_object('id',l.id,'nom',l.nom,'code',l.code,'createur_id',l.createur_id,'nb_membres',(select count(*) from public.membres_ligue ml where ml.ligue_id=l.id)) from public.ligues l where l.id=p_ligue_id),
    'classement', coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'pseudo',r.pseudo,'tag_favori',r.tag_favori,'frags',r.frags,'pronostics_regles',r.pronostics_regles,'pronostics_gagnes',r.pronostics_gagnes,'rang',r.rang,'rang_7j',r.rang_7j,'mouvement',r.rang_7j-r.rang,'net_7j',r.net_7j,'moi',r.id=v_moi) order by r.rang) from ranked r),'[]'::jsonb),
    'moi', (select to_jsonb(me) || jsonb_build_object('mouvement',rang_7j-rang) from me),
    'cible', (select to_jsonb(target) || jsonb_build_object('ecart',target.frags-(select frags from me)) from target),
    'poursuivant', (select to_jsonb(pursuer) || jsonb_build_object('ecart',(select frags from me)-pursuer.frags) from pursuer),
    'matchs', coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'jeu',u.jeu,'format',u.format,'debut',u.debut,'evenement',u.evenement,'equipe_a',u.equipe_a,'equipe_b',u.equipe_b,'tag_a',u.tag_a,'tag_b',u.tag_b,'participants',u.participants,'mon_choix',u.mon_choix,'choix_a',case when u.mon_choix is not null then u.choix_a_brut else null end,'choix_b',case when u.mon_choix is not null then u.choix_b_brut else null end,'cible_choix',case when u.mon_choix is not null then u.cible_choix else null end) order by u.debut) from upcoming_base u),'[]'::jsonb),
    'rivalites', coalesce((select jsonb_agg(jsonb_build_object('joueur_a_id',dp.p1,'joueur_a',(select p.pseudo from public.profils p where p.id=dp.p1),'score_a',dp.p1_wins,'joueur_b_id',dp.p2,'joueur_b',(select p.pseudo from public.profils p where p.id=dp.p2),'score_b',dp.p2_wins,'duels',dp.duels,'dernier_duel',dp.dernier_duel,'moi',v_moi in (dp.p1,dp.p2)) order by dp.duels desc,dp.dernier_duel desc) from duel_pairs dp),'[]'::jsonb),
    'feed', coalesce((select jsonb_agg(jsonb_build_object('event_key',f.event_key,'type',f.type,'moment',f.moment,'acteur_id',f.acteur_id,'acteur_pseudo',f.acteur_pseudo,'payload',f.payload,'reactions',coalesce((select jsonb_object_agg(rr.reaction,rr.n) from (select lr.reaction,count(*)::integer n from public.ligue_reactions lr where lr.ligue_id=p_ligue_id and lr.event_key=f.event_key group by lr.reaction) rr),'{}'::jsonb),'ma_reaction',(select lr.reaction from public.ligue_reactions lr where lr.ligue_id=p_ligue_id and lr.event_key=f.event_key and lr.user_id=v_moi limit 1)) order by f.moment desc) from feed_limited f),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.clutch_reagir_ligue_v1(p_ligue_id uuid,p_event_key text,p_reaction text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moi uuid := auth.uid();
  v_event text := trim(coalesce(p_event_key,''));
  v_reaction text := lower(trim(coalesce(p_reaction,'')));
  v_current text;
  v_exists boolean := false;
  v_counts jsonb;
begin
  if v_moi is null then raise exception 'authentification requise' using errcode='28000'; end if;
  if not exists(select 1 from public.membres_ligue ml where ml.ligue_id=p_ligue_id and ml.user_id=v_moi) then raise exception 'tu ne fais pas partie de cette ligue' using errcode='42501'; end if;
  if v_reaction not in ('fire','eyes','skull','w','l') then raise exception 'reaction invalide' using errcode='22023'; end if;
  if length(v_event)<1 or length(v_event)>180 then raise exception 'evenement invalide' using errcode='22023'; end if;

  if v_event like 'prono:%' then
    select exists(select 1 from public.pronostics_classes p join public.membres_ligue ml on ml.user_id=p.user_id and ml.ligue_id=p_ligue_id where 'prono:'||p.id::text=v_event) into v_exists;
  elsif v_event like 'join:%' then
    select exists(select 1 from public.membres_ligue ml where ml.ligue_id=p_ligue_id and 'join:'||ml.user_id::text=v_event) into v_exists;
  elsif v_event like 'duel:%' then
    select exists(select 1 from public.defis_match d where 'duel:'||d.token=v_event and exists(select 1 from public.membres_ligue a where a.ligue_id=p_ligue_id and a.user_id=d.createur_id) and exists(select 1 from public.membres_ligue b where b.ligue_id=p_ligue_id and b.user_id=d.accepteur_id)) into v_exists;
  end if;
  if not v_exists then raise exception 'evenement introuvable dans cette ligue' using errcode='P0002'; end if;

  select lr.reaction into v_current from public.ligue_reactions lr where lr.ligue_id=p_ligue_id and lr.event_key=v_event and lr.user_id=v_moi;
  if v_current=v_reaction then
    delete from public.ligue_reactions where ligue_id=p_ligue_id and event_key=v_event and user_id=v_moi;
    v_current:=null;
  else
    insert into public.ligue_reactions(ligue_id,event_key,user_id,reaction) values(p_ligue_id,v_event,v_moi,v_reaction)
    on conflict(ligue_id,event_key,user_id) do update set reaction=excluded.reaction,maj_le=now();
    v_current:=v_reaction;
  end if;
  select coalesce(jsonb_object_agg(x.reaction,x.n),'{}'::jsonb) into v_counts from (select lr.reaction,count(*)::integer n from public.ligue_reactions lr where lr.ligue_id=p_ligue_id and lr.event_key=v_event group by lr.reaction) x;
  return jsonb_build_object('event_key',v_event,'ma_reaction',v_current,'reactions',v_counts);
end;
$$;

revoke execute on function public.clutch_ligue_public(text) from public;
revoke execute on function public.clutch_ligue_dashboard_v1(uuid,text) from public, anon;
revoke execute on function public.clutch_reagir_ligue_v1(uuid,text,text) from public, anon;
grant execute on function public.clutch_ligue_public(text) to anon, authenticated;
grant execute on function public.clutch_ligue_dashboard_v1(uuid,text) to authenticated;
grant execute on function public.clutch_reagir_ligue_v1(uuid,text,text) to authenticated;
