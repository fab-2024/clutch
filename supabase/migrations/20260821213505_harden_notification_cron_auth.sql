-- Authentifie l'appel pg_cron -> Edge Function avec un secret aleatoire
-- distinct des cles publiques du projet. Le texte clair reste dans Vault ;
-- seule son empreinte SHA-256 est accessible au validateur service_role.

create table if not exists private.clutch_notification_configuration (
  id smallint primary key default 1 check (id = 1),
  secret_hash bytea not null,
  rotation_le timestamptz not null default now()
);

alter table private.clutch_notification_configuration enable row level security;
revoke all privileges on table private.clutch_notification_configuration
  from public, anon, authenticated, service_role;

create or replace function public.clutch_verifier_secret_notification_v1(
  p_secret text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role requis' using errcode = '42501';
  end if;

  return exists (
    select 1
    from private.clutch_notification_configuration c
    where c.id = 1
      and c.secret_hash = extensions.digest(coalesce(p_secret, ''), 'sha256')
  );
end;
$$;

revoke all privileges on function public.clutch_verifier_secret_notification_v1(text)
  from public, anon, authenticated, service_role;
grant execute on function public.clutch_verifier_secret_notification_v1(text)
  to service_role;

do $$
declare
  v_secret text := encode(extensions.gen_random_bytes(32), 'hex');
  v_secret_id uuid;
begin
  insert into private.clutch_notification_configuration(id, secret_hash, rotation_le)
  values (1, extensions.digest(v_secret, 'sha256'), now())
  on conflict (id) do update set
    secret_hash = excluded.secret_hash,
    rotation_le = excluded.rotation_le;

  select id into v_secret_id
  from vault.secrets
  where name = 'clutch_notification_cron_secret'
  order by created_at desc
  limit 1;

  if v_secret_id is null then
    perform vault.create_secret(
      v_secret,
      'clutch_notification_cron_secret',
      'Authentification interne du relais de notifications Clutch'
    );
  else
    perform vault.update_secret(
      v_secret_id,
      v_secret,
      'clutch_notification_cron_secret',
      'Authentification interne du relais de notifications Clutch'
    );
  end if;
end;
$$;

create or replace function private.clutch_cycle_notifications_v1()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_cle text;
  v_cron_secret text;
  v_requete bigint;
begin
  perform private.clutch_planifier_notifications_match_v1();

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'clutch_project_url'
  order by created_at desc limit 1;

  select decrypted_secret into v_cle
  from vault.decrypted_secrets
  where name = 'clutch_anon_key'
  order by created_at desc limit 1;

  select decrypted_secret into v_cron_secret
  from vault.decrypted_secrets
  where name = 'clutch_notification_cron_secret'
  order by created_at desc limit 1;

  if coalesce(v_url, '') = ''
     or coalesce(v_cle, '') = ''
     or coalesce(v_cron_secret, '') = '' then
    return null;
  end if;

  select net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/clutch-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_cle,
      'apikey', v_cle,
      'X-Clutch-Cron-Secret', v_cron_secret
    ),
    body := jsonb_build_object('source', 'pg_cron', 'at', now()),
    timeout_milliseconds := 15000
  ) into v_requete;
  return v_requete;
end;
$$;

revoke all privileges on function private.clutch_cycle_notifications_v1()
  from public, anon, authenticated, service_role;
