/**
 * ZENOCART - Backend Server
 * Pure Node.js — zero npm dependencies required
 * Run: node server.js
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT      = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const USERS_FILE= path.join(__dirname, 'data', 'users.json');
const UPLOADS   = path.join(__dirname, 'uploads');
const PUBLIC    = path.join(__dirname, 'public');

// ── In-memory session store ─────────────────────────────────────────────────
const sessions = {};
function makeSession() {
  const id = crypto.randomBytes(24).toString('hex');
  sessions[id] = { loggedIn: false, created: Date.now() };
  return id;
}
function getSession(req) {
  const cookie = (req.headers.cookie || '').split(';').find(c => c.trim().startsWith('zc_sid='));
  if (!cookie) return null;
  const sid = cookie.split('=')[1].trim();
  return sessions[sid] ? { sid, data: sessions[sid] } : null;
}
function requireAuth(req, res) {
  const s = getSession(req);
  if (!s || !s.data.loggedIn) {
    respond(res, 401, { error: 'Unauthorized' });
    return false;
  }
  return true;
}

// ── Data helpers ─────────────────────────────────────────────────────────────
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Seed default admin + demo products on first run
function initData() {
  if (!fs.existsSync(USERS_FILE)) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHmac('sha256', salt).update('admin123').digest('hex');
    writeJSON(USERS_FILE, [{ username: 'admin', salt, hash, role: 'admin' }]);
    console.log('✅  Default admin created  →  username: admin  |  password: admin123');
  }
  if (!fs.existsSync(DATA_FILE)) {
    writeJSON(DATA_FILE, getDefaultProducts());
    console.log('✅  Demo products seeded');
  }
}

// ── Response helpers ─────────────────────────────────────────────────────────
function respond(res, status, body, headers = {}) {
  const isObj = typeof body === 'object';
  res.writeHead(status, {
    'Content-Type': isObj ? 'application/json' : 'text/plain',
    ...headers
  });
  res.end(isObj ? JSON.stringify(body) : body);
}

function setCookie(res, sid) {
  res.setHeader('Set-Cookie', `zc_sid=${sid}; HttpOnly; Path=/; SameSite=Lax`);
}

// ── Body parser ──────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseJSON(buf) {
  try { return JSON.parse(buf.toString()); } catch { return null; }
}

// ── Multipart form parser (for image upload) ──────────────────────────────────
function parseMultipart(buf, boundary) {
  const fields = {};
  let fileBuffer = null, fileName = '';
  const parts = buf.toString('binary').split('--' + boundary);
  for (const part of parts) {
    if (!part.includes('Content-Disposition')) continue;
    const [headers, ...rest] = part.split('\r\n\r\n');
    const body = rest.join('\r\n\r\n').replace(/\r\n$/, '');
    const nameMatch = headers.match(/name="([^"]+)"/);
    const fileMatch = headers.match(/filename="([^"]+)"/);
    if (!nameMatch) continue;
    if (fileMatch) {
      fileName = fileMatch[1];
      fileBuffer = Buffer.from(body, 'binary');
    } else {
      fields[nameMatch[1]] = body;
    }
  }
  return { fields, fileBuffer, fileName };
}

// ── Static file server ────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp'
};

function serveStatic(res, filePath) {
  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) { respond(res, 404, 'Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

// ── Router ────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS for dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const u = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = u.pathname;
  const method   = req.method;

  // ── API ROUTES ──────────────────────────────────────────────────────────────

  // GET /api/products  — public
  if (pathname === '/api/products' && method === 'GET') {
    const products = readJSON(DATA_FILE, []);
    const cat   = u.searchParams.get('category');
    const q     = u.searchParams.get('q');
    const sort  = u.searchParams.get('sort');
    let list = [...products];
    if (cat && cat !== 'all') list = list.filter(p => p.categorySlug === cat);
    if (q) { const ql = q.toLowerCase(); list = list.filter(p => p.name.toLowerCase().includes(ql) || p.category.toLowerCase().includes(ql)); }
    if (sort === 'price-low')  list.sort((a,b) => a.price - b.price);
    if (sort === 'price-high') list.sort((a,b) => b.price - a.price);
    if (sort === 'rating')     list.sort((a,b) => b.rating - a.rating);
    if (sort === 'sold')       list.sort((a,b) => b.sold - a.sold);
    return respond(res, 200, list);
  }

  // GET /api/products/:id  — public
  if (pathname.match(/^\/api\/products\/\d+$/) && method === 'GET') {
    const id = parseInt(pathname.split('/')[3]);
    const products = readJSON(DATA_FILE, []);
    const p = products.find(x => x.id === id);
    return p ? respond(res, 200, p) : respond(res, 404, { error: 'Not found' });
  }

  // POST /api/auth/login
  if (pathname === '/api/auth/login' && method === 'POST') {
    const buf  = await readBody(req);
    const body = parseJSON(buf);
    if (!body) return respond(res, 400, { error: 'Bad request' });
    const users = readJSON(USERS_FILE, []);
    const user  = users.find(u => u.username === body.username);
    if (!user) return respond(res, 401, { error: 'Invalid credentials' });
    const hash = crypto.createHmac('sha256', user.salt).update(body.password).digest('hex');
    if (hash !== user.hash) return respond(res, 401, { error: 'Invalid credentials' });
    const sid = makeSession();
    sessions[sid].loggedIn = true;
    setCookie(res, sid);
    return respond(res, 200, { ok: true, username: user.username }, { 'Set-Cookie': `zc_sid=${sid}; HttpOnly; Path=/; SameSite=Lax` });
  }

  // POST /api/auth/logout
  if (pathname === '/api/auth/logout' && method === 'POST') {
    const s = getSession(req);
    if (s) delete sessions[s.sid];
    return respond(res, 200, { ok: true });
  }

  // GET /api/auth/me
  if (pathname === '/api/auth/me' && method === 'GET') {
    const s = getSession(req);
    return respond(res, 200, { loggedIn: !!(s && s.data.loggedIn) });
  }

  // POST /api/auth/change-password  — protected
  if (pathname === '/api/auth/change-password' && method === 'POST') {
    if (!requireAuth(req, res)) return;
    const buf  = await readBody(req);
    const body = parseJSON(buf);
    if (!body || !body.newPassword) return respond(res, 400, { error: 'Bad request' });
    const users = readJSON(USERS_FILE, []);
    const s = getSession(req);
    const user = users.find(u => u.username === s.data.username || u.role === 'admin');
    if (!user) return respond(res, 404, { error: 'User not found' });
    user.salt = crypto.randomBytes(16).toString('hex');
    user.hash = crypto.createHmac('sha256', user.salt).update(body.newPassword).digest('hex');
    writeJSON(USERS_FILE, users);
    return respond(res, 200, { ok: true });
  }

  // POST /api/admin/products  — create (multipart)
  if (pathname === '/api/admin/products' && method === 'POST') {
    if (!requireAuth(req, res)) return;
    const ct = req.headers['content-type'] || '';
    const boundaryMatch = ct.match(/boundary=(.+)/);
    if (!boundaryMatch) return respond(res, 400, { error: 'Expected multipart' });
    const buf = await readBody(req);
    const { fields, fileBuffer, fileName } = parseMultipart(buf, boundaryMatch[1]);
    let imagePath = fields.existingImage || 'images/product-fan.jpg';
    if (fileBuffer && fileName && fileBuffer.length > 100) {
      const ext   = path.extname(fileName) || '.jpg';
      const fname = `product_${Date.now()}${ext}`;
      fs.writeFileSync(path.join(UPLOADS, fname), fileBuffer);
      // Also copy to public/images for serving
      fs.writeFileSync(path.join(PUBLIC, 'images', fname), fileBuffer);
      imagePath = `images/${fname}`;
    }
    const products = readJSON(DATA_FILE, []);
    const maxId = products.reduce((m, p) => Math.max(m, p.id), 0);
    let specs = [];
    try { specs = JSON.parse(fields.specs || '[]'); } catch {}
    const newProduct = {
      id: maxId + 1,
      name: fields.name || 'New Product',
      shortName: fields.shortName || fields.name || 'New Product',
      category: fields.category || 'General',
      categorySlug: fields.categorySlug || 'general',
      price: parseFloat(fields.price) || 0,
      oldPrice: fields.oldPrice ? parseFloat(fields.oldPrice) : null,
      rating: parseFloat(fields.rating) || 5.0,
      sold: parseInt(fields.sold) || 0,
      badge: fields.badge || null,
      image: imagePath,
      images: [imagePath],
      description: fields.description || '',
      specs,
      createdAt: new Date().toISOString()
    };
    products.push(newProduct);
    writeJSON(DATA_FILE, products);
    return respond(res, 201, newProduct);
  }

  // PUT /api/admin/products/:id  — update
  if (pathname.match(/^\/api\/admin\/products\/\d+$/) && method === 'PUT') {
    if (!requireAuth(req, res)) return;
    const id = parseInt(pathname.split('/')[4]);
    const ct = req.headers['content-type'] || '';
    const products = readJSON(DATA_FILE, []);
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return respond(res, 404, { error: 'Not found' });
    let fields, fileBuffer, fileName;
    if (ct.includes('multipart')) {
      const boundaryMatch = ct.match(/boundary=(.+)/);
      const buf = await readBody(req);
      ({ fields, fileBuffer, fileName } = parseMultipart(buf, boundaryMatch[1]));
    } else {
      const buf = await readBody(req);
      fields = parseJSON(buf) || {};
    }
    let imagePath = products[idx].image;
    if (fileBuffer && fileName && fileBuffer.length > 100) {
      const ext   = path.extname(fileName) || '.jpg';
      const fname = `product_${Date.now()}${ext}`;
      fs.writeFileSync(path.join(UPLOADS, fname), fileBuffer);
      fs.writeFileSync(path.join(PUBLIC, 'images', fname), fileBuffer);
      imagePath = `images/${fname}`;
    }
    let specs = products[idx].specs;
    if (fields.specs) { try { specs = JSON.parse(fields.specs); } catch {} }
    products[idx] = {
      ...products[idx],
      name:         fields.name        || products[idx].name,
      shortName:    fields.shortName   || products[idx].shortName,
      category:     fields.category    || products[idx].category,
      categorySlug: fields.categorySlug|| products[idx].categorySlug,
      price:        fields.price       ? parseFloat(fields.price)   : products[idx].price,
      oldPrice:     fields.oldPrice !== undefined ? (fields.oldPrice ? parseFloat(fields.oldPrice) : null) : products[idx].oldPrice,
      rating:       fields.rating      ? parseFloat(fields.rating)  : products[idx].rating,
      sold:         fields.sold        ? parseInt(fields.sold)      : products[idx].sold,
      badge:        fields.badge !== undefined ? (fields.badge || null) : products[idx].badge,
      description:  fields.description || products[idx].description,
      image:        imagePath,
      images:       [imagePath],
      specs,
      updatedAt: new Date().toISOString()
    };
    writeJSON(DATA_FILE, products);
    return respond(res, 200, products[idx]);
  }

  // DELETE /api/admin/products/:id
  if (pathname.match(/^\/api\/admin\/products\/\d+$/) && method === 'DELETE') {
    if (!requireAuth(req, res)) return;
    const id = parseInt(pathname.split('/')[4]);
    let products = readJSON(DATA_FILE, []);
    const exists = products.find(p => p.id === id);
    if (!exists) return respond(res, 404, { error: 'Not found' });
    products = products.filter(p => p.id !== id);
    writeJSON(DATA_FILE, products);
    return respond(res, 200, { ok: true });
  }

  // ── SERVE UPLOADED IMAGES ────────────────────────────────────────────────
  if (pathname.startsWith('/uploads/')) {
    const file = path.join(UPLOADS, pathname.replace('/uploads/', ''));
    if (fs.existsSync(file)) return serveStatic(res, file);
    return respond(res, 404, 'Not found');
  }

  // ── SERVE ADMIN PANEL ────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    const file = path.join(__dirname, 'admin', 'index.html');
    if (fs.existsSync(file)) return serveStatic(res, file);
    return respond(res, 404, 'Admin panel not found');
  }

  // ── SERVE PUBLIC STATIC FILES ─────────────────────────────────────────────
  let filePath = path.join(PUBLIC, pathname === '/' ? 'index.html' : pathname);
  // Prevent path traversal
  if (!filePath.startsWith(PUBLIC)) { respond(res, 403, 'Forbidden'); return; }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  if (fs.existsSync(filePath)) return serveStatic(res, filePath);

  respond(res, 404, 'Not found');
});

// ── Start ─────────────────────────────────────────────────────────────────────
initData();
server.listen(PORT, () => {
  console.log(`\n🚀  Zenocart running at  →  http://localhost:${PORT}`);
  console.log(`🔧  Admin panel          →  http://localhost:${PORT}/admin`);
  console.log(`📦  API                  →  http://localhost:${PORT}/api/products\n`);
});

// ── Default products ──────────────────────────────────────────────────────────
function getDefaultProducts() {
  return [
    { id:1, name:"Charging Portable Mini Fan - Bear Edition", shortName:"Mini USB Portable Fan", category:"Mini Fans", categorySlug:"fans", price:650, oldPrice:850, rating:4.8, sold:9400, badge:"hot", image:"images/product-fan.jpg", images:["images/product-fan.jpg"], description:"Stay cool anywhere with this adorable bear-themed portable fan. USB charging, multiple speed settings, compact design.", specs:[{label:"Type",value:"USB Rechargeable"},{label:"Speeds",value:"3 Speed Settings"},{label:"Colors",value:"Pink, Yellow, Green, Dark Green"}], createdAt:new Date().toISOString() },
    { id:2, name:"20000mAh Power Bank Fast Charging with Built-in Cables", shortName:"20000mAh Power Bank", category:"Power Banks", categorySlug:"powerbanks", price:1250, oldPrice:1600, rating:4.9, sold:2900, badge:"new", image:"images/product-powerbank.jpg", images:["images/product-powerbank.jpg"], description:"20000mAh large capacity power bank with 20W fast charging, built-in cables, LED display and night light.", specs:[{label:"Capacity",value:"20000mAh"},{label:"Output",value:"20W Fast Charging"},{label:"Extra",value:"Built-in Night Light"}], createdAt:new Date().toISOString() },
    { id:3, name:"Luminous Waterproof Men's Watch - Black Edition", shortName:"Men's Stainless Steel Watch", category:"Watches", categorySlug:"watches", price:1850, oldPrice:2400, rating:5.0, sold:951, badge:"sale", image:"images/product-watch.jpg", images:["images/product-watch.jpg"], description:"Stainless steel waterproof watch with luminous hands and unique rotary time display.", specs:[{label:"Material",value:"Stainless Steel"},{label:"Water Resistance",value:"Yes"},{label:"Display",value:"Creative Rotary Dial"}], createdAt:new Date().toISOString() },
    { id:4, name:"Y10 Bluetooth Neckband Wireless Sports Earphone", shortName:"Neckband Bluetooth Earphones", category:"Headphones", categorySlug:"headphones", price:890, oldPrice:1100, rating:5.0, sold:2800, badge:"hot", image:"images/product-headphones.jpg", images:["images/product-headphones.jpg"], description:"Sports neckband with ultra-long battery, noise reduction and LED display. 500mAh battery.", specs:[{label:"Battery",value:"500mAh"},{label:"Connection",value:"Bluetooth 5.0"},{label:"Feature",value:"Noise Reduction"}], createdAt:new Date().toISOString() },
    { id:5, name:"Clip-On Rechargeable LED Study Lamp - 4000K Natural Light", shortName:"Clip-On LED Study Lamp", category:"LED Lamps", categorySlug:"lamps", price:720, oldPrice:950, rating:4.7, sold:10900, badge:"hot", image:"images/product-lamp.jpg", images:["images/product-lamp.jpg"], description:"Eye-care clip-on LED lamp with 4000K natural light, touch controls and USB charging.", specs:[{label:"Color Temp",value:"4000K Natural White"},{label:"Control",value:"Touch Sensitive"},{label:"Charging",value:"USB Rechargeable"}], createdAt:new Date().toISOString() },
    { id:6, name:"Human Body Sensor Night Light - Magnetic Rechargeable", shortName:"Motion Sensor Night Light", category:"LED Lamps", categorySlug:"lamps", price:480, oldPrice:650, rating:4.3, sold:26600, badge:"hot", image:"images/product-lamp.jpg", images:["images/product-lamp.jpg"], description:"Smart wireless PIR night light with magnetic mount and built-in USB cable.", specs:[{label:"Sensor",value:"PIR Human Body"},{label:"Mount",value:"Magnetic Adhesive"},{label:"Charging",value:"Built-in USB Cable"}], createdAt:new Date().toISOString() }
  ];
}
