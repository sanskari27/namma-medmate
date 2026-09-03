# Screen composition

How to split React UI so screens stay orchestrators and designs stay clean.

## Target shape

```text
screens/<name>/
  <Name>Screen.tsx              # data, handlers, layout grid only
  <Name>Screen.utils.ts         # pure helpers, status copy, mappers
  tests/<Name>Screen.test.tsx
  components/
    <name>-header/
      <Name>Header.tsx
      index.ts
    <name>-status-banner/
    <name>-list-panel/
    <name>-detail-panel/        # may compose further section children
      <Name>DetailPanel.tsx
      <name>-contact-fields/
      <name>-health-fields/
```

Screen file responsibilities only:

1. Load / mutate data (service or store).
2. Map status → which child to show.
3. Wire callbacks and ids.
4. Compose a layout grid of children.

Screen file must **not** contain long field grids, table row markup, or
dialog bodies. Those belong in `components/`.

## Split triggers (extract immediately)

| Signal | Extract into |
| --- | --- |
| Page header + primary CTA | `*-header` |
| Status / alert / banner | `*-status-banner` |
| Search + list / table | `*-list-panel` (+ row child if row JSX > ~40 lines) |
| Empty / select-prompt state | `*-empty-state` or branch inside the panel |
| Edit / create form | `*-form` or `*-profile-panel` |
| Form field group (contact, address, health, licence) | `*-contact-fields`, etc. |
| Dialog / drawer body | template if shared; else `components/*-dialog` |
| Pure formatters / validators / status strings | `Screen.utils.ts` |

## Size heuristics

- Prefer child components under **~120 lines** of JSX.
- Treat **~200 lines** in any `.tsx` as a soft stop — split before adding more.
- Treat **~300+ lines** or **two+ visual regions** in one file as a hard fail;
  finish the split before claiming the slice done.
- Utils/helpers with no JSX may stay in `*.utils.ts` even if longer.

## Props style

- Children are presentational when possible: props in, callbacks out.
- Pass the smallest props needed; avoid dumping the whole screen state object
  into every child.
- Shared types (`FormState`, `PageStatus`) live in `Screen.utils.ts` (or a
  colocated `types` only if utils grows unwieldy).
- Each child folder: `ComponentName.tsx` + `index.ts` re-export.

## Design while splitting

Splitting is not only file hygiene — it forces cleaner UI:

- Each child owns one job and one visual region (header vs list vs detail).
- Shared spacing: use consistent `gap-*` / `px-4 py-3` / `border-line` rhythms
  across siblings so the page reads as one system.
- Panels: full-height columns with sticky/footer action bars when editing;
  scroll the fieldset, not the whole page.
- Do not wrap every region in a shadowed card. Prefer hairline `border-line`
  surfaces per the app contract.

## Anti-patterns

- One `*Screen.tsx` with status helpers + form + list + dialogs inline.
- A “panel” that still contains three unlabeled field groups with no children.
- Duplicating the same field row markup instead of a small section component.
- Creating empty `components/` folders “for later”.
- Promoting screen-private UI into `@molecules` / `@templates` before a second
  screen needs it (stay under `screens/<name>/components/` first).

## Checklist before gates

- [ ] Screen file is mostly composition + handlers
- [ ] Each major region is its own folder under `components/`
- [ ] Form sections are separate when there is more than one group
- [ ] Utils hold copy/mappers, not JSX
- [ ] Layout rhythm matches the app uniqueness contract
