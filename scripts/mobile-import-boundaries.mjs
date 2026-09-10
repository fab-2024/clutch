import { dirname, resolve, sep } from 'node:path';

/** Resolve internal paths without relying on an installed bundler or SDK. */
function internalModulePath(importer, specifier, mobileRoot) {
  const path = specifier.startsWith('@/')
    ? resolve(mobileRoot, specifier.slice(2))
    : specifier.startsWith('.') ? resolve(dirname(importer), specifier) : null;
  return path?.replace(/\.[cm]?[jt]sx?$/, '') ?? null;
}

export function checkMobileImportBoundaries({ importer, source, mobileRoot }) {
  const modules = [...source.matchAll(/(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g)]
    .map((match) => internalModulePath(importer, match[1], mobileRoot))
    .filter(Boolean);
  const client = resolve(mobileRoot, 'src/lib/supabase');
  const src = resolve(mobileRoot, 'src') + sep;
  return {
    importsSupabaseClient: modules.some((path) => path === client || path.startsWith(client + sep)),
    importsComponents: modules.some((path) => path.startsWith(src) && path.includes(`${sep}components${sep}`)),
  };
}
