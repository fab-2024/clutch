-- Rank V2 -- readable seasonal grades, accuracy tie-breaks and recent moves.
--
-- Frags remain the existing server-owned rating: 1,000 at entry, five
-- placements, K=60 during placement and K=40 afterwards. This migration only
-- changes how that rating is classified and presented.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Canonical Bronze -> Mythique grade scale
-- ---------------------------------------------------------------------------

create or replace function private.clutch_grade_config_v1()
returns table (
  ordre smallint,
  cle text,
  libelle text,
  minimum integer
)
language sql
immutable
security invoker
set search_path = ''
as $$
  values
    (0::smallint, 'bronze'::text, 'Bronze'::text, 0),
    (1::smallint, 'argent'::text, 'Argent'::text, 850),
    (2::smallint, 'or'::text, 'Or'::text, 1050),
    (3::smallint, 'platine'::text, 'Platine'::text, 1250),
    (4::smallint, 'diamant'::text, 'Diamant'::text, 1450),
    (5::smallint, 'mythique'::text, 'Mythique'::text, 1650)
$$;

create or replace function private.clutch_grade_ordre_score_v2(p_frags integer)
returns smallint
language sql
immutable
security invoker
set search_path = ''
as $$
  select g.ordre
  from private.clutch_grade_config_v1() g
  where g.minimum <= greatest(0, coalesce(p_frags, 0))
  order by g.minimum desc
  limit 1
$$;

-- Legacy settlement callers only know the rating. They must never award
-- Mythique by themselves because that grade also needs a verdict count.
create or replace function private.clutch_grade_ordre_v1(p_frags integer)
returns smallint
language sql
immutable
security invoker
set search_path = ''
as $$
  select least(private.clutch_grade_ordre_score_v2(p_frags), 4::smallint)
$$;

create or replace function private.clutch_grade_ordre_eligible_v1(
  p_frags integer,
  p_pronostics_regles integer
)
returns smallint
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when greatest(0, coalesce(p_pronostics_regles, 0)) < public.clutch_frags_nb_placements()
      then null::smallint
    when greatest(0, coalesce(p_pronostics_regles, 0)) < 30
      then least(private.clutch_grade_ordre_score_v2(p_frags), 4::smallint)
    else private.clutch_grade_ordre_score_v2(p_frags)
  end
$$;

create or replace function public.clutch_grade_frags_v1(
  p_frags integer,
  p_pronostics_regles integer
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with contexte as (
    select
      greatest(0, coalesce(p_frags, 0)) as frags,
      greatest(0, coalesce(p_pronostics_regles, 0)) as regles,
      public.clutch_frags_nb_placements() as objectif
  ), actuel as (
    select g.*
    from private.clutch_grade_config_v1() g, contexte c
    where g.minimum <= c.frags
      and (g.cle <> 'mythique' or c.regles >= 30)
    order by g.minimum desc
    limit 1
  ), suivant as (
    select g.*
    from private.clutch_grade_config_v1() g, actuel a
    where g.ordre = a.ordre + 1
    limit 1
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'classe', c.regles >= c.objectif,
    'objectif_placements', c.objectif,
    'placements_restants', greatest(0, c.objectif - c.regles),
    'cle', case when c.regles >= c.objectif then a.cle end,
    'libelle', case when c.regles >= c.objectif then a.libelle end,
    'ordre', case when c.regles >= c.objectif then a.ordre end,
    'minimum', case when c.regles >= c.objectif then a.minimum end,
    'plafond', case when c.regles >= c.objectif then s.minimum end,
    'prochaine_cle', case when c.regles >= c.objectif then s.cle end,
    'prochain_libelle', case when c.regles >= c.objectif then s.libelle end,
    'prochain_minimum', case when c.regles >= c.objectif then s.minimum end,
    'prochain_objectif_pronostics', case
      when c.regles >= c.objectif and s.cle = 'mythique' then 30
    end,
    'prochains_pronostics_restants', case
      when c.regles >= c.objectif and s.cle = 'mythique' then greatest(0, 30 - c.regles)
    end,
    'progression', case
      when c.regles < c.objectif then least(1::numeric, c.regles::numeric / greatest(c.objectif, 1))
      when s.minimum is null then 1::numeric
      else greatest(
        0::numeric,
        least(1::numeric, (c.frags - a.minimum)::numeric / greatest(s.minimum - a.minimum, 1))
      )
    end
  ))
  from contexte c
  cross join actuel a
  left join suivant s on true
$$;

comment on function public.clutch_grade_frags_v1(integer, integer) is
  'Canonical six-grade seasonal scale. Hidden for five placements; Mythique requires 1,650 Frags and 30 settled classified calls.';

revoke all privileges on function private.clutch_grade_config_v1()
from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_grade_ordre_score_v2(integer)
from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_grade_ordre_v1(integer)
from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_grade_ordre_eligible_v1(integer, integer)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_grade_frags_v1(integer, integer)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_grade_frags_v1(integer, integer)
to anon, authenticated, service_role;

alter table public.classements_frags
  drop constraint if exists classements_frags_meilleur_grade_ordre_check;
alter table public.classements_frags
  add constraint classements_frags_meilleur_grade_ordre_check
  check (meilleur_grade_ordre between 0 and 5);

-- Reinterpret historical peaks against the new scale. Mythique is only kept
-- when the player had both the required rating and 30 settled calls.
with verdicts_ordonnes as (
  select
    p.saison_id,
    p.user_id,
    coalesce(p.frags_apres, public.clutch_frags_initial()) as frags_apres,
    row_number() over (
      partition by p.saison_id, p.user_id
      order by coalesce(p.regle_le, p.cree_le), p.cree_le, p.id
    )::integer as numero_verdict
  from public.pronostics_classes p
  where p.statut in ('gagne', 'perdu')
), historique as (
  select
    v.saison_id,
    v.user_id,
    max(private.clutch_grade_ordre_eligible_v1(v.frags_apres, v.numero_verdict))::smallint as meilleur_grade
  from verdicts_ordonnes v
  group by v.saison_id, v.user_id
)
update public.classements_frags c
set meilleur_grade_ordre = case
  when c.pronostics_regles < public.clutch_frags_nb_placements() then null
  else greatest(
    private.clutch_grade_ordre_eligible_v1(c.frags, c.pronostics_regles),
    coalesce(
      (
        select h.meilleur_grade
        from historique h
        where h.saison_id = c.saison_id
          and h.user_id = c.user_id
      ),
      private.clutch_grade_ordre_eligible_v1(c.frags, c.pronostics_regles)
    )
  )
end;

-- Existing settlement functions still update this column transactionally.
-- This guard makes the 30-verdict Mythique condition impossible to bypass.
create or replace function private.clutch_normaliser_meilleur_grade_v2()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eligible smallint;
begin
  v_eligible := private.clutch_grade_ordre_eligible_v1(new.frags, new.pronostics_regles);

  if v_eligible is null then
    new.meilleur_grade_ordre := case when tg_op = 'UPDATE' then old.meilleur_grade_ordre end;
  elsif tg_op = 'INSERT' then
    new.meilleur_grade_ordre := greatest(coalesce(new.meilleur_grade_ordre, v_eligible), v_eligible);
  else
    new.meilleur_grade_ordre := greatest(
      coalesce(old.meilleur_grade_ordre, v_eligible),
      coalesce(new.meilleur_grade_ordre, v_eligible),
      v_eligible
    );
    if new.pronostics_regles < 30 then
      new.meilleur_grade_ordre := least(new.meilleur_grade_ordre, 4::smallint);
    end if;
  end if;

  return new;
end;
$$;

revoke all privileges on function private.clutch_normaliser_meilleur_grade_v2()
from public, anon, authenticated, service_role;

drop trigger if exists clutch_normaliser_meilleur_grade_v2 on public.classements_frags;
create trigger clutch_normaliser_meilleur_grade_v2
before insert or update of frags, pronostics_regles, meilleur_grade_ordre
on public.classements_frags
for each row execute function private.clutch_normaliser_meilleur_grade_v2();

-- ---------------------------------------------------------------------------
-- Rating order: Frags first, accuracy only as an exact-rating tie-breaker
-- ---------------------------------------------------------------------------

create index if not exists classements_frags_rank_v2_idx
on public.classements_frags (
  saison_id,
  frags desc,
  ((pronostics_gagnes::numeric / nullif(pronostics_regles, 0))) desc,
  maj_le asc,
  user_id asc
)
where pronostics_regles >= 5;

create or replace function private.clutch_rang_frags_v1(
  p_saison_id text,
  p_user_id uuid
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select q.rang::integer
  from (
    select
      c.user_id,
      row_number() over (
        order by c.frags desc,
                 c.pronostics_gagnes::numeric / nullif(c.pronostics_regles, 0) desc,
                 c.maj_le asc,
                 c.user_id asc
      ) as rang
    from public.classements_frags c
    where c.saison_id = p_saison_id
      and c.pronostics_regles >= public.clutch_frags_nb_placements()
  ) q
  where q.user_id = p_user_id
$$;

revoke all privileges on function private.clutch_rang_frags_v1(text, uuid)
from public, anon, authenticated, service_role;

create or replace function private.clutch_progression_saison_v1(
  p_saison_id text,
  p_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_c public.classements_frags%rowtype;
  v_frags integer;
  v_pic integer;
  v_regles integer;
  v_gagnes integer;
  v_rang integer;
  v_total integer;
  v_percentile numeric;
  v_grade jsonb;
  v_meilleur_grade jsonb;
begin
  select * into v_c
  from public.classements_frags c
  where c.saison_id = p_saison_id
    and c.user_id = p_user_id;

  v_frags := coalesce(v_c.frags, public.clutch_frags_initial());
  v_pic := coalesce(v_c.pic_frags, public.clutch_frags_initial());
  v_regles := coalesce(v_c.pronostics_regles, 0);
  v_gagnes := coalesce(v_c.pronostics_gagnes, 0);
  v_grade := public.clutch_grade_frags_v1(v_frags, v_regles);

  if v_regles >= public.clutch_frags_nb_placements() then
    select ranked.rang, ranked.total
      into v_rang, v_total
    from (
      select
        c.user_id,
        row_number() over (
          order by c.frags desc,
                   c.pronostics_gagnes::numeric / nullif(c.pronostics_regles, 0) desc,
                   c.maj_le asc,
                   c.user_id asc
        )::integer as rang,
        count(*) over ()::integer as total
      from public.classements_frags c
      where c.saison_id = p_saison_id
        and c.pronostics_regles >= public.clutch_frags_nb_placements()
    ) ranked
    where ranked.user_id = p_user_id;

    if v_rang is not null then
      v_percentile := case
        when coalesce(v_total, 0) <= 1 then 100::numeric
        else pg_catalog.round((1 - (v_rang - 1)::numeric / (v_total - 1)) * 100, 1)
      end;
    end if;
  end if;

  if v_c.meilleur_grade_ordre is not null then
    select jsonb_build_object(
      'cle', g.cle,
      'libelle', g.libelle,
      'ordre', g.ordre,
      'minimum', g.minimum
    ) into v_meilleur_grade
    from private.clutch_grade_config_v1() g
    where g.ordre = v_c.meilleur_grade_ordre;
  end if;

  return jsonb_build_object(
    'saison_id', p_saison_id,
    'frags', v_frags,
    'pic_frags', v_pic,
    'pronostics_regles', v_regles,
    'pronostics_gagnes', v_gagnes,
    'placements_restants', greatest(0, public.clutch_frags_nb_placements() - v_regles),
    'provisoire', v_regles < public.clutch_frags_nb_placements(),
    'grade', v_grade,
    'rang', v_rang,
    'percentile', v_percentile,
    'joueurs_classes', coalesce(v_total, 0),
    'meilleur_grade', v_meilleur_grade,
    'meilleur_rang', v_c.meilleur_rang
  );
end;
$$;

revoke all privileges on function private.clutch_progression_saison_v1(text, uuid)
from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Rank dashboard: global placements hidden, recent movements included
-- ---------------------------------------------------------------------------

create or replace function public.clutch_classement_rank_v1(
  p_saison_id text,
  p_portee text default 'global'
)
returns table (
  rang bigint,
  id uuid,
  pseudo text,
  frags integer,
  pic_frags integer,
  pronostics_regles integer,
  pronostics_gagnes integer,
  taux_reussite numeric,
  provisoire boolean,
  moi boolean,
  grade jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_portee text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_portee, 'global')));
  v_equipe text;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if v_portee not in ('global', 'cercle', 'faction') then
    raise exception 'portee de classement invalide' using errcode = '22023';
  end if;

  select p.equipe_favorite_id into v_equipe
  from public.profils p
  where p.id = v_user;

  return query
  with source as (
    select
      c.user_id,
      p.pseudo,
      c.frags,
      c.pic_frags,
      c.pronostics_regles,
      c.pronostics_gagnes,
      c.maj_le,
      c.pronostics_regles < public.clutch_frags_nb_placements() as provisoire
    from public.classements_frags c
    join public.profils p on p.id = c.user_id
    where c.saison_id = p_saison_id
      and not private.clutch_utilisateurs_bloques_v1(v_user, c.user_id)
      and (v_portee <> 'global' or c.pronostics_regles >= public.clutch_frags_nb_placements())
      and (
        v_portee = 'global'
        or (
          v_portee = 'faction'
          and v_equipe is not null
          and p.equipe_favorite_id = v_equipe
        )
        or (
          v_portee = 'cercle'
          and (
            c.user_id = v_user
            or exists (
              select 1
              from public.amities a
              where a.statut = 'acceptee'
                and a.a = least(v_user, c.user_id)
                and a.b = greatest(v_user, c.user_id)
            )
          )
        )
      )
  ), classes as (
    select
      s.user_id,
      row_number() over (
        order by s.frags desc,
                 s.pronostics_gagnes::numeric / nullif(s.pronostics_regles, 0) desc,
                 s.maj_le asc,
                 s.user_id asc
      ) as rang
    from source s
    where not s.provisoire
  )
  select
    c.rang,
    s.user_id,
    s.pseudo,
    s.frags,
    s.pic_frags,
    s.pronostics_regles,
    s.pronostics_gagnes,
    case when s.pronostics_regles = 0 then 0::numeric
         else pg_catalog.round(s.pronostics_gagnes::numeric / s.pronostics_regles * 100, 1) end,
    s.provisoire,
    s.user_id = v_user,
    public.clutch_grade_frags_v1(s.frags, s.pronostics_regles)
  from source s
  left join classes c on c.user_id = s.user_id
  where v_portee <> 'global'
     or c.rang <= 100
     or s.user_id = v_user
  order by s.provisoire asc,
           c.rang nulls last,
           s.frags desc,
           s.pronostics_gagnes::numeric / nullif(s.pronostics_regles, 0) desc,
           s.user_id asc;
end;
$$;

create or replace function public.clutch_rank_dashboard_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_saison public.saisons%rowtype;
  v_etat jsonb;
  v_global jsonb := '[]'::jsonb;
  v_cercle jsonb := '[]'::jsonb;
  v_faction jsonb := '[]'::jsonb;
  v_mouvements jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select * into v_saison
  from public.saisons s
  order by (s.debut <= pg_catalog.now() and s.fin > pg_catalog.now()) desc, s.debut desc
  limit 1;

  if v_saison.id is null then
    return jsonb_build_object(
      'saison', null,
      'etat', null,
      'classements', jsonb_build_object('global', v_global, 'cercle', v_cercle, 'faction', v_faction),
      'mouvements_recents', v_mouvements,
      'regles', jsonb_build_object(
        'base', public.clutch_frags_initial(),
        'placements', public.clutch_frags_nb_placements(),
        'k_placement', public.clutch_frags_k_placement(),
        'k_classe', public.clutch_frags_k()
      ),
      'recompense', jsonb_build_object('statut', 'intersaison')
    );
  end if;

  v_etat := public.clutch_etat_frags(v_saison.id);

  select coalesce(jsonb_agg(to_jsonb(r) order by r.rang nulls last, r.frags desc), '[]'::jsonb)
  into v_global from public.clutch_classement_rank_v1(v_saison.id, 'global') r;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.provisoire, r.rang nulls last, r.frags desc), '[]'::jsonb)
  into v_cercle from public.clutch_classement_rank_v1(v_saison.id, 'cercle') r;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.provisoire, r.rang nulls last, r.frags desc), '[]'::jsonb)
  into v_faction from public.clutch_classement_rank_v1(v_saison.id, 'faction') r;

  select coalesce(jsonb_agg(x.payload order by x.regle_le desc, x.id desc), '[]'::jsonb)
  into v_mouvements
  from (
    select
      p.id,
      p.regle_le,
      jsonb_build_object(
        'id', p.id,
        'match_id', p.match_id,
        'equipe_a', ea.tag,
        'equipe_b', eb.tag,
        'jeu', m.jeu,
        'statut', p.statut,
        'delta_frags', coalesce(p.delta_frags, 0),
        'regle_le', p.regle_le
      ) as payload
    from public.pronostics_classes p
    join public.matchs m on m.id = p.match_id
    join public.equipes ea on ea.id = m.equipe_a_id
    join public.equipes eb on eb.id = m.equipe_b_id
    where p.user_id = v_user
      and p.saison_id = v_saison.id
      and p.statut in ('gagne', 'perdu')
    order by p.regle_le desc nulls last, p.id desc
    limit 4
  ) x;

  return jsonb_build_object(
    'saison', jsonb_build_object(
      'id', v_saison.id,
      'nom', v_saison.nom,
      'debut', v_saison.debut,
      'fin', v_saison.fin
    ),
    'etat', v_etat,
    'classements', jsonb_build_object(
      'global', v_global,
      'cercle', v_cercle,
      'faction', v_faction
    ),
    'mouvements_recents', v_mouvements,
    'regles', jsonb_build_object(
      'base', public.clutch_frags_initial(),
      'placements', public.clutch_frags_nb_placements(),
      'k_placement', public.clutch_frags_k_placement(),
      'k_classe', public.clutch_frags_k()
    ),
    'recompense', jsonb_build_object(
      'statut', 'a_annoncer',
      'titre', 'Récompense de fin de saison',
      'detail', 'La récompense dépend du meilleur grade atteint pendant la saison, même si ton rating redescend ensuite.'
    )
  );
end;
$$;

comment on function public.clutch_classement_rank_v1(text, text) is
  'Rank V2 leaderboard: Frags first, accuracy as tie-breaker; global placements hidden, Circle and Faction placements visible.';
comment on function public.clutch_rank_dashboard_v1() is
  'Rank V2 dashboard with season state, scoped leaderboards, recent settled movements and the public rating contract.';

revoke all privileges on function public.clutch_classement_rank_v1(text, text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_rank_dashboard_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_classement_rank_v1(text, text)
to authenticated, service_role;
grant execute on function public.clutch_rank_dashboard_v1()
to authenticated, service_role;
