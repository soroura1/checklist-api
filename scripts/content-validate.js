#!/usr/bin/env node
/**
 * Validate ingested content against the contracts schemas, and DERIVE the
 * coverage report.
 *
 * ============================================================================
 * THE COVERAGE REPORT IS RE-DERIVED, NEVER INHERITED
 * ============================================================================
 * The prior attempt carried a coverage register mapped to a superseded content
 * model. Its verdicts "meant nothing until re-run" -- every row looked like an
 * answer and none of them were, because the thing they described had changed
 * underneath.
 *
 * So this script computes coverage from the content files themselves. There is
 * no coverage document to edit. If the answer is wrong, the content is wrong.
 *
 *   node scripts/content-validate.js            validate + print coverage
 *   node scripts/content-validate.js --write    also write the coverage report
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse as parseYaml } from 'yaml';

// Merge keys (<<: *anchor) are off by default in yaml@2. The content uses them
// so that document-level provenance is stated once -- see the per-item
// sourceLocation assertion below, which is what stops that becoming inheritance.
const parse = (t) => parseYaml(t, { merge: true });
// The contracts schemas are draft 2020-12. Ajv's default export is draft-07 and
// rejects them with an unhelpful "no schema with key or ref" error.
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { canClaimAuthorityClass } from '@citadel/contracts/rules';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = join(here, '../content');
const schemaDir = join(here, '../node_modules/@citadel/contracts/schemas/catalogue');

const schema = (name) => JSON.parse(readFileSync(join(schemaDir, name), 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
// item.schema.json holds the shared $defs that tool.schema.json references.
ajv.addSchema(schema('item.schema.json'), './item.schema.json');

// item.schema.json is already registered above under BOTH './item.schema.json'
// and its own $id. Compiling it again would be a duplicate-id error -- retrieve
// the compiled validator instead.
const validateItem = ajv.getSchema('./item.schema.json');
const validateTool = ajv.compile(schema('tool.schema.json'));
const validateBlock = ajv.compile(schema('capability-block.schema.json'));

const problems = [];
const fail = (where, errs) =>
  problems.push(`${where}\n${(errs ?? []).map((e) => `      ${e.instancePath || '/'} ${e.message}`).join('\n')}`);

/** Load every batch. A batch is a directory; nothing is hard-coded. */
function loadBatches() {
  return readdirSync(join(contentDir, 'batches'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = join(contentDir, 'batches', d.name);
      const files = readdirSync(dir).filter((f) => f.endsWith('.yaml'));
      const blocksFile = files.find((f) => f === 'capability-blocks.yaml');
      return {
        name: d.name,
        tools: files
          .filter((f) => f !== 'capability-blocks.yaml')
          .map((f) => ({ file: `${d.name}/${f}`, doc: parse(readFileSync(join(dir, f), 'utf8')) })),
        blocks: blocksFile ? parse(readFileSync(join(dir, blocksFile), 'utf8')).blocks ?? [] : [],
      };
    });
}

const batches = loadBatches();
const allBlocks = new Map();
const allItems = [];
const allTools = [];

for (const batch of batches) {
  for (const b of batch.blocks) {
    if (!validateBlock(b)) fail(`block ${b.id} (${batch.name})`, validateBlock.errors);
    allBlocks.set(b.id, { ...b, referencedBy: [] });
  }
  for (const { file, doc } of batch.tools) {
    if (!validateTool(doc)) fail(`tool ${file}`, validateTool.errors);
    allTools.push({ ...doc, batch: batch.name });
    for (const item of doc.items ?? []) {
      if (!validateItem(item)) fail(`item ${item.id} (${file})`, validateItem.errors);
      allItems.push({ ...item, batch: batch.name });
    }
  }
}

// --- Cross-file rules the schemas cannot express -----------------------------

// ★ The adaptation rule, now fireable (contracts v0.2.2, DEC-025). Content
// adapted from class A or B guidance is class C. Before `adaptedFrom` existed
// there was nowhere to declare the source, so this could not be checked at all
// -- and B1 shipped class A on adaptations of material whose own rights page
// says adaptations are not endorsed by the issuer.
for (const tool of allTools) {
  const claim = canClaimAuthorityClass(tool);
  if (!claim.ok)
    problems.push(
      `tool ${tool.id} claims authorityClass ${tool.authorityClass} but is adapted from ` +
      `class ${tool.adaptedFrom?.sourceAuthorityClass ?? tool.parent?.authorityClass} — ` +
      `${claim.refusal}; required ${claim.requiredClass}`,
    );
  // Items inherit the tool's ceiling; an item may not out-claim its own tool.
  for (const item of tool.items ?? [])
    if (!canClaimAuthorityClass({ ...tool, authorityClass: item.authorityClass }).ok)
      problems.push(`item ${item.id} claims authorityClass ${item.authorityClass} on adapted content`);
}

for (const item of allItems) {
  // ★ THE MOST-SKIPPED STEP, ASSERTED. An item referencing a block that does not
  // exist is worse than one referencing none: it looks connected and is not.
  const block = allBlocks.get(item.capabilityBlockRef);
  if (!block) problems.push(`item ${item.id} references unknown capability block ${item.capabilityBlockRef}`);
  else block.referencedBy.push(item.id);

  // ★ Provenance is PER ITEM. Document-level fields may be shared, but the
  // LOCATION may not: an item carrying the tool's page range has not been
  // traced, it has been assumed -- and it would satisfy the schema perfectly.
  if (!item.provenance?.sourceLocation) problems.push(`item ${item.id} has no sourceLocation`);
  else {
    const toolLoc = allTools.find((t) => t.id === item.toolId)?.provenance?.sourceLocation;
    if (toolLoc && item.provenance.sourceLocation === toolLoc)
      problems.push(
        `item ${item.id} repeats the TOOL's sourceLocation ("${toolLoc}") — that is inheritance, not tracing`,
      );
  }

  // Nothing proceeds unclassified (D3).
  if (item.classification === 'unclassified') problems.push(`item ${item.id} is unclassified`);

  // Nothing publishes on `pending` (D4). Draft ingestion is permitted.
  const perm = item.provenance?.reproductionPermission;
  if (item.lifecycleState === 'approved' && !['confirmed', 'not-required'].includes(perm))
    problems.push(`item ${item.id} is approved but reproductionPermission is "${perm}"`);

  // Prerequisites must resolve, or the ordering claim is decorative.
  for (const p of item.prerequisites ?? [])
    if (!allItems.some((i) => i.id === p)) problems.push(`item ${item.id} has unknown prerequisite ${p}`);
}

// --- The DERIVED coverage report ---------------------------------------------

const coverage = {
  generatedAt: new Date().toISOString().slice(0, 10),
  batches: batches.map((b) => b.name),
  tools: allTools.length,
  items: allItems.length,
  blocks: allBlocks.size,
  // A block referenced once is not yet earning shared credit. Naming this is
  // the point: it is the gap B2 must close, and it cannot be hidden by prose.
  blocksSharedAcrossTools: [...allBlocks.values()].filter((b) => {
    const tools = new Set(b.referencedBy.map((id) => allItems.find((i) => i.id === id)?.toolId));
    return tools.size > 1;
  }).length,
  orphanBlocks: [...allBlocks.values()].filter((b) => b.referencedBy.length === 0).map((b) => b.id),
  byLifecycle: allItems.reduce((a, i) => ({ ...a, [i.lifecycleState]: (a[i.lifecycleState] ?? 0) + 1 }), {}),
  byAuthorityClass: allItems.reduce((a, i) => ({ ...a, [i.authorityClass]: (a[i.authorityClass] ?? 0) + 1 }), {}),
  publishable: allItems.filter((i) =>
    ['confirmed', 'not-required'].includes(i.provenance?.reproductionPermission)).length,
};

if (problems.length) {
  console.error(`\n${problems.length} content problem(s):\n`);
  for (const p of problems) console.error(`  FAIL  ${p}`);
  process.exit(1);
}

console.log('ok    every tool, item and block validates against the contracts schemas');
console.log('ok    every capability-block reference resolves');
console.log('ok    every item carries its own sourceLocation');
console.log('ok    nothing is unclassified; nothing approved sits on `pending`\n');
console.log('Coverage — DERIVED from the content, not read from a document:');
for (const [k, v] of Object.entries(coverage))
  console.log(`  ${k.padEnd(24)} ${typeof v === 'object' ? JSON.stringify(v) : v}`);

if (process.argv.includes('--write')) {
  const out = join(contentDir, 'registers/coverage-report.json');
  writeFileSync(out, `${JSON.stringify(coverage, null, 2)}\n`);
  console.log(`\nwritten: ${out}`);
}
