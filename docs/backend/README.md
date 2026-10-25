# Pharmacy API

The routes in [api-catalog.md](api-catalog.md) are served by `namma-pharmacy/src/app/api/v1/[...path]/route.ts`. The MVP behavior in [../product/domain-model.md](../product/domain-model.md) is the contract. Handlers call the existing calculations in `src/app/data.ts` and `src/app/lib/`.

## Runtime

Handlers are Next.js App Router route handlers inside `namma-pharmacy/src/app/api/v1/`. They run in the same Node server as the dashboard. Production already runs that server as a standalone Next.js build.

Do not add a second backend process or an ORM. Postgres, the `pg` driver, and SQL migrations in `src/server/db.ts` are the persistence choice. Later slices reuse that pharmacy document.

## HTTP conventions

- Prefix: `/api/v1`.
- JSON requests and responses. File downloads use the catalog's CSV and PDF responses.
- Authenticated routes read the pharmacy and user from the server session. A pharmacy or branch id in the body or query is not authorization.
- Write requests that can be retried send `Idempotency-Key`. Checkout, goods receipt, stock quantity changes, packing, cancellation, settlement, and ward issue/return require it.
- Timestamps in stored records remain epoch milliseconds where the MVP uses them. API money fields are integers in paise. Convert at the boundary; do not store a second rupee value.
- Errors use `{ "error": { "code": "STRING_CODE", "message": "..." } }` with an HTTP status. Expected codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `CONFLICT`, `IDEMPOTENCY_REPLAY`, `PLAN_LOCKED`.

## Session and scope

The sign-in route calls Cognito when it is configured, then sets an HTTP-only session cookie. Local development without Cognito accepts any six-digit code. Production without Cognito refuses sign-in.

Target constraints:

- One signed-in user acts for one pharmacy. Queries and writes include that pharmacy in the server-side predicate.
- The MVP has one store per browser. Model a pharmacy first. Add branch only when a slice needs more than one store; do not invent branches in the first slices.
- Staff permissions saved by Manage Users are not enforced today. Once users are persistent, a mutation checks the permission that matches its screen. Until then, do not pretend the shell enforces them.
- Customer, prescription, employee, and patient fields are staff-mediated. There is no customer login in this product.
- Demo OTP `123456`, the hospital pricing OTP, and seeded staff passwords are development fixtures. Production authentication must not accept a fixed code or ship a password in client code.

## Stock and uploads

A stock change and its business document commit together. Repeating the same idempotency key returns the original result and does not move stock twice.

Prescription images, logos, signatures, product photos, and employee documents are stored outside the document row. The API returns `/api/v1/files/<id>`. When `S3_BUCKET` is unset, the bytes stay in Postgres.

## Calculations

Route handlers call the existing pure functions in `src/app/data.ts` and `src/app/lib/` for invoice totals, scan matching, reports, customer aggregation, CRM derivation, and hospital pricing. A handler does not reimplement those formulas.

The POS cart remains on the client. The server sees it at `POST /api/v1/pos/checkout`. Do not add a draft-cart API unless two devices must share one unfinished bill.

## Plan gate

Free and expired subscriptions can use the free and shell routes. Manage Users stays open on Free and is capped by seats. Any active paid plan opens every non-hospital premium route. Hospital routes also require `businessType` `hospital`. A master grant opens one premium route while the plan is Free or the paid term has lapsed, and does nothing during an active paid term. `planForRoute()` remains display copy. A pharmacy cannot change its own plan, except by redeeming one master-issued coupon. That redemption sets the plan through the coupon's validity days.
