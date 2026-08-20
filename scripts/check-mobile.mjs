import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mobileRoot = join(repositoryRoot, 'mobile');
const violations = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.expo') return [];
      return walk(path);
    }
    return entry.isFile() ? [path] : [];
  });
}

for (const legacyDirectory of ['components', 'providers', 'src/services']) {
  const path = join(mobileRoot, legacyDirectory);
  if (existsSync(path) && readdirSync(path).length > 0) {
    violations.push(`legacy directory is not empty: mobile/${legacyDirectory}`);
  }
}

for (const path of walk(mobileRoot)) {
  if (!/\.(ts|tsx)$/.test(path)) continue;
  const source = readFileSync(path, 'utf8');
  const repositoryPath = relative(repositoryRoot, path).replaceAll('\\', '/');
  const isFeatureApi = /^mobile\/src\/features\/.+\/api\.ts$/.test(repositoryPath);
  const isSupabaseInfrastructure = repositoryPath.startsWith('mobile/src/lib/supabase/');

  if (source.includes("@/src/lib/supabase") && !isFeatureApi && !isSupabaseInfrastructure) {
    violations.push(`Supabase client imported outside a feature API: ${repositoryPath}`);
  }
  if (source.includes("@supabase/supabase-js") && repositoryPath.startsWith('mobile/app/')) {
    violations.push(`Supabase package imported by a route: ${repositoryPath}`);
  }
  if (/from\s+['\"].*web\//.test(source)) {
    violations.push(`mobile imports legacy web code: ${repositoryPath}`);
  }

  const isRoute = repositoryPath.startsWith('mobile/app/') && repositoryPath.endsWith('.tsx');
  const isLayout = repositoryPath.endsWith('/_layout.tsx') || repositoryPath === 'mobile/app/_layout.tsx';
  if (isRoute && !isLayout && source.split(/\r?\n/).length > 20) {
    violations.push(`route contains screen logic (>20 lines): ${repositoryPath}`);
  }
}

if (violations.length) {
  console.error(violations.map((violation) => `- ${violation}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Mobile architecture boundaries: OK');
}
