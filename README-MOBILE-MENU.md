# NØRTH — Premium Mobile Navigation Refinement

Mobile menu only. The desktop header, desktop mega menus, search drawer, cart drawer, `header.js`, `theme.js`, `layout/theme.liquid`, locales and all other sections are **untouched** (verified byte for byte, see section 6).
Shopify Theme Check on the whole theme: **0 offenses**.

## 1. Files

### Replace these 5 existing files (same path)
| Path | What changed |
|---|---|
| `assets/header.css` | Only the **Mobile menu** block at the bottom (from `/* ---------- Mobile menu` to the end of the file). Everything above it is identical |
| `snippets/mobile-menu.liquid` | New editorial root screen, campaign banner, utility row, secondary links; uses the new row and head snippets |
| `snippets/mobile-panel.liquid` | Third-level panel rebuilt on the shared row and head snippets |
| `snippets/icon.liquid` | Adds `arrow-right`, `arrow-left`, `arrow-up-right` (existing icons unchanged) |
| `sections/header.liquid` | **Schema only:** adds the "Mobile menu" settings (section 4). The markup above `{% schema %}` is unchanged |

### Add these 2 new files
| Path | Purpose |
|---|---|
| `snippets/mobile-nav-row.liquid` | One row (drill-down button or link) used at every level, so all panels share one design |
| `snippets/mobile-panel-head.liquid` | Back pill, eyebrow, oversized title and accent rule shared by all submenu panels |

No JavaScript change is needed: the panel logic in `header.js` is driven by `data-panel-open` / `data-panel-back`, which the new markup keeps. No new event listeners were added.

If you have edited `header.liquid` yourself, you do not need to replace it: just insert this after the `show_cart` setting in the schema's `settings` array (add a comma after the `show_cart` line):
```json
{ "type": "header", "content": "Mobile menu: campaign banner" },
{ "type": "image_picker", "id": "mobile_banner_image", "label": "Image", "info": "Portrait works best. Shown on the first screen of the mobile menu." },
{ "type": "text", "id": "mobile_banner_eyebrow", "label": "Eyebrow text" },
{ "type": "text", "id": "mobile_banner_heading", "label": "Heading" },
{ "type": "text", "id": "mobile_banner_label", "label": "Button label" },
{ "type": "url", "id": "mobile_banner_url", "label": "Button link" },
{ "type": "range", "id": "mobile_banner_overlay", "label": "Image overlay", "min": 0, "max": 70, "step": 5, "unit": "%", "default": 30 },
{ "type": "header", "content": "Mobile menu: secondary links" },
{ "type": "link_list", "id": "mobile_secondary_menu", "label": "Menu", "info": "Optional small links under the search / account / cart row, for example Contact or Shipping." }
```
and, for `icon.liquid`, add these three `when` branches before `{%- when 'plus' -%}`:
```liquid
{%- when 'arrow-right' -%}
  <path d="M4 12h16M14 6l6 6-6 6"/>
{%- when 'arrow-left' -%}
  <path d="M20 12H4M10 6l-6 6 6 6"/>
{%- when 'arrow-up-right' -%}
  <path d="M7 17L17 7M8 7h9v9"/>
```

## 2. What the menu is now
**Top bar:** NØRTH logo and a minimal close button (it turns 90° when pressed).

**First screen**
* Oversized, numbered editorial list (`01 Collections →`, `02 Earrings →`…), set in your heading font at about 41 px on a 390 px phone, with hairline dividers and 80 px touch rows.
* Items that open a panel show a long arrow; items that go to a page show a diagonal arrow. The current page is shown in bronze.
* **Campaign banner** (optional): full-bleed fashion image with eyebrow, heading and a button, the whole card tappable.
* **Utility row:** Search, Account and Cart in one bordered strip with icons (the cart count stays in sync with the header). Optional small **secondary links** (Contact, Shipping…) sit underneath. They follow the existing Show search / account / cart switches.

**Submenu panels** (one full-screen panel per level, up to Shopify's three levels)
* Stylish pill **Back** button, optional eyebrow with the parent category, oversized title and a bronze rule that draws in.
* "View all" row, grouped column headings with hairlines (from mega menu columns), editorial rows with arrows.
* Optional promo card from the mega menu block (image, heading, description, button), using the same fit, focal point, overlay and alignment settings as desktop.

**Motion:** current panel slides left while the next enters from the right (reverse on Back); labels rise out of a mask in sequence; promo images ease in; arrows travel and rows get a soft bronze highlight on press (and on hover where a pointer exists). Everything is disabled automatically for visitors who prefer reduced motion.

**Behaviour:** full height with `100dvh`, safe-area insets top and bottom, background scroll locked, each panel scrolls on its own, Escape and × close it, reopening starts at the first screen.

## 3. Everything stays dynamic
No links, products or collections are hard-coded. Rows come from the header menu (and its nested levels); mega columns and promos come from the Mega menu blocks; the banner and secondary links come from new settings.

## 4. Configure in Customize
Header group → **Header**, scroll to:
* **Mobile menu: campaign banner:** image, eyebrow, heading, button label, button link, overlay. Leave image and heading empty to hide the banner.
* **Mobile menu: secondary links:** pick a menu (create it under Content → Menus), or leave empty.

Submenu promo images remain on the **Mega menu** blocks (see the previous guide). A top-level item opens a submenu panel when it has child links or a matching Mega menu block.

## 5. Notes
* Without JavaScript the first screen is not reachable (same as before); the header links still work.
* Account appears only when customer accounts are enabled in Shopify.
* The first screen scrolls inside the panel if the banner makes it taller than the phone.

## 6. Tested
201 automated checks in headless Chromium at 390, 360 and 820 px (mobile and tablet) plus 1440 px desktop, against a fixture mirroring the Liquid output:
* Desktop untouched: 18 unrelated files byte-identical, `header.css` identical above the mobile block, the full earlier desktop/mobile suite (113 checks) still passes.
* New design: oversized type, numbering, mask reveal, banner, utility row (equal cells, ≥ 44 px), secondary links, eyebrow on level 3, accent rule, promo inside panel, press feedback (arrow, label, highlight), cart count sync, cart link opens the cart drawer, no horizontal overflow, no console errors.
**Not tested on a live store.** Please run the checklist below.

## 7. Checklist (on your store)
- [ ] Open the menu on a phone: full screen, fades in, labels rise in sequence, page behind does not scroll.
- [ ] Tap a category: current panel slides left, next arrives from the right; Back reverses it; nested levels work.
- [ ] Set the campaign banner in Customize; clear it and confirm it disappears.
- [ ] Add a secondary links menu; confirm the links appear under the utility row.
- [ ] Search, Account and Cart in the utility row work; the cart count matches the header.
- [ ] Mega menu promo cards appear in the matching submenu panels with your fit / focal point / overlay settings.
- [ ] Check an iPhone with a notch and Safari's toolbar: nothing hidden behind the browser UI.
- [ ] Desktop header and mega menus behave exactly as before.
