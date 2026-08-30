# Disabled workflows

These are staged, not active. GitHub only runs workflows in
`.github/workflows/`, so nothing here executes.

They were switched off because they fail on the current tree, for reasons that
are expected rather than broken:

- **`backend-tests.yml`** — every service method raises `NotImplementedError`,
  so `pytest` fails. `pylint` and `mypy` would also flag the unused imports that
  the stubs carry for their eventual implementations.
- **`frontend-tests.yml`** — `npm ci` requires a `package-lock.json`, which is
  only produced by the first `npm install` and is not committed yet.
- **`deploy.yml`** — manual trigger only, and its registry and deploy steps are
  still TODO placeholders.

## Re-enabling

Once enough of Phase 1 is implemented for a green run:

```bash
git mv .github/workflows.disabled .github/workflows
```

Sensible order: turn on `frontend-tests.yml` after the first `npm install`
commits a lock file, and `backend-tests.yml` after the auth slice
(`backend/docs/FEATURES.md` §3) lands with passing tests. Leave `deploy.yml`
off until there is somewhere to deploy to.

You can also enable them one at a time by moving a single file back into
`.github/workflows/` rather than the whole directory.
