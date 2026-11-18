## What & why

<!-- One or two sentences on the change and its motivation. -->

## How to test

1.
2.

## Checklist

- [ ] CI is green (lint, typecheck, unit, e2e, build, smoke)
- [ ] New/changed endpoints are permission-checked and site-scoped
- [ ] Mutations write an activity-log entry
- [ ] Migrations are backwards compatible (`prisma migrate deploy` safe)
- [ ] No secrets or real client data committed
- [ ] Docs updated (README / docs/*) if behaviour changed
