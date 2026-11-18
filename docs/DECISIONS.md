# Decisions Log

One line per decision: **decision** — reason.

- **Source prompt file was `PIF-AdminPanel-MVP-claude-code-prompt.md`** (no `PIF-BUILD-PROMPT.md` existed) — same content/timestamp, clearly the intended spec.
- **Local infra fallback without Docker (`npm run infra:local`)** — this machine has no Docker and no sudo; `embedded-postgres` (real PostgreSQL 16 binaries from npm) plus a small Mailpit-API-compatible SMTP catcher give the same ports/credentials as `docker-compose.yml`, which remains the primary documented path and is used in CI.
- **Pinned majors: NestJS 11, Prisma 6, React 18, Vite 6, Tailwind 3.4, TypeScript 5** — stable, well-known APIs; Tailwind 3 keeps the `tailwind.config.ts` token file the spec asks for.
- **Product branding keeps the original DAN logo + warm-brown auth backgrounds, with "PIF Admin Panel" as product name** — spec: keep original logo; original UI shows no product name other than "Dashboard".
- **Design tokens measured from the running original** (Playwright computed styles) rather than read only from SCSS — the SCSS ships a template palette that the app overrides inline.
- **Playwright uses the system Google Chrome (`channel: 'chrome'`) locally, bundled Chromium in CI** — avoids a large browser download on the dev machine.
