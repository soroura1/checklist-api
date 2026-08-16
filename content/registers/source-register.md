# Source register — batch B1

**`D1` — inventory. Records what exists; makes no decisions.**
Generated 16 August 2026.

---

## Sources actually used by B1

| # | Source | Role | Location | SHA-256 |
|---|---|---|---|---|
| S-01 | **PAHO, *Resilient Hospitals*** (2024), ISBN 978-92-75-12906-7 | ★ **The content source.** §1.1, pp. 36–38 | `old-trial-reference /reference/source-extracts/03-domain-framework/official/9789275129067_eng.md` | see below |
| S-02 | `OFFICIAL_GUIDE_REQUIREMENTS_COVERAGE.md` | **The decoder.** Resolves the prior catalogue's `AS-nn` sourceRef codes | `content/sources/` *(preserved copy)* | `948008f4bd8e0f6ee4a0faf9fa0a79cf8c87c7673f9bcb53a92d15c4dd78c5f7` |
| S-03 | `resilience-tools.catalogue.json` (prior attempt, 16 tools / 101 items) | **Candidate input only** — `DEC-001`. A source of identifiers, never an inheritance | `old-trial-reference /reference/rebuild-inputs/content/catalogue/v1/` | — |
| S-04 | `OFFICIAL-GUIDE-WORKBOOK.md`, `CANONICAL-BASELINE.md` | Cross-reference for the `local:H-nn` codes | `old-trial-reference /baselines/resilience-tools/` | — |

---

## ⚠️ S-02 was at risk, and is now preserved

The content inventory flagged this file: *"A load-bearing file is untracked. It resolves all 104 of
the prior catalogue's `sourceRefs` codes — exists in **no git history**, in one copy. **Preserve it
before anything else in this area.**"*

**Done first.** Copied into `content/sources/`, checksummed above, and now git-tracked.

Without it, `AS-13` and `AS-14` — the codes B1's own tool cites — are undecodable strings. With it:

| Code | Meaning |
|---|---|
| `AS-13` | STAR-H → risk-scored hazard register / EDRP-H input |
| `AS-14` | HVCA → prioritised risk register / capacity gaps |

---

## ⚠️ The evidence-authority gap — a named deferral

`DEC-018` rule 2: **"for each source, the original binary is authoritative"** — the PDF, DOCX or
XLSX. Every extraction is a *convenience* and must be re-derivable from the original.

> **The original binary is not in this workspace.** No PDF, DOCX or XLSX exists anywhere in the
> handoff. What exists is a verbatim page-traceable extract of `9789275129067_eng.pdf`.

| | |
|---|---|
| **What we have** | A 132-page extract with `<!-- page N -->` markers, from a complete run — 48 of 48 documents, **0 pages needing OCR** |
| **Why B1 may proceed on it** | Every B1 item cites a page number that can be checked against the original the moment it is obtained. The extract is *re-derivable-from*, which is what the rule protects |
| **Return condition** | ⚠️ **Obtain `9789275129067_eng.pdf`, checksum it here, and spot-check pp. 36–38 against the extract — before `D9` (approve).** It is openly licensed and publicly available; this is a fetch, not a negotiation |

**The extract's known limit:** figures and diagrams are not preserved, captions survive. Item
`HZ-HVCA-001-i06` derives from **Figure 4**, whose caption and step labels survived as text — that
item in particular should be re-checked against the original.

---

## Locations *not* swept — accepted risk, per `DEC-018`

- "The original workspace", named in the prior archive and never opened
- Unhydrated OneDrive placeholders

**Neither is claimed to be empty.** If either is opened and changes what B1 should be, `DEC-018`'s
revisit condition applies.
