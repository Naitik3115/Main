# NØRTH — Header & Mega Menu Refinements

Refinements to the existing header. Nothing was rebuilt: cart drawer, search drawer, announcement section, footer, homepage, product and collection files are **untouched**. Existing menus, mega blocks and Theme Editor settings keep working.
Shopify Theme Check on the whole theme: **0 offenses**.

## 1. Files

### Replace these 8 existing files (copy over the same path)
| Path | What changed |
|---|---|
| `layout/theme.liquid` | **Font error fix**, `viewport-fit=cover` (see section 2) |
| `sections/header.liquid` | Header no longer uses the centered `.container`; mobile drawer moved into a snippet; new mega menu block settings | 
| `snippets/mega-menu.liquid` | Rewritten: two layouts + image position, width, height, fit, focal point, overlay, text alignment |
| `assets/header.css` | Full-width header and announcement; the old mobile accordion styles are replaced by the full-screen panel menu |
| `assets/mega-menu.css` | Rewritten for both layouts and the promo controls |
| `assets/header.js` | Mobile panel navigation and compact-panel positioning added; the old accordion handler is removed |
| `assets/drawers.css` | The unused `.drawer--left` rule is replaced by `.drawer--full` (full-screen fade drawer) |
| `locales/en.default.json` | Two new strings: `general.back`, `general.view_all` |

### Add these 3 new files
| Path | Purpose |
|---|---|
| `snippets/mobile-menu.liquid` | Full-screen mobile navigation (levels 1 to 3, mega columns, promo) |
| `snippets/mobile-panel.liquid` | One third-level panel |
| `snippets/mega-promo-vars.liquid` | Turns the promo settings into CSS variables, shared by desktop and mobile |

Do not delete anything. `snippets/mega-menu.liquid` no longer has a `mobile` mode, and the old accordion code is gone from `header.css` and `header.js`, so there is nothing left to clean up.

## 2. `layout/theme.liquid` — the font error
**Root cause (my earlier fix missed it):** Shopify's `font_face` filter returns bare CSS, not a `<style>` element. It was printed straight into `<head>`, so the browser treated it as text, moved on to `<body>` and displayed the raw `@font-face { … }` above the announcement bar. The duplicate declaration I fixed before was real but secondary.

**Fix:** both `font_face` calls now sit inside `{% style %}…{% endstyle %}`, and the body font is only declared when it differs from the heading font. Inter and the Shopify-hosted URLs are unchanged. No CSS file contains `@font-face` or `@import`, and each stylesheet and script is loaded once.

Exactly what to change if you prefer to edit by hand: replace the two `{{ settings.type_… | font_face … }}` lines (and the `unless same_font` block around the second one) with:
```liquid
{%- liquid
  assign same_font = false
  if settings.type_body_font.family == settings.type_heading_font.family
    if settings.type_body_font.weight == settings.type_heading_font.weight
      if settings.type_body_font.style == settings.type_heading_font.style
        assign same_font = true
      endif
    endif
  endif
-%}
{% style %}
  {{ settings.type_heading_font | font_face: font_display: 'swap' }}
  {%- unless same_font -%}
    {{ settings.type_body_font | font_face: font_display: 'swap' }}
  {%- endunless -%}
{% endstyle %}
```
and change the viewport tag to `content="width=device-width, initial-scale=1, viewport-fit=cover"` (lets the full-screen menu respect phone safe areas).

## 3. Full-width header
The header and announcement bar span the whole viewport. Logo sits on the left, navigation is truly centered, icons on the right, with one shared outer gutter (`--header-gutter`, 20 px on phones up to 64 px on large screens). The mega menu's first column lines up with the logo.
The announcement *bar* is full width; its *text* keeps a 40 rem measure so the arrows stay next to it, as in your reference. For arrows at the screen edges set `.announcement__viewport { flex-basis: 100% }` in `assets/header.css`.

## 4. Mega menu: two layouts, set per block
Customize → Header → **Mega menu** block → **Layout**:

* **Multi-column (full width):** drawer directly under the header with up to 3 columns and the image panel. Only columns that have a menu are drawn, and the grid adapts (1, 2 or 3 columns) with no blank columns. Dividers, spacing and alignment adjust automatically.
* **Single column (compact panel):** a panel anchored under its trigger item (kept inside the screen), one column plus image, as in your second screenshot. It uses the first column that has a menu. If it has no image it narrows to a single column panel.

### Promotional image settings (both layouts)
| Setting | Options |
|---|---|
| Image position | Left / Right |
| Image width | 20 to 60 % (multi) or 30 to 70 % (single) |
| Minimum height | 240 to 640 px |
| Image fit | Cover / Contain |
| Focal point | Horizontal left / center / right, vertical top / center / bottom |
| Show image overlay + Overlay opacity | on/off, 0 to 80 % |
| Content alignment | Left / Center / Right |
| Vertical content alignment | Top / Center / Bottom |
| Heading, description, button label and link | text and URL |

With **Contain**, the image sits on a plain surface and the text switches to the dark theme color so it stays readable. Existing blocks pick up the defaults (multi-column, image right, 35 %, cover, 25 % overlay, text bottom-left).

## 5. Animation and interaction
* Drawer reveals top to bottom (clip + fade + small translate). Switching items cross-fades inside a fixed-height stack, so there is no jump, layout shift or flicker.
* The animated layer is click-through: the empty space beside or under a compact panel never blocks the page.
* Hover bridging, keyboard (Enter / ArrowDown opens and moves focus in, Escape closes and returns focus), touch (first tap opens, second follows the link; tapping elsewhere closes) and the active underline are unchanged.

## 6. Full-screen mobile menu
* Fills the viewport (`100dvh`), fades in, and respects safe areas. Background scrolling is locked and each panel scrolls on its own without chaining to the page.
* Top level is a clean vertical list. Items with children open **separate full-screen panels**: the current panel slides left while the next slides in from the right; **Back** slides the other way. Each panel has a Back button, a large heading and a "View all" link to the parent page.
* Supports Shopify's three menu levels, including mega menu columns whose links have children.
* Mega menu content appears as columns with headings, plus the promo card using the same image settings (fit, focal point, overlay, alignment).
* Focus moves to the Back button on entering a panel and returns to the item you came from. Escape and the close button close the whole menu; reopening always starts at the top level. The menu is full screen, so there is no visible backdrop.
* Search and Log in links sit at the bottom of the top-level panel.

## 7. Tested
113 automated checks in headless Chromium (1920, 1440, 1280, 1100, 900, 820, 390, 360 px) against a fixture mirroring the Liquid output: full-width header and centering, both layouts and their image controls, panel switching without height change, hover/keyboard/touch behaviour, full-screen sizing, fade, horizontal slide in both directions, nested levels, focus return, scroll lock, no overflow, no console errors, no duplicate IDs. The earlier cart and search checks still pass.
**Not tested on a live store.** Please run the checklist below.

## 8. Checklist (on your store)
- [ ] No raw `@font-face` text on the page; Inter still loads.
- [ ] Header and announcement fill the full width; logo left, nav centered, icons right at 1100, 1440 and 1920 px.
- [ ] Add a Mega menu block with Layout = Multi-column: three columns, dividers, image right. Try image position Left, width 25 and 50 %.
- [ ] Add a second block with Layout = Single column: compact panel under its item.
- [ ] Change Image fit, Focal point, Overlay and the two alignment settings and confirm the change in both layouts.
- [ ] Hover between items: smooth cross-fade, no jump; moving into the menu does not close it.
- [ ] Phone: menu is full screen, slides left/right, Back works, nested links work, promo card shows, Escape and × close it, page behind does not scroll.
- [ ] Existing links, menus, search and cart drawer still work; browser console is clean.
