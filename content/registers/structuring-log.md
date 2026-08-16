# Structuring log — batch B1

**`D5` — every prose-to-item interpretation, so a later reviewer can see what was interpreted.**
Generated 16 August 2026.

> **`D5` is "the hard step, and irreducibly human."** What follows is judgement, recorded so that
> the SME reviewer named by `A4` can disagree with it specifically rather than in general.

---

## How the source decomposed

§1.1.1 opens with *"A risk assessment yields essential information"* followed by **four bullets**.
Each bullet is a single checkable capability requirement, so each became one item — `i01`–`i04`.

Two further items come from elsewhere in the section:

| Item | From | Interpretation made |
|---|---|---|
| `i05` | p. 36, §1.1 body prose | The source says risks are *"dynamic and constantly evolving"* and that hospitals *"must continuously monitor"*. **Read as a requirement, not as context.** An assessment with no review cycle satisfies the four bullets and still fails the section's intent |
| `i06` | p. 38, **Figure 4**, STAR-H cycle step 05 | *"Incorporate results into EDRP-H"*. **Read as in scope for this tool** rather than as belonging to response planning — an assessment that changes no plan has changed nothing. ⚠️ **This is the most arguable item in B1**, and it derives from a figure, whose graphical content the extract does not preserve |

---

## Interpretations a reviewer should challenge first

| # | Judgement | Why it could be wrong |
|---|---|---|
| **1** | `i06` belongs to *this* tool | It could equally belong to a response-planning tool. Placing it here makes the assessment accountable for its own use; placing it there makes the plan accountable for its inputs. **Both are defensible** |
| **2** | `i05` is an item, not a property of the tool | Review cadence could be metadata rather than a checkable requirement. It is an item because a facility can demonstrably fail it |
| **3** | The four bullets are four items, not one | They could be one item with four parts. Four was chosen because each is separately evidenceable, and the evidence rules differ |
| **4** | `riskTier: general`, not `high` | This tool directs a facility to assess; it prescribes no clinical or structural safety judgement. **If a reviewer disagrees, `specialistReviewRequired` follows and `D8` engages** |
| **5** | No numeric scoring | The source explicitly prescribes **no universal scoring formula** and **no mandatory reassessment frequency**. Adding either would be inventing authority the source declines to claim |

---

## What was deliberately not done

**No evidence rule was written as "as appropriate" or "where relevant."** Every `evidenceRule` names
something a facility either has or has not. An evidence rule that cannot fail is not a rule.

**No item was created for material the source only references.** §1.1.3 lists four external tools
(STAR-H, Johns Hopkins CHNA, UNISDR, WHO BCP). Those are **pointers, not requirements**, and turning
a reading list into checklist items is how a library inflates without gaining coverage.

---

## Capability blocks — the most-skipped step, and its honest limit

All six items reference a block. **`blocksSharedAcrossTools` is currently `0`**, and the coverage
report says so rather than hiding it.

> That number is not a defect — it is arithmetic. **One tool cannot demonstrate shared credit.**
> Two blocks (`cb-assessment-review-cycle-001`, `cb-plan-integration-001`) were written deliberately
> generic because almost every assessment instrument ends with those two steps.
>
> **B2 is where the block model earns its keep or is shown not to.** If B2's items reference these
> two, shared credit works. If B2 needs its own near-identical blocks, the granularity is wrong and
> better to learn it at two tools than at twenty.
