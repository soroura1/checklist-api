# `checklist-api`

**The governed content spine. The only executable content source.**

**Depends on:** `contracts`
**Part of:** Citadel — see the plan in `citadel-planning/`

---

## Scope boundary — read this first

> Citadel is for **preparedness, exercise and improvement only**. It is explicitly **not**:
>
> - live incident command or live incident operations
> - live triage or patient tracking during a real event
> - clinical decision support
> - facility certification or accreditation
>
> If a request would move the product across that line — a "use during a real incident" mode, a
> live patient board, anything that could be mistaken for clinical guidance — **stop and raise it
> rather than building it.**

**This statement is reproduced verbatim in every repository and on every entry surface.** It is a
safety property of the product, not a scoping preference, and it is not negotiable by a feature
request, a pilot, a customer, or a deadline.

Enforcement mechanisms: `citadel-planning/00-foundation/scope-boundary-and-safety.md` § 3.

---

## Run it

```bash
npm install
npm run dev
npm test
npm run check          # repo invariants — must pass before every commit
```

## Release

Releases are cut by **tag**, and a tag alone is not enough. See [CONTRIBUTING.md](CONTRIBUTING.md)
§ *The deploy gate*.

## Decisions

Repository-scoped decisions: [`docs/decisions/`](docs/decisions/).
Product-scoped decisions: `citadel-planning/09-decisions/decision-log.md`.
