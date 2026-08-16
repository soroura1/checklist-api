/**
 * The session gate, exercised from BOTH sides.
 *
 * ============================================================================
 * WHY THIS FILE EXISTS — a defect that survived R0 with every check green
 * ============================================================================
 *
 * `requireSession` reads a credential from two places:
 *
 *     request.cookies?.citadel_session ?? request.headers.authorization
 *
 * The cookie branch was DEAD for the whole of R0. `@fastify/cookie` was never
 * registered, so `request.cookies` was always `undefined`.
 *
 * Nothing caught it, because NOTHING EVER PRESENTED A CREDENTIAL:
 *
 *   · this repo had no tests of the HTTP surface at all
 *   · the conformance suite asserts only the 401 side — it never sends one
 *   · H3's 401/404 probe passed, because a MISSING credential SHOULD be 401
 *
 * So the route answered 200 to curl (which sends a header) and 401 to a
 * browser (which sends a cookie). citadel's gateway uses
 * `credentials: 'include'` — cookie, no header — so the walk R0 exists to
 * prove dead-ended on a 401, in the browser only.
 *
 * ★ THE ASSERTION THAT MATTERS IS THE POSITIVE ONE.
 *
 * A refusal test alone cannot distinguish "refuses correctly" from "refuses
 * everything". These tests present a credential in EACH accepted form and
 * require 200 — so removing the cookie plugin fails here rather than in a
 * browser two releases later.
 *
 * Same shape as the isolation suite, where "the owner connection DOES see
 * everything" is what gives the application-role assertions their meaning.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/server.js';

const ITEM = '/catalogue/1.0.0/items/HZ-HVCA-001-i01';

// The route under test serves a hardcoded item and never reaches the database,
// so the config only has to be well-formed. Nothing here connects to Postgres.
const config = Object.freeze({
  dbHost: 'unused', dbName: 'unused', appDbUser: 'unused', appDbPassword: 'unused',
  dbPort: 5432, port: 0, host: '127.0.0.1', dbPoolMax: 1, ownerDbUser: null,
  commitSha: 'test', rateLimitMax: 1000, rateLimitWindow: '1 minute',
});

const server = () => buildServer({ config });

test('no credential is refused — 401, never 404', async () => {
  const app = server();
  const res = await app.inject({ method: 'GET', url: ITEM });
  assert.equal(res.statusCode, 401);
  assert.equal(res.json().refusal, 'session-invalid');
  await app.close();
});

test('an unknown path is 404 — which is what makes the 401 above meaningful', async () => {
  const app = server();
  const res = await app.inject({ method: 'GET', url: '/no-such-route' });
  assert.equal(res.statusCode, 404);
  await app.close();
});

test('★ a COOKIE credential is accepted — the path a browser actually takes', async () => {
  const app = server();
  const res = await app.inject({
    method: 'GET',
    url: ITEM,
    cookies: { citadel_session: 'r0-placeholder' },
  });
  assert.equal(
    res.statusCode,
    200,
    'the cookie branch of requireSession is dead — is @fastify/cookie registered?',
  );
  assert.equal(res.json().id, 'HZ-HVCA-001-i01');
  await app.close();
});

test('★ an Authorization header is accepted — the path curl and conformance take', async () => {
  const app = server();
  const res = await app.inject({
    method: 'GET',
    url: ITEM,
    headers: { authorization: 'r0-placeholder' },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().id, 'HZ-HVCA-001-i01');
  await app.close();
});

test('the item carries its catalogue version, so a surface can state provenance', async () => {
  const app = server();
  const res = await app.inject({
    method: 'GET', url: ITEM, cookies: { citadel_session: 'r0-placeholder' },
  });
  assert.equal(res.headers['x-catalogue-version'], '1.0.0');
  await app.close();
});

test('an authenticated request for an item that does not exist is 404, not 401', async () => {
  const app = server();
  const res = await app.inject({
    method: 'GET',
    url: '/catalogue/1.0.0/items/NOPE-001',
    cookies: { citadel_session: 'r0-placeholder' },
  });
  assert.equal(res.statusCode, 404);
  await app.close();
});
