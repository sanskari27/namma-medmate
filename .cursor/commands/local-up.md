# Local up

Usage: `/local-up`

Start Podman local-dev and serve API + web.

Follow skill `local-dev-serve`:

```sh
pnpm local:up
pnpm exec nx serve auth-api
pnpm exec nx serve dispensary-app-web
```

Adjust serve targets to the module under work.
