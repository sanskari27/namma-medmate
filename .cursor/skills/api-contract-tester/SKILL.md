---
name: api-contract-tester
description: Diff swagger, implemented-routes, controllers, generated client, and Playwright specs. Use before merge or when reviewing API changes.
---

# API contract tester

Fail if a route exists in code but not swagger (or the reverse).

Check per endpoint: method + path, operationId, auth, request fields, success envelope, §9 error codes, pagination, Playwright happy-path + failure-cases.

Used by agent `contract-guardian`. Do not silently rewrite the requirement doc to match a bug.
