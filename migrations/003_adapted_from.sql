-- 003_adapted_from.sql — R2 B9 · DEC-025
--
-- ============================================================================
-- THE CONSTRAINT THAT COULD NOT FIRE
-- ============================================================================
-- 002 carries `adaptation_may_not_claim_parent_authority`. It reads:
--
--     parent_tool_id is null
--     or parent_authority_class not in ('A','B')
--     or authority_class = 'C'
--
-- The first line is the problem. `parent_tool_id` identifies ANOTHER CATALOGUE
-- TOOL -- a facility adapting something already in the catalogue, which is an
-- R2 feature. Every INGESTED batch is an adaptation of an EXTERNAL SOURCE
-- DOCUMENT, and there was no column in which to say so.
--
-- So a row that never declared a parent was EXEMPT from the rule about derived
-- content. The constraint was not unfired. It was UNFIREABLE.
--
-- Batch B1 was structured from PAHO guidance whose own rights page states that
-- adaptations are "the sole responsibility of the author(s) of the adaptation
-- and are NOT ENDORSED BY PAHO" -- and shipped `authority_class = 'A'`. Nothing
-- in the schema or the database could object. An agent pre-check caught it by
-- reading the rights page.
--
-- ⚠️ 002 IS IMMUTABLE. It has been applied. This corrects it with a NEW
-- migration, which is the only correct way to change a deployed one.

begin;

-- ---------------------------------------------------------------------------
-- Where an external adaptation declares its source.
--
-- Mirrors `adaptedFrom` in contracts v0.2.2. Nullable: most content is not an
-- adaptation, and forcing a value would make every author invent one.
-- ---------------------------------------------------------------------------
alter table catalogue_tool
  add column if not exists adapted_from_document        text,
  add column if not exists adapted_from_issuing_body    text,
  add column if not exists adapted_from_authority_class text;

comment on column catalogue_tool.adapted_from_authority_class is
  'The authority class of the SOURCE DOCUMENT, not of this row. Adapting A or B yields C. This is the column whose absence made adaptation_may_not_claim_parent_authority unfireable for ingested content.';

-- Either all three or none. A source document with no authority class is the
-- shape that made the original constraint vacuous, and it must not be
-- reachable by a partially-filled row.
alter table catalogue_tool
  add constraint adapted_from_is_complete_or_absent check (
    (adapted_from_document is null
     and adapted_from_issuing_body is null
     and adapted_from_authority_class is null)
    or
    (adapted_from_document is not null
     and adapted_from_issuing_body is not null
     and adapted_from_authority_class in ('A','B','C','D'))
  );

-- ---------------------------------------------------------------------------
-- ★ The rule, now covering BOTH kinds of adaptation.
--
-- The old constraint stays -- it is correct for local adaptation and dropping
-- it would widen what is permitted. This adds the case it could not see.
-- ---------------------------------------------------------------------------
alter table catalogue_tool
  add constraint adaptation_may_not_claim_source_authority check (
    adapted_from_authority_class is null
    or adapted_from_authority_class not in ('A','B')
    or authority_class = 'C'
  );

comment on constraint adaptation_may_not_claim_source_authority on catalogue_tool is
  'Content adapted from class A or B guidance is class C. Named refusal: adaptation-may-not-claim-source-authority.';

commit;
