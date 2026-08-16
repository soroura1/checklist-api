#!/usr/bin/env node
/**
 * Conformance against the REAL service — this repository's half of the bargain.
 *
 * Consumers run the suite against the bundled double; this repo runs the SAME suite against
 * the actual server, and that pairing is what makes five repositories safe.
 *
 * Two modes:
 *
 *   CONFORMANCE_TARGET set   → the service is already running somewhere; just run the suite.
 *                              (The manual G3 flow, unchanged.)
 *   CONFORMANCE_TARGET unset → self-contained: migrate the test database, boot the server as
 *                              the application role, run the suite, tear down. This is the CI
 *                              path — the workflow's Postgres service container provides the
 *                              database, same defaults as the test step.
 */

import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const suitePath = join(here, '../node_modules/@citadel/contracts/conformance/src/run.js');

function runSuite(target) {
  const r = spawnSync(process.execPath, [suitePath], {
    env: { ...process.env, CONFORMANCE_TARGET: target },
    stdio: 'inherit',
  });
  return r.status ?? 1;
}

if (process.env.CONFORMANCE_TARGET) {
  process.exit(runSuite(process.env.CONFORMANCE_TARGET));
}

// --- Self-contained mode: same database defaults as the CI test step. ---
const db = {
  host: process.env.TEST_DB_HOST ?? 'localhost',
  port: process.env.TEST_DB_PORT ?? '5432',
  name: process.env.TEST_DB_NAME ?? 'citadel_test',
  ownerUser: process.env.TEST_OWNER_USER ?? 'postgres',
  ownerPassword: process.env.TEST_OWNER_PASSWORD ?? 'test',
  appPassword: process.env.TEST_APP_PASSWORD ?? 'apptest',
};

const migrate = spawnSync(process.execPath, [join(here, '../src/migrate.js')], {
  env: {
    ...process.env,
    DB_HOST: db.host, DB_PORT: db.port, DB_NAME: db.name,
    OWNER_DB_USER: db.ownerUser, OWNER_DB_PASSWORD: db.ownerPassword,
    APP_DB_PASSWORD: db.appPassword,
  },
  stdio: 'inherit',
});
if (migrate.status !== 0) {
  console.error('conformance-live: migration failed — is a test database reachable? ' +
    'Set TEST_DB_* to point at one, or CONFORMANCE_TARGET at a running service.');
  process.exit(migrate.status ?? 1);
}

const port = Number(process.env.CONFORMANCE_PORT ?? 8091);
const server = spawn(process.execPath, [join(here, '../src/server.js')], {
  env: {
    ...process.env,
    DB_HOST: db.host, DB_PORT: db.port, DB_NAME: db.name,
    APP_DB_USER: 'checklist_app', APP_DB_PASSWORD: db.appPassword,
    PORT: String(port), HOST: '127.0.0.1',
  },
  stdio: ['ignore', 'inherit', 'inherit'],
});

const stop = () => { if (server.exitCode === null) server.kill('SIGTERM'); };
process.on('exit', stop);

const target = `http://localhost:${port}`;
const until = Date.now() + 15_000;
let healthy = false;
while (Date.now() < until) {
  try {
    const res = await fetch(`${target}/health`);
    if (res.ok) { healthy = true; break; }
  } catch { /* not up yet */ }
  if (server.exitCode !== null) break;
  await new Promise((r) => setTimeout(r, 200));
}
if (!healthy) {
  console.error(`conformance-live: service did not become healthy at ${target}`);
  stop();
  process.exit(1);
}

const code = runSuite(target);
stop();
process.exit(code);
