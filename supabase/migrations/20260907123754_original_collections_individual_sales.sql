-- Replace three bundles with individually purchasable cosmetics.
-- Preserve ownership and transaction history; retire only their removed items.
begin;

create temporary table clutch_individual_collections (id text primary key) on commit drop;
insert into clutch_individual_collections values ('circuit-zero'), ('mythes-forge'), ('neon-protocol');
create temporary table clutch_removed_collection_items (id text primary key) on commit drop;
insert into clutch_removed_collection_items values
  ('neon-protocol-syn-token'),
  ('neon-protocol-share-card'),
  ('neon-protocol-architect-title'),
  ('mythes-forge-telluric-token'),
  ('mythes-forge-share-card'),
  ('mythes-forge-master-smith-title'),
  ('circuit-zero-chrono-token'),
  ('circuit-zero-share-card'),
  ('circuit-zero-chrononaut-title');

update public.packs_cosmetiques
set actif = false, statut_publication = 'retire', nombre_objets = 9,
    description = 'Collection disponible uniquement objet par objet dans la boutique.',
    maj_le = pg_catalog.now()
where id in (select id from clutch_individual_collections);

-- Controlled catalogue edit; the purchase immutability guard is restored in this transaction.
alter table public.pack_cosmetique_membres disable trigger pack_cosmetique_membres_immutabilite_v1;
delete from public.equipement where objet_id in (select id from clutch_removed_collection_items);
delete from public.pack_cosmetique_membres
where pack_id in (select id from clutch_individual_collections)
  and objet_id in (select id from clutch_removed_collection_items);
update public.pack_cosmetique_membres set ordre = ordre + 20
where pack_id in (select id from clutch_individual_collections) and ordre between 7 and 10;
update public.pack_cosmetique_membres set ordre = ordre - 21
where pack_id in (select id from clutch_individual_collections) and ordre between 27 and 30;

update public.objets_catalogue
set actif = false, statut_publication = 'retire', style_key = null
where id in (select id from clutch_removed_collection_items);
update public.objets_catalogue
set source = 'achat', prix = case rarete when 'legendaire' then 300 when 'epique' then 200 else 100 end,
    actif = true, statut_publication = 'publie', est_inclus = false
where collection_key in (select id from clutch_individual_collections)
  and id not in (select id from clutch_removed_collection_items);

set constraints all immediate;
alter table public.pack_cosmetique_membres enable trigger pack_cosmetique_membres_immutabilite_v1;

-- Preserve authenticated read-only Data API access and RLS; purchases use the existing RPC.
alter table public.objets_catalogue enable row level security;
revoke all privileges on table public.objets_catalogue from public, anon, authenticated, service_role;
grant select on table public.objets_catalogue to authenticated;
grant select, insert, update, delete on table public.objets_catalogue to service_role;
alter table public.inventaire enable row level security;
revoke all privileges on table public.inventaire from public, anon, authenticated, service_role;
grant select on table public.inventaire to authenticated;
grant select, insert, update, delete on table public.inventaire to service_role;
alter table public.equipement enable row level security;
revoke all privileges on table public.equipement from public, anon, authenticated, service_role;
grant select on table public.equipement to authenticated;
grant select, insert, update, delete on table public.equipement to service_role;
alter table public.packs_cosmetiques enable row level security;
revoke all privileges on table public.packs_cosmetiques from public, anon, authenticated, service_role;
grant select on table public.packs_cosmetiques to authenticated;
grant select, insert, update, delete on table public.packs_cosmetiques to service_role;
alter table public.pack_cosmetique_membres enable row level security;
revoke all privileges on table public.pack_cosmetique_membres from public, anon, authenticated, service_role;
grant select on table public.pack_cosmetique_membres to authenticated;
grant select, insert, update, delete on table public.pack_cosmetique_membres to service_role;
alter table public.inventaire_packs_cosmetiques enable row level security;
revoke all privileges on table public.inventaire_packs_cosmetiques from public, anon, authenticated, service_role;
grant select on table public.inventaire_packs_cosmetiques to authenticated;
grant select, insert, update, delete on table public.inventaire_packs_cosmetiques to service_role;
revoke all privileges on function public.clutch_boutique_cosmetique_v1() from public, anon, authenticated, service_role;
grant execute on function public.clutch_boutique_cosmetique_v1() to authenticated, service_role;
revoke all privileges on function public.clutch_acheter_cosmetique_v1(text) from public, anon, authenticated, service_role;
grant execute on function public.clutch_acheter_cosmetique_v1(text) to authenticated, service_role;
revoke all privileges on function public.clutch_equiper_cosmetique_v1(text) from public, anon, authenticated, service_role;
grant execute on function public.clutch_equiper_cosmetique_v1(text) to authenticated, service_role;
revoke all privileges on function public.clutch_pack_cosmetique_v1(text) from public, anon, authenticated, service_role;
grant execute on function public.clutch_pack_cosmetique_v1(text) to authenticated, service_role;
revoke all privileges on function public.clutch_acheter_pack_cosmetique_v1(text) from public, anon, authenticated, service_role;
grant execute on function public.clutch_acheter_pack_cosmetique_v1(text) to authenticated, service_role;
revoke all privileges on function public.clutch_equiper_pack_cosmetique_v1(text) from public, anon, authenticated, service_role;
grant execute on function public.clutch_equiper_pack_cosmetique_v1(text) to authenticated, service_role;

do $$
declare v_collection text; v_item text;
begin
  for v_collection in select id from clutch_individual_collections loop
    if (select count(*) from public.objets_catalogue where collection_key = v_collection and actif and source = 'achat') <> 9 then
      raise exception 'Expected nine individual objects for %', v_collection;
    end if;
    for v_item in select id from public.objets_catalogue where collection_key = v_collection and actif loop
      perform private.clutch_assert_objet_acquerable_v2(v_item);
    end loop;
  end loop;
end;
$$;
commit;
