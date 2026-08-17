# `checklist-api` — status

**Last updated:** 2026-08-17 · ✅ **LIVE** at `api.endura-assess.com`
**Topology:** [`../CLAUDE.md`](../CLAUDE.md) — ports, `TARGET`, `.env`. Read before proposing values.

## The governed content spine

Serves the catalogue. **Publication authority lives here** (`DEC-018`): content is not active
because it exists in a folder — only the catalogue may be published or executed.

## ★ Tenancy — the property everything rests on

Installed in migration `001`, while there was nothing to lose.

| | |
|---|---|
| RLS is **FORCED**, not merely enabled | `enable` alone **exempts the table owner** |
| The app connects as **`checklist_app`** | No superuser bit, no `BYPASSRLS`, its own credential. **Forcing does not constrain a superuser**, and the official Postgres image makes `POSTGRES_USER` one |
| An **unset tenant matches nothing** | `facility_id = NULL` is NULL, not TRUE. Forgetting who is asking yields *empty*, not *everything* |

⚠️ **An isolation test on the owner connection measures nothing.** The prior attempt's first
isolation test reported a phantom leak for exactly this reason. `test/isolation.test.js` therefore
also asserts that the **owner** connection *does* see everything.

## Migrations

`001` catalogue + tenancy · `002` governance, lifecycle, immutability trigger · `003` `adapted_from`
(`DEC-025`).

⚠️ **A migration is IMMUTABLE the moment it deploys.** Its checksum is stored; editing it breaks
every existing deployment. Correct it with a **new** migration — that is what `003` does.

⚠️ **Grep the ledger before naming a table.** `create table if not exists` does not tell you the name
is taken — it silently hands back the old one. Four names collided in the prior attempt and seven
tables had to be renamed.

## Content — batch B1, `draft`

`content/batches/B1/` — `HZ-HVCA-001`, six items derived from PAHO *Resilient Hospitals* §1.1, each
citing its own page. `content/registers/` holds the source, permission, reconciliation, structuring
and `D6b` pre-check records; `coverage-report.json` is **derived by script, never written**.

⛔ **It cannot advance past `draft`.** `D7`–`D9` need a reviewer `A4` has not named, and `canApprove`
checks the editor list — in which the authoring agent is recorded.

```bash
export PATH="/opt/homebrew/opt/node@26/bin:$PATH"
npm test                    # 34 pass, 5 honest skips without a database
npm run content:validate    # schemas + cross-file rules + derived coverage
```

With a database (see `../CLAUDE.md` for credentials) it is **49/49**.
