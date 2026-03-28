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

// ── Field name compatibility (Supabase uses snake_case) ──────────────────────
// Normalise a product object so templates always use the same field names
function normaliseProduct(p) {
  if (!p) return p;
  return {
    ...p,
    shortName:    p.shortName    || p.short_name   || p.name,
    categorySlug: p.categorySlug || p.category_slug || '',
    oldPrice:     p.oldPrice     != null ? p.oldPrice : (p.old_price != null ? p.old_price : null),
    specs:    typeof p.specs    === 'string' ? JSON.parse(p.specs    || '[]') : (p.specs    || []),
    images:   typeof p.images   === 'string' ? JSON.parse(p.images   || '[]') : (p.images   || [p.image]),
    variants: typeof p.variants === 'string' ? JSON.parse(p.variants || '[]') : (p.variants || []),
    reviews:  typeof p.reviews  === 'string' ? JSON.parse(p.reviews  || '[]') : (p.reviews  || []),
    in_stock:    p.in_stock    !== false,
    stock_count: parseInt(p.stock_count) || 0,
    fb_link:     p.fb_link || '',
    meta_desc:   p.meta_desc || ''
  };
}

async function loadProducts(params = {}) {
  // Return cached data instantly if no specific params requested
  if (PRODUCTS.length && !params.category && !params.q && !params.sort) return PRODUCTS;
  try {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.q)        qs.set('q', params.q);
    if (params.sort)     qs.set('sort', params.sort);
    const url = '/api/products' + (qs.toString() ? '?' + qs.toString() : '');
    const res = await fetch(url);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    PRODUCTS = data.map(normaliseProduct);
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
    return normaliseProduct(await res.json());
  } catch { return null; }
}
