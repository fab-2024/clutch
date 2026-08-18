-- Phase 12 — public player profiles / identity layer

alter table public.profils
  add column if not exists profil_public boolean not null default true;

create unique index if not exists profils_pseudo_lower_unique
  on public.profils (lower(pseudo));

create or replace function private.clutch_recap_badges_user_v1(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with mes_pronos as (
  select p.*, m.jeu, m.debut as match_debut
  from public.pronostics_classes p
  join public.matchs m on m.id = p.match_id
  where p.user_id = p_user and p.statut in ('gagne','perdu')
),
chrono as (
  select mp.*,
         row_number() over(order by cree_le,id)
         - row_number() over(partition by statut order by cree_le,id) as groupe
  from mes_pronos mp
),
series_gagnees as (
  select groupe,count(*) as longueur from chrono where statut='gagne' group by groupe
),
par_jeu as (
  select jeu,count(*) as n,
         count(*) filter(where statut='gagne') as gagnes,
         round(count(*) filter(where statut='gagne')::numeric/nullif(count(*),0)*100,1) as precision
  from mes_pronos where jeu is not null group by jeu
),
outsiders_par_semaine as (
  select date_trunc('week',cree_le) as semaine,
         count(*) filter(where statut='gagne' and proba_figee<=0.4545455) as n
  from mes_pronos group by date_trunc('week',cree_le)
),
semaine_resultats as (
  select date_trunc('week',cree_le) as semaine,count(*) as n,bool_and(statut='gagne') as parfaite
  from mes_pronos group by date_trunc('week',cree_le)
),
semaines_actives as (
  select distinct date_trunc('week',cree_le)::date as semaine from mes_pronos
),
semaines_indexees as (
  select semaine,semaine-((row_number() over(order by semaine))::integer*7) as ancre from semaines_actives
),
series_semaines as (
  select ancre,count(*) as longueur from semaines_indexees group by ancre
),
jours_actifs as (
  select distinct cree_le::date as jour from mes_pronos
),
jours_indexes as (
  select jour,jour-(row_number() over(order by jour))::integer as ancre from jours_actifs
),
series_jours as (
  select ancre,count(*) as longueur from jours_indexes group by ancre
),
mes_ligues as (
  select l.id,l.createur_id,(select count(*) from public.membres_ligue x where x.ligue_id=l.id) as nb_membres
  from public.ligues l
  join public.membres_ligue ml on ml.ligue_id=l.id and ml.user_id=p_user
),
classements_ligue as (
  select ml.ligue_id,c.saison_id,ml.user_id,c.frags,
         count(*) over(partition by ml.ligue_id,c.saison_id) as nb_membres,
         rank() over(partition by ml.ligue_id,c.saison_id order by c.frags desc,c.pronostics_gagnes desc,c.maj_le asc,ml.user_id) as rang
  from public.membres_ligue ml
  join public.classements_frags c on c.user_id=ml.user_id
  join public.saisons s on s.id=c.saison_id
  where s.fin<now()
),
mon_classement as (select * from classements_ligue where user_id=p_user),
mon_profil as (select equipe_favorite_id,est_fondateur from public.profils where id=p_user)
select jsonb_build_object(
  'paris',(select count(*) from mes_pronos),
  'gagnes',(select count(*) from mes_pronos where statut='gagne'),
  'precision_pct',(select case when count(*)=0 then 0 else round(count(*) filter(where statut='gagne')::numeric/count(*)*100,1) end from mes_pronos),
  'plus_longue_serie',(select coalesce(max(longueur),0) from series_gagnees),
  'jours_actifs',(select count(*) from jours_actifs),
  'serie_jours_actifs_max',(select coalesce(max(longueur),0) from series_jours),
  'saisons_jouees',(select count(distinct saison_id) from mes_pronos),
  'jeux_joues',(select count(*) from par_jeu),
  'paris_jeu_max',(select coalesce(max(n),0) from par_jeu),
  'proba_min_gagnee',(select coalesce(min(proba_figee),1) from mes_pronos where statut='gagne'),
  'outsiders_220_meme_semaine_max',(select coalesce(max(n),0) from outsiders_par_semaine),
  'outsiders_250_gagnes',(select count(*) from mes_pronos where statut='gagne' and proba_figee<=0.40),
  'meilleure_precision_jeu_30',(select coalesce(max(precision),0) from par_jeu where n>=30),
  'plus_longue_serie_semaines',(select coalesce(max(longueur),0) from series_semaines),
  'semaine_parfaite',exists(select 1 from semaine_resultats where n>=5 and parfaite),
  'calls_gagnes',(select count(*) from public.calls where user_id=p_user and statut='gagne'),
  'ligues_creees',(select count(*) from mes_ligues where createur_id=p_user),
  'ligues_rejointes',(select count(*) from mes_ligues),
  'plus_grande_ligue',(select coalesce(max(nb_membres),0) from mes_ligues),
  'a_equipe_favorite',(select equipe_favorite_id is not null from mon_profil),
  'est_fondateur',(select coalesce(est_fondateur,false) from mon_profil),
  'top10_ligue_20',exists(select 1 from mon_classement where nb_membres>=20 and rang<=10),
  'podium_ligue_10',exists(select 1 from mon_classement where nb_membres>=10 and rang<=3),
  'roi_ligue_10',exists(select 1 from mon_classement where nb_membres>=10 and rang=1),
  'a_devance_ami',exists(
    select 1 from mon_classement moi
    join classements_ligue ami on ami.ligue_id=moi.ligue_id and ami.saison_id=moi.saison_id and ami.user_id<>moi.user_id
    join public.amities am on am.statut='acceptee' and ((am.a=p_user and am.b=ami.user_id) or (am.b=p_user and am.a=ami.user_id))
    where moi.frags>ami.frags
  ),
  'communaute_membres',(select case when equipe_favorite_id is null then 0 else (select count(*) from public.profils p2 where p2.equipe_favorite_id=mon_profil.equipe_favorite_id) end from mon_profil),
  'rating_frags_max',(select coalesce(max(pic_frags),1000) from public.classements_frags where user_id=p_user),
  'secrets_obtenus',coalesce((select jsonb_agg(cle order by obtenu_le) from public.badges_secrets_obtenus where user_id=p_user),'[]'::jsonb)
);
$$;

revoke execute on function private.clutch_recap_badges_user_v1(uuid) from public, anon, authenticated;

create or replace function public.clutch_profil_public_v1(p_pseudo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_target public.profils%rowtype;
  v_viewer uuid := auth.uid();
  v_saison record;
  v_classement jsonb;
  v_recap jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_best_game jsonb;
  v_conviction jsonb;
  v_streak integer := 0;
  v_supporters integer := 0;
  v_forme text := 'Fiole';
  v_forme_niveau integer := 1;
  v_ligue jsonb;
  v_rivalite jsonb;
begin
  if p_pseudo is null or length(trim(p_pseudo)) < 1 or length(trim(p_pseudo)) > 48 then return null; end if;

  select * into v_target
  from public.profils
  where lower(pseudo)=lower(trim(p_pseudo))
  limit 1;

  if not found then return null; end if;
  if not v_target.profil_public and v_viewer is distinct from v_target.id then return null; end if;

  select s.id,s.nom,s.debut,s.fin into v_saison
  from public.saisons s
  order by (s.debut<=now() and s.fin>now()) desc, s.debut desc
  limit 1;

  if v_saison.id is not null then
    with ranked as (
      select c.user_id,c.frags,c.pronostics_regles,c.pronostics_gagnes,c.pic_frags,
             row_number() over(order by c.frags desc,c.pronostics_gagnes desc,c.maj_le asc,c.user_id) as rang
      from public.classements_frags c
      where c.saison_id=v_saison.id
    )
    select jsonb_build_object(
      'saison_id',v_saison.id,'saison_nom',v_saison.nom,
      'frags',coalesce(r.frags,1000),'rang',r.rang,
      'pronostics_regles',coalesce(r.pronostics_regles,0),
      'pronostics_gagnes',coalesce(r.pronostics_gagnes,0),
      'pic_frags',coalesce(r.pic_frags,1000)
    ) into v_classement
    from ranked r where r.user_id=v_target.id;
  end if;

  if v_classement is null then
    v_classement := jsonb_build_object('saison_id',v_saison.id,'saison_nom',v_saison.nom,'frags',1000,'rang',null,'pronostics_regles',0,'pronostics_gagnes',0,'pic_frags',1000);
  end if;

  v_recap := private.clutch_recap_badges_user_v1(v_target.id);

  select coalesce(jsonb_agg(to_jsonb(q) order by q.regle_le desc nulls last, q.cree_le desc), '[]'::jsonb)
  into v_recent
  from (
    select p.id,p.match_id,p.statut,p.choix,p.conviction,p.delta_frags,p.cree_le,p.regle_le,
           m.jeu,m.evenement,m.equipe_a,m.equipe_b,m.tag_a,m.tag_b,m.score_a,m.score_b
    from public.pronostics_classes p
    join public.v_matchs m on m.id=p.match_id
    where p.user_id=v_target.id and p.statut in ('gagne','perdu')
    order by p.regle_le desc nulls last,p.cree_le desc,p.id desc
    limit 5
  ) q;

  select jsonb_build_object('jeu',x.jeu,'pronostics',x.n,'gagnes',x.gagnes,'precision_pct',x.precision)
  into v_best_game
  from (
    select m.jeu,count(*) as n,count(*) filter(where p.statut='gagne') as gagnes,
           round(count(*) filter(where p.statut='gagne')::numeric/nullif(count(*),0)*100,1) as precision
    from public.pronostics_classes p
    join public.matchs m on m.id=p.match_id
    where p.user_id=v_target.id and p.statut in ('gagne','perdu') and m.jeu is not null
    group by m.jeu
    order by count(*) desc, precision desc, m.jeu
    limit 1
  ) x;

  select jsonb_build_object('conviction',x.conviction,'pronostics',x.n)
  into v_conviction
  from (
    select p.conviction,count(*) as n
    from public.pronostics_classes p
    where p.user_id=v_target.id and p.statut in ('gagne','perdu')
    group by p.conviction
    order by count(*) desc,p.conviction
    limit 1
  ) x;

  with ordered as (
    select p.statut,row_number() over(order by p.regle_le desc nulls last,p.cree_le desc,p.id desc) as rn
    from public.pronostics_classes p
    where p.user_id=v_target.id and p.statut in ('gagne','perdu')
  ), first_loss as (
    select min(rn) as rn from ordered where statut='perdu'
  )
  select count(*)::integer into v_streak
  from ordered, first_loss
  where ordered.statut='gagne' and ordered.rn < coalesce(first_loss.rn,2147483647);

  if v_target.equipe_favorite_id is not null then
    select count(*)::integer into v_supporters from public.profils where equipe_favorite_id=v_target.equipe_favorite_id;
    if v_supporters >= 5000 then v_forme:='Océan'; v_forme_niveau:=7;
    elsif v_supporters >= 1000 then v_forme:='Cornue'; v_forme_niveau:=6;
    elsif v_supporters >= 500 then v_forme:='Alambic'; v_forme_niveau:=5;
    elsif v_supporters >= 100 then v_forme:='Calice'; v_forme_niveau:=4;
    elsif v_supporters >= 50 then v_forme:='Bombonne'; v_forme_niveau:=3;
    elsif v_supporters >= 10 then v_forme:='Flacon'; v_forme_niveau:=2;
    end if;
  end if;

  if v_viewer is not null then
    select jsonb_build_object('id',l.id,'nom',l.nom,'code',l.code,'membres',count(*) over(partition by l.id))
    into v_ligue
    from public.membres_ligue mt
    join public.membres_ligue mv on mv.ligue_id=mt.ligue_id and mv.user_id=v_viewer
    join public.ligues l on l.id=mt.ligue_id
    join public.membres_ligue allm on allm.ligue_id=l.id
    where mt.user_id=v_target.id
    group by l.id,l.nom,l.code,mt.rejoint_le
    order by count(allm.user_id) desc,mt.rejoint_le desc
    limit 1;

    if v_viewer <> v_target.id then
      with duels as (
        select d.*,pc.statut as createur_statut,pa.statut as accepteur_statut
        from public.defis_match d
        join public.pronostics_classes pc on pc.id=d.createur_pronostic_id
        join public.pronostics_classes pa on pa.id=d.accepteur_pronostic_id
        where d.statut='termine'
          and ((d.createur_id=v_target.id and d.accepteur_id=v_viewer) or (d.createur_id=v_viewer and d.accepteur_id=v_target.id))
      ), counts as (
        select count(*) filter(where (createur_id=v_target.id and createur_statut='gagne') or (accepteur_id=v_target.id and accepteur_statut='gagne')) as target_wins,
               count(*) filter(where (createur_id=v_viewer and createur_statut='gagne') or (accepteur_id=v_viewer and accepteur_statut='gagne')) as viewer_wins,
               count(*) as total
        from duels
      ), last_duel as (
        select d.token,d.match_id,d.termine_le,m.tag_a,m.tag_b,m.score_a,m.score_b
        from duels d join public.v_matchs m on m.id=d.match_id
        order by d.termine_le desc nulls last limit 1
      )
      select case when c.total=0 then null else jsonb_build_object(
        'target_wins',c.target_wins,'viewer_wins',c.viewer_wins,'total',c.total,
        'dernier',case when ld.token is null then null else jsonb_build_object('token',ld.token,'match_id',ld.match_id,'termine_le',ld.termine_le,'tag_a',ld.tag_a,'tag_b',ld.tag_b,'score_a',ld.score_a,'score_b',ld.score_b) end
      ) end
      into v_rivalite
      from counts c left join last_duel ld on true;
    end if;
  end if;

  return jsonb_build_object(
    'pseudo',v_target.pseudo,
    'cree_le',v_target.cree_le,
    'titre_profil',v_target.titre_profil,
    'est_fondateur',v_target.est_fondateur,
    'profil_public',v_target.profil_public,
    'badge_vedette',v_target.badge_vedette,
    'badges_exposes',coalesce(to_jsonb(v_target.badges_exposes),'[]'::jsonb),
    'arsenal_exposes',coalesce(to_jsonb(v_target.arsenal_exposes),'[]'::jsonb),
    'classement',v_classement,
    'recap',v_recap,
    'serie_actuelle',coalesce(v_streak,0),
    'meilleur_jeu',v_best_game,
    'conviction_preferee',v_conviction,
    'forme_recente',v_recent,
    'equipe_favorite',case when v_target.equipe_favorite_id is null then null else (
      select jsonb_build_object('id',e.id,'nom',e.nom,'tag',e.tag,'jeu',e.jeu,'logo',e.logo,'supporters',v_supporters,'relique',v_forme,'relique_niveau',v_forme_niveau)
      from public.equipes e where e.id=v_target.equipe_favorite_id
    ) end,
    'viewer',case when v_viewer is null then null else jsonb_build_object('est_moi',v_viewer=v_target.id,'ligue_commune',v_ligue,'rivalite',v_rivalite) end
  );
end;
$$;

revoke execute on function public.clutch_profil_public_v1(text) from public;
grant execute on function public.clutch_profil_public_v1(text) to anon, authenticated;

create or replace function public.clutch_regler_visibilite_profil_v1(p_public boolean)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentification requise' using errcode='28000'; end if;
  update public.profils set profil_public=coalesce(p_public,true) where id=auth.uid();
  if not found then raise exception 'profil introuvable' using errcode='P0002'; end if;
  return coalesce(p_public,true);
end;
$$;

revoke execute on function public.clutch_regler_visibilite_profil_v1(boolean) from public, anon;
grant execute on function public.clutch_regler_visibilite_profil_v1(boolean) to authenticated;
