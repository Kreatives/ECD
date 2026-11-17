// ECD media-beheer. Volledig data-gedreven: haalt elke pagina op, leest de
// data-cms* attributen en combineert met het manifest uit Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0';

const PAGES = [
  { file: 'index.html', label: 'Home' },
  { file: 'over-ons.html', label: 'Over ons' },
  { file: 'gallerij.html', label: 'Gallerij' },
  { file: 'zalen.html', label: 'Zalen (overzicht)' },
  { file: 'zaal.html', label: 'Zaal — Fortuinhof' },
  { file: 'zaal-scheffers.html', label: 'Zaal — Scheffers' },
  { file: 'zaal-3.html', label: 'Zaal — Zaal 3' },
  { file: 'bruiloft-marokkaans.html', label: 'Bruiloft — Marokkaans' },
  { file: 'bruiloft-turks.html', label: 'Bruiloft — Turks' },
  { file: 'bruiloft-henna.html', label: 'Bruiloft — Henna' },
  { file: 'bruiloft-surinaams.html', label: 'Bruiloft — Surinaams' },
  { file: 'bruiloft-afghaans.html', label: 'Bruiloft — Afghaans' },
  { file: 'contact.html', label: 'Contact' },
];

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

let manifest = { version: 1, singles: {}, galleries: {} };
let dirty = false;
let activePage = null;

/* ---------------- live voorbeeld ---------------- */
// De preview-iframe laadt de pagina met ?cmspreview=1; cms-loader.js leest dan het
// (ook niet-opgeslagen) manifest uit sessionStorage i.p.v. /api/manifest.
const PREVIEW_KEY = 'cms_preview_manifest';
const previewFrame = $('#preview-frame');
let previewTimer = null;

function pageUrl(file) { return file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, ''); }
function writePreviewState() { try { sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(manifest)); } catch (e) {} }
function reloadPreviewNow() {
  try { previewFrame.contentWindow.location.reload(); }
  catch (e) { previewFrame.src = previewFrame.src; }
}
function loadPreview(page) {
  writePreviewState();
  if (previewFrame) previewFrame.src = pageUrl(page.file) + '?cmspreview=1';
}
function refreshPreview() {
  writePreviewState();
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(reloadPreviewNow, 450);
}

/* ---------------- auth / boot ---------------- */

async function boot() {
  const r = await fetch('/api/admin/manifest', { headers: { accept: 'application/json' } });
  if (r.status === 401) { showLogin(); return; }
  if (!r.ok) { showLogin('Kon niet verbinden. Probeer opnieuw.'); return; }
  manifest = normalizeClient(await r.json());
  showApp();
}

function showLogin(msg) {
  $('#app').hidden = true;
  $('#login').hidden = false;
  if (msg) { const e = $('#login-err'); e.textContent = msg; e.hidden = false; }
}

function showApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  renderNav();
  selectPage(PAGES[0]);
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-err').hidden = true;
  const r = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: $('#pw').value }),
  });
  if (r.ok) { $('#pw').value = ''; boot(); }
  else {
    const e2 = $('#login-err');
    e2.textContent = r.status === 401 ? 'Onjuist wachtwoord.' : 'Inloggen mislukt.';
    e2.hidden = false;
  }
});

$('#logout').addEventListener('click', async () => {
  if (dirty && !confirm('Niet-opgeslagen wijzigingen gaan verloren. Toch uitloggen?')) return;
  await fetch('/api/admin/logout', { method: 'POST' });
  location.reload();
});

$('#preview-refresh').addEventListener('click', () => { writePreviewState(); reloadPreviewNow(); });
$('#preview-open').addEventListener('click', () => { if (activePage) window.open(pageUrl(activePage.file), '_blank'); });

/* ---------------- navigation ---------------- */

function renderNav() {
  const nav = $('#pagenav');
  nav.innerHTML = '';
  PAGES.forEach((p) => {
    const b = el('button', 'side__link', p.label);
    b.dataset.file = p.file;
    b.addEventListener('click', () => {
      if (dirty && !confirm('Niet-opgeslagen wijzigingen gaan verloren. Van pagina wisselen?')) return;
      selectPage(p);
    });
    nav.appendChild(b);
  });
}

function markActiveNav(file) {
  document.querySelectorAll('.side__link').forEach((b) =>
    b.classList.toggle('is-active', b.dataset.file === file));
}

/* ---------------- parse page ---------------- */

function toAbs(src) {
  if (!src) return src;
  if (/^https?:\/\//i.test(src) || src.startsWith('/')) return src;
  if (src.startsWith('assets/')) return '/' + src;
  return src;
}

async function parsePage(file) {
  const res = await fetch('/' + file, { cache: 'no-store' });
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const singles = [...doc.querySelectorAll('[data-cms]')].map((node) => {
    const tag = node.tagName.toLowerCase();
    let defSrc = '';
    let defPoster = '';
    if (tag === 'video') {
      const source = node.querySelector('source');
      defSrc = toAbs((source && source.getAttribute('src')) || node.getAttribute('src') || '');
      defPoster = toAbs(node.getAttribute('poster') || '');
    } else {
      defSrc = toAbs(node.getAttribute('src') || '');
    }
    return {
      key: node.getAttribute('data-cms'),
      label: node.getAttribute('data-cms-label') || node.getAttribute('data-cms'),
      tag, defSrc, defPoster,
    };
  });

  const galleries = [...doc.querySelectorAll('[data-cms-gallery]')].map((node) => {
    const count = parseInt(node.getAttribute('data-cms-count') || '0', 10) || node.children.length;
    const media = node.getAttribute('data-cms-media') || 'image';
    const items = [];
    for (const child of node.children) {
      if (items.length >= count) break;
      const m = child.querySelector('img,video') || (child.matches('img,video') ? child : null);
      if (!m) continue;
      items.push({ type: media, src: toAbs(m.getAttribute('src') || ''), alt: m.getAttribute('alt') || '' });
    }
    return {
      key: node.getAttribute('data-cms-gallery'),
      label: node.getAttribute('data-cms-label') || 'Galerij',
      kind: node.getAttribute('data-cms-kind') || 'grid',
      media, count, defItems: items,
    };
  });

  return { singles, galleries };
}

async function selectPage(page) {
  activePage = page;
  markActiveNav(page.file);
  $('#page-title').textContent = page.label;
  $('#page-hint').textContent = '';
  const box = $('#editor');
  box.innerHTML = '<div class="spinner">Laden…</div>';
  try {
    const data = await parsePage(page.file);
    renderEditor(page, data);
    loadPreview(page);
  } catch (err) {
    box.innerHTML = '<div class="empty">Kon deze pagina niet laden.</div>';
  }
}

/* ---------------- render editor ---------------- */

function renderEditor(page, data) {
  const box = $('#editor');
  box.innerHTML = '';

  const nMedia = data.singles.length + data.galleries.reduce((a, g) => a + 1, 0);
  $('#page-hint').textContent =
    `${data.galleries.length} galerij(en) · ${data.singles.length} losse afbeelding(en)/video('s)`;

  if (!nMedia) {
    box.innerHTML = '<div class="empty">Op deze pagina staan geen beheerbare media.</div>';
    return;
  }

  // Galerijen bovenaan (de "carousels als gallerij")
  data.galleries.forEach((g) => box.appendChild(renderGallery(g)));

  // Losse media
  if (data.singles.length) {
    const sec = el('section', 'section');
    sec.appendChild(el('h2', 'section__title', 'Losse afbeeldingen & video’s'));
    sec.appendChild(el('p', 'section__meta', 'Klik op “Vervang” om een foto of video te wijzigen. “Standaard” zet het origineel terug.'));
    const grid = el('div', 'grid');
    data.singles.forEach((s) => grid.appendChild(renderSingle(s)));
    sec.appendChild(grid);
    box.appendChild(sec);
  }
}

function currentSingleSrc(s) {
  const o = manifest.singles[s.key];
  if (s.tag === 'video') return (o && o.poster) || s.defPoster || (o && o.src) || s.defSrc;
  return (o && o.src) || s.defSrc;
}

function renderSingle(s) {
  const card = el('div', 'card');
  const media = el('div', 'card__media');
  const thumbSrc = currentSingleSrc(s);
  if (s.tag === 'video' && !(manifest.singles[s.key] && manifest.singles[s.key].poster) && !s.defPoster) {
    media.innerHTML = `<video src="${attr(currentSingleSrc(s))}" muted playsinline preload="metadata"></video>`;
  } else {
    media.innerHTML = thumbSrc ? `<img src="${attr(thumbSrc)}" alt="">` : '';
  }
  card.appendChild(media);

  const body = el('div', 'card__body');
  body.appendChild(el('div', 'card__label', escapeHtml(s.label)));
  body.appendChild(el('div', 'card__tag', s.tag === 'video' ? 'Video' : 'Afbeelding'));
  if (manifest.singles[s.key]) body.appendChild(el('span', 'badge', 'Aangepast'));

  const row = el('div', 'card__row');
  if (s.tag === 'video') {
    row.appendChild(actionBtn('Vervang video', 'btn btn--sm btn--primary', () => replaceSingle(s, 'video', 'src', card, s)));
    row.appendChild(actionBtn('Poster', 'btn btn--sm', () => replaceSingle(s, 'image', 'poster', card, s)));
  } else {
    row.appendChild(actionBtn('Vervang', 'btn btn--sm btn--primary', () => replaceSingle(s, 'image', 'src', card, s)));
  }
  if (manifest.singles[s.key]) {
    row.appendChild(actionBtn('Standaard', 'btn btn--sm btn--ghost', () => {
      delete manifest.singles[s.key];
      setDirty();
      swapCard(card, renderSingle(s));
    }));
  }
  body.appendChild(row);
  card.appendChild(body);
  return card;
}

async function replaceSingle(s, accept, field, card) {
  const file = await pickFile(accept);
  if (!file) return;
  const url = await doUpload(file);
  if (!url) return;
  const entry = manifest.singles[s.key] || {};
  entry[field] = url;
  manifest.singles[s.key] = entry;
  setDirty();
  swapCard(card, renderSingle(s));
}

/* ---------------- galleries ---------------- */

function galItems(g) {
  // materialiseer de huidige set in het manifest zodra er bewerkt wordt
  if (!manifest.galleries[g.key]) {
    manifest.galleries[g.key] = { items: g.defItems.map((i) => ({ ...i })) };
  }
  return manifest.galleries[g.key].items;
}

function effectiveItems(g) {
  const o = manifest.galleries[g.key];
  return o ? o.items : g.defItems;
}

function renderGallery(g) {
  const sec = el('section', 'section');
  const wrap = el('div', 'gal');

  const head = el('div');
  head.appendChild(el('h2', 'section__title', escapeHtml(g.label)));
  const kindLabel = { marquee: 'Fotostrip', reels: 'Video reels', carousel: 'Carousel', grid: 'Raster' }[g.kind] || g.kind;
  const meta = el('p', 'section__meta',
    `${kindLabel} · ${g.media === 'video' ? "video's" : 'foto’s'} · sleep om de volgorde te wijzigen`);
  head.appendChild(meta);
  if (manifest.galleries[g.key]) head.appendChild(el('span', 'badge', 'Aangepast'));
  wrap.appendChild(head);

  const itemsBox = el('div', 'gal__items');
  itemsBox.dataset.key = g.key;
  renderItems(itemsBox, g);
  wrap.appendChild(itemsBox);

  const foot = el('div', 'gal__foot');
  foot.appendChild(actionBtn(g.media === 'video' ? '+ Video toevoegen' : '+ Foto toevoegen', 'btn btn--sm btn--primary',
    async () => {
      const file = await pickFile(g.media);
      if (!file) return;
      const url = await doUpload(file);
      if (!url) return;
      galItems(g).push({ type: g.media, src: url, alt: '' });
      setDirty();
      refreshGallery(sec, g);
    }));
  if (manifest.galleries[g.key]) {
    foot.appendChild(actionBtn('Alles terug naar standaard', 'btn btn--sm btn--ghost', () => {
      if (!confirm('Deze galerij terugzetten naar de originele foto’s?')) return;
      delete manifest.galleries[g.key];
      setDirty();
      refreshGallery(sec, g);
    }));
  }
  foot.appendChild(el('span', 'hint', `${effectiveItems(g).length} item(s)`));
  wrap.appendChild(foot);

  sec.appendChild(wrap);
  return sec;
}

function refreshGallery(sec, g) {
  const fresh = renderGallery(g);
  sec.replaceWith(fresh);
}

function renderItems(box, g) {
  box.innerHTML = '';
  const items = effectiveItems(g);
  items.forEach((it, idx) => box.appendChild(renderItem(g, it, idx)));
}

function renderItem(g, it, idx) {
  const node = el('div', 'item');
  node.draggable = true;
  node.dataset.idx = String(idx);
  const media = it.type === 'video'
    ? `<video src="${attr(it.src)}" muted playsinline preload="metadata"></video>`
    : `<img src="${attr(it.src)}" alt="">`;
  node.innerHTML = `${media}<span class="item__num">${idx + 1}</span><button class="item__del" title="Verwijderen" aria-label="Verwijderen">×</button>`;

  node.querySelector('.item__del').addEventListener('click', (e) => {
    e.stopPropagation();
    const items = galItems(g);
    if (items.length <= 1) { alert('Er moet minimaal één item blijven staan.'); return; }
    items.splice(idx, 1);
    setDirty();
    const sec = node.closest('.section');
    refreshGallery(sec, g);
  });

  // drag reorder
  node.addEventListener('dragstart', (e) => {
    node.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  });
  node.addEventListener('dragend', () => node.classList.remove('dragging'));
  node.addEventListener('dragover', (e) => { e.preventDefault(); node.classList.add('over'); });
  node.addEventListener('dragleave', () => node.classList.remove('over'));
  node.addEventListener('drop', (e) => {
    e.preventDefault();
    node.classList.remove('over');
    const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const to = idx;
    if (from === to || Number.isNaN(from)) return;
    const items = galItems(g);
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    setDirty();
    const sec = node.closest('.section');
    refreshGallery(sec, g);
  });

  return node;
}

/* ---------------- uploads ---------------- */

function pickFile(accept) {
  return new Promise((resolve) => {
    const input = $('#fileinput');
    input.value = '';
    input.accept = accept === 'video' ? 'video/*' : accept === 'image' ? 'image/*' : accept;
    const onChange = () => { input.removeEventListener('change', onChange); resolve(input.files[0] || null); };
    input.addEventListener('change', onChange);
    input.click();
  });
}

async function doUpload(file) {
  setStatus('Uploaden…');
  try {
    // 1. vraag een signed upload-URL bij onze (beveiligde) functie
    const r = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filename: file.name }),
    });
    if (r.status === 401) { showLogin('Sessie verlopen, log opnieuw in.'); return null; }
    if (!r.ok) throw new Error('kon upload niet starten (' + r.status + ')');
    const cfg = await r.json();

    // 2. upload rechtstreeks browser -> Supabase (bypass function-limiet)
    const sb = createClient(cfg.supabaseUrl, cfg.anonKey);
    const { error } = await sb.storage.from(cfg.bucket)
      .uploadToSignedUrl(cfg.path, cfg.token, file, { contentType: file.type });
    if (error) throw new Error(error.message);

    setStatus('');
    return cfg.publicUrl;
  } catch (err) {
    setStatus('Upload mislukt: ' + (err && err.message || ''), 'err');
    return null;
  }
}

/* ---------------- save ---------------- */

$('#save').addEventListener('click', async () => {
  const btn = $('#save');
  btn.disabled = true;
  setStatus('Opslaan…');
  try {
    const r = await fetch('/api/admin/manifest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(manifest),
    });
    if (r.status === 401) { showLogin('Sessie verlopen, log opnieuw in.'); return; }
    if (!r.ok) throw new Error('status ' + r.status);
    dirty = false;
    setStatus('Opgeslagen ✓', 'ok');
  } catch (err) {
    btn.disabled = false;
    setStatus('Opslaan mislukt', 'err');
  }
});

function setDirty() { dirty = true; $('#save').disabled = false; setStatus('Niet-opgeslagen wijzigingen'); refreshPreview(); }
function setStatus(txt, kind) {
  const s = $('#status');
  s.textContent = txt || '';
  s.className = 'status' + (kind === 'ok' ? ' is-ok' : kind === 'err' ? ' is-err' : '');
}

window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------------- helpers ---------------- */

function actionBtn(label, cls, onClick) {
  const b = el('button', cls, escapeHtml(label));
  b.addEventListener('click', onClick);
  return b;
}
function swapCard(oldCard, newCard) { oldCard.replaceWith(newCard); }
function attr(v) { return String(v == null ? '' : v).replace(/"/g, '&quot;'); }
function escapeHtml(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function normalizeClient(m) {
  return {
    version: 1,
    singles: (m && m.singles) || {},
    galleries: (m && m.galleries) || {},
  };
}

boot();
