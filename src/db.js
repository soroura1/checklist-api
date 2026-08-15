/**
 * Database access.
 *
 * There is exactly ONE way to reach tenant-scoped data: `withTenant()`. A query issued outside it
 * sees zero rows, deliberately.
 *
 * No ORM. The plan forbids one that hides the tenant context — the wrapper must be impossible to
 * forget, which means it must be the only door.
 */

import postgres from 'postgres';

/**
 * The APPLICATION connection.
 *
 * Connects as `checklist_app` — an ordinary role with no superuser bit and no BYPASSRLS.
 *
 * ⚠️ This is not a detail. Row-level security does not apply to a superuser, and the official
 * Postgres image creates POSTGRES_USER as one. Connecting as the owner would leave every policy
 * present, correct, visible in \d, and worth nothing.
 */
export function createAppConnection(config) {
  return postgres({
    host: config.dbHost,
    port: config.dbPort,
    database: config.dbName,
    username: config.appDbUser,       // checklist_app — NOT the owner
    password: config.appDbPassword,
    max: config.dbPoolMax,
    onnotice: () => {},
  });
}

/**
 * The PRIVILEGED connection — migrations and nothing else.
 */
export function createOwnerConnection(config) {
  return postgres({
    host: config.dbHost,
    port: config.dbPort,
    database: config.dbName,
    username: config.ownerDbUser,
    password: config.ownerDbPassword,
    max: 1,
    onnotice: () => {},
  });
}

/**
 * Run work inside a transaction with the tenant established.
 *
 * The tenant is set with `true` — TRANSACTION-SCOPED. A pooled connection therefore cannot carry
 * one request's tenant into the next, which is the failure mode that makes pooling and RLS
 * dangerous together.
 *
 * @param sql       an APPLICATION connection (never the owner)
 * @param facilityId the tenant
 * @param work      receives the transaction handle
 */
export async function withTenant(sql, facilityId, work) {
  if (!facilityId) {
    // Refuse loudly rather than running with no tenant. Without this the query would
    // silently match nothing, which is safe but very hard to debug.
    const err = new Error('withTenant called without a facility');
    err.refusal = 'participation-requires-facility-seat';
    throw err;
  }
  return sql.begin(async (tx) => {
    await tx`select set_config('app.facility_id', ${facilityId}, true)`;
    return work(tx);
  });
}

/**
 * Read GLOBAL content — the catalogue. Not tenant-scoped, and deliberately not pretending to be.
 *
 * Adding a tenant column to genuinely shared content creates confusion about what is shared and
 * invites a filter that silently hides content.
 */
export async function readCatalogue(sql, work) {
  return work(sql);
}
