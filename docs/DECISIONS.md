# Decisions Log

One line per decision: **decision** — reason.

- **Source prompt file was `PIF-AdminPanel-MVP-claude-code-prompt.md`** (no `PIF-BUILD-PROMPT.md` existed) — same content/timestamp, clearly the intended spec.
- **Local infra fallback without Docker (`npm run infra:local`)** — this machine has no Docker and no sudo; `embedded-postgres` (real PostgreSQL 16 binaries from npm) plus a small Mailpit-API-compatible SMTP catcher give the same ports/credentials as `docker-compose.yml`, which remains the primary documented path and is used in CI.
- **Pinned majors: NestJS 11, Prisma 6, React 18, Vite 6, Tailwind 3.4, TypeScript 5** — stable, well-known APIs; Tailwind 3 keeps the `tailwind.config.ts` token file the spec asks for.
- **Product branding keeps the original DAN logo + warm-brown auth backgrounds, with "PIF Admin Panel" as product name** — spec: keep original logo; original UI shows no product name other than "Dashboard".
- **Design tokens measured from the running original** (Playwright computed styles) rather than read only from SCSS — the SCSS ships a template palette that the app overrides inline.
- **Playwright uses the system Google Chrome (`channel: 'chrome'`) locally, bundled Chromium in CI** — avoids a large browser download on the dev machine.
- **Phases 3 and 4 were built in one pass** — auth, RBAC and the CMS modules share guards/audit infrastructure, so they were written together and verified by one e2e run; the time log therefore shows Phase 4 closing at the same timestamp as Phase 3.
- **e2e DB reset uses `migrate deploy` + TRUNCATE (guarded to databases ending in `_test`) instead of `prisma migrate reset`** — Prisma blocks `migrate reset` when run by an AI agent; truncating a dedicated test database is the standard, non-destructive-to-dev alternative.
- **OTP codes stored as HMAC-SHA256 (keyed with a server secret), not bcrypt** — 6-digit codes are cheap to brute force offline from a plain hash; a keyed HMAC is not, and stays fast.
- **Refresh reuse grace window (REFRESH_REUSE_GRACE_SECONDS=10)** — two tabs refreshing at the same moment is not theft; outside the window, reuse revokes the whole family.
- **Forced first-login change doesn't re-ask the temporary password** — the user proved it seconds earlier together with the OTP; the profile change-password does require the current password.
- **In DEMO_MODE the 4 seeded accounts are protected** (no password change, deactivation, role change or deletion) — so recruiters cannot break the shared demo for the next visitor.
- **Seeded public API keys are fixed and documented** — they only expose already-public content and form submission; override with SEED_TUAJA_API_KEY / SEED_DAN_API_KEY or regenerate in the UI.
- **Frontend keeps react-router-dom v6 and Tiptap v2 despite moderate advisories** — the spec pins Router v6 and Tiptap v3 is a breaking rewrite; both advisories are moderate (CI treats moderate as a warning), no high/critical remain. zod moved to v4 to clear a high advisory.
- **Root `e2e/` folder for the Playwright smoke test** — it exercises the whole stack (frontend + API + Mailpit), so it lives at the monorepo root rather than inside one app.
- **Accessible text shades alongside the exact brand palette** — an axe-core WCAG AA scan showed the original's muted grey (#8C9097) and status colours used as small text fail 4.5:1. Brand hex values are kept for surfaces, gradients, borders and icons; text uses darker "ink" shades of the same hues (muted #646A75, success #0B6E52, warning #8A5A00, info #1D6A9A, danger #B4351F / #C9402B). Documented in DESIGN-TOKENS.md.
- **Forced first-login change ends on the dashboard via an explicit "completed" state** — found by the Playwright smoke test: the reset screen's "already signed in → profile" redirect won the race against the navigation.
- **Blog editor mounts only after the draft is hydrated** — found in browser testing: mounting Tiptap with the empty initial draft echoed an empty value back and wiped the loaded content on screen.
