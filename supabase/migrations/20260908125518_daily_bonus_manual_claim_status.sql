-- Read-only availability check. Credits are still granted only by the existing
-- idempotent claim RPC after the player explicitly presses the claim button.
create or replace function private.clutch_statut_bonus_quotidien_v1(p_fuseau text default 'UTC')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_fuseau text;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_jour date;
  v_fin timestamptz;
  v_disponible boolean;
begin
  if v_user is null or not exists (
    select 1 from auth.users u where u.id = v_user and not coalesce(u.is_anonymous, false)
  ) then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  select j.fuseau into v_fuseau from private.journees_recompense_joueur j where j.user_id = v_user;
  if not found then
    v_fuseau := coalesce(nullif(pg_catalog.btrim(p_fuseau), ''), 'UTC');
    if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_fuseau) then
      raise exception 'invalid_reward_timezone' using errcode = '22023';
    end if;
  end if;
  select j.jour, j.fin into v_jour, v_fin from private.clutch_journee_recompense_v1(v_now, v_fuseau) j;
  select not exists (
    select 1 from public.volts_mouvements m
    where m.user_id = v_user and m.origine = 'bonus_quotidien' and m.reference = v_jour::text
  ) into v_disponible;
  return jsonb_build_object('user_id', v_user, 'disponible', v_disponible,
    'montant_quotidien', 10, 'jour', v_jour, 'heure_serveur', v_now, 'prochain_bonus_le', v_fin);
end;
$$;
revoke all privileges on function private.clutch_statut_bonus_quotidien_v1(text)
from public, anon, authenticated, service_role;
grant execute on function private.clutch_statut_bonus_quotidien_v1(text) to authenticated;

create or replace function public.clutch_statut_bonus_quotidien_v1(p_fuseau text default 'UTC')
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.clutch_statut_bonus_quotidien_v1(p_fuseau); $$;
revoke all privileges on function public.clutch_statut_bonus_quotidien_v1(text)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_statut_bonus_quotidien_v1(text) to authenticated;
comment on function public.clutch_statut_bonus_quotidien_v1(text) is
  'Authenticated read-only daily bonus availability. Does not award Volts or pin a timezone; claim remains authoritative.';
notify pgrst, 'reload schema';
