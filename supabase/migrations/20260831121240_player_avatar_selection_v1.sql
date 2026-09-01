-- Player-selected avatar from the curated mobile catalog.
-- The image assets stay in the application bundle; only the stable catalog id
-- is persisted and exposed through the existing public-profile projection.

alter table public.profils
  add column if not exists avatar_id text;

alter table public.profils
  drop constraint if exists profils_avatar_id_catalogue_check;

alter table public.profils
  add constraint profils_avatar_id_catalogue_check
  check (
    avatar_id is null
    or avatar_id = any (array[
      'chaos-smile',
      'void-dragon',
      'gale-agent',
      'shadow-agent',
      'cyber-sentinel',
      'octane-stripe',
      'spirit-fox',
      'wind-blade',
      'forest-scout',
      'astral-agent',
      'flame-duelist',
      'street-blue',
      'orbital-orange',
      'hotrod-red',
      'racer-lime',
      'muscle-violet',
      'armored-cyan',
      'supercar-gold',
      'formula-magenta',
      'hypercar-white'
    ]::text[])
  );

comment on column public.profils.avatar_id is
  'Stable id of the player-selected avatar bundled with the mobile application.';

-- Data API access stays least-privilege. The existing owner-only UPDATE RLS
-- policy remains the row-level authority for this newly granted column.
alter table public.profils enable row level security;
revoke update (avatar_id) on table public.profils from public, anon;
grant update (avatar_id) on table public.profils to authenticated;
grant all privileges on table public.profils to service_role;

-- Keep public/visitor profiles consistent with the authenticated header. The
-- current function has later hardening patches, so amend its installed
-- definition in place instead of replacing those guards with an older body.
do $$
declare
  v_definition text;
  v_marker text := $marker$
    'profil_public',v_target.profil_public,
$marker$;
  v_replacement text := $replacement$
    'profil_public',v_target.profil_public,
    'avatar_id',v_target.avatar_id,
$replacement$;
begin
  select pg_catalog.pg_get_functiondef('public.clutch_profil_public_v1(text)'::regprocedure)
  into v_definition;

  if pg_catalog.strpos(v_definition, $needle$'avatar_id',v_target.avatar_id$needle$) > 0 then
    return;
  end if;
  if pg_catalog.strpos(v_definition, v_marker) = 0 then
    raise exception 'public profile definition changed; avatar projection not applied';
  end if;

  execute pg_catalog.replace(v_definition, v_marker, v_replacement);
end;
$$;

revoke all privileges on function public.clutch_profil_public_v1(text)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_profil_public_v1(text)
to anon, authenticated, service_role;

comment on function public.clutch_profil_public_v1(text) is
  'Public profile projection with block guards and the player-selected avatar id.';
