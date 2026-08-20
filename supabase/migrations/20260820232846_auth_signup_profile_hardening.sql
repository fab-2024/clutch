-- Keep Auth signup resilient when two users request the same display name.
-- The trigger remains unavailable through the Data API.

create or replace function public.creer_profil_a_inscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base_pseudo text;
  v_pseudo text;
begin
  v_base_pseudo := nullif(left(btrim(coalesce(
    new.raw_user_meta_data ->> 'pseudo',
    split_part(coalesce(new.email, ''), '@', 1),
    'joueur'
  )), 32), '');
  v_base_pseudo := coalesce(v_base_pseudo, 'joueur');
  v_pseudo := v_base_pseudo;

  if exists (
    select 1
    from public.profils
    where lower(pseudo) = lower(v_pseudo)
  ) then
    v_pseudo := left(v_base_pseudo, 23)
      || '-'
      || left(replace(new.id::text, '-', ''), 8);
  end if;

  begin
    insert into public.profils (id, pseudo, email)
    values (new.id, v_pseudo, new.email)
    on conflict (id) do nothing;
  exception
    when unique_violation then
      insert into public.profils (id, pseudo, email)
      values (
        new.id,
        left(v_base_pseudo, 23)
          || '-'
          || left(replace(new.id::text, '-', ''), 8),
        new.email
      )
      on conflict (id) do nothing;
  end;

  return new;
end;
$$;

revoke all privileges on function public.creer_profil_a_inscription()
  from public, anon, authenticated, service_role;

comment on function public.creer_profil_a_inscription() is
  'Cree automatiquement un profil lors de l inscription Auth avec un pseudo unique.';
