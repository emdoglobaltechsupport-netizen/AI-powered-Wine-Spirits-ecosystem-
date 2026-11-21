# Vintora Prototype Secret and Network Isolation

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Machine authority: [`config/network-isolation-policy.json`](./config/network-isolation-policy.json); checked by `npm run network:check`. These controls keep the local stack off shared and production networks; they are not a hosted firewall policy.

## 1. Compose boundary

[`docker-compose.yml`](./docker-compose.yml) publishes PostgreSQL, Redis, API and prototype ports on `127.0.0.1` only. The `db` and `redis` services attach solely to `vintora-internal`, a Compose-internal network. The API attaches to both `vintora-internal` and `vintora-edge`; the prototype attaches only to `vintora-edge`. No service uses host networking, a shared VPC or a production network.

| Service | Networks | Host binding |
|---|---|---|
| `db` | `vintora-internal` | `127.0.0.1:${POSTGRES_PORT:-5432}:5432` |
| `redis` | `vintora-internal` | `127.0.0.1:${REDIS_PORT:-6379}:6379` |
| `api` | `vintora-internal`, `vintora-edge` | `127.0.0.1:${API_PORT:-4000}:4000` |
| `prototype` | `vintora-edge` | `127.0.0.1:${PROTOTYPE_PORT:-8123}:8123` |

## 2. Secret isolation

- `POSTGRES_PASSWORD`, `SESSION_SECRET`, `SEED_ADMIN_PASSWORD` and `SEED_USER_PASSWORD` come from a generated gitignored `.env` or the host process environment.
- No secret is baked into the image, Compose file, fixtures, workflow or documentation. [`Dockerfile`](./Dockerfile) runs as `node` and sets `NODE_ENV=development`.
- Demo identities are created only by `db:seed:dev` in `local`/`test`; see [`SETUP.md`](./SETUP.md) and [`RUNTIME_BOUNDARIES.md`](./RUNTIME_BOUNDARIES.md).
- No shared secret store or production credential is attached.

## 3. Forbidden configurations

The checker rejects `0.0.0.0` bindings for the four prototype ports, `network_mode: host`, `shared-vpc` and `production-vpc` references in the Compose file. A change that relaxes a binding must be reviewed as an architecture change under [`ADR_PROCESS.md`](./ADR_PROCESS.md).

## 4. Evidence gaps

No hosted network policy, firewall rule, VPC attachment or network ACL evidence is attached. Docker Compose configuration and daemon reachability passed local `setup:doctor`, but full container startup is not exercised here. No secrets-manager integration exists. This document defines local isolation only and does not make the prototype network-safe for production traffic.
