// ─────────────────────────────────────────────────────────────────────────────
// ZENOCART SPA ROUTER — Native Android-style navigation
// ─────────────────────────────────────────────────────────────────────────────

const SPA = (() => {
  const cache = new Map();
  const historyStack = [window.location.pathname + window.location.search];
  let isNavigating = false;
  let currentPath = window.location.pathname + window.location.search;

  const routeToTab = {
    '/':                'home',
    '/index.html':      'home',
    '/pages/shop.html': 'shop',
    '/pages/cart.html': 'cart',
  };

  // ── Slide animation CSS ──
  const style = document.createElement('style');
  style.textContent = `
    #spa-view { position:relative; overflow:hidden; }
    .spa-page { width:100%; will-change:transform; }
    .spa-enter-right { animation: spa-in-right .28s cubic-bezier(.32,.72,0,1) forwards; }
    .spa-enter-left  { animation: spa-in-left  .28s cubic-bezier(.32,.72,0,1) forwards; }
    .spa-exit-left   { animation: spa-out-left .28s cubic-bezier(.32,.72,0,1) forwards; position:absolute;top:0;left:0;right:0;z-index:0; }
    .spa-exit-right  { animation: spa-out-right .28s cubic-bezier(.32,.72,0,1) forwards; position:absolute;top:0;left:0;right:0;z-index:0; }
    @keyframes spa-in-right  { from{transform:translateX(100%)}  to{transform:translateX(0)} }
    @keyframes spa-in-left   { from{transform:translateX(-100%)} to{transform:translateX(0)} }
    @keyframes spa-out-left  { from{transform:translateX(0)} to{transform:translateX(-30%)} }
    @keyframes spa-out-right { from{transform:translateX(0)} to{transform:translateX(100%)} }
    .spa-enter-deep  { animation: spa-in-deep .25s cubic-bezier(.32,.72,0,1) forwards; }
    .spa-exit-deep   { animation: spa-out-deep .25s cubic-bezier(.32,.72,0,1) forwards; position:absolute;top:0;left:0;right:0;z-index:0; }
    @keyframes spa-in-deep  { from{opacity:0;transform:translateX(48px)} to{opacity:1;transform:translateX(0)} }
    @keyframes spa-out-deep { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-24px)} }
  `;
  document.head.appendChild(style);

  const TAB_ORDER = ['home', 'shop', 'cart', 'wishlist'];

  function getTab(path) {
    return routeToTab[path.split('?')[0]] || 'product';
  }

  function getDirection(from, to) {
    const fromTab = getTab(from);
    const toTab   = getTab(to);
    // Going into product = "deeper" special animation
    if (to.includes('product.html') && !from.includes('product.html')) return 'deep';
    // Coming back from product
    if (from.includes('product.html') && !to.includes('product.html')) return 'back';
    const fi = TAB_ORDER.indexOf(fromTab);
    const ti = TAB_ORDER.indexOf(toTab);
    if (fi === -1 || ti === -1) return 'forward';
    return ti >= fi ? 'forward' : 'back';
  }

  // ── Fetch page and extract main content ──
  async function fetchPage(url) {
    const key = url.split('?')[0] + (url.includes('?') ? '?' + url.split('?')[1] : '');
    if (cache.has(url)) return cache.get(url);
    const res  = await fetch(url);
    const text = await res.text();
    const doc  = new DOMParser().parseFromString(text, 'text/html');
    const main = doc.querySelector('main');
    // Grab inline scripts that aren't src= and aren't the framework scripts
    const scripts = [...doc.querySelectorAll('script:not([src])')]
      .map(s => s.textContent.trim())
      .filter(t => t.length > 10 && !t.startsWith('//') );
    const result = { html: main ? main.outerHTML : '', scripts, title: doc.title };
    cache.set(url, result);
    return result;
  }

  // ── Run a page's init scripts ──
  function runScripts(scripts, url) {
    scripts.forEach(src => {
      try {
        // Strip injectLayout calls — layout is already injected
        let code = src.replace(/injectLayout\([^)]*\);?/g, '');

        // Replace DOMContentLoaded listener with immediate IIFE
        code = code.replace(
          /document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*(async\s*)?\(\s*\)\s*=>\s*\{/g,
          '(async () => {'
        ).replace(
          /document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*function\s*\(\s*\)\s*\{/g,
          '(function() {'
        );
        // Close the IIFE if we replaced the event listener
        if (code.includes('(async () => {') || code.includes('(function() {')) {
          // Make sure it ends with })();
          code = code.trimEnd();
          if (!code.endsWith('})();') && !code.endsWith('})()')) {
            code = code.replace(/\}\s*\)\s*;?\s*$/, '})();');
          }
        }

        // eslint-disable-next-line no-new-func
        new Function(code)();
      } catch(e) {
        console.warn('[SPA] Script error on', url, e.message);
      }
    });
  }

  // ── Navigate to a URL ──
  async function navigate(url, { push = true, direction = null } = {}) {
    if (isNavigating || url === currentPath) return;
    isNavigating = true;

    const dir = direction || getDirection(currentPath, url);

    if (push) {
      window.history.pushState({ url }, '', url);
    }

    // Update bottom nav immediately
    updateBottomNav(url);

    // Fetch new page
    let page;
    try {
      page = await fetchPage(url);
    } catch(e) {
      window.location.href = url;
      isNavigating = false;
      return;
    }

    document.title = page.title;

    const view = document.getElementById('spa-view');
    if (!view) { window.location.href = url; isNavigating = false; return; }

    // Snapshot current content as exiting div
    const exiting = document.createElement('div');
    exiting.className = 'spa-page';
    exiting.innerHTML = view.innerHTML;

    // Build entering div from fetched page
    const entering = document.createElement('div');
    entering.className = 'spa-page';
    // Parse fetched HTML to get just main's innerHTML
    const tmp = document.createElement('div');
    tmp.innerHTML = page.html;
    const mainEl = tmp.querySelector('main') || tmp;
    entering.innerHTML = mainEl.innerHTML;

    // Set animation classes
    if (dir === 'deep') {
      exiting.classList.add('spa-exit-deep');
      entering.classList.add('spa-enter-deep');
    } else if (dir === 'back') {
      exiting.classList.add('spa-exit-right');
      entering.classList.add('spa-enter-left');
    } else {
      exiting.classList.add('spa-exit-left');
      entering.classList.add('spa-enter-right');
    }

    // Swap
    view.innerHTML = '';
    view.appendChild(exiting);
    view.appendChild(entering);

    window.scrollTo({ top: 0, behavior: 'instant' });

    // After animation completes
    setTimeout(() => {
      view.innerHTML = '';
      entering.classList.remove(
        'spa-enter-right','spa-enter-left','spa-enter-deep',
        'spa-exit-right','spa-exit-left','spa-exit-deep'
      );
      entering.style.position = '';
      view.appendChild(entering);

      // Re-run page scripts
      runScripts(page.scripts, url);

      // Re-sync global UI state
      if (typeof updateCartUI     === 'function') updateCartUI();
      if (typeof updateWishlistUI === 'function') updateWishlistUI();

      currentPath = url;
      isNavigating = false;
    }, 300);
  }

  // ── Update bottom nav active tab ──
  function updateBottomNav(url) {
    const tab = getTab(url.split('?')[0]);
    document.querySelectorAll('.mbb-tab').forEach(el => {
      const isActive = el.dataset.page === tab;
      el.classList.toggle('mbb-active', isActive);
    });
  }

  // ── Intercept all <a href> clicks ──
  function interceptLinks() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || a.target === '_blank') return;
      if (href.startsWith('http') || href.startsWith('//') ||
          href.startsWith('mailto:') || href.startsWith('tel:') ||
          href.startsWith('javascript') || href.startsWith('#')) return;

      const resolved = new URL(href, window.location.origin);
      const url = resolved.pathname + resolved.search;
      const internalPages = ['/', '/index.html', '/pages/shop.html',
                             '/pages/cart.html', '/pages/product.html'];
      if (!internalPages.some(p => url.split('?')[0] === p)) return;

      e.preventDefault();
      e.stopPropagation();
      navigate(url);
    }, true);
  }

  // ── Handle browser back/forward buttons ──
  window.addEventListener('popstate', () => {
    const url = window.location.pathname + window.location.search;
    navigate(url, { push: false, direction: 'back' });
  });

  // ── Prefetch on hover / touchstart ──
  function setupPrefetch() {
    const prefetched = new Set();
    const tryPrefetch = e => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('http') || prefetched.has(href)) return;
      prefetched.add(href);
      try {
        const url = new URL(href, window.location.origin).pathname +
                    new URL(href, window.location.origin).search;
        fetchPage(url);
      } catch(e) {}
    };
    document.addEventListener('mouseover',   tryPrefetch);
    document.addEventListener('touchstart',  tryPrefetch, { passive: true });
  }

  // ── Init: wrap <main> in #spa-view ──
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

    // Cache current page
    cache.set(currentPath, {
      html: `<main>${inner.innerHTML}</main>`,
      scripts: [],
      title: document.title
    });

    interceptLinks();
    setupPrefetch();
    updateBottomNav(currentPath);
  }

  return { init, navigate };
})();

// Init after layout injects the bottom nav
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => SPA.init(), 80);
});
