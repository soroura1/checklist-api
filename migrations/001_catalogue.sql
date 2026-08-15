-- 001_catalogue.sql — R0 E2
--
-- Tenancy is the safety property everything else rests on, and it is installed HERE, in the first
-- migration, while there is nothing to lose. Retrofitting isolation means auditing every query
-- written before it.
--
-- ============================================================================
-- THE TWO WAYS ISOLATION CAN BE PRESENT AND COMPLETELY INERT
-- ============================================================================
--
--   1. `enable row level security` alone EXEMPTS THE TABLE'S OWNER.
--      Fix: `force row level security`.
--
--   2. Forcing still does not constrain a SUPERUSER — superusers bypass
--      unconditionally, and no table-level switch changes that. The official
--      Postgres image creates POSTGRES_USER as a superuser.
--      Fix: the application connects as an ordinary role (see below).
--
-- Every policy could be present, correct, visible in \d, and WORTH NOTHING.
--
-- And the corollary that cost the prior attempt a debugging session:
--   AN ISOLATION TEST ON THE OWNER CONNECTION MEASURES NOTHING.
--   Its first isolation test reported a leak that did not exist, because the
--   test connected as the database owner.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- The application role: ordinary, no superuser bit, NO BYPASSRLS, its own
-- credential. It gets exactly the data verbs on exactly the application tables
-- — no DDL, no access to the migration ledger.
--
-- The prior attempt reached this role by switching roles on a connection
-- authenticated as something more privileged, and recorded giving it its own
-- credential as a known-stronger next step it never took. We take it now: it
-- costs one secret.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'checklist_app') then
    execute format('create role checklist_app login password %L', current_setting('app.role_password', true));
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Global content. The catalogue is SHARED — it is not tenant data, and it must
-- not pretend to be.
--
-- Adding a tenant column to genuinely shared content creates confusion about
-- what is shared and invites a filter that silently hides content.
-- ---------------------------------------------------------------------------
create table if not exists catalogue_item (
  id                  text primary key,
  tool_id             text not null,
  version             text not null,

  title_key           text not null,
  purpose_key         text not null,

  authority_class     text not null check (authority_class in ('A','B','C','D')),
  classification      text not null check (classification in
                        ('checklist','form','template','test','quick-reference','mixed','unclassified')),
  specialist_review_required boolean not null default false,
  specialist_review_signed_by text,

  lifecycle_state     text not null check (lifecycle_state in
                        ('draft','in-review','returned','approved','deprecated')),

  provenance          jsonb not null,
  applicability       jsonb not null default '{}'::jsonb,
  evidence_rule_key   text not null,
  capability_block_ref text not null,

  review_date         date,
  created_at          timestamptz not null default now(),

  -- An approved version is never edited. A change creates a new version.
  unique (tool_id, version, id)
);

comment on table catalogue_item is
  'Global, not tenant-scoped. The catalogue is shared content. Only APPROVED rows are visible to consumers.';

-- An unclassified item cannot be executed. Enforced in the domain as a named
-- refusal; recorded here so the constraint is visible in the schema too.
comment on column catalogue_item.classification is
  'unclassified is a real member, not an absence. An unclassified tool CANNOT be executed. Defaulting a classification is not a fix — it is a judgement about what the tool is for.';

-- ---------------------------------------------------------------------------
-- Facility-scoped tables. R0 has one, to prove the isolation mechanism end to
-- end while there is nothing to lose.
-- ---------------------------------------------------------------------------
create table if not exists tool_run (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null,                 -- THE TENANT KEY. Every tenant table carries it.
  seat_id       uuid not null,
  tool_id       text not null,
  tool_version  text not null,                 -- PINNED. Never latest-approved for a recorded run.
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  findings      jsonb not null default '[]'::jsonb
);

comment on column tool_run.facility_id is
  'The tenant key. migrate.test.js asserts every tenant table and key carries one, so a later migration that forgets FAILS rather than shipping an open table.';

-- ---------------------------------------------------------------------------
-- Isolation, applied as a LOOP over the tenant tables — not hand-written per
-- table.
--
-- A table that gets missed is a table with no isolation, and reviewing twenty
-- near-identical blocks for the one naming the wrong column is HOW a table
-- gets missed.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tenant_tables text[] := array['tool_run'];
begin
  foreach t in array tenant_tables loop
    execute format('alter table %I enable row level security', t);
    -- FORCE, not merely ENABLE: enable alone exempts the table's owner.
    execute format('alter table %I force row level security', t);

    execute format('drop policy if exists %I on %I', t || '_tenant_isolation', t);
    execute format($f$
      create policy %I on %I
        using (facility_id = nullif(current_setting('app.facility_id', true), '')::uuid)
        with check (facility_id = nullif(current_setting('app.facility_id', true), '')::uuid)
    $f$, t || '_tenant_isolation', t);

    execute format('grant select, insert, update, delete on %I to checklist_app', t);
  end loop;

  -- Global content: readable by the application, never written by it.
  grant select on catalogue_item to checklist_app;
end
$$;

-- ---------------------------------------------------------------------------
-- WHY AN UNSET TENANT MATCHES NOTHING
--
--   current_setting('app.facility_id', true) returns NULL when never set.
--   facility_id = NULL is NULL, which is not TRUE.
--
-- So a query with no tenant context matches NOTHING. Forgetting to establish
-- who is asking yields nothing rather than everything — the failure mode is
-- empty, not catastrophic.
-- ---------------------------------------------------------------------------

commit;
