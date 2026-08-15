# Contributing

## Before you commit

```bash
npm run check      # repo invariants — must pass
npm test
```

## Branches and pull requests

- Branch from `main`. Name it `feat/…`, `fix/…`, `chore/…`.
- **Use the same branch name across repositories for a coordinated change** — `feat/artifact-review`
  in three repositories is instantly recognisable and needs no tooling.
- `main` is protected: pull request required, CI required, up-to-date required, no force-push, no
  deletion.

## The `contracts` dependency

> **Pin an exact tag. Never a branch.**
>
> `contracts#v0.3.1` ✅ · `contracts#main` ❌

A branch dependency means the contract changes without any consumer committing anything — that is
version skew with the safety removed. **CI fails on it** (`G2`), and that check is five lines.

## Cross-repository changes

Always in this order:

```
1  contracts     publish, tagged
2  the provider  implement
3  the consumers adopt
```

**Never the reverse.** A consumer expecting an endpoint that does not exist fails at runtime, in
production, in the least obvious place. Design changes to be **additive** — optional fields, new
endpoints, tolerant handling of unknown enum members — so the order is forgiving.

## The deploy gate

**Deployment is triggered by a tag. A tag alone is not sufficient.** Production deploys only when
**all three** hold:

1. The tag's **immutable SHA is reachable from protected `main`**
2. The **required CI workflow passed for that exact SHA** — not the branch, not a later commit
3. Environment approval is recorded

> **Why this is not ceremony.** The prior build attempt's dependency install ran in a subdirectory
> rather than at the workspace root, so *"the most safety-critical tests in the repository gated no
> deploy at all"* — for many releases. Tests existed, passed locally, and gated nothing.
> **A CI run not bound to the deployed SHA is decoration.**

It also reached a state where `main` carried unpushed application code and pushing `main` deployed to
production — which means **tidying a branch can deploy**. Tagging separates "this is merged" from
"this is live".

## Rollback

- **Code:** redeploy a previous tag. **More than one generation is retained** — one bad deploy
  followed by one bad rollback must not leave nothing.
- **Content:** change the version pin. No code revert, no deploy.
- **Schema:** **forward-only.** A migration that turns out wrong is corrected by a new migration that
  has itself been rehearsed.

## Decisions

Record a decision where it is enforced:

| Scope | Written in |
|---|---|
| This repository only | `docs/decisions/` |
| The interface between services | `contracts/docs/decisions/` |
| The product | `citadel-planning/09-decisions/decision-log.md` |

**Include the reasoning** — it is the part that matters in two years. The prior attempt had no stack
rationale recorded anywhere, and nine things in its repository *looked like defects and were
decisions*.
