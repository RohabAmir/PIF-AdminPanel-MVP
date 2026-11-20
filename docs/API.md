# API reference

Interactive OpenAPI docs: **`/api/docs`** (Swagger UI) — e.g. http://localhost:3000/api/docs.

- Base path: `/api`. JSON in/out. Times are ISO-8601 UTC.
- Admin endpoints: `Authorization: Bearer <accessToken>`; CMS endpoints also need `X-Site-Id: <website uuid>`.
- Public content endpoints: `X-API-Key: <website key>`; CORS open; `Cache-Control: public, max-age=60`.
- Lists return `{ data, meta: { page, pageSize, total, totalPages } }` and accept `page`, `pageSize` (≤100), `search`, `sortBy`, `sortOrder`.
- Errors return `{ statusCode, error, message, details?, requestId }`; validation errors put `[{ field, errors[] }]` in `details`.

## Auth — `/api/auth`

| Method | Path               | Auth   | Notes                                                                                                                                                                                         |
| ------ | ------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/login`           | public | `{ email, password }` → `{ otpSessionToken, email (masked), expiresInSeconds, resendCooldownSeconds, resendsRemaining, demoOtp? }`. 401 generic error, 423 when locked (5 failures → 15 min). |
| POST   | `/verify-otp`      | public | `{ otpSessionToken, code }` → `{ accessToken, expiresAt, user }` + `pif_rt` httpOnly cookie. 5 attempts max.                                                                                  |
| POST   | `/resend-otp`      | public | `{ otpSessionToken }`. 30 s cooldown, max 3.                                                                                                                                                  |
| POST   | `/refresh`         | cookie | Rotates the refresh token. 204 when no cookie; reuse of a rotated token revokes the family.                                                                                                   |
| POST   | `/logout`          | cookie | Revokes the token family, clears cookie (204).                                                                                                                                                |
| POST   | `/logout-all`      | bearer | Revokes every session of the user.                                                                                                                                                            |
| POST   | `/forgot-password` | public | `{ email }` → always the same message.                                                                                                                                                        |
| POST   | `/reset-password`  | public | `{ token, password }` — single use, 30 min.                                                                                                                                                   |
| POST   | `/change-password` | bearer | `{ currentPassword?, newPassword }` (current not needed for the forced first-login change) → new session.                                                                                     |
| GET    | `/me`              | bearer | User, permissions and accessible websites.                                                                                                                                                    |

## Administration (Super Admin)

| Method           | Path                                             | Notes                                                                                                          |
| ---------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| GET/POST         | `/users`                                         | List (filters `role`, `status`, `siteId`) / create (`{ name, email, role, siteIds }` → `{ user, emailSent }`). |
| GET/PATCH/DELETE | `/users/:id`                                     | Update `{ name?, role?, siteIds? }`.                                                                           |
| PATCH            | `/users/:id/status`                              | `{ status: ACTIVE \| INACTIVE }`.                                                                              |
| POST             | `/users/:id/resend-welcome`                      | New temporary password + email.                                                                                |
| GET/POST         | `/sites`                                         | Create returns `{ site, apiKey }` (key shown once).                                                            |
| GET/PATCH/DELETE | `/sites/:id`                                     | Delete requires `?confirm=<exact name>`.                                                                       |
| POST             | `/sites/:id/regenerate-key`                      | Old key stops working immediately.                                                                             |
| GET              | `/activity-logs`                                 | Filters `actorId, role, siteId (or "global"), action, entityType, dateFrom, dateTo, search`.                   |
| GET              | `/activity-logs/facets`, `/activity-logs/export` | Filter options; CSV export. No update/delete endpoints exist.                                                  |

## CMS (site-scoped, `X-Site-Id`)

| Resource   | Endpoints                                                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pages      | `GET/POST /pages`, `GET/PATCH/DELETE /pages/:id`, `POST /pages/:id/{publish,unpublish,archive,duplicate}`, `PUT /pages/order`                                                                                                                                                                    |
| Sections   | `GET/POST /pages/:pageId/sections`, `PUT /pages/:pageId/sections/order`, `GET/PATCH/DELETE /sections/:id`, `POST /sections/:id/duplicate` — `content` validated per type (`HERO, RICH_TEXT, IMAGE_TEXT, FEATURE_CARDS, STATS, TESTIMONIALS, FAQ, CTA, GALLERY, IMAGE_CARDS, LATEST_POSTS, FORM`) |
| Blogs      | `GET/POST /blogs`, `GET/PATCH/DELETE /blogs/:id`, `POST /blogs/:id/publish` (`{ publishedAt? }` future ⇒ scheduled), `POST /blogs/:id/unpublish`                                                                                                                                                 |
| Categories | `GET/POST /blog-categories`, `PATCH/DELETE /blog-categories/:id`                                                                                                                                                                                                                                 |
| Forms      | `GET/POST /forms`, `GET/PATCH/DELETE /forms/:id`                                                                                                                                                                                                                                                 |
| Leads      | `GET /leads` (+ `counts` by status; filters `formId, status, dateFrom, dateTo, search`), `GET /leads/export` (CSV), `GET/DELETE /leads/:id`, `PATCH /leads/:id/status`, `POST /leads/:id/notes`                                                                                                  |
| Social     | `GET/POST /social-links`, `PUT /social-links/order`, `PATCH/DELETE /social-links/:id`                                                                                                                                                                                                            |
| SEO        | `GET/PUT /seo/settings`                                                                                                                                                                                                                                                                          |
| Media      | `GET /media`, `POST /media/upload` (multipart `file`, ≤5 MB, JPEG/PNG/WebP/GIF), `POST /media/external` (`{ url, alt? }`), `PATCH/DELETE /media/:id`                                                                                                                                             |
| Dashboard  | `GET /dashboard/stats?tzOffset=`                                                                                                                                                                                                                                                                 |
| Profile    | `PATCH /profile` (`{ name?, avatarColor? }`)                                                                                                                                                                                                                                                     |

## Public content API — `/api/public` (`X-API-Key`)

| Method | Path                            | Returns                                                                 |
| ------ | ------------------------------- | ----------------------------------------------------------------------- |
| GET    | `/pages`                        | Published pages (nav tree data)                                         |
| GET    | `/pages/:slug`                  | Page + visible sections + computed SEO                                  |
| GET    | `/blogs?page&pageSize&category` | Published posts (scheduled ones once their date passes)                 |
| GET    | `/blogs/:slug`                  | Post + SEO                                                              |
| GET    | `/social-links`                 | Active links in order                                                   |
| GET    | `/seo/:pageSlug`                | `{ title, description, canonical, robots, og, googleSiteVerification }` |
| GET    | `/forms/:key`                   | Active form definition                                                  |
| POST   | `/forms/:key/submit`            | `{ data, sourcePage?, _hp? }` → creates a Lead (honeypot + rate limit)  |

```bash
curl https://<app>/api/public/pages/home -H "X-API-Key: pif_tuajadem_PublicDemoKey-TuajaDemo-2026"

curl -X POST https://<app>/api/public/forms/contact/submit \
  -H "X-API-Key: pif_tuajadem_PublicDemoKey-TuajaDemo-2026" -H "Content-Type: application/json" \
  -d '{"data":{"name":"Jane","email":"jane@example.com","topic":"General","message":"Hello there!","consent":true},"sourcePage":"/contact"}'
```

## Misc

`GET /api/health` (database check) · `GET /api/meta/config` (demo mode, upload availability).
