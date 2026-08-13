-- =====================================================================
--  Clutch — palier 1 bis et palier 2.
--
--  À exécuter APRÈS 01 à 05, dans l'éditeur SQL de Supabase.
--  Idempotent : le relancer ne casse rien.
--
--  Il apporte trois choses :
--    1. le prono par défaut (mise automatique sur le favori au coup d'envoi)
--    2. le défi de ligue (un tournoi tiré au sort, avec son classement)
--    3. le profil d'analyste (agrégations et constats)
--
--  Miroir de web/js/core.js et web/js/store.js.
-- =====================================================================

-- =====================================================================
--  1. Prono par défaut
-- =====================================================================

alter table profils add column if not exists pari_auto_mode text not null default 'off';
alter table profils add column if not exists pari_auto_mise integer not null default 100;

do $$ begin
  alter table profils add constraint profils_pari_auto_mode_check
    check (pari_auto_mode in ('off', 'favori', 'tous'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table profils add constraint profils_pari_auto_mise_check
    check (pari_auto_mise between 10 and 500);
exception when duplicate_object then null; end $$;

-- On marque les paris posés automatiquement : le joueur doit pouvoir les
-- distinguer des siens d'un coup d'œil, sinon il ne comprend pas son solde.
alter table paris add column if not exists auto boolean not null default false;

/*
 * Pose le pari automatique d'un joueur sur un match, si toutes les conditions
 * sont réunies. Retourne 1 si un pari a été créé, 0 sinon.
 *
 * Aucune de ces sorties n'est une erreur : « pas de pari automatique ici » est
 * un cas normal, et lever une exception ferait échouer le règlement du match.
 */
create or replace function clutch_pari_auto(p_user uuid, p_match_id text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  m         record;
  prof      record;
  v_solde   integer;
  v_mise    integer;
  choix     jsonb;
begin
  select * into m from v_matchs where id = p_match_id;
  if not found or m.statut = 'termine' then return 0; end if;

  select * into prof from profils where id = p_user;
  if not found or coalesce(prof.pari_auto_mode, 'off') = 'off' then return 0; end if;

  -- Mode « favori » : uniquement les matchs de son équipe.
  if prof.pari_auto_mode = 'favori' then
    if prof.equipe_favorite_id is null then return 0; end if;
    if prof.equipe_favorite_id not in (m.equipe_a_id, m.equipe_b_id) then return 0; end if;
  end if;

  if exists (select 1 from paris where user_id = p_user and match_id = p_match_id) then
    return 0;
  end if;

  if (select statut from v_saisons where id = m.saison_id) <> 'en_cours' then return 0; end if;

  v_mise := least(coalesce(prof.pari_auto_mise, 100), clutch_mise_max());
  v_solde := (clutch_participation(p_user, m.saison_id)).solde;
  if v_solde < v_mise then return 0; end if;

  -- Le favori du marché « vainqueur », c'est-à-dire la cote la plus basse.
  select value into choix
  from jsonb_array_elements(
         (select value -> 'choix'
          from jsonb_array_elements(cotes_du_match(p_match_id)) as value
          where value ->> 'cle' = 'vainqueur')
       ) as value
  order by (value ->> 'cote')::numeric asc
  limit 1;
  if choix is null then return 0; end if;

  update participations set solde = solde - v_mise
   where user_id = p_user and saison_id = m.saison_id;

  insert into paris (user_id, match_id, saison_id, marche, choix, libelle_marche,
                     libelle_choix, mise, cote, auto)
  values (p_user, p_match_id, m.saison_id, 'vainqueur', choix ->> 'cle',
          'Vainqueur du match', choix ->> 'libelle', v_mise,
          (choix ->> 'cote')::numeric, true);

  return 1;
exception
  when unique_violation then return 0;
end;
$$;

/*
 * Rattrapage, appelé par le joueur à l'ouverture de l'application : pose ses
 * paris automatiques sur les matchs déjà commencés mais pas encore réglés.
 * Sans lui, le pari par défaut n'apparaîtrait qu'après le résultat.
 */
create or replace function rattraper_paris_auto(p_saison_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_poses integer := 0; m record;
begin
  if auth.uid() is null then return jsonb_build_object('poses', 0); end if;
  if (select coalesce(pari_auto_mode, 'off') from profils where id = auth.uid()) = 'off' then
    return jsonb_build_object('poses', 0);
  end if;

  for m in
    select id from matchs
    where saison_id = p_saison_id and statut = 'a_venir' and debut <= now()
    order by debut
  loop
    v_poses := v_poses + clutch_pari_auto(auth.uid(), m.id);
  end loop;

  return jsonb_build_object('poses', v_poses);
end;
$$;

/*
 * Filet de sécurité : au règlement d'un match, on pose d'abord les paris
 * automatiques manquants de TOUS les joueurs concernés — y compris ceux qui
 * n'ont pas ouvert l'application. C'est le cœur de l'anti-décrochage.
 *
 * L'ordre compte : les paris sont posés AVANT la mise à jour des Elo, donc à
 * la cote d'avant-match, celle qui était affichée.
 */
create or replace function regler_match(p_match_id text, p_score_a integer, p_score_b integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m         record;
  attendu   integer;
  v_regles  integer := 0;
  v_autos   integer := 0;
  pa        numeric;
  reel_a    numeric;
  delta     numeric;
  ea        record;
  eb        record;
  pari      record;
  joueur    record;
  gagnant   boolean;
begin
  if not exists (select 1 from profils where id = auth.uid() and est_admin) then
    raise exception 'Réservé aux administrateurs.';
  end if;

  select * into m from matchs where id = p_match_id for update;
  if not found then raise exception 'Match introuvable.'; end if;
  if m.statut = 'termine' then raise exception 'Match déjà réglé.'; end if;

  attendu := ceil(m.format / 2.0);
  if greatest(p_score_a, p_score_b) <> attendu or p_score_a = p_score_b then
    raise exception 'Score impossible pour un BO% : le vainqueur doit avoir % maps.', m.format, attendu;
  end if;

  -- Paris automatiques des joueurs qui n'ont rien saisi.
  for joueur in
    select id from profils where coalesce(pari_auto_mode, 'off') <> 'off'
  loop
    v_autos := v_autos + clutch_pari_auto(joueur.id, p_match_id);
  end loop;

  select * into ea from equipes where id = m.equipe_a_id for update;
  select * into eb from equipes where id = m.equipe_b_id for update;

  update matchs
     set score_a = p_score_a, score_b = p_score_b, statut = 'termine',
         elo_a_fige = ea.elo, elo_b_fige = eb.elo
   where id = p_match_id;

  for pari in select * from paris where match_id = p_match_id and statut = 'en_cours' loop
    gagnant := case pari.marche
      when 'vainqueur'   then (case when pari.choix = 'a' then p_score_a > p_score_b else p_score_b > p_score_a end)
      when 'score_exact' then pari.choix = p_score_a || '-' || p_score_b
      when 'total_maps'  then (case when pari.choix = 'under'
                                    then p_score_a + p_score_b <= greatest(p_score_a, p_score_b)
                                    else p_score_a + p_score_b >  greatest(p_score_a, p_score_b) end)
      else false
    end;

    update paris
       set statut = case when gagnant then 'gagne' else 'perdu' end,
           gain   = case when gagnant then round(pari.mise * pari.cote) else 0 end
     where id = pari.id;

    if gagnant then
      update participations
         set solde = solde + round(pari.mise * pari.cote)
       where user_id = pari.user_id and saison_id = pari.saison_id;
    end if;

    v_regles := v_regles + 1;
  end loop;

  pa := clutch_proba_map(ea.elo, eb.elo);
  reel_a := p_score_a::numeric / (p_score_a + p_score_b);
  delta := clutch_elo_k() * (reel_a - pa);

  update equipes set elo = round(ea.elo + delta) where id = ea.id;
  update equipes set elo = round(eb.elo - delta) where id = eb.id;

  return jsonb_build_object(
    'regles', v_regles,
    'autos',  v_autos,
    'elo_a', (select elo from equipes where id = ea.id),
    'elo_b', (select elo from equipes where id = eb.id)
  );
end;
$$;

-- =====================================================================
--  2. Défi de ligue : la compétition tirée au hasard
-- =====================================================================

create table if not exists defis_ligue (
  ligue_id  uuid not null references ligues (id) on delete cascade,
  saison_id text not null references saisons (id) on delete cascade,
  event_id  text not null references evenements (id) on delete cascade,
  tire_par  uuid not null references profils (id) on delete cascade,
  tire_le   timestamptz not null default now(),
  primary key (ligue_id, saison_id)
);

create or replace function defi_ligue(p_ligue_id uuid, p_saison_id text)
returns jsonb language sql stable as $$
  select to_jsonb(d) || jsonb_build_object('nom', ev.nom, 'jeu', ev.jeu)
  from defis_ligue d
  join evenements ev on ev.id = d.event_id
  where d.ligue_id = p_ligue_id and d.saison_id = p_saison_id;
$$;

/*
 * Tire un tournoi au sort pour une ligue : un seul par saison, tiré par le
 * créateur, et uniquement parmi les tournois qui ont encore des matchs à
 * jouer — tirer un tournoi déjà fini n'aurait aucun intérêt.
 */
create or replace function tirer_defi(p_ligue_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_saison text; v_event text;
begin
  if auth.uid() is null then raise exception 'Connecte-toi.'; end if;
  if not exists (select 1 from ligues where id = p_ligue_id and createur_id = auth.uid()) then
    raise exception 'Seul le créateur de la ligue peut tirer le défi.';
  end if;

  select id into v_saison from v_saisons where statut = 'en_cours' order by debut desc limit 1;
  if v_saison is null then raise exception 'Aucune saison ouverte.'; end if;

  if exists (select 1 from defis_ligue where ligue_id = p_ligue_id and saison_id = v_saison) then
    raise exception 'Le défi de cette saison est déjà tiré.';
  end if;

  select event_id into v_event
  from matchs
  where saison_id = v_saison and statut = 'a_venir' and debut > now()
  group by event_id
  order by random()
  limit 1;
  if v_event is null then raise exception 'Aucun tournoi n''a encore de match à jouer.'; end if;

  insert into defis_ligue (ligue_id, saison_id, event_id, tire_par)
  values (p_ligue_id, v_saison, v_event, auth.uid());

  return defi_ligue(p_ligue_id, v_saison);
end;
$$;

/*
 * Classement du défi : seuls les paris posés sur les matchs du tournoi tiré
 * comptent, et on classe au bénéfice net — pas au solde, qui mélangerait le
 * reste de la saison.
 */
create or replace function classement_defi(p_ligue_id uuid, p_saison_id text)
returns table (
  id uuid, pseudo text, moi boolean,
  paris bigint, gagnes bigint, mises bigint, gains bigint, net bigint
)
language sql stable as $$
  with defi as (
    select event_id from defis_ligue where ligue_id = p_ligue_id and saison_id = p_saison_id
  ),
  matchs_defi as (
    select m.id from matchs m join defi d on d.event_id = m.event_id
    where m.saison_id = p_saison_id
  )
  select
    pr.id,
    pr.pseudo,
    pr.id = auth.uid() as moi,
    count(pa.id)                                  as paris,
    count(pa.id) filter (where pa.statut = 'gagne') as gagnes,
    coalesce(sum(pa.mise), 0)                     as mises,
    coalesce(sum(pa.gain), 0)                     as gains,
    coalesce(sum(pa.gain), 0) - coalesce(sum(pa.mise), 0) as net
  from membres_ligue ml
  join profils pr on pr.id = ml.user_id
  left join paris pa
    on pa.user_id = pr.id
   and pa.statut in ('gagne', 'perdu')
   and pa.match_id in (select id from matchs_defi)
  where ml.ligue_id = p_ligue_id
  group by pr.id, pr.pseudo
  order by net desc, paris desc;
$$;

-- =====================================================================
--  3. Profil d'analyste
-- =====================================================================
--  Tout est calculé sur les paris RÉGLÉS uniquement : un pari en cours n'a ni
--  gain ni enseignement. Les tranches de cote reprennent celles de core.js.

-- Agrégation par dimension. Une seule fonction, la dimension est un paramètre :
-- quatre fonctions jumelles auraient divergé à la première correction.
create or replace function clutch_agreger(p_saison_id text, p_dimension text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb; v_expression text;
begin
  v_expression := case p_dimension
    when 'format' then 'm.format::text'
    when 'jeu'    then 'm.jeu'
    when 'marche' then 'p.marche'
    when 'cote'   then $c$case when p.cote < 1.8 then 'favori'
                               when p.cote < 3.0 then 'equilibre'
                               else 'outsider' end$c$
    else null
  end;
  if v_expression is null then raise exception 'Dimension inconnue : %', p_dimension; end if;

  execute format($f$
    select coalesce(jsonb_agg(x order by (x ->> 'paris')::bigint desc), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'cle',    cle,
        'paris',  count(*),
        'gagnes', count(*) filter (where statut = 'gagne'),
        'mises',  coalesce(sum(mise), 0),
        'gains',  coalesce(sum(gain), 0),
        'net',    coalesce(sum(gain), 0) - coalesce(sum(mise), 0),
        'roi',    case when coalesce(sum(mise), 0) = 0 then 0
                       else round((coalesce(sum(gain), 0) - sum(mise))::numeric / sum(mise) * 100, 1) end
      ) as x
      from (
        select p.statut, p.mise, p.gain, %s as cle
        from paris p
        join matchs m on m.id = p.match_id
        where p.user_id = auth.uid()
          and p.saison_id = $1
          and p.statut in ('gagne', 'perdu')
      ) t
      where cle is not null
      group by cle
    ) g
  $f$, v_expression)
  into v
  using p_saison_id;

  return v;
end;
$$;

-- Bilan sur les matchs de l'équipe préférée (avec = true) ou sur tous les autres.
-- C'est la comparaison qui révèle le biais du supporter.
create or replace function clutch_bloc_favorite(p_saison_id text, p_avec boolean)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'paris',  count(*),
    'gagnes', count(*) filter (where p.statut = 'gagne'),
    'mises',  coalesce(sum(p.mise), 0),
    'gains',  coalesce(sum(p.gain), 0),
    'net',    coalesce(sum(p.gain), 0) - coalesce(sum(p.mise), 0),
    'roi',    case when coalesce(sum(p.mise), 0) = 0 then 0
                   else round((coalesce(sum(p.gain), 0) - sum(p.mise))::numeric / sum(p.mise) * 100, 1) end
  )
  from paris p
  join matchs m on m.id = p.match_id
  join profils pr on pr.id = p.user_id
  where p.user_id = auth.uid()
    and p.saison_id = p_saison_id
    and p.statut in ('gagne', 'perdu')
    and case when p_avec
             then pr.equipe_favorite_id in (m.equipe_a_id, m.equipe_b_id)
             else pr.equipe_favorite_id is distinct from m.equipe_a_id
              and pr.equipe_favorite_id is distinct from m.equipe_b_id
        end;
$$;

create or replace function mes_statistiques_detaillees(p_saison_id text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_fav record; v_total jsonb;
begin
  if auth.uid() is null then return null; end if;

  select e.id as id, e.nom as nom, e.tag as tag into v_fav
  from profils pr
  left join equipes e on e.id = pr.equipe_favorite_id
  where pr.id = auth.uid();

  select jsonb_build_object(
    'paris',  count(*),
    'gagnes', count(*) filter (where statut = 'gagne'),
    'mises',  coalesce(sum(mise), 0),
    'gains',  coalesce(sum(gain), 0),
    'net',    coalesce(sum(gain), 0) - coalesce(sum(mise), 0),
    'roi',    case when coalesce(sum(mise), 0) = 0 then 0
                   else round((coalesce(sum(gain), 0) - sum(mise))::numeric / sum(mise) * 100, 1) end
  ) into v_total
  from paris
  where user_id = auth.uid() and saison_id = p_saison_id and statut in ('gagne', 'perdu');

  return jsonb_build_object(
    'total',      v_total,
    'par_format', clutch_agreger(p_saison_id, 'format'),
    'par_jeu',    clutch_agreger(p_saison_id, 'jeu'),
    'par_marche', clutch_agreger(p_saison_id, 'marche'),
    'par_cote',   clutch_agreger(p_saison_id, 'cote'),
    'equipe_favorite', case
      when v_fav.id is null then null
      else jsonb_build_object(
        'nom',  v_fav.nom,
        'tag',  v_fav.tag,
        'avec', clutch_bloc_favorite(p_saison_id, true),
        'sans', clutch_bloc_favorite(p_saison_id, false))
    end
  );
end;
$$;

-- =====================================================================
--  Sécurité
-- =====================================================================

alter table defis_ligue enable row level security;

drop policy if exists "défi visible par les membres de la ligue" on defis_ligue;
create policy "défi visible par les membres de la ligue"
  on defis_ligue for select using (
    exists (select 1 from membres_ligue where ligue_id = defis_ligue.ligue_id and user_id = auth.uid())
  );

revoke all on function rattraper_paris_auto(text)             from public;
revoke all on function tirer_defi(uuid)                       from public;
revoke all on function defi_ligue(uuid, text)                 from public;
revoke all on function classement_defi(uuid, text)            from public;
revoke all on function mes_statistiques_detaillees(text)      from public;
revoke all on function clutch_agreger(text, text)             from public;
revoke all on function clutch_bloc_favorite(text, boolean)    from public;
revoke all on function clutch_pari_auto(uuid, text)           from public;

grant execute on function rattraper_paris_auto(text)          to authenticated;
grant execute on function tirer_defi(uuid)                    to authenticated;
grant execute on function defi_ligue(uuid, text)              to authenticated;
grant execute on function classement_defi(uuid, text)         to authenticated;
grant execute on function mes_statistiques_detaillees(text)   to authenticated;
grant execute on function regler_match(text, integer, integer) to authenticated;
