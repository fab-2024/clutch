-- Retire the pedestal object from every original collection offered in the shop.
-- Scene artwork/layouts and permanent ownership records are retained.
begin;
create temporary table clutch_retired_pedestals (
  pack_id text primary key,
  objet_id text unique not null
) on commit drop;
insert into clutch_retired_pedestals values
  ('sang-des-titans', 'sang-des-titans-monolith-pedestal'),
  ('chute-libre', 'chute-libre-drop-pedestal'),
  ('serment-du-givre', 'serment-du-givre-ice-sheet-pedestal'),
  ('conclave-arcanique', 'conclave-arcanique-rosette-pedestal'),
  ('turbo-arena', 'turbo-arena-kickoff-pedestal'),
  ('dernier-round', 'dernier-round-extraction-pedestal'),
  ('circuit-zero', 'circuit-zero-aero-pedestals'),
  ('mythes-forge', 'mythes-forge-magma-pedestals'),
  ('neon-protocol', 'neon-protocol-vector-pedestals');

alter table public.pack_cosmetique_membres disable trigger pack_cosmetique_membres_immutabilite_v1;
delete from public.equipement where objet_id in (select objet_id from clutch_retired_pedestals);
delete from public.pack_cosmetique_membres
where objet_id in (select objet_id from clutch_retired_pedestals);

-- The pedestal was fifth. Shift retained positions through a collision-free range.
update public.pack_cosmetique_membres set ordre = ordre + 20
where pack_id in (select pack_id from clutch_retired_pedestals) and ordre between 6 and 9;
update public.pack_cosmetique_membres set ordre = ordre - 21
where pack_id in (select pack_id from clutch_retired_pedestals) and ordre between 26 and 29;
update public.objets_catalogue
set actif = false, statut_publication = 'retire', style_key = null
where id in (select objet_id from clutch_retired_pedestals);
update public.packs_cosmetiques
set nombre_objets = 8,
    description = replace(description, 'Neuf cosmétiques', 'Huit cosmétiques'),
    maj_le = pg_catalog.now()
where id in (select pack_id from clutch_retired_pedestals);
set constraints all immediate;
alter table public.pack_cosmetique_membres enable trigger pack_cosmetique_membres_immutabilite_v1;

-- Existing RLS policies and authenticated read-only Data API access remain explicit.
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
declare v_pack record;
begin
  for v_pack in select p.* from public.packs_cosmetiques p join clutch_retired_pedestals r on r.pack_id = p.id loop
    if (select count(*) from public.pack_cosmetique_membres where pack_id = v_pack.id) <> 8
       or exists (select 1 from public.pack_cosmetique_membres where pack_id = v_pack.id and emplacement = 'vitrine_supports') then
      raise exception 'Pedestal retirement failed for %', v_pack.id;
    end if;
    if v_pack.actif and v_pack.statut_publication = 'publie' then
      perform private.clutch_assert_pack_cosmetique_acquerable_v1(v_pack.id);
    end if;
  end loop;
end;
$$;
commit;
