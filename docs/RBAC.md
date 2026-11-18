# Roles & permissions (RBAC)

The **backend is the source of truth**: every endpoint is protected by guards. The frontend mirrors the matrix only to hide or disable UI.

- Roles map to permissions in `backend/src/common/permissions.ts` (mirrored in `frontend/src/lib/permissions.ts`).
- Endpoints declare `@RequirePermission(...)`; class- and handler-level permissions are combined.
- CMS controllers are also `@SiteScoped()`: the caller must be assigned to the website in `X-Site-Id`.

## Matrix

| Capability                                                                                  | Permission        | Super Admin | Admin | Editor | Viewer |
| ------------------------------------------------------------------------------------------- | ----------------- | :---------: | :---: | :----: | :----: |
| Manage websites (tenants)                                                                   | `sites:manage`    |     ✅      |  ❌   |   ❌   |   ❌   |
| Add / edit / deactivate / delete users, assign roles & sites                                | `users:manage`    |     ✅      |  ❌   |   ❌   |   ❌   |
| View activity logs                                                                          | `logs:view`       |     ✅      |  ❌   |   ❌   |   ❌   |
| CMS: view everything (pages, sections, blogs, forms, social, SEO, leads, media)             | `content:read`    |     ✅      |  ✅   |   ✅   |   ✅   |
| CMS: create & edit content (pages, sections, blogs, categories, forms, media, per-page SEO) | `content:write`   |     ✅      |  ✅   |   ✅   |   ❌   |
| CMS: publish / unpublish / archive                                                          | `content:publish` |     ✅      |  ✅   |   ❌   |   ❌   |
| CMS: delete                                                                                 | `content:delete`  |     ✅      |  ✅   |   ❌   |   ❌   |
| Global SEO & social media settings                                                          | `settings:manage` |     ✅      |  ✅   |   ❌   |   ❌   |
| Leads: update status / add notes                                                            | `leads:update`    |     ✅      |  ✅   |   ✅   |   ❌   |
| Leads: delete                                                                               | `leads:delete`    |     ✅      |  ✅   |   ❌   |   ❌   |
| Leads: export CSV                                                                           | `leads:export`    |     ✅      |  ✅   |   ❌   |   ❌   |
| Public API playground (UI)                                                                  | `settings:manage` |     ✅      |  ✅   |   ❌   |   ❌   |
| Own profile & own password                                                                  | `profile:self`    |     ✅      |  ✅   |   ✅   |   ✅   |

## Website scoping

- **Super Admin** — every website (including inactive ones).
- **Everyone else** — only websites explicitly assigned through `UserSite`, and only while active.
- A request for an unassigned website returns **403** even with a valid role. A guessed record id from another website returns **404** (the data layer filters by `siteId`).

## Safety rules

- Super Admins cannot be created from the UI or API (only seeded); roles assignable: Admin, Editor, Viewer.
- You cannot change your own role/status or delete yourself.
- The last active Super Admin cannot be demoted, deactivated or deleted.
- Deactivation revokes every session immediately (refresh tokens revoked + access tokens invalidated via `tokenVersion`).
- In `DEMO_MODE`, the four seeded demo accounts are protected from password changes, deactivation, role changes and deletion.

## What each role sees in the UI

|         | Super Admin                                                                      | Admin                                   | Editor                                                                           | Viewer                               |
| ------- | -------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------ |
| Sidebar | Dashboard, content menu, Websites, Admins & Users, Activity Logs, API Playground | Dashboard, content menu, API Playground | Dashboard, content menu                                                          | Dashboard, content menu              |
| Buttons | everything                                                                       | everything inside assigned sites        | Add/Edit/Save, lead status & notes — no Publish, Delete, Export, SEO/Social edit | read-only screens, no action buttons |

## Tests

`backend/test/rbac-tenancy.e2e-spec.ts` and `backend/src/common/permissions.spec.ts` verify the matrix, 403s, cross-tenant access attempts and the dynamic third website.
