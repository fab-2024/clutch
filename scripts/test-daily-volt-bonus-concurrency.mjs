import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { resolveLocalDatabaseContainer, runLocalSql } from './local-supabase-sql.mjs';

// Local Supabase only. Separate PostgreSQL sessions must visibly overlap on the
// same production economy lock, not merely make two sequential RPC calls.
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const containerName = await resolveLocalDatabaseContainer(repositoryRoot);
const userId = randomUUID();
const suffix = userId.replaceAll('-', '');
const barrier = `private.daily_bonus_barrier_${suffix.slice(0, 12)}`;
const applicationA = `daily-bonus-A-${suffix.slice(0, 12)}`;
const applicationB = `daily-bonus-B-${suffix.slice(0, 12)}`;
const sessions = [];
let setupComplete = false;

const execute = (label, sql) => runLocalSql({ containerName, cwd: repositoryRoot, label, sql });
const authSql = `
  select set_config('request.jwt.claim.sub', '${userId}', true);
  select set_config('request.jwt.claims', '{"sub":"${userId}","role":"authenticated"}', true);
`;
async function waitUntil(label, condition) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await execute(label, `select case when ${condition} then 'BONUS_READY' else 'PENDING' end;`);
    if (result.stdout.includes('BONUS_READY')) return;
    await delay(50);
  }
  throw new Error(`${label}: concurrent overlap was not observed within ten seconds`);
}

try {
  await execute('daily bonus fixture', `
    begin;
    create unlogged table ${barrier} (released boolean not null default false);
    insert into ${barrier} values (false);
    insert into auth.users (
      id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '${userId}', 'authenticated', 'authenticated', 'daily-concurrency-${suffix}@example.invalid', now(),
      '{"provider":"email","providers":["email"]}', '{"pseudo":"daily-c-${suffix.slice(0, 14)}"}', now(), now()
    );
    insert into private.preferences_confidentialite (user_id, analytics_autorise) values ('${userId}', true)
    on conflict (user_id) do update set analytics_autorise = true;
    commit;
  `);
  setupComplete = true;
  const first = execute('daily bonus session A', `
    begin;
    set local statement_timeout = '20s';
    select set_config('application_name', '${applicationA}', true);
    ${authSql}
    select pg_advisory_xact_lock(hashtextextended('clutch-volts:${userId}', 0));
    do $$ begin
      while not (select released from ${barrier}) loop perform pg_sleep(0.05); end loop;
    end; $$;
    set local role authenticated;
    -- Pick a civil calendar comfortably away from midnight in this fixture.
    select public.clutch_reclamer_bonus_quotidien_v1(
      case when extract(hour from clock_timestamp() at time zone 'UTC') between 1 and 22
      then 'UTC' else 'Etc/GMT-12' end
    );
    commit;
  `);
  first.catch(() => undefined);
  sessions.push(first);
  await waitUntil('daily bonus A barrier', `exists (
    select 1 from pg_stat_activity where application_name = '${applicationA}' and wait_event = 'PgSleep'
  )`);
  const second = execute('daily bonus session B', `
    begin;
    set local statement_timeout = '20s';
    select set_config('application_name', '${applicationB}', true);
    ${authSql}
    set local role authenticated;
    select public.clutch_reclamer_bonus_quotidien_v1('Pacific/Kiritimati');
    commit;
  `);
  second.catch(() => undefined);
  sessions.push(second);
  await waitUntil('daily bonus B advisory lock', `exists (
    select 1 from pg_stat_activity where application_name = '${applicationB}'
    and wait_event_type = 'Lock' and lower(coalesce(wait_event, '')) like '%advisory%'
  )`);
  await execute('release daily bonus barrier', `update ${barrier} set released = true;`);
  await Promise.all(sessions);
  await execute('daily bonus concurrency assertions', `
    do $$ begin
      if (select count(*) from public.volts_mouvements where user_id = '${userId}') <> 1
         or (select sum(montant) from public.volts_mouvements where user_id = '${userId}') <> 10
         or (select count(*) from private.journees_recompense_joueur where user_id = '${userId}') <> 1
         or (select count(*) from private.analytics_evenements where user_id = '${userId}' and type_evenement = 'daily_bonus_awarded') <> 1
      then raise exception 'Concurrent claims minted more than one daily bonus'; end if;
    end; $$;
  `);
  console.log('Daily bonus concurrency: overlapping sessions, one +10 credit and one server event.');
} finally {
  if (setupComplete) {
    await execute('ensure daily barrier release', `update ${barrier} set released = true;`).catch(() => undefined);
  }
  await Promise.allSettled(sessions);
  if (setupComplete) {
    await execute('remove generated daily bonus fixture', `
      begin;
      delete from auth.users where id = '${userId}';
      drop table ${barrier};
      commit;
    `);
  }
}
