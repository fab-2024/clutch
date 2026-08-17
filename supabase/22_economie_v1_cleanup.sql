-- =====================================================================
-- Clutch — 22_economie_v1_cleanup.sql
--
-- Ferme définitivement les écritures Economy V1 sans supprimer l'historique.
-- Frags = rating non dépensable. Volts = seule monnaie de Boutique.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Les pronostics automatiques et les anciennes primes ne doivent plus
--    pouvoir créer de mouvement de bankroll.
-- ---------------------------------------------------------------------
update public.profils
   set pari_auto_mode = 'off'
 where coalesce(pari_auto_mode, 'off') <> 'off';

revoke execute on function public.placer_pari(text, text, text, integer) from public;
revoke execute on function public.reclamer_prime(text) from public;
revoke execute on function public.etat_prime(text) from public;
revoke execute on function public.placer_call(text, text, integer) from public;
revoke execute on function public.rattraper_paris_auto(text) from public;
revoke execute on function public.clutch_pari_auto(uuid, text) from public;

revoke execute on function public.placer_pari(text, text, text, integer) from anon, authenticated;
revoke execute on function public.reclamer_prime(text) from anon, authenticated;
revoke execute on function public.etat_prime(text) from anon, authenticated;
revoke execute on function public.placer_call(text, text, integer) from anon, authenticated;
revoke execute on function public.rattraper_paris_auto(text) from anon, authenticated;
revoke execute on function public.clutch_pari_auto(uuid, text) from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Call V2 : un choix de prestige, gratuit, sans cote ni paiement.
--    Les anciennes lignes sont conservées comme archives.
-- ---------------------------------------------------------------------
alter table public.calls drop constraint if exists calls_mise_check;
alter table public.calls add constraint calls_mise_check check (mise >= 0);

create or replace function public.placer_call_v2(p_event_id text, p_equipe_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_saison text;
  v_statut text;
  v_cote numeric;
begin
  if v_user is null then
    raise exception 'Connecte-toi pour poser ton call.' using errcode = '28000';
  end if;

  select id into v_saison
  from public.v_saisons
  where statut = 'en_cours'
  order by debut desc
  limit 1;

  if v_saison is null then raise exception 'Aucune saison ouverte.'; end if;
  if exists(select 1 from public.calls where user_id = v_user and saison_id = v_saison) then
    raise exception 'Tu as déjà posé ton call pour cette saison.' using errcode = '23505';
  end if;

  select statut into v_statut
  from public.v_evenements_saison
  where id = p_event_id and saison_id = v_saison;

  if v_statut is null then raise exception 'Événement inconnu pour cette saison.'; end if;
  if v_statut <> 'ouvert' then raise exception 'Cet événement a déjà commencé : le call est fermé.'; end if;

  -- La cote reste stockée uniquement comme snapshot historique du modèle.
  -- Elle n'est jamais affichée comme multiplicateur et ne produit aucun gain.
  select (value ->> 'cote')::numeric into v_cote
  from jsonb_array_elements(public.cotes_evenement(p_event_id, v_saison)) as value
  where value ->> 'id' = p_equipe_id;

  if v_cote is null then raise exception 'Cette équipe ne participe pas à l''événement.'; end if;

  insert into public.calls(user_id, saison_id, event_id, equipe_id, mise, cote, gain)
  values(v_user, v_saison, p_event_id, p_equipe_id, 0, v_cote, 0);

  return public.mon_call(v_saison);
exception
  when unique_violation then
    raise exception 'Tu as déjà posé ton call pour cette saison.' using errcode = '23505';
end;
$$;

revoke execute on function public.placer_call_v2(text, text) from public, anon;
grant execute on function public.placer_call_v2(text, text) to authenticated;

create or replace function public.mon_call(p_saison_id text)
returns jsonb
language sql
stable
set search_path = public
as $$
  select to_jsonb(c) || jsonb_build_object(
    'equipe', e.nom,
    'tag', e.tag,
    'jeu', e.jeu,
    'evenement', ev.nom,
    'mode', case when c.mise = 0 then 'v2' else 'archive_legacy' end
  )
  from public.calls c
  join public.equipes e on e.id = c.equipe_id
  join public.evenements ev on ev.id = c.event_id
  where c.user_id = auth.uid() and c.saison_id = p_saison_id;
$$;

-- Le règlement d'un événement ne crédite plus aucune bankroll.
create or replace function public.regler_evenement(p_event_id text, p_equipe_id text, p_saison_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_regles integer := 0;
begin
  if not exists(select 1 from public.profils where id = auth.uid() and est_admin) then
    raise exception 'Réservé aux administrateurs.' using errcode = '42501';
  end if;

  if exists(select 1 from public.resultats_evenement where event_id = p_event_id and saison_id = p_saison_id) then
    raise exception 'Événement déjà réglé.';
  end if;

  if not exists(
    select 1 from public.matchs
    where event_id = p_event_id and saison_id = p_saison_id
      and p_equipe_id in (equipe_a_id, equipe_b_id)
  ) then
    raise exception 'Cette équipe ne participe pas à l''événement.';
  end if;

  insert into public.resultats_evenement(saison_id, event_id, equipe_id)
  values(p_saison_id, p_event_id, p_equipe_id);

  update public.calls
     set statut = case when equipe_id = p_equipe_id then 'gagne' else 'perdu' end,
         gain = 0
   where event_id = p_event_id
     and saison_id = p_saison_id
     and statut = 'en_cours';

  get diagnostics v_regles = row_count;
  return jsonb_build_object('regles', v_regles);
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Règlement d'un match : uniquement résultat + Frags V2 + Elo équipes.
--    Le trigger frags_regler_pronostics, installé par 18_economie_v2.sql,
--    règle les pronostics classés lors du passage du match à "termine".
-- ---------------------------------------------------------------------
create or replace function public.regler_match(p_match_id text, p_score_a integer, p_score_b integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  attendu integer;
  v_regles integer := 0;
  pa numeric;
  reel_a numeric;
  delta numeric;
  ea record;
  eb record;
begin
  if not exists(select 1 from public.profils where id = auth.uid() and est_admin) then
    raise exception 'Réservé aux administrateurs.' using errcode = '42501';
  end if;

  select * into m from public.matchs where id = p_match_id for update;
  if not found then raise exception 'Match introuvable.'; end if;
  if m.statut = 'termine' then raise exception 'Match déjà réglé.'; end if;

  attendu := ceil(m.format / 2.0);
  if greatest(p_score_a, p_score_b) <> attendu or p_score_a = p_score_b then
    raise exception 'Score impossible pour un BO% : le vainqueur doit avoir % maps.', m.format, attendu;
  end if;

  select count(*)::integer into v_regles
  from public.pronostics_classes
  where match_id = p_match_id and statut = 'en_cours';

  select * into ea from public.equipes where id = m.equipe_a_id for update;
  select * into eb from public.equipes where id = m.equipe_b_id for update;

  update public.matchs
     set score_a = p_score_a,
         score_b = p_score_b,
         statut = 'termine',
         elo_a_fige = ea.elo,
         elo_b_fige = eb.elo
   where id = p_match_id;

  pa := public.clutch_proba_map(ea.elo, eb.elo);
  reel_a := p_score_a::numeric / (p_score_a + p_score_b);
  delta := public.clutch_elo_k() * (reel_a - pa);

  update public.equipes set elo = round(ea.elo + delta) where id = ea.id;
  update public.equipes set elo = round(eb.elo - delta) where id = eb.id;

  return jsonb_build_object(
    'regles', v_regles,
    'autos', 0,
    'elo_a', (select elo from public.equipes where id = ea.id),
    'elo_b', (select elo from public.equipes where id = eb.id)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Badges / carrière : les métriques de performance viennent désormais
--    exclusivement des pronostics classés Economy V2.
-- ---------------------------------------------------------------------
create or replace function public.recap_badges()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with mes_pronos as (
  select p.*, m.jeu, m.debut as match_debut
  from public.pronostics_classes p
  join public.matchs m on m.id = p.match_id
  where p.user_id = auth.uid() and p.statut in ('gagne','perdu')
),
chrono as (
  select mp.*,
         row_number() over(order by cree_le,id)
         - row_number() over(partition by statut order by cree_le,id) as groupe
  from mes_pronos mp
),
series_gagnees as (
  select groupe,count(*) as longueur
  from chrono where statut='gagne' group by groupe
),
par_jeu as (
  select jeu,
         count(*) as n,
         count(*) filter(where statut='gagne') as gagnes,
         round(count(*) filter(where statut='gagne')::numeric/nullif(count(*),0)*100,1) as precision
  from mes_pronos where jeu is not null group by jeu
),
outsiders_par_semaine as (
  select date_trunc('week',cree_le) as semaine,
         count(*) filter(where statut='gagne' and proba_figee <= 0.4545455) as n
  from mes_pronos group by date_trunc('week',cree_le)
),
semaine_resultats as (
  select date_trunc('week',cree_le) as semaine,
         count(*) as n,
         bool_and(statut='gagne') as parfaite
  from mes_pronos group by date_trunc('week',cree_le)
),
semaines_actives as (
  select distinct date_trunc('week',cree_le)::date as semaine from mes_pronos
),
semaines_indexees as (
  select semaine,semaine-((row_number() over(order by semaine))::integer*7) as ancre
  from semaines_actives
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
  select l.id,l.createur_id,
         (select count(*) from public.membres_ligue x where x.ligue_id=l.id) as nb_membres
  from public.ligues l
  join public.membres_ligue ml on ml.ligue_id=l.id and ml.user_id=auth.uid()
),
classements_ligue as (
  select ml.ligue_id,c.saison_id,ml.user_id,c.frags,
         count(*) over(partition by ml.ligue_id,c.saison_id) as nb_membres,
         rank() over(
           partition by ml.ligue_id,c.saison_id
           order by c.frags desc,c.pronostics_gagnes desc,c.maj_le asc,ml.user_id
         ) as rang
  from public.membres_ligue ml
  join public.classements_frags c on c.user_id=ml.user_id
  join public.saisons s on s.id=c.saison_id
  where s.fin < now()
),
mon_classement as (
  select * from classements_ligue where user_id=auth.uid()
),
mon_profil as (
  select equipe_favorite_id,est_fondateur from public.profils where id=auth.uid()
)
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
  'calls_gagnes',(select count(*) from public.calls where user_id=auth.uid() and statut='gagne'),
  'ligues_creees',(select count(*) from mes_ligues where createur_id=auth.uid()),
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
    join public.amities am on am.statut='acceptee'
      and ((am.a=auth.uid() and am.b=ami.user_id) or (am.b=auth.uid() and am.a=ami.user_id))
    where moi.frags>ami.frags
  ),
  'communaute_membres',(
    select case when equipe_favorite_id is null then 0
      else (select count(*) from public.profils p2 where p2.equipe_favorite_id=mon_profil.equipe_favorite_id)
    end from mon_profil
  ),
  'rating_frags_max',(select coalesce(max(pic_frags),1000) from public.classements_frags where user_id=auth.uid()),
  -- Champs historiques conservés à zéro pour ne pas casser un ancien client
  -- pendant la transition. Ils ne pilotent plus aucun badge V2.
  'mises',0,'gains',0,'net',0,'roi',0,'mise_max_gagnee',0,'scores_exacts',0,'total_maps_gagnes',0,'serie_prime_max',0,
  'cote_max_gagnee',(select coalesce(max(1.0/nullif(proba_figee,0)),0) from mes_pronos where statut='gagne'),
  'secrets_obtenus',coalesce((select jsonb_agg(cle order by obtenu_le) from public.badges_secrets_obtenus where user_id=auth.uid()),'[]'::jsonb)
);
$$;

revoke execute on function public.recap_badges() from public, anon;
grant execute on function public.recap_badges() to authenticated;
