-- Phase 8 hardening: stronger capability tokens and FK indexes.

alter table public.defis_match
  alter column token set default replace(gen_random_uuid()::text, '-', '');

create index if not exists defis_match_createur_pronostic_idx
  on public.defis_match(createur_pronostic_id);

create index if not exists defis_match_accepteur_pronostic_idx
  on public.defis_match(accepteur_pronostic_id)
  where accepteur_pronostic_id is not null;

create or replace function public.clutch_creer_defi_match(p_match_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moi uuid := auth.uid();
  v_prono public.pronostics_classes%rowtype;
  v_match public.matchs%rowtype;
  v_defi public.defis_match%rowtype;
  v_attente integer;
begin
  if v_moi is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select * into v_match from public.matchs where id = p_match_id;
  if not found then raise exception 'match introuvable' using errcode = 'P0002'; end if;
  if v_match.statut <> 'a_venir' or v_match.debut <= now() then
    raise exception 'ce match ne peut plus etre defie' using errcode = 'P0001';
  end if;

  select * into v_prono
  from public.pronostics_classes
  where user_id = v_moi and match_id = p_match_id and statut = 'en_cours'
  limit 1;
  if not found then
    raise exception 'verrouille d abord ton pronostic sur ce match' using errcode = 'P0001';
  end if;

  select * into v_defi
  from public.defis_match
  where createur_id = v_moi and match_id = p_match_id
  for update;

  if found then
    if v_defi.statut = 'annule' then
      update public.defis_match
      set token = replace(gen_random_uuid()::text, '-', ''),
          createur_pronostic_id = v_prono.id,
          saison_id = v_prono.saison_id,
          accepteur_id = null,
          accepteur_pronostic_id = null,
          statut = 'en_attente',
          cree_le = now(),
          accepte_le = null,
          termine_le = null,
          annule_le = null
      where id = v_defi.id
      returning * into v_defi;
    end if;

    return jsonb_build_object(
      'id', v_defi.id,
      'token', v_defi.token,
      'statut', v_defi.statut,
      'match_id', v_defi.match_id
    );
  end if;

  select count(*) into v_attente
  from public.defis_match
  where createur_id = v_moi and statut = 'en_attente';
  if v_attente >= 10 then
    raise exception 'trop de defis en attente' using errcode = 'P0001';
  end if;

  insert into public.defis_match(match_id, saison_id, createur_id, createur_pronostic_id)
  values (p_match_id, v_prono.saison_id, v_moi, v_prono.id)
  returning * into v_defi;

  return jsonb_build_object(
    'id', v_defi.id,
    'token', v_defi.token,
    'statut', v_defi.statut,
    'match_id', v_defi.match_id
  );
end;
$$;
