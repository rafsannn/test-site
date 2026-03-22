// ─────────────────────────────────────────────────────────────────────────────
// ZENOCART SPA ROUTER — Reliable script transformer + smooth navigation
// ─────────────────────────────────────────────────────────────────────────────

const SPA = (() => {
  const cache      = new Map();
  let isNavigating = false;
  let currentPath  = window.location.pathname + window.location.search;

  const routeToTab = {
    '/':                'home',
    '/index.html':      'home',
    '/pages/shop.html': 'shop',
    '/pages/cart.html': 'cart',
  };
  const TAB_ORDER  = ['home', 'shop', 'cart', 'wishlist'];
  const DUR        = 300;

  // ── CSS ────────────────────────────────────────────────────────────────────
  document.head.insertAdjacentHTML('beforeend', `<style>
    #spa-view { position:relative; overflow:hidden; }
    .spa-page { width:100%; backface-visibility:hidden; -webkit-backface-visibility:hidden; }
    /* During transition both pages are absolute inside the locked container */
    .spa-transitioning { position:absolute; top:0; left:0; width:100%; }
    .spa-e-right { animation:spaInR  ${DUR}ms cubic-bezier(.25,.46,.45,.94) both; }
    .spa-e-left  { animation:spaInL  ${DUR}ms cubic-bezier(.25,.46,.45,.94) both; }
    .spa-e-deep  { animation:spaInD  ${DUR}ms cubic-bezier(.25,.46,.45,.94) both; }
    .spa-x-left  { animation:spaOutL ${DUR}ms cubic-bezier(.25,.46,.45,.94) both; }
    .spa-x-right { animation:spaOutR ${DUR}ms cubic-bezier(.25,.46,.45,.94) both; }
    .spa-x-deep  { animation:spaOutD ${DUR}ms cubic-bezier(.25,.46,.45,.94) both; }
    @keyframes spaInR  { from{transform:translate3d(100%,0,0)}   to{transform:translate3d(0,0,0)} }
    @keyframes spaInL  { from{transform:translate3d(-100%,0,0)}  to{transform:translate3d(0,0,0)} }
    @keyframes spaInD  { from{transform:translate3d(32px,0,0);opacity:0} to{transform:translate3d(0,0,0);opacity:1} }
    @keyframes spaOutL { from{transform:translate3d(0,0,0)} to{transform:translate3d(-25%,0,0);opacity:.6} }
    @keyframes spaOutR { from{transform:translate3d(0,0,0)} to{transform:translate3d(100%,0,0)} }
    @keyframes spaOutD { from{transform:translate3d(0,0,0);opacity:1} to{transform:translate3d(-16px,0,0);opacity:0} }
  </style>`);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getTab(path) { return routeToTab[path.split('?')[0]] || 'product'; }

  function getDirection(from, to) {
    const fb = from.split('?')[0], tb = to.split('?')[0];
    if (tb.includes('product.html') && !fb.includes('product.html')) return 'deep';
    if (fb.includes('product.html') && !tb.includes('product.html')) return 'back';
    const fi = TAB_ORDER.indexOf(getTab(fb)), ti = TAB_ORDER.indexOf(getTab(tb));
    if (fi === -1 || ti === -1) return 'forward';
    return ti >= fi ? 'forward' : 'back';
  }

  // ── Fetch page ─────────────────────────────────────────────────────────────
  async function fetchPage(url) {
    if (cache.has(url)) return cache.get(url);
    const text = await (await fetch(url)).text();
    const doc  = new DOMParser().parseFromString(text, 'text/html');
    const main = doc.querySelector('main');
    const scripts = [...doc.querySelectorAll('script:not([src])')]
      .map(s => s.textContent.trim()).filter(t => t.length > 10);
    const result = { html: main ? main.innerHTML : '', scripts, title: doc.title };
    cache.set(url, result);
    return result;
  }

  // ── Script transformer: brace-matching DOMContentLoaded extractor ──────────
  // Finds document.addEventListener('DOMContentLoaded', callback) and replaces
  // it with an immediately invoked version — handles code before AND after it.
  function transformScript(raw) {
    let code = raw.replace(/injectLayout\([^)]*\);?\s*/g, '');

    // Patterns to find the DOMContentLoaded call opener
    const openers = [
      { re: /document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*async\s*\(\s*\)\s*=>\s*\{/, async: true  },
      { re: /document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*\(\s*\)\s*=>\s*\{/,       async: true  },
      { re: /document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*function\s*\(\s*\)\s*\{/, async: false },
    ];

    for (const { re, async: isAsync } of openers) {
      const m = re.exec(code);
      if (!m) continue;

      // m[0] ends with '{' — find the matching closing brace
      const openBrace = m.index + m[0].length - 1;
      let depth = 1, i = openBrace + 1;
      while (i < code.length && depth > 0) {
        const ch = code[i];
        if      (ch === '{') depth++;
        else if (ch === '}') depth--;
        // skip strings to avoid counting braces inside them
        else if (ch === '"' || ch === "'" || ch === '`') {
          const q = ch; i++;
          while (i < code.length && code[i] !== q) {
            if (code[i] === '\\') i++; // skip escaped char
            i++;
          }
        }
        i++;
      }
      // i is now right after the closing '}', skip optional ');'
      const afterClose = code.slice(i).replace(/^\s*\);\s*/, '');
      const body       = code.slice(openBrace + 1, i - 1);
      const before     = code.slice(0, m.index);

      code = before
        + `(${isAsync ? 'async ' : ''}() => {\n${body}\n})();\n`
        + afterClose;
      break; // only one DOMContentLoaded per page script
    }

    return code;
  }

  // ── Run page scripts in global scope ──────────────────────────────────────
  // Must use indirect eval (0,eval) so functions land on window and inline
  // HTML handlers like onchange="filterProducts()" can find them.
  function runScripts(scripts) {
    scripts.forEach(raw => {
      try {
        const code = transformScript(raw);
        // eslint-disable-next-line no-eval
        (0, eval)(code);
      } catch(e) {
        console.warn('[SPA] script error:', e.message, e);
      }
    });
  }

  // ── Navigate ───────────────────────────────────────────────────────────────
  async function navigate(url, { push = true, direction = null } = {}) {
    if (isNavigating || url === currentPath) return;
    isNavigating = true;

    const dir = direction || getDirection(currentPath, url);
    if (push) window.history.pushState({ url }, '', url);
    updateBottomNav(url);

    let page;
    try   { page = await fetchPage(url); }
    catch { window.location.href = url; isNavigating = false; return; }
    document.title = page.title;

    const view = document.getElementById('spa-view');
    if (!view) { window.location.href = url; isNavigating = false; return; }

    // Snapshot current inner content (not the .spa-page wrapper itself)
    const currentInner = view.querySelector('.spa-page');
    const exiting = document.createElement('div');
    exiting.className = 'spa-page';
    exiting.innerHTML = currentInner ? currentInner.innerHTML : view.innerHTML;

    const entering = document.createElement('div');
    entering.className = 'spa-page';
    entering.innerHTML = page.html;

    // Animation classes
    if (dir === 'deep') {
      exiting.classList.add('spa-x-deep');  entering.classList.add('spa-e-deep');
    } else if (dir === 'back') {
      exiting.classList.add('spa-x-right'); entering.classList.add('spa-e-left');
    } else {
      exiting.classList.add('spa-x-left');  entering.classList.add('spa-e-right');
    }

    // Lock height to the current page's height
    const lockedH = view.offsetHeight;
    view.style.height   = lockedH + 'px';
    view.style.overflow = 'hidden';

    // Both pages are absolutely positioned during the transition
    exiting.classList.add('spa-transitioning');
    entering.classList.add('spa-transitioning');
    exiting.style.zIndex  = '1';
    entering.style.zIndex = '2';   // entering always on top

    view.innerHTML = '';
    view.appendChild(exiting);
    view.appendChild(entering);
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Cleanup after animation
    setTimeout(() => {
      view.style.height   = '';
      view.style.overflow = '';
      view.innerHTML      = '';

      // Return entering to normal flow
      entering.className = 'spa-page';
      entering.style.cssText = '';
      view.appendChild(entering);

      // Reset dynamic containers so re-running scripts starts fresh
      const SK = '<div class="product-card-skeleton"><div class="sk-img skeleton"></div><div class="sk-body"><div class="sk-cat skeleton"></div><div class="sk-name skeleton"></div><div class="sk-name2 skeleton"></div><div class="sk-stars skeleton"></div><div class="sk-price skeleton"></div></div></div>';
      const resets = {
        'featured-grid':      SK.repeat(4),
        'hot-deals-grid':     '',
        'home-categories':    '',
        'shop-grid':          SK.repeat(6),
        'sidebar-categories': '',
      };
      Object.entries(resets).forEach(([id, html]) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
      });

      // Run this page's init logic
      runScripts(page.scripts);
      if (typeof updateCartUI     === 'function') updateCartUI();
      if (typeof updateWishlistUI === 'function') updateWishlistUI();

      currentPath  = url;
      isNavigating = false;
    }, DUR + 30);
  }

  // ── Update nav active states ────────────────────────────────────────────────
  function updateBottomNav(url) {
    const path = url.split('?')[0];
    const tab  = getTab(path);

    document.querySelectorAll('.mbb-tab').forEach(el =>
      el.classList.toggle('mbb-active', el.dataset.page === tab)
    );
    document.querySelectorAll('.nav-link').forEach(el => {
      const hp = (el.getAttribute('href') || '').split('?')[0];
      const active = (hp === '/' && path === '/') ||
                     (hp !== '/' && hp.length > 1 && path.startsWith(hp));
      el.classList.toggle('active', active);
    });
  }

  // ── Intercept <a> clicks ───────────────────────────────────────────────────
  function interceptLinks() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a || a.target === '_blank') return;
      const href = a.getAttribute('href');
      if (!href || /^(https?:|\/\/|mailto:|tel:|javascript:|#)/.test(href)) return;
      const resolved = new URL(href, location.origin);
      const url = resolved.pathname + resolved.search;
      const ok  = ['/', '/index.html', '/pages/shop.html',
                   '/pages/cart.html', '/pages/product.html'];
      if (!ok.some(p => url.split('?')[0] === p)) return;
      e.preventDefault();
      e.stopPropagation();
      navigate(url);
    }, true);
  }

  // ── Browser back/forward ───────────────────────────────────────────────────
  window.addEventListener('popstate', () => {
    navigate(location.pathname + location.search, { push: false, direction: 'back' });
  });

  // ── Prefetch on hover / touchstart ─────────────────────────────────────────
  function setupPrefetch() {
    const done = new Set();
    const tryPre = e => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || /^(https?:|\/\/)/.test(href) || done.has(href)) return;
      done.add(href);
      try { fetchPage(new URL(href, location.origin).pathname +
                      new URL(href, location.origin).search); } catch {}
    };
    document.addEventListener('mouseover',  tryPre);
    document.addEventListener('touchstart', tryPre, { passive: true });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    const main = document.querySelector('main');
    if (!main || document.getElementById('spa-view')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'spa-view';
    const inner = document.createElement('div');
    inner.className = 'spa-page';
    inner.innerHTML = main.innerHTML;
    wrapper.appendChild(inner);
    main.parentNode.replaceChild(wrapper, main);

    // Extract inline scripts from the current page so we can re-run them
    // when the user navigates back here via SPA
    const pageScripts = [...document.querySelectorAll('script:not([src])')]
      .map(s => s.textContent.trim())
      .filter(t => t.length > 10);

    cache.set(currentPath, { html: inner.innerHTML, scripts: pageScripts, title: document.title });

    interceptLinks();
    setupPrefetch();
    updateBottomNav(currentPath);
  }

  return { init, navigate };
})();

document.addEventListener('DOMContentLoaded', () => setTimeout(() => SPA.init(), 80));
