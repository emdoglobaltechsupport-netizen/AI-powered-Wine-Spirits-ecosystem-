# Vintora Capacity and Reliability Evidence Status

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Every number on this page is a **design target** or an arithmetic **planning estimate** derived from an unmeasured target. No load, failure, canary or chaos result is attached. Machine authority: [`config/capacity-model.json`](./config/capacity-model.json), checked by `npm run scale:check`.

## Workload model (targets, not measurements)

| Input | Target / estimate | Derivation |
|---|---:|---|
| Peak orders per day | 1,200,000 (target) | canonical scale target |
| Average order writes/s | 13.9 (estimate) | 1,200,000 ÷ 86,400 |
| Peak factor | 10x (assumption) | planning assumption, unvalidated |
| Peak order writes/s | 139 (estimate) | 13.9 × 10, rounded |
| Read:write ratio | 100:1 (assumption) | unvalidated |
| Peak reads/s | 13,900 (estimate) | 139 × 100 |
| Edge requests/s | 50,000 (target) | canonical scale target |
| Median request / p95 response | 8 KB / 64 KB (assumptions) | unvalidated payload assumptions |
| Services fanned out per order | 6 (assumption) | catalogue, pricing, age/KYC, payment, inventory, event bus |
| Estimated peak write / read bandwidth | 2.28 Mbps / 7.29 Gbps (estimates) | RPS × bytes × 8 |

None of these inputs has been observed in a load test. Changing an assumption requires a versioned update to the register and a re-derivation, not a silent edit.

## SLO and error-budget policy (future measurement, not observed)

Platform availability target is **99.99%**, giving an annual error budget of **52.56 minutes** (0.01% × 525,600). API latency targets are **p95 < 200 ms** and **p99 < 500 ms**, measured on a 28-day rolling window. The burn-rate policy defines 2x, 10x and 25x alerts and freezes feature releases at 100% budget consumption.

`measurementPipelineImplemented`, `alertThresholdsDefined` and `measuredResultAttached` are all false. No availability figure on this page is an observed result.

## p95/p99 by route (targets only)

| Route | p95 target | p99 target | Measured p95 / p99 |
|---|---:|---:|---|
| GET /v1/products | 200 ms | 500 ms | none attached |
| POST /v1/cart/quote | 200 ms | 500 ms | none attached |
| POST /v1/checkout | 300 ms | 750 ms | none attached |
| GET /v1/sommelier/answer | 400 ms | 900 ms | none attached |
| GET /v1/admin/coverage | 250 ms | 600 ms | none attached |

Every `measuredP95Ms` and `measuredP99Ms` field in the register is `null`. Checkout and Sommelier carry slower targets because they perform additional deterministic policy evaluation.

## Platform versus third-party availability

Platform availability is measured at the Vintora API boundary only. Payment authorisation, age/KYC and custody-settlement dependencies are **excluded** from the platform SLO and require separate error budgets; none is currently defined. No licensed third-party provider is integrated in this prototype, so no dependency availability can be reported.

## Load and failure test plans (planned, not run)

| Plan | Status | Scope |
|---|---|---|
| Load | planned | Ramp to 139 writes/s and 13,900 reads/s for 30 minutes; record p50/p95/p99 by route |
| Stress | planned | Increase beyond target to saturation; identify first failing dependency |
| Soak | planned | 70% of target for 8 hours; observe memory, pools and lag |
| Failure injection | planned | Fail one DB replica, cache node and third-party adapter in turn |
| Canary | planned | 1% → 5% → 25% staged rollout with SLO comparison |
| Chaos | planned | Game-day terminating a pod and a zone; verify recovery within budget |

Every plan has `status: "planned"`, `evidenceRef: null` and an owner role. No plan has been executed and no result is attached.

## Verification and boundaries

`npm run scale:check` verifies that targets are labelled, the derived workload arithmetic is consistent, all measured fields are null and all test plans remain planned. A green run proves register integrity only; it does not size production infrastructure, validate an SLO, measure latency or grant launch clearance.
