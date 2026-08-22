import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const strict = process.argv.includes('--strict');
const appConfig = JSON.parse(readFileSync(resolve(root, 'mobile/app.json'), 'utf8')).expo;
const failures = [];

for (const path of [
  'mobile/assets/app/icon.png',
  'mobile/assets/app/adaptive-icon.png',
  'mobile/assets/app/splash-icon.png',
  'mobile/assets/app/notification-icon.png',
  'mobile/app/legal/privacy.tsx',
  'mobile/app/legal/terms.tsx',
  'mobile/app/settings/account.tsx',
  'mobile/app/c/[token].tsx',
  'mobile/app/u/[pseudo].tsx',
  'mobile/.maestro/public-entry.yml',
  'mobile/.eas/workflows/e2e-tests.yml',
  'mobile/src/components/errors/AppErrorBoundary.tsx',
  'mobile/src/features/auth/__tests__/pendingRoute.test.ts',
  'mobile/src/features/account/__tests__/api.test.ts',
  'mobile/src/features/notifications/__tests__/api.test.ts',
  'mobile/src/features/matches/hooks/useMatchCenterData.ts',
  'mobile/src/features/matches/hooks/useMatchesDashboard.ts',
  'mobile/src/features/matches/components/MatchCenterSections.tsx',
  'mobile/src/features/matches/components/MatchesArenaSections.tsx',
  'mobile/src/features/social/faction/hooks/useCommunityDashboard.ts',
  'mobile/src/features/social/faction/components/FactionSections.tsx',
  'mobile/src/features/social/components/SocialHomeSections.tsx',
  'supabase/functions/clutch-account-delete/index.ts',
  'supabase/migrations/20260822134313_release_readiness_privacy.sql',
  'supabase/tests/release_readiness_privacy.sql',
  'api/app-association.mjs',
  'api/download.mjs',
  'api/legal-page.mjs',
  'public/index.html',
  'scripts/test-public-release-pages.mjs',
]) {
  if (!existsSync(resolve(root, path))) failures.push(`fichier requis absent: ${path}`);
}

if (!appConfig.icon) failures.push('expo.icon absent');
if (!appConfig.android?.adaptiveIcon?.foregroundImage) failures.push('expo.android.adaptiveIcon absent');
if (!pluginConfigured(appConfig.plugins, 'expo-splash-screen')) failures.push('plugin expo-splash-screen absent');
if (!pluginConfigured(appConfig.plugins, 'expo-notifications')) failures.push('plugin expo-notifications absent');
if (appConfig.ios?.bundleIdentifier !== 'com.fabthetap.clutch') failures.push('bundleIdentifier iOS inattendu');
if (appConfig.android?.package !== 'com.fabthetap.clutch') failures.push('package Android inattendu');
const vercelConfig = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));
if (vercelConfig.outputDirectory !== 'public') failures.push('Vercel déploie encore le prototype web historique');

requirePngDimensions('mobile/assets/app/icon.png', 1024, 1024);
requirePngDimensions('mobile/assets/app/adaptive-icon.png', 1024, 1024);
requirePngDimensions('mobile/assets/app/splash-icon.png', 512, 512);
requirePngDimensions('mobile/assets/app/notification-icon.png', 96, 96);

const tabs = readFileSync(resolve(root, 'mobile/app/(tabs)/_layout.tsx'), 'utf8');
if (!/name="room"[\s\S]{0,180}href: null/.test(tabs)) failures.push('Room reste visible dans la navigation');
const roomRoute = readFileSync(resolve(root, 'mobile/app/(tabs)/room.tsx'), 'utf8');
if (!roomRoute.includes('PreviewRoute')) failures.push('Room reste accessible en production');

for (const route of previewRoutes()) {
  const source = readFileSync(resolve(root, 'mobile/app', route), 'utf8');
  if (!source.includes('PreviewRoute')) failures.push(`route preview non protégée: ${route}`);
}

for (const screen of [
  'mobile/src/features/matches/components/MatchCenterScreen.tsx',
  'mobile/src/features/matches/components/MatchesScreen.tsx',
  'mobile/src/features/social/faction/components/FactionScreen.tsx',
  'mobile/src/features/social/components/SocialHomeScreen.tsx',
]) {
  const lines = readFileSync(resolve(root, screen), 'utf8').split(/\r?\n/).length;
  if (lines > 420) failures.push(`écran orchestrateur redevenu monolithique (${lines} lignes): ${screen}`);
}

const callsPanel = readFileSync(
  resolve(root, 'mobile/src/features/matches/components/MyCallsPanel.tsx'),
  'utf8',
);
if (!callsPanel.includes('CALL_PAGE_SIZE') || !callsPanel.includes('visibleCalls')) {
  failures.push('pagination progressive des calls absente');
}
const friendsScreen = readFileSync(
  resolve(root, 'mobile/src/features/social/friends/components/FriendsScreen.tsx'),
  'utf8',
);
if (!friendsScreen.includes('RANKING_PAGE_SIZE') || !friendsScreen.includes('visibleRanking')) {
  failures.push('pagination progressive du classement Cercle absente');
}

if (strict) {
  requireHttpsOrigin('EXPO_PUBLIC_APP_ORIGIN');
  requireEmail('EXPO_PUBLIC_SUPPORT_EMAIL');
  requireValue('EXPO_PUBLIC_LEGAL_ENTITY');
  requirePattern('CLUTCH_APPLE_TEAM_ID', /^[A-Z0-9]{10}$/);
  requireFingerprints('CLUTCH_ANDROID_SHA256_CERT_FINGERPRINTS');
  requireEmail('CLUTCH_SUPPORT_EMAIL');
  requireValue('CLUTCH_LEGAL_ENTITY');
  requirePattern('CLUTCH_IOS_STORE_URL', /^https:\/\/apps\.apple\.com\//);
  requirePattern('CLUTCH_ANDROID_STORE_URL', /^https:\/\/play\.google\.com\/store\/apps\//);
  requirePattern('EXPO_PUBLIC_SUPABASE_URL', /^https:\/\/[a-z0-9-]+\.supabase\.co$/i);
  requirePattern('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', /^sb_publishable_[A-Za-z0-9_-]+$/);
  requirePattern('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY', /^appl_[A-Za-z0-9]+$/);
  requirePattern('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY', /^goog_[A-Za-z0-9]+$/);
  requireValue('REVENUECAT_SECRET_API_KEY');
}

if (failures.length) {
  console.error(`Mobile release check failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`Mobile release check: OK${strict ? ' (strict)' : ''}`);

function pluginConfigured(plugins, name) {
  return plugins?.some((plugin) => plugin === name || (Array.isArray(plugin) && plugin[0] === name));
}
function previewRoutes() {
  return [
    'campaign-preview.tsx', 'campaign-report-preview.tsx', 'economy-preview.tsx',
    'founder-pack-preview.tsx', 'hub-preview.tsx', 'match-center-preview.tsx',
    'matches-preview.tsx', 'onboarding-preview.tsx', 'profile-preview.tsx',
    'result-preview.tsx', 'shop-preview.tsx', 'social-preview.tsx',
  ];
}
function requireValue(key) {
  if (!process.env[key]?.trim()) failures.push(`variable de release absente: ${key}`);
}
function requirePattern(key, pattern) {
  const value = process.env[key]?.trim() ?? '';
  if (!pattern.test(value)) failures.push(`variable de release invalide: ${key}`);
}
function requireEmail(key) { requirePattern(key, /^[^\s@]+@[^\s@]+\.[^\s@]+$/); }
function requireFingerprints(key) {
  const values = (process.env[key] ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  const sha256 = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/i;
  if (!values.length || values.some((value) => !sha256.test(value))) failures.push(`empreinte Android invalide: ${key}`);
}
function requireHttpsOrigin(key) {
  try {
    const url = new URL(process.env[key] ?? '');
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) throw new Error();
  } catch { failures.push(`origine HTTPS de release invalide: ${key}`); }
}
function requirePngDimensions(path, expectedWidth, expectedHeight) {
  try {
    const data = readFileSync(resolve(root, path));
    const signature = data.subarray(0, 8).toString('hex');
    if (signature !== '89504e470d0a1a0a') throw new Error('signature');
    const width = data.readUInt32BE(16);
    const height = data.readUInt32BE(20);
    if (width !== expectedWidth || height !== expectedHeight) {
      failures.push(`dimensions invalides: ${path} (${width}x${height}, attendu ${expectedWidth}x${expectedHeight})`);
    }
  } catch {
    failures.push(`PNG illisible: ${path}`);
  }
}
