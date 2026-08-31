---
name: playwright-e2e
description: Playwright e2e conventions for this repo (e2e-kit, no Cypress). Use when writing or fixing UI/API Playwright tests.
---

# Playwright e2e

Same procedure as skill `e2e-kit-screen`. Extra rules:

- Role/label locators. No `page.locator('.css')` in specs.
- Specs never import selectors or locators.
- Network stubs only in fixtures.
- No Cypress. No new e2e framework.

Suites: `nx e2e {project}` (smoke + happy-path + failure-cases + a11y for UI). Visual: `nx visual {project}`.
