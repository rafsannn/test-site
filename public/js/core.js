// ZENOCART - Core (server version)
let cart = JSON.parse(localStorage.getItem('zc_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('zc_wishlist') || '[]');

function saveCart() { localStorage.setItem('zc_cart', JSON.stringify(cart)); updateCartUI(); }
function saveWishlist() { localStorage.setItem('zc_wishlist', JSON.stringify(wishlist)); updateWishlistUI(); }

// addToCart accepts optional product object (for pages that have it already loaded)
function addToCart(productId, qty, product) {
  qty = qty || 1;
  const existing = cart.find(i => i.id === productId);
  if (existing) existing.qty += qty;
  else cart.push({ id: productId, qty, name: product ? product.name : '', price: product ? product.price : 0, image: product ? product.image : '' });
  saveCart();
  const name = product ? product.shortName || product.name : 'Product';
  showToast('"' + name + '" added to cart! 🛒', 'success');
}

function removeFromCart(productId) { cart = cart.filter(i => i.id !== productId); saveCart(); renderCart(); }

function updateQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart(); renderCart();
}

function getCartTotal() { return cart.reduce((s, i) => s + (i.price || 0) * i.qty, 0); }
function getCartCount() { return cart.reduce((s, i) => s + i.qty, 0); }

function updateCartUI() {
  const count = getCartCount();
  document.querySelectorAll('.cart-count:not(.wishlist-count)').forEach(el => {
    el.textContent = count; el.classList.toggle('hidden', count === 0);
  });
  // Mobile bottom bar cart count
  const mcc = document.getElementById('mobile-cart-count');
  if (mcc) {
    mcc.textContent = count > 0 ? count : '';
    mcc.classList.toggle('hidden', count === 0);
  }
}

function toggleWishlist(productId, product) {
  const idx = wishlist.indexOf(productId);
  if (idx > -1) { wishlist.splice(idx, 1); showToast('Removed from wishlist', 'default'); }
  else { wishlist.push(productId); showToast('Added to wishlist ❤️', 'success'); }
  saveWishlist();
}
function isWishlisted(id) { return wishlist.includes(id); }

function updateWishlistUI() {
  const count = wishlist.length;
  document.querySelectorAll('.wishlist-count').forEach(el => { el.textContent = count; el.classList.toggle('hidden', count === 0); });
  renderWishlistDrawer();
}

function renderWishlistDrawer() {
  const body = document.getElementById('wishlist-drawer-body');
  if (!body) return;
  if (!wishlist.length) { body.innerHTML = '<div class="empty-wishlist"><div class="icon">🤍</div><p>Your wishlist is empty.</p></div>'; return; }
  // Try to use cached PRODUCTS if available
  const items = wishlist.map(id => {
    const p = (typeof PRODUCTS !== 'undefined' ? PRODUCTS : []).find(pr => pr.id === id);
    const cached = cart.find(c => c.id === id);
    if (!p && !cached) return '';
    const name = p ? p.name : (cached ? cached.name : 'Product');
    const price = p ? p.price : (cached ? cached.price : 0);
    const img = p ? p.image : (cached ? cached.image : '');
    const imgSrc = img ? (img.startsWith('http') ? img : '/' + img) : '/images/product-fan.jpg';
    return '<div class="wishlist-item"><img src="' + imgSrc + '" onerror="this.src=\'/images/product-fan.jpg\'" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0"><div class="wishlist-item-info"><div class="wishlist-item-name">' + name + '</div><div class="wishlist-item-price">' + formatPrice(price) + '</div></div><div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0"><button class="btn btn-primary btn-sm" onclick="addToCart(' + id + ',1,{name:\'' + name.replace(/'/g,"\\'") + '\',price:' + price + ',image:\'' + (img||'').replace(/'/g,"\\'") + '\'})" style="font-size:.75rem;padding:6px 10px">Add to Cart</button><button class="remove-btn" onclick="toggleWishlist(' + id + ');updateWishlistUI()">✕ Remove</button></div></div>';
  }).join('');
  body.innerHTML = items || '<div class="empty-wishlist"><div class="icon">🤍</div><p>Wishlist is empty.</p></div>';
}

function showToast(message, type) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type || 'default');
  const icons = { success: '✅', error: '❌', default: 'ℹ️' };
  toast.innerHTML = '<span>' + (icons[type] || icons.default) + '</span><span>' + message + '</span>';
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'slideOutRight .3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function openWishlistDrawer()  { document.getElementById('wishlist-drawer')?.classList.add('open'); document.getElementById('drawer-overlay')?.classList.add('open'); document.body.style.overflow='hidden'; }
function closeWishlistDrawer() { document.getElementById('wishlist-drawer')?.classList.remove('open'); document.getElementById('drawer-overlay')?.classList.remove('open'); document.body.style.overflow=''; }

// Live search
function initSearch(inputId, dropdownId) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = input.value.trim();
    if (!q) { dropdown.classList.remove('active'); return; }
    debounce = setTimeout(async () => {
      try {
        const res = await fetch('/api/products?q=' + encodeURIComponent(q));
        const results = (await res.json()).slice(0, 5);
        if (!results.length) { dropdown.classList.remove('active'); return; }
        dropdown.innerHTML = results.map(p => {
          const imgSrc = p.image ? (p.image.startsWith('http') ? p.image : '/' + p.image) : '/images/product-fan.jpg';
          return '<div class="search-result-item" onclick="window.location=\'/pages/product.html?id=' + p.id + '\'"><img src="' + imgSrc + '" onerror="this.src=\'/images/product-fan.jpg\'"><div><span>' + p.name + '</span><br><strong>' + formatPrice(p.price) + '</strong></div></div>';
        }).join('');
        dropdown.classList.add('active');
      } catch {}
    }, 280);
  });
  document.addEventListener('click', e => { if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('active'); });
}

function initMobileMenu() {
  const h = document.getElementById('hamburger');
  const m = document.getElementById('mobile-menu');
  if (!h || !m) return;
  h.addEventListener('click', () => {
    m.classList.toggle('open');
    h.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if (!h.contains(e.target) && !m.contains(e.target)) {
      m.classList.remove('open');
      h.classList.remove('open');
    }
  });
}

async function renderCart() {
  const container = document.getElementById('cart-items');
  const summaryContainer = document.getElementById('cart-summary-body');
  if (!container) return;
  if (!cart.length) {
    container.innerHTML = '<div class="empty-cart"><div class="empty-cart-icon">🛒</div><h3>Your cart is empty</h3><p>Looks like you haven\'t added anything yet.</p><a href="/pages/shop.html" class="btn btn-primary">Browse Products</a></div>';
    if (summaryContainer) summaryContainer.innerHTML = '<div class="summary-line"><span>Total</span><span>৳0</span></div>';
    return;
  }
  // Fetch fresh product data for items in cart
  const itemsHTML = await Promise.all(cart.map(async item => {
    let p = null;
    try { const r = await fetch('/api/products/' + item.id); if (r.ok) { p = await r.json(); item.price = p.price; item.name = p.name; item.image = p.image; } } catch {}
    const name = p ? p.name : (item.name || 'Product');
    const price = p ? p.price : (item.price || 0);
    const cat = p ? p.category : '';
    const img = p ? p.image : (item.image || '');
    const imgSrc = img ? (img.startsWith('http') ? img : '/' + img) : '/images/product-fan.jpg';
    return '<div class="cart-item"><img class="cart-item-img" src="' + imgSrc + '" onerror="this.src=\'/images/product-fan.jpg\'"><div class="cart-item-info"><div class="cart-item-cat">' + cat + '</div><div class="cart-item-name">' + name + '</div><div class="qty-control"><button class="qty-btn" onclick="updateQty(' + item.id + ',-1)">−</button><div class="qty-val">' + item.qty + '</div><button class="qty-btn" onclick="updateQty(' + item.id + ',1)">+</button></div></div><div class="cart-item-right"><div class="cart-item-price">' + formatPrice(price * item.qty) + '</div><button class="remove-btn" onclick="removeFromCart(' + item.id + ')">✕ Remove</button></div></div>';
  }));
  container.innerHTML = itemsHTML.join('');
  if (summaryContainer) {
    const subtotal = getCartTotal();
    const shipping = subtotal >= 1000 ? 0 : 80;
    summaryContainer.innerHTML = '<div class="summary-line"><span>Subtotal (' + getCartCount() + ' items)</span><span>' + formatPrice(subtotal) + '</span></div><div class="summary-line"><span>Shipping</span><span class="' + (shipping===0?'free':'') + '">' + (shipping===0?'FREE':formatPrice(shipping)) + '</span></div><div class="summary-line total"><span>Total</span><span>' + formatPrice(subtotal+shipping) + '</span></div>';
  }
}

function renderProductCard(product, basePath) {
  const wishlisted = isWishlisted(product.id);
  const imgSrc = product.image ? (product.image.startsWith('http') ? product.image : '/' + product.image) : '/images/product-fan.jpg';
  const fallback = '/images/product-fan.jpg';
  return '<div class="product-card" onclick="window.location=\'/pages/product.html?id=' + product.id + '\'">' +
    '<div class="product-card-image">' + getBadgeHTML(product.badge) +
    '<img src="' + imgSrc + '" alt="' + (product.shortName||product.name) + '" loading="lazy" onload="this.classList.add(\'loaded\')" onerror="this.onerror=null;this.src=\'' + fallback + '\';this.classList.add(\'loaded\')">' +
    '<div class="product-card-actions"><button class="product-action-btn ' + (wishlisted?'wishlisted':'') + '" data-wishlist-id="' + product.id + '" onclick="event.stopPropagation();toggleWishlist(' + product.id + ',{name:\'' + (product.name||'').replace(/'/g,"\\'") + '\',price:' + product.price + ',image:\'' + (product.image||'').replace(/'/g,"\\'") + '\'});this.textContent=isWishlisted(' + product.id + ')?\'❤️\':\'🤍\';this.classList.toggle(\'wishlisted\',isWishlisted(' + product.id + '))">' + (wishlisted?'❤️':'🤍') + '</button></div></div>' +
    '<div class="product-card-body"><div class="product-category-label">' + product.category + '</div><div class="product-name">' + product.name + '</div>' +
    '<div class="product-rating"><span class="stars">' + getStars(product.rating) + '</span><span class="rating-text"> ' + product.rating + '</span><span class="sold-text"> · ' + getSoldText(product.sold) + '</span></div>' +
    '<div class="product-price-row"><div><span class="product-price">' + formatPrice(product.price) + '</span>' + (product.oldPrice?'<span class="product-price-old">' + formatPrice(product.oldPrice) + '</span>':'') + '</div>' +
    '<button class="add-to-cart-btn" onclick="event.stopPropagation();addToCart(' + product.id + ',1,{name:\'' + (product.name||'').replace(/'/g,"\\'") + '\',shortName:\'' + (product.shortName||product.name||'').replace(/'/g,"\\'") + '\',price:' + product.price + ',image:\'' + (product.image||'').replace(/'/g,"\\'") + '\'})" title="Add to cart">+</button></div></div></div>';
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartUI(); updateWishlistUI();
  initSearch('search-input', 'search-dropdown');
  initSearch('mobile-search-input', 'mobile-search-dropdown');
  initMobileMenu();
  document.getElementById('drawer-overlay')?.addEventListener('click', closeWishlistDrawer);
  document.getElementById('drawer-close-btn')?.addEventListener('click', closeWishlistDrawer);
  document.getElementById('wishlist-nav-btn')?.addEventListener('click', openWishlistDrawer);
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if ((href === '/' && path === '/') || (href !== '/' && path.includes(href.replace(/^\//, '')))) link.classList.add('active');
  });
});
