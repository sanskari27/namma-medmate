---
name: add-storybook-story
description: Add Storybook stories for module UI using auth-ui generate-stories and src/scenarios. Use when adding or changing UI components.
---

# Add Storybook story

Follow `modules/auth/ui`:

- Scenarios in `src/scenarios/{feature}.scenarios.ts`
- `nx generate-stories {slug}-ui` (story-generator)
- `.storybook/main.ts` + `preview.tsx` copied from auth-ui

Visual e2e hits Storybook (`nx visual {slug}-ui`). Keep stories aligned with e2e `data/stories.ts`.
