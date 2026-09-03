import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { resolveLocalDatabaseContainer, runLocalSql } from './local-supabase-sql.mjs';

// LOCAL Supabase only. These tests require overlapping PostgreSQL connections;
// a single-connection PGlite run cannot verify the locks or SKIP LOCKED behavior.
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const containerName = await resolveLocalDatabaseContainer(repositoryRoot);
const execute = (label, sql) => runLocalSql({ containerName, cwd: repositoryRoot, label, sql });
await execute('P2 migration prerequisite', `do $$ begin
  if to_regprocedure('private.clutch_recompenser_parrain_v1(uuid,timestamptz)') is null then
    raise exception 'Apply the P2 migration to the local database before running concurrency contracts';
  end if;
end $$;`);

async function waitUntil(label, condition) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await execute(label, `select case when ${condition} then 'GROWTH_READY' else 'PENDING' end;`);
    if (result.stdout.includes('GROWTH_READY')) return;
    await delay(50);
  }
  throw new Error(`${label}: overlapping PostgreSQL sessions were not observed`);
}

function asUser(userId, action) {
  return `select set_config('request.jwt.claim.sub','${userId}',true);
    select set_config('request.jwt.claims','{"sub":"${userId}","role":"authenticated"}',true);
    set local role authenticated;
    ${action}
    reset role;`;
}

async function runCase(kind) {
  const [owner, otherOwner, viewer, sibling] = Array.from({ length: 4 }, () => randomUUID());
  const ids = [owner, otherOwner, viewer, sibling];
  const suffix = owner.replaceAll('-', '').slice(0, 12);
  const ownerName = `growth-c-${suffix}-0`;
  const [firstCode, secondCode] = [randomUUID(), randomUUID()].map((id) => id.replaceAll('-', ''));
  const installation = randomUUID();
  const barrier = `private.growth_barrier_${suffix}`;
  const nameA = `growth-${suffix}-A`;
  const nameB = `growth-${suffix}-B`;
  const sessions = [];
  let setupComplete = false;

  try {
    await execute(`growth ${kind} fixture`, `begin;
      create unlogged table ${barrier}(released boolean not null default false);
      revoke all on table ${barrier} from public,anon,authenticated,service_role;
      insert into ${barrier} values(false);
      ${ids.map((id, index) => `insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous)
        values('${id}','authenticated','authenticated','growth-concurrency-${id}@example.invalid',now(),
          '{"provider":"email","providers":["email"]}','{"pseudo":"growth-c-${suffix}-${index}"}',
          now()-interval '${index < 2 ? '2 days' : '1 hour'}',now(),false);`).join('\n')}
      update public.profils set profil_public=true where id in (${ids.map((id) => `'${id}'`).join(',')});
      insert into private.parrainage_liens(user_id,code) values('${owner}','${firstCode}'),('${otherOwner}','${secondCode}');
      ${kind === 'reward-cap' ? `
        select private.clutch_initialiser_serie_v1('${owner}', case
          when extract(hour from clock_timestamp() at time zone 'UTC') between 1 and 22
          then 'UTC' else 'Etc/GMT-12' end);
        insert into public.volts_mouvements(user_id,montant,origine,reference)
          select '${owner}',30,'parrainage','parrainage:'||gen_random_uuid() from generate_series(1,4);
        insert into private.parrainages(filleul_id,parrain_id,active_le,premier_call)
          values('${viewer}','${owner}',clock_timestamp(),gen_random_uuid()),
                ('${sibling}','${owner}',clock_timestamp(),gen_random_uuid());` : ''}
      commit;`);
    setupComplete = true;

    const visitAndLike = asUser(viewer, `select public.clutch_visiter_vitrine_v1('${ownerName}');
      select public.clutch_aimer_vitrine_v1('${ownerName}',true);`);
    const actionA = kind === 'reward-cap' ? `select private.clutch_recompenser_parrain_v1('${owner}');`
      : kind === 'like-replay' ? visitAndLike
      : asUser(viewer, `select public.clutch_accepter_invitation_v1('${firstCode}','${installation}');`);
    const actionB = kind === 'reward-cap' ? `select private.clutch_recompenser_parrain_v1('${owner}');
        do $$ begin
          if (select count(*) from public.volts_mouvements where user_id='${owner}' and origine='parrainage')<>4 then
            raise exception 'Busy reward processor did not defer until the owner transaction commits';
          end if;
        end $$;`
      : kind === 'like-replay' ? visitAndLike
      : asUser(viewer, `do $$ declare r jsonb; begin
          r:=public.clutch_accepter_invitation_v1('${kind === 'accept-conflict' ? secondCode : firstCode}','${installation}');
          if ${kind === 'accept-conflict' ? "coalesce(r->>'erreur','')<>'invite_already_attributed'" : "coalesce(r->>'nouvelle','')<>'false'"} then
            raise exception 'Concurrent invitation was not rejected or replayed deterministically';
          end if;
        end $$;`);

    const first = execute(`growth ${kind} A`, `begin;
      set local statement_timeout='25s';
      select set_config('application_name','${nameA}',true);
      ${actionA}
      do $$ begin
        while not (select released from ${barrier}) loop perform pg_sleep(0.05); end loop;
      end $$;
      commit;`);
    first.catch(() => undefined);
    sessions.push(first);
    await waitUntil('growth session A barrier', `exists(select 1 from pg_stat_activity where application_name='${nameA}' and wait_event='PgSleep')`);

    const second = execute(`growth ${kind} B`, `begin;
      set local statement_timeout='25s';
      select set_config('application_name','${nameB}',true);
      ${actionB}
      commit;`);
    second.catch(() => undefined);
    sessions.push(second);
    if (kind === 'reward-cap') {
      // The reward worker uses a non-blocking lock: a competing worker returns
      // while A is still open, leaving the pending work to A / a later cycle.
      await second;
      await waitUntil('growth reward overlap', `exists(select 1 from pg_stat_activity where application_name='${nameA}' and wait_event='PgSleep')`);
    } else {
      await waitUntil('growth session B serialization', `exists(select 1 from pg_stat_activity where application_name='${nameB}' and wait_event_type='Lock')`);
    }
    await execute('release generated growth barrier', `update ${barrier} set released=true;`);
    await Promise.all(sessions);
    await execute(`growth ${kind} assertions`, `do $$ begin
      ${kind === 'reward-cap' ? `
        perform private.clutch_recompenser_parrain_v1('${owner}');
        if (select count(*) from public.volts_mouvements where user_id='${owner}' and origine='parrainage')<>5
          or (select count(*) from private.parrainages where parrain_id='${owner}' and recompense='attribuee')<>1
          or (select count(*) from private.parrainages where parrain_id='${owner}' and recompense='plafonnee')<>1 then
          raise exception 'Concurrent workers duplicated rewards or bypassed the daily cap'; end if;`
        : kind === 'like-replay' ? `
        if (select count(*) from private.vitrines_likes where proprietaire_id='${owner}')<>1
          or (select count(*) from private.vitrines_vues where proprietaire_id='${owner}')<>1
          or (select vues_total from private.vitrines_sociales where user_id='${owner}')<>1 then
          raise exception 'Concurrent likes or visits counted the same visitor twice'; end if;`
        : `
        if (select count(*) from private.parrainages where filleul_id='${viewer}')<>1
          or (select parrain_id from private.parrainages where filleul_id='${viewer}')<>'${owner}'
          or (select count(*) from private.protecteurs_serie_mouvements where user_id='${viewer}' and type='bienvenue')<>1
          or exists(select 1 from public.volts_mouvements where user_id='${owner}' and origine='parrainage') then
          raise exception 'Concurrent acceptance changed attribution or duplicated a welcome reward'; end if;`}
    end $$;`);
    console.log(`Growth concurrency (${kind}): overlapping sessions, idempotency and limits verified.`);
  } finally {
    if (setupComplete) await execute('release growth fixture barrier', `update ${barrier} set released=true;`).catch(() => undefined);
    await Promise.allSettled(sessions);
    if (setupComplete) await execute('remove generated growth fixtures', `begin;
      delete from auth.users where id in (${ids.map((id) => `'${id}'`).join(',')});
      drop table ${barrier};
      commit;`);
  }
}

for (const kind of ['accept-replay', 'accept-conflict', 'reward-cap', 'like-replay']) await runCase(kind);
