# NØRTH — Header, Mega Menu, Search Drawer and Cart Drawer (update to v1.0)

Copy the folders in this package over your existing NØRTH theme (same paths). Nothing else in the theme is touched.
Shopify Theme Check on the full theme (existing files + these): **0 offenses**.

## 1. Files

### New (12)
| Path | Purpose |
|---|---|
| `assets/header.css` | Announcement bar, header, desktop nav, dropdown, mobile menu |
| `assets/mega-menu.css` | Full-width mega menu drawer |
| `assets/drawers.css` | Shared drawer shell, search suggestions, cart lines |
| `assets/header.js` | Announcement rotation, hover/click/keyboard menus, mobile accordion |
| `assets/search-drawer.js` | Predictive search |
| `assets/cart-drawer.js` | Ajax cart + reusable cart API |
| `sections/announcement-bar.liquid` | Announcement bar (blocks = announcements) |
| `sections/cart-drawer.liquid` | Cart drawer markup, re-rendered through the Section Rendering API |
| `sections/predictive-search.liquid` | Renders search suggestions (used by the endpoint, not placed on pages) |
| `snippets/header-icons.liquid` | Search / account / cart icons with live badge |
| `snippets/mega-menu.liquid` | One mega menu block (desktop panel and mobile accordion content) |
| `snippets/search-drawer.liquid` | Search drawer markup |

I did **not** add `icon-search/account/cart.liquid`. The existing `snippets/icon.liquid` already is the reusable icon snippet, so I extended it (account, chevrons, plus, minus) rather than create a second icon system.

### Modified (13) — replace the whole file
| Path | What changed |
|---|---|
| `layout/theme.liquid` | See section 2 |
| `sections/header.liquid` | Rewritten: new header, mega menu blocks, mobile drawer. Old announcement settings removed (now in the announcement section) |
| `sections/header-group.json` | Adds the announcement bar above the header |
| `assets/theme.js` | Now the core: drawer manager (open/close, focus trap, Escape, scroll lock). The old mobile-nav code is gone |
| `assets/components.css` | Old header, menu and mobile-nav blocks removed (replaced by `header.css`); footer menu reset kept |
| `assets/responsive.css` | Old header rules removed |
| `assets/base.css` | Fallback color values updated to the warm palette and semantic tokens added |
| `config/settings_schema.json` | Warm palette defaults; new header and announcement color settings |
| `config/settings_data.json` | Same values saved. **Replace this too**, or re-pick the colors in Customize, because stored values override schema defaults |
| `locales/en.default.json` | New strings (search, cart, menu, accessibility) |
| `snippets/icon.liquid` | More icons |
| `sections/footer.liquid` | One line: reads the menu as `section.settings.menu` (the link-list object) instead of `linklists[...]` |
| `sections/main-product.liquid` | Two small edits so Add to cart uses the drawer (see section 4) |

## 2. `layout/theme.liquid` — exactly what changed
Replace the file with the one in this package. The differences from v1.0:

1. **Font fix** (see section 6): `font_face` is output once when heading and body font are identical.
2. **Settings `<style>` block moved after the stylesheets.** Before, `base.css` loaded after it and its fallback colors overrode your Customize colors. This was a v1.0 bug.
3. New semantic tokens in that block: `--color-background`, `--color-foreground`, `--color-header-background`, `--color-announcement-background`, `--color-announcement-text` (the first two alias the existing `--color-bg` / `--color-text`, so there is only one color system).
4. Stylesheets added: `header.css`, `mega-menu.css`, `drawers.css`.
5. Scripts added, in this order: `theme.js`, `header.js`, `search-drawer.js`, `cart-drawer.js`.
6. Before `</body>`: `{% render 'search-drawer' %}` and `{% section 'cart-drawer' %}`.

## 3. Configure in Shopify Customize

**Announcement bar** (Header group → Announcement bar): enable/disable, background and text color (empty = theme colors), rotate automatically + seconds, arrows. Each **Announcement** block is one message with optional link. Messages fade and slide; rotation pauses on hover/focus and is off for visitors who prefer reduced motion.

**Header** (Header group → Header): logo image and width (store name as text if empty), menu, vertical spacing, sticky, background / text / hover-and-active colors (empty = theme colors), show search / account / cart.

**Mega menus**
1. Build your menu in **Content → Menus**: the top-level items are what appears in the header (Collections, Earrings, Rings…). Create one menu per mega-menu column (for example "Mega – Collections – 1", "… 2", "… 3").
2. In the header section click **Add block → Mega menu**.
3. **Menu item label**: type the exact title of the top-level item that should open it (for example `Collections`). Matching ignores case and extra spaces.
4. For each of the 3 columns pick a **Menu**; add a **Heading** if you want one. A column with no heading shows its links as the primary uppercase list (like "All Jewelry…" in the reference).
5. **Promotional image**: image, heading, description, button label and button link. Leave all empty to get a three-column menu without the image panel.
6. Repeat with more blocks (up to 8) for other items. Top-level items with child links but no mega block get a normal dropdown; items with neither are plain links.

Selecting a mega menu block in the editor previews it open.
Mobile: the same content appears in the side drawer as an accordion.

## 4. Cart drawer and developer API
Shopify's cart is the only source of truth: every change goes to `/cart/add.js` or `/cart/change.js` (locale-aware URLs from `routes.*`), and the drawer re-renders from the server. No localStorage.

* Product forms opt in with `data-north-add-to-cart` (already added to the product page). Without JavaScript they post normally.
* From any future section:
  ```js
  NORTH.cart.add({ id: 123456789, quantity: 1 });            // adds and opens the drawer
  document.dispatchEvent(new CustomEvent('north:cart:add', { detail: { id: 123456789, quantity: 1 } }));
  document.dispatchEvent(new CustomEvent('north:cart:open'));
  document.addEventListener('north:cart:updated', e => console.log(e.detail.itemCount));
  document.addEventListener('north:cart:error', e => console.log(e.detail.message));
  ```
  Also: `NORTH.cart.change(line, qty)`, `NORTH.cart.update(updates)`, `NORTH.cart.refresh()`.

## 5. Interaction details
* Hover opens after a short delay; moving between items switches instantly; the menu stays open while the pointer travels from the item into the drawer and closes shortly after it leaves the header.
* Touch: first tap on a parent item opens it, second tap follows the link; tapping elsewhere closes it.
* Keyboard: Enter/Space/ArrowDown on the chevron button opens and moves focus into the menu; Escape closes and returns focus; leaving the header with Tab closes it.
* Drawers (menu, search, cart): focus moves in, Tab is trapped, Escape and overlay close, focus returns to the trigger, page scroll is locked.
* Header icons are real links (`/search`, `/cart`) so they still work without JavaScript. On the cart page the cart icon goes to the page.

## 6. Font error — cause and fix
**Cause:** `layout/theme.liquid` called `{{ settings.type_heading_font | font_face }}` and `{{ settings.type_body_font | font_face }}`. Both settings are Inter 400, so Shopify printed the identical `@font-face` twice. No CSS file contains `@font-face` or `@import`, and no stylesheet is loaded twice.
**Fix:** the heading font is always declared; the body font is declared only if its family, weight or style differs. Shopify's hosted font URLs and the font picker settings are unchanged.

## 7. What was tested
Liquid, schemas and JSON: Shopify Theme Check, 0 offenses. JavaScript: syntax checked. Behaviour: 83 automated checks in headless Chromium at 1440, 1280 (touch), 820, 390 and 360 px against a fixture that mirrors the Liquid output, with a mock Shopify endpoint: hover/keyboard/touch menus, mega-menu switching, sticky header, announcement rotation, search (results, empty, error, Enter), cart add/increase/decrease/remove/error, badge sync, focus trap, scroll lock, no horizontal overflow, no console errors, no duplicate IDs.
**Not tested:** a real store. Please run the checklist below on your theme.

## 8. Testing checklist (on your store)
- [ ] Header shows announcement, logo, centered nav, search / account / cart icons; badge matches the cart.
- [ ] Sticky header stays on scroll; announcement scrolls away.
- [ ] Hover each mega item: smooth drop-down, image panel about one third; switching items cross-fades; moving into the menu does not close it; leaving closes it.
- [ ] Tab to a chevron, Enter, arrow into links, Escape returns focus.
- [ ] Active page item is underlined; hover turns accent color and underlines from the left.
- [ ] Search: opens focused, suggestions show image/title/price for real products, a nonsense word shows the empty state, Enter opens the results page, Escape closes.
- [ ] Product page Add to cart: drawer opens, badge updates; +, −, Remove work; sold-out or over-stock shows an error message; Check out reaches checkout.
- [ ] Reload and open the cart in a second tab: both show the same cart.
- [ ] Mobile (360–430 px): hamburger drawer, accordion with mega content, search and cart drawers, no sideways scrolling.
- [ ] Theme editor: all settings above change the header live; selecting a mega block previews it; browser console is clean.

## 9. Notes
* Predictive search is not offered by Shopify for every language; the drawer then shows "Suggestions are unavailable… press Enter" and Enter still opens normal search.
* The account icon appears only when customer accounts are enabled in Shopify settings. The theme still has no `customers/*` templates (planned for a later version), so use Shopify's new customer accounts.
* The default announcement texts and fonts are placeholders; edit them in Customize.
