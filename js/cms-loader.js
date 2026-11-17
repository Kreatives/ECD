/*
 * CMS-loader — draait op elke pagina IN PLAATS VAN de directe main.js-include.
 * 1. haalt /api/manifest op (met timeout),
 * 2. vervangt single-media (src/poster) en herrendert beheerde galerijen,
 * 3. laadt daarna pas main.js, zodat de carousels/marquees op de definitieve
 *    DOM worden geïnitialiseerd (main.js rekent met scrollWidth).
 * Faalt er iets of is er geen manifest -> gewoon main.js laden, site = ongewijzigd.
 */
(function () {
  'use strict';

  var self = document.currentScript;
  var mainSrc = (self && self.getAttribute('data-main')) || '/js/main.js';

  function loadMain() {
    var s = document.createElement('script');
    s.src = mainSrc;
    document.body.appendChild(s);
  }

  function escAttr(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function itemHTML(kind, item) {
    var src = escAttr(item.src);
    var alt = escAttr(item.alt || '');
    switch (kind) {
      case 'marquee':
        return '<div class="marquee__item"><img src="' + src + '" alt="' + alt + '" loading="lazy"></div>';
      case 'reels':
        return '<figure class="reel"><video src="' + src + '" autoplay muted loop playsinline preload="metadata"></video></figure>';
      case 'carousel':
        return '<figure class="carousel__item"><img src="' + src + '" alt="' + alt + '" loading="lazy"></figure>';
      case 'grid':
      default:
        return '<figure class="gallery__item"><img src="' + src + '" alt="' + alt + '" loading="lazy"></figure>';
    }
  }

  function renderGallery(container, items) {
    var kind = container.getAttribute('data-cms-kind') || 'grid';
    var html = items.map(function (it) { return itemHTML(kind, it); }).join('');
    // marquee/reels hebben in de HTML een gedupliceerde set voor de naadloze lus.
    if (kind === 'marquee' || kind === 'reels') html += html;
    container.innerHTML = html;
  }

  function applySingle(el, entry) {
    if (!entry) return;
    if (el.tagName.toLowerCase() === 'video') {
      if (entry.poster) el.setAttribute('poster', entry.poster);
      if (entry.src) {
        var source = el.querySelector('source');
        if (source) { source.setAttribute('src', entry.src); if (el.load) el.load(); }
        else el.setAttribute('src', entry.src);
      }
    } else if (entry.src) {
      el.setAttribute('src', entry.src);
    }
  }

  function applyManifest(m) {
    var singles = (m && m.singles) || {};
    document.querySelectorAll('[data-cms]').forEach(function (el) {
      applySingle(el, singles[el.getAttribute('data-cms')]);
    });
    var galleries = (m && m.galleries) || {};
    document.querySelectorAll('[data-cms-gallery]').forEach(function (el) {
      var g = galleries[el.getAttribute('data-cms-gallery')];
      if (g && Array.isArray(g.items) && g.items.length) renderGallery(el, g.items);
    });
  }

  // Preview-modus: /admin laadt deze pagina in een iframe met ?cmspreview=1 en zet
  // het (ook niet-opgeslagen) manifest in sessionStorage. Dan niet /api/manifest gebruiken.
  function previewManifest() {
    try {
      if (new URLSearchParams(location.search).has('cmspreview')) {
        var raw = sessionStorage.getItem('cms_preview_manifest');
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {}
    return null;
  }

  function fetchManifest() {
    if (!window.fetch) return Promise.resolve(null);
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 2500) : null;
    return fetch('/api/manifest', ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (m) { if (timer) clearTimeout(timer); return m; });
  }

  var preview = previewManifest();
  if (preview) {
    try { applyManifest(preview); } catch (e) { /* stil falen */ }
    loadMain();
  } else {
    fetchManifest().then(function (m) {
      try { if (m) applyManifest(m); } catch (e) { /* stil falen, niet de site breken */ }
      loadMain();
    });
  }
})();
