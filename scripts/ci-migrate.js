#!/usr/bin/env node
/**
 * pretest — apply migrations when a test database is present.
 *
 * The tests connect to an ALREADY-MIGRATED database (the isolation suite opens a handle as
 * `checklist_app`, which the migration creates). Locally that was a documented manual step;
 * in CI nothing ran it, so the first-ever CI run would have failed here. npm runs this
 * automatically before `npm test`.
 *
 * No TEST_DB_HOST means no database — the tests skip themselves, so this skips too.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

if (!process.env.TEST_DB_HOST) {
  console.log('pretest: no TEST_DB_HOST — tests will skip the database suites, nothing to migrate');
  process.exit(0);
}

const here = dirname(fileURLToPath(import.meta.url));

// The TEST_* names the tests read, mapped to the names migrate.js reads.
const env = {
  ...process.env,
  DB_HOST: process.env.TEST_DB_HOST,
  DB_PORT: process.env.TEST_DB_PORT ?? '5432',
  DB_NAME: process.env.TEST_DB_NAME ?? 'checklist_test',
  OWNER_DB_USER: process.env.TEST_OWNER_USER ?? 'postgres',
  OWNER_DB_PASSWORD: process.env.TEST_OWNER_PASSWORD ?? 'test',
  APP_DB_PASSWORD: process.env.TEST_APP_PASSWORD ?? 'apptest',
};

const r = spawnSync(process.execPath, [join(here, '../src/migrate.js')], { env, stdio: 'inherit' });
process.exit(r.status ?? 1);
