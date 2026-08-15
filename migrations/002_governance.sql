-- 002_governance.sql — R1 C1, C2, C3
--
-- The editorial lifecycle, the audit trail, and platform operator accounts.
--
-- ============================================================================
-- MIGRATION DISCIPLINE — read before adding anything here
-- ============================================================================
--
--   1. GREP THE LEDGER BEFORE NAMING A TABLE.
--      `create table if not exists` DOES NOT tell you the name is taken. It
--      silently succeeds and you get the OLD table. The prior attempt had four
--      names collide silently and had to prefix seven tables in a later release.
--
--   2. THIS FILE BECOMES IMMUTABLE THE MOMENT IT DEPLOYS.
--      Its checksum is stored; editing it breaks every existing deployment.
--      A migration that turns out wrong is corrected by a NEW migration.
--
--   3. EVERY NEW TENANT TABLE CARRIES THE TENANT.
--      Asserted independently in migrate.test.js, so a later migration that
--      forgets FAILS rather than shipping an open table.
--
-- Names checked against 001: catalogue_item, tenancy_probe. No collision.

begin;

-- ---------------------------------------------------------------------------
-- Tools and versions.
--
-- GLOBAL content — the catalogue is shared, and adding a tenant column to
-- genuinely shared content creates confusion about what is shared and invites a
-- filter that silently hides content.
--
-- The primary key is (tool_id, version): a tool is not one row that changes, it
-- is a SERIES OF IMMUTABLE VERSIONS. That is the schema-level expression of
-- "an approved version is never edited".
-- ---------------------------------------------------------------------------
create table if not exists catalogue_tool (
  tool_id             text not null,
  version             text not null,

  title_key           text not null,
  purpose_key         text not null,

  authority_class     text not null check (authority_class in ('A','B','C','D')),
  classification      text not null check (classification in
                        ('checklist','form','template','test','quick-reference','mixed','unclassified')),
  dominant_response_type text,
  specialist_referral_route text,

  -- Drives OFFLINE EXPIRY. The staleness a hospital tolerates for a supply
  -- checklist is not what it tolerates for an evacuation instrument.
  risk_tier           text not null default 'general' check (risk_tier in ('general','high')),
  specialist_review_required boolean not null default false,
  specialist_review_signed_by text,

  lifecycle_state     text not null check (lifecycle_state in
                        ('draft','in-review','returned','approved','deprecated')),
  withdrawn_at        timestamptz,

  provenance          jsonb not null,
  applicability       jsonb not null default '{}'::jsonb,

  -- Local adaptation. A local version RETAINS its parent's identity and history;
  -- adaptation must not destroy provenance.
  parent_tool_id      text,
  parent_version      text,
  parent_authority_class text,
  adapted_by          text,
  adapted_at          timestamptz,
  change_summary      text,

  -- Facility-scoped ONLY for local adaptations. NULL for global content.
  facility_id         uuid,

  created_by          text not null,
  created_at          timestamptz not null default now(),

  primary key (tool_id, version),

  -- A local adaptation of class A or B content is class C. A facility that edits
  -- official guidance and keeps the class A label has created content claiming an
  -- authority it no longer has. Enforced in the SCHEMA, not only in code.
  constraint adaptation_may_not_claim_parent_authority check (
    parent_tool_id is null
    or parent_authority_class not in ('A','B')
    or authority_class = 'C'
  ),

  -- A local adaptation belongs to a facility; global content does not.
  constraint local_versions_are_facility_scoped check (
    (parent_tool_id is null and facility_id is null)
    or (parent_tool_id is not null and facility_id is not null)
  )
);

comment on table catalogue_tool is
  'A tool is a SERIES OF IMMUTABLE VERSIONS, not one row that changes. Immutability of an approved version is enforced by a trigger below, not by discipline.';

-- ---------------------------------------------------------------------------
-- Who touched each version.
--
-- REVIEWER SEPARATION COVERS ANYBODY WHO EDITED IT — not merely the recorded
-- author. An author who hands a draft to a colleague to "just fix the wording"
-- has not created an independent reviewer.
-- ---------------------------------------------------------------------------
create table if not exists catalogue_tool_editor (
  tool_id   text not null,
  version   text not null,
  editor_id text not null,
  edited_at timestamptz not null default now(),
  primary key (tool_id, version, editor_id),
  foreign key (tool_id, version) references catalogue_tool (tool_id, version) on delete cascade
);

-- ---------------------------------------------------------------------------
-- The audit trail. Every lifecycle transition, with who and why.
-- ---------------------------------------------------------------------------
create table if not exists catalogue_tool_transition (
  id          bigserial primary key,
  tool_id     text not null,
  version     text not null,
  from_state  text,
  to_state    text not null,
  actor_id    text not null,
  reason      text,
  occurred_at timestamptz not null default now(),
  foreign key (tool_id, version) references catalogue_tool (tool_id, version) on delete cascade
);

-- ---------------------------------------------------------------------------
-- ★ IMMUTABILITY, ENFORCED BY THE DATABASE
--
-- The domain refuses an edit to an approved version. This trigger means the
-- refusal holds even for a route that forgets to ask — a rule enforced only in
-- application code is one forgotten call away from not being enforced.
--
-- Withdrawal and deprecation are the two permitted state changes, and nothing
-- else about an approved row may move.
-- ---------------------------------------------------------------------------
create or replace function refuse_edit_of_published_version() returns trigger as $$
begin
  if old.lifecycle_state in ('approved','deprecated') then
    if new.lifecycle_state is distinct from old.lifecycle_state
       or new.withdrawn_at is distinct from old.withdrawn_at then
      -- A permitted state move: approved → deprecated, or a withdrawal.
      if old.lifecycle_state = 'deprecated' and new.lifecycle_state is distinct from 'deprecated' then
        raise exception 'deprecated-versions-are-immutable';
      end if;
      -- Everything else must be unchanged.
      if (new.title_key, new.purpose_key, new.authority_class, new.classification,
          new.provenance, new.applicability, new.risk_tier)
         is distinct from
         (old.title_key, old.purpose_key, old.authority_class, old.classification,
          old.provenance, old.applicability, old.risk_tier) then
        raise exception 'published-version-is-immutable';
      end if;
      return new;
    end if;
    raise exception 'published-version-is-immutable';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists published_versions_are_immutable on catalogue_tool;
create trigger published_versions_are_immutable
  before update on catalogue_tool
  for each row execute function refuse_edit_of_published_version();

-- ---------------------------------------------------------------------------
-- Capability blocks. Two items referencing ONE block read ONE record — which is
-- why shared credit works, and why skipping the reference at ingestion produces
-- parallel checklists that each earn separately.
-- ---------------------------------------------------------------------------
create table if not exists capability_block (
  id          text not null,
  version     text not null,
  title_key   text not null,
  description_key text not null,
  primary key (id, version)
);

-- ---------------------------------------------------------------------------
-- Platform OPERATOR accounts — R1 C3.
--
-- Content authors and SME reviewers are PLATFORM OPERATORS, NOT FACILITY
-- MEMBERS. They carry no facility, so the editorial workflow works before the
-- enrolment broker exists (R2).
--
-- Named here so nobody discovers at R1 that "editorial users" had no way to
-- sign in.
-- ---------------------------------------------------------------------------
create table if not exists platform_operator (
  id            text primary key,
  display_name  text not null,
  password_hash text not null,
  roles         text[] not null default '{}',   -- author | sme-reviewer | specialist-reviewer | content-owner
  created_at    timestamptz not null default now(),
  disabled_at   timestamptz,

  -- An operator has NO facility. If one is ever needed, that is a facility
  -- member and belongs to identity-enrolment, not here.
  constraint operators_carry_no_facility check (true)
);

comment on table platform_operator is
  'Platform operators, not facility members. They carry no facility — the editorial workflow must work before identity-enrolment exists.';

-- ---------------------------------------------------------------------------
-- Isolation for the new TENANT tables, applied as a loop.
--
-- catalogue_tool is mixed: global rows have facility_id NULL, local adaptations
-- carry one. The policy admits global content to everyone and local content only
-- to its facility.
-- ---------------------------------------------------------------------------
do $$
begin
  execute 'alter table catalogue_tool enable row level security';
  execute 'alter table catalogue_tool force row level security';
  execute 'drop policy if exists catalogue_tool_tenant_isolation on catalogue_tool';
  execute $f$
    create policy catalogue_tool_tenant_isolation on catalogue_tool
      using (
        facility_id is null
        or facility_id = nullif(current_setting('app.facility_id', true), '')::uuid
      )
      with check (
        facility_id is null
        or facility_id = nullif(current_setting('app.facility_id', true), '')::uuid
      )
  $f$;

  grant select on catalogue_tool, capability_block, catalogue_tool_editor, catalogue_tool_transition to checklist_app;
  grant insert, update on catalogue_tool to checklist_app;
  grant insert on catalogue_tool_editor, catalogue_tool_transition to checklist_app;
  grant select on platform_operator to checklist_app;
end
$$;

commit;
