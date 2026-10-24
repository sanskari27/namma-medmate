# Planned pharmacy API

Every endpoint in [api-catalog.md](api-catalog.md) is **planned**. No `src/app/api` route exists. The MVP behavior in [../product/domain-model.md](../product/domain-model.md) is the contract.

## Runtime

Handlers are Next.js App Router route handlers inside `namma-pharmacy/src/app/api/v1/`. They run in the same Node server as the dashboard. Production already runs that server as a standalone Next.js build.

Do not add a second backend process, ORM, or database package until a slice cannot meet its constraint with the smallest persistence choice. The first slice chooses the persistence mechanism once and the later slices reuse it.

## HTTP conventions

- Prefix: `/api/v1`.
- JSON requests and responses. File downloads use the catalog's CSV and PDF responses.
- Authenticated routes read the pharmacy and user from the server session. A pharmacy or branch id in the body or query is not authorization.
- Write requests that can be retried send `Idempotency-Key`. Checkout, goods receipt, stock quantity changes, packing, cancellation, settlement, and ward issue/return require it.
- Timestamps in stored records remain epoch milliseconds where the MVP uses them. API money fields are integers in paise. Convert at the boundary; do not store a second rupee value.
- Errors use `{ "error": { "code": "STRING_CODE", "message": "..." } }` with an HTTP status. Expected codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `CONFLICT`, `IDEMPOTENCY_REPLAY`, `PLAN_LOCKED`.

## Session and scope

The current sign-in only proves that someone typed six digits. The planned session replaces that with a server-issued HTTP-only session cookie.

Target constraints:

- One signed-in user acts for one pharmacy. Queries and writes include that pharmacy in the server-side predicate.
- The MVP has one store per browser. Model a pharmacy first. Add branch only when a slice needs more than one store; do not invent branches in the first slices.
- Staff permissions saved by Manage Users are not enforced today. Once users are persistent, a mutation checks the permission that matches its screen. Until then, do not pretend the shell enforces them.
- Customer, prescription, employee, and patient fields are staff-mediated. There is no customer login in this product.
- Demo OTP `123456`, the hospital pricing OTP, and seeded staff passwords are development fixtures. Production authentication must not accept a fixed code or ship a password in client code.

## Stock and uploads

A stock change and its business document commit together. Repeating the same idempotency key returns the original result and does not move stock twice.

Prescription images, logos, signatures, product photos, and employee documents are data URLs in the MVP. The planned API stores the file outside the document row and returns an identifier. The screen may keep using a data URL until the slice that owns that upload migrates it.

`localStorage` stays the MVP fallback until the owning slice is `done`. A slice migrates only its own entities. Reset demo remains a development-only route and is absent in production.

## Calculations

Route handlers call the existing pure functions in `src/app/data.ts` and `src/app/lib/` for invoice totals, scan matching, reports, customer aggregation, CRM derivation, and hospital pricing. A handler does not reimplement those formulas.

The POS cart remains on the client. The server sees it at `POST /api/v1/pos/checkout`. Do not add a draft-cart API unless two devices must share one unfinished bill.

## Plan gate

Preserve today's gate exactly until a product change says otherwise: Free and expired subscriptions can use the free and shell routes; any other active plan can use every route, including hospital screens. Hospital data is available only when `businessType` is `hospital`. `planForRoute()` remains display copy.
