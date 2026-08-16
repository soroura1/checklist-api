# `D6b` — agent faithfulness pre-check, batch B1

**Run 16 August 2026.** Checker: an agent that did **not** author the content (Codex, read-only).
Source: PAHO *Resilient Hospitals* (2024), extract of `9789275129067_eng.pdf`.

> ⚠️ **This is not `D7` and does not satisfy it.** It is a findings list for a human reviewer.
> Nothing here approves anything.

**Verdict returned:** *"No, I would not be comfortable publishing this to hospitals as-is."*

**Every quotation below was re-verified against the source before being accepted.**

---

## Page accuracy — all six items

| Item | Cited | Verdict |
|---|---|---|
| `i01`–`i06` | pp. 36–38 | ✅ **ACCURATE.** No item cites an invented or wrong page |

**The citations held. The decomposition did not.**

---

## ★ Finding 1 — `authorityClass: A` was wrong, and a constraint that exists did not catch it

**Source, p. 4 — verified verbatim:**

> *"Adaptations: If this work is adapted, the following disclaimer should be added … Views and
> opinions expressed in the adaptation are the sole responsibility of the author(s) of the
> adaptation and are **not endorsed by PAHO**."*

These items **are** adaptations. They add evidence formats, prerequisites, roles and schedules that
PAHO does not state. Labelling them class **A** attaches PAHO's authority to locally authored
requirements.

**This project already has the rule.** `adaptedAuthorityClass()` returns `C` for a class A parent,
and migration 002 carries `adaptation_may_not_claim_parent_authority`, which *refuses* a row whose
parent is A or B unless the row is class C.

> ⚠️ **The constraint did not fire, because B1 declared no parent.** The check is written as
> `parent_tool_id is null or …` — so content that never admits it is derived is exempt from the rule
> about derived content.
>
> **Third time today.** An isolation test on the owner connection, a separation rule with an empty
> editor list, and now an adaptation constraint with no declared parent. **Each rule was correct and
> each was inert**, because the thing it keys on was absent.

**Correction:** `authorityClass: C`, tool and every item, and **declare the parent** so the
constraint has something to bite on.

---

## Findings accepted and corrected

| # | Severity | Finding |
|---|---|---|
| **2** | defect | `i01` **omits likelihood** — the source bullet says *"and the likelihood that they will affect the hospital … and the local community"*. It also invented a required written list format |
| **6** | defect | `i05` invented a **named owner** the source never requires, and *"the facility's own schedule is what counts"* would credit one review in ten years against a source demanding *"continuously monitor"* |
| **7** | defect | `i06` invented one-to-one traceability and three disposition states — including **"explicitly declined"**, which lets the item pass when a finding was *not* incorporated. That is the opposite of the step it derives from |
| **8** | defect | **Prioritization, and the multidisciplinary committee, are missing.** p. 36: *"assess, identify, and **prioritize** risks"*; Figure 4 step 01: *"Establish a multidisciplinary committee"* |
| **9** | defect | **Community and local-authority inputs missing.** p. 36: hospitals *"must have access to up-to-date community needs assessments, including special considerations for vulnerable groups"*. Recording coordination as a *capacity* is not having a coordination *mechanism* |
| **10** | defect | **Figure 4 was used selectively** — step 05 taken, steps 01 and 04 (document the process) omitted |
| **14** | defect | **The publication day was invented.** Source says *"Washington, D.C., 2024"*. `2024-01-01` is a schema convention presented as source data |
| **4** | weak | `i03`'s purpose privileges consequence; the source names four dimensions — likelihood, severity, vulnerability, coping capacity |
| **3, 5** | sound | `i02` and `i04` are faithful |

---

## ★ Finding 11 — the risk classification, and why it moves

**Source, p. 36 — verified verbatim:**

> *"Conducting a risk assessment of hospitals requires coordination and engagement with **subject
> matter experts** in areas such as **engineering, architecture, safety, and disaster
> management**."*

My reasoning was *"it directs a facility to assess, and prescribes no clinical or structural
judgement."* The checker's answer: **"directs a facility to assess" is not a safety exemption.** The
tool asks hospitals to judge structural and nonstructural vulnerability, likelihood, consequence and
response-plan implications — judgements that reach capital works, evacuation and continuity.

**`specialistReviewRequired` is set to `true`.** Erring toward *more* review is never the unsafe
direction, and the source expressly calls for specialist engagement.

⚠️ **`riskTier` is left at `general` for the reviewer to decide, not silently raised.** It controls
whether stale or withdrawn content may still execute offline — a safety-state judgement, and
`DEC-021` assigns classification authority to the owner, not to me and not to a checker.

---

## Left open for `D7` — both positions recorded

| # | Question | For | Against |
|---|---|---|---|
| **7** | Does `i06` belong in this tool at all? | An assessment that changes no plan changed nothing | Figure 4 is a *transition* into response planning. Making the assessment fail because a plan owner has not acted conflates producing findings with adopting them. The checker's alternative: move it, or rename the tool *"Strategic risk assessment and planning"* |
| **11** | `riskTier: high`? | The judgements reach hospital safety | It directs assessment rather than prescribing a method |
| **13** | Are the capability blocks reusable, or do they just mirror the items? | Written at a granularity B2 could reuse | `cb-plan-integration-001`'s generic title hides narrow EDRP-H semantics. **"Future hoped-for reuse is not evidence that the present granularity is right"** |

---

## What this run cost, and what it bought

`D5` needs rework — that is the finding, and it is the pre-check working exactly as intended. Nine
defects reached a human-reviewable state in one automated pass, each with a source quote and
proposed corrected text.

**The alternative was a person finding these by reading 132 pages against six items.** That is the
cost `A4` has been carrying.
