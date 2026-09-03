import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { resolveLocalDatabaseContainer, runLocalSql } from './local-supabase-sql.mjs';

// Real overlapping PostgreSQL sessions, LOCAL Supabase only. PGlite's single
// connection cannot substitute for these stock/idempotency/economy checks.
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const containerName = await resolveLocalDatabaseContainer(repositoryRoot);
const execute = (label, sql) => runLocalSql({ containerName, cwd: repositoryRoot, label, sql });

async function waitUntil(label, condition) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await execute(label, `select case when ${condition} then 'STREAK_READY' else 'PENDING' end;`);
    if (result.stdout.includes('STREAK_READY')) return;
    await delay(50);
  }
  throw new Error(`${label}: overlapping PostgreSQL sessions were not observed`);
}

async function runCase(kind) {
  const userId = randomUUID();
  const suffix = userId.replaceAll('-', '');
  const firstOperation = randomUUID();
  const secondOperation = kind === 'replay' ? firstOperation : randomUUID();
  const barrier = `private.streak_barrier_${suffix.slice(0, 12)}`;
  const applicationA = `streak-${suffix.slice(0, 12)}-A`;
  const applicationB = `streak-${suffix.slice(0, 12)}-B`;
  const initialVolts = kind === 'daily-bonus' ? 80 : 180;
  const expectedVolts = kind === 'daily-bonus' ? 0 : 90;
  const auth = `
    select set_config('request.jwt.claim.sub', '${userId}', true);
    select set_config('request.jwt.claims', '{"sub":"${userId}","role":"authenticated"}', true);
  `;
  const sessions = [];
  let setupComplete = false;
  try {
    await execute(`streak ${kind} fixture`, `
      begin;
      create unlogged table ${barrier} (released boolean not null default false);
      insert into ${barrier} values (false);
      insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
      values ('${userId}','authenticated','authenticated','streak-concurrency-${suffix}@example.invalid',now(),
        '{"provider":"email","providers":["email"]}','{"pseudo":"streak-c-${suffix.slice(0, 12)}"}',now(),now());
      insert into private.preferences_confidentialite(user_id,analytics_autorise) values('${userId}',true)
        on conflict(user_id) do update set analytics_autorise=true;
      -- Keep this test well away from a civil midnight regardless of CI time.
      select private.clutch_initialiser_serie_v1('${userId}',
        case when extract(hour from clock_timestamp() at time zone 'UTC') between 1 and 22
          then 'UTC' else 'Etc/GMT-12' end);
      select public.clutch_crediter_volts('${userId}',${initialVolts},'onboarding','streak-concurrency');
      commit;
    `);
    setupComplete = true;
    const first = execute(`streak ${kind} session A`, `
      begin;
      set local statement_timeout = '20s';
      select set_config('application_name','${applicationA}',true);
      ${auth}
      select pg_advisory_xact_lock(hashtextextended('clutch-volts:${userId}',0));
      do $$ begin
        while not (select released from ${barrier}) loop perform pg_sleep(0.05); end loop;
      end; $$;
      set local role authenticated;
      select ${kind === 'daily-bonus'
        ? "public.clutch_reclamer_bonus_quotidien_v1('Pacific/Kiritimati')"
        : `public.clutch_acheter_protecteur_serie_v1('${firstOperation}')`};
      commit;
    `);
    first.catch(() => undefined);
    sessions.push(first);
    await waitUntil('streak session A barrier', `exists (
      select 1 from pg_stat_activity where application_name='${applicationA}' and wait_event='PgSleep'
    )`);
    const second = execute(`streak ${kind} session B`, `
      begin;
      set local statement_timeout = '20s';
      select set_config('application_name','${applicationB}',true);
      ${auth}
      set local role authenticated;
      ${kind === 'stock-cap' ? `do $$ begin
        perform public.clutch_acheter_protecteur_serie_v1('${secondOperation}');
        raise exception 'Stock cap accepted two purchases';
      exception when sqlstate 'P0001' then
        if sqlerrm <> 'protector_stock_full' then raise; end if;
      end; $$;` : `select public.clutch_acheter_protecteur_serie_v1('${secondOperation}');`}
      commit;
    `);
    second.catch(() => undefined);
    sessions.push(second);
    await waitUntil('streak session B economy lock', `exists (
      select 1 from pg_stat_activity where application_name='${applicationB}'
      and wait_event_type='Lock' and lower(coalesce(wait_event,'')) like '%advisory%'
    )`);
    await execute('release generated streak barrier', `update ${barrier} set released=true;`);
    await Promise.all(sessions);
    await execute(`streak ${kind} assertions`, `
      do $$ begin
        if (select stock_protecteurs from private.series_calls_etats where user_id='${userId}') <> 2
          or (select sum(montant) from public.volts_mouvements where user_id='${userId}') <> ${expectedVolts}
          or (select count(*) from public.volts_mouvements where user_id='${userId}' and origine='achat_consommable') <> 1
          or (select count(*) from private.protecteurs_serie_mouvements where user_id='${userId}' and type='achat') <> 1
          or (select count(*) from private.protecteurs_serie_mouvements where user_id='${userId}' and type='bienvenue') <> 1
          or (select serie_actuelle from private.series_calls_etats where user_id='${userId}') <> 0
          or exists(select 1 from public.volts_mouvements where user_id='${userId}' and solde_apres<0)
        then raise exception 'Concurrent ${kind} broke stock, accounting or streak isolation'; end if;
        if ${kind === 'daily-bonus' ? 'true' : 'false'} and (
          (select count(*) from public.volts_mouvements where user_id='${userId}' and origine='bonus_quotidien') <> 1
          or (select count(*) from private.analytics_evenements where user_id='${userId}' and type_evenement='daily_bonus_awarded') <> 1
        ) then raise exception 'Concurrent login bonus duplicated or was lost'; end if;
      end; $$;
    `);
    console.log(`Call streak concurrency (${kind}): overlapping sessions, one debit, stock capped at two.`);
  } finally {
    if (setupComplete) await execute('release streak fixture barrier', `update ${barrier} set released=true;`).catch(() => undefined);
    await Promise.allSettled(sessions);
    if (setupComplete) await execute('remove generated streak fixtures', `
      begin;
      delete from auth.users where id='${userId}';
      drop table ${barrier};
      commit;
    `);
  }
}

for (const scenario of ['replay', 'stock-cap', 'daily-bonus']) await runCase(scenario);
