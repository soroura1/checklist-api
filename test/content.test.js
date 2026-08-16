/**
 * Batch B1 content invariants.
 *
 * The validator script checks shape. These tests check the GOVERNANCE claims —
 * the ones that are easy to state in a register and quietly stop being true.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

const dir = new URL('../content/batches/B1/', import.meta.url);
const read = (f) => parse(readFileSync(new URL(f, dir), 'utf8'), { merge: true });

const tool = read('HZ-HVCA-001.yaml');
const blocks = read('capability-blocks.yaml').blocks;

test('the tool is DRAFT — it cannot be approved without a reviewer who is not an editor', () => {
  assert.equal(tool.lifecycleState, 'draft');
  for (const i of tool.items) assert.equal(i.lifecycleState, 'draft');
});

test('★ every item traces to its OWN source location, not the tool\'s', () => {
  const toolLoc = tool.provenance.sourceLocation;
  const seen = new Set();
  for (const i of tool.items) {
    assert.ok(i.provenance.sourceLocation, `${i.id} has no sourceLocation`);
    assert.notEqual(i.provenance.sourceLocation, toolLoc,
      `${i.id} repeats the tool's location — inheritance, not tracing`);
    assert.match(i.provenance.sourceLocation, /p\. \d+/, `${i.id} names no page`);
    seen.add(i.provenance.sourceLocation);
  }
  // Distinct pages/bullets — six items citing one line would be tracing in name only.
  assert.equal(seen.size, tool.items.length);
});

test('★ every item references a capability block that exists', () => {
  const ids = new Set(blocks.map((b) => b.id));
  for (const i of tool.items)
    assert.ok(ids.has(i.capabilityBlockRef), `${i.id} -> unknown block ${i.capabilityBlockRef}`);
});

test('no block is orphaned — an unreferenced block is a claim nothing makes', () => {
  const used = new Set(tool.items.map((i) => i.capabilityBlockRef));
  for (const b of blocks) assert.ok(used.has(b.id), `${b.id} is referenced by nothing`);
});

test('permission is confirmed, with evidence, on every item', () => {
  for (const i of tool.items) {
    assert.equal(i.provenance.reproductionPermission, 'confirmed');
    assert.match(i.provenance.permissionEvidence, /Creative Commons/,
      `${i.id} cites no licence evidence`);
  }
});

test('★ authorityClass is A throughout — the prior tool was "mixed", and that was the problem', () => {
  assert.equal(tool.authorityClass, 'A');
  for (const i of tool.items) assert.equal(i.authorityClass, 'A');
});

test('nothing is unclassified', () => {
  assert.notEqual(tool.classification, 'unclassified');
  for (const i of tool.items) assert.notEqual(i.classification, 'unclassified');
});

test('every evidence rule can actually fail — no "as appropriate"', () => {
  for (const i of tool.items) {
    const t = i.evidenceRule.fallback.toLowerCase();
    for (const weasel of ['as appropriate', 'where relevant', 'if possible', 'as needed'])
      assert.ok(!t.includes(weasel), `${i.id} evidence rule contains "${weasel}"`);
  }
});

test('every prerequisite resolves to an item in the tool', () => {
  const ids = new Set(tool.items.map((i) => i.id));
  for (const i of tool.items)
    for (const p of i.prerequisites ?? []) assert.ok(ids.has(p), `${i.id} -> unknown prereq ${p}`);
});

test('no user-visible string is a bare literal — every one is a locale key', () => {
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === 'object') {
      if ('fallback' in o) assert.ok(o.key, 'a fallback exists with no locale key');
      Object.values(o).forEach(walk);
    }
  };
  walk(tool);
});

test('the registers D11 requires all exist', () => {
  const files = readdirSync(new URL('../content/registers/', import.meta.url));
  for (const r of ['source-register.md', 'reconciliation-log.md', 'permission-register.md', 'structuring-log.md'])
    assert.ok(files.includes(r), `missing register: ${r}`);
});
