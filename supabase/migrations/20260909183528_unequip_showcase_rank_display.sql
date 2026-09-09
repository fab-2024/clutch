begin;
-- A missing rank-display row means no display. Carbon remains an equipable item.
create or replace function public.clutch_desequiper_ecrin_v1()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('clutch-cosmetic:' || v_user::text, 0));
  delete from public.equipement where user_id = v_user and emplacement = 'vitrine_rang';
  return jsonb_build_object('equipe', false);
end;
$$;
revoke all on function public.clutch_desequiper_ecrin_v1() from public, anon, authenticated, service_role;
grant execute on function public.clutch_desequiper_ecrin_v1() to authenticated, service_role;
-- Existing RLS and read-only Data API grants on equipement stay in force.
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
      case when c.emplacement = 'vitrine_rang' and chosen.id is null then null else jsonb_build_object(
        'id', coalesce(chosen.id, defaults.id),
        'emplacement', c.emplacement,
        'famille', coalesce(chosen.famille, defaults.famille),
        'niveau', coalesce(chosen.niveau, defaults.niveau),
        'nom', coalesce(chosen.nom, defaults.nom),
        'description', coalesce(chosen.description, defaults.description),
        'rarete', coalesce(chosen.rarete, defaults.rarete),
        'style_key', coalesce(chosen.style_key, defaults.style_key),
        'accent', coalesce(chosen.accent, defaults.accent),
        'collection_key', coalesce(chosen.collection_key, defaults.collection_key),
        'source', coalesce(chosen.source, defaults.source),
        'equipe_id', coalesce(chosen.equipe_id, defaults.equipe_id),
        'marque_key', coalesce(chosen.marque_key, defaults.marque_key),
        'campagne_key', coalesce(chosen.campagne_key, defaults.campagne_key),
        'saison_id', coalesce(chosen.saison_id, defaults.saison_id),
        'licence', coalesce(chosen.licence, defaults.licence)
      ) end
      order by c.emplacement
    ),
    '{}'::jsonb
  )
  from categories c
  join public.objets_catalogue defaults
    on defaults.emplacement = c.emplacement
   and defaults.est_inclus
   and defaults.statut_publication = 'publie'
  left join public.equipement equipped
    on equipped.user_id = p_user
   and equipped.emplacement = c.emplacement
  left join public.objets_catalogue chosen
    on chosen.id = equipped.objet_id
   and chosen.emplacement = c.emplacement;
$$;

revoke all privileges on function private.clutch_cosmetiques_equipes_v1(uuid)
from public, anon, authenticated, service_role;


-- Preserve all newer pack/purchase logic in the shop RPC while removing this fallback.
do $migration$
declare body text; changed text;
begin
  body := pg_get_functiondef('public.clutch_boutique_cosmetique_v1()'::regprocedure);
  changed := replace(body, 'or (equipped.objet_id is null and o.est_inclus)',
    'or (equipped.objet_id is null and o.est_inclus and o.emplacement <> ''vitrine_rang'')');
  if changed = body then raise exception 'Shop default equipment expression changed; review migration'; end if;
  execute changed;
end;
$migration$;
notify pgrst, 'reload schema';
commit;
