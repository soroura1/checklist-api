/**
 * Schema constraints, exercised against a real database — R2 `B9` · `DEC-025`.
 *
 * ============================================================================
 * WHY THIS FILE EXISTS
 * ============================================================================
 * 002 carries `adaptation_may_not_claim_parent_authority`, which reads
 * `parent_tool_id is null or ...`. `parent_tool_id` identifies ANOTHER
 * CATALOGUE TOOL, so a row that never declared a parent was EXEMPT from the
 * rule about derived content.
 *
 * Every ingested batch is an adaptation of an EXTERNAL SOURCE DOCUMENT and had
 * no column in which to say so. The constraint was not unfired — it was
 * UNFIREABLE, because the fact it keys on had nowhere to live.
 *
 * Batch B1 shipped `authority_class = 'A'` on adaptations of PAHO material
 * whose own rights page says adaptations are "not endorsed by PAHO". Nothing in
 * the schema could object.
 *
 * ★ Every assertion here has BOTH directions. A constraint that refuses
 *   everything passes a refusal test perfectly.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// A top-level import means this file cannot LOAD without dependencies, and
// node:test reports that as a failure — which reads as "the constraint is
// broken" when the truth is "there is no database here".
let postgres;
const HAVE_DB = !!process.env.TEST_DB_HOST;
let sql;

before(async () => {
  if (!HAVE_DB) return;
  ({ default: postgres } = await import('postgres'));
  sql = postgres({
    host: process.env.TEST_DB_HOST,
    port: Number(process.env.TEST_DB_PORT ?? 5432),
    database: process.env.TEST_DB_NAME ?? 'checklist_test',
    username: process.env.TEST_OWNER_USER ?? 'postgres',
    password: process.env.TEST_OWNER_PASSWORD ?? 'test',
    onnotice: () => {},
  });
  await sql`delete from catalogue_tool where created_by = 'constraint-test'`;
});

after(async () => {
  if (!HAVE_DB || !sql) return;
  await sql`delete from catalogue_tool where created_by = 'constraint-test'`;
  await sql.end();
});

const insert = (id, cls, sourceClass) => sql`
  insert into catalogue_tool
    (tool_id, version, title_key, purpose_key, authority_class, classification,
     lifecycle_state, provenance, created_by,
     adapted_from_document, adapted_from_issuing_body, adapted_from_authority_class)
  values (${id}, '1.0.0', 't', 'p', ${cls}, 'checklist', 'draft', '{}', 'constraint-test',
          ${sourceClass ? 'Resilient Hospitals' : null},
          ${sourceClass ? 'PAHO' : null},
          ${sourceClass ?? null})`;

test('★ content adapted from class A may NOT claim class A', { skip: !HAVE_DB && 'no database' }, async () => {
  await assert.rejects(() => insert('T-CLAIM-A', 'A', 'A'),
    /adaptation_may_not_claim_source_authority/);
});

test('★ and the corrected form IS permitted — which is what makes the refusal mean something',
  { skip: !HAVE_DB && 'no database' }, async () => {
    await insert('T-CLAIM-C', 'C', 'A');
    const [row] = await sql`select authority_class from catalogue_tool where tool_id = 'T-CLAIM-C'`;
    assert.equal(row.authority_class, 'C');
  });

test('class A remains legitimate for content that is NOT an adaptation',
  { skip: !HAVE_DB && 'no database' }, async () => {
    await insert('T-ORIGINAL', 'A', null);
    const [row] = await sql`select authority_class from catalogue_tool where tool_id = 'T-ORIGINAL'`;
    assert.equal(row.authority_class, 'A');
  });

test('a PARTIALLY declared source is refused — that shape is what made the original rule vacuous',
  { skip: !HAVE_DB && 'no database' }, async () => {
    await assert.rejects(
      () => sql`
        insert into catalogue_tool
          (tool_id, version, title_key, purpose_key, authority_class, classification,
           lifecycle_state, provenance, created_by, adapted_from_document)
        values ('T-PARTIAL', '1.0.0', 't', 'p', 'C', 'checklist', 'draft', '{}',
                'constraint-test', 'Some doc')`,
      /adapted_from_is_complete_or_absent/);
  });

test('adapting class C or D does not force a downgrade', { skip: !HAVE_DB && 'no database' }, async () => {
  await insert('T-FROM-D', 'D', 'D');
  const [row] = await sql`select authority_class from catalogue_tool where tool_id = 'T-FROM-D'`;
  assert.equal(row.authority_class, 'D');
});
