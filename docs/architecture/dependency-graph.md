# Dependency graph

See `boundaries/boundary-rules.md`. The machine-enforced graph is:

```text
app → module-ui → lib
app → lib
module-api → lib
lib → lib
```

Forbidden:

```text
app → module-api
module-ui → module-api
module-ui → module-ui
module-api → module-ui
module-api → module-api
lib → app | module-*
```
