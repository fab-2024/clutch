-- Blocking must also stop authenticated profile disclosure through the legacy
-- public-profile RPC. Patch the current hardened definition in place so the
-- historical payload and anonymous public-link contract remain unchanged.

do $$
declare
  v_definition text;
  v_marker text := $marker$
  if not v_target.profil_public and v_viewer is distinct from v_target.id then return null; end if;
$marker$;
  v_replacement text := $replacement$
  if not v_target.profil_public and v_viewer is distinct from v_target.id then return null; end if;
  if v_viewer is not null
     and v_viewer <> v_target.id
     and private.clutch_utilisateurs_bloques_v1(v_viewer, v_target.id)
  then
    return null;
  end if;
$replacement$;
begin
  select pg_catalog.pg_get_functiondef('public.clutch_profil_public_v1(text)'::regprocedure)
  into v_definition;

  if pg_catalog.strpos(v_definition, 'private.clutch_utilisateurs_bloques_v1(v_viewer, v_target.id)') > 0 then
    return;
  end if;
  if pg_catalog.strpos(v_definition, v_marker) = 0 then
    raise exception 'public profile definition changed; blocked-profile guard not applied';
  end if;

  execute pg_catalog.replace(v_definition, v_marker, v_replacement);
end;
$$;

revoke all privileges on function public.clutch_profil_public_v1(text)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_profil_public_v1(text)
to anon, authenticated, service_role;

comment on function public.clutch_profil_public_v1(text) is
  'Public profile projection. Authenticated viewers receive null when either account has blocked the other.';
;
