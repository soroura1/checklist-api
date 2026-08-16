/**
 * ★ R1 F4 — migration rehearsal.
 *
 * See rehearsal.md. Both migration lists are bounded, so adding 003 later cannot
 * silently change what this rehearsal tests.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../migrations');
const BEFORE = ['001_catalogue.sql'];                          // exactly R0
const AFTER  = ['001_catalogue.sql', '002_governance.sql'];    // exactly R1

const HAVE_DB = !!process.env.TEST_DB_HOST;

// ⚠️ A DEDICATED database, never TEST_DB_NAME.
//
// A rehearsal run against a database that ALREADY has the after-state tests
// nothing — every assertion passes because the migrations were applied long ago.
// The whole point is to construct the BEFORE state deliberately.
const REHEARSAL_DB = process.env.REHEARSAL_DB_NAME ?? 'rehearsal';

let postgres, sql, admin;

before(async () => {
  if (!HAVE_DB) return;
  ({ default: postgres } = await import('postgres'));
  const base = {
    host: process.env.TEST_DB_HOST,
    port: Number(process.env.TEST_DB_PORT ?? 5432),
    username: process.env.TEST_OWNER_USER ?? 'postgres',
    password: process.env.TEST_OWNER_PASSWORD ?? 'test',
    onnotice: () => {},
  };

  // Drop and recreate, so a rehearsal always starts from nothing.
  admin = postgres({ ...base, database: 'postgres', max: 1 });
  await admin`drop database if exists ${admin(REHEARSAL_DB)}`;
  await admin`create database ${admin(REHEARSAL_DB)}`;

  // max: 1 — the migration files contain their own `begin;`/`commit;`, and the
  // driver refuses a transaction spanning a pooled connection. Migrations are
  // single-connection work anyway.
  sql = postgres({ ...base, database: REHEARSAL_DB, max: 1 });
});

after(async () => {
  await sql?.end();
  if (admin) {
    await admin`drop database if exists ${admin(REHEARSAL_DB)}`;
    await admin.end();
  }
});

describe('migration rehearsal', { skip: HAVE_DB ? false : 'no TEST_DB_HOST — needs a real Postgres' }, () => {
  test('the BEFORE list is exactly the previous release — bounding one list only looks scoped', () => {
    assert.deepEqual(BEFORE, ['001_catalogue.sql']);
  });

  test('no existing row moves, and no pre-existing policy changes', async () => {
    // 1. Build the before-state and populate it.
    for (const f of BEFORE) await sql.unsafe(readFileSync(join(dir, f), 'utf8'));
    const facility = '11111111-1111-1111-1111-111111111111';
    await sql`insert into tenancy_probe (facility_id, note)
              values (${facility}, 'pre-existing row — must not move')`;
    const rowsBefore = await sql`select * from tenancy_probe order by id`;
    const policiesBefore = await sql`
      select schemaname, tablename, policyname, qual, with_check
        from pg_policies order by tablename, policyname`;

    // 2. Apply ONLY the new migrations.
    for (const f of AFTER.filter((x) => !BEFORE.includes(x))) {
      await sql.unsafe(readFileSync(join(dir, f), 'utf8'));
    }

    // 3. Nothing moved.
    const rowsAfter = await sql`select * from tenancy_probe order by id`;
    assert.deepEqual(rowsAfter, rowsBefore, 'a migration moved an existing row');

    // 4. No pre-existing policy changed — byte for byte.
    const policiesAfter = await sql`
      select schemaname, tablename, policyname, qual, with_check
        from pg_policies order by tablename, policyname`;
    for (const b of policiesBefore) {
      const a = policiesAfter.find((x) => x.tablename === b.tablename && x.policyname === b.policyname);
      assert.ok(a, `policy ${b.tablename}.${b.policyname} disappeared`);
      assert.deepEqual(a, b,
        `policy ${b.tablename}.${b.policyname} CHANGED. If a new feature needs an existing policy ` +
        `widened, the design was wrong — stop rather than widen.`);
    }
  });
});
