/**
 * PPS Article System — v2.3
 *
 * PENYIMPANAN DATA:
 * - View counter  → localStorage key: "pps_article_views"
 *                   Format: { "article-id-1": 5, "article-id-2": 12, ... }
 *                   Bertahan di browser selama tidak clear storage.
 *
 * FIX v2.3:
 * - Related articles sekarang SELALU muncul (maks 3 artikel).
 *   Prioritas 1: artikel bertopik sama.
 *   Prioritas 2 (fallback): artikel topik lain jika topik sama kurang dari 3.
 *   Section "Baca Juga" tidak pernah kosong selama ada ≥ 2 artikel.
 */

'use strict';

// ─────────────────────────────────
// UTILITY
// ─────────────────────────────────

function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function throttle(fn, limit) {
    let inThrottle = false;
    return (...args) => {
        if (!inThrottle) { fn(...args); inThrottle = true; setTimeout(() => (inThrottle = false), limit); }
    };
}

function getParam(name) {
    return new URLSearchParams(location.search).get(name);
}

function fmtDate(iso) {
    try {
        return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric',
        });
    } catch { return iso || ''; }
}

function readingTime(content) {
    if (!content) return '1';
    const words = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    return String(Math.max(1, Math.round(words / 200)));
}

function wordCount(content) {
    if (!content) return 0;
    return content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
}

function initials(name) {
    if (!name) return 'PPS';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─────────────────────────────────
// VIEW COUNTER
// Disimpan di localStorage: key "pps_article_views"
// Format: { "id": jumlah_view, ... }
// Lihat: DevTools → Application → Local Storage → pps_article_views
// ─────────────────────────────────

const VIEWS_KEY = 'pps_article_views';

function getViews() {
    try { return JSON.parse(localStorage.getItem(VIEWS_KEY)) || {}; } catch { return {}; }
}

function incrementView(id) {
    const views = getViews();
    views[id] = (views[id] || 0) + 1;
    try { localStorage.setItem(VIEWS_KEY, JSON.stringify(views)); } catch { /* storage full */ }
    return views[id];
}

function getView(id) {
    return getViews()[id] || 0;
}

// ─────────────────────────────────
// ACCESSIBILITY
// ─────────────────────────────────

function announce(msg) {
    const el = Object.assign(document.createElement('div'), { role: 'status', textContent: msg });
    Object.assign(el.style, { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

// ─────────────────────────────────
// BACK TO TOP
// ─────────────────────────────────

function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    let visible = false;
    window.addEventListener('scroll', throttle(() => {
        const show = window.scrollY > 300;
        if (show === visible) return;
        visible = show;
        btn.style.display = show ? 'grid' : 'none';
    }, 100), { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ─────────────────────────────────
// LAZY LOADING
// ─────────────────────────────────

function initLazyLoading() {
    const imgs = document.querySelectorAll('img[data-src]');
    if (!imgs.length) return;
    if (!('IntersectionObserver' in window)) {
        imgs.forEach(img => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
        return;
    }
    const obs = new IntersectionObserver((entries, o) => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const img = e.target;
            if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
            o.unobserve(img);
        });
    }, { rootMargin: '60px' });
    imgs.forEach(img => obs.observe(img));
}

// ─────────────────────────────────
// TOAST
// ─────────────────────────────────

function showToast(msg, type = 'info', duration = 3000) {
    document.querySelector('.toast')?.remove();
    const toast = Object.assign(document.createElement('div'), {
        className: `toast toast-${type}`, textContent: msg,
    });
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('is-visible')));
    setTimeout(() => {
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

window.showToast = showToast;

// ─────────────────────────────────
// DATA LOADING
// ─────────────────────────────────

async function loadArticles() {
    const paths = [
        '/data/articles.json',
        '/articles.json',
        '/assets/data/articles.json',
        '/data/articles.txt',
        '/articles.txt',
    ];
    for (const p of paths) {
        try {
            const r = await fetch(p, { cache: 'no-store' });
            if (!r.ok) continue;
            const d = await r.json();
            if (Array.isArray(d) && d.length > 0) {
                console.log(`✅ PPS: ${d.length} artikel dimuat dari ${p}`);
                return d;
            }
        } catch { /* coba path berikutnya */ }
    }
    throw new Error('articles.json belum tersedia — static cards tetap ditampilkan.');
}

// ─────────────────────────────────
// CARD HTML (list view)
// ─────────────────────────────────

function cardHTML(a) {
    const views = getView(a.id);
    const thumb = a.cover
        ? `<img data-src="${a.cover}" src="" alt="Cover ${a.title}" loading="lazy">`
        : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1a1a,#222);display:grid;place-items:center;">
               <i class="fa-solid fa-atom" style="font-size:40px;color:rgba(255,153,0,.3);"></i>
           </div>`;

    const viewsMeta = views > 0
        ? `<span>•</span>
           <span><i class="fa-regular fa-eye" style="margin-right:4px;color:var(--orange);opacity:.7;"></i>${views}</span>`
        : '';

    return `
        <a class="card"
           href="/article/index.html?id=${encodeURIComponent(a.id)}"
           data-topic="${a.topic || ''}"
           data-title="${(a.title || '').toLowerCase()}">
            <div class="card-thumb">${thumb}</div>
            <div class="card-body">
                <div class="card-topic"><span class="dot"></span> ${a.topic || 'Fisika'}</div>
                <div class="card-title">${a.title || ''}</div>
                <p class="card-excerpt">${a.excerpt || ''}</p>
                <div class="card-meta">
                    <span><i class="fa-regular fa-calendar" style="margin-right:4px;color:var(--orange);opacity:.7;"></i>${fmtDate(a.date)}</span>
                    <span>•</span>
                    <span><i class="fa-regular fa-user" style="margin-right:4px;color:var(--orange);opacity:.7;"></i>${a.author || 'PPS'}</span>
                    ${viewsMeta}
                </div>
            </div>
        </a>`;
}

// ─────────────────────────────────
// RELATED ARTICLES LOGIC — FIX v2.3
//
// Sistem 2 tahap agar "Baca Juga" SELALU terisi:
//   Tahap 1 → artikel bertopik SAMA (exclude artikel saat ini), maks 3
//   Tahap 2 → jika kurang dari 3, isi sisa dari artikel topik BERBEDA
//
// Contoh dengan 1 artikel sesama topik:
//   → 1 artikel Fisika Kuantum + 2 artikel dari topik lain
// ─────────────────────────────────

function getRelatedArticles(article, allArticles) {
    const MAX    = 3;
    const others = (allArticles || []).filter(a => a.id !== article.id);

    const sameTopic  = others.filter(a => a.topic === article.topic);
    const diffTopic  = others.filter(a => a.topic !== article.topic);

    const sameSlice = sameTopic.slice(0, MAX);
    const remaining = MAX - sameSlice.length;
    const fillSlice = remaining > 0 ? diffTopic.slice(0, remaining) : [];

    return [...sameSlice, ...fillSlice];
}

// ─────────────────────────────────
// DETAIL HTML
// ─────────────────────────────────

function detailHTML(article, allArticles) {
    const views = incrementView(article.id);
    const mins  = readingTime(article.content);
    const wc    = wordCount(article.content);

    const coverHTML = article.cover
        ? `<div class="article-cover"><img src="${article.cover}" alt="Cover ${article.title}"></div>`
        : '';

    // Related articles — selalu muncul jika ada ≥ 2 artikel di DB
    const related = getRelatedArticles(article, allArticles);

    const allSameTopic = related.length > 0 && related.every(r => r.topic === article.topic);
    const relatedSubtitle = allSameTopic
        ? `Artikel lain bertopik <strong>${article.topic}</strong>`
        : `Artikel lain yang mungkin kamu suka`;

    const relatedHTML = related.length > 0 ? `
        <div class="article-related">
            <h3 class="article-related-title">Baca Juga <span>—</span></h3>
            <p class="article-related-subtitle">${relatedSubtitle}</p>
            <div class="article-related-grid">
                ${related.map(r => {
                    const rThumb = r.cover
                        ? `<img src="${r.cover}" alt="${r.title}" loading="lazy">`
                        : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1a1a,#222);display:grid;place-items:center;">
                               <i class="fa-solid fa-atom" style="font-size:28px;color:rgba(255,153,0,.3);"></i>
                           </div>`;
                    return `
                        <a class="article-related-card"
                           href="/article/index.html?id=${encodeURIComponent(r.id)}">
                            <div class="article-related-thumb">${rThumb}</div>
                            <div class="article-related-body">
                                <div class="article-related-topic">${r.topic || 'Fisika'}</div>
                                <div class="article-related-title-text">${r.title}</div>
                                <div class="article-related-meta">
                                    <span>${fmtDate(r.date)}</span>
                                    <span>•</span>
                                    <span>${r.author || 'PPS'}</span>
                                </div>
                            </div>
                        </a>`;
                }).join('')}
            </div>
        </div>` : '';

    const avatarInner = article.authorAvatar
        ? `<img src="${article.authorAvatar}" alt="${article.author || 'Penulis'}">`
        : initials(article.author || 'PPS');

    const shareUrl  = encodeURIComponent(location.href);
    const shareText = encodeURIComponent((article.title || '') + ' — ');

    return `
        <div class="article-shell">

            <div style="margin-bottom:16px;">
                <span class="article-tag">
                    <i class="fa-solid fa-tag" style="font-size:10px;"></i>
                    ${article.topic || 'Fisika'}
                </span>
            </div>

            <div class="article-header">
                <h1>${article.title || ''}</h1>
                ${article.excerpt ? `<p style="margin-top:14px;font-size:17px;color:rgba(255,255,255,.6);line-height:1.6;">${article.excerpt}</p>` : ''}
            </div>

            <div class="article-meta-bar">
                <div class="article-meta-item">
                    <i class="fa-regular fa-user"></i>
                    <span>Ditulis oleh</span>
                    <strong>${article.author || 'Tim PPS'}</strong>
                </div>
                <div class="article-meta-item">
                    <i class="fa-regular fa-calendar"></i>
                    <strong>${fmtDate(article.date)}</strong>
                </div>
                <div class="article-meta-item">
                    <i class="fa-regular fa-clock"></i>
                    <span>${mins} menit baca</span>
                </div>
                <div class="article-views-badge">
                    <i class="fa-regular fa-eye"></i>
                    <span>${views}</span> views
                </div>
            </div>

            <div class="article-stats-bar">
                <div class="article-stat-item">
                    <div class="article-stat-value">${views}</div>
                    <div class="article-stat-label">Views</div>
                </div>
                <div class="article-stat-item">
                    <div class="article-stat-value">${mins}</div>
                    <div class="article-stat-label">Menit Baca</div>
                </div>
                <div class="article-stat-item">
                    <div class="article-stat-value">${wc}</div>
                    <div class="article-stat-label">Kata</div>
                </div>
            </div>

            ${coverHTML}

            <div class="article-author-card">
                <div class="article-author-avatar">${avatarInner}</div>
                <div class="article-author-info">
                    <p class="article-author-name">${article.author || 'Tim PPS'}</p>
                    <p class="article-author-role">${article.authorRole || 'Penulis — Pajajaran Physical Society'}</p>
                </div>
                <span class="article-author-badge">PPS Writer</span>
            </div>

            <div class="article-content">
                ${article.content || '<p>Konten belum tersedia.</p>'}
            </div>

            <div class="article-share">
                <span class="article-share-label">Bagikan:</span>
                <a class="article-share-btn"
                   href="https://wa.me/?text=${shareText}${shareUrl}"
                   target="_blank" rel="noopener noreferrer">
                    <i class="fa-brands fa-whatsapp"></i> WhatsApp
                </a>
                <a class="article-share-btn"
                   href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}"
                   target="_blank" rel="noopener noreferrer">
                    <i class="fa-brands fa-x-twitter"></i> Twitter/X
                </a>
                <button class="article-share-btn"
                        onclick="navigator.clipboard.writeText(location.href).then(()=>window.showToast('Link disalin!','success'))">
                    <i class="fa-regular fa-copy"></i> Salin Link
                </button>
            </div>

            ${relatedHTML}

        </div>`;
}

// ─────────────────────────────────
// TOPIC DROPDOWN
// ─────────────────────────────────

function initTopicDropdown(data, state, applyCallback) {
    const btn      = document.getElementById('topicDropdownBtn');
    const panel    = document.getElementById('topicDropdownPanel');
    const overlay  = document.getElementById('dropdownOverlay');
    const items    = document.querySelectorAll('.topic-item');
    const countEl  = document.getElementById('topicCount');
    const search   = document.getElementById('topicSearch');
    const btnClear = document.getElementById('btnClearTopics');
    const btnApply = document.getElementById('btnApplyTopics');
    const label    = document.getElementById('dropdownLabel');
    if (!btn || !panel) return;

    function close() {
        btn.classList.remove('is-open');
        panel.classList.remove('is-open');
        overlay?.classList.remove('is-active');
        btn.setAttribute('aria-expanded', 'false');
    }

    function updateCount() {
        const n = state.activeTopics.has('all') ? 0 : state.activeTopics.size;
        if (n > 0) {
            countEl.textContent = n;
            countEl.style.display = 'inline-flex';
            btn.classList.add('is-active');
            label.textContent = n === 1 ? Array.from(state.activeTopics)[0] : `${n} Topik`;
        } else {
            countEl.style.display = 'none';
            btn.classList.remove('is-active');
            label.textContent = 'Pilih Topik Fisika';
        }
    }

    btn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = btn.classList.toggle('is-open');
        panel.classList.toggle('is-open');
        overlay?.classList.toggle('is-active');
        btn.setAttribute('aria-expanded', String(isOpen));
        if (isOpen && search) setTimeout(() => search.focus(), 100);
    });

    overlay?.addEventListener('click', close);

    items.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const topic = item.dataset.topic;
            if (topic === 'all') {
                state.activeTopics.clear();
                state.activeTopics.add('all');
                items.forEach(t => t.classList.remove('is-active'));
                item.classList.add('is-active');
            } else {
                state.activeTopics.delete('all');
                document.querySelector('.topic-item[data-topic="all"]')?.classList.remove('is-active');
                if (state.activeTopics.has(topic)) {
                    state.activeTopics.delete(topic);
                    item.classList.remove('is-active');
                } else {
                    state.activeTopics.add(topic);
                    item.classList.add('is-active');
                }
                if (state.activeTopics.size === 0) {
                    state.activeTopics.add('all');
                    document.querySelector('.topic-item[data-topic="all"]')?.classList.add('is-active');
                }
            }
            updateCount();
        });
    });

    search?.addEventListener('input', function () {
        const q = this.value.toLowerCase();
        items.forEach(item => {
            const lbl = item.querySelector('.topic-label');
            item.style.display = (!q || lbl?.textContent.toLowerCase().includes(q)) ? 'flex' : 'none';
        });
    });

    btnClear?.addEventListener('click', () => {
        state.activeTopics.clear();
        state.activeTopics.add('all');
        items.forEach(t => t.classList.remove('is-active'));
        document.querySelector('.topic-item[data-topic="all"]')?.classList.add('is-active');
        if (search) { search.value = ''; items.forEach(i => i.style.display = 'flex'); }
        updateCount();
    });

    btnApply?.addEventListener('click', () => {
        applyCallback();
        close();
        const lbl = state.activeTopics.has('all') ? 'semua topik'
            : state.activeTopics.size === 1       ? Array.from(state.activeTopics)[0]
            :                                       `${state.activeTopics.size} topik`;
        showToast(`Filter: ${lbl}`, 'success', 2000);
        announce(`Filter diterapkan: ${lbl}`);
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && panel.classList.contains('is-open')) close();
    });
    document.addEventListener('click', e => {
        if (!btn.contains(e.target) && !panel.contains(e.target)) close();
    });

    updateCount();
}

function updateTopicCounts(articles) {
    const counts = {};
    articles.forEach(a => { counts[a.topic] = (counts[a.topic] || 0) + 1; });
    document.querySelectorAll('.topic-article-count').forEach(el => {
        el.textContent = el.dataset.count === 'all' ? articles.length : (counts[el.dataset.count] || 0);
    });
}

// ─────────────────────────────────
// LIST PAGE
// ─────────────────────────────────

async function initList() {
    const cardsEl = document.getElementById('cards');
    if (!cardsEl || getParam('id')) return;

    let data;
    try {
        data = await loadArticles();
    } catch (err) {
        console.info('[PPS]', err.message);
        initStaticFilter(cardsEl);
        return;
    }

    const state = {
        allArticles:      data,
        filteredArticles: [...data],
        activeTopics:     new Set(['all']),
        searchQuery:      '',
    };

    // ← DIUBAH: 'searchInput' → 'q' (sesuai id di HTML baru)
    const searchInput = document.getElementById('q');
    initTopicDropdown(data, state, applyFilters);
    updateTopicCounts(data);

    searchInput?.addEventListener('input', debounce(() => {
        state.searchQuery = searchInput.value.trim().toLowerCase();
        applyFilters();
    }, 280));

    function applyFilters() {
        const filtered = data.filter(a => {
            const matchTopic = state.activeTopics.has('all') || state.activeTopics.has(a.topic);
            const matchQ     = !state.searchQuery
                || (a.title   || '').toLowerCase().includes(state.searchQuery)
                || (a.excerpt || '').toLowerCase().includes(state.searchQuery)
                || (a.topic   || '').toLowerCase().includes(state.searchQuery);
            return matchTopic && matchQ;
        });
        state.filteredArticles = filtered;
        renderCards(filtered);
    }

    function renderCards(articles) {
        if (articles.length === 0) {
            cardsEl.innerHTML = `
                <div class="state-empty" style="grid-column:1/-1;">
                    <div class="state-icon">🔬</div>
                    <div class="state-title">Tidak ada artikel ditemukan</div>
                    <div class="state-desc">Coba ubah filter topik atau kata kunci pencarian.</div>
                </div>`;
            return;
        }
        cardsEl.innerHTML = articles.map(cardHTML).join('');
        initLazyLoading();
    }

    applyFilters();
}

// Filter berbasis static cards (saat articles.json belum ada)
function initStaticFilter(cardsEl) {
    // ← DIUBAH: 'searchInput' → 'q' (sesuai id di HTML baru)
    const searchInput = document.getElementById('q');
    const items       = document.querySelectorAll('.topic-item');
    let activeTopics  = new Set(['all']);
    let searchQuery   = '';

    function filterStatic() {
        const cards = cardsEl.querySelectorAll('.card');
        cards.forEach(card => {
            const matchTopic = activeTopics.has('all') || activeTopics.has(card.dataset.topic);
            const matchQ     = !searchQuery
                || (card.dataset.title || '').includes(searchQuery)
                || (card.dataset.topic || '').toLowerCase().includes(searchQuery);
            card.style.display = (matchTopic && matchQ) ? 'flex' : 'none';
        });
    }

    items.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const topic = item.dataset.topic;
            if (topic === 'all') {
                activeTopics.clear(); activeTopics.add('all');
                items.forEach(t => t.classList.remove('is-active'));
                item.classList.add('is-active');
            } else {
                activeTopics.delete('all');
                document.querySelector('.topic-item[data-topic="all"]')?.classList.remove('is-active');
                if (activeTopics.has(topic)) { activeTopics.delete(topic); item.classList.remove('is-active'); }
                else { activeTopics.add(topic); item.classList.add('is-active'); }
                if (activeTopics.size === 0) {
                    activeTopics.add('all');
                    document.querySelector('.topic-item[data-topic="all"]')?.classList.add('is-active');
                }
            }
            filterStatic();
        });
    });

    document.getElementById('btnClearTopics')?.addEventListener('click', () => {
        activeTopics = new Set(['all']);
        items.forEach(t => t.classList.remove('is-active'));
        document.querySelector('.topic-item[data-topic="all"]')?.classList.add('is-active');
        filterStatic();
    });

    document.getElementById('btnApplyTopics')?.addEventListener('click', () => {
        document.getElementById('topicDropdownPanel')?.classList.remove('is-open');
        document.getElementById('topicDropdownBtn')?.classList.remove('is-open');
        document.getElementById('dropdownOverlay')?.classList.remove('is-active');
        filterStatic();
    });

    searchInput?.addEventListener('input', debounce(() => {
        searchQuery = searchInput.value.trim().toLowerCase();
        filterStatic();
    }, 280));

    // Hitung count dari static cards
    const counts = {};
    cardsEl.querySelectorAll('.card').forEach(c => {
        const t = c.dataset.topic || '';
        counts[t] = (counts[t] || 0) + 1;
    });
    const total = cardsEl.querySelectorAll('.card').length;
    document.querySelectorAll('.topic-article-count').forEach(el => {
        el.textContent = el.dataset.count === 'all' ? total : (counts[el.dataset.count] || 0);
    });

    // Dropdown toggle
    const btn     = document.getElementById('topicDropdownBtn');
    const panel   = document.getElementById('topicDropdownPanel');
    const overlay = document.getElementById('dropdownOverlay');
    btn?.addEventListener('click', e => {
        e.stopPropagation();
        const open = btn.classList.toggle('is-open');
        panel?.classList.toggle('is-open');
        overlay?.classList.toggle('is-active');
        btn.setAttribute('aria-expanded', String(open));
    });
    overlay?.addEventListener('click', () => {
        btn?.classList.remove('is-open');
        panel?.classList.remove('is-open');
        overlay.classList.remove('is-active');
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            btn?.classList.remove('is-open');
            panel?.classList.remove('is-open');
            overlay?.classList.remove('is-active');
        }
    });
    document.getElementById('topicSearch')?.addEventListener('input', function () {
        const q = this.value.toLowerCase();
        items.forEach(item => {
            const lbl = item.querySelector('.topic-label');
            item.style.display = (!q || lbl?.textContent.toLowerCase().includes(q)) ? 'flex' : 'none';
        });
    });
}

// ─────────────────────────────────
// DETAIL PAGE
// ─────────────────────────────────

async function initDetail() {
    const mount = document.getElementById('detailMount');
    const id    = getParam('id');
    if (!mount || !id) return;

    try {
        const data    = await loadArticles();
        const article = data.find(x => x.id === id);

        if (!article) {
            mount.innerHTML = `
                <div class="state-empty">
                    <div class="state-icon">🔍</div>
                    <div class="state-title">Artikel tidak ditemukan</div>
                    <div class="state-desc">Artikel dengan ID "<code>${id}</code>" tidak ada dalam database.</div>
                </div>`;
            return;
        }

        // Render artikel + related articles (dengan fallback lintas topik)
        mount.innerHTML = detailHTML(article, data);
        document.title  = `${article.title} — Pajajaran Physical Society`;
        initLazyLoading();

        // Smooth scroll untuk anchor links di konten
        mount.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', e => {
                const target = document.querySelector(a.getAttribute('href'));
                if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            });
        });

    } catch (err) {
        console.error('[PPS Detail]', err);
        mount.innerHTML = `
            <div class="state-error">
                <div class="state-icon">❌</div>
                <div class="state-title">Gagal memuat artikel</div>
                <div class="state-desc">${err.message}</div>
            </div>`;
    }
}

// ─────────────────────────────────
// BOOT
// ─────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initBackToTop();
    initLazyLoading();
    initList().catch(console.error);
    initDetail().catch(console.error);
});

window.addEventListener('error',              e => console.error('[PPS]', e.error));
window.addEventListener('unhandledrejection', e => console.error('[PPS]', e.reason));