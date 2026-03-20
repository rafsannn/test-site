// ZENOCART - Shared Layout
function injectLayout(root) {
  const navHTML = `
  <nav class="navbar">
    <div class="container">
      <div class="navbar-inner">
        <a href="/" class="nav-logo">
          <img src="/images/logo.png" alt="Zenocart" onerror="this.style.display='none'">
        </a>
        <div class="nav-search">
          <span class="nav-search-icon">🔍</span>
          <input type="text" id="search-input" placeholder="Search products...">
          <div class="search-results-dropdown" id="search-dropdown"></div>
        </div>
        <div class="nav-links">
          <a href="/" class="nav-link">Home</a>
          <a href="/pages/shop.html" class="nav-link">Shop</a>
        </div>
        <div class="nav-actions">
          <button class="nav-btn" id="wishlist-nav-btn" title="Wishlist">
            🤍 <span class="cart-count hidden wishlist-count">0</span>
          </button>
          <a href="/pages/cart.html" class="nav-btn" title="Cart">
            🛒 <span class="cart-count hidden">0</span>
          </a>
          <a href="https://facebook.com/zenocart.bd" target="_blank" class="nav-btn nav-btn-fb">
            <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <span class="fb-label">Facebook</span>
          </a>
          <button class="hamburger" id="hamburger"><span></span><span></span><span></span></button>
        </div>
      </div>
    </div>
    <div class="mobile-menu" id="mobile-menu">
      <div class="mobile-search" style="position:relative">
        <span style="position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--gray)">🔍</span>
        <input type="text" id="mobile-search-input" placeholder="Search products...">
        <div class="search-results-dropdown" id="mobile-search-dropdown"></div>
      </div>
      <a href="/" class="nav-link">Home</a>
      <a href="/pages/shop.html" class="nav-link">Shop</a>
      <a href="/pages/cart.html" class="nav-link">Cart</a>
      <a href="https://facebook.com/zenocart.bd" target="_blank" class="mobile-fb-btn">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        Facebook
      </a>
    </div>
  </nav>`;

  const overlayHTML = `
  <div class="drawer-overlay" id="drawer-overlay"></div>
  <div class="drawer" id="wishlist-drawer">
    <div class="drawer-header">
      <h3>❤️ My Wishlist</h3>
      <button class="drawer-close" id="drawer-close-btn">✕</button>
    </div>
    <div class="drawer-body" id="wishlist-drawer-body"></div>
  </div>
  <div class="toast-container" id="toast-container"></div>
  <div class="mobile-bottom-bar" id="mobile-bottom-bar">
    <a href="/pages/cart.html" class="active-tab">
      🛒 <span>Cart</span><span class="cart-count hidden" style="position:static;width:auto;height:auto;border-radius:100px;padding:0 6px;font-size:.7rem;border:none;background:var(--accent);color:#fff;margin-left:2px" id="mobile-cart-count"></span>
    </a>
    <button onclick="document.getElementById('wishlist-nav-btn').click()">
      🤍 <span>Wishlist</span>
    </button>
    <a href="/pages/shop.html">
      🛍️ <span>Shop</span>
    </a>
  </div>`;

  const footerHTML = `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <img src="/images/logo.png" alt="Zenocart" style="height:44px;width:auto;filter:brightness(0) invert(1);margin-bottom:14px">
          <p>Your trusted online marketplace for quality electronics and lifestyle products — delivered nationwide across Bangladesh.</p>
          <div class="footer-social">
            <a href="https://facebook.com/zenocart.bd" target="_blank" class="social-btn social-btn-fb">
              <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          </div>
        </div>
        <div class="footer-col"><h4>Quick Links</h4><ul>
          <li><a href="/">Home</a></li>
          <li><a href="/pages/shop.html">Shop All</a></li>
          <li><a href="/pages/cart.html">Cart</a></li>
          <li><a href="https://facebook.com/zenocart.bd" target="_blank">Facebook</a></li>
        </ul></div>
        <div class="footer-col"><h4>Categories</h4><ul id="footer-cats">
          <li><a href="/pages/shop.html">All Products</a></li>
        </ul></div>
        <div class="footer-col"><h4>Stay Updated</h4>
          <p style="font-size:.84rem;color:rgba(255,255,255,.4);margin-bottom:14px;line-height:1.6">Follow us on Facebook for the latest deals and new arrivals.</p>
          <a href="https://facebook.com/zenocart.bd" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:11px 18px;background:#1877F2;color:#fff;border-radius:var(--r);font-size:.85rem;font-weight:600;font-family:'Plus Jakarta Sans',sans-serif;transition:var(--t)" onmouseover="this.style.background='#0D65D9'" onmouseout="this.style.background='#1877F2'">
            <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Visit Facebook Page
          </a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;width:100%">
        <p>© 2026 Zenocart. All rights reserved.</p>
        <div class="footer-bottom-links"><a href="#">Privacy Policy</a><a href="#">Terms</a></div>
      </div>
    </div>
  </footer>`;

  const navTarget = document.getElementById('nav-placeholder');
  if (navTarget) navTarget.outerHTML = navHTML;

  document.body.insertAdjacentHTML('beforeend', overlayHTML);

  const footerTarget = document.getElementById('footer-placeholder');
  if (footerTarget) footerTarget.outerHTML = footerHTML;

  fetch('/api/categories').then(r=>r.json()).then(cats=>{
    const ul = document.getElementById('footer-cats');
    if(!ul||!cats.length) return;
    ul.innerHTML = cats.filter(c=>c.active).map(c=>`<li><a href="/pages/shop.html?cat=${c.slug}">${c.icon} ${c.name}</a></li>`).join('');
  }).catch(()=>{});
}
