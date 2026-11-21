# NØRTH — Header Customization Controls (Theme Editor)

Adds complete Theme Editor controls to the existing header. The header was **not redesigned**: with default settings it renders identically to before (verified pixel for pixel at 1920, 1440, 1100, 820 and 390 px).

## 1. Files (5 replacements, nothing new, nothing deleted)
| Path | What changed |
|---|---|
| `sections/header.liquid` | New settings (schema) and the `{% style %}` block that turns them into CSS variables; three `data-` attributes on `<header>`. Header markup is otherwise unchanged |
| `sections/announcement-bar.liquid` | New settings (visibility, font size, spacing); same variable approach |
| `assets/header.css` | Header, announcement bar and mobile menu now read the variables (fallbacks equal the old values) |
| `assets/mega-menu.css` | Mega menu reads the variables |
| `assets/header.js` | Adds the optional "hide on scroll down" sticky mode (one passive scroll listener). Everything else unchanged |

Copy each file over the same path. `layout/theme.liquid`, `settings_schema.json`, the snippets, the mobile menu markup and all other files are untouched.

## 2. How it works (no duplicate systems)
The section settings write CSS variables onto the section's own wrapper (`--header-bg`, `--header-fg`, `--header-accent`, `--announcement-*` already worked this way). The new settings extend that same mechanism. A **color left empty falls back to the global theme color** (Theme settings → Colors), so the header stays tied to the NØRTH design system until you override it. Desktop means 1100px and up; mobile means everything below (phones and tablets), the same breakpoint the header already switches at.

## 3. Settings (Customize → Header group → Header)
**Logo** · logo image (existing) · width desktop / mobile · text logo size desktop / mobile · logo alignment on mobile (center / left)

**Navigation** · menu (existing) · menu position on desktop (centered / next to the logo) · space between items

**Typography** · optional different font for the whole header (logo text, menu, mega menu, mobile menu; off = theme fonts) · menu font size · font weight (300 to 700) · letter spacing (% of font size) · text transform (uppercase / none / capitalize)

**Layout** · header height desktop / mobile · horizontal padding desktop / mobile · sticky header (existing) · "Hide when scrolling down, show when scrolling up"

**Icons** · size desktop / mobile · space between icons · show search / account / cart (existing)

**Colors** (all optional) · header background · header text (base for the rest) · logo · menu text · menu hover · menu active (current page) · icons

**Mega menu and dropdown** · background · heading text · link text · dividers and borders · heading size · link size · column spacing. These apply to every mega menu and to normal dropdowns. Image width, height, position, fit and alignment stay per block (Mega menu block settings), so there is no duplicate.

**Mobile menu** · text size (80 to 120 %) · campaign banner and secondary links (existing)

**Announcement bar** (Header group → Announcement bar) · show / hide, separately for desktop and mobile · font size desktop / mobile · vertical spacing · background and text color · rotation settings (existing)

## 4. Changed or renamed existing settings
* **`padding_y` ("Vertical spacing") is replaced by "Header height"** (desktop and mobile). The old value cannot be carried over; the default (68 px) equals the old default.
* "Text" is now **Header text** and "Hover and active color" is now **Menu hover color**; their saved values still apply. Active color is a new, separate setting.
* The mobile horizontal padding is a minimum that grows slightly on tablets, like before.

## 5. Notes
* **Theme Check reports one warning:** the header section has 49 settings against the 40-setting guideline for editor clutter. It comes from the full control list requested; settings are grouped under headings. Nothing breaks.
* **Font weight** uses the closest weight the chosen font provides (Shopify loads only what exists). The weight file is added only when it differs from the theme font, and a custom header font that is the same as the theme font adds nothing, so no `@font-face` is ever printed twice.
* The custom header font applies only inside the header.
* Header height is a minimum: a very tall logo image makes the header taller.
* Smart sticky needs "Keep header visible when scrolling" on. It stays visible while the pointer or keyboard focus is inside the header, and closes an open menu when it hides.

## 6. Tested
52 new automated checks plus the earlier suites in headless Chromium. The real `{% style %}` Liquid from both sections is rendered with a Liquid engine, so the tests exercise the actual output, not a copy:
* **Parity:** default settings reproduce the previous layout, fonts, colors and mega menu metrics at five widths.
* **Every control** changed to a non-default value and checked in computed styles: header height, padding, logo width and size, logo / menu / hover / active / icon / background colors, menu size, weight, tracking, transform, spacing, menu position, icon size and gap, all mega menu and dropdown settings, custom font scoped to the header, mobile height / padding / logo width / logo alignment / icon size / menu scale, announcement font size, spacing, colors and per-device visibility, the 1100px breakpoint switch, sticky off, smart sticky hide and show.
* **Fonts:** 5 cases of font output (no duplicates).
* Earlier desktop and mobile suites (mega menus, mobile panels, cart, search) still pass.
**Not tested on a live store.** Please run the checklist below.

## 7. Checklist (on your store)
- [ ] With nothing changed, the header looks exactly as before.
- [ ] Change header height, padding, logo width and text size on desktop, then on a phone.
- [ ] Change menu font size, weight, spacing, transform and the four menu colors; hover and active look right.
- [ ] Switch "Menu position" to next to the logo; set mobile logo alignment to left.
- [ ] Mega menu: change background, heading / link colors and sizes, column spacing, dividers.
- [ ] Announcement bar: size, spacing, colors; hide on desktop only, then on mobile only.
- [ ] Turn on a custom header font; the rest of the site keeps the theme font.
- [ ] Turn on "Hide when scrolling down" and scroll on a long page.
- [ ] No raw CSS text on the page, browser console is clean.
