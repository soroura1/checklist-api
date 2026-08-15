/**
 * checklist-api — the governed content spine.
 *
 * R0 serves one hardcoded item. Everything else here is the foundation, and the foundation is the
 * point: every seam and every safety property installed while the cost of getting them wrong is one
 * item on one screen.
 */

import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { readFileSync } from 'node:fs';
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
