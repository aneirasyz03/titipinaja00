/* ============================================
   TITIP DULU ♡ — app.js
   Static SPA with localStorage
   ============================================ */

(function () {
  'use strict';

  // ---------- STATE ----------
  const state = {
    products: [],
    categories: [],
    settings: {},
    list: [],          // { id, name, category, store, price, qty, note, packed, custom }
    favorites: [],     // product ids
    previousList: null,
    user: {
      name: '',
      visitDate: '',
      visitTime: '',
      budget: 150000,
      mamaWa: '',
      mamaIg: '',
      mamaNote: 'makasii Mamaa 🥹🤍'
    },
    filters: {
      category: '',
      store: '',
      search: ''
    },
    currentEditId: null,
    customTab: 'bulk',
    shareTemplate: 'default',
    history: [],
    journal: '',
    mood: '',
    theme: 'day',
    badges: {}
  };

  // ---------- STORAGE KEYS ----------
  const KEYS = {
    list: 'titipdulu_list',
    favorites: 'titipdulu_favorites',
    previous: 'titipdulu_previous',
    history: 'titipdulu_history',
    user: 'titipdulu_user',
    customProducts: 'titipdulu_custom_products',
    journal: 'titipdulu_journal',
    mood: 'titipdulu_mood',
    theme: 'titipdulu_theme',
    badges: 'titipdulu_badges'
  };

  // ---------- HELPERS ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  function formatRp(n) {
    const num = Math.round(Number(n) || 0);
    return 'Rp' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function toast(msg, duration = 2200) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), duration);
  }

  // ---------- FORM VALIDATION ----------
  function clearFieldError(input) {
    if (!input) return;
    input.classList.remove('input-error');
    input.removeAttribute('aria-invalid');
    const wrap = input.closest('.settings-card, .modal-body, .custom-tab-panel') || input.parentElement;
    const err = wrap && wrap.querySelector('.field-error[data-for="' + input.id + '"]');
    if (err) err.remove();
  }

  function setFieldError(input, message) {
    if (!input) return;
    clearFieldError(input);
    input.classList.add('input-error');
    input.setAttribute('aria-invalid', 'true');
    const err = document.createElement('p');
    err.className = 'field-error';
    err.dataset.for = input.id || '';
    err.textContent = message;
    // insert after input
    if (input.nextSibling) {
      input.parentNode.insertBefore(err, input.nextSibling);
    } else {
      input.parentNode.appendChild(err);
    }
    try { input.focus(); } catch (_) {}
  }

  function clearFormErrors(root) {
    if (!root) return;
    root.querySelectorAll('.input-error').forEach(el => {
      el.classList.remove('input-error');
      el.removeAttribute('aria-invalid');
    });
    root.querySelectorAll('.field-error').forEach(el => el.remove());
  }

  function sanitizeText(str, maxLen) {
    let s = String(str || '').replace(/\s+/g, ' ').trim();
    if (maxLen && s.length > maxLen) s = s.slice(0, maxLen);
    return s;
  }

  function isValidQty(val) {
    const n = parseInt(val, 10);
    return !isNaN(n) && n >= 1 && n <= 999;
  }

  function isValidPrice(val, allowEmpty) {
    if (val === '' || val === null || val === undefined) return !!allowEmpty;
    const n = Number(val);
    return !isNaN(n) && n >= 0 && n <= 100000000 && Number.isFinite(n);
  }

  function isValidWa(val) {
    if (!val) return true; // optional
    const digits = String(val).replace(/\D/g, '');
    // ID mobile: 08xx / 62xxx, 10–15 digits
    if (digits.length < 10 || digits.length > 15) return false;
    return /^(0|62|8)/.test(digits);
  }

  function isValidIg(val) {
    if (!val) return true;
    const handle = String(val).replace(/^@/, '').trim();
    // Instagram username rules (simplified)
    return /^[a-zA-Z0-9._]{1,30}$/.test(handle);
  }

  function isValidDateStr(val) {
    if (!val) return true; // optional
    const d = new Date(val + 'T00:00:00');
    return !isNaN(d.getTime());
  }

  function isValidTimeStr(val) {
    if (!val) return true;
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(val);
  }

  function save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('localStorage save failed', e);
    }
  }

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function uid() {
    return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ---------- DATA LOAD ----------
  // Works both on GitHub Pages (fetch) and when opened as file:// (embedded data)
  async function loadData() {
    let products, categories, settings;

    // Prefer embedded data (always available offline)
    if (window.TITIP_DATA) {
      products = window.TITIP_DATA.products;
      categories = window.TITIP_DATA.categories;
      settings = window.TITIP_DATA.settings;
    } else {
      // Fallback: try fetch (for GitHub Pages / local server)
      try {
        const [p, c, s] = await Promise.all([
          fetch('data/products.json').then(r => r.json()),
          fetch('data/categories.json').then(r => r.json()),
          fetch('data/settings.json').then(r => r.json())
        ]);
        products = p;
        categories = c;
        settings = s;
      } catch (e) {
        console.error('Failed to load data', e);
        toast('gagal load data 😭 coba refresh');
        return;
      }
    }

    state.products = products || [];
    state.categories = categories || [];
    state.settings = settings || {};

    // merge custom products saved by user
    const customs = load(KEYS.customProducts, []);
    state.products = [...state.products, ...customs];
  }

  function loadUserData() {
    state.list = load(KEYS.list, []);
    state.favorites = load(KEYS.favorites, []);
    state.previousList = load(KEYS.previous, null);
    state.history = load(KEYS.history, []);
    state.journal = load(KEYS.journal, '') || '';
    state.mood = load(KEYS.mood, '') || '';
    state.theme = load(KEYS.theme, 'day') || 'day';
    state.badges = load(KEYS.badges, {}) || {};
    const user = load(KEYS.user, null);
    if (user) {
      state.user = { ...state.user, ...user };
    }
    applyTheme(state.theme);
  }

  function applyTheme(theme) {
    state.theme = theme === 'night' ? 'night' : 'day';
    document.body.classList.toggle('theme-night', state.theme === 'night');
    const btn = $('#btn-theme-toggle');
    if (btn) btn.textContent = state.theme === 'night' ? '☀️' : '🌙';
    save(KEYS.theme, state.theme);
  }

  function toggleTheme() {
    applyTheme(state.theme === 'night' ? 'day' : 'night');
    toast(state.theme === 'night' ? 'mode malam 🌙' : 'mode siang ☀️');
  }

  function setMood(mood) {
    state.mood = mood;
    save(KEYS.mood, mood);
    $$('.mood-btn').forEach(b => b.classList.toggle('active', b.dataset.mood === mood));
    const msgs = {
      senang: 'yeay mood bagus! 🥰',
      semangat: 'semangat packing-nya! ✨',
      bingung: 'gapapa, list aja pelan-pelan 😭',
      kangen: 'kangen Mama yaa 🥹',
      santai: 'santai aja, masih ada waktu 🍦'
    };
    toast(msgs[mood] || 'mood disimpan ♡');
    unlockBadge('mood');
  }

  const BADGE_DEFS = [
    { id: 'first_item', emoji: '🌱', label: 'first item' },
    { id: 'ten_items', emoji: '🧺', label: '10 items' },
    { id: 'full_pack', emoji: '✨', label: 'all packed' },
    { id: 'shared', emoji: '💌', label: 'sent to mama' },
    { id: 'mood', emoji: '🥰', label: 'mood check' },
    { id: 'freewrite', emoji: '✏️', label: 'free writer' },
    { id: 'night', emoji: '🌙', label: 'night owl' }
  ];

  function unlockBadge(id) {
    if (state.badges[id]) return;
    state.badges[id] = Date.now();
    save(KEYS.badges, state.badges);
    renderBadges();
    const def = BADGE_DEFS.find(b => b.id === id);
    if (def) {
      toast('badge unlocked: ' + def.emoji + ' ' + def.label + '!', 2800);
      const t = $('#toast');
      if (t) {
        t.classList.add('toast-special');
        setTimeout(() => t.classList.remove('toast-special'), 2800);
      }
    }
  }

  function renderBadges() {
    const row = $('#badge-row');
    if (!row) return;
    row.innerHTML = BADGE_DEFS.map(b => `
      <div class="badge ${state.badges[b.id] ? 'unlocked' : ''}" title="${b.label}">
        <span>${b.emoji}</span> ${b.label}
      </div>
    `).join('');
  }

  function checkBadges() {
    if (state.list.length >= 1) unlockBadge('first_item');
    if (getListItemCount() >= 10) unlockBadge('ten_items');
    if (state.list.length > 0 && state.list.every(i => i.packed)) unlockBadge('full_pack');
    if (state.list.some(i => i.freeWrite || i.custom)) unlockBadge('freewrite');
    if (state.theme === 'night') unlockBadge('night');
  }

  function persistList() {
    save(KEYS.list, state.list);
    updateUI();
  }

  function persistFavorites() {
    save(KEYS.favorites, state.favorites);
  }

  function persistUser() {
    save(KEYS.user, state.user);
  }

  // ---------- LIST OPERATIONS ----------
  function findInList(id) {
    return state.list.find(i => i.id === id);
  }

  function addToList(product, qty = 1) {
    const existing = findInList(product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      state.list.push({
        id: product.id,
        name: product.name,
        category: product.category,
        store: product.store || '',
        price: product.price || 0,
        qty: qty,
        note: product.note || '',
        packed: false,
        custom: !!product.custom,
        freeWrite: !!product.freeWrite,
        emoji: product.emoji || '📦',
        priority: !!product.priority
      });
    }
    persistList();
    toast('udah masuk list! ♡');
  }

  function removeFromList(id) {
    state.list = state.list.filter(i => i.id !== id);
    persistList();
    toast('dihapus dari list');
  }

  function setQty(id, qty) {
    const item = findInList(id);
    if (!item) return;
    item.qty = Math.max(1, qty);
    persistList();
  }

  function togglePacked(id) {
    const item = findInList(id);
    if (!item) return;
    item.packed = !item.packed;
    persistList();
    checkAllPacked();
  }

  function toggleFavorite(id) {
    const idx = state.favorites.indexOf(id);
    if (idx >= 0) {
      state.favorites.splice(idx, 1);
      toast('dihapus dari usuals');
    } else {
      state.favorites.push(id);
      toast('disimpan di usuals ⭐');
    }
    persistFavorites();
    updateUI();
  }

  function isFavorite(id) {
    return state.favorites.includes(id);
  }

  // Budget only counts catalog items with price — free-write items are excluded
  function getListTotal() {
    return state.list.reduce((sum, i) => {
      if (i.freeWrite || i.custom) return sum;
      return sum + ((Number(i.price) || 0) * (i.qty || 1));
    }, 0);
  }

  function getBudgetItemCount() {
    return state.list.filter(i => !i.freeWrite && !i.custom && (Number(i.price) || 0) > 0).length;
  }

  function getListItemCount() {
    return state.list.reduce((sum, i) => sum + i.qty, 0);
  }

  function checkAllPacked() {
    if (state.list.length === 0) return;
    const all = state.list.every(i => i.packed);
    if (all) {
      toast('EVERYTHING IS READY!!! 🧺✨', 3000);
      spawnConfetti();
    }
  }

  // ---------- RENDER HELPERS ----------
  function getCategory(id) {
    return state.categories.find(c => c.id === id) || { name: id, emoji: '📦' };
  }

  function renderHomeCategories() {
    const el = $('#home-categories');
    if (!el) return;
    el.innerHTML = state.categories
      .filter(c => c.id !== 'other')
      .map(c => `
        <button class="cat-chip" data-cat="${c.id}" aria-label="${c.name}">
          <span>${c.emoji}</span> ${c.name}
        </button>
      `).join('');
    el.querySelectorAll('.cat-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        state.filters.category = btn.dataset.cat;
        navigate('browse');
        const sel = $('#filter-category');
        if (sel) sel.value = state.filters.category;
        renderProducts();
      });
    });
  }

  function renderFilters() {
    const catSel = $('#filter-category');
    const storeSel = $('#filter-store');
    if (!catSel || !storeSel) return;

    catSel.innerHTML = '<option value="">semua kategori</option>' +
      state.categories.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('');

    const stores = [...new Set(state.products.map(p => p.store).filter(Boolean))].sort();
    storeSel.innerHTML = '<option value="">semua toko</option>' +
      stores.map(s => `<option value="${s}">${s}</option>`).join('');

    catSel.value = state.filters.category;
    storeSel.value = state.filters.store;
  }

  function getFilteredProducts() {
    let list = state.products;
    const { category, store, search } = state.filters;
    if (category) list = list.filter(p => p.category === category);
    if (store) list = list.filter(p => p.store === store);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.store && p.store.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some(t => t.includes(q)))
      );
    }
    return list;
  }

  function renderProducts() {
    const grid = $('#product-grid');
    if (!grid) return;
    const products = getFilteredProducts();

    if (products.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-emoji">🔍</div>
          <p>ga nemu apa-apa nih</p>
          <p style="font-size:0.85rem">coba ganti filter atau cari yang lain</p>
        </div>`;
      return;
    }

    grid.innerHTML = products.map(p => {
      const inList = findInList(p.id);
      const qty = inList ? inList.qty : 1;
      const fav = isFavorite(p.id);
      return `
        <article class="product-card" data-id="${p.id}">
          <button class="fav-btn ${fav ? 'active' : ''}" data-fav="${p.id}" aria-label="${fav ? 'Hapus dari favorit' : 'Tambah ke favorit'}">
            ${fav ? '♥' : '♡'}
          </button>
          <div class="product-emoji">${p.emoji || '📦'}</div>
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div class="product-meta">${escapeHtml(p.store || '')} · ${getCategory(p.category).emoji}</div>
          <div class="product-price">${formatRp(p.price)}</div>
          <div class="product-updated">update: ${p.lastUpdated || '-'}</div>
          <div class="product-actions">
            <div class="qty-control">
              <button class="qty-btn" data-qty-minus="${p.id}" aria-label="Kurangi">−</button>
              <span class="qty-value" data-qty-val="${p.id}">${qty}</span>
              <button class="qty-btn" data-qty-plus="${p.id}" aria-label="Tambah">+</button>
            </div>
            <button class="btn-add ${inList ? 'added' : ''}" data-add="${p.id}">
              ${inList ? '✓ di list' : 'ADD ♡'}
            </button>
          </div>
        </article>`;
    }).join('');

    // bind events
    grid.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.add;
        const product = state.products.find(p => p.id === id);
        if (!product) return;
        const qtyEl = grid.querySelector(`[data-qty-val="${id}"]`);
        const qty = parseInt(qtyEl?.textContent || '1', 10);
        addToList(product, qty);
        renderProducts();
      });
    });

    grid.querySelectorAll('[data-qty-plus]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.qtyPlus;
        const valEl = grid.querySelector(`[data-qty-val="${id}"]`);
        let v = parseInt(valEl.textContent, 10) + 1;
        valEl.textContent = v;
        const item = findInList(id);
        if (item) setQty(id, v);
      });
    });

    grid.querySelectorAll('[data-qty-minus]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.qtyMinus;
        const valEl = grid.querySelector(`[data-qty-val="${id}"]`);
        let v = Math.max(1, parseInt(valEl.textContent, 10) - 1);
        valEl.textContent = v;
        const item = findInList(id);
        if (item) setQty(id, v);
      });
    });

    grid.querySelectorAll('[data-fav]').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleFavorite(btn.dataset.fav);
        renderProducts();
        renderFavorites();
      });
    });
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function renderList() {
    const el = $('#list-content');
    const stats = $('#list-stats');
    if (!el) return;

    const total = getListTotal();
    const count = getListItemCount();
    const unique = state.list.length;

    if (stats) {
      stats.innerHTML = `<span>${unique} item (${count} pcs)</span> <span>•</span> <span>est. ${formatRp(total)}</span>`;
    }

    // budget
    updateBudgetUI(total);

    if (state.list.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-emoji">🧺</div>
          <p>your little basket is empty 🧺</p>
          <p style="font-size:0.85rem">go find something yummy hehe</p>
          <button class="btn btn-primary" style="margin-top:16px" data-nav="browse">BROWSE ITEMS</button>
        </div>`;
      el.querySelector('[data-nav]')?.addEventListener('click', () => navigate('browse'));
      $('#packing-progress').hidden = true;
      return;
    }

    // group by category
    const grouped = {};
    state.list.forEach(item => {
      const cat = item.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    const order = state.categories.map(c => c.id);
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    el.innerHTML = sortedKeys.map(catId => {
      const cat = getCategory(catId);
      const items = grouped[catId].slice().sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));
      return `
        <div class="list-category">
          <div class="list-cat-header">${cat.emoji} ${cat.name}</div>
          ${items.map(item => `
            <div class="list-item ${item.packed ? 'done' : ''} ${item.priority ? 'priority' : ''}" data-list-id="${item.id}">
              <button class="item-check ${item.packed ? 'checked' : ''}" data-pack="${item.id}" aria-label="Tandai selesai">
                ${item.packed ? '✓' : ''}
              </button>
              <div class="item-info">
                <div class="item-name">${item.priority ? '<span class="item-priority">⭐</span>' : ''}${item.emoji || ''} ${escapeHtml(item.name)} ×${item.qty}</div>
                <div class="item-detail">${item.fromShopee ? '🛍️ Shopee' : (item.freeWrite || item.custom) ? 'tulis sendiri · tanpa budget' : (item.price ? formatRp(item.price) + ' /pcs' : 'harga belum diisi')}${item.store && !item.freeWrite && !item.fromShopee ? ' · ' + escapeHtml(item.store) : ''}${item.fromShopee && item.price ? ' · ' + formatRp(item.price) : ''}</div>
                ${item.note ? `<div class="item-note">📝 ${escapeHtml(item.note)}</div>` : ''}
                ${item.shopeeLink ? `<div class="item-note"><a href="${escapeHtml(item.shopeeLink)}" target="_blank" rel="noopener" class="shopee-link">🔗 buka di Shopee</a></div>` : ''}
              </div>
              <div class="item-controls">
                <div class="qty-control">
                  <button class="qty-btn" data-list-minus="${item.id}">−</button>
                  <span class="qty-value">${item.qty}</span>
                  <button class="qty-btn" data-list-plus="${item.id}">+</button>
                </div>
                <button class="icon-btn" data-edit="${item.id}" aria-label="Edit" title="Edit">✏️</button>
                <button class="icon-btn" data-remove="${item.id}" aria-label="Hapus" title="Hapus">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>`;
    }).join('');

    // packing progress
    const packed = state.list.filter(i => i.packed).length;
    const prog = $('#packing-progress');
    const progText = $('#packing-text');
    const progFill = $('#packing-fill');
    if (prog && progText && progFill) {
      prog.hidden = false;
      const pct = Math.round((packed / state.list.length) * 100);
      progText.textContent = `${packed} / ${state.list.length} items ready ♡`;
      progFill.style.width = pct + '%';
      const ring = $('#packing-ring');
      const ringLabel = $('#packing-pct');
      if (ring) ring.setAttribute('stroke-dasharray', pct + ', 100');
      if (ringLabel) ringLabel.textContent = pct + '%';
    }

    // bind
    el.querySelectorAll('[data-pack]').forEach(btn => {
      btn.addEventListener('click', () => togglePacked(btn.dataset.pack));
    });
    el.querySelectorAll('[data-list-plus]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = findInList(btn.dataset.listPlus);
        if (item) setQty(item.id, item.qty + 1);
      });
    });
    el.querySelectorAll('[data-list-minus]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = findInList(btn.dataset.listMinus);
        if (item) {
          if (item.qty <= 1) removeFromList(item.id);
          else setQty(item.id, item.qty - 1);
        }
      });
    });
    el.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => removeFromList(btn.dataset.remove));
    });
    el.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.edit));
    });
  }

  function updateBudgetUI(total) {
    const budget = state.user.budget || 150000;
    const remaining = budget - total;
    const pct = Math.min(100, (total / budget) * 100);
    const hasCatalogPriced = getBudgetItemCount() > 0;
    const onlyFree = state.list.length > 0 && !hasCatalogPriced && total === 0;

    const fill = $('#budget-fill');
    const remEl = $('#budget-remaining');
    const usedEl = $('#budget-used');
    const totalEl = $('#budget-total');

    if (fill) {
      fill.style.width = onlyFree ? '0%' : pct + '%';
      fill.classList.toggle('over', !onlyFree && remaining < 0);
    }
    if (remEl) {
      if (onlyFree) {
        remEl.textContent = 'tulis sendiri · tanpa budget';
      } else {
        remEl.textContent = remaining < 0
          ? 'uh oh... budget kamu lewat 😭'
          : remaining < budget * 0.15
            ? 'hampir penuh 👀'
            : 'still safe ♡';
      }
    }
    if (usedEl) usedEl.textContent = formatRp(total);
    if (totalEl) totalEl.textContent = onlyFree ? '· free list' : '/ ' + formatRp(budget);

    // header budget
    const hb = $('#header-budget-text');
    if (hb) hb.textContent = formatRp(total);
  }

  function renderFavorites() {
    const el = $('#favorites-content');
    const addAllBtn = $('#btn-add-all-fav');
    if (!el) return;

    const favProducts = state.products.filter(p => state.favorites.includes(p.id));

    if (addAllBtn) {
      addAllBtn.hidden = favProducts.length === 0;
    }

    if (favProducts.length === 0) {
      el.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-emoji">⭐</div>
          <p>nothing saved yet ♡</p>
          <p style="font-size:0.85rem">tap ♡ di produk buat simpan usuals kamu</p>
        </div>`;
      return;
    }

    el.innerHTML = favProducts.map(p => {
      const inList = findInList(p.id);
      return `
        <article class="product-card" data-id="${p.id}">
          <button class="fav-btn active" data-fav="${p.id}">♥</button>
          <div class="product-emoji">${p.emoji || '📦'}</div>
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div class="product-meta">${escapeHtml(p.store || '')}</div>
          <div class="product-price">${formatRp(p.price)}</div>
          <div class="product-actions">
            <button class="btn-add ${inList ? 'added' : ''}" data-add="${p.id}" style="width:100%">
              ${inList ? '✓ di list' : 'ADD ♡'}
            </button>
          </div>
        </article>`;
    }).join('');

    el.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = state.products.find(p => p.id === btn.dataset.add);
        if (product) {
          addToList(product, 1);
          renderFavorites();
        }
      });
    });
    el.querySelectorAll('[data-fav]').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleFavorite(btn.dataset.fav);
        renderFavorites();
      });
    });
  }

  function updateNavBadge() {
    const badge = $('#nav-badge');
    const n = state.list.length;
    if (badge) {
      badge.hidden = n === 0;
      badge.textContent = n > 99 ? '99+' : n;
    }
  }

  function updateStickySummary() {
    const el = $('#sticky-summary');
    if (!el) return;
    const n = state.list.length;
    if (n === 0 || document.querySelector('.view.active')?.dataset.view === 'list') {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    $('#sticky-count').textContent = n + ' item';
    $('#sticky-total').textContent = formatRp(getListTotal());
  }

  function updateUI() {
    renderList();
    renderFavorites();
    updateNavBadge();
    updateStickySummary();
    updateCountdown();
    updateBagMeter();
    updateSmartSuggestions();
    updateJournalField();
    renderBadges();
    checkBadges();
    // restore mood UI
    if (state.mood) {
      $$('.mood-btn').forEach(b => b.classList.toggle('active', b.dataset.mood === state.mood));
    }
  }

  function updateBagMeter() {
    const fill = $('#bag-meter-fill');
    const text = $('#bag-meter-text');
    if (!fill || !text) return;
    const n = getListItemCount();
    // playful scale: 0 empty, 15+ full
    const pct = Math.min(100, Math.round((n / 15) * 100));
    fill.style.width = pct + '%';
    if (n === 0) text.textContent = 'kosong';
    else if (n <= 3) text.textContent = 'masih longgar~';
    else if (n <= 7) text.textContent = 'mulai penuh 👀';
    else if (n <= 12) text.textContent = 'berat nih 🧺';
    else text.textContent = 'OVERLOAD 😭';
  }

  function updateSmartSuggestions() {
    const box = $('#smart-box');
    const chips = $('#smart-chips');
    if (!box || !chips) return;
    const present = new Set(state.list.map(i => i.category));
    const tips = [
      { cat: 'toiletries', label: '🧴 toiletries', ids: ['shampoo', 'pasta-gigi', 'tissue'] },
      { cat: 'atk', label: '📚 ATK', ids: ['notebook', 'pens', 'eraser'] },
      { cat: 'jajanan', label: '🍪 jajanan', ids: ['basreng', 'makaroni'] },
      { cat: 'pondok', label: '🕌 pondok', ids: ['sarong', 'water-bottle'] },
      { cat: 'electronics', label: '🔌 charger', ids: ['charger', 'cable'] },
      { cat: 'personal', label: '💊 pribadi', ids: ['sanitary', 'hand-sanitizer'] }
    ];
    const missing = tips.filter(t => !present.has(t.cat));
    if (missing.length === 0 || state.list.length === 0) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    chips.innerHTML = missing.slice(0, 4).map(t =>
      `<button type="button" class="smart-chip" data-smart-cat="${t.cat}">${t.label}</button>`
    ).join('');
    chips.querySelectorAll('[data-smart-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tip = tips.find(t => t.cat === btn.dataset.smartCat);
        if (!tip) return;
        let added = 0;
        tip.ids.forEach(id => {
          const p = state.products.find(x => x.id === id);
          if (p && !findInList(id)) {
            addToListSilent(p, 1);
            added++;
          }
        });
        if (added) {
          persistList();
          toast('ditambahin beberapa item ' + tip.label);
        } else {
          // open browse filtered
          state.filters.category = tip.cat;
          navigate('browse');
          const sel = $('#filter-category');
          if (sel) sel.value = tip.cat;
          renderProducts();
        }
      });
    });
  }

  function updateJournalField() {
    const ta = $('#visit-journal');
    if (ta && document.activeElement !== ta) {
      ta.value = state.journal || '';
    }
  }

  function saveJournal() {
    state.journal = ($('#visit-journal')?.value || '').trim();
    save(KEYS.journal, state.journal);
    toast('catatan tersimpan ♡');
  }

  // ---------- COUNTDOWN ----------
  let countdownTimer = null;

  function updateCountdown() {
    const { visitDate, visitTime } = state.user;
    const homeVal = $('#home-countdown-value');
    const homeCard = $('#home-countdown');

    if (!visitDate) {
      if (homeVal) homeVal.textContent = 'set tanggal dulu ya';
      updateSettingsCountdown(null);
      return;
    }

    const time = visitTime || '00:00';
    const target = new Date(`${visitDate}T${time}:00`);
    const now = new Date();
    const diff = target - now;

    if (diff <= 0) {
      if (homeVal) homeVal.textContent = 'VISIT DAY IS HERE!!! 🥹♡';
      const banner = $('#hari-h-banner');
      if (banner) banner.hidden = false;
      updateSettingsCountdown({ days: 0, hours: 0, mins: 0, secs: 0 });
      return;
    }
    const banner = $('#hari-h-banner');
    if (banner) banner.hidden = true;

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    if (homeVal) {
      homeVal.textContent = days > 0
        ? `${days} day${days > 1 ? 's' : ''} left`
        : hours > 0
          ? `${hours}h ${mins}m left`
          : `${mins}m ${secs}s left`;
    }
    updateSettingsCountdown({ days, hours, mins, secs });
  }

  function updateSettingsCountdown(data) {
    const pad = n => String(n ?? 0).padStart(2, '0');
    const d = $('#cd-days'), h = $('#cd-hours'), m = $('#cd-mins'), s = $('#cd-secs');
    if (!d) return;
    if (!data) {
      d.textContent = h.textContent = m.textContent = s.textContent = '—';
      return;
    }
    d.textContent = pad(data.days);
    h.textContent = pad(data.hours);
    m.textContent = pad(data.mins);
    s.textContent = pad(data.secs);
  }

  function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    updateCountdown();
    countdownTimer = setInterval(updateCountdown, 1000);
  }

  // ---------- NAVIGATION ----------
  function navigate(view) {
    $$('.view').forEach(v => v.classList.remove('active'));
    const target = $(`#view-${view}`);
    if (target) target.classList.add('active');

    $$('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.nav === view);
    });

    // close search
    const sb = $('#search-bar');
    if (sb) sb.hidden = true;

    if (view === 'browse') {
      renderFilters();
      renderProducts();
    }
    if (view === 'list') renderList();
    if (view === 'favorites') renderFavorites();
    if (view === 'settings') populateSettings();
    if (view === 'home') renderHomeCategories();

    updateStickySummary();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- MODALS ----------
  function openModal(id) {
    const m = $(`#${id}`);
    if (m) m.hidden = false;
  }

  function closeModal(el) {
    const overlay = el.closest('.modal-overlay') || el;
    if (overlay) overlay.hidden = true;
  }

  function openEditModal(id) {
    const item = findInList(id);
    if (!item) return;
    state.currentEditId = id;
    clearFormErrors($('#modal-edit'));
    $('#edit-name').value = item.name || '';
    $('#edit-price').value = item.price || '';
    $('#edit-note').value = item.note || '';
    $('#edit-priority').checked = !!item.priority;
    // hide price field meaning for free-write — still show but note
    const priceEl = $('#edit-price');
    if (priceEl) {
      priceEl.disabled = !!(item.freeWrite || item.custom);
      priceEl.placeholder = (item.freeWrite || item.custom) ? 'tanpa budget' : '0';
    }
    openModal('modal-edit');
  }

  function saveEdit() {
    const item = findInList(state.currentEditId);
    if (!item) return;
    const modal = $('#modal-edit');
    clearFormErrors(modal);

    const nameEl = $('#edit-name');
    const priceEl = $('#edit-price');
    const noteEl = $('#edit-note');
    let ok = true;

    const name = sanitizeText(nameEl?.value, 80);
    if (!name) {
      setFieldError(nameEl, 'nama item nggak boleh kosong');
      ok = false;
    }

    const priceRaw = priceEl?.value;
    if (!isValidPrice(priceRaw, true)) {
      setFieldError(priceEl, 'harga harus angka ≥ 0');
      ok = false;
    }

    const note = sanitizeText(noteEl?.value, 120);
    if ((noteEl?.value || '').trim().length > 120) {
      setFieldError(noteEl, 'catatan max 120 karakter');
      ok = false;
    }

    if (!ok) {
      toast('cek form dulu ya');
      return;
    }

    item.name = name;
    // free-write items stay out of budget even if price filled
    if (item.freeWrite || item.custom) {
      item.price = 0;
    } else {
      const price = parseInt(priceRaw, 10);
      item.price = (!priceRaw || isNaN(price) || price < 0) ? 0 : price;
    }
    item.note = note;
    item.priority = !!$('#edit-priority')?.checked;
    persistList();
    closeModal(modal);
    toast('udah di-update ♡');
  }

  function setCustomTab(tab) {
    state.customTab = tab;
    $$('.custom-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    const bulk = $('#tab-bulk');
    const single = $('#tab-single');
    if (bulk) bulk.hidden = tab !== 'bulk';
    if (single) single.hidden = tab !== 'single';
  }

  function openCustomModal() {
    const opts = state.categories.map(c =>
      `<option value="${c.id}">${c.emoji} ${c.name}</option>`
    ).join('');
    const sel = $('#custom-category');
    const selBulk = $('#custom-bulk-category');
    if (sel) sel.innerHTML = '<option value="other">➕ bebas / other</option>' + opts;
    if (selBulk) selBulk.innerHTML = '<option value="other">➕ Other / bebas</option>' + opts;
    const modal = $('#modal-custom');
    clearFormErrors(modal);
    if ($('#custom-name')) $('#custom-name').value = '';
    if ($('#custom-store')) $('#custom-store').value = '';
    if ($('#custom-price')) $('#custom-price').value = '';
    if ($('#custom-qty')) $('#custom-qty').value = '1';
    if ($('#custom-note')) $('#custom-note').value = '';
    if ($('#custom-priority')) $('#custom-priority').checked = false;
    if ($('#custom-bulk')) $('#custom-bulk').value = '';
    setCustomTab('bulk');
    openModal('modal-custom');
  }

  function openShopeeModal() {
    const modal = $('#modal-shopee');
    clearFormErrors(modal);
    if ($('#shopee-link')) $('#shopee-link').value = '';
    if ($('#shopee-name')) $('#shopee-name').value = '';
    if ($('#shopee-qty')) $('#shopee-qty').value = '1';
    if ($('#shopee-price')) $('#shopee-price').value = '';
    if ($('#shopee-note')) $('#shopee-note').value = '';
    if ($('#shopee-priority')) $('#shopee-priority').checked = false;
    if ($('#shopee-category')) $('#shopee-category').value = 'shopee';
    openModal('modal-shopee');
  }

  /** Coba tebak nama produk dari URL Shopee (slug di path). */
  function parseShopeeNameFromUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let u = url.trim();
    try {
      // decode %20 dll
      u = decodeURIComponent(u);
    } catch (e) { /* ignore */ }

    // short link s.shopee.co.id — ga ada nama
    if (/s\.shopee\./i.test(u) && !/-i\.\d+/i.test(u)) return '';

    try {
      const parsed = new URL(u.startsWith('http') ? u : 'https://' + u);
      let path = parsed.pathname || '';
      // buang leading slash & trailing
      path = path.replace(/^\/+|\/+$/g, '');
      if (!path) return '';

      // format umum: Nama-Produk-i.shopid.itemid
      // atau Nama-Produk-i.123.456
      let slug = path;
      const iMatch = path.match(/^(.*)-i\.\d+/i);
      if (iMatch) slug = iMatch[1];
      else {
        // product/shopid/itemid → skip
        if (/^product\//i.test(path) || /^\d+\//.test(path)) return '';
        // ambil segmen terakhir
        const parts = path.split('/').filter(Boolean);
        slug = parts[parts.length - 1] || '';
        // buang -i.xxx kalau masih nempel
        slug = slug.replace(/-i\.\d+.*$/i, '');
      }

      if (!slug || slug.length < 3) return '';

      // ganti - dan _ jadi spasi, rapikan
      let name = slug
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // title-case sederhana (biar rapi)
      name = name.replace(/\b\w/g, c => c.toUpperCase());

      // batasi panjang
      if (name.length > 80) name = name.slice(0, 77) + '…';
      return name;
    } catch (e) {
      return '';
    }
  }

  function tryFillShopeeNameFromLink() {
    const linkEl = $('#shopee-link');
    const nameEl = $('#shopee-name');
    if (!linkEl || !nameEl) return;
    const link = (linkEl.value || '').trim();
    if (!link) return;
    // jangan overwrite kalau user udah isi manual
    if ((nameEl.value || '').trim()) return;
    const guessed = parseShopeeNameFromUrl(link);
    if (guessed) {
      nameEl.value = guessed;
      nameEl.dataset.autoFilled = '1';
      toast('nama diisi dari link ✨ (boleh diedit)');
    }
  }

  function saveShopee() {
    const modal = $('#modal-shopee');
    clearFormErrors(modal);

    const linkEl = $('#shopee-link');
    const nameEl = $('#shopee-name');
    const qtyEl = $('#shopee-qty');
    const priceEl = $('#shopee-price');
    const noteEl = $('#shopee-note');
    let ok = true;

    const link = (linkEl?.value || '').trim();
    if (link && !/^https?:\/\/(www\.)?(shopee\.|s\.shopee\.)/i.test(link) && !/^https?:\/\//i.test(link)) {
      setFieldError(linkEl, 'link harus valid (boleh link Shopee atau URL lain)');
      ok = false;
    }

    let name = sanitizeText(nameEl?.value, 100);
    // fallback: tebak dari link kalau nama kosong
    if (!name && link) {
      name = sanitizeText(parseShopeeNameFromUrl(link), 100);
      if (name && nameEl) nameEl.value = name;
    }
    if (!name) {
      setFieldError(nameEl, 'nama barang wajib diisi (atau pakai link Shopee yang ada slug-nya)');
      ok = false;
    }

    const qtyRaw = qtyEl?.value;
    if (!isValidQty(qtyRaw)) {
      setFieldError(qtyEl, 'jumlah harus 1–999');
      ok = false;
    }

    const priceRaw = priceEl?.value;
    if (priceRaw && !isValidPrice(priceRaw, true)) {
      setFieldError(priceEl, 'harga harus angka ≥ 0');
      ok = false;
    }

    const note = sanitizeText(noteEl?.value, 150);
    if ((noteEl?.value || '').length > 150) {
      setFieldError(noteEl, 'catatan max 150 karakter');
      ok = false;
    }

    if (!ok) {
      toast('cek form dulu ya');
      return;
    }

    const qty = Math.min(999, Math.max(1, parseInt(qtyRaw, 10) || 1));
    const price = priceRaw ? (parseInt(priceRaw, 10) || 0) : 0;
    const cat = $('#shopee-category')?.value || 'shopee';

    const product = {
      id: uid(),
      name,
      category: cat,
      store: 'Shopee',
      price,
      lastUpdated: new Date().toISOString().slice(0, 10),
      emoji: '🛍️',
      custom: true,
      freeWrite: false,
      fromShopee: true,
      shopeeLink: link || '',
      note,
      priority: !!$('#shopee-priority')?.checked
    };

    addToListSilent(product, qty);
    const listItem = findInList(product.id);
    if (listItem) {
      listItem.priority = product.priority;
      listItem.note = product.note;
      listItem.shopeeLink = product.shopeeLink;
      listItem.fromShopee = true;
      listItem.custom = true;
      listItem.freeWrite = false;
      listItem.price = price;
    }
    persistList();
    closeModal(modal);
    toast('titipan Shopee masuk list! 🛍️♡');
    navigate('list');
  }

  function parseBulkLine(line) {
    const cleaned = String(line || '').trim();
    if (!cleaned) return null;
    let qty = 1;
    let name = cleaned;
    const m = cleaned.match(/^(.*?)(?:\s*[x×]\s*|\s+)(\d+)\s*$/i);
    if (m && m[1].trim()) {
      name = m[1].trim();
      qty = parseInt(m[2], 10) || 1;
    }
    name = sanitizeText(name, 80);
    if (!name) return null;
    if (!isValidQty(qty)) qty = 1;
    if (qty > 999) qty = 999;
    return { name, qty };
  }

  function saveCustom() {
    const modal = $('#modal-custom');
    clearFormErrors(modal);

    if (state.customTab === 'bulk') {
      const bulkEl = $('#custom-bulk');
      const raw = (bulkEl?.value || '').trim();
      if (!raw) {
        setFieldError(bulkEl, 'tulis minimal 1 baris dulu ya');
        toast('form masih kosong');
        return;
      }
      if (raw.length > 5000) {
        setFieldError(bulkEl, 'kebanyakan — max sekitar 5000 karakter');
        toast('teksnya kepanjangan');
        return;
      }
      const cat = $('#custom-bulk-category')?.value || 'other';
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length > 200) {
        setFieldError(bulkEl, 'max 200 baris sekali input ya');
        toast('kebanyakan baris — bagi jadi beberapa kali');
        return;
      }
      let added = 0;
      lines.forEach(line => {
        const parsed = parseBulkLine(line);
        if (!parsed || !parsed.name) return;
        const product = {
          id: uid(),
          name: parsed.name,
          category: cat,
          store: '',
          price: 0,
          lastUpdated: new Date().toISOString().slice(0, 10),
          emoji: '✏️',
          custom: true,
          freeWrite: true,
          note: '',
          priority: false
        };
        addToListSilent(product, parsed.qty);
        added++;
      });
      if (!added) {
        setFieldError(bulkEl, 'ga ada baris yang valid');
        toast('ga ada item yang valid');
        return;
      }
      persistList();
      closeModal(modal);
      toast(added + ' item masuk list (tanpa budget) ♡');
      navigate('list');
      return;
    }

    // single free-write
    const nameEl = $('#custom-name');
    const qtyEl = $('#custom-qty');
    const noteEl = $('#custom-note');
    const storeEl = $('#custom-store');
    let ok = true;

    const name = sanitizeText(nameEl?.value, 80);
    if (!name) {
      setFieldError(nameEl, 'nama item wajib diisi');
      ok = false;
    } else if (name.length < 1) {
      setFieldError(nameEl, 'nama terlalu pendek');
      ok = false;
    }

    const qtyRaw = qtyEl?.value;
    if (!isValidQty(qtyRaw)) {
      setFieldError(qtyEl, 'jumlah harus 1–999');
      ok = false;
    }

    const note = sanitizeText(noteEl?.value, 120);
    if ((noteEl?.value || '').length > 120) {
      setFieldError(noteEl, 'catatan max 120 karakter');
      ok = false;
    }

    const store = sanitizeText(storeEl?.value, 40);

    if (!ok) {
      toast('cek form dulu ya');
      return;
    }

    const qty = Math.min(999, Math.max(1, parseInt(qtyRaw, 10) || 1));
    const product = {
      id: uid(),
      name,
      category: $('#custom-category')?.value || 'other',
      store,
      price: 0,
      lastUpdated: new Date().toISOString().slice(0, 10),
      emoji: '✏️',
      custom: true,
      freeWrite: true,
      note,
      priority: !!$('#custom-priority')?.checked
    };

    addToListSilent(product, qty);
    const listItem = findInList(product.id);
    if (listItem) {
      listItem.priority = product.priority;
      listItem.note = product.note;
      listItem.freeWrite = true;
      listItem.custom = true;
    }
    persistList();
    closeModal(modal);
    toast('masuk list (tanpa budget) ♡');
  }

  function addToListSilent(product, qty = 1) {
    const existing = findInList(product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      const entry = {
        id: product.id,
        name: product.name,
        category: product.category,
        store: product.store || '',
        price: product.price || 0,
        qty: qty,
        note: product.note || '',
        packed: false,
        custom: !!product.custom,
        freeWrite: !!product.freeWrite || !!product.custom,
        emoji: product.emoji || '📦',
        priority: !!product.priority
      };
      if (product.shopeeLink) entry.shopeeLink = product.shopeeLink;
      if (product.fromShopee) entry.fromShopee = true;
      state.list.push(entry);
    }
  }

  // ---------- SHARE ----------
  function formatItemsPlain(items) {
    return items.map(item => {
      let line = `• ${item.name} ×${item.qty}`;
      if (item.note) line += ` (${item.note})`;
      if (item.shopeeLink) line += `\n  🔗 ${item.shopeeLink}`;
      return line;
    }).join('\n');
  }

  function buildShareText(tpl) {
    tpl = tpl || state.shareTemplate || 'default';
    const name = state.user.name || 'aku';
    const closer = state.user.mamaNote || 'makasii Mamaa 🥹🤍';
    const priority = state.list.filter(i => i.priority);
    const normal = state.list.filter(i => !i.priority);
    const total = getListTotal();

    if (tpl === 'short') {
      let text = `Ma titipan ${name}:\n`;
      state.list.forEach((item, idx) => {
        text += `${idx + 1}. ${item.name}`;
        if (item.qty > 1) text += ` ×${item.qty}`;
        text += `\n`;
      });
      text += `Makasii 🤍`;
      return text;
    }

    if (tpl === 'priority') {
      let text = `Hi Mamaa ♡\ntitipan ${name} — yang penting dulu ya:\n\n`;
      if (priority.length) {
        text += `⭐ WAJIB\n${formatItemsPlain(priority)}\n\n`;
      }
      if (normal.length) {
        text += `Lainnya (kalau sempat):\n${formatItemsPlain(normal)}\n\n`;
      }
      text += `${closer}`;
      return text;
    }

    if (tpl === 'budget') {
      let text = `Hi Mamaa ♡\nini titipan ${name} yaa (budget ±${formatRp(state.user.budget || 150000)}):\n\n`;
      if (priority.length) {
        text += `⭐ Prioritas\n${formatItemsPlain(priority)}\n\n`;
      }
      text += formatItemsPlain(normal) + '\n\n';
      if (total > 0) text += `Estimasi: ${formatRp(total)}\n`;
      text += `Kalau lebih, ambil yang prioritas aja ya Ma\n${closer}`;
      return text;
    }

    if (tpl === 'polite') {
      let text = `Assalamu'alaikum Ma,\nizin titip beberapa barang untuk penjengukan:\n\n`;
      state.list.forEach(item => {
        text += `• ${item.name}`;
        if (item.qty > 1) text += ` (${item.qty})`;
        if (item.note) text += ` — ${item.note}`;
        text += `\n`;
      });
      if (total > 0) text += `\nPerkiraan total sekitar ${formatRp(total)}.\n`;
      text += `\nTerima kasih banyak, Ma.\nWassalamu'alaikum.`;
      return text;
    }

    // default lengkap
    let text = `🧺 TITIPAN PENJENGUKAN\n\n`;
    text += `hi Mamaa ♡\nini titipan ${name} yaa:\n\n`;
    if (priority.length) {
      text += `⭐ PRIORITAS\n${formatItemsPlain(priority)}\n\n`;
    }
    const grouped = {};
    normal.forEach(item => {
      const cat = item.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    Object.keys(grouped).forEach(catId => {
      const cat = getCategory(catId);
      text += `${cat.emoji} ${cat.name}\n`;
      text += formatItemsPlain(grouped[catId]) + '\n\n';
    });
    if (total > 0) {
      text += `Estimasi total: ${formatRp(total)}\n(harga bisa beda ya Ma)\n\n`;
    }
    text += `${closer}\n\n— via Titip Dulu ♡`;
    return text;
  }

  function normalizeWa(num) {
    if (!num) return '';
    let n = String(num).replace(/\D/g, '');
    if (n.startsWith('0')) n = '62' + n.slice(1);
    if (n.startsWith('8') && n.length >= 9) n = '62' + n;
    return n;
  }

  function refreshSharePreview() {
    const el = $('#share-text');
    if (el) el.textContent = buildShareText(state.shareTemplate);
  }

  function openShareModal() {
    if (state.list.length === 0) {
      toast('list masih kosong nih');
      return;
    }
    state.shareTemplate = 'default';
    $$('.tpl-chip').forEach(c => c.classList.toggle('active', c.dataset.tpl === 'default'));
    refreshSharePreview();
    const webShareBtn = $('#btn-web-share');
    if (webShareBtn) webShareBtn.hidden = !navigator.share;

    const wa = normalizeWa(state.user.mamaWa);
    const hint = $('#share-mama-hint');
    if (wa) {
      if (hint) hint.textContent = 'no WA Mama: +' + wa;
    } else {
      if (hint) hint.textContent = 'isi no WA Mama di Settings biar bisa kirim langsung';
    }

    const igBtn = $('#btn-ig-open');
    if (igBtn) {
      const ig = (state.user.mamaIg || '').replace(/^@/, '').trim();
      igBtn.hidden = !ig;
    }

    openModal('modal-share');
  }

  function openHistoryModal() {
    const el = $('#history-list');
    if (!el) return;
    if (!state.history.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-emoji">🕐</div><p>belum ada riwayat</p><p style="font-size:0.85rem">riwayat tersimpan otomatis saat list berubah</p></div>`;
    } else {
      el.innerHTML = state.history.map((h, idx) => `
        <div class="history-item">
          <div class="history-item-title">${escapeHtml(h.title || 'Titipan')}</div>
          <div class="history-item-meta">${h.date || ''} · ${h.items?.length || 0} item · est. ${formatRp(h.total || 0)}</div>
          <button class="btn btn-sm btn-primary" data-restore-history="${idx}">pakai list ini</button>
        </div>
      `).join('');
      el.querySelectorAll('[data-restore-history]').forEach(btn => {
        btn.addEventListener('click', () => {
          const h = state.history[parseInt(btn.dataset.restoreHistory, 10)];
          if (!h || !h.items) return;
          state.list = h.items.map(i => ({ ...i, packed: false }));
          persistList();
          closeModal($('#modal-history'));
          navigate('list');
          toast('list dari riwayat dipasang ♡');
        });
      });
    }
    openModal('modal-history');
  }

  function sendWhatsApp() {
    const wa = normalizeWa(state.user.mamaWa);
    if (!wa) {
      toast('isi no WA Mama di Settings dulu ya');
      navigate('settings');
      closeModal($('#modal-share'));
      return;
    }
    const text = buildShareText();
    const url = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
    toast('membuka WhatsApp... 💬');
    unlockBadge('shared');
  }

  function openMamaIG() {
    const ig = (state.user.mamaIg || '').replace(/^@/, '').trim();
    if (!ig) {
      toast('isi IG Mama di Settings dulu');
      return;
    }
    window.open('https://instagram.com/' + ig, '_blank');
  }

  async function copyShareText() {
    const text = buildShareText();
    try {
      await navigator.clipboard.writeText(text);
      toast('udah di-copy! 💌 tinggal paste ke Mama');
      unlockBadge('shared');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('udah di-copy! 💌');
      unlockBadge('shared');
    }
  }

  async function webShare() {
    const text = buildShareText();
    try {
      await navigator.share({
        title: 'Titipan Penjengukan',
        text
      });
    } catch (e) {
      if (e.name !== 'AbortError') toast('share gagal, coba copy aja');
    }
  }

  // ---------- CHECK LIST ----------
  function checkList() {
    const present = new Set(state.list.map(i => i.category));
    const important = [
      { id: 'toiletries', msg: 'wait... did you check your toiletries? 🧴' },
      { id: 'atk', msg: 'how about stationery? 📚' },
      { id: 'jajanan', msg: 'do you still need snacks? 🍪' },
      { id: 'pondok', msg: 'maybe check your pondok essentials? 🕌' },
      { id: 'personal', msg: 'keperluan pribadi udah masuk belum? 💊' },
      { id: 'electronics', msg: 'charger / kabel masih aman? 🔌' }
    ];

    const results = important.map(item => {
      const ok = present.has(item.id);
      return { ok, msg: item.msg };
    });

    const el = $('#check-results');
    el.innerHTML = results.map(r =>
      `<div class="check-item ${r.ok ? 'ok' : 'warn'}">${r.ok ? '✓' : '○'} ${r.msg}</div>`
    ).join('') +
      `<p style="margin-top:12px;font-size:0.85rem;color:var(--text-soft)">Ini cuma reminder ya, bukan wajib ♡</p>`;

    openModal('modal-check');
  }

  // ---------- SURPRISE ----------
  function doSurprise(count) {
    const pool = state.products.filter(p => p.category !== 'other');
    if (pool.length === 0) {
      toast('ga ada produk nih');
      return;
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, Math.min(count, shuffled.length));

    const results = $('#surprise-results');
    results.hidden = false;
    results.innerHTML = picks.map(p => `
      <div class="surprise-item">
        <div>
          <strong>${p.emoji || ''} ${escapeHtml(p.name)}</strong>
          <div style="font-size:0.8rem;color:var(--text-soft)">${formatRp(p.price)}</div>
        </div>
        <button class="btn btn-sm btn-primary" data-surprise-add="${p.id}">add ♡</button>
      </div>
    `).join('');

    results.querySelectorAll('[data-surprise-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = state.products.find(p => p.id === btn.dataset.surpriseAdd);
        if (product) {
          addToList(product, 1);
          btn.textContent = '✓';
          btn.disabled = true;
        }
      });
    });
  }

  // ---------- REPEAT LAST ----------
  function saveAsPrevious() {
    if (state.list.length > 0) {
      state.previousList = JSON.parse(JSON.stringify(state.list));
      save(KEYS.previous, state.previousList);
      // also push to history (max 5)
      const entry = {
        title: (state.user.name ? state.user.name + ' — ' : '') + 'titipan',
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        total: getListTotal(),
        items: JSON.parse(JSON.stringify(state.list))
      };
      state.history = [entry, ...state.history.filter(h => JSON.stringify(h.items) !== JSON.stringify(entry.items))].slice(0, 5);
      save(KEYS.history, state.history);
    }
  }

  function repeatLast() {
    if (!state.previousList || state.previousList.length === 0) {
      toast('belum ada list sebelumnya');
      return;
    }
    // reset packed status
    state.list = state.previousList.map(i => ({ ...i, packed: false }));
    persistList();
    toast('list sebelumnya diulang! edit kalau perlu ya');
    navigate('list');
  }

  // ---------- SETTINGS ----------
  function populateSettings() {
    $('#setting-name').value = state.user.name || '';
    $('#setting-visit-date').value = state.user.visitDate || '';
    $('#setting-visit-time').value = state.user.visitTime || '';
    if ($('#setting-mama-wa')) $('#setting-mama-wa').value = state.user.mamaWa || '';
    if ($('#setting-mama-ig')) $('#setting-mama-ig').value = state.user.mamaIg || '';
    if ($('#setting-mama-note')) $('#setting-mama-note').value = state.user.mamaNote || 'makasii Mamaa 🥹🤍';
  }

  function saveSettings() {
    const root = $('#view-settings');
    clearFormErrors(root);

    const nameEl = $('#setting-name');
    const dateEl = $('#setting-visit-date');
    const timeEl = $('#setting-visit-time');
    const waEl = $('#setting-mama-wa');
    const igEl = $('#setting-mama-ig');
    const noteEl = $('#setting-mama-note');
    let ok = true;

    const name = sanitizeText(nameEl?.value, 40);
    if (nameEl && (nameEl.value || '').trim().length > 40) {
      setFieldError(nameEl, 'nama max 40 karakter');
      ok = false;
    }

    const visitDate = (dateEl?.value || '').trim();
    if (visitDate && !isValidDateStr(visitDate)) {
      setFieldError(dateEl, 'tanggal nggak valid');
      ok = false;
    }

    const visitTime = (timeEl?.value || '').trim();
    if (visitTime && !isValidTimeStr(visitTime)) {
      setFieldError(timeEl, 'format waktu HH:MM');
      ok = false;
    }

    const mamaWa = (waEl?.value || '').trim();
    if (!isValidWa(mamaWa)) {
      setFieldError(waEl, 'no WA kurang valid (contoh: 08xxxxxxxxxx)');
      ok = false;
    }

    let mamaIg = (igEl?.value || '').trim();
    if (mamaIg && !isValidIg(mamaIg)) {
      setFieldError(igEl, 'username IG cuma huruf/angka/._ (max 30)');
      ok = false;
    }
    if (mamaIg) mamaIg = mamaIg.replace(/^@/, '');

    const mamaNote = sanitizeText(noteEl?.value, 80) || 'makasii Mamaa 🥹🤍';
    if ((noteEl?.value || '').trim().length > 80) {
      setFieldError(noteEl, 'pesan max 80 karakter');
      ok = false;
    }

    if (!ok) {
      toast('cek input settings dulu ya');
      return;
    }

    state.user.name = name;
    state.user.visitDate = visitDate;
    state.user.visitTime = visitTime;
    state.user.mamaWa = mamaWa;
    state.user.mamaIg = mamaIg;
    state.user.mamaNote = mamaNote;
    persistUser();
    updateCountdown();
    toast('settings tersimpan ♡');
  }

  function editBudget() {
    const current = state.user.budget || 150000;
    const input = prompt('Budget kamu berapa? (Rp)', String(current));
    if (input === null) return;
    const cleaned = String(input).replace(/[^\d]/g, '');
    if (!cleaned) {
      toast('budget harus diisi angka');
      return;
    }
    const val = parseInt(cleaned, 10);
    if (isNaN(val) || val < 0) {
      toast('angka budget nggak valid');
      return;
    }
    if (val > 100000000) {
      toast('budget terlalu besar (max 100 juta)');
      return;
    }
    state.user.budget = val;
    persistUser();
    updateBudgetUI(getListTotal());
    toast('budget diubah ♡');
  }

  function resetAllData() {
    if (!confirm('Yakin mau hapus semua data? List, favorit, settings — semuanya hilang.')) return;
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    state.list = [];
    state.favorites = [];
    state.previousList = null;
    state.user = { name: '', visitDate: '', visitTime: '', budget: 150000, mamaWa: '', mamaIg: '', mamaNote: 'makasii Mamaa 🥹🤍' };
    // reload products without customs
    loadData().then(() => {
      updateUI();
      populateSettings();
      toast('semua data di-reset');
    });
  }

  // ---------- CONFETTI ----------
  function spawnConfetti() {
    const container = $('#confetti-container');
    if (!container) return;
    const colors = ['#F4C7CE', '#D98C9A', '#BFDFF2', '#D4AF37', '#FFF8F2'];
    for (let i = 0; i < 40; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 0.5 + 's';
      piece.style.animationDuration = 2 + Math.random() * 1.5 + 's';
      container.appendChild(piece);
      setTimeout(() => piece.remove(), 4000);
    }
  }

  // ---------- EVENT BINDINGS ----------
  function bindEvents() {
    // nav
    document.addEventListener('click', e => {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        e.preventDefault();
        navigate(nav.dataset.nav);
        // close modals if open
        $$('.modal-overlay').forEach(m => m.hidden = true);
      }

      const closeBtn = e.target.closest('.modal-close');
      if (closeBtn) closeModal(closeBtn);
    });

    // search toggle
    $('#btn-search-toggle')?.addEventListener('click', () => {
      const sb = $('#search-bar');
      sb.hidden = !sb.hidden;
      if (!sb.hidden) {
        $('#search-input').focus();
        navigate('browse');
      }
    });
    $('#search-close')?.addEventListener('click', () => {
      $('#search-bar').hidden = true;
      state.filters.search = '';
      $('#search-input').value = '';
      renderProducts();
    });
    $('#search-input')?.addEventListener('input', e => {
      state.filters.search = e.target.value.trim();
      renderProducts();
    });

    // filters
    $('#filter-category')?.addEventListener('change', e => {
      state.filters.category = e.target.value;
      renderProducts();
    });
    $('#filter-store')?.addEventListener('change', e => {
      state.filters.store = e.target.value;
      renderProducts();
    });

    // list actions
    $('#btn-add-custom')?.addEventListener('click', openCustomModal);
    $('#btn-home-custom')?.addEventListener('click', openCustomModal);
    $('#btn-home-custom-cta')?.addEventListener('click', openCustomModal);
    $('#btn-home-shopee')?.addEventListener('click', openShopeeModal);
    $('#btn-home-shopee-cta')?.addEventListener('click', openShopeeModal);
    $('#btn-save-shopee')?.addEventListener('click', saveShopee);

    // auto-isi nama dari link Shopee (paste / blur)
    const shopeeLinkEl = $('#shopee-link');
    if (shopeeLinkEl) {
      shopeeLinkEl.addEventListener('paste', () => {
        setTimeout(tryFillShopeeNameFromLink, 50);
      });
      shopeeLinkEl.addEventListener('blur', tryFillShopeeNameFromLink);
      shopeeLinkEl.addEventListener('change', tryFillShopeeNameFromLink);
    }
    // kalau user edit nama manual, jangan auto-overwrite lagi di session yang sama
    $('#shopee-name')?.addEventListener('input', () => {
      const el = $('#shopee-name');
      if (el) delete el.dataset.autoFilled;
    });
    $('#btn-history')?.addEventListener('click', openHistoryModal);
    $('#btn-home-templates')?.addEventListener('click', () => {
      if (state.list.length === 0) {
        toast('isi list dulu biar bisa pilih template');
        navigate('list');
        return;
      }
      openShareModal();
    });
    $('#btn-save-journal')?.addEventListener('click', saveJournal);

    // template chips
    document.addEventListener('click', e => {
      const chip = e.target.closest('.tpl-chip');
      if (chip && chip.dataset.tpl) {
        state.shareTemplate = chip.dataset.tpl;
        $$('.tpl-chip').forEach(c => c.classList.toggle('active', c === chip));
        refreshSharePreview();
      }
    });
    $('#btn-check-list')?.addEventListener('click', checkList);
    $('#btn-share')?.addEventListener('click', openShareModal);
    $('#btn-save-custom')?.addEventListener('click', saveCustom);
    $('#btn-save-edit')?.addEventListener('click', saveEdit);
    $('#btn-copy-list')?.addEventListener('click', copyShareText);
    $('#btn-web-share')?.addEventListener('click', webShare);
    $('#btn-wa-send')?.addEventListener('click', sendWhatsApp);
    $('#btn-ig-open')?.addEventListener('click', openMamaIG);

    // custom tabs
    document.addEventListener('click', e => {
      const tab = e.target.closest('.custom-tab');
      if (tab && tab.dataset.tab) setCustomTab(tab.dataset.tab);
    });

    // favorites
    $('#btn-add-all-fav')?.addEventListener('click', () => {
      state.favorites.forEach(id => {
        const p = state.products.find(x => x.id === id);
        if (p && !findInList(id)) addToList(p, 1);
      });
      toast('semua usuals masuk list! ♡');
      navigate('list');
    });

    // surprise
    $('#btn-surprise')?.addEventListener('click', () => {
      $('#surprise-results').hidden = true;
      openModal('modal-surprise');
    });
    $$('[data-surprise]').forEach(btn => {
      btn.addEventListener('click', () => doSurprise(parseInt(btn.dataset.surprise, 10)));
    });

    // repeat
    $('#btn-repeat-last')?.addEventListener('click', repeatLast);

    // home
    $('#btn-what-to-bring')?.addEventListener('click', () => openModal('modal-tips'));
    $('#btn-set-visit-home')?.addEventListener('click', () => navigate('settings'));

    // settings
    $('#btn-save-settings')?.addEventListener('click', saveSettings);
    $('#btn-theme-toggle')?.addEventListener('click', () => {
      toggleTheme();
      if (state.theme === 'night') unlockBadge('night');
    });

    // mood picker
    document.addEventListener('click', e => {
      const moodBtn = e.target.closest('.mood-btn');
      if (moodBtn && moodBtn.dataset.mood) setMood(moodBtn.dataset.mood);
    });

    // clear field error while typing
    document.addEventListener('input', e => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) {
        if (t.classList.contains('input-error')) clearFieldError(t);
      }
    });
    $('#btn-reset-data')?.addEventListener('click', resetAllData);

    // budget edit (from list page)
    $('#btn-edit-budget')?.addEventListener('click', editBudget);

    // header budget click
    $('#header-budget')?.addEventListener('click', () => navigate('list'));

    // close modal on overlay click
    $$('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.hidden = true;
      });
    });

    // save previous list when leaving (visibility change)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveAsPrevious();
    });
  }

  // ---------- INIT ----------
  async function init() {
    loadUserData();
    await loadData();
    bindEvents();
    renderHomeCategories();
    renderFilters();
    updateUI();
    startCountdown();
    navigate('home');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
