# Domain module template

Copy this folder to `modules/<domain>/` and replace placeholders.

```
modules/<domain>/
  ui/     # Nx project, tag type:module-ui
  api/    # Nx project, tag type:module-api
  docs/   # documentation only
```

Rules:

- UI depends only on `libs/*`
- API depends only on `libs/*`
- UI reaches APIs through `@namma-medmate/api-client`
- Cross-module UI communication uses `@namma-medmate/event-bus`
- API projects never contain a `db/` folder
