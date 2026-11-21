/* Storytime - app shell: router, menu, search, theme, text size, language, backup, What's new.
   Plain ES5 in one IIFE, no build step. To add a screen: add one entry to VIEWS and one to NAV
   (see "APP VIEWS" below). Patterns come from the isaymotion Companion apps (Stahl / DSMVapp),
   MSEtrainer and sheatrainer. */
(function () {
  'use strict';

  /* ===== Storage (try/catch so the app works with storage blocked) ===== */
  var PREFIX = 's:v1:';
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ }
    },
    del: function (k) { try { localStorage.removeItem(PREFIX + k); } catch (e) {} }
  };

  /* ===== Key migration (for restyled apps whose storage PREFIX changed, so saved progress survives).
     map = { 'old:prefix:': 'sub-prefix' | function (rest, oldKey) { return 'new-suffix'; } }.
     Every localStorage key starting with an old prefix is copied under PREFIX, then the old key is removed.
     A string value is put in front of the rest of the key ('' just swaps the prefix); a function returns the new
     suffix (a falsy result skips that key). An existing key under PREFIX is never overwritten. ===== */
  function migrateKeys(map) {
    try {
      if (!map || typeof map !== 'object') return;
      var keys = [], i;
      for (i = 0; i < localStorage.length; i++) { var k0 = localStorage.key(i); if (k0) keys.push(k0); }
      Object.keys(map).forEach(function (oldP) {
        if (!oldP) return;
        var to = map[oldP], growing = PREFIX.indexOf(oldP) === 0;   // new prefix extends the old one: do not re-migrate
        keys.forEach(function (k) {
          if (k.indexOf(oldP) !== 0) return;
          if (growing && k.indexOf(PREFIX) === 0) return;
          var rest = k.slice(oldP.length), suffix = typeof to === 'function' ? to(rest, k) : (typeof to === 'string' ? to + rest : null);
          if (typeof suffix !== 'string' || !suffix) return;
          var nk = PREFIX + suffix;
          if (nk === k) return;
          try {
            if (localStorage.getItem(nk) == null) localStorage.setItem(nk, localStorage.getItem(k));
            localStorage.removeItem(k);
          } catch (e) { /* leave the old key in place */ }
        });
      });
    } catch (e) { /* storage unavailable */ }
  }
  if (window.MIGRATE_KEYS) migrateKeys(window.MIGRATE_KEYS);

  var META = window.APP_META || {};
  var CHANGELOG = window.APP_CHANGELOG || [];
  var ATTRIBUTION = META.attribution || '';
  var APP_NAME = META.name || document.title;
  var APP_LINKS = window.APP_LINKS || [];

  /* ===== Language: 'en' (default) or 'tl' (Tagalog). Shell UI strings live in data/strings.js. ===== */
  var STRINGS = window.STRINGS || {};
  var lang = store.get('lang', 'en') === 'tl' ? 'tl' : 'en';
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function t(key) {
    var s = STRINGS[lang] && has(STRINGS[lang], key) ? STRINGS[lang][key] : null;
    if (typeof s !== 'string' || !s) s = STRINGS.en && has(STRINGS.en, key) ? STRINGS.en[key] : null;
    return typeof s === 'string' && s ? s : key;
  }
  function tf(key, vars) { return t(key).replace(/\{(\w+)\}/g, function (m, k) { return vars && has(vars, k) ? String(vars[k]) : m; }); }
  function rich(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[\[(.+?)\]\]/g, '<kbd>$1</kbd>'); }   // **bold** and [[key]] in strings
  function locale() { return lang === 'tl' ? 'fil' : undefined; }

  /* ===== Helpers ===== */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
    if (!m) return String(iso);
    return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(locale(), { month: 'long', day: 'numeric', year: 'numeric' });
  }

  var main = document.getElementById('main');
  var sidenav = document.getElementById('sidenav');
  var backdrop = document.getElementById('nav-backdrop');
  var menuBtn = document.getElementById('menu-btn');
  var tabMenu = document.getElementById('tab-menu');
  var qInput = document.getElementById('q');
  var suggestBox = document.getElementById('suggest');

  /* ===== Icons (inline SVG, 24x24, stroke = currentColor). NAV items refer to these by key. ===== */
  var ICONS = {
    home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
    news: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || 'nav-ico') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || ICONS.star) + '</svg>';
  }

  /* ===== NAV: one entry per screen. Builds the sidenav (grouped by `group`) and the home tiles.
     {label, href, icon, group}  Optional: tile:false (keep off the home grid), badge:'news' (unseen What's new count),
     tkey:'nav.x' (label comes from data/strings.js). The "Other apps" group is added after these from window.APP_LINKS. ===== */
  var NAV = [
    { label: 'Home', tkey: 'nav.home', href: '#/', icon: 'home', group: 'Start', tile: false },
    { label: 'placeholder', href: '#/x', icon: 'star', group: 'Screens' },
    /* ===== add your screens' NAV entries here, e.g. { label: 'Birthdays', href: '#/birthdays', icon: 'calendar', group: 'Screens' }, ===== */
    { label: 'What’s new', tkey: 'nav.whatsNew', href: '#/whats-new', icon: 'news', group: 'App', tile: false, badge: 'news' },
    { label: 'About', tkey: 'nav.about', href: '#/about', icon: 'info', group: 'App', tile: false }
  ];
  var NAV_GROUPS = { Start: 'nav.start', Screens: 'nav.screens', App: 'nav.app' };   // group name -> strings key
  function navLabel(n) { return n.tkey ? t(n.tkey) : n.label; }

  /* ===== Search index: fill with {title, text, href, kind}. Rebuild it from your own data if you like.
     The shell's own entries (What's new, About) are added by shellIndex() so they follow the language. ===== */
  var SEARCH_INDEX = [
    /* { title: 'Example', text: 'Words people might search for.', href: '#/example', kind: 'Screen' } */
  ];
  function shellIndex() {
    return [
      { title: t('nav.whatsNew'), text: t('search.newsText'), href: '#/whats-new', kind: t('nav.app') },
      { title: t('nav.about'), text: t('search.aboutText'), href: '#/about', kind: t('nav.app') }
    ];
  }

  /* ===== Theme: auto (match device) / light / dark. No data-theme attribute = match device. ===== */
  var THEME_ICONS = {
    auto: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
    dark: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    light: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  var darkMQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function getTheme() {
    var cur = store.get('theme', 'auto');
    return cur === 'light' || cur === 'dark' ? cur : 'auto';
  }
  function applyTheme(mode) {
    var root = document.documentElement;
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode); else root.removeAttribute('data-theme');
    var dark = mode === 'dark' || (mode !== 'light' && darkMQ && darkMQ.matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#1C0E20' : '#5A1C6E');
    var btn = document.getElementById('theme-btn');
    if (btn) {
      var label = tf('theme.label', { name: t('theme.' + mode) });
      btn.innerHTML = THEME_ICONS[mode];
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    }
    var opts = document.querySelectorAll('[data-theme-opt]');
    for (var i = 0; i < opts.length; i++) opts[i].setAttribute('aria-pressed', opts[i].getAttribute('data-theme-opt') === mode ? 'true' : 'false');
    var radios = document.querySelectorAll('input[name="theme"]');   // the Theme segment on the About page
    for (var j = 0; j < radios.length; j++) radios[j].checked = radios[j].value === mode;
  }
  function setTheme(mode) {
    if (mode !== 'light' && mode !== 'dark') mode = 'auto';
    if (mode === 'auto') store.del('theme'); else store.set('theme', mode);
    applyTheme(mode);
  }
  applyTheme(getTheme());
  (function () {
    var btn = document.getElementById('theme-btn');
    if (btn) btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme') || 'auto';
      setTheme({ auto: 'light', light: 'dark', dark: 'auto' }[cur]);
    });
    function onDeviceChange() { applyTheme(document.documentElement.getAttribute('data-theme') || 'auto'); }
    if (darkMQ) { if (darkMQ.addEventListener) darkMQ.addEventListener('change', onDeviceChange); else if (darkMQ.addListener) darkMQ.addListener(onDeviceChange); }
  })();

  /* ===== Header height -> --top ===== */
  function headerH() { var t = document.querySelector('.topbar'); return t ? t.offsetHeight : 64; }
  function setTopVar() { document.documentElement.style.setProperty('--top', headerH() + 'px'); }
  window.addEventListener('resize', setTopVar);
  setTopVar();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setTopVar);

  /* ===== Text size (Aa panel) ===== */
  var TEXT_SIZES = [['90', 'textsize.smaller'], ['100', 'textsize.default'], ['112.5', 'textsize.larger'], ['125', 'textsize.largest']];   // [value, strings key]
  function syncSizeRadios(v) {   // the text-size segment on the About page
    var radios = document.querySelectorAll('input[name="aboutTextSize"]');
    for (var i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === v;
  }
  function applyTextSize(v) {
    var ok = TEXT_SIZES.some(function (z) { return z[0] === v; });
    document.documentElement.style.fontSize = ok && v !== '100' ? v + '%' : '';
    setTopVar();
  }
  (function () {
    var btn = document.getElementById('textSizeBtn');
    if (!btn) return;
    var panel = document.createElement('div');
    panel.className = 'text-size-panel'; panel.id = 'textSizePanel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', t('textsize.title'));
    document.body.appendChild(panel);
    function build() {
      var cur = String(store.get('textSize', '100'));
      panel.setAttribute('aria-label', t('textsize.title'));
      panel.innerHTML = '<p class="text-size-panel__title">' + esc(t('textsize.title')) + '</p><div class="seg">' + TEXT_SIZES.map(function (z, i) {
        return '<label><input type="radio" name="textSize" value="' + z[0] + '"' + (cur === z[0] ? ' checked' : '') + '><span style="font-size:' + (0.82 + i * 0.1).toFixed(2) + 'rem">' + esc(t(z[1])) + '</span></label>';
      }).join('') + '</div>';
    }
    function open() { build(); panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); var f = panel.querySelector('input:checked'); if (f) f.focus(); }
    function close() { if (panel.hidden) return; panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); if (panel.hidden) open(); else close(); });
    panel.addEventListener('change', function (e) {
      if (e.target.name === 'textSize') { store.set('textSize', e.target.value); applyTextSize(e.target.value); syncSizeRadios(e.target.value); }
    });
    document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); } });
    window.addEventListener('hashchange', close);
  })();

  /* ===== In-app back/forward buttons (index-stamped history) ===== */
  var HIST_KEY = PREFIX + 'hist';
  var hist = (function () { try { return JSON.parse(sessionStorage.getItem(HIST_KEY)) || { cur: 0, max: 0 }; } catch (e) { return { cur: 0, max: 0 }; } })();
  function saveHist() { try { sessionStorage.setItem(HIST_KEY, JSON.stringify(hist)); } catch (e) {} }
  function stamp(i) { try { history.replaceState({ spIdx: i }, ''); } catch (e) {} }
  function syncHist() {
    var st = history.state;
    if (st && typeof st.spIdx === 'number') {
      hist.cur = st.spIdx;
      if (hist.cur > hist.max) hist.max = hist.cur;
    } else {
      hist.cur = hist.cur + 1;     // a new page: anything that was ahead is discarded
      hist.max = hist.cur;
      stamp(hist.cur);
    }
    saveHist(); paintHist();
  }
  function paintHist() {
    var b = document.getElementById('nav-back'), f = document.getElementById('nav-fwd');
    if (b) b.disabled = hist.cur <= 0;
    if (f) f.disabled = hist.cur >= hist.max;
  }
  (function initHist() {
    var st = history.state;
    if (st && typeof st.spIdx === 'number') { hist.cur = st.spIdx; if (hist.max < hist.cur) hist.max = hist.cur; }
    else { hist = { cur: 0, max: 0 }; stamp(0); }
    saveHist(); paintHist();
    var b = document.getElementById('nav-back'), f = document.getElementById('nav-fwd');
    if (b) b.addEventListener('click', function () { if (!b.disabled) history.back(); });
    if (f) f.addEventListener('click', function () { if (!f.disabled) history.forward(); });
  })();

  /* Alt+Left / Alt+Right (ignores typing in fields and other modifiers) */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if (e.altKey && !typing && !e.ctrlKey && !e.metaKey && !e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      if (e.key === 'ArrowLeft') history.back(); else history.forward();
    }
  });

  /* ===== Scroll restoration (only on back/forward, not on ordinary link clicks) ===== */
  var scrollMemo = {}, scrollKey = location.hash || '#/', fromHistory = false, scrollPending = false;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('scroll', function () {
    if (scrollPending) return;
    scrollPending = true;
    setTimeout(function () { scrollPending = false; scrollMemo[scrollKey] = window.scrollY; }, 120);
  }, { passive: true });
  window.addEventListener('popstate', function (e) { fromHistory = !!(e.state && typeof e.state.spIdx === 'number'); });

  /* ===== Menu: docked sidebar on desktop, drawer on phones/tablets ===== */
  function isDrawerMode() { return window.matchMedia('(max-width: 1099px)').matches; }
  function setMenuExpanded(v) { [menuBtn, tabMenu].forEach(function (b) { if (b) b.setAttribute('aria-expanded', v ? 'true' : 'false'); }); }
  function openDrawer() {
    if (!isDrawerMode()) return;
    document.body.classList.add('drawer-open');
    backdrop.hidden = false;
    setMenuExpanded(true);
    var target = sidenav.querySelector('.sidenav__close');
    setTimeout(function () { if (target) target.focus(); }, 60);
  }
  function closeDrawer() {
    if (!document.body.classList.contains('drawer-open')) return;
    document.body.classList.remove('drawer-open');
    backdrop.hidden = true;
    setMenuExpanded(false);
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { openDrawer(); });
  if (tabMenu) tabMenu.addEventListener('click', function () { if (document.body.classList.contains('drawer-open')) closeDrawer(); else openDrawer(); });
  document.getElementById('nav-close').addEventListener('click', function () { closeDrawer(); if (menuBtn) menuBtn.focus(); });
  backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) { closeDrawer(); if (menuBtn) menuBtn.focus(); } });
  sidenav.addEventListener('click', function (e) { var a = e.target.closest('a'); if (a && a.getAttribute('href') === location.hash) closeDrawer(); });
  var collapseBtn = document.getElementById('collapse-btn');   // desktop: hide/show the docked sidebar
  function labelCollapse() {
    var c = document.documentElement.classList.contains('nav-collapsed');
    collapseBtn.setAttribute('aria-label', t(c ? 'sidebar.show' : 'sidebar.hide'));
    collapseBtn.setAttribute('title', t(c ? 'sidebar.show' : 'sidebar.hide'));
  }
  collapseBtn.addEventListener('click', function () {
    var c = !document.documentElement.classList.contains('nav-collapsed');
    document.documentElement.classList.toggle('nav-collapsed', c);
    store.set('navCollapsed', c); labelCollapse(); setTopVar();
  });
  labelCollapse();

  /* APP_LINKS minus this app's own entry (matched on the repo slug at the end of the URL). Menu only: never tiles, search or tabs. */
  function otherApps() {
    if (!window.SHOW_OTHER_APPS) return [];   // off until she is ready to interlink the apps (data/app-meta.js)
    var me = String(META.repo || '').toLowerCase();
    return APP_LINKS.filter(function (a) {
      if (!a || !a.name || !/^https?:\/\//i.test(String(a.href || ''))) return false;
      var slug = String(a.href).replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop().toLowerCase();
      return !me || slug !== me;
    });
  }
  function currentKey() { var p = parts(); return p.length ? p[0] : 'home'; }
  function buildNav() {
    var cur = location.hash || '#/';
    if (cur === '#') cur = '#/';
    var groups = [], byName = {};
    NAV.forEach(function (n) {
      var g = n.group || 'Menu';
      if (!byName[g]) { byName[g] = { label: g, items: [] }; groups.push(byName[g]); }
      byName[g].items.push(n);
    });
    var html = groups.map(function (g) {
      return '<div class="nav-group"><div class="nav-label">' + esc(NAV_GROUPS[g.label] ? t(NAV_GROUPS[g.label]) : g.label) + '</div><ul>' + g.items.map(function (n) {
        var active = n.href === cur;
        return '<li><a class="nav-item' + (active ? ' is-active' : '') + '" href="' + esc(n.href) + '"' + (active ? ' aria-current="page"' : '') + '>' + icon(n.icon) + '<span>' + esc(navLabel(n)) + '</span>' +
          (n.badge ? '<span class="badge" data-badge="' + esc(n.badge) + '" hidden></span>' : '') + '</a></li>';
      }).join('') + '</ul></div>';
    }).join('');
    var others = otherApps();
    if (others.length) {
      html += '<div class="nav-group"><div class="nav-label">' + esc(t('nav.otherApps')) + '</div><ul>' + others.map(function (a) {
        return '<li><a class="nav-item" href="' + esc(a.href) + '" target="_blank" rel="noopener">' + icon('external') + '<span>' + esc(a.name) + '</span><span class="sr-only"> ' + esc(t('nav.newTab')) + '</span></a></li>';
      }).join('') + '</ul></div>';
    }
    document.getElementById('sidenav-body').innerHTML = html;
    var tabs = document.querySelectorAll('.tabbar [data-tab]');
    var key = currentKey();
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-tab') === key;
      if (tabs[i].tagName === 'A') { tabs[i].classList.toggle('is-active', on); if (on) tabs[i].setAttribute('aria-current', 'page'); else tabs[i].removeAttribute('aria-current'); }
    }
  }

  /* ===== What's new: unseen badge keyed on the version string ===== */
  function latestNewsVersion() { return CHANGELOG.length ? String(CHANGELOG[0].version) : ''; }
  function seenNewsVersion() {
    var s = store.get('seenNews', null);
    if (s == null) { s = latestNewsVersion(); store.set('seenNews', s); }   // brand-new visitors start up to date
    return s;
  }
  function unseenNews() {
    var seen = seenNewsVersion(), out = [];
    for (var i = 0; i < CHANGELOG.length; i++) {
      if (String(CHANGELOG[i].version) === seen) return out;
      out.push(CHANGELOG[i]);
    }
    return out;
  }
  function updateNavBadges() {
    var n = unseenNews().length;
    var els = document.querySelectorAll('[data-badge="news"]');
    for (var i = 0; i < els.length; i++) { els[i].textContent = n; els[i].hidden = !n; }
  }

  /* ===== Search ===== */
  var sugIndex = -1, sugTimer = null, searchKind = '';
  function terms(q) { return String(q).toLowerCase().replace(/[^\p{L}\p{N}\-\s.]/gu, ' ').split(/\s+/).filter(function (t) { return t.length > 0; }); }
  function runSearch(q) {
    var ts = terms(q);
    if (!ts.length) return [];
    var out = [];
    shellIndex().concat(SEARCH_INDEX).forEach(function (e) {
      var t = String(e.title || '').toLowerCase(), x = String(e.text || '').toLowerCase(), score = 0, ok = true;
      ts.forEach(function (w) {
        var iT = t.indexOf(w), iX = x.indexOf(w);
        if (iT < 0 && iX < 0) { ok = false; return; }
        if (iT >= 0) score += iT === 0 ? 6 : 4;
        if (iX >= 0) score += 1;
      });
      if (ok) out.push({ e: e, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.map(function (r) { return r.e; });
  }
  function highlight(text, ts) {
    text = String(text == null ? '' : text);
    if (!ts.length) return esc(text);
    var re = new RegExp('(' + ts.map(escRe).join('|') + ')', 'gi');
    return text.split(re).map(function (seg, i) { return i % 2 ? '<mark>' + esc(seg) + '</mark>' : esc(seg); }).join('');
  }
  function snippet(text, ts, len) {
    text = String(text || '');
    if (text.length <= len) return text;
    var low = text.toLowerCase(), at = -1;
    for (var i = 0; i < ts.length && at < 0; i++) at = low.indexOf(ts[i]);
    var start = Math.max(0, (at < 0 ? 0 : at) - 40);
    return (start > 0 ? '…' : '') + text.slice(start, start + len) + (start + len < text.length ? '…' : '');
  }
  function openSuggest(q) {
    q = String(q || '').trim();
    if (!q) { closeSuggest(); return; }
    var ts = terms(q), res = runSearch(q), shown = res.slice(0, 6);
    sugIndex = -1;
    qInput.removeAttribute('aria-activedescendant');
    if (!shown.length) {
      suggestBox.innerHTML = '<div class="suggest__empty">' + esc(tf('search.noMatches', { q: q })) + '</div>';
    } else {
      suggestBox.innerHTML = shown.map(function (e, i) {
        return '<a class="suggest__item" role="option" id="sug-' + i + '" href="' + esc(e.href) + '" aria-selected="false"><span class="suggest__meta"><span class="kind">' + esc(e.kind || '') + '</span><span>' + highlight(e.title, ts) + '</span></span><span class="suggest__text">' + highlight(snippet(e.text, ts, 140), ts) + '</span></a>';
      }).join('') + '<a class="suggest__item suggest__all" role="option" id="sug-all" href="#/search/' + encodeURIComponent(q) + '" aria-selected="false">' + esc(tf(res.length === 1 ? 'search.seeAll1' : 'search.seeAllN', { n: res.length })) + '</a>';
    }
    suggestBox.hidden = false;
    qInput.setAttribute('aria-expanded', 'true');
  }
  function closeSuggest() {
    if (!suggestBox) return;
    suggestBox.hidden = true; sugIndex = -1;
    qInput.setAttribute('aria-expanded', 'false');
    qInput.removeAttribute('aria-activedescendant');
  }
  function moveSug(d) {
    var items = suggestBox.querySelectorAll('.suggest__item');
    if (!items.length) return;
    sugIndex = (sugIndex + d + items.length) % items.length;
    items.forEach(function (it, i) { it.setAttribute('aria-selected', String(i === sugIndex)); });
    qInput.setAttribute('aria-activedescendant', items[sugIndex].id);
    items[sugIndex].scrollIntoView({ block: 'nearest' });
  }
  qInput.addEventListener('input', function () {
    clearTimeout(sugTimer);
    sugTimer = setTimeout(function () { openSuggest(qInput.value); }, 110);
  });
  qInput.addEventListener('focus', function () { if (qInput.value.trim()) openSuggest(qInput.value); });
  qInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (suggestBox.hidden) openSuggest(qInput.value); moveSug(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSug(-1); }
    else if (e.key === 'Escape') { closeSuggest(); qInput.blur(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      var items = suggestBox.querySelectorAll('.suggest__item');
      var target = sugIndex > -1 && items[sugIndex] ? items[sugIndex].getAttribute('href') : (qInput.value.trim() ? '#/search/' + encodeURIComponent(qInput.value.trim()) : null);
      closeSuggest();
      if (target) { if (location.hash === target) route(); else location.hash = target; qInput.blur(); }
    }
  });
  suggestBox.addEventListener('mousedown', function (e) { e.preventDefault(); });
  qInput.addEventListener('blur', function () { setTimeout(closeSuggest, 120); });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target.matches && e.target.matches('input, textarea, select'))) { e.preventDefault(); qInput.focus(); qInput.select(); }
  });

  /* ===== Views ===== */
  var VIEWS = {};
  var AFTER = {};      // optional: AFTER.myScreen = function (arg) { ...wire events after render... }
  var TITLES = { home: '' };   // key -> page title (the shell's own titles come from SHELL_TITLES)
  var SHELL_TITLES = { 'whats-new': 'nav.whatsNew', about: 'nav.about', search: 'search.title' };

  VIEWS['whats-new'] = function () {
    var unseen = {};
    unseenNews().forEach(function (e) { unseen[String(e.version)] = true; });
    var html = '<div class="wrap page news"><header class="page__head"><h1>' + esc(t('nav.whatsNew')) + '</h1><p>' + esc(t('news.intro1')) + '<span class="news__new">' + esc(t('news.new')) + '</span>' + esc(t('news.intro2')) + '</p></header>' +
      CHANGELOG.map(function (e) {
        var isNew = !!unseen[String(e.version)];
        return '<article class="news__entry' + (isNew ? ' is-new' : '') + '"><div class="news__date"><time datetime="' + esc(e.date) + '">' + esc(fmtDate(e.date)) + '</time><span class="news__ver">' + esc(tf('news.version', { v: e.version })) + '</span>' + (isNew ? '<span class="news__new">' + esc(t('news.new')) + '</span>' : '') + '</div>' +
          '<div class="news__body"><h2>' + esc(e.title) + '</h2>' + (e.summary ? '<p>' + esc(e.summary) + '</p>' : '') + '<ul>' +
          (e.items || []).map(function (it) {
            var ty = String(it.type || 'feature'), tyLabel = t('news.type.' + ty);
            if (tyLabel === 'news.type.' + ty) tyLabel = ty.charAt(0).toUpperCase() + ty.slice(1);
            return '<li><span class="news__type news__type--' + esc(ty) + '">' + esc(tyLabel) + '</span><span class="news__text">' + esc(it.text) + (it.href ? ' <a href="' + esc(it.href) + '">' + esc(t('news.open')) + '</a>' : '') + '</span></li>';
          }).join('') + '</ul></div></article>';
      }).join('') +
      '<p class="news__note">' + esc(t('news.note')) + '<a href="mailto:isaymotion@gmail.com">isaymotion@gmail.com</a>.</p></div>';
    store.set('seenNews', latestNewsVersion());   // opening the page marks everything as seen
    return html;
  };

  function segGroup(name, label, opts, cur) {   // opts: [[value, label], ...]; radios inside the shared .seg control
    return '<fieldset class="setting"><legend>' + esc(label) + '</legend><div class="seg">' + opts.map(function (o) {
      return '<label><input type="radio" name="' + esc(name) + '" value="' + esc(o[0]) + '"' + (cur === o[0] ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>';
    }).join('') + '</div></fieldset>';
  }
  VIEWS.about = function () {
    var sizes = TEXT_SIZES.map(function (z) { return [z[0], t(z[1])]; });
    return '<div class="wrap page"><header class="page__head"><h1>' + esc(t('nav.about')) + '</h1><p>' + esc(META.tagline || '') + '</p></header>' +
      '<div class="prose"><p><strong>' + esc(APP_NAME) + '</strong> · ' + esc(t('about.version')) + ' ' + esc(META.version || '') + '</p><p>' + esc(ATTRIBUTION) + '</p></div>' +
      '<h2>' + esc(t('about.settings')) + '</h2><div class="card">' +
        segGroup('lang', t('about.language'), [['en', t('about.langEn')], ['tl', t('about.langTl')]], lang) +
        segGroup('theme', t('theme.title'), [['auto', t('theme.auto')], ['light', t('theme.light')], ['dark', t('theme.dark')]], getTheme()) +
        segGroup('aboutTextSize', t('textsize.title'), sizes, String(store.get('textSize', '100'))) +
      '</div>' +
      '<h2>' + esc(t('about.tips')) + '</h2><div class="card"><ul class="prose" style="margin:0;padding-left:1.2em">' +
        [1, 2, 3, 4, 5].map(function (i) { return '<li>' + rich(t('about.tip' + i)) + '</li>'; }).join('') +
      '</ul></div></div>';
  };

  VIEWS.search = function (q) {
    q = String(q || '');
    var ts = terms(q), res = runSearch(q);
    var kinds = [];
    res.forEach(function (e) { var k = e.kind || ''; if (k && kinds.indexOf(k) < 0) kinds.push(k); });
    if (searchKind && kinds.indexOf(searchKind) < 0) searchKind = '';
    var shown = searchKind ? res.filter(function (e) { return e.kind === searchKind; }) : res;
    return '<div class="wrap page search-page"><header class="page__head"><h1>' + esc(t('search.title')) + '</h1><p>' +
        esc(q ? tf(shown.length === 1 ? 'search.count1' : 'search.countN', { n: shown.length, q: q }) : t('search.prompt')) + '</p></header>' +
      (kinds.length > 1 ? '<div class="filters" role="group" aria-label="' + esc(t('search.filterBy')) + '"><button type="button" class="filter" data-kind="" aria-pressed="' + (!searchKind) + '">' + esc(t('search.all')) + '</button>' +
        kinds.map(function (k) { return '<button type="button" class="filter" data-kind="' + esc(k) + '" aria-pressed="' + (searchKind === k) + '">' + esc(k) + '</button>'; }).join('') + '</div>' : '') +
      (shown.length
        ? '<div class="results">' + shown.map(function (e) {
            return '<div class="result"><a href="' + esc(e.href) + '"><span class="result__meta"><span class="kind">' + esc(e.kind || '') + '</span></span><span class="result__title">' + highlight(e.title, ts) + '</span><span class="result__text">' + highlight(snippet(e.text, ts, 220), ts) + '</span></a></div>';
          }).join('') + '</div>'
        : (q ? '<div class="empty"><h2>' + esc(t('search.noneTitle')) + '</h2><p>' + esc(t('search.noneText')) + '</p></div>' : ''))
      + '</div>';
  };
  AFTER.search = function (q) { if (qInput && document.activeElement !== qInput) qInput.value = q || ''; };

  function missingView() {
    return '<div class="wrap page"><div class="empty"><h2>' + esc(t('notfound.title')) + '</h2><p>' + esc(t('notfound.text')) + '</p><p><a class="btn btn--solid" href="#/">' + esc(t('notfound.home')) + '</a></p></div></div>';
  }

  /* ===== APP VIEWS: add your screens here =====
     1. Add a function to VIEWS that returns an HTML string:   VIEWS.birthdays = function (arg) { return '<div class="wrap page">...</div>'; };
        (arg = the part of the hash after the screen name, e.g. #/birthdays/march -> 'march'.) Use esc() on all data.
     2. Add one entry to NAV above (label, href '#/birthdays', icon key from ICONS, group).
     3. Optional: add rows to SEARCH_INDEX, an entry to TITLES, and AFTER.birthdays = function () { ... } to wire events.
     The Example screen below shows the reusable classes from css/app.css. Delete it when you no longer need it. */
  /* ===== STORYTIME =====
     Books, libraries and availability all live in this browser (store, under PREFIX), so the backup panel covers them.
     Nothing is sent anywhere except: the library catalogue lookups below, and the Goodreads shelf feed if she links one. */
  /* Public relays, tried in order after her own (if she set one). Any of them can be down on a given day. */
  var RELAYS = ['https://api.allorigins.win/raw?url=', 'https://api.codetabs.com/v1/proxy/?quest=', 'https://corsproxy.io/?url='];
  var NET_TIMEOUT = 12000;
  var STALE_MS = 6 * 3600 * 1000;      // availability older than this is rechecked by "Check my libraries"
  var GAP_MS = 250;                    // pause between catalogue lookups: stay polite to the library servers
  /* Every outside address in one place, so a change on their side is a one-line fix here. */
  var SRC = {
    libInfo: function (key) { return 'https://thunder.api.overdrive.com/v2/libraries/' + encodeURIComponent(key); },
    libSearch: function (key, q) { return 'https://thunder.api.overdrive.com/v2/libraries/' + encodeURIComponent(key) + '/media?query=' + encodeURIComponent(q) + '&perPage=24'; },
    libList: function (page) { return 'https://thunder.api.overdrive.com/v2/libraries?perPage=100&page=' + page; },
    /* Opens the Libby app itself (libbyapp.com links are handed to the app when it is installed): the title's own page when the
       catalogue id is known, otherwise a search for the book at that library. */
    libbyApp: function (key, q, id) { return 'https://libbyapp.com/search/' + encodeURIComponent(key) + '/search/query-' + encodeURIComponent(q) + '/page-1' + (id ? '/' + encodeURIComponent(id) : ''); },
    libSite: function (key, id) { return 'https://' + encodeURIComponent(key) + '.overdrive.com/media/' + encodeURIComponent(id); },
    grFeed: function (uid, shelf, page) { return 'https://www.goodreads.com/review/list_rss/' + encodeURIComponent(uid) + '?shelf=' + encodeURIComponent(shelf) + '&per_page=100&page=' + page; },
    grWidget: function (uid, shelf) { return 'https://www.goodreads.com/review/custom_widget/' + encodeURIComponent(uid) + '.Storytime?cover_position=left&cover_size=small&num_books=200&order=d&shelf=' + encodeURIComponent(shelf) + '&show_author=1&show_cover=0&show_rating=0&show_review=0&show_tags=0&show_title=1&sort=date_added&widget_id=1'; },
    grBook: function (b) { return b.grId ? 'https://www.goodreads.com/book/show/' + encodeURIComponent(b.grId) : 'https://www.goodreads.com/search?q=' + encodeURIComponent(b.isbn || (b.title + ' ' + (b.author || ''))); },
    sgBook: function (b) { return 'https://app.thestorygraph.com/browse?search_term=' + encodeURIComponent(b.isbn || (b.title + ' ' + (b.author || ''))); }
  };

  ICONS.check = '<path d="M5 12.5l4.5 4.5L19 7.5"/>';
  ICONS.library = '<path d="M3 20h18M5 20V10M9.5 20V10M14.5 20V10M19 20V10M3 10l9-6 9 6z"/>';
  ICONS.download = '<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"/>';

  /* ----- stored data ----- */
  function arr(v) { return Array.isArray(v) ? v : []; }
  function getBooks() { return arr(store.get('books', [])); }
  function saveBooks(b) { store.set('books', b); rebuildIndex(); }
  function getLibs() { return arr(store.get('libs', [])); }
  /* Favourite libraries first (in the order she added them), then the rest. Used wherever a library has to be picked or tried first. */
  function prefLibs() { var l = getLibs(); return l.filter(function (x) { return x.fav; }).concat(l.filter(function (x) { return !x.fav; })); }
  function wantedFormats() { var f = getSettings().fmt; return f === 'any' ? ['ebook', 'audiobook'] : [f]; }
  /* Can a format she reads be borrowed right now, going by this one library's answer? */
  function hasNow(r) { return !!r && !r.err && wantedFormats().some(function (f) { return r[f] && r[f].s === 'now'; }); }
  function getAvail() { var a = store.get('avail', {}); return a && typeof a === 'object' && !Array.isArray(a) ? a : {}; }
  function getSettings() {
    var s = store.get('settings', {}) || {};
    return { grUser: String(s.grUser || ''), relay: typeof s.relay === 'string' && RELAYS.indexOf(s.relay) < 0 ? s.relay : '', fmt: s.fmt === 'ebook' || s.fmt === 'audiobook' ? s.fmt : 'any' };
  }
  function setSetting(k, v) { var s = store.get('settings', {}) || {}; s[k] = v; store.set('settings', s); }
  function newId() { return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function findBook(id) { var b = getBooks(); for (var i = 0; i < b.length; i++) if (b[i].id === id) return b[i]; return null; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

  /* ----- text matching ----- */
  function norm(s) {
    s = String(s == null ? '' : s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/^\s*(the|a|an)\s+/, '').replace(/\s+/g, ' ').trim();
  }
  function cleanTitle(t) { return String(t || '').replace(/\s*\([^)]*\)\s*$/, '').trim(); }      // drops "(Series, #1)"
  function mainTitle(t) { return cleanTitle(t).split(':')[0].trim(); }                             // drops the subtitle
  function surname(a) {
    var p = String(a || '').split(',')[0].replace(/\b(jr|sr|ii|iii|phd|md)\.?$/i, '').trim().split(/\s+/);
    return p.length ? p[p.length - 1] : '';
  }
  function bookKey(b) { return norm(mainTitle(b.title)) + '|' + norm(surname(b.author)); }

  /* ----- bringing a list in ----- */
  function mergeBooks(incoming, source) {
    var books = getBooks(), byKey = {}, byGr = {}, added = 0, updated = 0;
    books.forEach(function (b) { byKey[bookKey(b)] = b; if (b.grId) byGr[b.grId] = b; });
    incoming.forEach(function (n) {
      if (!n.title) return;
      var cur = (n.grId && byGr[n.grId]) || byKey[bookKey(n)];
      if (cur) {
        var ch = false;
        if (!cur.isbn && n.isbn) { cur.isbn = n.isbn; ch = true; }
        if (!cur.grId && n.grId) { cur.grId = n.grId; ch = true; }
        if (!cur.local && n.shelf && cur.shelf !== n.shelf) { cur.shelf = n.shelf; cur.doneAt = n.doneAt || ''; ch = true; }   // never undo what she marked here
        if (ch) updated++;
      } else {
        var b = { id: newId(), title: String(n.title).slice(0, 300), author: String(n.author || '').slice(0, 200), isbn: n.isbn || '', grId: n.grId || '', shelf: n.shelf || 'want', source: source, doneAt: n.doneAt || '' };
        books.push(b); byKey[bookKey(b)] = b; if (b.grId) byGr[b.grId] = b; added++;
      }
    });
    saveBooks(books);
    return { added: added, updated: updated };
  }
  function parseCSV(text) {
    var rows = [], row = [], cur = '', q = false, i, c;
    text = String(text).replace(/^﻿/, '');
    function endRow() { row.push(cur); cur = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; endRow(); }
      else cur += c;
    }
    if (cur !== '' || row.length) endRow();
    return rows;
  }
  var SHELF_MAP = { 'to-read': 'want', 'currently-reading': 'reading', 'paused': 'reading', 'read': 'read' };
  function booksFromCSV(text) {
    var rows = parseCSV(text);
    if (rows.length < 2) return null;
    var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    function col() { for (var i = 0; i < arguments.length; i++) { var x = head.indexOf(arguments[i]); if (x > -1) return x; } return -1; }
    var cTitle = col('title'), cAuthor = col('author', 'authors'), cShelf = col('exclusive shelf', 'read status');
    if (cTitle < 0 || cShelf < 0) return null;
    var source = head.indexOf('read status') > -1 ? 'storygraph' : 'goodreads';
    var cIsbn = col('isbn13', 'isbn/uid', 'isbn'), cGr = source === 'goodreads' ? col('book id') : -1, cDone = col('date read', 'last date read');
    var out = [], skipped = 0;
    rows.slice(1).forEach(function (r) {
      var shelf = SHELF_MAP[String(r[cShelf] || '').trim().toLowerCase()];
      if (!shelf || !String(r[cTitle] || '').trim()) { skipped++; return; }
      var isbn = cIsbn > -1 ? String(r[cIsbn] || '').replace(/[^0-9Xx]/g, '') : '';
      out.push({ title: r[cTitle].trim(), author: cAuthor > -1 ? String(r[cAuthor] || '').split(',')[0].trim() : '', isbn: isbn.length === 10 || isbn.length === 13 ? isbn : '',
        grId: cGr > -1 ? String(r[cGr] || '').replace(/\D/g, '') : '', shelf: shelf, doneAt: shelf === 'read' && cDone > -1 ? String(r[cDone] || '').trim().replace(/\//g, '-') : '' });
    });
    return { source: source, books: out, skipped: skipped };
  }
  function grUserId(s) {
    s = String(s || '').trim();
    var m = /(?:user\/show|review\/list(?:_rss)?)\/(\d+)/.exec(s) || /^(\d+)(?:-[\w-]*)?$/.exec(s);
    return m ? m[1] : '';
  }

  /* ----- network: straight to the site first; if the browser is refused, once more through the relay in Settings ----- */
  var directBlocked = {}, relayStart = 0;
  function timedFetch(u) {
    var ctl = window.AbortController ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, NET_TIMEOUT) : 0;
    return fetch(u, { credentials: 'omit', signal: ctl ? ctl.signal : undefined }).then(function (res) {
      if (!res.ok) { var e = new Error('http ' + res.status); e.status = res.status; throw e; }
      return res.text();
    }).then(function (txt) { clearTimeout(timer); return txt; }, function (err) { clearTimeout(timer); throw err; });
  }
  /* valid(text) says whether the answer is the real thing: relays sometimes return an error page with a 200. */
  function fetchText(u, valid) {
    var host = u.split('/')[2];
    function check(txt) { if (valid && !valid(txt)) { var e = new Error('invalid'); e.invalid = true; throw e; } return txt; }
    function viaRelay() {
      var own = getSettings().relay, list = (/^https:\/\//.test(own) ? [own] : []).concat(RELAYS.slice(relayStart), RELAYS.slice(0, relayStart)), i = 0;
      function attempt() {
        if (i >= list.length) { var e = new Error('blocked'); e.blocked = true; return Promise.reject(e); }
        var r = list[i++];
        return timedFetch(r + encodeURIComponent(u)).then(check).then(function (txt) {
          var at = RELAYS.indexOf(r); if (at > -1) relayStart = at;      // start with the one that worked next time
          return txt;
        }, attempt);
      }
      return attempt();
    }
    if (directBlocked[host]) return viaRelay();
    return timedFetch(u).then(check, function (err) { if (err && err.status) throw err; directBlocked[host] = true; return viaRelay(); });
  }
  function isJSON(txt) { try { JSON.parse(txt); return true; } catch (e) { return false; } }
  function isFeed(txt) { return /<rss[\s>]/i.test(txt) && /<channel[\s>]/i.test(txt); }
  function tagText(el, tag) { var n = el.getElementsByTagName(tag)[0]; return n ? String(n.textContent || '').trim() : ''; }
  function fetchShelf(uid, grShelf, shelf, page, acc) {
    return fetchText(SRC.grFeed(uid, grShelf, page), isFeed).then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, 'text/xml');
      if (doc.getElementsByTagName('parsererror').length || !doc.getElementsByTagName('channel').length) { var e = new Error('feed'); e.feed = true; throw e; }
      var items = doc.getElementsByTagName('item');
      for (var i = 0; i < items.length; i++) {
        var isbn = (tagText(items[i], 'isbn13') || tagText(items[i], 'isbn')).replace(/[^0-9Xx]/g, '');
        acc.push({ title: tagText(items[i], 'title'), author: tagText(items[i], 'author_name'), isbn: isbn, grId: tagText(items[i], 'book_id').replace(/\D/g, ''), shelf: shelf });
      }
      return items.length >= 100 && page < 10 ? fetchShelf(uid, grShelf, shelf, page + 1, acc) : acc;
    });
  }
  /* Second route: Goodreads' own embeddable shelf widget, which is meant to be loaded by other websites.
     It runs inside a sandboxed frame (no access to this app or its saved data) and only its HTML is handed back. */
  function widgetShelf(uid, grShelf, shelf) {
    return new Promise(function (resolve, reject) {
      var token = 'st' + Math.random().toString(36).slice(2), frame = document.createElement('iframe'), done = false;
      function finish(err, list) {
        if (done) return; done = true;
        clearTimeout(timer); window.removeEventListener('message', onMsg); frame.remove();
        if (err) reject(err); else resolve(list);
      }
      function onMsg(e) {
        if (e.source !== frame.contentWindow || !e.data || e.data.st !== token) return;
        var doc = new DOMParser().parseFromString(String(e.data.html || ''), 'text/html'), out = [];
        var rows = doc.querySelectorAll('[class^="gr_custom_each_container"]');
        for (var i = 0; i < rows.length; i++) {
          var tl = rows[i].querySelector('[class^="gr_custom_title"]'), au = rows[i].querySelector('[class^="gr_custom_author"]');
          var title = tl ? String(tl.textContent || '').trim() : '';
          if (title) out.push({ title: title, author: au ? String(au.textContent || '').replace(/^\s*by\s+/i, '').trim() : '', shelf: shelf });
        }
        if (!e.data.ok || (!out.length && !/gr_custom_container/.test(String(e.data.html)))) { var er = new Error('widget'); er.feed = true; finish(er); } else finish(null, out);
      }
      var timer = setTimeout(function () { var er = new Error('blocked'); er.blocked = true; finish(er); }, NET_TIMEOUT + 3000);
      window.addEventListener('message', onMsg);
      frame.setAttribute('sandbox', 'allow-scripts'); frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
      frame.style.cssText = 'position:absolute;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
      frame.srcdoc = '<!doctype html><div id="gr_custom_widget_1"></div><script>function done(ok){var d=document.getElementById("gr_custom_widget_1");parent.postMessage({st:"' + token + '",ok:ok,html:(d&&d.innerHTML)||document.body.innerHTML},"*")}<\/script>' +
        '<script src="' + esc(SRC.grWidget(uid, grShelf)) + '" onload="done(true)" onerror="done(false)"><\/script>';
      document.body.appendChild(frame);
    });
  }
  function refreshGoodreads(uid) {
    var acc = [];
    return fetchShelf(uid, 'to-read', 'want', 1, acc)
      .then(function () { return fetchShelf(uid, 'currently-reading', 'reading', 1, acc).catch(function () { return acc; }); })
      .then(function () { return fetchShelf(uid, 'read', 'read', 1, acc).catch(function () { return acc; }); })
      .then(function () { var r = mergeBooks(acc, 'goodreads'); r.via = 'feed'; return r; }, function (feedErr) {
        var got = [];
        return widgetShelf(uid, 'to-read', 'want')
          .then(function (l) { got = got.concat(l); return widgetShelf(uid, 'currently-reading', 'reading').catch(function () { return []; }); })
          .then(function (l) { got = got.concat(l); return widgetShelf(uid, 'read', 'read').catch(function () { return []; }); })
          .then(function (l) { var r = mergeBooks(got.concat(l), 'goodreads'); r.via = 'widget'; r.count = got.length + l.length; return r; }, function (wErr) { throw wErr && wErr.feed ? wErr : feedErr; });
      });
  }

  /* ----- availability ----- */
  function rank(c) { return !c ? 9 : c.s === 'now' ? 0 : c.s === 'wait' ? 1 + Math.min(c.days == null ? 400 : c.days, 400) / 1000 : 9; }
  function pickFormats(book, items) {
    var out = { ebook: { s: 'none' }, audiobook: { s: 'none' } };
    var nb = norm(cleanTitle(book.title)), nm = norm(mainTitle(book.title)), sn = norm(surname(book.author));
    arr(items).forEach(function (it) {
      var ty = it && it.type && it.type.id;
      if (ty !== 'ebook' && ty !== 'audiobook') return;
      var nt = norm(it.title);
      if (!nt || !(nt === nb || nt === nm || (nm.length > 3 && nt.indexOf(nm + ' ') === 0) || (nt.length > 3 && nm.indexOf(nt + ' ') === 0))) return;
      if (sn) {
        var names = norm(it.firstCreatorName) + ' ' + arr(it.creators).map(function (c) { return norm(c && c.name); }).join(' ');
        if ((' ' + names + ' ').indexOf(' ' + sn + ' ') < 0) return;
      }
      var cand = null;
      if (it.isAvailable) cand = { s: 'now', id: String(it.id), copies: it.availableCopies | 0 };
      else if ((it.ownedCopies | 0) > 0 || it.isHoldable === true) cand = { s: 'wait', id: String(it.id), holds: it.holdsCount | 0, days: typeof it.estimatedWaitDays === 'number' ? it.estimatedWaitDays : null };
      if (cand && rank(cand) < rank(out[ty])) out[ty] = cand;
    });
    return out;
  }
  function checkOne(book, lib) {
    return fetchText(SRC.libSearch(lib.key, libbyQuery(book)), isJSON).then(function (txt) { return pickFormats(book, JSON.parse(txt).items); });
  }
  /* Best copy of each format across her libraries, and the book's overall colour. */
  function summarize(book, avail, libs) {
    var a = avail[book.id], out = { ebook: null, audiobook: null, overall: 'unknown', libsChecked: 0, complete: true };
    libs.forEach(function (l) {
      var r = a && a.by && a.by[l.key];
      if (!r) out.complete = false;
      if (!r || r.err) return;
      out.libsChecked++;
      ['ebook', 'audiobook'].forEach(function (f) {
        var c = r[f] || { s: 'none' };
        if (!out[f] || rank(c) < rank(out[f])) out[f] = { s: c.s, id: c.id, holds: c.holds, days: c.days, copies: c.copies, lib: l };
      });
    });
    if (out.libsChecked) {
      var best = Math.min.apply(null, wantedFormats().map(function (f) { return rank(out[f]); }));
      out.overall = best === 0 ? 'now' : best < 9 ? 'wait' : out.complete ? 'none' : 'unknown';   // red only once every library has answered
    }
    return out;
  }
  function waitText(c) {
    if (c.days == null) return c.holds ? c.holds + (c.holds === 1 ? ' hold' : ' holds') : 'holds queue';
    return c.days < 7 ? 'under 1 wk wait' : 'about ' + Math.round(c.days / 7) + ' wk wait';
  }
  var FMT_LABEL = { ebook: 'Ebook', audiobook: 'Audiobook' };
  var ST_LABEL = { now: 'Borrow now', wait: 'Holds queue', none: 'Not at your libraries', unknown: 'Not checked yet' };
  function pill(fmt, c, showLib, b, lib) {
    var label = FMT_LABEL[fmt];
    if (!c || c.s === 'none') return '<span class="av av--none">' + label + ' <small>not held</small></span>';
    var txt = c.s === 'now' ? 'borrow now' : waitText(c);
    return '<a class="av av--' + c.s + '" href="' + esc(SRC.libbyApp((c.lib || lib).key, libbyQuery(b), c.id)) + '" target="_blank" rel="noopener" title="Open in Libby">' + label + ' <small>' + esc(txt) + (showLib && c.lib ? ' · ' + esc(c.lib.name) : '') + '</small><span class="sr-only"> (opens in Libby)</span></a>';
  }
  function libbyQuery(b) { return mainTitle(b.title) + (b.author ? ' ' + surname(b.author) : ''); }
  /* A button per format that a library holds, each going to the best copy of that format.
     If neither is known (not checked, or not held), one button searches Libby at her first library. */
  function libbyButton(b, s, libs) {
    if (!libs.length) return '';
    var q = libbyQuery(b), out = '';
    ['ebook', 'audiobook'].forEach(function (f) {
      var c = s[f];
      if (c && c.s !== 'none' && c.id) out += '<a class="btn libby-btn" href="' + esc(SRC.libbyApp(c.lib.key, q, c.id)) + '" target="_blank" rel="noopener">' + icon('external', 'btn__ico') + 'Open ' + f + ' in Libby app</a>';
    });
    if (!out) out = '<a class="btn libby-btn" href="' + esc(SRC.libbyApp((prefLibs()[0] || libs[0]).key, q)) + '" target="_blank" rel="noopener">' + icon('external', 'btn__ico') + 'Search in Libby app</a>';
    return '<div class="book__fmts">' + out + '</div>';
  }
  function bookRow(b, avail, libs) {
    var s = summarize(b, avail, libs);
    return '<div class="book book--' + s.overall + '" data-book="' + esc(b.id) + '">' +
      '<a class="book__main" href="#/book/' + esc(b.id) + '"><h3>' + esc(b.title) + '</h3><p>' + esc(b.author || 'Unknown author') + ' · <span class="book__st">' + ST_LABEL[s.overall] + '</span></p></a>' +
      (s.overall === 'unknown' ? '' : '<div class="book__fmts">' + pill('ebook', s.ebook, libs.length > 1, b) + pill('audiobook', s.audiobook, libs.length > 1, b) + '</div>') +
      libbyButton(b, s, libs) +
    '</div>';
  }

  /* ----- the checker: two lookups at a time, a short pause after each, results saved as it goes.
     Smart check (the default) goes book by book: the library that had it last time first, then favourites, then the rest,
     and stops looking for that book as soon as a format she reads can be borrowed now. With many libraries this saves
     most of the lookups. A full check (full = true) asks every library. ----- */
  var job = null, lastCheckNote = '';
  function listBooks() { return getBooks().filter(function (b) { return b.shelf !== 'read'; }); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function startCheck(books, full) {
    if (job) return;
    var libs = getLibs(), avail = getAvail(), now = Date.now(), plan = [];
    function fresh(r) { return !!r && !r.err && now - (r.at || 0) <= STALE_MS; }
    books.forEach(function (b) {
      var by = (avail[b.id] && avail[b.id].by) || {};
      if (!full && libs.some(function (l) { return fresh(by[l.key]) && hasNow(by[l.key]); })) return;      // already known to be borrowable
      var todo = libs.map(function (l, i) { return [hasNow(by[l.key]) ? 0 : l.fav ? 1 : 2, i, l]; })
        .sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; }).map(function (x) { return x[2]; })
        .filter(function (l) { return full || !fresh(by[l.key]); });
      if (todo.length) plan.push({ b: b, libs: todo, i: 0 });
    });
    if (!plan.length) { lastCheckNote = 'Everything was checked in the last 6 hours. Use “Check every library” to look again now.'; paintJob(); return; }
    job = { total: plan.length, done: 0, looks: 0, failed: 0, saved: 0, blocked: false, stop: false, avail: avail };
    lastCheckNote = '';
    var bi = 0, active = 0;
    function finish() {
      if (!job) return;
      var j = job; job = null;
      store.set('avail', j.avail);
      lastCheckNote = j.blocked
        ? 'Storytime could not reach the library catalogue. Check your connection, then see “If checks fail” on the Bring in a list screen.'
        : 'Checked ' + plural(j.done, 'book', 'books') + ' (' + plural(j.looks, 'lookup', 'lookups') + ')' + (j.failed ? ', ' + j.failed + ' could not be reached' : '') + (j.stop ? ' (stopped early)' : '') + '.' +
          (j.saved ? ' Skipped ' + plural(j.saved, 'lookup', 'lookups') + ' for books already found to borrow now.' : '');
      var k = currentKey();
      if (k === 'books' || k === 'home' || k === 'book' || k === 'finished') route({ keepScroll: true });
    }
    function lane() {
      if (!job) return;
      if (job.stop || bi >= plan.length) { if (!active) finish(); return; }
      active++; step(plan[bi++]);
    }
    function step(p) {
      if (job.stop || p.i >= p.libs.length) {
        if (p.i >= p.libs.length) job.done++;
        active--; paintJob(); lane(); return;
      }
      var lib = p.libs[p.i++];
      checkOne(p.b, lib).then(function (f) { return f; }, function () { job.failed++; return { err: true }; }).then(function (f) {
        f.at = Date.now();
        var a = job.avail[p.b.id] || (job.avail[p.b.id] = { by: {} });
        if (!f.err || !a.by[lib.key]) a.by[lib.key] = f;       // a failed recheck keeps the older answer
        job.looks++;
        if (job.looks >= 3 && job.failed === job.looks) { job.stop = true; job.blocked = true; }
        if (job.looks % 8 === 0) store.set('avail', job.avail);
        if (!full && hasNow(f)) { job.saved += p.libs.length - p.i; p.i = p.libs.length; }      // found: stop looking for this book
        paintJob(); paintBook(p.b.id, job.avail);
        setTimeout(function () { step(p); }, GAP_MS);
      });
    }
    paintJob(); lane(); setTimeout(lane, GAP_MS / 2);
  }
  function jobHTML() {
    if (job) {
      var pct = Math.round(100 * job.done / job.total);
      return '<p class="status-line">Checking book ' + Math.min(job.done + 1, job.total) + ' of ' + job.total + '… <button type="button" class="link-btn" data-act="stop">Stop</button></p><div class="meter__bar"><span style="width:' + pct + '%"></span></div>';
    }
    return lastCheckNote ? '<p class="status-line">' + esc(lastCheckNote) + '</p>' : '';
  }
  function paintJob() {
    var el = document.getElementById('chk');
    if (el) el.innerHTML = jobHTML();
    var btns = document.querySelectorAll('[data-act="check"],[data-act="check-all"],[data-act="check-one"],[data-act="check-read"]');
    for (var i = 0; i < btns.length; i++) btns[i].disabled = !!job;
  }
  function paintBook(id, avail) {
    var el = main.querySelector('.book[data-book="' + id + '"]'), b = el && findBook(id);
    if (b) el.outerHTML = bookRow(b, avail, getLibs());
  }

  /* ----- screens ----- */
  NAV.splice(1, 1,
    { label: 'My books', href: '#/books', icon: 'book', group: 'Reading' },
    { label: 'Read', href: '#/finished', icon: 'check', group: 'Reading' },
    { label: 'My libraries', href: '#/libraries', icon: 'library', group: 'Set up' },
    { label: 'Bring in a list', href: '#/import', icon: 'download', group: 'Set up' }
  );
  TITLES.books = 'My books'; TITLES.finished = 'Read'; TITLES.libraries = 'My libraries'; TITLES['import'] = 'Bring in a list'; TITLES.book = 'Book';

  function rebuildIndex() {
    SEARCH_INDEX.length = 0;
    getBooks().forEach(function (b) { SEARCH_INDEX.push({ title: b.title, text: (b.author || '') + (b.shelf === 'read' ? ' · read' : ''), href: '#/book/' + b.id, kind: 'Book' }); });
    getLibs().forEach(function (l) { SEARCH_INDEX.push({ title: l.name, text: 'Library · ' + l.key, href: '#/libraries', kind: 'Library' }); });
    SEARCH_INDEX.push(
      { title: 'My books', text: 'Reading list, borrow now, holds queue, availability, check my libraries, check every library', href: '#/books', kind: 'Screen' },
      { title: 'Read', text: 'Books you have read or finished, reread, availability, update Goodreads or StoryGraph, export', href: '#/finished', kind: 'Screen' },
      { title: 'My libraries', text: 'Add or remove the libraries you use in Libby, find your library code, library code checker, favourite libraries, ebooks or audiobooks', href: '#/libraries', kind: 'Screen' },
      { title: 'Bring in a list', text: 'Goodreads profile link, Goodreads export, StoryGraph export, CSV, add a book, relay', href: '#/import', kind: 'Screen' });    bkPaint();   // keep the backup panel's count in step
  }
  rebuildIndex();

  function counts(books, avail, libs) {
    var c = { now: 0, wait: 0, none: 0, unknown: 0 };
    books.forEach(function (b) { c[summarize(b, avail, libs).overall]++; });
    return c;
  }
  var LEGEND = '<p class="legend"><span class="av av--now">Green <small>borrow now</small></span><span class="av av--wait">Orange <small>holds queue</small></span><span class="av av--none">Red <small>not at your libraries</small></span></p>';

  VIEWS.home = function () {
    var books = listBooks(), libs = getLibs(), avail = getAvail(), c = counts(books, avail, libs);
    var ready = books.length && libs.length;
    var body;
    if (!ready) {
      body = '<h2 class="home__h">Two steps to start</h2>' +
        '<a class="row" href="#/import"><span class="row__num">' + (books.length ? '✓' : '1') + '</span><span><h3>Bring in your reading list</h3><p>' + (books.length ? books.length + ' books on your list.' : 'From Goodreads or StoryGraph, or add books by hand.') + '</p></span><span></span></a><p></p>' +
        '<a class="row" href="#/libraries"><span class="row__num">' + (libs.length ? '✓' : '2') + '</span><span><h3>Add your libraries</h3><p>' + (libs.length ? libs.length + (libs.length === 1 ? ' library added.' : ' libraries added.') : 'The same ones you use in Libby.') + '</p></span><span></span></a>';
    } else {
      body = '<div class="stats">' +
          '<a class="stat stat--now" href="#/books/now"><strong>' + c.now + '</strong><span>Borrow now</span></a>' +
          '<a class="stat stat--wait" href="#/books/wait"><strong>' + c.wait + '</strong><span>Holds queue</span></a>' +
          '<a class="stat stat--none" href="#/books/none"><strong>' + c.none + '</strong><span>Not at your libraries</span></a>' +
          (c.unknown ? '<a class="stat" href="#/books/unknown"><strong>' + c.unknown + '</strong><span>Not checked yet</span></a>' : '') +
        '</div>' +
        '<div class="actions"><button type="button" class="btn btn--solid" data-act="check">Check my libraries</button><a class="btn" href="#/books">See my books</a></div><div id="chk">' + jobHTML() + '</div>';
    }
    var latest = CHANGELOG[0];
    return '<section class="hero"><div class="wrap hero__inner"><h1>' + esc(APP_NAME) + '</h1>' +
        '<p class="hero__lead">Bring in your Goodreads or StoryGraph list, add the libraries you use in Libby, and see which books you can borrow right now.</p></div></section>' +
      '<div class="wrap home">' + body +
        '<a class="card news-strip" href="#/whats-new"><span class="badge" data-badge="news" hidden></span><strong>' + esc(t('nav.whatsNew')) + '</strong>' +
          (latest ? '<span class="muted">' + esc(tf('home.latest', { title: latest.title, version: latest.version })) + '</span>' : '') + '</a></div>';
  };

  var FILTERS = [['all', 'All'], ['now', 'Borrow now'], ['wait', 'Holds queue'], ['none', 'Not at libraries'], ['unknown', 'Not checked']];
  var ORDER = { now: 0, wait: 1, none: 2, unknown: 3 };
  VIEWS.books = function (filter) {
    var books = listBooks(), libs = getLibs(), avail = getAvail();
    if (!ORDER.hasOwnProperty(filter)) filter = 'all';
    var head = '<div class="wrap page"><header class="page__head"><h1>My books</h1><p>' + books.length + (books.length === 1 ? ' book' : ' books') + ' to read, checked at ' + libs.length + (libs.length === 1 ? ' library' : ' libraries') + '. Tap a coloured button to open that book in Libby.</p></header>';
    if (!books.length) return head + '<div class="empty"><h2>No books yet</h2><p>Bring in your Goodreads or StoryGraph list, or add a book by hand.</p><p><a class="btn btn--solid" href="#/import">Bring in a list</a></p></div></div>';
    if (!libs.length) head += '<div class="callout"><p class="callout__title">Add a library</p>Storytime needs at least one library to check. <a href="#/libraries">Add your libraries</a>.</div>';
    var rows = books.map(function (b) { return { b: b, s: summarize(b, avail, libs) }; });
    var shown = rows.filter(function (r) { return filter === 'all' || r.s.overall === filter; });
    shown.sort(function (x, y) {
      return (ORDER[x.s.overall] - ORDER[y.s.overall]) || (Math.min(rank(x.s.ebook), rank(x.s.audiobook)) - Math.min(rank(y.s.ebook), rank(y.s.audiobook))) || norm(x.b.title).localeCompare(norm(y.b.title));
    });
    return head +
      '<div class="actions"><button type="button" class="btn btn--solid" data-act="check"' + (libs.length ? '' : ' disabled') + '>Check my libraries</button><button type="button" class="link-btn" data-act="check-all"' + (libs.length ? '' : ' disabled') + '>Check every library (slower)</button></div>' +
      '<div id="chk">' + jobHTML() + '</div>' + LEGEND +
      '<div class="filters" role="group" aria-label="Show">' + FILTERS.map(function (f) {
        var n = f[0] === 'all' ? rows.length : rows.filter(function (r) { return r.s.overall === f[0]; }).length;
        return '<a class="filter" href="#/books/' + f[0] + '"' + (filter === f[0] ? ' aria-current="true"' : '') + '>' + f[1] + ' ' + n + '</a>';
      }).join('') + '</div>' +
      (shown.length ? shown.map(function (r) { return bookRow(r.b, avail, libs); }).join('') : '<div class="empty"><p>No books in this group.</p></div>') + '</div>';
  };
  AFTER.books = paintJob; AFTER.finished = paintJob; AFTER.home = paintJob; AFTER.book = paintJob;

  function cell(fmt, c, lib, b) {
    if (!c || c.s === 'none') return '<span class="av av--none">' + FMT_LABEL[fmt] + ' <small>not held</small></span>';
    return pill(fmt, c, false, b, lib) + ' <a class="cell-link" href="' + esc(SRC.libSite(lib.key, c.id)) + '" target="_blank" rel="noopener">Library website</a>';
  }
  VIEWS.book = function (id) {
    var b = findBook(id);
    if (!b) return missingView();
    var libs = getLibs(), avail = getAvail(), s = summarize(b, avail, libs), a = avail[b.id], done = b.shelf === 'read';
    var perLib = libs.map(function (l) {
      var r = a && a.by && a.by[l.key];
      return '<div class="card libcard"><h3>' + esc(l.name) + '</h3>' + (!r ? '<p class="muted">Not checked yet' + (s.overall === 'now' ? ': a copy to borrow now was found first' : '') + '.</p>' : r.err ? '<p class="muted">Could not be reached last time.</p>' :
        '<div class="book__fmts">' + cell('ebook', r.ebook, l, b) + '</div><div class="book__fmts">' + cell('audiobook', r.audiobook, l, b) + '</div>') + '</div>';
    }).join('');
    var when = a && a.by ? Math.max.apply(null, Object.keys(a.by).map(function (k) { return a.by[k].at || 0; }).concat([0])) : 0;
    return '<div class="wrap page"><p class="crumb"><a href="#/' + (done ? 'finished' : 'books') + '">' + (done ? 'Read' : 'My books') + '</a> / Book</p>' +
      '<header class="page__head"><h1>' + esc(b.title) + '</h1><p>' + esc(b.author || 'Unknown author') + (done ? ' · Read' + (b.doneAt ? ' ' + esc(b.doneAt) : '') : '') + '</p></header>' +
      (done && b.local ? '<div class="callout callout--good"><p class="callout__title">Finished</p>Goodreads and StoryGraph do not let other apps change your shelves, so update them with one tap each: ' +
          '<span class="actions"><a class="btn" href="' + esc(SRC.grBook(b)) + '" target="_blank" rel="noopener">Open on Goodreads</a><a class="btn" href="' + esc(SRC.sgBook(b)) + '" target="_blank" rel="noopener">Find on StoryGraph</a></span></div>'
        : '') + '<p class="legend"><span class="av av--' + s.overall + '">' + ST_LABEL[s.overall] + '</span></p>' +
      ((libs.length ? '<h2>At your libraries</h2>' + perLib + (when ? '<p class="muted">Last checked ' + esc(bkDate(new Date(when).toISOString())) + '.</p>' : '') : '<div class="callout">No libraries yet. <a href="#/libraries">Add your libraries</a>.</div>') +
        '<div class="actions"><button type="button" class="btn" data-act="check-one" data-id="' + esc(b.id) + '"' + (libs.length ? '' : ' disabled') + '>Check every library for this book</button></div><div id="chk">' + jobHTML() + '</div>') +
      libbyButton(b, s, libs) +
      '<h2>Your shelf</h2><div class="actions">' +
        (done ? '<button type="button" class="btn" data-act="unfinish" data-id="' + esc(b.id) + '">Move back to my list</button>' + (b.local ? '' : '<a class="btn" href="' + esc(SRC.grBook(b)) + '" target="_blank" rel="noopener">Goodreads page</a><a class="btn" href="' + esc(SRC.sgBook(b)) + '" target="_blank" rel="noopener">StoryGraph</a>')
              : '<button type="button" class="btn btn--solid" data-act="finish" data-id="' + esc(b.id) + '">Mark as finished</button><a class="btn" href="' + esc(SRC.grBook(b)) + '" target="_blank" rel="noopener">Goodreads page</a><a class="btn" href="' + esc(SRC.sgBook(b)) + '" target="_blank" rel="noopener">StoryGraph</a>') +
        '<button type="button" class="link-btn" data-act="remove" data-id="' + esc(b.id) + '">Remove from Storytime</button></div></div>';
  };

  VIEWS.finished = function () {
    var libs = getLibs(), avail = getAvail();
    var rows = getBooks().filter(function (b) { return b.shelf === 'read'; }).map(function (b) { return { b: b, s: summarize(b, avail, libs) }; });
    rows.sort(function (x, y) { return (ORDER[x.s.overall] - ORDER[y.s.overall]) || String(y.b.doneAt || '').localeCompare(String(x.b.doneAt || '')) || norm(x.b.title).localeCompare(norm(y.b.title)); });
    var head = '<div class="wrap page"><header class="page__head"><h1>Read</h1><p>' + rows.length + (rows.length === 1 ? ' book' : ' books') + ' you have read. Check them at your libraries when you want to reread one.</p></header>';
    if (!rows.length) return head + '<div class="empty"><h2>Nothing here yet</h2><p>Bring in your Read shelf, or open a book and choose “Mark as finished”.</p><p><a class="btn btn--solid" href="#/import">Bring in a list</a></p></div></div>';
    return head + '<div class="actions"><button type="button" class="btn btn--solid" data-act="check-read"' + (libs.length ? '' : ' disabled') + '>Check for rereading</button><button type="button" class="link-btn" data-act="export-finished">Export this list (CSV)</button></div>' +
      '<div id="chk">' + jobHTML() + '</div>' + (libs.length ? '' : '<div class="callout">No libraries yet. <a href="#/libraries">Add your libraries</a>.</div>') + LEGEND +
      rows.map(function (r) { return bookRow(r.b, avail, libs); }).join('') + '</div>';
  };

  /* ----- library finder: the catalogue has no search-by-name, so the whole list of libraries (about 13,000 names and codes)
     is downloaded once on this device, a few pages at a time, and kept for 30 days. Searching works while it loads. ----- */
  var DIR = { list: [], total: 0, state: 'idle', built: '' }, DIR_CACHE = 'stlibs-v1', DIR_DAYS = 30, libQuery = '';
  function dirAdd(items) {
    arr(items).forEach(function (it) {
      var key = String((it && (it.preferredKey || it.id)) || (Array.isArray(it) ? it[0] : '')).toLowerCase();
      var name = String((it && it.name) || (Array.isArray(it) ? it[1] : '') || '').replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!/^[a-z0-9-]+$/.test(key) || !name || (it && it.status && it.status !== 'Live')) return;
      DIR.list.push([key, name, norm(name)]);
    });
  }
  function dirSave() {
    if (!window.caches) return;
    var body = JSON.stringify({ at: Date.now(), libraries: DIR.list.map(function (l) { return [l[0], l[1]]; }) });
    caches.open(DIR_CACHE).then(function (c) { return c.put('libraries', new Response(body, { headers: { 'Content-Type': 'application/json' } })); }).catch(function () {});
  }
  function dirFromCache() {
    if (!window.caches) return Promise.resolve(false);
    return caches.open(DIR_CACHE).then(function (c) { return c.match('libraries'); }).then(function (res) { return res ? res.json() : null; }).then(function (d) {
      if (!d || !Array.isArray(d.libraries) || d.libraries.length < 500 || Date.now() - (d.at || 0) > DIR_DAYS * 864e5) return false;
      dirAdd(d.libraries); return true;
    }).catch(function () { return false; });
  }
  function dirFromRepo() {      // present only if the repo's optional "Update library list" workflow is switched on
    return fetch('data/libraries.json', { cache: 'no-cache' }).then(function (res) { return res.ok ? res.json() : null; }).then(function (d) {
      if (!d || !Array.isArray(d.libraries) || d.libraries.length < 500) return false;
      dirAdd(d.libraries); return true;
    }).catch(function () { return false; });
  }
  function dirFromCatalogue() {
    return fetchText(SRC.libList(1), isJSON).then(function (txt) {
      var d = JSON.parse(txt), size = arr(d.items).length;
      dirAdd(d.items); DIR.total = d.totalItems | 0; paintFinder();
      var pages = size ? Math.min(Math.ceil(DIR.total / size), 1500) : 1, next = 2, active = 0, failed = 0;
      if (pages < 2) return;
      return new Promise(function (resolve) {
        function lane() {
          if (next > pages || failed > 5) { if (!active) resolve(); return; }
          var pg = next++; active++;
          fetchText(SRC.libList(pg), isJSON).then(function (t) { dirAdd(JSON.parse(t).items); }, function () { failed++; })
            .then(function () { active--; paintFinder(); setTimeout(lane, 60); });
        }
        for (var i = 0; i < 4; i++) lane();
      }).then(function () { if (failed > 5) { var e = new Error('partial'); throw e; } });
    });
  }
  function dirLoad() {
    if (DIR.state !== 'idle') return;
    DIR.state = 'loading'; paintFinder();
    dirFromCache().then(function (ok) { return ok || dirFromRepo(); }).then(function (ok) {
      if (ok) return;
      return dirFromCatalogue().then(function () { dirSave(); });
    }).then(function () { DIR.state = 'ready'; }, function () { DIR.state = DIR.list.length ? 'partial' : 'error'; }).then(paintFinder);
  }
  function dirSearch(q) {
    var words = norm(q).split(' ').filter(Boolean), nq = norm(q), raw = String(q).trim().toLowerCase();
    if (!words.length) return [];
    var hits = [];
    for (var i = 0; i < DIR.list.length; i++) {
      var l = DIR.list[i], hay = ' ' + l[2] + ' ' + l[0], ok = true;
      for (var w = 0; w < words.length; w++) if (hay.indexOf(words[w]) < 0) { ok = false; break; }
      if (ok) hits.push([l[0] === raw ? 0 : l[2] === nq ? 1 : l[2].indexOf(nq) === 0 ? 2 : (' ' + l[2]).indexOf(' ' + nq) > -1 ? 3 : 4, l]);
    }
    hits.sort(function (x, y) { return x[0] - y[0] || x[1][2].length - y[1][2].length || x[1][1].localeCompare(y[1][1]); });
    return hits.slice(0, 25).map(function (h) { return h[1]; });
  }
  function finderHTML() {
    var st = '', res = '';
    if (DIR.state === 'loading') st = DIR.total ? 'Loading the list of libraries: ' + DIR.list.length.toLocaleString() + ' of about ' + DIR.total.toLocaleString() + '. You can search while it loads.' : 'Loading the list of libraries…';
    else if (DIR.state === 'error') st = 'The list of libraries could not be loaded. Check your connection and try again, or type the code below.';
    else if (DIR.state === 'partial') st = 'Only part of the list loaded (' + DIR.list.length.toLocaleString() + ' libraries). If yours is missing, try again later.';
    if (libQuery.trim() && DIR.list.length) {
      var have = {}, hits = dirSearch(libQuery);
      getLibs().forEach(function (l) { have[l.key] = 1; });
      res = hits.length ? hits.map(function (l) {
        return '<div class="found"><span><strong>' + esc(l[1]) + '</strong><small>Code: ' + esc(l[0]) + '</small></span>' +
          (have[l[0]] ? '<span class="muted">Added</span>' : '<button type="button" class="btn" data-act="lib-add" data-id="' + esc(l[0]) + '" data-name="' + esc(l[1]) + '">Add<span class="sr-only"> ' + esc(l[1]) + '</span></button>') + '</div>';
      }).join('') + (hits.length === 25 ? '<p class="muted">Showing the first 25. Type more of the name to narrow it down.</p>' : '')
        : (DIR.state === 'loading' ? '' : '<p class="muted">No library matches “' + esc(libQuery.trim()) + '”. Try fewer words, or the town or county name.</p>');
    }
    return '<p class="status-line' + (DIR.state === 'error' ? ' is-error' : '') + '" role="status" aria-live="polite">' + esc(st) + '</p>' + res;
  }
  function paintFinder() { var el = document.getElementById('lib-results'); if (el) el.innerHTML = finderHTML(); }
  main.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'lib-find') return;
    libQuery = e.target.value;
    if (libQuery.trim()) dirLoad();
    paintFinder();
  });
  main.addEventListener('submit', function (e) { if (e.target.getAttribute && e.target.getAttribute('data-form') === 'find-lib') e.preventDefault(); });

  VIEWS.libraries = function () {
    var libs = prefLibs();
    return '<div class="wrap page"><header class="page__head"><h1>My libraries</h1><p>Add each library you have a card for in Libby. Storytime looks in your favourites first and stops looking for a book once you can borrow it.</p></header>' +
      (libs.length ? libs.map(function (l) {
        return '<div class="card libcard"><h3>' + (l.fav ? '<span class="fav-star" aria-hidden="true">★ </span>' : '') + esc(l.name) + '</h3><p class="muted">Code: ' + esc(l.key) + (l.fav ? ' · Favourite, checked first' : '') + '</p><div class="actions">' +
          '<button type="button" class="btn" data-act="lib-fav" data-id="' + esc(l.key) + '" aria-pressed="' + (l.fav ? 'true' : 'false') + '">' + (l.fav ? '★ Favourite' : '☆ Make favourite') + '</button><a class="btn" href="https://libbyapp.com/library/' + esc(encodeURIComponent(l.key)) + '" target="_blank" rel="noopener">Open in Libby</a><button type="button" class="link-btn" data-act="lib-remove" data-id="' + esc(l.key) + '">Remove</button></div></div>';
      }).join('') : '<div class="empty"><p>No libraries yet.</p></div>') +
      '<h2>What you read</h2><div class="card">' + segGroup('fmt', 'Formats to look for', [['any', 'Either'], ['ebook', 'Ebooks only'], ['audiobook', 'Audiobooks only']], getSettings().fmt) +
        '<p class="muted" style="margin:10px 0 0">A book turns green when this format can be borrowed now. Both formats are still shown on each book.</p></div>' +
      '<h2>Find your library</h2><form class="card" data-form="find-lib"><div class="field"><label for="lib-find">Library name, town or county</label>' +
        '<input id="lib-find" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="e.g. Seattle Public Library" value="' + esc(libQuery) + '">' +
        '<small>Shows each matching library with its Libby code. The first search downloads the list of libraries, which takes a few seconds.</small></div>' +
        '<div id="lib-results">' + finderHTML() + '</div></form>' +
      '<h2>Add by code</h2><form class="card" data-form="add-lib"><div class="field"><label for="lib-in">Library codes or web addresses</label>' +
        '<input id="lib-in" name="lib" type="text" inputmode="url" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="e.g. nypl, brooklyn" required>' +
        '<small>The code is the first part of your library’s OverDrive web address, <strong>code</strong>.overdrive.com. It is usually a short form of the name: New York Public Library is <strong>nypl</strong>, Brooklyn Public Library is <strong>brooklyn</strong>. Several at once is fine: separate them with commas. Not sure of one? Search the web for your library’s name plus “OverDrive” and paste the address here.</small></div>' +
        '<div class="actions"><button type="submit" class="btn btn--solid">Add library</button></div><p class="status-line" id="lib-status" role="status" aria-live="polite"></p></form></div>';
  };

  VIEWS['import'] = function () {
    var s = getSettings(), n = getBooks().length;
    return '<div class="wrap page"><header class="page__head"><h1>Bring in a list</h1><p>' + (n ? n + ' books in Storytime now. Bringing a list in again only adds what is new.' : 'Pick whichever is easiest. You can use more than one.') + '</p></header>' +
      '<h2>Goodreads profile link</h2><form class="card" data-form="gr-link"><div class="field"><label for="gr-in">Your Goodreads profile address or user number</label>' +
        '<input id="gr-in" name="gr" type="text" inputmode="url" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="https://www.goodreads.com/user/show/12345678-name" value="' + esc(s.grUser) + '">' +
        '<small>Connect once, then tap Refresh whenever you add books on Goodreads. Reads your Want to Read, Currently Reading and Read shelves. Your profile must be visible to everyone, and no password is needed.</small></div>' +
        '<div class="actions"><button type="submit" class="btn btn--solid">' + (s.grUser ? 'Refresh from Goodreads' : 'Connect Goodreads') + '</button></div><p class="status-line" id="gr-status" role="status" aria-live="polite"></p></form>' +
      '<h2>Goodreads or StoryGraph export file</h2><div class="card"><p>Works with private profiles and needs no connection.</p><ul class="prose"><li><strong>Goodreads:</strong> My Books → Tools → Import and export → Export Library.</li><li><strong>StoryGraph:</strong> Manage Account → Manage Your Data → Export StoryGraph Library.</li></ul>' +
        '<div class="actions"><input type="file" id="csv-file" class="sr-only" accept=".csv,text/csv"><label class="btn btn--solid" for="csv-file">Choose the CSV file</label></div><p class="status-line" id="csv-status" role="status" aria-live="polite"></p></div>' +
      '<h2>Add one book</h2><form class="card" data-form="add-book"><div class="field"><label for="ab-t">Title</label><input id="ab-t" name="title" type="text" autocomplete="off" required></div>' +
        '<div class="field"><label for="ab-a">Author</label><input id="ab-a" name="author" type="text" autocomplete="off"></div>' +
        '<div class="actions"><button type="submit" class="btn">Add book</button></div><p class="status-line" id="ab-status" role="status" aria-live="polite"></p></form>' +
      '<h2>If checks fail</h2><form class="card" data-form="relay"><p>Storytime asks Goodreads and the library catalogue directly. Goodreads refuses requests from web pages, so that one goes through a relay: a small service that fetches the public page and hands it back. Storytime tries three public relays in turn, then Goodreads’ own shelf widget. A relay sees which public shelf and which titles are looked up, nothing else.</p>' +
        '<div class="field"><label for="relay-in">Your own relay (optional)</label><input id="relay-in" name="relay" type="text" inputmode="url" autocapitalize="none" autocomplete="off" spellcheck="false" value="' + esc(s.relay) + '">' +
        '<small>Leave empty to use the public relays. Your own is tried first and is more dependable; relay/worker.js in the app’s GitHub repo explains how to set one up for free.</small></div>' +
        '<div class="actions"><button type="submit" class="btn">Save</button><button type="button" class="link-btn" data-act="relay-reset">Clear</button></div><p class="status-line" id="relay-status" role="status" aria-live="polite"></p></form>' +
      (n ? '<h2>Start over</h2><div class="actions"><button type="button" class="link-btn" data-act="clear-books">Remove all books from Storytime</button></div>' : '') + '</div>';
  };

  /* ----- actions ----- */
  function say(id, msg, isErr) { var el = document.getElementById(id); if (el) { el.textContent = msg || ''; el.classList.toggle('is-error', !!isErr); } }
  function mergedMsg(r) { return (r.added ? 'Added ' + r.added + (r.added === 1 ? ' book' : ' books') : 'No new books') + (r.updated ? ', updated ' + r.updated : '') + '.'; }
  function csvCell(v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function exportFinished() {
    var rows = [['Title', 'Author', 'ISBN13', 'Date Read', 'Bookshelves', 'Exclusive Shelf']];
    getBooks().forEach(function (b) { if (b.shelf === 'read') rows.push([b.title, b.author, b.isbn, String(b.doneAt || '').replace(/-/g, '/'), 'read', 'read']); });
    var url = URL.createObjectURL(new Blob([rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n')], { type: 'text/csv' }));
    var a = document.createElement('a');
    a.href = url; a.download = 'storytime-finished-' + today() + '.csv'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function updateBook(id, fn) { var books = getBooks(); books.forEach(function (b) { if (b.id === id) fn(b); }); saveBooks(books); }
  main.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el || el.disabled) return;
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    if (act === 'check') startCheck(listBooks(), false);
    else if (act === 'check-read') startCheck(getBooks().filter(function (b) { return b.shelf === 'read'; }), false);
    else if (act === 'check-all') startCheck(listBooks(), true);
    else if (act === 'check-one') { var one = findBook(id); if (one) startCheck([one], true); }
    else if (act === 'stop') { if (job) job.stop = true; }
    else if (act === 'finish') { updateBook(id, function (b) { b.shelf = 'read'; b.doneAt = today(); b.local = true; }); route({ keepScroll: true }); }
    else if (act === 'unfinish') { updateBook(id, function (b) { b.shelf = 'want'; b.doneAt = ''; b.local = true; }); route({ keepScroll: true }); }
    else if (act === 'remove') {
      if (!window.confirm('Remove this book from Storytime? Your Goodreads and StoryGraph shelves are not touched.')) return;
      saveBooks(getBooks().filter(function (b) { return b.id !== id; }));
      var av = getAvail(); delete av[id]; store.set('avail', av);
      location.hash = '#/books';
    }
    else if (act === 'lib-add') {
      var ls = getLibs(), nm = el.getAttribute('data-name') || id;
      if (/^[a-z0-9-]+$/.test(id) && !ls.some(function (l) { return l.key === id; })) { ls.push({ key: id, name: nm.slice(0, 120) }); store.set('libs', ls); rebuildIndex(); route({ keepScroll: true }); }
    }
    else if (act === 'lib-fav') {
      var fl = getLibs(); fl.forEach(function (l) { if (l.key === id) { if (l.fav) delete l.fav; else l.fav = true; } });
      store.set('libs', fl); route({ keepScroll: true });
      var again = main.querySelector('[data-act="lib-fav"][data-id="' + id + '"]'); if (again) again.focus();
    }
    else if (act === 'lib-remove') {
      if (!window.confirm('Remove this library from Storytime?')) return;
      store.set('libs', getLibs().filter(function (l) { return l.key !== id; })); rebuildIndex(); route({ keepScroll: true });
    }
    else if (act === 'clear-books') {
      if (!window.confirm('Remove every book from Storytime on this device? Your Goodreads and StoryGraph shelves are not touched.')) return;
      saveBooks([]); store.set('avail', {}); route();
    }
    else if (act === 'relay-reset') { setSetting('relay', ''); route({ keepScroll: true }); }
    else if (act === 'export-finished') exportFinished();
  });
  main.addEventListener('submit', function (e) {
    var f = e.target.getAttribute ? e.target.getAttribute('data-form') : null;
    if (!f) return;
    e.preventDefault();
    var btn = e.target.querySelector('button[type="submit"]');
    function busy(v) { if (btn) btn.disabled = v; }
    if (f === 'add-lib') {
      var keys = [], badInput = [];
      String(e.target.lib.value || '').toLowerCase().split(/[\s,;]+/).forEach(function (raw) {
        if (!raw) return;
        var m = /libbyapp\.com\/library\/([a-z0-9-]+)/.exec(raw) || /^(?:https?:\/\/)?([a-z0-9-]+)\.(?:lib\.)?overdrive\.com/.exec(raw) || /^([a-z0-9-]+)$/.exec(raw);
        if (!m) badInput.push(raw); else if (keys.indexOf(m[1]) < 0) keys.push(m[1]);
      });
      if (!keys.length) { say('lib-status', 'That does not look like a library code or address.', true); return; }
      var added = [], notFound = badInput.slice(), unreachable = [], i = 0;
      busy(true);
      (function nextLib() {
        if (i >= keys.length) {
          rebuildIndex(); route({ keepScroll: true });
          say('lib-status', (added.length ? 'Added ' + added.join(', ') + '. ' : '') + (notFound.length ? 'No library uses: ' + notFound.join(', ') + '. ' : '') + (unreachable.length ? 'Could not reach the catalogue for: ' + unreachable.join(', ') + '. Check your connection and try those again.' : '') || 'Those libraries are already on your list.', !!(notFound.length || unreachable.length));
          return;
        }
        var key = keys[i++];
        say('lib-status', 'Looking up ' + key + ' (' + i + ' of ' + keys.length + ')…');
        if (getLibs().some(function (l) { return l.key === key; })) { nextLib(); return; }
        fetchText(SRC.libInfo(key), isJSON).then(function (txt) {
          var d = JSON.parse(txt), k = String(d.preferredKey || d.id || key).toLowerCase(), libs = getLibs();
          if (!libs.some(function (l) { return l.key === k; })) { libs.push({ key: k, name: String(d.name || k).slice(0, 120) }); store.set('libs', libs); added.push(String(d.name || k)); }
        }, function (err) { (err && (err.status === 404 || err.status === 400) ? notFound : unreachable).push(key); }).then(function () { setTimeout(nextLib, GAP_MS); });
      })();
    } else if (f === 'gr-link') {
      var uid = grUserId(e.target.gr.value);
      if (!uid) { say('gr-status', 'Paste the address of your Goodreads profile page. It contains a number, like /user/show/12345678.', true); return; }
      say('gr-status', 'Reading your Goodreads shelves…'); busy(true);
      refreshGoodreads(uid).then(function (r) { setSetting('grUser', uid); route({ keepScroll: true }); say('gr-status', mergedMsg(r) + (r.via === 'widget' ? ' Goodreads only shares the most recent books on each shelf this way (' + r.count + ' found); use the export file below for the full list.' : '')); }).catch(function (err) {
        busy(false);
        say('gr-status', err && err.feed ? 'Goodreads did not return a shelf. Make sure your profile is visible to everyone, or use the export file below.'
          : err && err.blocked ? 'Goodreads could not be reached by any route just now. Use the export file below; it always works.'
          : 'Goodreads could not be read (' + (err && err.status ? 'error ' + err.status : 'no answer') + '). Try again later, or use the export file below.', true);
      });
    } else if (f === 'add-book') {
      var title = String(e.target.title.value || '').trim();
      if (!title) return;
      var r = mergeBooks([{ title: title, author: String(e.target.author.value || '').trim(), shelf: 'want' }], 'manual');
      route({ keepScroll: true }); say('ab-status', r.added ? 'Added “' + title + '”.' : 'That book is already on your list.');
    } else if (f === 'relay') {
      var v = String(e.target.relay.value || '').trim();
      if (v && !/^https:\/\/\S+$/.test(v)) { say('relay-status', 'A relay address must start with https://', true); return; }
      setSetting('relay', v); directBlocked = {}; say('relay-status', v ? 'Saved.' : 'Saved. The public relays will be used.');
    }
  });
  main.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'fmt') { setSetting('fmt', e.target.value); return; }
    if (!e.target || e.target.id !== 'csv-file') return;
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onerror = function () { say('csv-status', 'That file could not be read.', true); };
    reader.onload = function () {
      var got = booksFromCSV(reader.result);
      if (!got) { say('csv-status', 'That is not a Goodreads or StoryGraph export. Look for a .csv file with Title and shelf columns.', true); return; }
      var r = mergeBooks(got.books, got.source);
      route({ keepScroll: true });
      say('csv-status', (got.source === 'storygraph' ? 'StoryGraph' : 'Goodreads') + ' file read. ' + mergedMsg(r));
    };
    reader.readAsText(file);
  });
  /* test hook: lets the QA script exercise matching without the network */
  window.__storytime = { pickFormats: pickFormats, booksFromCSV: booksFromCSV, grUserId: grUserId, norm: norm };

  /* ===== Study-app features (flashcards, quiz, spaced repetition) are intentionally NOT included.
     Copy them from the Stahl / DSMVapp repos or /tmp/isaymotion-extract/js-patterns.md section 8 when needed. ===== */

  /* ===== Router ===== */
  function parts() {
    var h = location.hash.replace(/^#\/?/, '');
    return h.split('/').filter(Boolean).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
  }
  function titleFor(key) {
    if (has(TITLES, key)) return TITLES[key];
    if (has(SHELL_TITLES, key)) return t(SHELL_TITLES[key]);
    for (var i = 0; i < NAV.length; i++) if (NAV[i].href === '#/' + key) return navLabel(NAV[i]);
    return key;
  }
  function setView(key, html, title) {
    main.innerHTML = html;
    document.title = title ? title + ' — ' + APP_NAME : APP_NAME;
    buildNav();
    updateNavBadges();
  }
  function route(opts) {
    opts = opts || {};
    closeSuggest(); closeDrawer();
    var p = parts(), key = p.length ? p[0] : 'home', restoreY = null;
    if (!opts.keepScroll) {
      scrollMemo[scrollKey] = window.scrollY;                 // the page we are leaving
      scrollKey = location.hash || '#/';
      restoreY = fromHistory && scrollMemo.hasOwnProperty(scrollKey) ? scrollMemo[scrollKey] : null;
      fromHistory = false;
    }
    var html, title, args = p.slice(1);
    if (key !== 'missing' && Object.prototype.hasOwnProperty.call(VIEWS, key) && typeof VIEWS[key] === 'function') {
      html = VIEWS[key].apply(null, args); title = titleFor(key);
    } else {
      key = 'missing'; html = missingView(); title = t('notfound.title');
    }
    setView(key, html, title);
    if (AFTER[key]) AFTER[key].apply(null, args);
    if (opts.focus) main.focus({ preventScroll: true });
    if (opts.keepScroll) return;
    if (restoreY !== null) { window.requestAnimationFrame(function () { window.scrollTo(0, restoreY); }); return; }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', function () { syncHist(); route({ focus: true }); });
  main.addEventListener('change', function (e) {   // About > Settings
    var n = e.target && e.target.name, v = e.target && e.target.value;
    if (n === 'lang') { setLang(v); var again = main.querySelector('input[name="lang"]:checked'); if (again) again.focus(); }
    else if (n === 'theme') setTheme(v);
    else if (n === 'aboutTextSize') { store.set('textSize', v); applyTextSize(v); }
  });
  main.addEventListener('click', function (e) {
    var f = e.target.closest ? e.target.closest('.search-page .filter[data-kind]') : null;
    if (f) { searchKind = f.getAttribute('data-kind'); route({ keepScroll: true }); }
  });

  /* ===== Mobile tab bar: hides on scroll down, shows on scroll up ===== */
  (function initTabbar() {
    var lastY = window.scrollY, hold = 0, ticking = false;
    // Guard both: classList.add/remove rewrite the attribute even when nothing changes,
    // which would re-fire the MutationObserver below forever.
    function show() { if (document.body.classList.contains('tabbar-hidden')) document.body.classList.remove('tabbar-hidden'); }
    function hide() { if (!document.body.classList.contains('tabbar-hidden')) document.body.classList.add('tabbar-hidden'); }
    function update() {
      ticking = false;
      var y = window.scrollY, dy = y - lastY, max = document.documentElement.scrollHeight - window.innerHeight;
      var a = document.activeElement;
      var typing = !!(a && a.matches && a.matches('input, textarea, select'));
      if (Date.now() < hold || document.body.classList.contains('drawer-open') || typing || y < 80 || y > max - 80) { show(); lastY = y; }
      else if (dy > 10) { hide(); lastY = y; }
      else if (dy < -6) { show(); lastY = y; }
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('hashchange', function () { hold = Date.now() + 700; show(); });
    document.addEventListener('focusin', function (e) { if (e.target.matches && e.target.matches('input, textarea, select')) show(); });
    new MutationObserver(function () { if (document.body.classList.contains('drawer-open')) show(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  })();

  /* ===== Backup: export / import / undo (everything stored under PREFIX) ===== */
  var BK_APP = 'storytime', BK_UNDO = BK_APP + ':undo-import';
  function bkCollect() {
    var data = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) data[k.slice(PREFIX.length)] = localStorage.getItem(k);
      }
    } catch (e) {}
    return data;
  }
  function bkReplace(data) {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(PREFIX) === 0) keys.push(k); }
    keys.forEach(function (k) { localStorage.removeItem(k); });
    Object.keys(data).forEach(function (k) { localStorage.setItem(PREFIX + k, data[k]); });
  }
  function bkSummary(data) {
    var n = Object.keys(data || {}).filter(function (k) { return k !== 'lastBackup'; }).length;
    return n ? tf(n === 1 ? 'backup.item1' : 'backup.itemN', { n: n }) : t('backup.nothing');
  }
  function bkDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(locale(), { year: 'numeric', month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
  }
  function bkStatus(msg, isErr) {
    var el = document.getElementById('bk-status');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('is-error', !!isErr);
  }
  function bkPaint() {
    var meta = document.getElementById('bk-meta'), un = document.getElementById('bk-undo');
    var last = store.get('lastBackup', null);
    if (meta) meta.textContent = tf('backup.onDevice', { summary: bkSummary(bkCollect()) }) + ' ' + (last && bkDate(last) ? tf('backup.lastExported', { date: bkDate(last) }) : t('backup.notExported'));
    var has = false;
    try { has = !!localStorage.getItem(BK_UNDO); } catch (e) {}
    if (un) un.hidden = !has;
  }
  function bkExport() {
    var now = new Date();
    store.set('lastBackup', now.toISOString());
    var data = bkCollect();
    var payload = { app: BK_APP, format: 1, exported: now.toISOString(), attribution: ATTRIBUTION, summary: bkSummary(data), data: data };
    var name = BK_APP + '-backup-' + now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate()) + '.json';
    var json = JSON.stringify(payload, null, 1);
    var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    var file = null;
    try { file = new File([json], name, { type: 'application/json' }); } catch (e) {}
    if (standalone && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      // Installed apps on phones cannot always download files; the share sheet can save to Files or send it on.
      navigator.share({ files: [file], title: tf('backup.shareTitle', { app: APP_NAME }) }).then(function () {
        bkStatus(t('backup.shared')); bkPaint();
      }).catch(function () { bkStatus(t('backup.exportCancelled')); });
      return;
    }
    var url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    bkStatus(tf('backup.saved', { name: name }));
    bkPaint();
  }
  function bkImport(file) {
    if (!file) return;
    var reader = new FileReader();
    var bad = tf('backup.notBackup', { app: APP_NAME });
    reader.onerror = function () { bkStatus(t('backup.unreadable'), true); };
    reader.onload = function () {
      var p;
      try { p = JSON.parse(reader.result); } catch (e) { bkStatus(bad, true); return; }
      var ok = p && p.app === BK_APP && p.data && typeof p.data === 'object' &&
        Object.keys(p.data).every(function (k) { return typeof p.data[k] === 'string' && k.length < 80; });
      if (ok) Object.keys(p.data).forEach(function (k) { try { JSON.parse(p.data[k]); } catch (e) { ok = false; } });
      if (!ok) { bkStatus(bad, true); return; }
      var msg = tf('backup.confirmImport', { date: bkDate(p.exported) || t('backup.unknownDate'), backup: bkSummary(p.data), device: bkSummary(bkCollect()) });
      if (!window.confirm(msg)) { bkStatus(t('backup.importCancelled')); return; }
      try {
        localStorage.setItem(BK_UNDO, JSON.stringify({ saved: new Date().toISOString(), data: bkCollect() }));
        bkReplace(p.data);
      } catch (e) { bkStatus(t('backup.importFailed'), true); return; }
      bkStatus(t('backup.imported'));
      setTimeout(function () { location.reload(); }, 700);
    };
    reader.readAsText(file);
  }
  function bkUndo() {
    var snap; try { snap = JSON.parse(localStorage.getItem(BK_UNDO)); } catch (e) {}
    if (!snap || !snap.data) { bkPaint(); return; }
    if (!window.confirm(tf('backup.confirmUndo', { summary: bkSummary(snap.data) }))) return;
    try { bkReplace(snap.data); localStorage.removeItem(BK_UNDO); } catch (e) { bkStatus(t('backup.undoFailed'), true); return; }
    bkStatus(t('backup.restored'));
    setTimeout(function () { location.reload(); }, 700);
  }
  (function initBackup() {
    var ex = document.getElementById('bk-export'), fi = document.getElementById('bk-file'), un = document.getElementById('bk-undo');
    if (!ex || !fi) return;
    ex.addEventListener('click', bkExport);
    fi.addEventListener('change', function () { bkImport(fi.files && fi.files[0]); fi.value = ''; });
    if (un) un.addEventListener('click', bkUndo);
    bkPaint();
  })();

  /* ===== Language switching: static markup (data-i18n / data-i18n-attr in index.html), then re-render ===== */
  function applyStatic() {
    document.documentElement.setAttribute('lang', lang);
    var els = document.querySelectorAll('[data-i18n]'), i, v;
    for (i = 0; i < els.length; i++) { v = t(els[i].getAttribute('data-i18n')); if (v !== els[i].getAttribute('data-i18n')) els[i].textContent = v; }
    els = document.querySelectorAll('[data-i18n-attr]');
    for (i = 0; i < els.length; i++) {
      var pairs = els[i].getAttribute('data-i18n-attr').split(';');
      for (var j = 0; j < pairs.length; j++) {
        var at = pairs[j].indexOf(':'), key = pairs[j].slice(at + 1);
        if (at > 0 && t(key) !== key) els[i].setAttribute(pairs[j].slice(0, at), t(key));
      }
    }
    var brand = document.querySelector('.brand');
    if (brand) brand.setAttribute('aria-label', tf('brand.home', { name: APP_NAME }));
    var panel = document.getElementById('textSizePanel');
    if (panel) panel.setAttribute('aria-label', t('textsize.title'));
    labelCollapse();
    applyTheme(getTheme());
  }
  function setLang(l) {
    lang = l === 'tl' ? 'tl' : 'en';
    store.set('lang', lang);
    applyStatic();
    bkPaint();
    var panel = document.getElementById('textSizePanel');
    if (panel && !panel.hidden) { panel.hidden = true; var tb = document.getElementById('textSizeBtn'); if (tb) tb.setAttribute('aria-expanded', 'false'); }
    route({ keepScroll: true });   // re-render the current view and the menu in the new language
  }

  /* ===== Start ===== */
  applyStatic();
  route();

  /* ===== Service worker (https or localhost only) ===== */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
