-- Rank V4: add Éternel above Mythique while preserving the existing
-- 30-settled-verdict eligibility gate for both elite grades.

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
    (5::smallint, 'mythique'::text, 'Mythique'::text, 1650),
    (6::smallint, 'eternel'::text, 'Éternel'::text, 1850)
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
      and (g.ordre < 5 or c.regles >= 30)
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
      when c.regles >= c.objectif and s.ordre >= 5 then 30
    end,
    'prochains_pronostics_restants', case
      when c.regles >= c.objectif and s.ordre >= 5 then greatest(0, 30 - c.regles)
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
  'Canonical seven-grade seasonal scale. Every player is classified immediately; Mythique and Éternel require 30 settled calls, and Éternel starts at 1,850 Frags.';

revoke all privileges on function private.clutch_grade_config_v1()
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_grade_frags_v1(integer, integer)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_grade_frags_v1(integer, integer)
to anon, authenticated, service_role;

alter table public.classements_frags
  drop constraint if exists classements_frags_meilleur_grade_ordre_check;
alter table public.classements_frags
  add constraint classements_frags_meilleur_grade_ordre_check
  check (meilleur_grade_ordre between 0 and 6);

-- Re-evaluate historical peaks so an already-earned Éternel grade is not lost
-- when this migration is deployed in the middle of a season.
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
set meilleur_grade_ordre = greatest(
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
);
