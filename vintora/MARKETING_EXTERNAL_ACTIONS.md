# Marketing External-Action Approval Controls

> **Prototype mode — no real orders are placed. NO-GO for public launch.** No campaign is published, no email is sent, no budget is spent and no audience is exported. Machine authority: [`config/marketing-external-actions.json`](./config/marketing-external-actions.json), checked by `npm run external-actions:check`.

Canonical references: [`MARKETING_RELEASE_CONTROLS.md`](./MARKETING_RELEASE_CONTROLS.md), [`14-ai-content-generator-module.md`](./14-ai-content-generator-module.md), [`23-ai-marketing-automation-module.md`](./23-ai-marketing-automation-module.md) and the blocked `external-marketing-execution` record in [`config/high-risk-features.json`](./config/high-risk-features.json).

## 1. Sandbox-only channel cap

Allowed channels are `sandbox` and `prototype_local`. Live advertising, ad platforms, email send, social publishing, SEO publishing, influencer outreach, paid search and paid social are blocked by `evaluateExternalMarketingAction()` in `@vintora/shared`. Even a fully approved request returns `externalEffects: false`; the prototype has no external connector. All audience segments in [`config/responsible-drinking-policy.json`](./config/responsible-drinking-policy.json) that indicate minors, unknown age, harmful use, self-exclusion, recovery or health sensitivity are denied.

## 2. Auditable human approval

Every external or paid action requires a recorded approval with `approverUserId`, `actorUserId`, `reason` (8+ characters), `recordedAt`, `promptHash`, `modelVersion` and `payloadHash`. Self-approval is denied, a distinct approver is required, and the recorded timestamp cannot be in the future. The evaluator also denies protected audience segments and unknown actions before approval is considered.

Approvals never release a campaign. The API persists a decision record in the append-only `marketing_release_audit` table and records only simulated `draft` or `pause` state. No live state value exists in the storage constraint.

## 3. Preview, budget and legal approval

- **Preview:** a rendered variant id, `audienceVerified: true` and verification of `age_gate`, `jurisdiction`, `consent_state` and `segment_exclusions` are required before an approval can be accepted.
- **Budget:** a named `ownerUserId` and an explicit sandbox `limitUsd` are required; both `requestedUsd` and `limitUsd` must be zero in the prototype. Positive spend or budget increases are denied. The 8% revenue advertising cap remains a separate design constraint enforced outside the model.
- **Legal:** claims containing health, medical, price, award, provenance, comparative, investment, guarantee or "safe drinking" language require a recorded legal approval with reviewer, jurisdiction, claim-set hash and approval timestamp.

## 4. Emergency pause and kill switch

`POST /v1/admin/marketing/external-actions/evaluate` accepts `kill_switch` with an 8+ character reason and a registered scope (`sandbox_campaign`, `audience_export`, `scheduler` or `all_prototype_channels`). Approval sets `requiresAlert`, records the action in the append-only audit and never changes a live channel. Activation requires a reason but not a distinct approver because it is an emergency safety control. No drill result is attached and `evidenceRef` is null.

## 5. API and verification

| Endpoint | Purpose |
|---|---|
| `GET /v1/admin/marketing/controls` | Read the draft-only release register. |
| `POST /v1/admin/marketing/external-actions/evaluate` | Evaluate `preview`, `approval`, `pause` or `kill_switch`; advisory only. |
| `POST /v1/admin/marketing/campaigns/evaluate` | Existing draft/pause/rollback evaluator; no live effects. |
| `GET /v1/admin/marketing/audit` | Read recent immutable campaign decisions. |

`npm run external-actions:check` verifies the register, evaluator, API route, shared tests, high-risk gate and documentation. The API smoke suite exercises blocked-channel and sandbox-preview decisions. No production immutable audit sink, alert routing, finance-system budget owner validation, legal approval service, external connector or kill-switch drill result exists. All metrics, audiences and previews are deterministic demo values. See [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md).
