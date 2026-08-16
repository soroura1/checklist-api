# Releases — `checklist-api`

**This file owns this repository's release numbering.** A number is never reused and never
renumbered. The prior build attempt had two different releases both numbered R5, with colliding task
numbers, because no single file owned the sequence.

| Release | Status | Tag | Closed | Notes |
|---|---|---|---|---|
| **R0** | 🚧 deployed, not closed | `v0.1.0` | — | Walking skeleton. Live at `api.endura-assess.com`. See the release note below. Tasks: `citadel-planning/06-releases/R0-tasks.md` |

---

## R0 — release note (16 Aug 2026)

**Deployed:** `093c67bce839504c66d0a930095ece007c17b4ad`, tag `v0.1.0`, to
`https://api.endura-assess.com/content` — a single Contabo VPS shared with several other platforms.
Raised as a Woodpecker deployment by `soroura`; the tag pipeline itself cannot deploy, because the
VPS secrets exist only at the `deployment` event.

### What shipped

| | Evidence |
|---|---|
| The service, behind TLS, routed by path | `api-router` (Caddy) maps `/content/*`; Nginx Proxy Manager terminates TLS |
| `H2` `/version` reports the deployed commit | `{"commit":"093c67bce8…","service":"checklist-api"}` — matches the tag |
| `H3` 401-never-404 | Known route **401**, unknown path **404**, both from the public internet |
| `H4` the service's own health | `{"status":"ok"}` — not the proxy's |
| Contract conformance against the **live** deployment | **14/14** |
| `D3` one database per service | Three Postgres 17 instances, no published ports, private network |
| `D4` non-bypassing application role | `checklist_app` created by the first production migration |
| `D5` backup: daily, encrypted, verified readable | `/opt/citadel/backup.sh`, 02:00 daily; asserts the decrypted stream is a real dump |
| **`H6`** restore rehearsal, timed | **Recovery time: 1 second** into a fresh cluster. Roles restored first; `checklist_app` came back `rolsuper=f, rolbypassrls=f, rolcanlogin=t`; RLS **forced** on both tenant tables; 8 tables. Monthly cron |

### What did NOT ship, and why

| | |
|---|---|
| **Offsite backups** | ⚠️ **The most important gap.** Backups are encrypted and local-only. A backup on the same machine survives none of the failures that matter — disk loss, provider incident, ransomware. Needs `rclone` plus a bucket. **R0 cannot close on this** (`D5`) |
| `D7` observability | No external uptime check, no disk alert, and **no backup-failure alert** — the one that must page |
| `D8` staging | Not provisioned. Until it exists, **no real facility data may be entered anywhere** |
| `G5b` the gate's refusal | The gate's *passing* path is proven by this deploy; its *refusing* path is not yet exercised |
| `identity-enrolment` | Begins in R2 (`Q7`–`Q9`). The router 404s `/identity/*` deliberately |
| `citadel`, `checklist-app` | Not yet deployed; DNS and NPM hosts are parked awaiting them |

### Findings from the first deployment

1. **Port 8085 was already allocated** by another platform's adminer, so the router container could
   not start. Fixed on the server by editing `.env` and re-running `./deploy.sh` **by hand — no
   commit, no pipeline.** That symmetry is exactly why the deploy is a server-side script.
2. The VPS is at **82% disk**, hosts ~25 containers, and — before this release — **held no
   application backups at all**, including for platforms carrying real data. Citadel's job now
   covers Citadel's three databases only; the rest remains unprotected and is worth the same
   treatment.

## Rules

1. A release is **closed or reopened, never left ambiguous.**
2. A release is done when its **walk** completes in the deployed environment, performed by someone
   who did not build it.
3. Cutting a tag does not deploy it. See [CONTRIBUTING.md](CONTRIBUTING.md) § *The deploy gate*.
