-- Do not count the first inactive store synchronization of an account without
-- a purchase as a Founder Pack revocation. The reducer remains server-only and
-- idempotent.

create or replace function public.clutch_appliquer_statut_founder_pack_v1(
  p_user uuid,
  p_evenement_id text,
  p_type_evenement text,
  p_actif boolean,
  p_transaction_id text,
  p_transaction_originale_id text,
  p_store text,
  p_environnement text,
  p_achete_le timestamptz,
  p_source text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id text := btrim(coalesce(p_evenement_id, ''));
  v_event_type text := upper(btrim(coalesce(p_type_evenement, 'SYNC')));
  v_transaction text := nullif(btrim(coalesce(p_transaction_id, '')), '');
  v_original_transaction text := nullif(
    btrim(coalesce(p_transaction_originale_id, p_transaction_id, '')),
    ''
  );
  v_store text := lower(btrim(coalesce(p_store, '')));
  v_environment text := lower(btrim(coalesce(p_environnement, '')));
  v_source text := lower(btrim(coalesce(p_source, '')));
  v_status text;
  v_event_rows integer := 0;
  v_pack_active boolean;
begin
  if p_user is null or not exists (
    select 1 from public.profils p where p.id = p_user
  ) then
    raise exception 'profil Founder Pack invalide' using errcode = 'P0002';
  end if;

  if v_event_id !~ '^[A-Za-z0-9][A-Za-z0-9:._-]{0,255}$'
     or v_event_type !~ '^[A-Z][A-Z0-9_]{1,63}$'
     or v_source not in ('sync', 'webhook')
  then
    raise exception 'evenement Founder Pack invalide' using errcode = '22023';
  end if;

  if p_actif and (
    v_transaction is null
    or v_original_transaction is null
    or v_store not in ('app_store', 'play_store', 'test_store')
    or v_environment not in ('sandbox', 'production')
    or p_achete_le is null
  ) then
    raise exception 'preuve d achat Founder Pack incomplete' using errcode = '22023';
  end if;

  if not p_actif then
    v_store := case
      when v_store in ('app_store', 'play_store', 'test_store') then v_store
      else 'test_store'
    end;
    v_environment := case
      when v_environment in ('sandbox', 'production') then v_environment
      else 'sandbox'
    end;
  end if;

  -- Phase 5 is deliberately low volume. One short global reducer lock avoids
  -- races during refunds/transfers without holding a lock during store I/O.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clutch-founder-pack-v1', 0)
  );

  -- Check idempotency only after acquiring the lock. Two simultaneous webhook
  -- retries can therefore never execute the reducer body twice.
  if exists (
    select 1
    from private.evenements_founder_pack e
    where e.fournisseur = 'revenuecat'
      and e.evenement_id = v_event_id
  ) then
    return public.clutch_statut_founder_pack_v1(p_user);
  end if;

  if p_actif then
    update private.achats_founder_pack a
    set statut = 'revoked',
        statut_maj_le = pg_catalog.now()
    where a.user_id = p_user
      and a.produit_id = 'clutch_founder_pack_v1'
      and a.statut = 'active'
      and (a.store, a.transaction_id) <> (v_store, v_transaction);

    insert into private.achats_founder_pack (
      user_id,
      fournisseur,
      produit_id,
      droit_id,
      store,
      environnement,
      transaction_id,
      transaction_originale_id,
      statut,
      achete_le,
      statut_maj_le
    ) values (
      p_user,
      'revenuecat',
      'clutch_founder_pack_v1',
      'founder_pack',
      v_store,
      v_environment,
      v_transaction,
      v_original_transaction,
      'active',
      p_achete_le,
      pg_catalog.now()
    )
    on conflict (fournisseur, store, transaction_id) do update
    set user_id = excluded.user_id,
        produit_id = excluded.produit_id,
        droit_id = excluded.droit_id,
        environnement = excluded.environnement,
        transaction_originale_id = excluded.transaction_originale_id,
        statut = 'active',
        achete_le = excluded.achete_le,
        statut_maj_le = pg_catalog.now();

    insert into public.inventaire (user_id, objet_id)
    select p_user, o.id
    from public.objets_catalogue o
    where o.source = 'founder_pack'
      and o.collection_key = 'founder-origin'
      and o.statut_publication = 'publie'
    on conflict (user_id, objet_id) do nothing;

    update public.profils
    set est_fondateur = true
    where id = p_user;

    v_status := 'active';
  else
    v_status := case
      when v_event_type = 'CANCELLATION' then 'refunded'
      when v_event_type = 'TRANSFER' then 'transferred'
      else 'revoked'
    end;

    update private.achats_founder_pack a
    set statut = v_status,
        statut_maj_le = pg_catalog.now()
    where a.user_id = p_user
      and a.produit_id = 'clutch_founder_pack_v1'
      and a.statut = 'active'
      and (v_transaction is null or a.transaction_id = v_transaction);

    select exists (
      select 1
      from private.achats_founder_pack a
      where a.user_id = p_user
        and a.produit_id = 'clutch_founder_pack_v1'
        and a.statut = 'active'
    ) into v_pack_active;

    if not v_pack_active then
      delete from public.equipement e
      using public.objets_catalogue o
      where e.user_id = p_user
        and e.objet_id = o.id
        and o.source = 'founder_pack'
        and o.collection_key = 'founder-origin';

      delete from public.inventaire i
      using public.objets_catalogue o
      where i.user_id = p_user
        and i.objet_id = o.id
        and o.source = 'founder_pack'
        and o.collection_key = 'founder-origin';

      update public.profils p
      set est_fondateur = exists (
        select 1
        from private.fondateurs_heritage h
        where h.user_id = p.id
      )
      where p.id = p_user;
    end if;
  end if;

  insert into private.evenements_founder_pack (
    fournisseur,
    evenement_id,
    user_id,
    type_evenement,
    source_evenement,
    produit_id,
    transaction_id,
    droit_actif
  ) values (
    'revenuecat',
    v_event_id,
    p_user,
    v_event_type,
    v_source,
    'clutch_founder_pack_v1',
    v_transaction,
    p_actif
  )
  on conflict (fournisseur, evenement_id) do nothing;

  get diagnostics v_event_rows = row_count;

  if v_event_rows = 1 and (p_actif or v_transaction is not null) then
    perform private.clutch_journaliser_evenement_analytics_v1(
      p_user,
      case when p_actif then 'founder_pack_attribue' else 'founder_pack_revoque' end,
      null,
      null,
      null,
      'serveur',
      'founder-pack:' || v_event_id
    );
  end if;

  return public.clutch_statut_founder_pack_v1(p_user);
end;
$$;

revoke all privileges on function public.clutch_appliquer_statut_founder_pack_v1(
  uuid, text, text, boolean, text, text, text, text, timestamptz, text
) from public, anon, authenticated, service_role;
grant execute on function public.clutch_appliquer_statut_founder_pack_v1(
  uuid, text, text, boolean, text, text, text, text, timestamptz, text
) to service_role;

do $$
begin
  if has_function_privilege(
    'authenticated',
    'public.clutch_appliquer_statut_founder_pack_v1(uuid,text,text,boolean,text,text,text,text,timestamp with time zone,text)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.clutch_appliquer_statut_founder_pack_v1(uuid,text,text,boolean,text,text,text,text,timestamp with time zone,text)',
    'EXECUTE'
  ) then
    raise exception 'Founder Pack reducer privileges are inconsistent';
  end if;
end;
$$;
