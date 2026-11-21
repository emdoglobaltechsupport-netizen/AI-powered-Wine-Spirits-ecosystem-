# Vintora Adapter Capability Isolation

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Every external provider is a deterministic or simulated adapter. No live transaction, communication, identity check, custody movement or model call leaves this repository.

## Authority

Machine authority: [`config/adapter-capability-policy.json`](./config/adapter-capability-policy.json), checked by `npm run adapters:check`. Runtime boundary authority: [`config/runtime-boundaries.json`](./config/runtime-boundaries.json), checked by `npm run boundaries:check`.

## Four explicit modes

| Mode | Meaning | Prototype availability |
|---|---|---|
| `disabled` | No adapter may run or be selected. | Production capability; default in blocked profiles. |
| `mock` | Local deterministic simulation; no external effect. | Default in local, test and staging. |
| `sandbox` | Provider sandbox with external effects. | Not implemented; no account or credential exists. |
| `live` | Real provider with external effects. | Not implemented; launch and licence gates are false. |

Age, KYC, payment, marketing, custody and AI providers default to `mock`. Local and test allow only `disabled`/`mock`. Staging also remains mock/disabled until a separately licensed adapter and launch evidence exist. Production startup is rejected entirely.

## Live-mode kill switches

Enabling a real adapter requires two independent environment checks: `REAL_PROVIDER_OPT_IN` and the per-provider `REAL_*_PROVIDER_OPT_IN`. A profile-scoped credential (`REAL_{PROVIDER}_KEY_{PROFILE}`), a profile that allows real providers, launch clearance, an active high-risk feature and obtained commercial-licence evidence are also required. All are false or null in this prototype. Local live-capable code is blocked; unknown adapter values fail closed.

No licensed live adapter implementation exists. No sandbox provider account or credential exists. No external effect has been executed from this repository.

## Credentials and startup diagnostics

Mock credential prefixes (`local`, `simulated`, `deterministic`, `mock`, `test`) are blocked outside local/test. Startup emits a non-secret JSON event `vintora.runtime.adapters` containing profile, policy version, adapter mode labels, `externalEffectsAllowed: false` and `credentialsLogged: false`. It never logs environment values, keys, tokens or secrets.

## Verification and evidence gaps

`npm run adapters:check` verifies mode/default/opt-in parity and the secret-free log contract. `npm run boundaries:check` and the shared runtime tests verify that local/test cannot enable real providers, staging requires a simulated opt-in, production is blocked and unknown values are denied. A green run proves kill switches and labelling only; it does not provision, test or approve a live provider.
