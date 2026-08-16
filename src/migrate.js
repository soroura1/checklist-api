#!/usr/bin/env node
/**
 * The migration runner.
 *
 * Deliberately small and hand-written. The plan's requirements are unusual enough that no
 * off-the-shelf tool does them, and ~150 lines is cheaper than fighting one:
 *
 *   · a CHECKSUM per applied migration, so a deployed file that is edited is caught
 *   · a ledger the application role CANNOT read or write
 *   · connects as the PRIVILEGED account — migrations and nothing else
 *
 * Run:  node src/migrate.js            apply pending
 *       node src/migrate.js --status   show what is applied
 */

import postgres from 'postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '../migrations');
const checksum = (text) => createHash('sha256').update(text).digest('hex');

function migrations() {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => {
      const text = readFileSync(join(migrationsDir, name), 'utf8');
      return { name, text, checksum: checksum(text) };
    });
}

/**
 * The PRIVILEGED connection. Migrations are the only thing that uses it.
 *
 * The application connects as `checklist_app` — an ordinary role with no superuser bit and no
 * BYPASSRLS — because row-level security does not apply to a superuser, and the standard Postgres
 * image creates the default account as one.
 */
function ownerConnection() {
  const need = (k) => {
    const v = process.env[k];
    if (!v) {
      console.error(`Missing ${k}. Migrations need the privileged account, not the app role.`);
      process.exit(2);
    }
    return v;
  };
  return postgres({
    host: need('DB_HOST'),
    port: Number(process.env.DB_PORT ?? 5432),
    database: need('DB_NAME'),
    username: need('OWNER_DB_USER'),
    password: need('OWNER_DB_PASSWORD'),
    max: 1,
    onnotice: () => {},
  });
}

async function ensureLedger(sql) {
  await sql`
    create table if not exists schema_migration (
      name        text primary key,
      checksum    text not null,
      applied_at  timestamptz not null default now()
    )`;
  // The ledger is the owner's. The application role has no access to it at all —
  // it holds exactly the data verbs on exactly the application tables.
  await sql`revoke all on schema_migration from public`;
}

async function status(sql) {
  const applied = new Map((await sql`select name, checksum from schema_migration`).map((r) => [r.name, r.checksum]));
  const rows = migrations().map((m) => {
    const was = applied.get(m.name);
    return {
      name: m.name,
      state: !was ? 'pending' : was === m.checksum ? 'applied' : 'EDITED AFTER DEPLOY',
    };
  });
  for (const r of rows) console.log(`  ${r.state.padEnd(20)} ${r.name}`);
  return rows;
}

async function apply(sql) {
  await ensureLedger(sql);
  const applied = new Map((await sql`select name, checksum from schema_migration`).map((r) => [r.name, r.checksum]));

  for (const m of migrations()) {
    const was = applied.get(m.name);

    if (was && was !== m.checksum) {
      // A deployed migration is immutable. Every existing deployment stored the old
      // checksum; editing the file breaks all of them. Correct it with a NEW migration.
      console.error(
        `\n${m.name} has been EDITED since it was applied.\n` +
          `  applied checksum: ${was}\n` +
          `  current checksum: ${m.checksum}\n\n` +
          `A deployed migration is immutable. Write a new migration instead.`,
      );
      process.exit(1);
    }
    if (was) {
      console.log(`  skip     ${m.name}`);
      continue;
    }

    process.stdout.write(`  apply    ${m.name} … `);
    await sql.begin(async (tx) => {
      // The role password is supplied as a transaction-scoped setting rather than
      // written into the migration, so no credential is ever committed.
      const rolePassword = process.env.APP_DB_PASSWORD;
      if (rolePassword) {
        await tx.unsafe(`set local app.role_password = '${rolePassword.replace(/'/g, "''")}'`);
      }
      await tx.unsafe(m.text);
      await tx`insert into schema_migration (name, checksum) values (${m.name}, ${m.checksum})`;
    });
    console.log('ok');
  }
}

const sql = ownerConnection();
try {
  if (process.argv.includes('--status')) {
    await ensureLedger(sql);
    await status(sql);
  } else {
    await apply(sql);
    console.log('\nmigrations up to date');
  }
} catch (err) {
  console.error(`\nmigration failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
