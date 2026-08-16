# Official-guide intervention and gap register

**Status:** Revised against the official-guide extracts in this repository.  
**Purpose:** Show every actionable intervention, plan, assessment, activation and learning control explicitly captured in the PAHO/WHO guide extracts, then show whether the current game has a traceable capability for it.

**Validation decisions:** The group-by-group local adoption, priority and task/checklist decisions are recorded in [`OFFICIAL_GUIDE_REVIEW_WORKBOOK.md`](OFFICIAL_GUIDE_REVIEW_WORKBOOK.md). This register remains the source-traceability record; the workbook records local product decisions.

## Source authority and scope

This register uses only these two source extracts:

- [`resilient-hospitals-guide-obs.md`](../../content/framework/official/resilient-hospitals-guide-obs.md) — the detailed BEFORE / DURING / AFTER guide observation.
- [`resilient-hospitals-MATRIX.md`](../../content/framework/official/resilient-hospitals-MATRIX.md) — the condensed master matrix, especially Matrices 2–8.

The earlier 249-item implementation checklist is **not** used as evidence in this register. It can remain a useful local working tool, but it is not the source of record here.

The register contains **114 source records**: 78 6S interventions, 8 required plans, 15 assessments, 5 activation/demobilisation states, and 8 AAR/CAP steps. A source record is an actionable guide element, not a claim that every hospital must implement it identically; local law, hazard profile, facility level, and authorised clinical guidance still govern implementation.

### How to read the gap status

- **Candidate partial:** a current map block or mission addresses part of the guide element, but does not yet carry the guide’s required evidence or full scope.
- **Missing:** no current map block is assigned.
- **No validated coverage:** applies to every candidate partial. The prototype has no source-to-evidence validation yet.

`Before`, `During`, and `After` below are the guide’s own phase terms. The product’s seven-phase journey is a later design translation, not a replacement for the source terminology.

## Portfolio result

| Measure | Count |
|---|---:|
| Official-source records reviewed | 114 |
| Candidate partial overlaps | 41 |
| Missing from the current map | 73 |
| Evidence-validated coverage | 0 |

## A. 6S intervention inventory — Matrix 4

### Space (20)

| ID | Official intervention / key components | Guide phase | Current product trace | Gap |
|---|---|---|---|---|
| SP-01 | Seismic retrofit — structural engineering, bracing, reinforcement | Before | — | Missing |
| SP-02 | Flood protection — barriers, waterproofing, elevated critical systems, drainage | Before, After | — | Missing |
| SP-03 | Wind/hurricane hardening — roof, glass and façade anchoring | Before, After | — | Missing |
| SP-04 | Firewall installation — fire-rated barriers and compartmentalisation | Before | — | Missing |
| SP-05 | Nonstructural anchoring — equipment, shelving and cylinders | Before | — | Missing |
| SP-06 | Electrical redundancy — generators, 72h+ fuel, UPS, solar, transfer switches | Before, After | `cb-lifelines` | Candidate partial |
| SP-07 | Water-system redundancy — 3-day+ storage, pumps, treatment, fire suppression | Before, After | `cb-lifelines` | Candidate partial |
| SP-08 | HVAC resilience — negative pressure, emergency ventilation, smoke purge, dampers | Before, After | — | Missing |
| SP-09 | Medical-gas backup — redundant oxygen, cylinders and manifolds | Before | `cb-lifelines` | Candidate partial |
| SP-10 | Secure fuel/medical-gas storage — spill containment and ventilation | Before, After | — | Missing |
| SP-11 | Waste-management systems — segregation, temporary storage, disposal agreements | Before, During, After | — | Missing |
| SP-12 | Communications infrastructure — satellite/radio/redundant internet/intercom | Before, During, After | `cb-communications` | Candidate partial |
| SP-13 | Decontamination unit — fixed/deployable, drainage, PPE, runoff control | Before, During | — | Missing |
| SP-14 | Accessibility modifications — ramps, accessible toilets/elevators, multilingual signs | Before, After | — | Missing |
| SP-15 | Green infrastructure — solar, water harvesting, efficient HVAC, low-emission materials | Before, After | — | Missing |
| SP-16 | Step-down facility setup — location, shelter, utilities, staffing, transfer protocols | Before, After | `cb-evacuation-buffer` | Candidate partial |
| SP-17 | Temporary facility establishment — tents/mobile/prefab units and utilities | During, After | — | Missing |
| SP-18 | Post-disaster infrastructure rebuild — hardening, adaptation and green standards | After | — | Missing |
| SP-19 | Pre-identify functional zones — triage, treatment, EOC, decon, isolation, step-down, maps | Before | `cb-gate-triage-point`, `cb-ict-command-post`, MCM zones | Candidate partial |
| SP-20 | Preventive maintenance programme — schedule, contracts, logs, compliance | Before | — | Missing |

### Staff (16)

| ID | Official intervention / key components | Guide phase | Current product trace | Gap |
|---|---|---|---|---|
| ST-01 | Emergency role mapping and Job Action Sheets | Before | `cb-mcm-activation` | Candidate partial |
| ST-02 | HIMT pre-assignment — five functions, authority, alternates | Before | `cb-mcm-activation` | Candidate partial |
| ST-03 | Competency training — HEDRM, IPC, triage, HIMS, crisis communication | Before | MCM education path | Candidate partial |
| ST-04 | Tabletop exercises — scenario, facilitation, trigger questions, debrief | Before | `cb-exercise-learning` | Candidate partial |
| ST-05 | Functional exercises — simulated functions, debrief and plan update | Before | `cb-exercise-learning` | Candidate partial |
| ST-06 | Full-scale exercises — physical, multi-agency deployment | Before | — | Missing |
| ST-07 | Surge-workforce planning — volunteers, roster and mutual aid | Before | `cb-staff-surge` | Candidate partial |
| ST-08 | Staff recall and mobilisation — call-back, transport, housing, childcare | Before, During | `cb-staff-surge` | Candidate partial |
| ST-09 | PPE training and fit-testing | Before, During | — | Missing |
| ST-10 | Mental-health/PFA programme — EAP, peer support, resilience | Before, After | — | Missing |
| ST-11 | Staff absenteeism monitoring — thresholds and replacement | During, After | — | Missing |
| ST-12 | Staff medical surveillance and occupational-health follow-up | After | — | Missing |
| ST-13 | Demobilisation planning — timeline, wellness, debrief and security | Before, After | — | Missing |
| ST-14 | Financial/nonfinancial incentives — pay, recognition, development, reimbursement | After | — | Missing |
| ST-15 | Disability inclusion in workforce — accommodations and inclusive scheduling | Before | — | Missing |
| ST-16 | HEDRM in HR systems — job descriptions, performance review, orientation, calendar | Before | — | Missing |

### Stuff (8)

| ID | Official intervention / key components | Guide phase | Current product trace | Gap |
|---|---|---|---|---|
| SF-01 | Emergency stockpile definition — medicines, PPE, consumables, O₂, blood, water, fuel | Before | `cb-mcm-kits` | Candidate partial |
| SF-02 | Inventory management — FIFO, par levels, expiry tracking, audit | Before, During, After | `cb-mcm-kits` | Candidate partial |
| SF-03 | Emergency procurement agreements — vendors, pricing and delivery SLA | Before | — | Missing |
| SF-04 | National-stockpile access protocol — contacts, authorisation, request and transport | Before, During | `cb-mcm-kits` | Candidate partial |
| SF-05 | Pharmaceutical cold chain — backup refrigeration and temperature monitoring | Before, During, After | — | Missing |
| SF-06 | Medical-equipment maintenance — schedules, contracts and inspection logs | Before | — | Missing |
| SF-07 | Government approval for reuse of water/heat/smoke-exposed equipment | After | — | Missing |
| SF-08 | Supply-chain restoration — vendors, alternatives and procurement delegation | After | — | Missing |

### Systems (12)

| ID | Official intervention / key components | Guide phase | Current product trace | Gap |
|---|---|---|---|---|
| SY-01 | HIMS — EMR, patient tracking, beds, resources, SitReps | Before, During, After | — | Missing |
| SY-02 | HIMS offline/backup — paper forms, offline mode, data backup | Before, During | — | Missing |
| SY-03 | Cybersecurity and data protection — recovery, access control, incident plan | Before, After | — | Missing |
| SY-04 | Early-warning integration — national/community links, dashboards, thresholds | Before, During | `cb-communications` | Candidate partial |
| SY-05 | Hospital EOC setup — room, power, redundant comms, display, alternate location | Before, During | `cb-ict-command-post` | Candidate partial |
| SY-06 | Routine IPC programme — precautions, surveillance, hygiene, cleaning | Before, During | — | Missing |
| SY-07 | IPC surge protocols — cohorting, isolation and decontamination | Before, During | — | Missing |
| SY-08 | Crisis-communication system — PIO, templates, media, social monitoring | Before, During, After | `cb-communications` | Candidate partial |
| SY-09 | Community engagement/RCCE — liaison, risk communication, two-way engagement | Before, During, After | — | Missing |
| SY-10 | Financial-management system — procurement authority, tracking, insurance | Before, During, After | — | Missing |
| SY-11 | Mutual-aid agreement system — signed MOUs, registry, activation | Before, During | — | Missing |
| SY-12 | Lessons-learned repository — searchable CAP and annual review | Before, After | `cb-exercise-learning` | Candidate partial |

### Strategies (13)

| ID | Official intervention / key components | Guide phase | Current product trace | Gap |
|---|---|---|---|---|
| SR-01 | All-hazards ERP — criteria, HIMT, annexes, IAP/JAS/comms | Before, During | `cb-mcm-activation` | Candidate partial |
| SR-02 | Service Continuity Plan/BCP — critical functions, minimum levels, RTOs, alternatives | Before, During, After | — | Missing |
| SR-03 | Mass Casualty Plan — START/SALT, surge, body management | Before, During | `mi-activate-mcm` | Candidate partial |
| SR-04 | Communicable Disease Outbreak Plan — IPC escalation, PPE/surveillance/notification | Before, During | — | Missing |
| SR-05 | Evacuation Plan — routes, special needs, assembly, transport, return | Before, During | `cb-evacuation-buffer` | Candidate partial |
| SR-06 | CBRN annex — decon, PPE tiers, zones, liaison and disposal | Before, During | — | Missing |
| SR-07 | HIMT governance manual — roles, authority, span of control | Before, During | `cb-mcm-activation` | Candidate partial |
| SR-08 | Multidisciplinary disaster-management committee — charter, membership, schedule | Before | — | Missing |
| SR-09 | Accreditation linkage — resilience aligned to national accreditation | Before | — | Missing |
| SR-10 | Emergency financial mechanisms — fund, petty cash, thresholds | Before, During, After | — | Missing |
| SR-11 | Post-disaster recovery plan — manager, workplan, cost-benefit, community | Before, After | — | Missing |
| SR-12 | AAR/lessons-learned system — protocol, CAP, repository, review | After | `cb-exercise-learning` | Candidate partial |
| SR-13 | IAP per operational period — objectives, assignments, resources, safety, comms | During | `cb-mcm-activation` | Candidate partial |

### Services (9)

| ID | Official intervention / key components | Guide phase | Current product trace | Gap |
|---|---|---|---|---|
| SV-01 | Service-continuity mapping — critical/deferrable, minimum staff, alternate delivery | Before | — | Missing |
| SV-02 | Surge protocols — conventional → contingency → crisis, triggers, authority | Before, During | `mi-activate-mcm` | Candidate partial |
| SV-03 | Triage systems — START/SALT, tags, zones and surge area | Before, During | `cb-gate-triage-point`, MCM zones | Candidate partial |
| SV-04 | Cohorting and isolation — protocols, separate wards, visitors | Before, During | — | Missing |
| SV-05 | Rehabilitation — ≥12m², therapies, assistive/prosthetic services | Before, After | — | Missing |
| SV-06 | Patient/family MHPSS — protocols, referral and PFA | Before, During, After | — | Missing |
| SV-07 | Re-establish primary care and chronic-disease continuity | After | — | Missing |
| SV-08 | Telemedicine/alternative delivery for non-critical care | Before, During | — | Missing |
| SV-09 | Community-health liaison — coordination, needs, discharge support | Before, During, After | — | Missing |

## B. Plans and required contents — Matrix 5 (8)

These are separately listed because a generic capability block is not sufficient: the game must be able to evidence the named contents.

| ID | Official plan and mandatory contents | Trigger | Current product trace | Gap |
|---|---|---|---|---|
| PL-01 | All-hazards ERP: activation criteria, HIMT, hazard annexes, IAP templates, JAS, comms plan, resource inventory | Level 2–3 | `cb-mcm-activation` | Candidate partial |
| PL-02 | BCP: critical-function register, minimum service levels, RTOs, alternate sites, triggers, continuity strategies | Level 2+ / function threatened | — | Missing |
| PL-03 | MCM plan: START/SALT, surge matrix, body management, supply surge, staff recall | MCI declaration | `mi-activate-mcm` | Candidate partial |
| PL-04 | Outbreak plan: IPC escalation, cohorting, PPE, surveillance, notification cascade | Epidemic/pandemic alert | — | Missing |
| PL-05 | Evacuation plan: partial/full routes, special needs, assembly, transport, return criteria | Structural failure/fire/CBRN/flood | `cb-evacuation-buffer` | Candidate partial |
| PL-06 | CBRN annex: decon, PPE tiers, control zones, staff/patient protection, disposal | CBRN declared | — | Missing |
| PL-07 | Recovery plan: manager, timed workplan, vendors, cost-benefit, community, staff demobilisation | Response-to-recovery transition | — | Missing |
| PL-08 | IAP: objectives, assignments, resources, safety, communications, briefing | Each ≤24h operational period | `mi-activate-mcm` | Candidate partial |

## C. Assessment sequence — Matrix 3 (15)

| ID | Official assessment / primary output | Guide phase | Current product trace | Gap |
|---|---|---|---|---|
| AS-01 | Rapid situational assessment → go/no-go / activation decision | During, hours 1–4 | — | Missing |
| AS-02 | Initial damage assessment → evacuation/mutual-aid decision | During/early After | — | Missing |
| AS-03 | Rapid needs assessment → IAP objectives/resource mobilisation | During/early After | — | Missing |
| AS-04 | Intra-action review → real-time corrections/IAP update | During, prolonged event | — | Missing |
| AS-05 | HSI → safety level and mitigation priorities | Before/After | — | Missing |
| AS-06 | Staff competency assessment → training/exercise/hiring plan | Before, annual | — | Missing |
| AS-07 | Accessibility/inclusivity audit → improvement and protocol update | Before | — | Missing |
| AS-08 | BAT → 6S gap map/investment priorities | Before | — | Missing |
| AS-09 | Infrastructure/utilities audit → investment list/preventive maintenance | Before/After | — | Missing |
| AS-10 | Service continuity/BCP assessment → BCP, critical-function and RTO matrix | Before, annual | — | Missing |
| AS-11 | Damage-and-loss assessment → recovery workplan, claims and funding | After | — | Missing |
| AS-12 | AAR → AAR report and CAP | After | `cb-exercise-learning` | Candidate partial |
| AS-13 | STAR-H → risk-scored hazard register/EDRP-H input | Before | — | Missing |
| AS-14 | HVCA → prioritised risk register/capacity gaps | Before | — | Missing |
| AS-15 | Comprehensive resilience evaluation → multi-year investment roadmap | Before, every 2–3 years | — | Missing |

## D. Activation and transition states — Matrix 7 (5)

| ID | Official state and required action | Current product trace | Gap |
|---|---|---|---|
| AC-01 | Level 0 Normal: routine; HIMT standby; H-EOC closed | — | Missing |
| AC-02 | Level 1 Standby/monitoring: EWS alert; HIC/key leads alert; awareness shared with MoH/local EOC | `cb-communications` | Candidate partial |
| AC-03 | Level 2 Partial: HIC/Operations/Planning activated; H-EOC partial; initial IAP; notify MoH/mutual aid | `cb-mcm-activation`, `cb-ict-command-post` | Candidate partial |
| AC-04 | Level 3 Full: all five HIMT functions; H-EOC; IAP cycle; partner/media notification | `mi-activate-mcm`, `cb-ict-command-post` | Candidate partial |
| AC-05 | Demobilisation: HIC-approved progressive release; H-EOC scale-down; final IAP; partner/community notification | — | Missing |

## E. AAR, CAP and organisational learning — Matrix 8 (8)

| ID | Official learning step / output | Current product trace | Gap |
|---|---|---|---|
| LR-01 | Collect background: plans, SitReps, IAPs, media and debrief notes → common framework | — | Missing |
| LR-02 | Develop context-specific trigger questions → question bank | `cb-exercise-learning` | Candidate partial |
| LR-03 | Identify strengths/challenges → root causes, actions | `cb-exercise-learning` | Candidate partial |
| LR-04 | Build participant consensus → validated findings and ownership | — | Missing |
| LR-05 | Debrief AAR team → executive summary and report responsibilities/timeline | — | Missing |
| LR-06 | Debrief management → endorsement and corrective-action resourcing | — | Missing |
| LR-07 | Write AAR report + CAP → focal points, resources and timelines | `cb-exercise-learning` | Candidate partial |
| LR-08 | Follow-up → CAP tracking, repository update and next-exercise verification | `cb-exercise-learning` | Candidate partial |

## F. Product decisions now required

1. **Make assessment a first-class mission family.** The guide sequence begins with BAT/HSI/HVCA/STAR-H and continuity assessment, but the present game begins at activation.
2. **Create a full transition arc.** Alert levels, partial/full activation, IAP cycles, demobilisation, recovery, AAR and CAP must be visibly connected.
3. **Deepen each candidate trace to source evidence.** For example, `cb-lifelines` must record the relevant redundancy criteria; a marker on the map alone does not cover SP-06–SP-09.
4. **Keep Education and Implementation distinct.** Education can use source-backed cases and exercise decisions. Implementation should require authorised facility evidence (plan owner, review date, document/location, decision/approval) rather than asking a learner to perform clinical or engineering work.
5. **Add provenance to every quest.** Each authored quest needs source ID(s) above, local owner, required evidence, review cadence, and a clear statement of what it does not authorise.

## Source map

| Register section | Official extract location |
|---|---|
| A | `resilient-hospitals-MATRIX.md`, Matrix 4; supported by detailed BEFORE/DURING/AFTER sections in `resilient-hospitals-guide-obs.md` |
| B | `resilient-hospitals-MATRIX.md`, Matrix 5; guide obs §§1.3–1.5, 1.9 and 3.1.8 |
| C | `resilient-hospitals-MATRIX.md`, Matrix 3 and assessment sequence; guide obs §§1.1–1.2, 2.2, 2.6, 3.1.3 and 3.2 |
| D | `resilient-hospitals-MATRIX.md`, Matrix 7; guide obs §§2.1–2.4 and 3.1.6 |
| E | `resilient-hospitals-MATRIX.md`, Matrix 8; guide obs §3.2 |
