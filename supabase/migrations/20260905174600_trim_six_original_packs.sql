-- Remove the token, share card and profile title from the six original packs.
-- Retired objects remain in the permanent ownership ledger, but are hidden
-- from the cosmetic shop and cannot remain equipped.

begin;

create temporary table clutch_trimmed_original_packs (
  id text primary key,
  description text not null
) on commit drop;

insert into clutch_trimmed_original_packs (id, description) values
  (
    'sang-des-titans',
    'Neuf cosmétiques originaux forgés pour les gardiens d’un pacte titanesque.'
  ),
  (
    'chute-libre',
    'Neuf cosmétiques originaux pour les éclaireurs qui vivent au bord du vide.'
  ),
  (
    'serment-du-givre',
    'Neuf cosmétiques originaux gardés par le dragon des cimes éternelles.'
  ),
  (
    'conclave-arcanique',
    'Neuf cosmétiques originaux où la pierre claire rencontre la magie florale.'
  ),
  (
    'turbo-arena',
    'Neuf cosmétiques originaux pour transformer la Vitrine en arène suralimentée.'
  ),
  (
    'dernier-round',
    'Neuf cosmétiques originaux pour une escouade qui joue chaque round jusqu’au bout.'
  );

create temporary table clutch_retired_original_pack_items (
  pack_id text not null references clutch_trimmed_original_packs(id),
  objet_id text primary key
) on commit drop;

insert into clutch_retired_original_pack_items (pack_id, objet_id) values
  ('sang-des-titans', 'sang-des-titans-tribute-token'),
  ('sang-des-titans', 'sang-des-titans-last-pact-card'),
  ('sang-des-titans', 'sang-des-titans-oath-bearer-title'),
  ('chute-libre', 'chute-libre-survivor-token'),
  ('chute-libre', 'chute-libre-share-card'),
  ('chute-libre', 'chute-libre-untouchable-title'),
  ('serment-du-givre', 'serment-du-givre-cold-breath-token'),
  ('serment-du-givre', 'serment-du-givre-summit-card'),
  ('serment-du-givre', 'serment-du-givre-frost-guard-title'),
  ('conclave-arcanique', 'conclave-arcanique-omen-token'),
  ('conclave-arcanique', 'conclave-arcanique-conclave-card'),
  ('conclave-arcanique', 'conclave-arcanique-spell-weaver-title'),
  ('turbo-arena', 'turbo-arena-vortex-wheel'),
  ('turbo-arena', 'turbo-arena-share-card'),
  ('turbo-arena', 'turbo-arena-last-second-title'),
  ('dernier-round', 'dernier-round-match-point-token'),
  ('dernier-round', 'dernier-round-share-card'),
  ('dernier-round', 'dernier-round-cold-blood-title');

-- A catalogue migration is the sole exception to the post-purchase member
-- immutability guard. The transaction restores the guard before committing.
alter table public.pack_cosmetique_membres
  disable trigger pack_cosmetique_membres_immutabilite_v1;

delete from public.equipement e
using clutch_retired_original_pack_items retired
where e.objet_id = retired.objet_id;

delete from public.pack_cosmetique_membres m
using clutch_retired_original_pack_items retired
where m.pack_id = retired.pack_id
  and m.objet_id = retired.objet_id;

-- The retained objects previously numbered 7 through 10 become 6 through 9.
-- Move through a collision-free temporary range because (pack_id, ordre) is
-- unique.
update public.pack_cosmetique_membres m
set ordre = m.ordre + 20
where m.pack_id in (select p.id from clutch_trimmed_original_packs p)
  and m.ordre between 7 and 10;

update public.pack_cosmetique_membres m
set ordre = m.ordre - 21
where m.pack_id in (select p.id from clutch_trimmed_original_packs p)
  and m.ordre between 27 and 30;

alter table public.pack_cosmetique_membres
  enable trigger pack_cosmetique_membres_immutabilite_v1;

update public.objets_catalogue o
set actif = false,
    statut_publication = 'retire',
    style_key = null
from clutch_retired_original_pack_items retired
where o.id = retired.objet_id;

update public.packs_cosmetiques p
set description = trimmed.description,
    nombre_objets = 9,
    maj_le = pg_catalog.now()
from clutch_trimmed_original_packs trimmed
where p.id = trimmed.id;

-- Keep catalogue reads authenticated and all mutations behind audited RPCs.
revoke all privileges on table public.objets_catalogue
from public, anon, authenticated, service_role;
revoke all privileges on table public.inventaire
from public, anon, authenticated, service_role;
revoke all privileges on table public.equipement
from public, anon, authenticated, service_role;
revoke all privileges on table public.packs_cosmetiques
from public, anon, authenticated, service_role;
revoke all privileges on table public.pack_cosmetique_membres
from public, anon, authenticated, service_role;
revoke all privileges on table public.inventaire_packs_cosmetiques
from public, anon, authenticated, service_role;

grant select on table public.objets_catalogue
to authenticated;
grant select on table public.inventaire
to authenticated;
grant select on table public.equipement
to authenticated;
grant select on table public.packs_cosmetiques
to authenticated;
grant select on table public.pack_cosmetique_membres
to authenticated;
grant select on table public.inventaire_packs_cosmetiques
to authenticated;

grant select, insert, update, delete on table public.objets_catalogue
to service_role;
grant select, insert, update, delete on table public.inventaire
to service_role;
grant select, insert, update, delete on table public.equipement
to service_role;
grant select, insert, update, delete on table public.packs_cosmetiques
to service_role;
grant select, insert, update, delete on table public.pack_cosmetique_membres
to service_role;
grant select, insert, update, delete on table public.inventaire_packs_cosmetiques
to service_role;

revoke all privileges on function public.clutch_boutique_cosmetique_v1()
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_pack_cosmetique_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_acheter_pack_cosmetique_v1(text)
from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_equiper_pack_cosmetique_v1(text)
from public, anon, authenticated, service_role;

grant execute on function public.clutch_boutique_cosmetique_v1()
to authenticated, service_role;
grant execute on function public.clutch_pack_cosmetique_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_acheter_pack_cosmetique_v1(text)
to authenticated, service_role;
grant execute on function public.clutch_equiper_pack_cosmetique_v1(text)
to authenticated, service_role;

do $$
declare
  v_pack_id text;
begin
  for v_pack_id in select id from clutch_trimmed_original_packs loop
    perform private.clutch_assert_pack_cosmetique_acquerable_v1(v_pack_id);

    if not exists (
      select 1
      from public.packs_cosmetiques p
      where p.id = v_pack_id
        and p.prix_volts = 1200
        and p.nombre_objets = 9
        and p.actif
        and p.statut_publication = 'publie'
        and p.marque_key = 'clutch-originals'
        and p.collection_key = v_pack_id
    ) then
      raise exception 'pack original reduit % incoherent', v_pack_id;
    end if;

    if (
      select count(*)
      from public.pack_cosmetique_membres m
      where m.pack_id = v_pack_id
    ) <> 9
       or (
      select count(distinct m.ordre)
      from public.pack_cosmetique_membres m
      where m.pack_id = v_pack_id
        and m.ordre between 1 and 9
    ) <> 9
       or (
      select count(*)
      from public.pack_cosmetique_membres m
      where m.pack_id = v_pack_id
        and m.equip_by_default
    ) <> 6
       or (
      select count(distinct m.emplacement)
      from public.pack_cosmetique_membres m
      where m.pack_id = v_pack_id
        and m.equip_by_default
    ) <> 6
    then
      raise exception 'membres du pack original reduit % incoherents', v_pack_id;
    end if;

    if (
      select count(*)
      from clutch_retired_original_pack_items retired
      join public.objets_catalogue o on o.id = retired.objet_id
      where retired.pack_id = v_pack_id
        and not o.actif
        and o.statut_publication = 'retire'
        and o.style_key is null
    ) <> 3 then
      raise exception 'objets retires du pack original % incoherents', v_pack_id;
    end if;
  end loop;

  if exists (
    select 1
    from public.pack_cosmetique_membres m
    join clutch_retired_original_pack_items retired
      on retired.pack_id = m.pack_id
     and retired.objet_id = m.objet_id
  ) or exists (
    select 1
    from public.equipement e
    join clutch_retired_original_pack_items retired on retired.objet_id = e.objet_id
  ) then
    raise exception 'un objet retire reste membre ou equipe';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger t
    where t.tgrelid = 'public.pack_cosmetique_membres'::regclass
      and t.tgname = 'pack_cosmetique_membres_immutabilite_v1'
      and t.tgenabled = 'O'
      and not t.tgisinternal
  ) then
    raise exception 'garde d immutabilite des membres non restauree';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'objets_catalogue',
        'inventaire',
        'equipement',
        'packs_cosmetiques',
        'pack_cosmetique_membres',
        'inventaire_packs_cosmetiques'
      )
      and c.relrowsecurity
  ) <> 6 then
    raise exception 'RLS du catalogue cosmetique absente ou desactivee';
  end if;

  if has_table_privilege('anon', 'public.objets_catalogue', 'SELECT')
     or has_table_privilege('anon', 'public.packs_cosmetiques', 'SELECT')
     or has_table_privilege('authenticated', 'public.objets_catalogue', 'UPDATE')
     or has_table_privilege('authenticated', 'public.equipement', 'DELETE')
     or has_table_privilege('authenticated', 'public.pack_cosmetique_membres', 'UPDATE')
     or not has_table_privilege('authenticated', 'public.objets_catalogue', 'SELECT')
     or not has_table_privilege('authenticated', 'public.inventaire', 'SELECT')
     or not has_table_privilege('authenticated', 'public.equipement', 'SELECT')
     or not has_table_privilege('authenticated', 'public.packs_cosmetiques', 'SELECT')
     or not has_table_privilege('authenticated', 'public.pack_cosmetique_membres', 'SELECT')
     or not has_table_privilege('authenticated', 'public.inventaire_packs_cosmetiques', 'SELECT')
     or has_function_privilege('anon', 'public.clutch_boutique_cosmetique_v1()', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_pack_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_acheter_pack_cosmetique_v1(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_equiper_pack_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_boutique_cosmetique_v1()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_pack_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_acheter_pack_cosmetique_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_equiper_pack_cosmetique_v1(text)', 'EXECUTE')
  then
    raise exception 'privileges du catalogue cosmetique incoherents';
  end if;
end;
$$;

commit;
