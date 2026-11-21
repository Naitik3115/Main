/* NØRTH — theme.js (core)
   Defines the shared window.NORTH namespace and the drawer manager used by the
   mobile menu, search drawer and cart drawer. Guarded so it can only initialise once. */
(function () {
  'use strict';

  window.NORTH = window.NORTH || {};
  if (window.NORTH.coreReady) return;
  window.NORTH.coreReady = true;

  var root = document.documentElement;
  var openStack = [];
  var FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function getDrawer(name) {
    return document.querySelector('[data-drawer="' + name + '"]');
  }

  function isVisible(el) {
    return el.getClientRects().length > 0 && window.getComputedStyle(el).visibility !== 'hidden';
  }

  function focusables(container) {
    return Array.prototype.filter.call(container.querySelectorAll(FOCUSABLE), isVisible);
  }

  function syncTriggers(name, expanded) {
    var triggers = document.querySelectorAll('[data-drawer-open="' + name + '"]');
    Array.prototype.forEach.call(triggers, function (trigger) {
      trigger.setAttribute('aria-expanded', String(expanded));
    });
  }

  function open(name, trigger) {
    var drawer = getDrawer(name);
    if (!drawer || drawer.classList.contains('is-open')) return;

    openStack.slice().forEach(function (other) {
      if (other !== name) close(other, { restoreFocus: false });
    });

    drawer._returnFocus = trigger || document.activeElement;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    openStack.push(name);
    root.classList.add('is-scroll-locked');
    syncTriggers(name, true);

    window.requestAnimationFrame(function () {
      var target = drawer.querySelector('[data-drawer-focus]') || focusables(drawer)[0];
      if (target) target.focus({ preventScroll: true });
    });

    emit('north:drawer:open', { name: name, drawer: drawer });
  }

  function close(name, options) {
    var drawer = getDrawer(name);
    var index = openStack.indexOf(name);
    if (index > -1) openStack.splice(index, 1);
    if (!drawer || !drawer.classList.contains('is-open')) {
      if (!openStack.length) root.classList.remove('is-scroll-locked');
      return;
    }

    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    syncTriggers(name, false);
    if (!openStack.length) root.classList.remove('is-scroll-locked');

    var restore = !options || options.restoreFocus !== false;
    var returnTo = drawer._returnFocus;
    drawer._returnFocus = null;
    if (restore && returnTo && typeof returnTo.focus === 'function' && document.contains(returnTo)) {
      returnTo.focus({ preventScroll: true });
    }

    emit('north:drawer:close', { name: name, drawer: drawer });
  }

  function closeAll() {
    openStack.slice().forEach(function (name) {
      close(name, { restoreFocus: false });
    });
  }

  function isOpen(name) {
    return openStack.indexOf(name) > -1;
  }

  window.NORTH.emit = emit;
  window.NORTH.drawers = { open: open, close: close, closeAll: closeAll, isOpen: isOpen };

  document.addEventListener('click', function (event) {
    var opener = event.target.closest('[data-drawer-open]');
    if (opener) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var name = opener.getAttribute('data-drawer-open');
      // On the cart page itself the cart link just goes to the page.
      if (name === 'cart' && document.body.classList.contains('template-cart')) return;
      event.preventDefault();
      open(name, opener);
      return;
    }

    var closer = event.target.closest('[data-drawer-close]');
    if (closer) {
      var drawer = closer.closest('[data-drawer]');
      if (drawer) close(drawer.getAttribute('data-drawer'));
    }
  });

  document.addEventListener('keydown', function (event) {
    if (!openStack.length) return;
    var drawer = getDrawer(openStack[openStack.length - 1]);
    if (!drawer) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      close(openStack[openStack.length - 1]);
      return;
    }

    if (event.key !== 'Tab') return;
    var items = focusables(drawer);
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!drawer.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  });

  // Theme editor: drop references to drawers that were removed when a section re-rendered.
  function prune() {
    openStack = openStack.filter(function (name) { return getDrawer(name); });
    if (!openStack.length) root.classList.remove('is-scroll-locked');
  }
  document.addEventListener('shopify:section:load', prune);
  document.addEventListener('shopify:section:unload', prune);
})();
