-- The simulation is SECURITY INVOKER after advisor hardening, so its query
-- must only depend on public catalogue data granted to authenticated users.

create or replace function public.clutch_simuler_economie_volts_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with prix as (
    select
      coalesce(min(o.prix) filter (where o.prix > 0), 250)::integer as entree,
      coalesce(
        percentile_disc(0.5) within group (order by o.prix)
          filter (where o.prix > 0),
        900
      )::integer as median,
      coalesce(
        percentile_disc(0.75) within group (order by o.prix)
          filter (where o.prix > 0),
        1500
      )::integer as prestige,
      coalesce(max(o.prix) filter (where o.prix > 0), 2200)::integer as maximum,
      count(*) filter (where o.prix > 0)::integer as objets_payants
    from public.objets_catalogue o
    where o.source = 'achat'
      and o.style_key is not null
      and o.emplacement = any(array[
        'cadre_profil',
        'titre_profil',
        'apparence_core',
        'effet_faction',
        'carte_profil'
      ]::text[])
  ),
  profils(id, revenu_mensuel, budget_depense_cible) as (
    values
      ('occasionnel'::text, 450::numeric, 750::numeric),
      ('engage'::text, 900::numeric, 1200::numeric),
      ('core'::text, 1600::numeric, 2200::numeric)
  )
  select jsonb_build_object(
    'version', 1,
    'hypothese', 'revenus recurrents hors onboarding et recompenses exceptionnelles',
    'catalogue', jsonb_build_object(
      'objets_payants', prix.objets_payants,
      'prix_entree', prix.entree,
      'prix_median', prix.median,
      'prix_prestige', prix.prestige,
      'prix_maximum', prix.maximum
    ),
    'profils', (
      select jsonb_agg(
        jsonb_build_object(
          'id', profils.id,
          'revenu_mensuel', profils.revenu_mensuel::integer,
          'jours_premier_objet', ceil(prix.entree * 30 / profils.revenu_mensuel)::integer,
          'mois_objet_median', round(prix.median / profils.revenu_mensuel, 2),
          'mois_objet_prestige', round(prix.prestige / profils.revenu_mensuel, 2),
          'ratio_revenu_sur_depense_cible', round(
            profils.revenu_mensuel / profils.budget_depense_cible,
            2
          ),
          'inflation_sous_controle',
            profils.revenu_mensuel / profils.budget_depense_cible <= 0.80
        )
        order by profils.revenu_mensuel
      )
      from profils
    ),
    'garde_fous', jsonb_build_object(
      'premier_objet_max_jours', 21,
      'ratio_revenu_sur_depense_cible_max', 0.80,
      'conversion_volts_vers_frags', false,
      'impact_classement', false
    )
  )
  from prix;
$$;

revoke all privileges on function public.clutch_simuler_economie_volts_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_simuler_economie_volts_v1()
to authenticated, service_role;

comment on function public.clutch_simuler_economie_volts_v1() is
  'Authenticated SECURITY INVOKER economy simulation over the five public cosmetic slots.';

do $$
begin
  if exists (
    select 1
    from jsonb_array_elements(
      public.clutch_simuler_economie_volts_v1() -> 'profils'
    ) profil(value)
    where (profil.value ->> 'jours_premier_objet')::integer > 21
       or (profil.value ->> 'ratio_revenu_sur_depense_cible')::numeric > 0.80
       or not (profil.value ->> 'inflation_sous_controle')::boolean
  ) then
    raise exception 'Corrected Volt simulation exceeds its guardrails';
  end if;
end;
$$;
