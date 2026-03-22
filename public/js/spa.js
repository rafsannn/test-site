// ─────────────────────────────────────────────────────────────────────────────
// ZENOCART SPA ROUTER — Bug-free, smooth native navigation
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
    #spa-view {
      position: relative;
      overflow: hidden;
      isolation: isolate;        /* own stacking context */
    }
    .spa-page {
      width: 100%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      transform: translate3d(0,0,0);
    }
    /* ── entering (in normal flow, always on top via z-index) ── */
    .spa-e-right { animation: spaInR  ${DUR}ms cubic-bezier(.25,.46,.45,.94) both; z-index:2; position:relative; }
    .spa-e-left  { animation: spaInL  ${DUR}ms cubic-bezier(.25,.46,.45,.94) both; z-index:2; position:relative; }
    .spa-e-deep  { animation: spaInD  ${DUR}ms cubic-bezier(.25,.46,.45,.94) both; z-index:2; position:relative; }
    /* ── exiting (absolute, behind entering) ── */
    .spa-x-left  { animation: spaOutL ${DUR}ms cubic-bezier(.25,.46,.45,.94) both;
                   position:absolute; top:0; left:0; width:100%; z-index:1; pointer-events:none; }
    .spa-x-right { animation: spaOutR ${DUR}ms cubic-bezier(.25,.46,.45,.94) both;
                   position:absolute; top:0; left:0; width:100%; z-index:1; pointer-events:none; }
    .spa-x-deep  { animation: spaOutD ${DUR}ms cubic-bezier(.25,.46,.45,.94) both;
                   position:absolute; top:0; left:0; width:100%; z-index:1; pointer-events:none; }

    @keyframes spaInR  { from { transform:translate3d(100%,0,0)       } to { transform:translate3d(0,0,0)    } }
    @keyframes spaInL  { from { transform:translate3d(-100%,0,0)      } to { transform:translate3d(0,0,0)    } }
    @keyframes spaInD  { from { transform:translate3d(32px,0,0); opacity:0 } to { transform:translate3d(0,0,0); opacity:1 } }
    @keyframes spaOutL { from { transform:translate3d(0,0,0)          } to { transform:translate3d(-25%,0,0); opacity:.6 } }
    @keyframes spaOutR { from { transform:translate3d(0,0,0)          } to { transform:translate3d(100%,0,0) } }
    @keyframes spaOutD { from { transform:translate3d(0,0,0); opacity:1 } to { transform:translate3d(-16px,0,0); opacity:0 } }
  </style>`);

  // ── Direction logic ────────────────────────────────────────────────────────
  function getTab(path) { return routeToTab[path.split('?')[0]] || 'product'; }

  function getDirection(from, to) {
    const fb = from.split('?')[0], tb = to.split('?')[0];
    if (tb.includes('product.html') && !fb.includes('product.html')) return 'deep';
    if (fb.includes('product.html') && !tb.includes('product.html')) return 'back';
    const fi = TAB_ORDER.indexOf(getTab(fb)), ti = TAB_ORDER.indexOf(getTab(tb));
    if (fi === -1 || ti === -1) return 'forward';
    return ti >= fi ? 'forward' : 'back';
  }

  // ── Fetch page HTML & scripts ──────────────────────────────────────────────
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

  // ── Run page init scripts ──────────────────────────────────────────────────
  function runScripts(scripts) {
    scripts.forEach(raw => {
      try {
        let code = raw.replace(/injectLayout\([^)]*\);?\s*/g, '');
        // Convert DOMContentLoaded → immediate IIFE
        code = code
          .replace(/document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*async\s*\(\s*\)\s*=>\s*\{/g, '(async () => {')
          .replace(/document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*\(\s*\)\s*=>\s*\{/g,       '(async () => {')
          .replace(/document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*function\s*\(\s*\)\s*\{/g, '(function () {');
        // Close IIFE if we opened one
        if (/\((async )?\(\) => \{|\(function \(\) \{/.test(code)) {
          code = code.trimEnd();
          if (!/\}\)\(\);?\s*$/.test(code)) code = code.replace(/\}\s*\);\s*$/, '})();');
          if (!/\}\)\(\);?\s*$/.test(code)) code += '\n})();';
        }
        // eslint-disable-next-line no-new-func
        new Function(code)();
      } catch(e) { console.warn('[SPA] script error:', e.message); }
    });
  }

  // ── Navigate ───────────────────────────────────────────────────────────────
  async function navigate(url, { push = true, direction = null } = {}) {
    if (isNavigating || url === currentPath) return;
    isNavigating = true;

    const dir = direction || getDirection(currentPath, url);
    if (push) window.history.pushState({ url }, '', url);
    updateBottomNav(url);

    // Fetch
    let page;
    try   { page = await fetchPage(url); }
    catch { window.location.href = url; isNavigating = false; return; }
    document.title = page.title;

    const view = document.getElementById('spa-view');
    if (!view) { window.location.href = url; isNavigating = false; return; }

    // ── Snapshot current content ────────────────────────────────────────────
    // Grab only the INNER content of the current .spa-page, not the wrapper
    const currentPage = view.querySelector('.spa-page');
    const exitHTML    = currentPage ? currentPage.innerHTML : view.innerHTML;

    const exiting = document.createElement('div');
    exiting.className = 'spa-page';
    exiting.innerHTML = exitHTML;          // content only — no double-nesting

    // ── Build entering page ─────────────────────────────────────────────────
    const entering = document.createElement('div');
    entering.className = 'spa-page';
    entering.innerHTML = page.html;        // fresh page content

    // ── Assign animation classes ────────────────────────────────────────────
    if (dir === 'deep') {
      exiting.classList.add('spa-x-deep');  entering.classList.add('spa-e-deep');
    } else if (dir === 'back') {
      exiting.classList.add('spa-x-right'); entering.classList.add('spa-e-left');
    } else {
      exiting.classList.add('spa-x-left');  entering.classList.add('spa-e-right');
    }

    // ── Lock height so absolute exiting doesn't collapse container ──────────
    view.style.height   = view.offsetHeight + 'px';
    view.style.overflow = 'hidden';

    // ── Swap DOM ────────────────────────────────────────────────────────────
    view.innerHTML = '';
    view.appendChild(exiting);   // z-index:1, absolute → animates out behind
    view.appendChild(entering);  // z-index:2, relative → animates in on top
    window.scrollTo({ top: 0, behavior: 'instant' });

    // ── Cleanup ─────────────────────────────────────────────────────────────
    setTimeout(() => {
      view.style.height   = '';
      view.style.overflow = '';
      view.innerHTML      = '';
      entering.className  = 'spa-page';   // strip animation classes
      entering.style.position = '';
      entering.style.zIndex   = '';
      view.appendChild(entering);

      // Boot page logic
      runScripts(page.scripts);
      if (typeof updateCartUI     === 'function') updateCartUI();
      if (typeof updateWishlistUI === 'function') updateWishlistUI();

      currentPath  = url;
      isNavigating = false;
    }, DUR + 30);
  }

  // ── Bottom nav + desktop nav active state ─────────────────────────────────
  function updateBottomNav(url) {
    const path = url.split('?')[0];
    const tab  = getTab(path);

    // Mobile bottom bar
    document.querySelectorAll('.mbb-tab').forEach(el =>
      el.classList.toggle('mbb-active', el.dataset.page === tab)
    );

    // Desktop nav links
    document.querySelectorAll('.nav-link').forEach(el => {
      const href = el.getAttribute('href') || '';
      const hpath = href.split('?')[0];
      const isActive =
        (hpath === '/' && path === '/') ||
        (hpath !== '/' && path.startsWith(hpath) && hpath.length > 1);
      el.classList.toggle('active', isActive);
    });
  }

  // ── Link interception ──────────────────────────────────────────────────────
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

  // ── Browser back / forward ─────────────────────────────────────────────────
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

    // Cache the already-rendered current page (no scripts needed — already ran)
    cache.set(currentPath, { html: inner.innerHTML, scripts: [], title: document.title });

    interceptLinks();
    setupPrefetch();
    updateBottomNav(currentPath);
  }

  return { init, navigate };
})();

document.addEventListener('DOMContentLoaded', () => setTimeout(() => SPA.init(), 80));
