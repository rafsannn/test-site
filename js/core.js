// =============================================
// ZENOCART - Core Functionality
// =============================================

// --- CART ---
let cart = JSON.parse(localStorage.getItem('zc_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('zc_wishlist') || '[]');

function saveCart() {
  localStorage.setItem('zc_cart', JSON.stringify(cart));
  updateCartUI();
}

function saveWishlist() {
  localStorage.setItem('zc_wishlist', JSON.stringify(wishlist));
  updateWishlistUI();
}

function addToCart(productId, qty = 1) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: productId, qty });
  }
  saveCart();
  showToast(`"${product.shortName}" added to cart! 🛒`, 'success');
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
  renderCart();
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  renderCart();
}

function getCartTotal() {
  return cart.reduce((sum, item) => {
    const p = PRODUCTS.find(p => p.id === item.id);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
}

function getCartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateCartUI() {
  const count = getCartCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.classList.toggle('hidden', count === 0);
  });
}

// --- WISHLIST ---
function toggleWishlist(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  const idx = wishlist.indexOf(productId);
  if (idx > -1) {
    wishlist.splice(idx, 1);
    showToast(`Removed from wishlist`, 'default');
  } else {
    wishlist.push(productId);
    showToast(`Added to wishlist ❤️`, 'success');
  }
  saveWishlist();
  document.querySelectorAll(`[data-wishlist-id="${productId}"]`).forEach(btn => {
    btn.classList.toggle('wishlisted', wishlist.includes(productId));
    btn.textContent = wishlist.includes(productId) ? '❤️' : '🤍';
  });
}

function isWishlisted(productId) {
  return wishlist.includes(productId);
}

function updateWishlistUI() {
  const count = wishlist.length;
  document.querySelectorAll('.wishlist-count').forEach(el => {
    el.textContent = count;
    el.classList.toggle('hidden', count === 0);
  });
  renderWishlistDrawer();
}

// --- TOAST ---
function showToast(message, type = 'default') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', default: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || icons.default}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- WISHLIST DRAWER ---
function openWishlistDrawer() {
  document.getElementById('wishlist-drawer')?.classList.add('open');
  document.getElementById('drawer-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeWishlistDrawer() {
  document.getElementById('wishlist-drawer')?.classList.remove('open');
  document.getElementById('drawer-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

function renderWishlistDrawer() {
  const body = document.getElementById('wishlist-drawer-body');
  if (!body) return;
  if (wishlist.length === 0) {
    body.innerHTML = `<div class="empty-wishlist">
      <div class="icon">🤍</div>
      <p>Your wishlist is empty.<br>Start adding products you love!</p>
    </div>`;
    return;
  }
  body.innerHTML = wishlist.map(id => {
    const p = PRODUCTS.find(pr => pr.id === id);
    if (!p) return '';
    return `<div class="wishlist-item">
      <img src="${p.image}" alt="${p.shortName}" onerror="this.onerror=null;this.src='images/product-fan.jpg'">
      <div class="wishlist-item-info">
        <div class="wishlist-item-name">${p.name}</div>
        <div class="wishlist-item-price">${formatPrice(p.price)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
        <button class="btn btn-primary btn-sm" onclick="addToCart(${p.id})" style="font-size:0.75rem;padding:6px 10px">Add to Cart</button>
        <button class="remove-btn" onclick="toggleWishlist(${p.id});renderWishlistDrawer()">✕ Remove</button>
      </div>
    </div>`;
  }).join('');
}

// --- SEARCH ---
function initSearch(inputId, dropdownId) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { dropdown.classList.remove('active'); return; }
    const results = PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    ).slice(0, 5);
    if (!results.length) { dropdown.classList.remove('active'); return; }
    dropdown.innerHTML = results.map(p =>
      `<div class="search-result-item" onclick="goToProduct(${p.id})">
        <img src="${p.image}" alt="${p.shortName}" onerror="this.onerror=null;this.src='images/product-fan.jpg'">
        <div>
          <span>${p.name}</span><br>
          <strong>${formatPrice(p.price)}</strong>
        </div>
      </div>`
    ).join('');
    dropdown.classList.add('active');
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

function goToProduct(id) {
  // Determine path based on current page
  const isRoot = !window.location.pathname.includes('/pages/');
  const base = isRoot ? 'pages/' : '';
  window.location.href = `${base}product.html?id=${id}`;
}

// --- MOBILE MENU ---
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!hamburger || !mobileMenu) return;
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('open');
    }
  });
}

// --- CART RENDER (cart page) ---
function renderCart() {
  const container = document.getElementById('cart-items');
  const summaryContainer = document.getElementById('cart-summary-body');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<div class="empty-cart">
      <div class="empty-cart-icon">🛒</div>
      <h3>Your cart is empty</h3>
      <p>Looks like you haven't added anything yet.</p>
      <a href="shop.html" class="btn btn-primary">Browse Products</a>
    </div>`;
    if (summaryContainer) {
      summaryContainer.innerHTML = `<div class="summary-line"><span>Total Items</span><span>0</span></div>
      <div class="summary-line total"><span>Total</span><span>৳0</span></div>`;
    }
    return;
  }

  container.innerHTML = cart.map(item => {
    const p = PRODUCTS.find(pr => pr.id === item.id);
    if (!p) return '';
    return `<div class="cart-item" id="cart-item-${p.id}">
      <img class="cart-item-img" src="${p.image}" alt="${p.shortName}" onerror="this.onerror=null;this.src='images/product-fan.jpg'">
      <div class="cart-item-info">
        <div class="cart-item-cat">${p.category}</div>
        <div class="cart-item-name">${p.name}</div>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateQty(${p.id}, -1)">−</button>
          <div class="qty-val">${item.qty}</div>
          <button class="qty-btn" onclick="updateQty(${p.id}, 1)">+</button>
        </div>
      </div>
      <div class="cart-item-right">
        <div class="cart-item-price">${formatPrice(p.price * item.qty)}</div>
        <button class="remove-btn" onclick="removeFromCart(${p.id})" title="Remove">✕ Remove</button>
      </div>
    </div>`;
  }).join('');

  if (summaryContainer) {
    const subtotal = getCartTotal();
    const shipping = subtotal >= 1000 ? 0 : 80;
    const total = subtotal + shipping;
    summaryContainer.innerHTML = `
      <div class="summary-line"><span>Subtotal (${getCartCount()} items)</span><span>${formatPrice(subtotal)}</span></div>
      <div class="summary-line"><span>Shipping</span><span class="${shipping === 0 ? 'free' : ''}">${shipping === 0 ? 'FREE' : formatPrice(shipping)}</span></div>
      <div class="summary-line total"><span>Total</span><span>${formatPrice(total)}</span></div>`;
  }
}

// --- PRODUCT CARD HTML ---
function renderProductCard(product, basePath = '') {
  const wishlisted = isWishlisted(product.id);
  const imgSrc = basePath + product.image;
  const fallback = basePath + 'images/product-fan.jpg';
  return `<div class="product-card" onclick="window.location='${basePath}pages/product.html?id=${product.id}'">
    <div class="product-card-image">
      ${getBadgeHTML(product.badge)}
      <img src="${imgSrc}" alt="${product.shortName}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.onerror=null;this.src='${fallback}';this.classList.add('loaded')">
      <div class="product-card-actions">
        <button class="product-action-btn ${wishlisted ? 'wishlisted' : ''}"
          data-wishlist-id="${product.id}"
          onclick="event.stopPropagation(); toggleWishlist(${product.id})"
          title="Wishlist">
          ${wishlisted ? '❤️' : '🤍'}
        </button>
      </div>
    </div>
    <div class="product-card-body">
      <div class="product-category-label">${product.category}</div>
      <div class="product-name">${product.name}</div>
      <div class="product-rating">
        <span class="stars">${getStars(product.rating)}</span>
        <span class="rating-text">${product.rating}</span>
        <span class="sold-text">· ${getSoldText(product.sold)}</span>
      </div>
      <div class="product-price-row">
        <div>
          <span class="product-price">${formatPrice(product.price)}</span>
          ${product.oldPrice ? `<span class="product-price-old">${formatPrice(product.oldPrice)}</span>` : ''}
        </div>
        <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart(${product.id})" title="Add to cart">+</button>
      </div>
    </div>
  </div>`;
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  updateCartUI();
  updateWishlistUI();
  initSearch('search-input', 'search-dropdown');
  initSearch('mobile-search-input', 'mobile-search-dropdown');
  initMobileMenu();

  // Drawer close
  document.getElementById('drawer-overlay')?.addEventListener('click', closeWishlistDrawer);
  document.getElementById('drawer-close-btn')?.addEventListener('click', closeWishlistDrawer);

  // Wishlist btn
  document.getElementById('wishlist-nav-btn')?.addEventListener('click', openWishlistDrawer);

  // Set active nav
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (path.endsWith(href) || (href.includes('shop') && path.includes('shop')) || (href === 'index.html' && (path.endsWith('/') || path.endsWith('index.html')))) {
      link.classList.add('active');
    }
  });
});
