import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkMobileImportBoundaries } from './mobile-import-boundaries.mjs';

const mobileRoot = '/workspace/mobile';
const importer = '/workspace/mobile/src/features/shop/catalog.ts';
const check = (source) => checkMobileImportBoundaries({ importer, source, mobileRoot });

test('detects Supabase aliases and relative imports, re-exports and requires', () => {
  for (const source of [
    "import { supabase } from '@/src/lib/supabase';",
    "export { supabase } from '../../lib/supabase/index';",
    "const client = require('../../lib/supabase/client.ts');",
    "const client = import('@/src/lib/supabase');",
  ]) assert.equal(check(source).importsSupabaseClient, true, source);
});

test('does not confuse similarly named modules or type packages with the client', () => {
  assert.equal(check("import x from '../../lib/supabaseHelpers';").importsSupabaseClient, false);
  assert.equal(check("import type { User } from '@supabase/supabase-js';").importsSupabaseClient, false);
});

test('identifies a domain import from a UI folder using either path spelling', () => {
  assert.equal(check("import type { Slot } from '../profile/components/scene';").importsComponents, true);
  assert.equal(check("import x from '@/src/components/ui/Button';").importsComponents, true);
});

test('allows domain contracts and illustration assets in a catalogue', () => {
  assert.equal(check("import type { Slot } from '../profile/showcase/roomEditor';").importsComponents, false);
  assert.equal(check("const image = require('../../../assets/components/example.png');").importsComponents, false);
});
