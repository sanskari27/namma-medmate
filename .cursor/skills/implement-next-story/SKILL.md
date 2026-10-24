---
name: implement-next-story
description: Select and complete the first dependency-ready Namma Pharmacy backend slice from the delivery roadmap.
---

# Implement next pharmacy slice

1. Read `docs/backend/delivery-roadmap.md`.
2. Stop if any row is `in_progress`; report its ID.
3. Select the first row whose status is `ready`, or `pending` with every dependency `done`.
4. Follow `implement-story` for that ID in this agent. Do not spawn `story-implementer`.
5. Complete one slice. The only nested agent is `story-verifier`, spawned once after the listed gates succeed.
