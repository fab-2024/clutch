-- Permanent cosmetic packs sold through Apple/Google. Existing Volt owners keep their rights.
begin;
alter table public.packs_cosmetiques add column produit_store_id text unique,
  add column prix_cible_eur_centimes integer check (prix_cible_eur_centimes > 0);
update public.packs_cosmetiques set
  produit_store_id = 'clutch_pack_' || replace(id, '-', '_') || '_v1', prix_cible_eur_centimes = 299
where id in ('sang-des-titans','chute-libre','serment-du-givre','conclave-arcanique','turbo-arena','dernier-round');
comment on column public.packs_cosmetiques.prix_volts is 'Historical Volt price. New pack purchases require a validated store receipt.';
comment on table public.packs_cosmetiques is 'Permanent cosmetic packs. New purchases use native non-consumable IAP; store-localized prices are authoritative.';

create table private.achats_packs_store (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profils(id) on delete cascade,
  pack_id text not null references public.packs_cosmetiques(id),
  produit_id text not null,
  store text not null check(store in ('app_store','play_store','test_store')),
  environnement text not null check(environnement in ('sandbox','production')),
  transaction_id text not null check(length(transaction_id) between 1 and 256),
  actif boolean not null,
  achete_le timestamptz not null,
  verifie_le timestamptz not null,
  unique(store,environnement,transaction_id)
);
create index achats_packs_store_user_pack_idx on private.achats_packs_store(user_id,pack_id);
create index achats_packs_store_pack_idx on private.achats_packs_store(pack_id);
create table private.sync_packs_store (
  user_id uuid primary key references public.profils(id) on delete cascade,
  verifie_le timestamptz not null
);
-- Track only inventory rows created by IAP, preserving pre-existing rewards and legacy purchases.
create table private.objets_packs_store (
  user_id uuid not null references public.profils(id) on delete cascade,
  pack_id text not null references public.packs_cosmetiques(id),
  objet_id text not null references public.objets_catalogue(id),
  primary key(user_id,pack_id,objet_id)
);
create index objets_packs_store_pack_idx on private.objets_packs_store(pack_id);
create index objets_packs_store_objet_idx on private.objets_packs_store(objet_id);
alter table private.achats_packs_store enable row level security;
alter table private.sync_packs_store enable row level security;
alter table private.objets_packs_store enable row level security;
revoke all on private.achats_packs_store, private.sync_packs_store, private.objets_packs_store from public,anon,authenticated,service_role;

alter table public.inventaire_packs_cosmetiques alter column mouvement_id drop not null,
  add column achat_store_id uuid references private.achats_packs_store(id),
  drop constraint inventaire_packs_cosmetiques_prix_check,
  add constraint inventaire_packs_cosmetiques_prix_check check (
    (mouvement_id is not null and achat_store_id is null and prix_paye_volts > 0)
    or (mouvement_id is null and achat_store_id is not null and prix_paye_volts = 0)
  );
create index inventaire_packs_cosmetiques_store_idx on public.inventaire_packs_cosmetiques(achat_store_id);

create or replace function private.clutch_valider_droit_pack_cosmetique_v1()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.achat_store_id is not null then
    if not exists(select 1 from private.achats_packs_store a join public.packs_cosmetiques p on p.id=a.pack_id
      where a.id=new.achat_store_id and a.user_id=new.user_id and a.pack_id=new.pack_id
        and a.actif and a.produit_id=p.produit_store_id and new.mouvement_id is null and new.prix_paye_volts=0) then
      raise exception 'droit pack sans achat store valide' using errcode='23514';
    end if;
  elsif not exists(select 1 from public.volts_mouvements m where m.id=new.mouvement_id
    and m.user_id=new.user_id and m.pack_id=new.pack_id and m.reference=new.pack_id
    and m.origine='achat_pack' and m.source_economique='achat_pack_cosmetique' and m.montant=-new.prix_paye_volts) then
    raise exception 'droit pack sans debit Volt compatible' using errcode='23514';
  end if;
  return new;
end; $$;
revoke all on function private.clutch_valider_droit_pack_cosmetique_v1() from public,anon,authenticated,service_role;

-- Old clients cannot bypass the store by calling the old Volt purchase RPC.
create or replace function public.clutch_acheter_pack_cosmetique_v1(p_pack_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_pack_id text := btrim(p_pack_id);
  v_pack public.packs_cosmetiques%rowtype;
  v_mouvement_id uuid;
  v_solde integer;
  v_achete boolean := false;
  v_objets_attribues integer;
  v_defaults integer;
  v_nombre_equipes integer;
begin
  if exists(select 1 from public.packs_cosmetiques where id=btrim(p_pack_id) and produit_store_id is not null) then
    raise exception 'Ce pack nécessite un achat intégré dans la dernière version de l’application.' using errcode='0A000';
  end if;
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'profil requis' using errcode = 'P0002';
  end if;

  -- Lock the editorial catalogue first, then materialize and row-lock the
  -- exact pack/member snapshot used by debit, grants and equipment.
  perform private.clutch_verrouiller_catalogue_packs_v1(false);

  select p.*
  into v_pack
  from public.packs_cosmetiques p
  where p.id = v_pack_id
  for share;

  if not found then
    raise exception 'pack cosmetique introuvable : %', p_pack_id
      using errcode = 'P0002';
  end if;

  perform 1
  from public.pack_cosmetique_membres m
  where m.pack_id = v_pack.id
  order by m.ordre
  for share;

  -- The per-user lock follows the catalogue lock everywhere.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clutch-cosmetic:' || v_user::text, 0)
  );

  select i.mouvement_id
  into v_mouvement_id
  from public.inventaire_packs_cosmetiques i
  where i.user_id = v_user
    and i.pack_id = v_pack.id;

  if v_mouvement_id is null then
    perform private.clutch_assert_pack_cosmetique_acquerable_v1(v_pack.id);

    select coalesce(sum(m.montant), 0)::integer
    into v_solde
    from public.volts_mouvements m
    where m.user_id = v_user;

    if v_solde < v_pack.prix_volts then
      raise exception 'solde insuffisant : % Volts requis, % disponibles',
        v_pack.prix_volts,
        v_solde
        using errcode = 'P0001';
    end if;

    insert into public.volts_mouvements (
      user_id,
      montant,
      origine,
      reference,
      pack_id,
      cle_idempotence,
      metadata
    ) values (
      v_user,
      -v_pack.prix_volts,
      'achat_pack',
      v_pack.id,
      v_pack.id,
      'achat_pack:' || v_pack.id,
      jsonb_build_object(
        'nombre_objets', v_pack.nombre_objets,
        'collection_key', v_pack.collection_key
      )
    )
    returning id into v_mouvement_id;

    insert into public.inventaire_packs_cosmetiques (
      user_id,
      pack_id,
      mouvement_id,
      prix_paye_volts
    ) values (
      v_user,
      v_pack.id,
      v_mouvement_id,
      v_pack.prix_volts
    );

    v_achete := true;
  end if;

  -- Repeating a completed purchase is a no-charge repair operation. It makes
  -- ownership resilient to a previously interrupted administrative backfill
  -- without ever creating another debit.
  insert into public.inventaire (user_id, objet_id)
  select v_user, m.objet_id
  from public.pack_cosmetique_membres m
  where m.pack_id = v_pack.id
  on conflict (user_id, objet_id) do nothing;

  select count(*)::integer
  into v_objets_attribues
  from public.inventaire i
  join public.pack_cosmetique_membres m
    on m.pack_id = v_pack.id
   and m.objet_id = i.objet_id
  where i.user_id = v_user;

  if v_objets_attribues <> v_pack.nombre_objets then
    raise exception 'attribution du pack incomplete : %/%',
      v_objets_attribues,
      v_pack.nombre_objets
      using errcode = '23514';
  end if;

  select count(*)::integer
  into v_defaults
  from public.pack_cosmetique_membres m
  where m.pack_id = v_pack.id
    and m.equip_by_default;

  -- Unlock and equip are one transaction. Any slot/FK failure rolls the debit,
  -- entitlement and all inventory rows back with this statement.
  insert into public.equipement (user_id, emplacement, objet_id)
  select v_user, m.emplacement, m.objet_id
  from public.pack_cosmetique_membres m
  where m.pack_id = v_pack.id
    and m.equip_by_default
  order by m.ordre
  on conflict (user_id, emplacement) do update
  set objet_id = excluded.objet_id,
      maj_le = pg_catalog.now();

  get diagnostics v_nombre_equipes = row_count;

  if v_nombre_equipes <> v_defaults or v_nombre_equipes = 0 then
    raise exception 'equipement par defaut du pack incomplet : %/%',
      v_nombre_equipes,
      v_defaults
      using errcode = '23514';
  end if;

  select coalesce(sum(m.montant), 0)::integer
  into v_solde
  from public.volts_mouvements m
  where m.user_id = v_user;

  return jsonb_build_object(
    'pack_id', v_pack.id,
    'prix_pack', v_pack.prix_volts,
    'prix', case when v_achete then v_pack.prix_volts else 0 end,
    'solde', v_solde,
    'achete', v_achete,
    'possede', true,
    'nombre_objets', v_pack.nombre_objets,
    'objets_attribues', v_objets_attribues,
    'equipables_par_defaut', v_defaults,
    'nombre_equipes', v_nombre_equipes,
    'equipe', true,
    'contrat_version', (
      public.clutch_contrat_monetisation_v1() ->> 'version'
    )::integer
  );
end;
$$;

revoke all on function public.clutch_acheter_pack_cosmetique_v1(text) from public,anon,authenticated,service_role;
grant execute on function public.clutch_acheter_pack_cosmetique_v1(text) to authenticated, service_role;

create or replace function public.clutch_synchroniser_packs_store_v1(p_user uuid,p_verifie_le timestamptz,p_preuves jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  r jsonb;
  p public.packs_cosmetiques%rowtype;
  a private.achats_packs_store%rowtype;
  v_id uuid;
  v_actif boolean;
  v_nombre integer;
  v_legacy boolean;
begin
  if p_user is null or p_verifie_le is null or p_verifie_le > now()+interval '5 minutes'
    or jsonb_typeof(p_preuves) is distinct from 'array' or jsonb_array_length(p_preuves)<>6 then
    raise exception 'preuve store invalide' using errcode='22023';
  end if;
  if (select count(distinct x->>'pack_id') from jsonb_array_elements(p_preuves) x)<>6 then
    raise exception 'packs dupliques' using errcode='22023';
  end if;
  perform private.clutch_verrouiller_catalogue_packs_v1(false);
  -- Serializes receipt ownership across accounts, then follows existing cosmetic lock order.
  perform pg_advisory_xact_lock(hashtextextended('clutch-pack-iap:v1',0));
  perform pg_advisory_xact_lock(hashtextextended('clutch-cosmetic:'||p_user::text,0));
  if exists(select 1 from private.sync_packs_store where user_id=p_user and verifie_le>=p_verifie_le) then
    return jsonb_build_object('ok',true,'obsolete',true);
  end if;
  for r in select value from jsonb_array_elements(p_preuves) loop
    select * into p from public.packs_cosmetiques where id=r->>'pack_id' and produit_store_id is not null;
    if not found or p.produit_store_id is distinct from r->>'product_id' or jsonb_typeof(r->'active') is distinct from 'boolean' then
      raise exception 'produit store inconnu' using errcode='22023';
    end if;
    v_actif := (r->>'active')::boolean;
    select exists(select 1 from public.inventaire_packs_cosmetiques where user_id=p_user and pack_id=p.id and mouvement_id is not null) into v_legacy;
    if v_actif then
      if coalesce(r->>'transaction_id','')='' or r->>'purchased_at' is null then
        raise exception 'transaction store absente' using errcode='22023';
      end if;
      select * into a from private.achats_packs_store where store=r->>'store' and environnement=r->>'environment'
        and transaction_id=r->>'transaction_id';
      if found and (a.pack_id<>p.id or (a.user_id<>p_user and a.actif)) then
        raise exception 'achat deja associe a un autre compte ou produit' using errcode='23514';
      end if;
      update private.achats_packs_store set actif=false,verifie_le=p_verifie_le where user_id=p_user and pack_id=p.id;
      insert into private.achats_packs_store(user_id,pack_id,produit_id,store,environnement,transaction_id,actif,achete_le,verifie_le)
      values(p_user,p.id,p.produit_store_id,r->>'store',r->>'environment',r->>'transaction_id',true,(r->>'purchased_at')::timestamptz,p_verifie_le)
      on conflict(store,environnement,transaction_id) do update set user_id=excluded.user_id,actif=true,verifie_le=excluded.verifie_le
      returning id into v_id;
      if not v_legacy then
        insert into public.inventaire_packs_cosmetiques(user_id,pack_id,mouvement_id,prix_paye_volts,achat_store_id)
        values(p_user,p.id,null,0,v_id)
        on conflict(user_id,pack_id) do update set achat_store_id=excluded.achat_store_id;
      end if;
      with ajoutes as (
        insert into public.inventaire(user_id,objet_id)
        select p_user,m.objet_id from public.pack_cosmetique_membres m where m.pack_id=p.id
        on conflict(user_id,objet_id) do nothing returning objet_id
      ) insert into private.objets_packs_store select p_user,p.id,objet_id from ajoutes on conflict do nothing;
      select count(*) into v_nombre from public.inventaire i join public.pack_cosmetique_membres m on m.objet_id=i.objet_id
        where i.user_id=p_user and m.pack_id=p.id;
      if v_nombre<>p.nombre_objets then raise exception 'attribution pack incomplete' using errcode='23514'; end if;
    else
      update private.achats_packs_store set actif=false,verifie_le=p_verifie_le where user_id=p_user and pack_id=p.id;
      if not v_legacy then
        delete from public.equipement e using private.objets_packs_store o
          where o.user_id=p_user and o.pack_id=p.id and e.user_id=o.user_id and e.objet_id=o.objet_id;
        delete from public.inventaire i using private.objets_packs_store o
          where o.user_id=p_user and o.pack_id=p.id and i.user_id=o.user_id and i.objet_id=o.objet_id;
        delete from public.inventaire_packs_cosmetiques where user_id=p_user and pack_id=p.id and achat_store_id is not null;
        delete from private.objets_packs_store where user_id=p_user and pack_id=p.id;
      end if;
    end if;
  end loop;
  insert into private.sync_packs_store values(p_user,p_verifie_le) on conflict(user_id) do update set verifie_le=excluded.verifie_le;
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.clutch_synchroniser_packs_store_v1(uuid,timestamptz,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.clutch_synchroniser_packs_store_v1(uuid,timestamptz,jsonb) to service_role;
comment on function public.clutch_synchroniser_packs_store_v1(uuid,timestamptz,jsonb) is
  'Service-only reconciliation of all six native packs after RevenueCat verification. No Volt movement; legacy ownership preserved.';
create or replace function public.clutch_pack_cosmetique_v1(p_pack_id text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_pack_id text := btrim(p_pack_id);
  v_pack public.packs_cosmetiques%rowtype;
  v_possede boolean;
  v_solde integer;
  v_objets jsonb;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if not exists (select 1 from public.profils p where p.id = v_user) then
    raise exception 'profil requis' using errcode = 'P0002';
  end if;

  select p.*
  into v_pack
  from public.packs_cosmetiques p
  where p.id = v_pack_id;

  if not found then
    raise exception 'pack cosmetique introuvable : %', p_pack_id
      using errcode = 'P0002';
  end if;

  select exists (
    select 1
    from public.inventaire_packs_cosmetiques i
    where i.user_id = v_user
      and i.pack_id = v_pack.id
  ) into v_possede;

  if not v_possede and (
    not v_pack.actif
    or v_pack.statut_publication <> 'publie'
    or (v_pack.disponible_du is not null and v_pack.disponible_du > pg_catalog.now())
    or (v_pack.disponible_au is not null and v_pack.disponible_au <= pg_catalog.now())
  ) then
    raise exception 'pack cosmetique indisponible : %', p_pack_id
      using errcode = 'P0002';
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
        'famille', o.famille,
        'ordre', m.ordre,
        'nom', o.nom,
        'description', o.description,
        'rarete', o.rarete,
        'style_key', o.style_key,
        'accent', o.accent,
        'equip_by_default', m.equip_by_default,
        'possede', i.objet_id is not null,
        'equipe', e.objet_id = o.id
      )
      order by m.ordre
    ),
    '[]'::jsonb
  )
  into v_objets
  from public.pack_cosmetique_membres m
  join public.objets_catalogue o
    on o.id = m.objet_id
   and o.emplacement = m.emplacement
  left join public.inventaire i
    on i.user_id = v_user
   and i.objet_id = m.objet_id
  left join public.equipement e
    on e.user_id = v_user
   and e.emplacement = m.emplacement
  where m.pack_id = v_pack.id;

  return jsonb_build_object(
    'version', 1,
    'id', v_pack.id,
    'nom', v_pack.nom,
    'description', v_pack.description,
    'prix_volts', case when v_pack.produit_store_id is null then v_pack.prix_volts else null end,
    'produit_store_id', v_pack.produit_store_id,
    'prix_cible_eur_centimes', v_pack.prix_cible_eur_centimes,
    'nombre_objets', v_pack.nombre_objets,
    'accent', v_pack.accent,
    'marque_key', v_pack.marque_key,
    'collection_key', v_pack.collection_key,
    'statut_publication', v_pack.statut_publication,
    'possede', v_possede,
    'solde', v_solde,
    'achetable', not v_possede and v_pack.produit_store_id is null and v_solde >= v_pack.prix_volts,
    'achat_store_requis', v_pack.produit_store_id is not null,
    'objets', v_objets,
    'contrat_version', (
      public.clutch_contrat_monetisation_v1() ->> 'version'
    )::integer
  );
end;
$$;


revoke all on function public.clutch_pack_cosmetique_v1(text) from public,anon,authenticated,service_role;
grant execute on function public.clutch_pack_cosmetique_v1(text) to authenticated,service_role;
commit;
