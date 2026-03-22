// ─────────────────────────────────────────────────────────────────────────────
// ZENOCART SPA ROUTER — Smooth native-feel navigation
// ─────────────────────────────────────────────────────────────────────────────

const SPA = (() => {
  const cache       = new Map();
  let isNavigating  = false;
  let currentPath   = window.location.pathname + window.location.search;

  const routeToTab  = {
    '/':                'home',
    '/index.html':      'home',
    '/pages/shop.html': 'shop',
    '/pages/cart.html': 'cart',
  };
  const TAB_ORDER   = ['home', 'shop', 'cart', 'wishlist'];
  const DURATION    = 320; // ms — must match CSS

  // ── Inject CSS ──────────────────────────────────────────────────────────────
  document.head.insertAdjacentHTML('beforeend', `<style>
    #spa-view {
      position: relative;
      overflow: hidden;
      /* height locked during transition via JS */
    }
    .spa-page {
      width: 100%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    /* Entering pages */
    .spa-e-right { animation: spaInR  ${DURATION}ms cubic-bezier(.25,.46,.45,.94) both; }
    .spa-e-left  { animation: spaInL  ${DURATION}ms cubic-bezier(.25,.46,.45,.94) both; }
    .spa-e-deep  { animation: spaInD  ${DURATION}ms cubic-bezier(.25,.46,.45,.94) both; }
    /* Exiting pages — absolute so they don't affect layout */
    .spa-x-left  { animation: spaOutL ${DURATION}ms cubic-bezier(.25,.46,.45,.94) both;
                   position: absolute; top: 0; left: 0; width: 100%; }
    .spa-x-right { animation: spaOutR ${DURATION}ms cubic-bezier(.25,.46,.45,.94) both;
                   position: absolute; top: 0; left: 0; width: 100%; }
    .spa-x-deep  { animation: spaOutD ${DURATION}ms cubic-bezier(.25,.46,.45,.94) both;
                   position: absolute; top: 0; left: 0; width: 100%; }

    @keyframes spaInR  { from { transform: translate3d(100%,0,0) } to { transform: translate3d(0,0,0) } }
    @keyframes spaInL  { from { transform: translate3d(-100%,0,0) } to { transform: translate3d(0,0,0) } }
    @keyframes spaInD  { from { transform: translate3d(40px,0,0); opacity:0 } to { transform: translate3d(0,0,0); opacity:1 } }
    @keyframes spaOutL { from { transform: translate3d(0,0,0) } to { transform: translate3d(-28%,0,0); opacity:.5 } }
    @keyframes spaOutR { from { transform: translate3d(0,0,0) } to { transform: translate3d(100%,0,0) } }
    @keyframes spaOutD { from { transform: translate3d(0,0,0); opacity:1 } to { transform: translate3d(-20px,0,0); opacity:0 } }
  </style>`);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function getTab(path) {
    return routeToTab[path.split('?')[0]] || 'product';
  }

  function getDirection(from, to) {
    const toBase   = to.split('?')[0];
    const fromBase = from.split('?')[0];
    if (toBase.includes('product.html') && !fromBase.includes('product.html')) return 'deep';
    if (fromBase.includes('product.html') && !toBase.includes('product.html')) return 'back';
    const fi = TAB_ORDER.indexOf(getTab(fromBase));
    const ti = TAB_ORDER.indexOf(getTab(toBase));
    if (fi === -1 || ti === -1) return 'forward';
    return ti >= fi ? 'forward' : 'back';
  }

  // ── Fetch & cache page ───────────────────────────────────────────────────────
  async function fetchPage(url) {
    if (cache.has(url)) return cache.get(url);
    const res  = await fetch(url);
    const text = await res.text();
    const doc  = new DOMParser().parseFromString(text, 'text/html');
    const main = doc.querySelector('main');
    const scripts = [...doc.querySelectorAll('script:not([src])')]
      .map(s => s.textContent.trim())
      .filter(t => t.length > 10);
    const result = { html: main ? main.innerHTML : '', scripts, title: doc.title };
    cache.set(url, result);
    return result;
  }

  // ── Run page scripts ─────────────────────────────────────────────────────────
  function runScripts(scripts) {
    scripts.forEach(src => {
      try {
        let code = src
          .replace(/injectLayout\([^)]*\);?\s*/g, '')
          // turn DOMContentLoaded callbacks into immediate IIFEs
          .replace(
            /document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*(async\s*)?\(?\s*\)?\s*=>\s*\{/g,
            '(async () => {'
          )
          .replace(
            /document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*function\s*\(\s*\)\s*\{/g,
            ';(function () {'
          );
        // close the IIFE if we opened one
        if (/\(async \(\) => \{|;\(function \(\) \{/.test(code)) {
          code = code.trimEnd().replace(/\}\s*\);\s*$/, '})();');
          if (!code.endsWith('})();')) code += '\n})();';
        }
        // eslint-disable-next-line no-new-func
        new Function(code)();
      } catch (e) {
        console.warn('[SPA] script error:', e.message);
      }
    });
  }

  // ── Core navigate ────────────────────────────────────────────────────────────
  async function navigate(url, { push = true, direction = null } = {}) {
    if (isNavigating || url === currentPath) return;
    isNavigating = true;

    const dir = direction || getDirection(currentPath, url);
    if (push) window.history.pushState({ url }, '', url);
    updateBottomNav(url);

    // Fetch next page
    let page;
    try   { page = await fetchPage(url); }
    catch { window.location.href = url; isNavigating = false; return; }

    document.title = page.title;

    const view = document.getElementById('spa-view');
    if (!view) { window.location.href = url; isNavigating = false; return; }

    // ── Build exiting element ─────────────────────────────────────────────────
    const exiting = document.createElement('div');
    exiting.className = 'spa-page';
    exiting.innerHTML = view.innerHTML;          // snapshot current content

    // ── Build entering element ────────────────────────────────────────────────
    const entering = document.createElement('div');
    entering.className = 'spa-page';
    entering.innerHTML = page.html;

    // ── Lock container height so absolute exiting doesn't collapse it ─────────
    view.style.height    = view.offsetHeight + 'px';
    view.style.overflow  = 'hidden';

    // ── Apply animation classes ───────────────────────────────────────────────
    if (dir === 'deep') {
      exiting.classList.add('spa-x-deep');
      entering.classList.add('spa-e-deep');
    } else if (dir === 'back') {
      exiting.classList.add('spa-x-right');
      entering.classList.add('spa-e-left');
    } else {                                     // forward
      exiting.classList.add('spa-x-left');
      entering.classList.add('spa-e-right');
    }

    // ── DOM swap ──────────────────────────────────────────────────────────────
    view.innerHTML = '';
    view.appendChild(exiting);   // positioned absolute — animates out
    view.appendChild(entering);  // in normal flow  — animates in

    window.scrollTo({ top: 0, behavior: 'instant' });

    // ── Cleanup after animation ───────────────────────────────────────────────
    setTimeout(() => {
      // Release height lock
      view.style.height   = '';
      view.style.overflow = '';

      // Leave only the new page
      view.innerHTML = '';
      entering.className  = 'spa-page';
      view.appendChild(entering);

      // Boot page logic
      runScripts(page.scripts);
      if (typeof updateCartUI     === 'function') updateCartUI();
      if (typeof updateWishlistUI === 'function') updateWishlistUI();

      currentPath   = url;
      isNavigating  = false;
    }, DURATION + 20);
  }

  // ── Bottom nav active state ───────────────────────────────────────────────────
  function updateBottomNav(url) {
    const tab = getTab(url.split('?')[0]);
    document.querySelectorAll('.mbb-tab').forEach(el => {
      el.classList.toggle('mbb-active', el.dataset.page === tab);
    });
  }

  // ── Intercept <a> clicks ──────────────────────────────────────────────────────
  function interceptLinks() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a || a.target === '_blank') return;
      const href = a.getAttribute('href');
      if (!href || /^(https?:|\/\/|mailto:|tel:|javascript|#)/.test(href)) return;
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

  // ── Browser back/forward ──────────────────────────────────────────────────────
  window.addEventListener('popstate', () => {
    navigate(location.pathname + location.search, { push: false, direction: 'back' });
  });

  // ── Prefetch on hover / touch ────────────────────────────────────────────────
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

  // ── Init ──────────────────────────────────────────────────────────────────────
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

    cache.set(currentPath, { html: inner.innerHTML, scripts: [], title: document.title });

    interceptLinks();
    setupPrefetch();
    updateBottomNav(currentPath);
  }

  return { init, navigate };
})();

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => SPA.init(), 80);
});
