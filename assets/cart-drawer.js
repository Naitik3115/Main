/* NØRTH — cart-drawer.js
   Cart drawer + reusable cart API. Shopify's Ajax Cart API is the single source of truth: every change is
   sent to Shopify and the drawer is re-rendered from sections/cart-drawer.liquid (Section Rendering API).
   Nothing is stored in localStorage.

   Public API
     NORTH.cart.add(input, { open: true })   input: FormData | HTMLFormElement | { id, quantity, properties } | { items: [...] }
     NORTH.cart.change(line, quantity)       line is 1-based
     NORTH.cart.update(updates)              updates: { [variantId]: quantity } or an array, same as /cart/update.js
     NORTH.cart.refresh()                    re-render from the live cart
     NORTH.cart.open() / NORTH.cart.close()

   Events (dispatched on document)
     north:cart:add       listen: detail = same input as NORTH.cart.add; adds the item(s) and opens the drawer
     north:cart:open      listen: opens the drawer
     north:cart:updated   fired after every render, detail = { itemCount }
     north:cart:error     fired on failure, detail = { message }

   Any <form data-north-add-to-cart> posting a product form is intercepted automatically. */
(function () {
  'use strict';

  window.NORTH = window.NORTH || {};
  if (window.NORTH.cartReady) return;
  window.NORTH.cartReady = true;

  var drawer = document.querySelector('[data-drawer="cart"]');
  if (!drawer) return;

  var shopifyRoot = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  var SECTION = drawer.getAttribute('data-section-id') || 'cart-drawer';
  var urls = {
    add: (drawer.getAttribute('data-add-url') || shopifyRoot + 'cart/add') + '.js',
    change: (drawer.getAttribute('data-change-url') || shopifyRoot + 'cart/change') + '.js',
    update: (drawer.getAttribute('data-update-url') || shopifyRoot + 'cart/update') + '.js',
    cart: drawer.getAttribute('data-cart-url') || shopifyRoot + 'cart'
  };
  var genericError = drawer.getAttribute('data-error-text') || 'Something went wrong.';

  var notice = drawer.querySelector('[data-cart-notice]');
  var status = drawer.querySelector('[data-cart-status]');
  var busy = false;
  var lastRender = 0;

  function content() {
    return drawer.querySelector('[data-cart-drawer-content]');
  }

  /* ---------- Rendering ---------- */

  function setBadges(count) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cart-count]'), function (badge) {
      badge.textContent = String(count);
    });
  }

  function setLoading(on) {
    busy = on;
    var el = content();
    if (!el) return;
    el.classList.toggle('is-loading', on);
    el.setAttribute('aria-busy', String(on));
  }

  function showNotice(message) {
    if (!notice) return;
    notice.textContent = message || '';
    notice.hidden = !message;
  }

  function render(html, focusHint) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var fresh = doc.querySelector('[data-cart-drawer-content]');
    var current = content();
    if (!fresh || !current) return false;

    current.innerHTML = fresh.innerHTML;
    current.setAttribute('data-item-count', fresh.getAttribute('data-item-count'));
    current.setAttribute('data-status', fresh.getAttribute('data-status') || '');

    var count = parseInt(fresh.getAttribute('data-item-count'), 10) || 0;
    setBadges(count);
    lastRender = Date.now();

    if (status && focusHint) status.textContent = fresh.getAttribute('data-status') || '';

    if (focusHint && drawer.classList.contains('is-open')) {
      var target = null;
      if (focusHint.line) {
        target = current.querySelector('[data-line="' + focusHint.line + '"] [data-action="' + focusHint.action + '"]');
      }
      (target || current).focus({ preventScroll: true });
    }

    window.NORTH.emit('north:cart:updated', { itemCount: count });
    return true;
  }

  /* ---------- Requests ---------- */

  function request(url, options) {
    return fetch(url, options).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) {
          var error = new Error(data.description || data.message || genericError);
          error.status = response.status;
          throw error;
        }
        return data;
      });
    });
  }

  function jsonOptions(body) {
    return {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    };
  }

  function withSections(body) {
    body.sections = SECTION;
    body.sections_url = window.location.pathname;
    return body;
  }

  function applyResponse(data, focusHint) {
    var html = data && data.sections && data.sections[SECTION];
    if (html && render(html, focusHint)) return Promise.resolve();
    return refresh(focusHint);
  }

  function refresh(focusHint) {
    return fetch(window.location.pathname + '?section_id=' + encodeURIComponent(SECTION), {
      cache: 'no-store',
      headers: { Accept: 'text/html' }
    })
      .then(function (response) {
        if (!response.ok) throw new Error(genericError);
        return response.text();
      })
      .then(function (html) { render(html, focusHint); });
  }

  function fail(error) {
    var message = (error && error.message) || genericError;
    showNotice(message);
    window.NORTH.emit('north:cart:error', { message: message });
    return message;
  }

  /* ---------- Public API ---------- */

  function add(input, options) {
    var openAfter = !options || options.open !== false;
    var promise;

    if (input instanceof HTMLFormElement) input = new FormData(input);

    if (input instanceof FormData) {
      input.set('sections', SECTION);
      input.set('sections_url', window.location.pathname);
      promise = request(urls.add, { method: 'POST', headers: { Accept: 'application/json' }, body: input });
    } else if (input && input.items) {
      promise = request(urls.add, jsonOptions(withSections({ items: input.items })));
    } else {
      promise = request(urls.add, jsonOptions(withSections({ items: [input] })));
    }

    showNotice('');
    setLoading(true);
    return promise
      .then(function (data) { return applyResponse(data, null); })
      .then(function () {
        setLoading(false);
        if (openAfter) open();
      })
      .catch(function (error) {
        setLoading(false);
        fail(error);
        throw error;
      });
  }

  function change(line, quantity, focusHint) {
    if (busy) return Promise.resolve();
    showNotice('');
    setLoading(true);
    return request(urls.change, jsonOptions(withSections({ line: Number(line), quantity: Number(quantity) })))
      .then(function (data) { return applyResponse(data, focusHint || null); })
      .then(function () { setLoading(false); })
      .catch(function (error) {
        setLoading(false);
        fail(error);
        // Re-sync so the drawer never shows stale quantities.
        return refresh(focusHint || null).catch(function () {});
      });
  }

  function update(updates) {
    showNotice('');
    setLoading(true);
    return request(urls.update, jsonOptions(withSections({ updates: updates })))
      .then(function (data) { return applyResponse(data, null); })
      .then(function () { setLoading(false); })
      .catch(function (error) {
        setLoading(false);
        fail(error);
        throw error;
      });
  }

  function open() {
    if (window.NORTH.drawers) window.NORTH.drawers.open('cart');
  }

  function close() {
    if (window.NORTH.drawers) window.NORTH.drawers.close('cart');
  }

  window.NORTH.cart = { add: add, change: change, update: update, refresh: refresh, open: open, close: close };

  /* ---------- Wiring ---------- */

  // Quantity buttons and Remove inside the drawer.
  drawer.addEventListener('click', function (event) {
    var button = event.target.closest('[data-cart-change]');
    if (!button || busy) return;
    var line = button.getAttribute('data-line');
    change(line, button.getAttribute('data-quantity'), { line: line, action: button.getAttribute('data-action') });
  });

  // Product forms opt in with the data-north-add-to-cart attribute. Without JS they post normally.
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-north-add-to-cart')) return;
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;

    var submit = form.querySelector('[type="submit"]');
    var errorBox = form.querySelector('[data-add-error]');
    if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
    form.setAttribute('aria-busy', 'true');
    if (submit) submit.setAttribute('aria-busy', 'true');

    add(new FormData(form))
      .catch(function (error) {
        if (errorBox) {
          errorBox.textContent = error.message || genericError;
          errorBox.hidden = false;
          showNotice('');
        }
      })
      .then(function () {
        form.removeAttribute('aria-busy');
        if (submit) submit.removeAttribute('aria-busy');
      });
  });

  // Reusable events for future sections.
  document.addEventListener('north:cart:add', function (event) {
    add(event.detail).catch(function () {});
  });
  document.addEventListener('north:cart:open', open);

  // Opening the drawer re-syncs with the live cart (skipped right after a fresh render).
  document.addEventListener('north:drawer:open', function (event) {
    if (event.detail.name !== 'cart') return;
    showNotice('');
    if (Date.now() - lastRender > 1500) refresh().catch(function () {});
  });

  // Back/forward cache: the page may show an old badge.
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) refresh().catch(function () {});
  });
})();
