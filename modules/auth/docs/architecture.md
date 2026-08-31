# Auth architecture

```text
dispensary-app-web
  └── auth-ui (Redux Toolkit + RTK Query)
        └── @namma-medmate/api-client
              └── GET /auth/session
                    └── auth-api Lambda
                          └── libs/auth-utils (RS256 JWKS)
```

Auth does not own user, role, or permission tables. Those concerns are deferred.
