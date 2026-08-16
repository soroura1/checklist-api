# Reconciliation log — batch B1

**`D2` — every duplicate-or-superset decision, with its reason.**
Generated 16 August 2026.

> ### ⚠️ The rule that governs this file
> **Never auto-deduplicate.** A literal "deprecate duplicates" rule applied to the prior attempt's
> material **would have destroyed eleven unique files** — kit checklists, role cards, an
> organisation chart, a situation report template, review forms, triage and activation posters, a
> patient tracking log — each existing in only one of two similar folders.
> **A superset is not a duplicate.**

---

| # | Finding | Decision | Reason |
|---|---|---|---|
| **R-01** | `HZ-HVCA-001` exists in **three places** that disagree in status: this project's conformance suite and tests, the prior catalogue (approved, 6 items, `authorityClass: mixed`), and the baseline documents | **Derive from source; adopt the identifier only** | `DEC-001`: the prior catalogue is a candidate input and a source of identifiers — not an inheritance. The identifier is already embedded in this project's conformance suite, so keeping it avoids a second rename |
| **R-02** | Item identifiers differ: prior catalogue uses `HZ-HVCA-01`, this project ships `HZ-HVCA-001-i01` | **Adopt the shipped form.** Mapping recorded below | Production, the conformance suite and the R0 tests all use the shipped form. **Two live ID schemes is the condition to avoid**, not a thing to preserve |
| **R-03** | ★ The prior tool is `authorityClass: mixed` — it combines PAHO-derived material with locally-authored items (`local:H-01..H-04`) | **B1 carries the PAHO-derived items only.** The local items are **not** in B1 | *Mixed* was the problem word: the clean-permission story holds only for items tracing to a CC-licensed source. Deriving from source **separates them**, and B1 is cleanly `authorityClass: A` |
| **R-04** | The local items (`H-01` incident catalogue, and three others) are real, useful, and cannot be inherited | **Deferred to a later batch as owner-authored Class C — not deleted** | `DEC-001` forbids inheriting them; their *content* is not thereby worthless. **This is the eleven-files trap in miniature**: dropping them from B1 is a scoping decision, not a deletion |
| **R-05** | The prior tool has 6 items; the source §1.1 yields 6 items | **Coincidence, not confirmation** | The counts match because §1.1.1 has four bullets and §1.1/Figure 4 contribute one each. **It was not derived from the prior tool** — see the structuring log for each item's page |
| **R-06** | The MCM knowledge base exists in **five** full copies; the prior handoff exists **twice** byte-identically; the prior governance document exists in **two divergent copies** | **Out of B1's scope. Untouched, not reconciled** | `DEC-018` made this a per-item question settled inside the pipeline for material actually being ingested. B1 ingests none of it, so B1 reconciles none of it |

---

## R-02 — the identifier mapping, recorded once

| Prior catalogue | B1 | Source of the B1 item |
|---|---|---|
| `HZ-HVCA-01` … `-06` *(local + PAHO mixed)* | — | **Not carried across.** See R-01 and R-03 |
| — | `HZ-HVCA-001-i01` | p. 37, §1.1.1 first bullet |
| — | `HZ-HVCA-001-i02` | p. 37, §1.1.1 second bullet |
| — | `HZ-HVCA-001-i03` | p. 37, §1.1.1 third bullet |
| — | `HZ-HVCA-001-i04` | p. 37, §1.1.1 fourth bullet |
| — | `HZ-HVCA-001-i05` | p. 36, §1.1 |
| — | `HZ-HVCA-001-i06` | p. 38, Figure 4 step 05 |

**The left column is deliberately empty of mappings.** No B1 item is a renamed prior item; each was
structured from the source. Recording an equivalence that does not exist would be the inheritance
`DEC-001` prohibits, wearing a mapping table as a disguise.
