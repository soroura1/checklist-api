# Migration rehearsal — R1 F4

**A migration must be rehearsed against the state production is actually in** — not against an empty
database, which is a much easier claim.

## Both lists are bounded

A rehearsal has **two** migration lists, and bounding only one *looks* scoped and is not. The prior
attempt re-pinned three rehearsal tests when later migrations landed, because each had bounded only
its "after" state.

```
BEFORE: ['001_catalogue.sql']                       ← exactly R0's state
AFTER:  ['001_catalogue.sql', '002_governance.sql'] ← exactly R1's state
```

Adding `003` later must NOT silently change what this rehearsal tests.

## What it asserts

1. Construct a database at the **before** list, and populate it.
2. Apply **only** the migrations in `after` minus `before`.
3. **No existing row moved.**
4. **No pre-existing isolation policy changed** — compared byte for byte in `pg_policies`.

> If a new feature needs an existing policy widened, **the design was wrong — stop rather than
> widen.**

Run with `TEST_DB_HOST` set; skips honestly without it.
