import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import {
  resolveLocalDatabaseContainer,
  runLocalSql,
} from './local-supabase-sql.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const containerName = await resolveLocalDatabaseContainer(repositoryRoot);
const userId = randomUUID();
const suffix = userId.replaceAll('-', '');
const firstApplicationName = `fnatic-pack-A-${suffix.slice(0, 12)}`;
const secondApplicationName = `fnatic-pack-B-${suffix.slice(0, 12)}`;
const barrierTable = `private.fnatic_pack_barrier_${suffix.slice(0, 12)}`;

function authSql() {
  return `
select pg_catalog.set_config('request.jwt.claim.sub', '${userId}', true);
select pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);
select pg_catalog.set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', '${userId}'::uuid, 'role', 'authenticated')::text,
  true
);`;
}

async function execute(label, sql) {
  return runLocalSql({
    containerName,
    cwd: repositoryRoot,
    label,
    sql,
  });
}

async function waitForMarker({ label, marker, sql, timeoutMs = 5_000 }) {
  const deadline = Date.now() + timeoutMs;
  let lastOutput = '';

  while (Date.now() < deadline) {
    const result = await execute(label, sql);
    lastOutput = `${result.stdout}\n${result.stderr}`;
    if (lastOutput.includes(marker)) {
      return true;
    }
    await delay(50);
  }

  throw new Error(`${marker} was not observed within ${timeoutMs}ms:\n${lastOutput}`);
}

const setupSql = `
create unlogged table ${barrierTable} (
  id boolean primary key default true check (id),
  released boolean not null default false
);
insert into ${barrierTable} (id, released) values (true, false);

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '${userId}',
  'authenticated',
  'authenticated',
  'fnatic-concurrency-${suffix}@example.invalid',
  pg_catalog.now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('pseudo', 'fnatic-c-${suffix.slice(0, 14)}'),
  pg_catalog.now(),
  pg_catalog.now()
);

insert into public.volts_mouvements (user_id, montant, origine, reference)
values ('${userId}', 1280, 'ajustement', 'fnatic-concurrency-credit');
`;

const firstPurchaseSql = `
begin;
select pg_catalog.set_config('application_name', '${firstApplicationName}', true);
${authSql()}
-- Acquire the production lock order, then expose an observable PgSleep barrier.
select private.clutch_verrouiller_catalogue_packs_v1(false);
select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('clutch-cosmetic:${userId}', 0)
);
do $$
begin
  while not (select released from ${barrierTable} where id) loop
    perform pg_catalog.pg_sleep(0.05);
  end loop;
end;
$$;
select public.clutch_acheter_pack_cosmetique_v1('fnatic-black-orange');
commit;
`;

const secondPurchaseSql = `
begin;
select pg_catalog.set_config('application_name', '${secondApplicationName}', true);
${authSql()}
select public.clutch_acheter_pack_cosmetique_v1('fnatic-black-orange');
commit;
`;

const firstBarrierSql = `
select case when exists (
  select 1
  from pg_catalog.pg_stat_activity a
  where a.application_name = '${firstApplicationName}'
    and a.wait_event = 'PgSleep'
) then 'FNATIC_A_BARRIER_READY' else 'FNATIC_A_BARRIER_PENDING' end;
`;

const overlapBarrierSql = `
select case when exists (
  select 1
  from pg_catalog.pg_stat_activity a
  where a.application_name = '${firstApplicationName}'
    and a.wait_event = 'PgSleep'
) and exists (
  select 1
  from pg_catalog.pg_stat_activity b
  where b.application_name = '${secondApplicationName}'
    and b.wait_event_type = 'Lock'
    and lower(coalesce(b.wait_event, '')) like '%advisory%'
) then 'FNATIC_B_WAIT_OVERLAP' else 'FNATIC_B_WAIT_PENDING' end;
`;

const releaseBarrierSql = `
update ${barrierTable} set released = true where id;
`;

const assertionSql = `
do $$
begin
  if (
    select count(*)
    from public.volts_mouvements m
    where m.user_id = '${userId}'
      and m.origine = 'achat_pack'
      and m.reference = 'fnatic-black-orange'
      and m.montant = -1200
  ) <> 1
     or (
    select count(*)
    from public.inventaire_packs_cosmetiques i
    where i.user_id = '${userId}'
      and i.pack_id = 'fnatic-black-orange'
  ) <> 1
     or (
    select count(*)
    from public.inventaire i
    join public.pack_cosmetique_membres m
      on m.pack_id = 'fnatic-black-orange'
     and m.objet_id = i.objet_id
    where i.user_id = '${userId}'
  ) <> 12
     or (
    select coalesce(sum(m.montant), 0)::integer
    from public.volts_mouvements m
    where m.user_id = '${userId}'
  ) <> 80
     or (
    select count(*)
    from public.equipement e
    join public.pack_cosmetique_membres m
      on m.pack_id = 'fnatic-black-orange'
     and m.objet_id = e.objet_id
     and m.equip_by_default
    where e.user_id = '${userId}'
  ) <> 8
  then
    raise exception 'Concurrent Fnatic purchases were not idempotent';
  end if;
end;
$$;
`;

const cleanupSql = `
delete from auth.users where id = '${userId}';
drop table if exists ${barrierTable};
`;

let setupComplete = false;
let activeSessions = [];
let firstBarrierObserved = false;
let overlapObserved = false;
try {
  await execute('Fnatic concurrency setup', setupSql);
  setupComplete = true;

  const firstSession = execute('Fnatic concurrent purchase A', firstPurchaseSql);
  activeSessions.push(firstSession);
  firstBarrierObserved = await waitForMarker({
    label: 'Fnatic A barrier probe',
    marker: 'FNATIC_A_BARRIER_READY',
    sql: firstBarrierSql,
  });

  const secondSession = execute('Fnatic concurrent purchase B', secondPurchaseSql);
  activeSessions.push(secondSession);
  overlapObserved = await waitForMarker({
    label: 'Fnatic B advisory-wait probe',
    marker: 'FNATIC_B_WAIT_OVERLAP',
    sql: overlapBarrierSql,
  });

  await execute('Fnatic release A barrier', releaseBarrierSql);
  await Promise.all(activeSessions);
  if (!firstBarrierObserved || !overlapObserved) {
    throw new Error('Concurrency barrier did not prove that B waited while A was active.');
  }
  await execute('Fnatic concurrency assertions', assertionSql);

  console.log(JSON.stringify({
    ok: true,
    packId: 'fnatic-black-orange',
    firstBarrierObserved,
    overlapObserved,
    expectedDebits: 1,
    expectedInventoryMembers: 12,
    expectedEquippedDefaults: 8,
    expectedBalance: 80,
  }));
} finally {
  if (setupComplete) {
    await execute('Fnatic ensure barrier release', releaseBarrierSql).catch(() => undefined);
  }
  await Promise.allSettled(activeSessions);
  if (setupComplete) {
    await execute('Fnatic concurrency cleanup', cleanupSql);
  }
}
