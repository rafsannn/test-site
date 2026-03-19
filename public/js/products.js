// ZENOCART - Dynamic Product Loader
const CATEGORIES = [
  { slug: "all",        label: "All Products",  icon: "🛍️" },
  { slug: "fans",       label: "Mini Fans",      icon: "🌬️" },
  { slug: "powerbanks", label: "Power Banks",    icon: "🔋" },
  { slug: "watches",    label: "Watches",        icon: "⌚" },
  { slug: "headphones", label: "Headphones",     icon: "🎧" },
  { slug: "lamps",      label: "LED Lamps",      icon: "💡" }
];

let PRODUCTS = [];

async function loadProducts(params = {}) {
  try {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.q)        qs.set('q', params.q);
    if (params.sort)     qs.set('sort', params.sort);
    const url = '/api/products' + (qs.toString() ? '?' + qs.toString() : '');
    const res = await fetch(url);
    if (!res.ok) throw new Error('API error');
    PRODUCTS = await res.json();
    return PRODUCTS;
  } catch (e) {
    console.warn('API unavailable:', e.message);
    PRODUCTS = [];
    return PRODUCTS;
  }
}

async function loadProduct(id) {
  try {
    const res = await fetch('/api/products/' + id);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function formatPrice(price) { return "৳" + Number(price).toLocaleString('en-BD'); }
function getStars(rating) {
  const r = parseFloat(rating);
  const full = Math.floor(r);
  const half = (r % 1) >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}
function getBadgeHTML(badge) {
  if (!badge) return '';
  const labels = { hot: '🔥 Hot', new: '✨ New', sale: '💸 Sale' };
  return '<span class="product-badge badge-' + badge + '">' + (labels[badge] || badge) + '</span>';
}
function getSoldText(sold) {
  const n = parseInt(sold) || 0;
  return n >= 1000 ? (n/1000).toFixed(1).replace('.0','') + 'k Sold' : n + ' Sold';
}
