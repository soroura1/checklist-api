#!/usr/bin/env node
/**
 * Wait for the CI Postgres service before anything touches it.
 *
 * Woodpecker starts services ALONGSIDE the steps, not before them, so the first
 * database consumer races the database and loses. The race does not report as a
 * race: it surfaces as a migration "connection refused" or a test-runner "no
 * tests found" — a confusing hat on a simple problem. This script makes the
 * wait explicit.
 *
 * Postgres briefly opens and closes its port during initdb, so one successful
 * connect is not proof of readiness — we require two, a beat apart.
 */

import net from 'node:net';

const host = process.env.TEST_DB_HOST ?? 'localhost';
const port = Number(process.env.TEST_DB_PORT ?? 5432);
const deadline = Date.now() + 90_000;

const tryConnect = () =>
  new Promise((resolve) => {
    const s = net.connect(port, host);
    s.once('connect', () => { s.end(); resolve(true); });
    s.once('error', () => { s.destroy(); resolve(false); });
  });

let confirmations = 0;
while (Date.now() < deadline) {
  if (await tryConnect()) {
    confirmations += 1;
    if (confirmations >= 2) {
      console.log(`db reachable at ${host}:${port}`);
      process.exit(0);
    }
  } else {
    confirmations = 0;
  }
  await new Promise((r) => setTimeout(r, 1200));
}

console.error(`db not reachable at ${host}:${port} within 90s`);
process.exit(1);
