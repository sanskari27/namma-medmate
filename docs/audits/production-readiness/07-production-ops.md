# Production operations

**Date:** 2026-09-15  
Spine detail also in [`02-cross-cutting.md`](02-cross-cutting.md).

---

## What exists

- Local: `compose.yaml`, PG `:25432`, Redis `:16379`, `make dev`.
- Prod: `compose.prod.yaml` on EC2, loopback ports, host Nginx TLS, private RDS Postgres 16 + ElastiCache Redis 7.1, `ap-south-1`.
- Secrets: SSM SecureString compose.env; `.env` gitignored; JWT random in TF.
- Flyway on Spring boot at container start (deploy = rebuild/restart).
- Health: containers probe `/actuator/health`. Product `GET /api/v1/health` is static UP.
- `LocalEnvironmentGuard` rejects RDS/ElastiCache hostnames on `local` profile.

---

## Env matrix (short)

| | Local | Prod |
|---|---|---|
| Profile | `local` / `docker` | `prod` |
| DB | Compose Postgres | Private RDS |
| Redis | Compose (unused by sessions) | ElastiCache (unused by sessions) |
| Cookies | `secure-cookie=false` | `true` |
| Email URLs | localhost defaults | **not seeded** — P0 |
| Cashfree return | — | **is** seeded pharmacy `/subscription` |
| WhatsApp | compose env | **not** in TF SSM seed |
| Files | — | `./files` bind mount, no backup story |

---

## Findings (ops)

| ID | Sev | Note |
|---|---|---|
| `OPS-EMAIL-URL` | P0 | Reset/verify URLs HTTPS in prod (`FIXED`) |
| `SECRET-SSM-WHATSAPP` | P1 | Meta keys manual |
| `TF-SNAPSHOT` | P1 | `skip_final_snapshot` default true |
| `TF-SSH-EXAMPLE` | P1 | Example SSH `0.0.0.0/0` |
| `OPS-STORAGE` | P1 | KYC/licence files on EC2 disk; policy under D-006 |
| `COMPOSE-REDIS-UNUSED` | P2 | Extra failure domain |
| `HEALTH-SHALLOW` | P2 | `/api/v1/health` always UP |
| `TF-REDIS-CRYPTO` | P2 | ElastiCache no transit encryption |
| `TF-S3-STATE` | P2 | No explicit public-access block |
| `COMPOSE-DOC-DRIFT` | P2 | HOST_NGINX.md `dispensary.` vs live `pharmacy.` |
| `COMPOSE-CASHFREE-ENV` | P3 | example sandbox vs TF production |
| `OPS-PUBLIC-BASE` | P3 | unused `PUBLIC_BASE_URL` |

---

## D-006 / Module 12

**Open.** Hosting, India residency, DR, backups, scale, retention, localization, environments are **not decided**. Current single-EC2 + 7-day RDS backup is a *fact*, not an approved NFR.

Honest “production ready” cannot be claimed until D-006 is closed **and** the P0/P1 product bugs above are fixed. Do not implement M12-S01 while D-006 is open.

---

## Migrations at deploy

Flyway runs on boot. Head = **V64**. Tracker narrative often stops at V56 — process drift only (`FLYWAY-001`). Never edit applied files.

---

## Email / WhatsApp / Cashfree keys

- Resend: env `RESEND_*`; webhook Svix HMAC.
- Cashfree: SSM; return URL seeded; `.env.prod.example` still says sandbox.
- Password-reset / verify-email: SSM seed + `application-prod.properties` HTTPS (`OPS-EMAIL-URL` FIXED).
- WhatsApp: skip-if-blank; Graph unique name + components (`M10-WA-001`/`002` FIXED). SSM keys still P1 (`SECRET-SSM-WHATSAPP`).
