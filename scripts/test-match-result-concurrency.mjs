import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  resolveLocalDatabaseContainer,
  runLocalSql,
} from './local-supabase-sql.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseTarget = process.argv.includes('--linked') ? '--linked' : '--local';
const holdSeconds = 1.5;
const target = new Date(Date.now() + 8_000).toISOString();
const localDatabaseContainer = databaseTarget === '--local'
  ? await resolveLocalDatabaseContainer(repositoryRoot)
  : null;

function buildProbeSql(label) {
  return `
begin;
select pg_catalog.pg_sleep(
  greatest(0, extract(epoch from ('${target}'::timestamptz - clock_timestamp())))
);
select pg_catalog.set_config(
  'clutch_test.requested',
  clock_timestamp()::text,
  false
);
select private.clutch_verrouiller_saison_resultat_v1(
  'lot14-two-connection-regression'
);
select pg_catalog.set_config(
  'clutch_test.acquired',
  clock_timestamp()::text,
  false
);
select pg_catalog.pg_sleep(${holdSeconds});
select pg_catalog.set_config(
  'clutch_test.released',
  clock_timestamp()::text,
  false
);
commit;
select jsonb_build_object(
  'session', '${label}',
  'backend_pid', pg_backend_pid(),
  'wait_ms', round(extract(epoch from (
    current_setting('clutch_test.acquired')::timestamptz
      - current_setting('clutch_test.requested')::timestamptz
  )) * 1000),
  'held_ms', round(extract(epoch from (
    current_setting('clutch_test.released')::timestamptz
      - current_setting('clutch_test.acquired')::timestamptz
  )) * 1000)
) as lot14_probe;
`;
}

function runProbe(label) {
  if (localDatabaseContainer) {
    return runLocalSql({
      containerName: localDatabaseContainer,
      cwd: repositoryRoot,
      label: `Concurrency probe ${label}`,
      sql: buildProbeSql(label),
    }).then(({ stdout }) => stdout);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(
      'supabase',
      ['db', 'query', databaseTarget, '--output-format', 'json', buildProbeSql(label)],
      {
        cwd: repositoryRoot,
        env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Concurrency probe ${label} failed:\n${stderr || stdout}`));
        return;
      }
      resolve(stdout);
    });
  });
}

function readMetric(output, metric) {
  const normalized = output.replaceAll('\\', '');
  const match = normalized.match(new RegExp(`"?${metric}"?\\s*:\\s*"?([0-9.]+)`));
  if (!match) {
    throw new Error(`Metric ${metric} is missing from probe output:\n${output}`);
  }
  return Number(match[1]);
}

const startedAt = Date.now();
const outputs = await Promise.all([runProbe('A'), runProbe('B')]);
const probes = outputs.map((output) => ({
  backendPid: readMetric(output, 'backend_pid'),
  waitMs: readMetric(output, 'wait_ms'),
  heldMs: readMetric(output, 'held_ms'),
}));
const waitTimes = probes.map((probe) => probe.waitMs).sort((a, b) => a - b);
const minimumExpectedWait = holdSeconds * 750;
const minimumExpectedHold = holdSeconds * 800;

if (probes[0].backendPid === probes[1].backendPid) {
  throw new Error('Concurrency probes unexpectedly shared one database backend.');
}
if (waitTimes[1] < minimumExpectedWait) {
  throw new Error(
    `Season lock did not serialize both sessions: waits=${waitTimes.join(',')}ms`,
  );
}
if (probes.some((probe) => probe.heldMs < minimumExpectedHold)) {
  throw new Error(
    `A probe released the transaction lock too early: ${JSON.stringify(probes)}`,
  );
}

console.log(JSON.stringify({
  ok: true,
  databaseTarget: databaseTarget.slice(2),
  elapsedMs: Date.now() - startedAt,
  probes,
}));
