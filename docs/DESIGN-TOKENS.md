# Design Tokens

Extracted from the original dashboard source (`src/assets/scss/_variables.scss`, `styles.css`, page components) **and** verified against computed styles of the running original (Playwright `getComputedStyle`). Hex values are exact, not approximations.

## Colors

| Token | Hex | Where it is used in the original |
|---|---|---|
| `body` | `#F0F1F7` | App background (`--body-bg-rgb: 240,241,247`) |
| `text` | `#333335` | Default text (`--default-text-color`) |
| `muted` | `#8C9097` | Secondary text (`--text-muted`) |
| `border` | `#F3F3F3` | Default borders (`--default-border`) |
| `input-border` | `#E9EDF6` | Form inputs |
| `sidebar` | `#1E1E2D` | Sidebar + sidebar header background |
| `sidebar-text` | `#A3AED1` | Sidebar menu items (Montserrat 500) |
| `primary` | `#845ADF` | Bootstrap primary (`--primary-rgb: 132,90,223`), buttons, card-header tint (10%) |
| `accent` (indigo) | `#4A4A89` | Headings, card titles, page titles, table accents |
| `accent-light` | `#6B6BA8` | Gradient partner for indigo |
| `accent-border` | `#C9C8E8` | Card-header border, table borders, inputs in lists |
| `hero-from` / `hero-to` | `#7549AD` → `#4A4A89` | Page-header banner gradient (90deg) |
| `brand` (brown) | `#552A0E` | Auth screens: titles, links, primary pill button |
| `brand-hover` | `#F4E0CC` | Auth button hover background |
| `brand-border` | `#F7F1EB` | Auth button border |
| `copper` | `#824703` | KPI card gradient (135deg → `#FCF2E6`), "Dan" accent |
| `amber` | `#F59E0B` | Quick-action gradient partner of copper |
| `violet` | `#7D53B4` | KPI card gradient (90deg → `#EAF1FE`) |
| `secondary` | `#23B7E5` | status/info accents |
| `success` | `#26BF94` | success badges |
| `warning` | `#F5B849` | warning badges |
| `info` | `#49B6F5` | info badges |
| `danger` | `#E6533C` | destructive actions, error badges |

## Typography
- **Inter** (300–700) for the app; **Montserrat** (500/600) for the sidebar menu.
- Base font size `0.813rem` (13px). Page title 24px/700 in `#4A4A89`; card title 15px/700 in `#4A4A89`; sidebar label 13.6px/500.

## Shape & elevation
- Card radius **16px** (`custom-card`), card-header radius 10px top, default radius `0.5rem`, inputs/buttons ~5.6px, sidebar items 8px, auth buttons pill.
- Shadows: footer `0 4px 16px rgba(0,0,0,.1)`; cards flat (`0 .125rem 0 rgba(10,10,10,.04)`).

## Layout signatures reproduced
- **Login/OTP/Forgot/Reset:** full-bleed warm-brown photographic background (`adminCover1`), large DAN logo centred above a translucent card (`#fff8f847`), brown title "Sign In to Dashboard", pill "Continue" button in `#552A0E`.
- **Shell:** 240px dark sidebar (`#1E1E2D`) with logo mark at top, white 60px header with hamburger + right-side actions, `#F0F1F7` content, white footer "Copyright © {year}".
- **Page header:** rounded banner with violet→indigo gradient, white description text on the left, breadcrumb on the right.
- **Card header:** primary 10% tint background, `#C9C8E8` border, small gradient accent bar left of the indigo title, search + action buttons on the right.
- **Dashboard:** "Welcome Back, {name}! 👋" in indigo + date, role pill top-right, three gradient KPI cards, "Statistics Overview" and "Quick Actions" cards.
