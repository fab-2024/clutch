-- Auth recovery for legacy or partially-created accounts. The function can
-- only recreate the caller's own profile and remains inaccessible to anon.

create or replace function public.clutch_assurer_mon_profil_v1()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_metadata jsonb;
  v_base_pseudo text;
  v_pseudo text;
begin
  if v_user_id is null then
    raise exception 'Authentification requise.' using errcode = '42501';
  end if;

  if exists (select 1 from public.profils where id = v_user_id) then
    return true;
  end if;

  select email, raw_user_meta_data
    into v_email, v_metadata
  from auth.users
  where id = v_user_id;

  if not found then
    raise exception 'Compte Auth introuvable.' using errcode = 'P0002';
  end if;

  -- User metadata is used only as display copy, never for authorization.
  v_base_pseudo := nullif(left(btrim(coalesce(
    v_metadata ->> 'pseudo',
    split_part(coalesce(v_email, ''), '@', 1),
    'joueur'
  )), 32), '');
  v_base_pseudo := coalesce(v_base_pseudo, 'joueur');
  v_pseudo := v_base_pseudo;

  if exists (
    select 1 from public.profils where lower(pseudo) = lower(v_pseudo)
  ) then
    v_pseudo := v_base_pseudo || '-' || replace(v_user_id::text, '-', '');
  end if;

  begin
    insert into public.profils (id, pseudo, email)
    values (v_user_id, v_pseudo, v_email)
    on conflict (id) do nothing;
  exception
    when unique_violation then
      insert into public.profils (id, pseudo, email)
      values (
        v_user_id,
        v_base_pseudo || '-' || replace(v_user_id::text, '-', ''),
        v_email
      )
      on conflict (id) do nothing;
  end;

  return exists (select 1 from public.profils where id = v_user_id);
end;
$$;

revoke all privileges on function public.clutch_assurer_mon_profil_v1()
  from public, anon, authenticated, service_role;
grant execute on function public.clutch_assurer_mon_profil_v1()
  to authenticated, service_role;

comment on function public.clutch_assurer_mon_profil_v1() is
  'Recree uniquement le profil manquant de l utilisateur authentifie.';
