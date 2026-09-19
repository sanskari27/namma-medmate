# Production operations

**Date:** 2026-09-15  
Spine detail also in [`02-cross-cutting.md`](02-cross-cutting.md).

---

## What exists

- Local: `compose.yaml`, PG `:25432`, Redis `:16379`, `make dev`.
- Prod: `compose.prod.yaml` on EC2, loopback ports, host Nginx TLS, private RDS Postgres 16 + ElastiCache Redis 7.1, `ap-south-1`.
- Secrets: SSM SecureString compose.env; `.env` gitignored; JWT random in TF.
- Flyway on Spring boot at container start (deploy = rebuild/restart).
- Health: containers probe `/actuator/health`. Product `GET /api/v1/health` pings DataSource (`HEALTH-SHALLOW` **FIXED**).
- `LocalEnvironmentGuard` rejects RDS/ElastiCache hostnames on `local` profile.

---

## Env matrix (short)

| | Local | Prod |
|---|---|---|
| Profile | `local` / `docker` | `prod` |
| DB | Compose Postgres | Private RDS |
| Redis | Compose (unused by sessions) | ElastiCache (unused by sessions) |
| Cookies | `secure-cookie=false` | `true` |
| Email URLs | localhost defaults | HTTPS SSM seed (`OPS-EMAIL-URL` **FIXED**) |
| Cashfree return | — | **is** seeded pharmacy `/subscription` |
| WhatsApp | compose env | TF SSM seed includes `META_WHATSAPP_*` (existing blobs need one-time set) |
| Files | — | `./files` bind mount; backup **policy** waits on D-006 (`OPS-STORAGE`) |

---

## Findings (ops)

| ID | Sev | Note |
|---|---|---|
| `OPS-EMAIL-URL` | P0 | Reset/verify URLs HTTPS in prod (`FIXED`) |
| `SECRET-SSM-WHATSAPP` | P1 | Meta keys in SSM seed (`FIXED`) |
| `TF-SNAPSHOT` | P1 | `skip_final_snapshot` default false + deletion protection (`FIXED`) |
| `TF-SSH-EXAMPLE` | P1 | Example SSH `/32` (`FIXED`) |
| `OPS-STORAGE` | P1 | KYC/licence files on EC2 disk; policy under D-006 **BLOCKED** |
| `COMPOSE-REDIS-UNUSED` | P2 | Redis unused by sessions; keep service; actuator Redis health off (`FIXED`) |
| `HEALTH-SHALLOW` | P2 | `/api/v1/health` pings DataSource; Redis health off (`FIXED`) |
| `TF-REDIS-CRYPTO` | P2 | ElastiCache transit encryption `preferred` (`FIXED`) |
| `TF-S3-STATE` | P2 | tfstate public-access block (`FIXED`) |
| `COMPOSE-DOC-DRIFT` | P2 | HOST_NGINX.md `pharmacy.` (`FIXED`) |
| `COMPOSE-CASHFREE-ENV` | P3 | example sandbox vs TF production — `CASHFREE_ENV=production` in `.env.prod.example` (`FIXED`, alias of M11-CF-005) |
| `OPS-PUBLIC-BASE` | P3 | unused `PUBLIC_BASE_URL` removed from SSM seed + `.env.prod.example` (`FIXED`) |

---

## D-006 / Module 12

**Open.** Hosting, India residency, DR, backups, scale, retention, localization, environments are **not decided**. Current single-EC2 + 7-day RDS backup is a *fact*, not an approved NFR.

Honest “production ready” cannot be claimed until D-006 is closed. Implementable P0/P1 product/ops rows in this folder are **FIXED**; file-backup **policy** stays blocked. Do not implement M12-S01 while D-006 is open.

---

## Migrations at deploy

Flyway runs on boot. Head = **V64**. Tracker narrative often stops at V56 — process drift only (`FLYWAY-001`). Never edit applied files.

---

## Email / WhatsApp / Cashfree keys

- Resend: env `RESEND_*`; webhook Svix HMAC.
- Cashfree: SSM; return URL seeded; `.env.prod.example` `CASHFREE_ENV=production` (`M11-CF-005` **FIXED**).
- Password-reset / verify-email: SSM seed + `application-prod.properties` HTTPS (`OPS-EMAIL-URL` FIXED).
- WhatsApp: skip-if-blank; Graph unique name + components (`M10-WA-001`/`002` FIXED). SSM keys seeded (`SECRET-SSM-WHATSAPP` / `M10-WA-003` FIXED). Existing blobs need one-time `set`.
