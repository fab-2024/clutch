import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  resolveLocalDatabaseContainer,
  runLocalSql,
} from './local-supabase-sql.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contractFiles = [
  'supabase/tests/p0_mobile_contracts.sql',
  'supabase/tests/security_hardening_contracts.sql',
  'supabase/tests/cosmetic_shop.sql',
  'supabase/tests/monetization_contract.sql',
  'supabase/tests/catalog_inventory_equipment_v2.sql',
  'supabase/tests/volts_economy_ledger_v2.sql',
  'supabase/tests/neon_protocol_pack.sql',
  'supabase/tests/privacy_analytics_partner_campaign.sql',
  'supabase/tests/founder_pack_iap.sql',
  'supabase/tests/match_result_reliability.sql',
  'supabase/tests/pandascore_sync_contract.sql',
  'supabase/tests/release_readiness_privacy.sql',
  'supabase/tests/block_b_core_beta.sql',
  'supabase/tests/rank_grade_scale_v2.sql',
  'supabase/tests/griff_visible_brand.sql',
];
const containerName = await resolveLocalDatabaseContainer(repositoryRoot);

for (const relativePath of contractFiles) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  const sql = await readFile(absolutePath, 'utf8');
  const result = await runLocalSql({
    containerName,
    cwd: repositoryRoot,
    label: relativePath,
    sql,
  });

  if (result.stdout.trim()) {
    console.log(result.stdout.trim());
  }
  if (result.stderr.trim()) {
    console.error(result.stderr.trim());
  }
  console.log(`${relativePath}: OK`);
}
