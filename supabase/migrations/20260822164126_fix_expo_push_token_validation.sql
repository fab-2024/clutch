-- The original standard string used two literal backslashes, so PostgreSQL's
-- regular-expression engine rejected valid ExpoPushToken[...] values. Use an
-- escape string to pass exactly one escaping backslash to the regex engine.

create or replace function public.clutch_enregistrer_jeton_notification_v1(
  p_jeton_expo text,
  p_plateforme text,
  p_appareil_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_jeton text := pg_catalog.btrim(coalesce(p_jeton_expo, ''));
  v_plateforme text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_plateforme, 'unknown')));
  v_appareil text := nullif(pg_catalog.btrim(coalesce(p_appareil_id, '')), '');
  v_id uuid;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if v_jeton !~ E'^(Expo|Exponent)PushToken\\[[A-Za-z0-9_-]+\\]$' then
    raise exception 'jeton Expo invalide' using errcode = '22023';
  end if;
  if v_plateforme not in ('ios', 'android', 'unknown') then
    v_plateforme := 'unknown';
  end if;
  if v_appareil is not null and pg_catalog.length(v_appareil) not between 8 and 180 then
    raise exception 'identifiant appareil invalide' using errcode = '22023';
  end if;

  if v_appareil is not null then
    update public.jetons_notification
    set actif = false,
        desactive_le = pg_catalog.now(),
        motif_desactivation = 'jeton_remplace',
        maj_le = pg_catalog.now()
    where user_id = v_user
      and appareil_id = v_appareil
      and jeton_expo <> v_jeton
      and actif;
  end if;

  insert into public.jetons_notification (
    user_id, jeton_expo, plateforme, appareil_id
  ) values (
    v_user, v_jeton, v_plateforme, v_appareil
  )
  on conflict (jeton_expo) do update set
    user_id = excluded.user_id,
    plateforme = excluded.plateforme,
    appareil_id = excluded.appareil_id,
    actif = true,
    vu_le = pg_catalog.now(),
    desactive_le = null,
    motif_desactivation = null,
    maj_le = pg_catalog.now()
  returning id into v_id;

  insert into public.livraisons_notification (
    notification_id, jeton_id, jeton_expo, prochaine_tentative
  )
  select e.id, v_id, v_jeton, pg_catalog.greatest(pg_catalog.now(), e.planifie_pour)
  from public.evenements_notification e
  where e.user_id = v_user
    and e.statut = 'en_attente'
    and e.planifie_pour >= pg_catalog.now() - interval '10 minutes'
  on conflict (notification_id, jeton_id) do nothing;

  return jsonb_build_object('enregistre', true, 'appareils_actifs', (
    select count(*)::integer
    from public.jetons_notification j
    where j.user_id = v_user and j.actif
  ));
end;
$$;

revoke all privileges on function public.clutch_enregistrer_jeton_notification_v1(text, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.clutch_enregistrer_jeton_notification_v1(text, text, text)
to authenticated, service_role;

comment on function public.clutch_enregistrer_jeton_notification_v1(text, text, text) is
  'Authenticated Expo token registration. The token format is strictly allowlisted and the owner is derived from auth.uid().';
;
