-- Priority 3 -- give Volts a strictly cosmetic purpose in the mobile app.
--
-- The historical economy already provides an append-only Volt ledger,
-- inventory and one equipped item per slot. This migration keeps those
-- battle-tested primitives, adds presentation metadata and exposes a mobile
-- catalogue limited to cosmetic slots. Frags are never read or mutated here.

alter table public.objets_catalogue
  add column if not exists description text not null default '',
  add column if not exists rarete text not null default 'commun',
  add column if not exists style_key text,
  add column if not exists accent text not null default '#AAB4BE';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_rarete_check'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_rarete_check
      check (rarete in ('commun', 'rare', 'epique', 'legendaire'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_style_key_check'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_style_key_check
      check (style_key is null or style_key ~ '^[a-z0-9-]+$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.objets_catalogue'::regclass
      and conname = 'objets_catalogue_accent_check'
  ) then
    alter table public.objets_catalogue
      add constraint objets_catalogue_accent_check
      check (accent ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end;
$$;

create unique index if not exists objets_catalogue_style_key_uidx
  on public.objets_catalogue (style_key)
  where style_key is not null;

comment on column public.objets_catalogue.description is
  'Short product promise displayed in the mobile cosmetic shop.';
comment on column public.objets_catalogue.rarete is
  'Cosmetic rarity only. It never changes rewards, Frags or competitive outcomes.';
comment on column public.objets_catalogue.style_key is
  'Stable visual token interpreted by the mobile design system.';
comment on column public.objets_catalogue.accent is
  'Six-digit hexadecimal preview color. Presentation only.';

insert into public.objets_catalogue (
  id,
  emplacement,
  niveau,
  nom,
  prix,
  actif,
  description,
  rarete,
  style_key,
  accent
) values
  ('cadre-profil-1', 'cadre_profil', 1, 'Cadre Brut', 0, true,
    'Un contour graphite net, livré avec chaque profil.', 'commun', 'frame-raw', '#AAB4BE'),
  ('cadre-profil-2', 'cadre_profil', 2, 'Signal Volt', 350, true,
    'Une impulsion acide qui souligne les moments importants.', 'rare', 'frame-volt', '#E8FF3D'),
  ('cadre-profil-3', 'cadre_profil', 3, 'Prisme Arena', 850, true,
    'Des reflets froids inspirés des écrans de compétition.', 'epique', 'frame-prism', '#63B8FF'),
  ('cadre-profil-4', 'cadre_profil', 4, 'Obsidienne', 1500, true,
    'Un cadre sombre traversé par une lueur violette contenue.', 'legendaire', 'frame-obsidian', '#B68CFF'),

  ('titre-profil-1', 'titre_profil', 1, 'Rookie du Call', 0, true,
    'Le premier titre de celles et ceux qui entrent dans l’Arena.', 'commun', 'title-rookie', '#AAB4BE'),
  ('titre-profil-2', 'titre_profil', 2, 'Lecteur du Jeu', 250, true,
    'Pour les joueurs qui voient le tempo avant les autres.', 'rare', 'title-reader', '#63B8FF'),
  ('titre-profil-3', 'titre_profil', 3, 'Instinct Clutch', 650, true,
    'Un titre pour les décisions prises au moment exact.', 'epique', 'title-instinct', '#E8FF3D'),
  ('titre-profil-4', 'titre_profil', 4, 'Architecte du Chaos', 1100, true,
    'Réservé aux profils capables de lire les scénarios impossibles.', 'legendaire', 'title-architect', '#FFB84D'),

  ('apparence-core-1', 'apparence_core', 1, 'Core Origine', 0, true,
    'Le noyau Clutch dans sa forme noire et Volt.', 'commun', 'core-origin', '#E8FF3D'),
  ('apparence-core-2', 'apparence_core', 2, 'Core Plasma', 600, true,
    'Une charge magenta dense, presque liquide.', 'rare', 'core-plasma', '#FF5DDF'),
  ('apparence-core-3', 'apparence_core', 3, 'Core Holographique', 1200, true,
    'Une matière cyan instable aux reflets spectraux.', 'epique', 'core-holo', '#54D9FF'),
  ('apparence-core-4', 'apparence_core', 4, 'Core Éclipse', 2200, true,
    'Un noyau blanc comprimé dans une enveloppe d’ombre.', 'legendaire', 'core-eclipse', '#F5F6F2'),

  ('effet-faction-1', 'effet_faction', 1, 'Aura Discrète', 0, true,
    'La relique respire sans modifier son identité.', 'commun', 'faction-aura', '#C6A34A'),
  ('effet-faction-2', 'effet_faction', 2, 'Veines Volt', 500, true,
    'Des filaments acides répondent à l’activité de la faction.', 'rare', 'faction-veins', '#E8FF3D'),
  ('effet-faction-3', 'effet_faction', 3, 'Éclat de Guerre', 1100, true,
    'Une tension ambrée accompagne chaque progression collective.', 'epique', 'faction-war', '#FFB84D'),
  ('effet-faction-4', 'effet_faction', 4, 'Mutation Instable', 2000, true,
    'La matière paraît trop puissante pour son contenant.', 'legendaire', 'faction-mutation', '#D886FF'),

  ('carte-profil-1', 'carte_profil', 1, 'Carte Noire', 0, true,
    'Une carte de performance sobre et lisible.', 'commun', 'card-black', '#AAB4BE'),
  ('carte-profil-2', 'carte_profil', 2, 'Signal Acide', 400, true,
    'Un signal Volt place le dernier résultat au premier plan.', 'rare', 'card-signal', '#E8FF3D'),
  ('carte-profil-3', 'carte_profil', 3, 'Scoreboard', 900, true,
    'Une composition inspirée des habillages de match center.', 'epique', 'card-scoreboard', '#63B8FF'),
  ('carte-profil-4', 'carte_profil', 4, 'Légende Nocturne', 1700, true,
    'Une carte profonde pour les meilleurs grades de saison.', 'legendaire', 'card-nocturne', '#A982FF')
on conflict (id) do update
set emplacement = excluded.emplacement,
    niveau = excluded.niveau,
    nom = excluded.nom,
    prix = excluded.prix,
    actif = excluded.actif,
    description = excluded.description,
    rarete = excluded.rarete,
    style_key = excluded.style_key,
    accent = excluded.accent;

-- Internal renderer shared by the authenticated and public profile RPCs.
-- It accepts a user id, so it is deliberately kept out of the Data API.
create or replace function private.clutch_cosmetiques_equipes_v1(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with categories(emplacement) as (
    values
      ('cadre_profil'::text),
      ('titre_profil'::text),
      ('apparence_core'::text),
      ('effet_faction'::text),
      ('carte_profil'::text)
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
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

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
      order by array_position(
        array['cadre_profil', 'titre_profil', 'apparence_core', 'effet_faction', 'carte_profil'],
        o.emplacement
      ), o.niveau
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
    and o.emplacement = any(array[
      'cadre_profil', 'titre_profil', 'apparence_core', 'effet_faction', 'carte_profil'
    ]::text[]);

  return jsonb_build_object(
    'solde', v_solde,
    'objets', v_objets,
    'equipes', private.clutch_cosmetiques_equipes_v1(v_user)
  );
end;
$$;

-- Per-user privileged operation: the advisory lock serializes concurrent
-- taps, the ledger uniqueness makes retries harmless, and the transaction
-- contains debit, inventory acquisition and equipment update together.
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
    and o.emplacement = any(array[
      'cadre_profil', 'titre_profil', 'apparence_core', 'effet_faction', 'carte_profil'
    ]::text[]);

  if not found then
    raise exception 'cosmetique introuvable : %', p_objet_id using errcode = 'P0002';
  end if;

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
    'equipe', true
  );
exception
  when unique_violation then
    -- A ledger conflict can only be a retried purchase for this same user and
    -- item. The surrounding statement rolls back before returning this error.
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
    and o.emplacement = any(array[
      'cadre_profil', 'titre_profil', 'apparence_core', 'effet_faction', 'carte_profil'
    ]::text[]);

  if not found then
    raise exception 'cosmetique introuvable : %', p_objet_id using errcode = 'P0002';
  end if;

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
    'equipe', true
  );
end;
$$;

create or replace function public.clutch_mes_cosmetiques_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  return private.clutch_cosmetiques_equipes_v1(v_user);
end;
$$;

create or replace function public.clutch_cosmetiques_profil_v1(p_pseudo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_target_id uuid;
  v_public boolean;
  v_viewer uuid := auth.uid();
begin
  if p_pseudo is null
     or length(trim(p_pseudo)) < 1
     or length(trim(p_pseudo)) > 48 then
    return null;
  end if;

  select p.id, p.profil_public
  into v_target_id, v_public
  from public.profils p
  where lower(p.pseudo) = lower(trim(p_pseudo))
  limit 1;

  if not found or (not v_public and v_viewer is distinct from v_target_id) then
    return null;
  end if;

  return private.clutch_cosmetiques_equipes_v1(v_target_id);
end;
$$;

comment on function public.clutch_acheter_cosmetique_v1(text) is
  'Intentional authenticated SECURITY DEFINER API. It derives the owner from auth.uid(), validates a cosmetic-only catalogue item and performs an atomic Volt debit.';
comment on function public.clutch_equiper_cosmetique_v1(text) is
  'Intentional authenticated SECURITY DEFINER API. It derives the owner from auth.uid() and only equips defaults or owned cosmetics.';
comment on function public.clutch_boutique_cosmetique_v1() is
  'Authenticated cosmetic catalogue, private inventory and Volt balance in one round trip.';
comment on function public.clutch_cosmetiques_profil_v1(text) is
  'Public equipped cosmetics for an existing public profile; private profiles remain hidden.';

revoke all privileges on function public.clutch_boutique_cosmetique_v1()
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_acheter_cosmetique_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_equiper_cosmetique_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_mes_cosmetiques_v1()
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_cosmetiques_profil_v1(text)
from public, anon, authenticated, service_role;

grant execute on function public.clutch_boutique_cosmetique_v1()
to authenticated, service_role;
grant execute on function public.clutch_acheter_cosmetique_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_equiper_cosmetique_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_mes_cosmetiques_v1()
to authenticated, service_role;
grant execute on function public.clutch_cosmetiques_profil_v1(text)
to anon, authenticated, service_role;

-- Fail atomically if the Data API or catalogue contract drifted.
do $$
begin
  if (
    select count(*)
    from public.objets_catalogue o
    where o.actif
      and o.style_key is not null
      and o.emplacement = any(array[
        'cadre_profil', 'titre_profil', 'apparence_core', 'effet_faction', 'carte_profil'
      ]::text[])
  ) <> 20 then
    raise exception 'Cosmetic catalogue must expose exactly 20 active items';
  end if;

  if has_function_privilege('anon', 'public.clutch_boutique_cosmetique_v1()', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_acheter_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_equiper_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_mes_cosmetiques_v1()', 'EXECUTE')
     or not has_function_privilege('anon', 'public.clutch_cosmetiques_profil_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_boutique_cosmetique_v1()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_acheter_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_equiper_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_mes_cosmetiques_v1()', 'EXECUTE')
  then
    raise exception 'Cosmetic RPC privilege contract failed';
  end if;
end;
$$;
