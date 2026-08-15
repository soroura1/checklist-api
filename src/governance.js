/**
 * Governance — the service layer over the shared lifecycle rules.
 *
 * The RULES live in `@citadel/contracts/rules` because both consumers must predict them to render
 * honestly. This file is the part that touches the database: it reads state, asks the rules, and
 * writes the outcome. It contains no rule of its own.
 *
 * If you find yourself writing an `if` here that decides whether something is permitted, it belongs
 * in the rules module instead — a rule implemented in two places will diverge, and both copies will
 * look correct.
 */

import {
  canTransition, canEdit, canApprove, canExecute, canPublish,
} from '@citadel/contracts/rules';

export class RefusalError extends Error {
  constructor(refusal, detail) {
    super(refusal);
    this.refusal = refusal;
    this.detail = detail;
  }
}

const guard = (result) => {
  if (!result.ok) throw new RefusalError(result.refusal);
};

/** Hydrate a tool row plus the editor list the separation rule needs. */
async function loadTool(sql, toolId, version) {
  const [row] = await sql`
    select * from catalogue_tool where tool_id = ${toolId} and version = ${version}`;
  if (!row) return null;
  const editors = await sql`
    select editor_id from catalogue_tool_editor
     where tool_id = ${toolId} and version = ${version}`;
  return {
    id: row.tool_id,
    version: row.version,
    lifecycleState: row.lifecycle_state,
    classification: row.classification,
    authorityClass: row.authority_class,
    riskTier: row.risk_tier,
    specialistReviewRequired: row.specialist_review_required,
    specialistReviewSignedBy: row.specialist_review_signed_by,
    withdrawnAt: row.withdrawn_at,
    provenance: row.provenance,
    editorial: {
      editors: editors.map((e) => e.editor_id),
      submittedBy: row.created_by,
    },
    _row: row,
  };
}

/**
 * Edit a draft.
 *
 * The rules refuse an edit to a published version, and migration 002 has a trigger that refuses it
 * again at the database. **Both, deliberately** — a rule enforced only in application code is one
 * forgotten call away from not being enforced.
 */
export async function editDraft(sql, { toolId, version, actorId, changes }) {
  const tool = await loadTool(sql, toolId, version);
  if (!tool) throw new RefusalError('unknown-lifecycle-state');
  guard(canEdit(tool));

  await sql`
    update catalogue_tool
       set title_key = coalesce(${changes.titleKey ?? null}, title_key),
           purpose_key = coalesce(${changes.purposeKey ?? null}, purpose_key),
           classification = coalesce(${changes.classification ?? null}, classification),
           risk_tier = coalesce(${changes.riskTier ?? null}, risk_tier),
           provenance = coalesce(${changes.provenance ?? null}::jsonb, provenance)
     where tool_id = ${toolId} and version = ${version}`;

  // Record the editor. This is what makes separation cover EDITORS rather than
  // only the recorded author.
  await sql`
    insert into catalogue_tool_editor (tool_id, version, editor_id)
    values (${toolId}, ${version}, ${actorId})
    on conflict do nothing`;

  return { ok: true };
}

/** Move a version through the lifecycle. `canTransition` is the only way to move. */
export async function transition(sql, { toolId, version, to, actorId, reason }) {
  const tool = await loadTool(sql, toolId, version);
  if (!tool) throw new RefusalError('unknown-lifecycle-state');

  if (to === 'approved') {
    // ★ Separation covers anybody who EDITED the version, not merely its author.
    guard(canApprove(tool, actorId));
    // Provenance and reproduction permission are gates on PUBLICATION, checked here
    // rather than at read time — content that cannot be published must not become
    // approved and then be discovered unpublishable.
    guard(canPublish(tool));
  } else {
    guard(canTransition(tool.lifecycleState, to));
  }

  await sql.begin(async (tx) => {
    await tx`update catalogue_tool set lifecycle_state = ${to}
              where tool_id = ${toolId} and version = ${version}`;
    await tx`insert into catalogue_tool_transition (tool_id, version, from_state, to_state, actor_id, reason)
             values (${toolId}, ${version}, ${tool.lifecycleState}, ${to}, ${actorId}, ${reason ?? null})`;
  });

  return { ok: true, from: tool.lifecycleState, to };
}

/**
 * Withdraw published content.
 *
 * Every publication surface has a withdrawal path. The prior attempt had two lifecycles, one of
 * which had no terminal state: content could be deprecated editorially and remain published
 * indefinitely.
 *
 * Withdrawn content stays READABLE — the record matters — and stops being EXECUTABLE.
 */
export async function withdraw(sql, { toolId, version, actorId, reason }) {
  const tool = await loadTool(sql, toolId, version);
  if (!tool) throw new RefusalError('unknown-lifecycle-state');

  await sql.begin(async (tx) => {
    await tx`update catalogue_tool set withdrawn_at = now()
              where tool_id = ${toolId} and version = ${version}`;
    await tx`insert into catalogue_tool_transition (tool_id, version, from_state, to_state, actor_id, reason)
             values (${toolId}, ${version}, ${tool.lifecycleState}, 'withdrawn', ${actorId}, ${reason ?? null})`;
  });

  return { ok: true };
}

/**
 * Local adaptation — NOT IN R1.
 *
 * ============================================================================
 * REMOVED DELIBERATELY. A local adaptation is FACILITY-SCOPED — it needs a seat,
 * and identity arrives at R2.
 * ============================================================================
 *
 * An earlier draft implemented `adaptLocally()` here, taking a `facilityId` that
 * CANNOT EXIST in R1. It was unreachable code: nothing could ever call it.
 *
 * The R1 plan says so plainly — "runs, local adaptation records and sync → R2,
 * they need a facility seat" — and a task list said otherwise. The plan was
 * right; the code followed the task list.
 *
 * What DOES stay in R1, deliberately:
 *   · the `parent_*` columns on catalogue_tool — nullable, no name-collision
 *     trap, and they document where the rule will be enforced
 *   · `adaptation_may_not_claim_parent_authority` — the constraint is correct
 *     now and will be load-bearing the moment adaptation exists
 *   · `adaptedAuthorityClass()` in the shared rules, with its tests
 *
 * Columns and constraints are cheap to add early and safe to leave. CODE for an
 * unbuilt feature is not — it looks callable.
 *
 * Restore at R2, alongside runs and facility history.
 */

/**
 * Read a tool for a CONSUMER.
 *
 * Returns the tool plus whether it may be EXECUTED and why not — so a surface can render it
 * readable-but-disabled with an explanation, rather than either hiding it or pretending it is
 * usable.
 */
export async function readForConsumer(sql, { toolId, version }) {
  const tool = await loadTool(sql, toolId, version);
  if (!tool) return null;
  if (tool.lifecycleState !== 'approved') return null;   // drafts are invisible to consumers

  const executable = canExecute(tool);
  return {
    tool: tool._row,
    executable: executable.ok,
    refusal: executable.ok ? null : executable.refusal,
  };
}

/**
 * ★ THE COMPUTED GOVERNANCE MANIFEST
 *
 * ============================================================================
 * DERIVED FROM THE INVENTORY. NEVER WRITTEN.
 * ============================================================================
 *
 * Classify an item and it leaves the manifest — without anybody editing a
 * document. A governance register that cannot go stale.
 *
 * The prior attempt tracked this kind of debt in prose, and the prose was wrong:
 * a campaign matrix carried four incorrect item counts and a right total.
 */
export async function governanceManifest(sql, { now = new Date(), soonDays = 60 } = {}) {
  const soon = new Date(now.getTime() + soonDays * 86_400_000);

  const [unclassified, awaitingSpecialist, unconfirmed, insufficient, expired, expiringSoon, orphans] =
    await Promise.all([
      sql`select tool_id, version from catalogue_tool where classification = 'unclassified'`,
      sql`select tool_id, version from catalogue_tool
           where specialist_review_required and specialist_review_signed_by is null`,
      sql`select tool_id, version from catalogue_tool
           where provenance->>'reproductionPermission' not in ('confirmed','not-required')`,
      sql`select tool_id, version from catalogue_tool
           where provenance->>'sourceDocument' is null
              or provenance->>'sourceLocation' is null
              or provenance->>'issuingBody' is null
              or provenance->>'publicationDate' is null`,
      sql`select tool_id, version from catalogue_tool
           where (provenance->>'reviewDate')::date < ${now}`,
      sql`select tool_id, version from catalogue_tool
           where (provenance->>'reviewDate')::date between ${now} and ${soon}`,
      // A local version whose parent was withdrawn — it now derives from something
      // no longer published, and nobody would notice without this query.
      sql`select l.tool_id, l.version from catalogue_tool l
           join catalogue_tool p
             on p.tool_id = l.parent_tool_id and p.version = l.parent_version
          where l.parent_tool_id is not null and p.withdrawn_at is not null`,
    ]);

  const ref = (rows) => rows.map((r) => `${r.tool_id}@${r.version}`);

  return {
    generatedAt: now.toISOString(),
    unclassified: ref(unclassified),
    awaitingSpecialistReview: ref(awaitingSpecialist),
    unconfirmedReproduction: ref(unconfirmed),
    insufficientProvenance: ref(insufficient),
    expired: ref(expired),
    expiringSoon: ref(expiringSoon),
    orphanLocalVersions: ref(orphans),
    untranslated: {},   // populated when locale coverage lands with content
  };
}
