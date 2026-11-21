/* NØRTH — search-drawer.js
   Predictive product search inside the search drawer, using Shopify's native predictive search endpoint
   rendered by sections/predictive-search.liquid. Pressing Enter submits the form to the real search page. */
(function () {
  'use strict';

  window.NORTH = window.NORTH || {};
  if (window.NORTH.searchReady) return;
  window.NORTH.searchReady = true;

  var DEBOUNCE = 250;
  var MIN_CHARS = 2;

  var drawer = document.querySelector('[data-drawer="search"]');
  if (!drawer) return;

  var input = drawer.querySelector('[data-search-input]');
  var clearButton = drawer.querySelector('[data-search-clear]');
  var results = drawer.querySelector('[data-search-results]');
  var endpoint = drawer.getAttribute('data-predictive-url');
  if (!input || !results || !endpoint) return;

  var text = {
    hint: drawer.getAttribute('data-hint-text') || '',
    loading: drawer.getAttribute('data-loading-text') || '',
    empty: drawer.getAttribute('data-empty-text') || '',
    error: drawer.getAttribute('data-error-text') || ''
  };

  var timer = null;
  var controller = null;
  var cache = {};

  function message(content) {
    results.classList.remove('is-loading');
    results.textContent = '';
    var p = document.createElement('p');
    p.className = 'search-drawer__message';
    p.textContent = content;
    results.appendChild(p);
  }

  function reset() {
    window.clearTimeout(timer);
    if (controller) controller.abort();
    results.classList.remove('is-loading');
    message(text.hint);
  }

  function render(html, term) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var node = doc.querySelector('[data-predictive-results]');
    results.classList.remove('is-loading');

    if (!node || node.getAttribute('data-result-count') === '0') {
      message(text.empty.replace('__TERM__', term));
      return;
    }
    results.innerHTML = node.innerHTML;
  }

  function search(term) {
    if (cache[term]) {
      render(cache[term], term);
      return;
    }

    if (controller) controller.abort();
    controller = typeof AbortController === 'function' ? new AbortController() : null;
    results.classList.add('is-loading');

    var params = new URLSearchParams({
      q: term,
      section_id: 'predictive-search',
      'resources[type]': 'product',
      'resources[limit]': '6',
      'resources[options][unavailable_products]': 'last'
    });

    fetch(endpoint + '?' + params.toString(), {
      headers: { Accept: 'text/html' },
      signal: controller ? controller.signal : undefined
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Predictive search ' + response.status);
        return response.text();
      })
      .then(function (html) {
        cache[term] = html;
        // Ignore a response that no longer matches what is in the box.
        if (input.value.trim() === term) render(html, term);
      })
      .catch(function (error) {
        if (error && error.name === 'AbortError') return;
        message(text.error);
      });
  }

  function onInput() {
    var term = input.value.trim();
    clearButton.hidden = input.value.length === 0;
    window.clearTimeout(timer);

    if (term.length < MIN_CHARS) {
      reset();
      return;
    }
    timer = window.setTimeout(function () { search(term); }, DEBOUNCE);
  }

  input.addEventListener('input', onInput);

  clearButton.addEventListener('click', function () {
    input.value = '';
    clearButton.hidden = true;
    reset();
    input.focus();
  });

  document.addEventListener('north:drawer:open', function (event) {
    if (event.detail.name !== 'search') return;
    // Select any previous term so typing replaces it.
    window.requestAnimationFrame(function () { input.select(); });
  });
})();
