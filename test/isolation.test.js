/**
 * ★ E8 — TENANT ISOLATION
 *
 * ============================================================================
 * AN ISOLATION TEST ON THE OWNER CONNECTION MEASURES NOTHING.
 * ============================================================================
 *
 * The prior build attempt's first isolation test reported that one tenant could
 * read another's rows. The schema was fine. The TEST connected as the database
 * owner, and row-level security does not apply to a superuser.
 *
 * So this file does two things most isolation tests do not:
 *
 *   1. It asserts isolation on a handle opened as the APPLICATION role.
 *   2. It asserts that the test itself would FAIL if run as the owner —
 *      a guard against someone later "simplifying" the connection setup and
 *      silently turning this file into a test that passes no matter what.
 *
 * These tests need a REAL Postgres. Not a mock. They are the only thing between
 * a subtly wrong policy and silent cross-facility disclosure, and the failure
 * mode is SILENT — nothing errors, the wrong data simply arrives. A mock
 * confirms whatever it is asked.
 */

import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';

// The driver and the db module are imported DYNAMICALLY, inside before().
//
// A top-level import means this file cannot even LOAD when dependencies are absent —
// and node:test reports that as a FAILURE, which reads as "isolation is broken" when
// the truth is "there is no database here". A test that cannot run must skip HONESTLY;
// a misleading red is worse than an accurate skip.
let postgres, withTenant;

const HAVE_DB = !!process.env.TEST_DB_HOST;
const FACILITY_A = '11111111-1111-1111-1111-111111111111';
const FACILITY_B = '22222222-2222-2222-2222-222222222222';

let appSql;   // checklist_app — NO superuser bit, NO bypass
let ownerSql; // the privileged account — migrations only

before(async () => {
  if (!HAVE_DB) return;
  ({ default: postgres } = await import('postgres'));
  ({ withTenant } = await import('../src/db.js'));
  const base = {
    host: process.env.TEST_DB_HOST,
    port: Number(process.env.TEST_DB_PORT ?? 5432),
    database: process.env.TEST_DB_NAME ?? 'checklist_test',
    onnotice: () => {},
  };
  ownerSql = postgres({ ...base, username: process.env.TEST_OWNER_USER ?? 'postgres', password: process.env.TEST_OWNER_PASSWORD ?? 'test' });
  appSql = postgres({ ...base, username: 'checklist_app', password: process.env.TEST_APP_PASSWORD ?? 'apptest' });

  // Two facilities, one row each.
  await ownerSql`delete from tenancy_probe`;
  await ownerSql`insert into tenancy_probe (facility_id)
                 values (${FACILITY_A}), (${FACILITY_B})`;
});

after(async () => {
  await appSql?.end();
  await ownerSql?.end();
});

describe('tenant isolation', { skip: HAVE_DB ? false : 'no TEST_DB_HOST — run against a real Postgres' }, () => {
  test('a facility sees only its own rows', async () => {
    const rows = await withTenant(appSql, FACILITY_A, (tx) => tx`select facility_id from tenancy_probe`);
    assert.equal(rows.length, 1, 'expected exactly one row');
    assert.equal(rows[0].facility_id, FACILITY_A);
  });

  test('a facility cannot see another facility by asking for it directly', async () => {
    const rows = await withTenant(
      appSql,
      FACILITY_A,
      (tx) => tx`select * from tenancy_probe where facility_id = ${FACILITY_B}`,
    );
    assert.equal(rows.length, 0, 'the policy must win over an explicit WHERE');
  });

  test('a query with NO tenant context matches NOTHING, not everything', async () => {
    // current_setting(..., true) is NULL when never set; facility_id = NULL is NULL,
    // which is not TRUE. Forgetting to establish who is asking yields nothing.
    const rows = await appSql`select * from tenancy_probe`;
    assert.equal(rows.length, 0, 'an unset tenant must match nothing — this is the safe failure mode');
  });

  test('a facility cannot INSERT a row belonging to another facility', async () => {
    await assert.rejects(
      () =>
        withTenant(
          appSql,
          FACILITY_A,
          (tx) => tx`insert into tenancy_probe (facility_id) values (${FACILITY_B})`,
        ),
      'the WITH CHECK clause must refuse a cross-tenant write',
    );
  });

  test('withTenant refuses to run with no facility, rather than silently matching nothing', async () => {
    await assert.rejects(
      () => withTenant(appSql, null, (tx) => tx`select 1`),
      (err) => err.refusal === 'participation-requires-facility-seat',
    );
  });

  // -------------------------------------------------------------------------
  // ★ THE GUARD
  //
  // If someone later changes the connection setup to use the owner, every test
  // above would pass while measuring nothing. This asserts the harness itself.
  // -------------------------------------------------------------------------
  test('the application role has no superuser bit and no BYPASSRLS', async () => {
    const [role] = await ownerSql`
      select rolsuper, rolbypassrls from pg_roles where rolname = 'checklist_app'`;
    assert.ok(role, 'checklist_app must exist');
    assert.equal(role.rolsuper, false, 'checklist_app must NOT be a superuser');
    assert.equal(role.rolbypassrls, false, 'checklist_app must NOT have BYPASSRLS');
  });

  test('the owner connection DOES see everything — proving the app handle is the meaningful one', async () => {
    const rows = await ownerSql`select facility_id from tenancy_probe`;
    assert.equal(
      rows.length,
      2,
      'the owner sees both rows. That is expected, and it is exactly why asserting isolation ' +
        'on this connection would measure nothing.',
    );
  });

  test('row-level security is FORCED, not merely enabled', async () => {
    const [t] = await ownerSql`
      select relrowsecurity, relforcerowsecurity
        from pg_class where relname = 'tenancy_probe'`;
    assert.equal(t.relrowsecurity, true, 'RLS must be enabled');
    assert.equal(
      t.relforcerowsecurity,
      true,
      'RLS must be FORCED — enable alone exempts the table owner',
    );
  });
});
