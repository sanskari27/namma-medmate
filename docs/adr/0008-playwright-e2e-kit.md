# ADR 0008: Playwright e2e kit

- Status: Accepted
- Date: 2026-08-31

## Decision

UI end-to-end helpers live in `libs/e2e-kit` (`type:lib`) so apps and module UI may import them. Playwright config factories stay in `tools/playwright-config`.

Each screen is four files: selectors (data), locators (`page` in), page object (`page` in constructor), steps (page objects as params). Cross-screen A→B→X journeys are functions in `tests/e2e/flows/`. Specs live under `tests/e2e/specs/{smoke,happy-path,failure-cases,a11y,visual}/` and do not import selectors or locators.

Smoke, happy-path, failure-cases, and a11y run under `nx e2e`. Visual snapshots are platform-specific and run under `nx visual`.

Module UI may export `./e2e` for reuse. App specs compose those steps. HTTP Playwright tests do not use page objects.
