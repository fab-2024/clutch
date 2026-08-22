-- Monetization phase 1.1 -- one versioned business contract shared by the
-- catalogue, purchases, future partner campaigns and the mobile interface.
--
-- This migration does not enable real-money payments. Digital purchases will
-- use native store billing in a later phase. Frags remain a competitive rating
-- and earned Volts remain the only currency accepted by this cosmetic shop.

create or replace function public.clutch_contrat_monetisation_v1()
returns jsonb
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 1,
    'code', 'identity_only_v1',
    'promesse', 'L’identité du supporter. Jamais ses performances.',
    'devises', jsonb_build_object(
      'frags', jsonb_build_object(
        'usage', 'classement_competitif',
        'achetables', false,
        'depensables', false,
        'convertibles_depuis_volts', false
      ),
      'volts', jsonb_build_object(
        'usage', 'cosmetiques_uniquement',
        'achat_reel_actif', false,
        'expiration', false,
        'conversion_frags', false
      )
    ),
    'catalogue', jsonb_build_object(
      'emplacements', jsonb_build_array(
        'cadre_profil',
        'titre_profil',
        'apparence_core',
        'effet_faction',
        'carte_profil'
      ),
      'objets_aleatoires_payants', false,
      'objets_possedes_expirent', false,
      'effets_competitifs', false,
      'achat_idempotent', true
    ),
    'partenaires', jsonb_build_object(
      'recompense', 'participation_uniquement',
      'justesse_pronostic_recompensee', false,
      'donnees_personnelles_exposees', false
    ),
    'paiements', jsonb_build_object(
      'actifs', false,
      'biens_numeriques_via_stores', true
    ),
    'regles', jsonb_build_array(
      jsonb_build_object(
        'id', 'competitive-integrity',
        'label', 'FRAGS INACHETABLES',
        'detail', 'Le rating, le rang et les résultats de Calls ne s’achètent jamais.'
      ),
      jsonb_build_object(
        'id', 'cosmetics-only',
        'label', 'VOLTS COSMÉTIQUES',
        'detail', 'Les Volts ne débloquent que des éléments d’identité visuelle.'
      ),
      jsonb_build_object(
        'id', 'no-randomness',
        'label', 'AUCUNE LOOT BOX',
        'detail', 'Chaque objet obtenu est connu avant la dépense.'
      ),
      jsonb_build_object(
        'id', 'permanent-ownership',
        'label', 'OBJETS PERMANENTS',
        'detail', 'Un objet possédé ne peut pas expirer.'
      ),
      jsonb_build_object(
        'id', 'partner-participation',
        'label', 'PARTICIPATION, PAS JUSTESSE',
        'detail', 'Une activation partenaire récompense une action, jamais un bon pronostic.'
      )
    )
  );
$$;

comment on function public.clutch_contrat_monetisation_v1() is
  'Public product promise and machine-readable monetization guardrails. Version 1 keeps real-money payments disabled.';

revoke all privileges on function public.clutch_contrat_monetisation_v1()
from public, anon, authenticated, service_role;
grant execute on function public.clutch_contrat_monetisation_v1()
to anon, authenticated, service_role;

create or replace function private.clutch_emplacement_cosmetique_v1(p_emplacement text)
returns boolean
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select coalesce(
    trim(p_emplacement) = any(
      array(
        select slot.value
        from jsonb_array_elements_text(
          public.clutch_contrat_monetisation_v1() #> '{catalogue,emplacements}'
        ) as slot(value)
      )
    ),
    false
  );
$$;

create or replace function private.clutch_assert_acquisition_cosmetique_v1(
  p_emplacement text,
  p_prix integer,
  p_aleatoire boolean,
  p_expire_le timestamptz,
  p_competitif boolean
)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_contrat constant jsonb := public.clutch_contrat_monetisation_v1();
begin
  if not private.clutch_emplacement_cosmetique_v1(p_emplacement) then
    raise exception 'emplacement non cosmetique : %', p_emplacement using errcode = '23514';
  end if;

  if p_prix is null or p_prix < 0 then
    raise exception 'prix cosmetique invalide' using errcode = '23514';
  end if;

  if coalesce(p_aleatoire, true)
     or coalesce(p_competitif, true)
     or p_expire_le is not null
  then
    raise exception 'acquisition interdite par le pacte Clutch' using errcode = '23514';
  end if;

  if v_contrat #>> '{devises,volts,usage}' <> 'cosmetiques_uniquement'
     or coalesce((v_contrat #>> '{devises,volts,conversion_frags}')::boolean, true)
     or coalesce((v_contrat #>> '{catalogue,objets_aleatoires_payants}')::boolean, true)
     or coalesce((v_contrat #>> '{catalogue,objets_possedes_expirent}')::boolean, true)
     or coalesce((v_contrat #>> '{catalogue,effets_competitifs}')::boolean, true)
  then
    raise exception 'contrat de monetisation incoherent' using errcode = '23514';
  end if;
end;
$$;

revoke all privileges on function private.clutch_emplacement_cosmetique_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_assert_acquisition_cosmetique_v1(text, integer, boolean, timestamptz, boolean)
from public, anon, authenticated, service_role;

comment on function private.clutch_assert_acquisition_cosmetique_v1(text, integer, boolean, timestamptz, boolean) is
  'Fail-closed internal guard for known, permanent and non-competitive cosmetic acquisitions.';

create or replace function private.clutch_cosmetiques_equipes_v1(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with categories(emplacement) as (
    select slot.value
    from jsonb_array_elements_text(
      public.clutch_contrat_monetisation_v1() #> '{catalogue,emplacements}'
    ) as slot(value)
  )
  select coalesce(
    jsonb_object_agg(
      c.emplacement,
      jsonb_build_object(
        'id', coalesce(chosen.id, defaults.id),
        'emplacement', c.emplacement,
        'niveau', coalesce(chosen.niveau, defaults.niveau),
        'nom', coalesce(chosen.nom, defaults.nom),
        'description', coalesce(chosen.description, defaults.description),
        'rarete', coalesce(chosen.rarete, defaults.rarete),
        'style_key', coalesce(chosen.style_key, defaults.style_key),
        'accent', coalesce(chosen.accent, defaults.accent)
      )
      order by c.emplacement
    ),
    '{}'::jsonb
  )
  from categories c
  join public.objets_catalogue defaults
    on defaults.emplacement = c.emplacement
   and defaults.niveau = 1
   and defaults.actif
  left join public.equipement equipped
    on equipped.user_id = p_user
   and equipped.emplacement = c.emplacement
  left join public.objets_catalogue chosen
    on chosen.id = equipped.objet_id
   and chosen.emplacement = c.emplacement
   and chosen.actif;
$$;

revoke all privileges on function private.clutch_cosmetiques_equipes_v1(uuid)
from public, anon, authenticated, service_role;

create or replace function public.clutch_boutique_cosmetique_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_solde integer;
  v_objets jsonb;
  v_contrat constant jsonb := public.clutch_contrat_monetisation_v1();
  v_emplacements text[];
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select array_agg(slot.value)
  into v_emplacements
  from jsonb_array_elements_text(v_contrat #> '{catalogue,emplacements}') as slot(value);

  select coalesce(sum(m.montant), 0)::integer
  into v_solde
  from public.volts_mouvements m
  where m.user_id = v_user;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'emplacement', o.emplacement,
        'niveau', o.niveau,
        'nom', o.nom,
        'description', o.description,
        'rarete', o.rarete,
        'style_key', o.style_key,
        'accent', o.accent,
        'prix', o.prix,
        'possede', o.niveau = 1 or owned.objet_id is not null,
        'equipe', equipped.objet_id = o.id
          or (equipped.objet_id is null and o.niveau = 1)
      )
      order by array_position(v_emplacements, o.emplacement), o.niveau
    ),
    '[]'::jsonb
  )
  into v_objets
  from public.objets_catalogue o
  left join public.inventaire owned
    on owned.user_id = v_user
   and owned.objet_id = o.id
  left join public.equipement equipped
    on equipped.user_id = v_user
   and equipped.emplacement = o.emplacement
  where o.actif
    and o.style_key is not null
    and private.clutch_emplacement_cosmetique_v1(o.emplacement);

  return jsonb_build_object(
    'solde', v_solde,
    'objets', v_objets,
    'equipes', private.clutch_cosmetiques_equipes_v1(v_user),
    'contrat', v_contrat
  );
end;
$$;

create or replace function public.clutch_acheter_cosmetique_v1(p_objet_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_item public.objets_catalogue%rowtype;
  v_solde integer;
  v_deja_possede boolean;
  v_contrat constant jsonb := public.clutch_contrat_monetisation_v1();
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'profil requis' using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clutch-cosmetic:' || v_user::text, 0)
  );

  select o.*
  into v_item
  from public.objets_catalogue o
  where o.id = trim(p_objet_id)
    and o.actif
    and o.style_key is not null
    and private.clutch_emplacement_cosmetique_v1(o.emplacement);

  if not found then
    raise exception 'cosmetique introuvable : %', p_objet_id using errcode = 'P0002';
  end if;

  perform private.clutch_assert_acquisition_cosmetique_v1(
    v_item.emplacement,
    v_item.prix,
    false,
    null::timestamptz,
    false
  );

  select exists (
    select 1
    from public.inventaire i
    where i.user_id = v_user
      and i.objet_id = v_item.id
  )
  into v_deja_possede;

  select coalesce(sum(m.montant), 0)::integer
  into v_solde
  from public.volts_mouvements m
  where m.user_id = v_user;

  if v_item.niveau > 1 and not v_deja_possede then
    if v_solde < v_item.prix then
      raise exception 'solde insuffisant : % Volts requis, % disponibles', v_item.prix, v_solde
        using errcode = 'P0001';
    end if;

    insert into public.volts_mouvements (user_id, montant, origine, reference)
    values (v_user, -v_item.prix, 'achat', v_item.id);

    insert into public.inventaire (user_id, objet_id)
    values (v_user, v_item.id);

    v_solde := v_solde - v_item.prix;
  end if;

  insert into public.equipement (user_id, emplacement, objet_id)
  values (v_user, v_item.emplacement, v_item.id)
  on conflict (user_id, emplacement) do update
  set objet_id = excluded.objet_id,
      maj_le = now();

  return jsonb_build_object(
    'objet', v_item.id,
    'emplacement', v_item.emplacement,
    'nom', v_item.nom,
    'prix', case when v_deja_possede or v_item.niveau = 1 then 0 else v_item.prix end,
    'solde', v_solde,
    'achete', v_item.niveau > 1 and not v_deja_possede,
    'equipe', true,
    'contrat_version', (v_contrat ->> 'version')::integer
  );
exception
  when unique_violation then
    raise exception 'achat deja traite : %', p_objet_id using errcode = 'P0001';
end;
$$;

create or replace function public.clutch_equiper_cosmetique_v1(p_objet_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_item public.objets_catalogue%rowtype;
  v_contrat constant jsonb := public.clutch_contrat_monetisation_v1();
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clutch-cosmetic:' || v_user::text, 0)
  );

  select o.*
  into v_item
  from public.objets_catalogue o
  where o.id = trim(p_objet_id)
    and o.actif
    and o.style_key is not null
    and private.clutch_emplacement_cosmetique_v1(o.emplacement);

  if not found then
    raise exception 'cosmetique introuvable : %', p_objet_id using errcode = 'P0002';
  end if;

  perform private.clutch_assert_acquisition_cosmetique_v1(
    v_item.emplacement,
    v_item.prix,
    false,
    null::timestamptz,
    false
  );

  if v_item.niveau > 1 and not exists (
    select 1
    from public.inventaire i
    where i.user_id = v_user
      and i.objet_id = v_item.id
  ) then
    raise exception 'cosmetique non possede : %', p_objet_id using errcode = 'P0001';
  end if;

  insert into public.equipement (user_id, emplacement, objet_id)
  values (v_user, v_item.emplacement, v_item.id)
  on conflict (user_id, emplacement) do update
  set objet_id = excluded.objet_id,
      maj_le = now();

  return jsonb_build_object(
    'objet', v_item.id,
    'emplacement', v_item.emplacement,
    'solde', (
      select coalesce(sum(m.montant), 0)::integer
      from public.volts_mouvements m
      where m.user_id = v_user
    ),
    'equipe', true,
    'contrat_version', (v_contrat ->> 'version')::integer
  );
end;
$$;

revoke all privileges on function public.clutch_boutique_cosmetique_v1()
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_acheter_cosmetique_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_equiper_cosmetique_v1(text)
from public, anon, authenticated, service_role;

grant execute on function public.clutch_boutique_cosmetique_v1()
to authenticated, service_role;
grant execute on function public.clutch_acheter_cosmetique_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_equiper_cosmetique_v1(text)
to authenticated, service_role;

comment on table public.inventaire is
  'Permanent ownership ledger. Catalogue unpublishing never expires or deletes an acquired item.';

do $$
declare
  v_contrat constant jsonb := public.clutch_contrat_monetisation_v1();
begin
  if (v_contrat ->> 'version')::integer <> 1
     or v_contrat ->> 'code' <> 'identity_only_v1'
     or coalesce((v_contrat #>> '{devises,frags,achetables}')::boolean, true)
     or coalesce((v_contrat #>> '{devises,frags,depensables}')::boolean, true)
     or coalesce((v_contrat #>> '{devises,volts,conversion_frags}')::boolean, true)
     or coalesce((v_contrat #>> '{catalogue,objets_aleatoires_payants}')::boolean, true)
     or coalesce((v_contrat #>> '{catalogue,objets_possedes_expirent}')::boolean, true)
     or coalesce((v_contrat #>> '{catalogue,effets_competitifs}')::boolean, true)
     or coalesce((v_contrat #>> '{partenaires,justesse_pronostic_recompensee}')::boolean, true)
     or coalesce((v_contrat #>> '{paiements,actifs}')::boolean, true)
  then
    raise exception 'Monetization contract violates Clutch guardrails';
  end if;

  if jsonb_array_length(v_contrat #> '{catalogue,emplacements}') <> 5
     or exists (
       select 1
       from jsonb_array_elements_text(v_contrat #> '{catalogue,emplacements}') slot(value)
       where not exists (
         select 1
         from public.objets_catalogue o
         where o.emplacement = slot.value
           and o.niveau = 1
           and o.actif
           and o.style_key is not null
       )
     )
  then
    raise exception 'Every monetizable slot requires one active included default';
  end if;

  if not has_function_privilege('anon', 'public.clutch_contrat_monetisation_v1()', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_boutique_cosmetique_v1()', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_acheter_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.clutch_emplacement_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege(
       'authenticated',
       'private.clutch_assert_acquisition_cosmetique_v1(text,integer,boolean,timestamp with time zone,boolean)',
       'EXECUTE'
     )
  then
    raise exception 'Monetization RPC privilege contract failed';
  end if;
end;
$$;
