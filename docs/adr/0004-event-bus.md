# ADR 0004: Event bus

- Status: Accepted
- Date: 2026-08-31

## Decision

Cross-component communication uses a process-wide typed pub/sub singleton in `libs/event-bus`. A new UI module adds one `events.contract.ts` file and hook calls.
