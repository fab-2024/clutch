import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function resolveLocalDatabaseContainer(repositoryRoot) {
  const configPath = path.join(repositoryRoot, 'supabase', 'config.toml');
  const config = await readFile(configPath, 'utf8');
  const projectId = config.match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"\s*$/m)?.[1];

  if (!projectId) {
    throw new Error(`Unable to read project_id from ${configPath}`);
  }

  return `supabase_db_${projectId}`;
}

export function runLocalSql({ containerName, cwd, label, sql }) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'docker',
      [
        'exec',
        '-i',
        containerName,
        'psql',
        '--username=postgres',
        '--dbname=postgres',
        '--set=ON_ERROR_STOP=1',
        '--no-psqlrc',
      ],
      {
        cwd,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.stdin.on('error', (error) => {
      if (error.code !== 'EPIPE') {
        reject(error);
      }
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${label} failed:\n${stderr || stdout}`));
        return;
      }

      resolve({ stderr, stdout });
    });
    child.stdin.end(sql);
  });
}
