/* NØRTH — header.js
   Announcement bar rotation, desktop dropdown + mega menu (two layouts), full-screen mobile menu panels,
   optional smart sticky header.
   Drawers themselves (mobile menu, search, cart) are handled by the manager in theme.js.
   Instances are created per element and cleaned up on theme-editor section reloads; page-level
   listeners are registered exactly once. */
(function () {
  'use strict';

  window.NORTH = window.NORTH || {};
  if (window.NORTH.headerReady) return;
  window.NORTH.headerReady = true;

  var DESKTOP = window.matchMedia('(min-width: 1100px)');
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  var announcements = [];
  var headers = [];

  function qsa(root, selector) {
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function within(root, selector) {
    var list = qsa(root, selector);
    if (root.matches && root.matches(selector)) list.unshift(root);
    return list;
  }

  function listen(store, target, type, handler, options) {
    target.addEventListener(type, handler, options);
    store.push([target, type, handler, options]);
  }

  function unlisten(store) {
    store.forEach(function (entry) {
      entry[0].removeEventListener(entry[1], entry[2], entry[3]);
    });
    store.length = 0;
  }

  /* ---------------------------------------------------------------- Announcement bar */

  function Announcement(el) {
    this.el = el;
    this.slides = qsa(el, '[data-announcement-slide]');
    this.index = 0;
    this.slides.forEach(function (slide, i) {
      if (slide.classList.contains('is-active')) this.index = i;
    }, this);
    this.delay = (parseFloat(el.getAttribute('data-speed')) || 5) * 1000;
    this.autoplay = el.getAttribute('data-autoplay') === 'true' && this.slides.length > 1 && !REDUCED.matches;
    this.paused = false;
    this.timer = null;
    this.listeners = [];

    var self = this;
    var prev = el.querySelector('[data-announcement-prev]');
    var next = el.querySelector('[data-announcement-next]');
    if (prev) listen(this.listeners, prev, 'click', function () { self.step(-1); });
    if (next) listen(this.listeners, next, 'click', function () { self.step(1); });

    listen(this.listeners, el, 'mouseenter', function () { self.pause(); });
    listen(this.listeners, el, 'mouseleave', function () { self.resume(); });
    listen(this.listeners, el, 'focusin', function () { self.pause(); });
    listen(this.listeners, el, 'focusout', function () { self.resume(); });

    this.show(this.index);
    this.schedule();
  }

  Announcement.prototype.show = function (index) {
    var count = this.slides.length;
    if (!count) return;
    this.index = (index + count) % count;
    this.slides.forEach(function (slide, i) {
      var active = i === this.index;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
    }, this);
    this.el.setAttribute('aria-live', this.autoplay && !this.paused ? 'off' : 'polite');
  };

  Announcement.prototype.step = function (direction) {
    this.show(this.index + direction);
    this.schedule();
  };

  Announcement.prototype.schedule = function () {
    var self = this;
    window.clearTimeout(this.timer);
    if (!this.autoplay || this.paused || document.hidden) return;
    this.timer = window.setTimeout(function () {
      self.show(self.index + 1);
      self.schedule();
    }, this.delay);
  };

  Announcement.prototype.pause = function () {
    this.paused = true;
    window.clearTimeout(this.timer);
  };

  Announcement.prototype.resume = function () {
    this.paused = false;
    this.schedule();
  };

  Announcement.prototype.showBlock = function (blockId) {
    for (var i = 0; i < this.slides.length; i++) {
      if (this.slides[i].getAttribute('data-block-id') === blockId) {
        this.pause();
        this.show(i);
        return;
      }
    }
  };

  Announcement.prototype.destroy = function () {
    window.clearTimeout(this.timer);
    unlisten(this.listeners);
  };

  /* ---------------------------------------------------------------- Header: dropdown + mega menu */

  function Header(el) {
    this.el = el;
    this.items = qsa(el, '[data-menu-item]');
    this.mega = el.querySelector('[data-mega]');
    this.panels = qsa(el, '[data-mega-panel]');
    this.current = null;
    this.pointerInside = false;
    this.pointerType = 'mouse';
    this.openTimer = null;
    this.closeTimer = null;
    this.listeners = [];

    var self = this;

    this.items.forEach(function (item) {
      var type = item.getAttribute('data-menu-type');

      listen(self.listeners, item, 'pointerenter', function (event) {
        if (event.pointerType === 'touch') return;
        window.clearTimeout(self.closeTimer);
        window.clearTimeout(self.openTimer);
        if (type === 'link') {
          // Moving onto a plain link dismisses any open menu.
          if (self.current) self.scheduleClose(80);
          return;
        }
        // Switch instantly when a menu is already open, otherwise wait briefly to ignore fly-bys.
        self.openTimer = window.setTimeout(function () { self.open(item, false); }, self.current ? 0 : 90);
      });

      listen(self.listeners, item, 'pointerleave', function () {
        window.clearTimeout(self.openTimer);
      });
    });

    // Pointer anywhere inside the header (bar + mega drawer) keeps the menu open.
    listen(this.listeners, el, 'pointerenter', function (event) {
      if (event.pointerType === 'touch') return;
      self.pointerInside = true;
      window.clearTimeout(self.closeTimer);
    });

    listen(this.listeners, el, 'pointerleave', function (event) {
      if (event.pointerType === 'touch') return;
      self.pointerInside = false;
      window.clearTimeout(self.openTimer);
      self.scheduleClose(160);
    });

    // Hovering the logo or icons dismisses the menu.
    qsa(el, '.header__logo, .header__actions').forEach(function (area) {
      listen(self.listeners, area, 'pointerenter', function (event) {
        if (event.pointerType !== 'touch' && self.current) self.scheduleClose(100);
      });
    });

    listen(this.listeners, el, 'pointerdown', function (event) {
      self.pointerType = event.pointerType || 'mouse';
    });

    listen(this.listeners, el, 'click', function (event) {
      var toggle = event.target.closest('[data-menu-toggle]');
      if (toggle && el.contains(toggle)) {
        var item = toggle.closest('[data-menu-item]');
        if (self.current === item) {
          self.close();
        } else {
          // detail === 0 means the click came from the keyboard (Enter or Space).
          self.open(item, event.detail === 0);
        }
        return;
      }

      // Touch: first tap on a parent link opens its menu, second tap follows the link.
      var link = event.target.closest('.menu__link');
      if (link && self.pointerType === 'touch' && DESKTOP.matches) {
        var parent = link.closest('[data-menu-item]');
        if (parent && parent.getAttribute('data-menu-type') !== 'link' && self.current !== parent) {
          event.preventDefault();
          self.open(parent, false);
        }
      }
    });

    listen(this.listeners, el, 'keydown', function (event) {
      var toggle = event.target.closest && event.target.closest('[data-menu-toggle]');
      if (event.key === 'ArrowDown' && toggle) {
        event.preventDefault();
        self.open(toggle.closest('[data-menu-item]'), true);
      }
      if (event.key === 'Escape' && self.current) {
        event.stopPropagation();
        var opener = self.current.querySelector('[data-menu-toggle]');
        self.close();
        if (opener) opener.focus();
      }
    });

    // Keyboard: close when focus leaves the header (unless the pointer is still over it).
    listen(this.listeners, el, 'focusout', function (event) {
      if (!self.current) return;
      if (event.relatedTarget && el.contains(event.relatedTarget)) return;
      window.setTimeout(function () {
        if (self.current && !self.pointerInside && !el.contains(document.activeElement)) self.close();
      }, 0);
    });
  }

  Header.prototype.scheduleClose = function (delay) {
    var self = this;
    window.clearTimeout(this.closeTimer);
    this.closeTimer = window.setTimeout(function () {
      if (!self.pointerInside || delay <= 100) self.close();
    }, delay);
  };

  Header.prototype.showPanel = function (id) {
    this.panels.forEach(function (panel) {
      panel.classList.toggle('is-active', panel.id === id);
    });
    if (this.mega) this.mega.classList.add('is-open');
  };

  // Single-column panels are compact: line them up with their trigger, kept inside the viewport.
  Header.prototype.positionPanel = function (panel, item) {
    if (!panel || !item || panel.getAttribute('data-layout') !== 'single') return;
    var margin = 16;
    var bar = this.el.getBoundingClientRect();
    var trigger = item.getBoundingClientRect();
    var width = panel.getBoundingClientRect().width;
    var left = trigger.left - bar.left - 24;
    left = Math.max(margin, Math.min(left, bar.width - width - margin));
    panel.style.setProperty('--mega-left', Math.round(left) + 'px');
  };

  Header.prototype.hideMega = function () {
    if (this.mega) this.mega.classList.remove('is-open');
  };

  Header.prototype.deactivate = function (item) {
    item.classList.remove('is-open');
    var toggle = item.querySelector('[data-menu-toggle]');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  };

  Header.prototype.open = function (item, focusInto) {
    if (!DESKTOP.matches || !item) return;
    window.clearTimeout(this.closeTimer);
    window.clearTimeout(this.openTimer);

    if (this.current && this.current !== item) this.deactivate(this.current);
    this.current = item;

    item.classList.add('is-open');
    var toggle = item.querySelector('[data-menu-toggle]');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');

    var target = null;
    if (item.getAttribute('data-menu-type') === 'mega') {
      var id = item.getAttribute('data-mega-target');
      target = document.getElementById(id);
      this.positionPanel(target, item);
      this.showPanel(id);
    } else {
      this.hideMega();
      target = item.querySelector('.menu__sub');
    }

    if (focusInto && target) {
      window.requestAnimationFrame(function () {
        var first = target.querySelector('a[href]');
        if (first) first.focus();
      });
    }
  };

  Header.prototype.close = function () {
    window.clearTimeout(this.closeTimer);
    window.clearTimeout(this.openTimer);
    if (this.current) this.deactivate(this.current);
    this.current = null;
    this.hideMega();
  };

  // Theme editor: preview the mega menu of the selected block.
  Header.prototype.previewBlock = function (blockId) {
    if (!DESKTOP.matches) return;
    var panel = this.panels.filter(function (p) { return p.getAttribute('data-block-id') === blockId; })[0];
    if (!panel) return;
    var item = this.items.filter(function (i) { return i.getAttribute('data-mega-target') === panel.id; })[0];
    if (item) {
      this.open(item, false);
    } else {
      this.showPanel(panel.id);
    }
  };

  Header.prototype.destroy = function () {
    window.clearTimeout(this.closeTimer);
    window.clearTimeout(this.openTimer);
    unlisten(this.listeners);
  };

  /* ---------------------------------------------------------------- Setup */

  function initIn(root) {
    within(root, '[data-announcement]').forEach(function (el) {
      if (!el._north) {
        el._north = new Announcement(el);
        announcements.push(el._north);
      }
    });
    within(root, '[data-header]').forEach(function (el) {
      if (!el._north) {
        el._north = new Header(el);
        headers.push(el._north);
      }
    });
  }

  function destroyIn(root) {
    announcements = announcements.filter(function (instance) {
      if (root.contains(instance.el)) { instance.destroy(); return false; }
      return true;
    });
    headers = headers.filter(function (instance) {
      if (root.contains(instance.el)) { instance.destroy(); return false; }
      return true;
    });
  }

  // Page-level listeners (registered once).
  document.addEventListener('pointerdown', function (event) {
    headers.forEach(function (instance) {
      if (instance.current && !instance.el.contains(event.target)) instance.close();
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    headers.forEach(function (instance) {
      if (instance.current) instance.close();
    });
  });

  document.addEventListener('visibilitychange', function () {
    announcements.forEach(function (instance) {
      if (document.hidden) {
        window.clearTimeout(instance.timer);
      } else {
        instance.schedule();
      }
    });
  });

  /* ---------------------------------------------------------------- Mobile menu panels
     State lives in the DOM (data-path on [data-mobile-menu]) so section re-renders in the theme editor
     cannot leave a stale instance behind. Classes: is-active (centre), is-before (slid left), none (waiting on the right). */

  function menuPath(menu) {
    return (menu.getAttribute('data-path') || '').split(' ').filter(Boolean);
  }

  function applyPath(menu, path) {
    menu.setAttribute('data-path', path.join(' '));
    var last = path.length - 1;
    qsa(menu, '[data-mobile-panel]').forEach(function (panel) {
      var index = path.indexOf(panel.id);
      panel.classList.toggle('is-active', index === last);
      panel.classList.toggle('is-before', index > -1 && index < last);
    });
  }

  function resetMenu(menu) {
    var root = menu.querySelector('[data-mobile-panel]');
    if (!root) return;
    applyPath(menu, [root.id]);
    qsa(menu, '[data-mobile-panel]').forEach(function (panel) { panel.scrollTop = 0; });
  }

  document.addEventListener('click', function (event) {
    var opener = event.target.closest('[data-panel-open]');
    var back = !opener && event.target.closest('[data-panel-back]');
    if (!opener && !back) return;

    var menu = (opener || back).closest('[data-mobile-menu]');
    if (!menu) return;
    var path = menuPath(menu);

    if (opener) {
      var next = document.getElementById(opener.getAttribute('data-panel-open'));
      if (!next) return;
      next.scrollTop = 0;
      path.push(next.id);
      applyPath(menu, path);
      window.requestAnimationFrame(function () {
        var target = next.querySelector('[data-panel-back]') || next;
        target.focus({ preventScroll: true });
      });
    } else if (path.length > 1) {
      var closing = path.pop();
      applyPath(menu, path);
      window.requestAnimationFrame(function () {
        var origin = menu.querySelector('[data-panel-open="' + closing + '"]');
        if (origin) origin.focus({ preventScroll: true });
      });
    }
  });

  // Reopening always starts at the top level (reset after the fade-out has finished).
  document.addEventListener('north:drawer:close', function (event) {
    if (event.detail.name !== 'menu') return;
    var menu = event.detail.drawer;
    window.setTimeout(function () {
      if (!menu.classList.contains('is-open')) resetMenu(menu);
    }, 450);
  });

  // Desktop menus are positioned from the trigger, so close them if the window changes size.
  window.addEventListener('resize', function () {
    headers.forEach(function (instance) { if (instance.current) instance.close(); });
  });

  /* ---------------------------------------------------------------- Smart sticky header
     Optional (header setting "Hide when scrolling down, show when scrolling up"): one passive scroll
     listener for the whole page; it toggles .is-header-hidden on the section wrapper. */
  var lastScrollY = window.pageYOffset;
  var scrollTicking = false;

  function updateStickyHeaders() {
    scrollTicking = false;
    var y = Math.max(0, window.pageYOffset);
    var delta = y - lastScrollY;
    lastScrollY = y;

    headers.forEach(function (instance) {
      if (!instance.el.hasAttribute('data-sticky-smart')) return;
      var wrapper = instance.el.parentElement;
      if (!wrapper) return;
      var height = instance.el.offsetHeight;
      var engaged = instance.pointerInside || instance.el.contains(document.activeElement);

      if (y <= height || delta < -6 || engaged) {
        wrapper.classList.remove('is-header-hidden');
      } else if (delta > 6) {
        instance.close();
        wrapper.classList.add('is-header-hidden');
      }
    });
  }

  window.addEventListener('scroll', function () {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateStickyHeaders);
  }, { passive: true });

  // Keyboard users: never leave focus inside a hidden header.
  document.addEventListener('focusin', function (event) {
    headers.forEach(function (instance) {
      if (instance.el.contains(event.target)) instance.el.parentElement.classList.remove('is-header-hidden');
    });
  });

  var onBreakpoint = function () {
    headers.forEach(function (instance) { instance.close(); });
    if (DESKTOP.matches && window.NORTH.drawers) window.NORTH.drawers.close('menu', { restoreFocus: false });
  };
  if (DESKTOP.addEventListener) {
    DESKTOP.addEventListener('change', onBreakpoint);
  } else if (DESKTOP.addListener) {
    DESKTOP.addListener(onBreakpoint);
  }

  document.addEventListener('shopify:section:load', function (event) { initIn(event.target); });
  document.addEventListener('shopify:section:unload', function (event) { destroyIn(event.target); });

  document.addEventListener('shopify:block:select', function (event) {
    var blockId = event.detail && event.detail.blockId;
    if (!blockId) return;
    announcements.forEach(function (instance) { if (instance.el.contains(event.target)) instance.showBlock(blockId); });
    headers.forEach(function (instance) { if (instance.el.contains(event.target)) instance.previewBlock(blockId); });
  });

  document.addEventListener('shopify:block:deselect', function (event) {
    announcements.forEach(function (instance) { if (instance.el.contains(event.target)) instance.resume(); });
    headers.forEach(function (instance) { if (instance.el.contains(event.target)) instance.close(); });
  });

  initIn(document);
})();
