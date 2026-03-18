// =============================================
// ZENOCART - Shared Layout Components
// Call injectLayout(root) where root is '' for index, '../' for pages/
// =============================================

function injectLayout(root = '') {
  const navHTML = `
  <nav class="navbar">
    <div class="container">
      <div class="navbar-inner">
        <a href="${root}index.html" class="nav-logo">
          <img src="${root}images/logo.png" alt="Zenocart" onerror="this.style.display='none';this.nextSibling.style.display='block'">
          <span style="display:none;font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:700;color:var(--primary)">ZenoCart</span>
        </a>

        <div class="nav-search">
          <span class="nav-search-icon">🔍</span>
          <input type="text" id="search-input" placeholder="Search products...">
          <div class="search-results-dropdown" id="search-dropdown"></div>
        </div>

        <div class="nav-links">
          <a href="${root}index.html" class="nav-link">Home</a>
          <a href="${root}pages/shop.html" class="nav-link">Shop</a>
        </div>

        <div class="nav-actions">
          <button class="nav-btn" id="wishlist-nav-btn" title="Wishlist">
            🤍
            <span class="cart-count hidden wishlist-count">0</span>
          </button>
          <a href="${root}pages/cart.html" class="nav-btn" title="Cart">
            🛒
            <span class="cart-count hidden">0</span>
          </a>
          <a href="https://facebook.com/zenocart.bd" target="_blank" class="nav-btn nav-btn-fb" title="Facebook">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </a>
          <button class="hamburger" id="hamburger" aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div class="mobile-menu" id="mobile-menu">
      <div class="mobile-search" style="position:relative">
        <span class="mobile-search-icon" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--gray)">🔍</span>
        <input type="text" id="mobile-search-input" placeholder="Search products...">
        <div class="search-results-dropdown" id="mobile-search-dropdown"></div>
      </div>
      <a href="${root}index.html" class="nav-link">🏠 Home</a>
      <a href="${root}pages/shop.html" class="nav-link">🛍️ Shop</a>
      <a href="${root}pages/cart.html" class="nav-link">🛒 Cart</a>
      <a href="https://facebook.com/zenocart.bd" target="_blank" class="nav-link" style="color:#1877f2">📘 Facebook Page</a>
    </div>
  </nav>

  <!-- Wishlist Drawer -->
  <div class="drawer-overlay" id="drawer-overlay"></div>
  <div class="drawer" id="wishlist-drawer">
    <div class="drawer-header">
      <h3>❤️ My Wishlist</h3>
      <button class="drawer-close" id="drawer-close-btn">✕</button>
    </div>
    <div class="drawer-body" id="wishlist-drawer-body"></div>
  </div>

  <!-- Toast Container -->
  <div class="toast-container" id="toast-container"></div>
  `;

  const footerHTML = `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <img src="${root}images/logo.png" alt="Zenocart">
          <p>Zenocart is your trusted online marketplace for quality electronics, accessories, and lifestyle products — delivered to your door across Bangladesh.</p>
          <div class="footer-social">
            <a href="https://facebook.com/zenocart.bd" target="_blank" class="social-btn social-btn-fb" title="Facebook">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          </div>
        </div>

        <div class="footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="${root}index.html">Home</a></li>
            <li><a href="${root}pages/shop.html">Shop All</a></li>
            <li><a href="${root}pages/cart.html">Cart</a></li>
            <li><a href="https://facebook.com/zenocart.bd" target="_blank">Facebook</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Categories</h4>
          <ul>
            <li><a href="${root}pages/shop.html?cat=fans">Mini Fans</a></li>
            <li><a href="${root}pages/shop.html?cat=powerbanks">Power Banks</a></li>
            <li><a href="${root}pages/shop.html?cat=watches">Watches</a></li>
            <li><a href="${root}pages/shop.html?cat=headphones">Headphones</a></li>
            <li><a href="${root}pages/shop.html?cat=lamps">LED Lamps</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Stay Updated</h4>
          <p style="font-size:0.85rem;color:rgba(255,255,255,0.6);margin-bottom:16px">Follow us on Facebook for the latest deals and new arrivals.</p>
          <a href="https://facebook.com/zenocart.bd" target="_blank" class="btn" style="background:#1877f2;color:#fff;width:100%;justify-content:center;gap:8px;margin-bottom:12px">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Visit Our Facebook Page
          </a>
          <p style="font-size:0.78rem;color:rgba(255,255,255,0.4)">📦 Nationwide Delivery<br>✅ Quality Guaranteed</p>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;width:100%">
        <p>© 2026 Zenocart Online Marketplace. All rights reserved.</p>
        <div class="footer-bottom-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Return Policy</a>
        </div>
      </div>
    </div>
  </footer>
  `;

  // Inject nav
  const navTarget = document.getElementById('nav-placeholder');
  if (navTarget) navTarget.outerHTML = navHTML;

  // Inject footer
  const footerTarget = document.getElementById('footer-placeholder');
  if (footerTarget) footerTarget.outerHTML = footerHTML;
}
