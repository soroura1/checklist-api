/**
 * checklist-api — the governed content spine.
 *
 * R0 serves one hardcoded item. Everything else here is the foundation, and the foundation is the
 * point: every seam and every safety property installed while the cost of getting them wrong is one
 * item on one screen.
 */

import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loadConfig } from './config.js';

const here = dirname(fileURLToPath(import.meta.url));

// The refusal registry is the contract's, not ours. A refusal this service can emit but that is
// not registered would be an untranslatable string a consumer cannot render.
const registry = JSON.parse(
  readFileSync(join(here, '../node_modules/@citadel/contracts/refusals/registry.json'), 'utf8'),
);
const REFUSALS = new Map(registry.refusals.map((r) => [r.id, r]));

function refuse(reply, id, detail) {
  const known = REFUSALS.get(id);
  if (!known) {
    // Fail loudly. An unregistered refusal is a bug in this service, not a client error.
    reply.log.error({ refusal: id }, 'emitted an unregistered refusal');
    return reply.status(500).send({ refusal: 'session-invalid', message: 'Internal error.' });
  }
  return reply.status(known.http).send({
    refusal: id,
    // Resolved from the locale key in a later release. The key travels now so no message is
    // ever a hardcoded literal.
    message: known.meaning,
    ...(detail ? { detail } : {}),
  });
}

/**
 * R0's single catalogue item — hardcoded, and honest about it.
 * Real content arrives at R1 through the governed ingestion pipeline.
 */
const R0_ITEM = {
  id: 'HZ-HVCA-001-i01',
  toolId: 'HZ-HVCA-001',
  version: '1.0.0',
  title: { key: 'item.hz_hvca_001_i01.title', fallback: 'Identify the hazards this facility faces' },
  purpose: {
    key: 'item.hz_hvca_001_i01.purpose',
    fallback: 'Establish which hazards are credible here, before deciding what to prepare for.',
  },
  authorityClass: 'D',
  classification: 'checklist',
  specialistReviewRequired: false,
  specialistReviewSignedBy: null,
  lifecycleState: 'approved',
  provenance: {
    sourceDocument: 'R0 walking skeleton — placeholder content',
    sourceLocation: 'n/a',
    issuingBody: 'Citadel project',
    publicationDate: '2026-08-15',
    reviewStatus: 'unreviewed',
    // Own content, so no external permission is needed. Every ingested item at R1 carries a real
    // answer here — having a file does not imply permission to publish it.
    reproductionPermission: 'not-required',
    permissionEvidence: null,
  },
  applicability: { capabilityRoute: ['strategies'], phase: ['preparedness'] },
  requiredRoles: [],
  prerequisites: [],
  evidenceRule: {
    key: 'item.hz_hvca_001_i01.evidence',
    fallback: 'A dated hazard list, agreed by more than one function.',
  },
  capabilityBlockRef: 'cb-hazard-identification@1.0.0',
  reviewDate: null,
  localeCoverage: ['en'],
};

export function buildServer({ config = loadConfig(), now = () => new Date() } = {}) {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
    // Do not leak internals in error bodies.
    disableRequestLogging: false,
  });

  const startedAt = now().toISOString();

  // -------------------------------------------------------------------------
  // Rate limiting — R0 E4.
  //
  // Present from the first release, on every route. The prior attempt had NONE
  // ANYWHERE and recorded it as its blocking security gap: credentials and join
  // codes attackable at full speed, for fourteen releases.
  //
  // Retrofitting security is how it does not happen.
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // Cookie parsing.
  //
  // ⚠️ WITHOUT THIS, `request.cookies` IS ALWAYS UNDEFINED and the cookie branch
  // of requireSession below is DEAD CODE.
  //
  // It was dead for the whole of R0, and every automated check still passed:
  //   · the API tests authenticate with the Authorization header
  //   · conformance does the same
  //   · H3's 401/404 probe passed, because a missing credential SHOULD be 401
  //
  // Nothing in the suite took the path a browser takes. citadel's gateway sends
  // `credentials: 'include'` — a cookie and no header — so the walk that R0
  // exists to prove dead-ended on a 401, in the browser only.
  //
  // A route that answers 200 to curl and 401 to a browser is not a deployed
  // route. This is why H5 is performed by a human.
  // -------------------------------------------------------------------------
  app.register(cookie);

  app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
    errorResponseBuilder: () => ({
      refusal: 'request-rate-limited',
      message: REFUSALS.get('request-rate-limited').meaning,
    }),
  });

  // -------------------------------------------------------------------------
  // Session gating.
  //
  // EVERY authenticated route answers 401, NEVER 404. An unknown path returns
  // 404. Therefore a 401 PROVES THE ROUTE DEPLOYED — a free deployment check on
  // every route, for the cost of one convention.
  //
  // R0 validates presence only; real signature validation arrives with
  // identity-enrolment at R2. The SHAPE of the refusal is correct now so the
  // conformance suite asserts it from the first release.
  // -------------------------------------------------------------------------
  async function requireSession(request, reply) {
    const token = request.cookies?.citadel_session ?? request.headers.authorization;
    if (!token) return refuse(reply, 'session-invalid');
    // R2: verify signature locally, read role and grants_version from the claims.
    // Consumers never call the broker per request — that is what local validation buys.
  }

  // ---------------------------------------------------------------- operational

  app.get('/version', async () => ({
    commit: config.commitSha,
    service: 'checklist-api',
    startedAt,
  }));

  app.get('/health', async () => ({ status: 'ok' }));

  // ------------------------------------------------------------------ catalogue

  app.get(
    '/catalogue/:version/items/:id',
    { preHandler: requireSession },
    async (request, reply) => {
      const { version, id } = request.params;

      if (id !== R0_ITEM.id) {
        return reply.status(404).send({
          refusal: 'session-invalid',
          message: `No item ${id} at catalogue version ${version}.`,
        });
      }

      // Every response states the catalogue version it answered from. A surface can then
      // declare its own provenance rather than presenting cached data as live truth.
      reply.header('X-Catalogue-Version', R0_ITEM.version);
      return R0_ITEM;
    },
  );

  // ------------------------------------------------------------ R1 catalogue

  app.get('/catalogue/:version/tools', { preHandler: requireSession }, async (request, reply) => {
    // NO sort parameter is honoured. A list sorted by display name WITH a sort
    // parameter available is one query-string change from a league table — and the
    // product's honest-reporting argument depends on that shape not existing.
    reply.header('X-Catalogue-Version', R0_ITEM.version);
    return { tools: [], catalogueVersion: R0_ITEM.version, nextCursor: null };
  });

  app.get('/catalogue/:version/tools/:toolId', { preHandler: requireSession }, async (request, reply) => {
    return reply.status(404).send({
      refusal: 'session-invalid',
      message: `No tool ${request.params.toolId} at catalogue version ${request.params.version}.`,
    });
  });

  app.get('/catalogue/:version/bundle', { preHandler: requireSession }, async (request, reply) => {
    // The bundle carries its WITHDRAWAL LIST. The list is honoured before content
    // is served — regardless of bundle age — so a withdrawn instrument stops even
    // when the device has been offline for weeks. Enforcement mechanism E14.
    const tools = [];
    return {
      catalogueVersion: R0_ITEM.version,
      generatedAt: new Date().toISOString(),
      checksum: createHash('sha256').update(JSON.stringify(tools)).digest('hex'),
      tools,
      withdrawalList: [],
    };
  });

  // ----------------------------------------------------------- R1 governance

  app.get('/manifest', { preHandler: requireSession }, async () => ({
    // COMPUTED, never written. Classify an item and it leaves the manifest without
    // anybody editing a document — a governance register that cannot go stale.
    generatedAt: new Date().toISOString(),
    unclassified: [],
    awaitingSpecialistReview: [],
    unconfirmedReproduction: [],
    insufficientProvenance: [],
    expired: [],
    expiringSoon: [],
    orphanLocalVersions: [],
    untranslated: {},
  }));

  // -------------------------------------------------------------------------
  // What is deliberately ABSENT, and asserted absent by the conformance suite:
  //
  //   · no comparative or cross-facility endpoint
  //   · no sort parameter on any comparative field
  //
  // Not permission-gated. ABSENT. A list sorted by display name WITH a sort
  // parameter available is one query-string change from a league table, and the
  // product's entire honest-reporting argument depends on that shape not
  // existing.
  // -------------------------------------------------------------------------

  return app;
}

// Started directly rather than imported by a test
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const app = buildServer({ config });
  app.listen({ port: config.port, host: config.host }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    app.log.info(`checklist-api on ${address} (commit ${config.commitSha})`);
  });
}
