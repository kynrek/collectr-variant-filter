// ==UserScript==
// @name         Collectr – Card Variant Filter
// @namespace    https://rewindink.com/
// @version      3.2
// @description  Filter Collectr card lists by variant (Holofoil, Reverse Holofoil, Normal, etc.) with a banner and a floating multi-select dropdown.
// @license      MIT
// @match        https://app.getcollectr.com/*
// @grant        none
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/kynrek/collectr-variant-filter/master/collectr-variant-filter.user.js
// @updateURL    https://raw.githubusercontent.com/kynrek/collectr-variant-filter/master/collectr-variant-filter.user.js
// ==/UserScript==

(function () {
  'use strict';

  const SHOW_BANNER = true;                    // set to false to use only the floating dropdown
  const STORE_KEY = 'collectrVariantFilter';   // { unchecked: [variant, ...] }
  const NO_VARIANT = 'Other / Sealed';

  // Remember UNchecked variants, so newly seen variants default to visible
  let unchecked = new Set();
  try { unchecked = new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '{}').unchecked || []); } catch (e) {}
  const save = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ unchecked: [...unchecked] })); } catch (e) {}
  };

  // Variant label is a small muted span ("Holofoil", "Reverse Holofoil", "Normal", ...).
  // The bold title span is skipped so names like "(Cosmos Holo)" don't count.
  function getVariant(card) {
    for (const s of card.querySelectorAll('span')) {
      if (s.children.length) continue;
      if ((s.getAttribute('class') || '').includes('font-bold')) continue;
      const t = s.textContent.trim();
      if (/holo|normal|foil|edition|unlimited/i.test(t) && t.length < 40) return t;
    }
    return NO_VARIANT;
  }

  const rank = v => (/reverse/i.test(v) ? 1 : /holo/i.test(v) ? 0 : v === NO_VARIANT ? 3 : 2);
  const sortVariants = arr => arr.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };

  // ---------- Styles ----------
  const style = document.createElement('style');
  style.textContent = `
    .cvf-ui { font:500 13px system-ui, sans-serif; color:#f3f0ff; }
    .cvf-ui label { display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; }
    .cvf-ui input[type=checkbox] { accent-color:#a78bfa; width:15px; height:15px; cursor:pointer; margin:0; }
    .cvf-ui .cvf-count { opacity:.65; font-size:12px; margin-left:auto; padding-left:8px; }
    .cvf-ui .cvf-btn { background:#3b3355; color:#f3f0ff; border:none; border-radius:6px;
      padding:4px 10px; font:600 12px system-ui, sans-serif; cursor:pointer; }
    .cvf-ui .cvf-btn:hover { background:#7c3aed; }

    #cvf-banner { display:flex; flex-wrap:wrap; align-items:center; gap:8px 16px;
      padding:10px 14px; margin:0 0 16px; border-radius:10px; background:#1f1b2e;
      border:1px solid #7c3aed; width:100%; box-sizing:border-box; }
    #cvf-banner .cvf-list { display:contents; }
    #cvf-banner label { display:inline-flex; gap:6px; }
    #cvf-banner .cvf-count { margin-left:0; padding-left:0; }
    #cvf-banner .cvf-actions { margin-left:auto; display:flex; gap:6px; align-items:center; }
    #cvf-banner .cvf-summary { opacity:.8; font-size:12px; }

    #cvf-float { position:fixed; bottom:20px; right:20px; z-index:99999;
      display:flex; flex-direction:column; align-items:flex-end; gap:8px; }
    #cvf-float .cvf-toggle { background:#7c3aed; color:#fff; border:none; border-radius:8px;
      padding:10px 14px; font:600 13px system-ui, sans-serif; cursor:pointer;
      box-shadow:0 2px 8px rgba(0,0,0,.35); max-width:320px; white-space:nowrap;
      overflow:hidden; text-overflow:ellipsis; }
    #cvf-float .cvf-panel { display:none; min-width:230px; background:#1f1b2e;
      border:1px solid #7c3aed; border-radius:10px; padding:10px 12px;
      box-shadow:0 6px 20px rgba(0,0,0,.45); }
    #cvf-float.open .cvf-panel { display:block; }
    #cvf-float .cvf-list { display:flex; flex-direction:column; gap:8px; margin-bottom:10px; }
    #cvf-float .cvf-actions { display:flex; gap:6px; border-top:1px solid #3b3355; padding-top:8px; }
  `;
  document.head.appendChild(style);

  const actionsHTML = `
    <button class="cvf-btn" data-act="holo">Holo only</button>
    <button class="cvf-btn" data-act="all">All</button>
    <button class="cvf-btn" data-act="none">None</button>`;

  // ---------- Banner (above the card grid) ----------
  const banner = document.createElement('div');
  banner.id = 'cvf-banner';
  banner.className = 'cvf-ui';
  banner.innerHTML = `<strong>✨ Variants:</strong><span class="cvf-list"></span>
    <span class="cvf-actions">${actionsHTML}<span class="cvf-summary"></span></span>`;

  // ---------- Floating dropdown ----------
  const float = document.createElement('div');
  float.id = 'cvf-float';
  float.className = 'cvf-ui';
  float.innerHTML = `<div class="cvf-panel"><div class="cvf-list"></div>
    <div class="cvf-actions">${actionsHTML}</div></div>
    <button class="cvf-toggle" type="button"></button>`;
  document.body.appendChild(float);
  const toggleBtn = float.querySelector('.cvf-toggle');
  toggleBtn.addEventListener('click', () => float.classList.toggle('open'));
  document.addEventListener('click', e => { if (!float.contains(e.target)) float.classList.remove('open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') float.classList.remove('open'); });

  // ---------- Shared checkbox lists ----------
  const lists = [banner.querySelector('.cvf-list'), float.querySelector('.cvf-list')];
  const known = [];                       // variants seen so far, sorted
  const rows = new Map();                 // variant -> [{input,countEl,label}, ...] one per list

  function addVariant(v) {
    if (rows.has(v)) return;
    known.push(v); sortVariants(known);
    rows.set(v, lists.map(() => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.addEventListener('change', () => {
        input.checked ? unchecked.delete(v) : unchecked.add(v);
        save(); apply();
      });
      const name = document.createElement('span'); name.textContent = v;
      const countEl = document.createElement('span'); countEl.className = 'cvf-count';
      label.append(input, name, countEl);
      return { input, countEl, label };
    }));
    lists.forEach((list, i) => known.forEach(k => list.appendChild(rows.get(k)[i].label)));
  }

  function onAction(e) {
    const act = e.target.dataset && e.target.dataset.act;
    if (!act) return;
    for (const v of known) {
      const on = act === 'all' || (act === 'holo' && /holo/i.test(v));
      on ? unchecked.delete(v) : unchecked.add(v);
    }
    save(); apply();
  }
  banner.addEventListener('click', onAction);
  float.addEventListener('click', onAction);

  // Put the banner directly above the card grid (re-inserts if the site re-renders)
  function placeBanner(firstCard) {
    const grid = firstCard.closest('li')?.parentElement?.parentElement; // LI < UL.contents < DIV.grid
    if (!grid || !grid.parentElement) return;
    if (banner.nextElementSibling !== grid) grid.parentElement.insertBefore(banner, grid);
  }

  // ---------- Filtering ----------
  function apply() {
    const cards = document.querySelectorAll('.product-card');
    if (!cards.length) { banner.remove(); float.style.display = 'none'; return; }
    float.style.display = '';
    if (SHOW_BANNER) placeBanner(cards[0]);

    const counts = {};
    let shown = 0;
    cards.forEach(card => {
      const v = getVariant(card);
      counts[v] = (counts[v] || 0) + 1;
      addVariant(v);
      const keep = !unchecked.has(v);
      const item = card.closest('li') || card;
      const disp = keep ? '' : 'none';
      if (item.style.display !== disp) item.style.display = disp;
      if (keep) shown++;
    });

    for (const v of known) {
      for (const { input, countEl, label } of rows.get(v)) {
        input.checked = !unchecked.has(v);
        setText(countEl, `(${counts[v] || 0})`);
        label.style.opacity = counts[v] ? '1' : '.45';
      }
    }

    const selected = known.filter(v => !unchecked.has(v));
    const what = selected.length === known.length ? 'All variants'
      : selected.length === 0 ? 'None'
      : selected.join(', ');
    setText(toggleBtn, `✨ ${what} (${shown}/${cards.length}) ▾`);
    setText(banner.querySelector('.cvf-summary'), `Showing ${shown} of ${cards.length} loaded`);
  }

  // Re-apply as cards load (infinite scroll, site filters, SPA navigation),
  // ignoring changes inside our own UI to avoid a feedback loop.
  let pending = false;
  new MutationObserver(muts => {
    if (muts.every(m => banner.contains(m.target) || float.contains(m.target))) return;
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; apply(); });
  }).observe(document.body, { childList: true, subtree: true });

  apply();
})();
