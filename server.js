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
// ── Inline admin panel HTML ─────────────────────────────────────────────────
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Zenocart Admin</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>
:root {
  --primary:#1e7a8f; --primary-dark:#155f70; --primary-light:#4aa8bc;
  --primary-ultra:#e8f5f8; --accent:#2db8d4; --dark:#1a2b2e;
  --gray:#6b7f84; --gray-light:#b8c8cc; --border:#e2eced;
  --bg:#f7fbfc; --white:#fff; --danger:#e05555; --success:#2ecc71;
  --warning:#f39c12; --shadow:0 4px 20px rgba(30,122,143,.12);
  --r:12px; --t:all .22s cubic-bezier(.4,0,.2,1);
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--dark);min-height:100vh}
a{text-decoration:none;color:inherit}
button{cursor:pointer;font-family:'DM Sans',sans-serif;border:none}
input,select,textarea{font-family:'DM Sans',sans-serif}

/* ── LOGIN ── */
#login-screen{display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,var(--primary-dark),var(--primary-light))}
.login-box{background:var(--white);border-radius:20px;padding:48px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.login-logo{text-align:center;margin-bottom:32px}
.login-logo img{max-height:56px;max-width:200px;object-fit:contain}
.login-logo h2{font-family:'Playfair Display',serif;font-size:1.5rem;color:var(--dark);margin-top:12px}
.login-logo p{font-size:.85rem;color:var(--gray);margin-top:4px}
.form-group{margin-bottom:18px}
.form-group label{display:block;font-size:.82rem;font-weight:600;color:var(--dark);margin-bottom:6px}
.form-group input{width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:var(--r);font-size:.9rem;outline:none;transition:var(--t)}
.form-group input:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(30,122,143,.1)}
.login-err{background:#fff0f0;border:1px solid #fcc;border-radius:8px;padding:10px 14px;font-size:.85rem;color:var(--danger);margin-bottom:16px;display:none}
.btn-login{width:100%;padding:13px;background:var(--primary);color:#fff;border-radius:var(--r);font-size:1rem;font-weight:600;transition:var(--t)}
.btn-login:hover{background:var(--primary-dark)}

/* ── LAYOUT ── */
#app{display:none;min-height:100vh}
.sidebar{width:240px;background:var(--dark);position:fixed;top:0;left:0;height:100vh;display:flex;flex-direction:column;z-index:100}
.sidebar-logo{padding:24px 20px;border-bottom:1px solid rgba(255,255,255,.08)}
.sidebar-logo img{max-height:44px;max-width:160px;object-fit:contain;filter:brightness(0) invert(1)}
.sidebar-logo span{display:block;font-size:.72rem;color:rgba(255,255,255,.4);margin-top:4px;text-transform:uppercase;letter-spacing:.1em}
.sidebar-nav{flex:1;padding:16px 0;overflow-y:auto}
.nav-item{display:flex;align-items:center;gap:12px;padding:11px 20px;font-size:.875rem;color:rgba(255,255,255,.65);transition:var(--t);cursor:pointer;border-left:3px solid transparent}
.nav-item:hover{background:rgba(255,255,255,.06);color:#fff}
.nav-item.active{background:rgba(45,184,212,.12);color:var(--accent);border-left-color:var(--accent)}
.nav-item .icon{font-size:1.1rem;width:20px;text-align:center}
.sidebar-footer{padding:16px 20px;border-top:1px solid rgba(255,255,255,.08)}
.sidebar-footer button{width:100%;padding:9px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.6);border-radius:8px;font-size:.82rem;transition:var(--t)}
.sidebar-footer button:hover{background:rgba(224,85,85,.2);color:#ff8080}

.main{margin-left:240px;min-height:100vh}
.topbar{background:var(--white);border-bottom:1px solid var(--border);padding:0 32px;height:68px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
.topbar h1{font-family:'Playfair Display',serif;font-size:1.4rem;color:var(--dark)}
.topbar-right{display:flex;align-items:center;gap:12px}
.topbar-badge{display:flex;align-items:center;gap:8px;padding:6px 14px;background:var(--primary-ultra);border-radius:100px;font-size:.8rem;color:var(--primary);font-weight:600}
.topbar-badge .dot{width:7px;height:7px;background:var(--success);border-radius:50%}

.content{padding:32px}

/* ── STATS CARDS ── */
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:32px}
.stat-card{background:var(--white);border-radius:var(--r);padding:20px 24px;border:1px solid var(--border);display:flex;align-items:center;gap:16px}
.stat-icon{width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0}
.stat-icon.teal{background:var(--primary-ultra)}
.stat-icon.green{background:#e8f8f0}
.stat-icon.orange{background:#fff6e8}
.stat-icon.red{background:#fff0f0}
.stat-label{font-size:.78rem;color:var(--gray);margin-bottom:4px}
.stat-value{font-size:1.6rem;font-weight:700;color:var(--dark);line-height:1}

/* ── SECTION ── */
.section-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
.section-bar h2{font-size:1.05rem;font-weight:700;color:var(--dark)}
.search-filter{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.search-filter input,.search-filter select{padding:8px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:.85rem;outline:none;transition:var(--t);background:var(--white)}
.search-filter input:focus,.search-filter select:focus{border-color:var(--primary)}
.search-filter input{min-width:220px}

/* ── TABLE ── */
.table-wrap{background:var(--white);border-radius:var(--r);border:1px solid var(--border);overflow:hidden}
table{width:100%;border-collapse:collapse}
thead{background:var(--bg)}
th{padding:12px 16px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--gray);text-align:left;border-bottom:1px solid var(--border)}
td{padding:13px 16px;font-size:.875rem;color:var(--dark);border-bottom:1px solid var(--border);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--bg)}
.prod-img{width:52px;height:52px;border-radius:8px;object-fit:cover;border:1px solid var(--border)}
.prod-name{font-weight:600;max-width:200px}
.prod-name small{display:block;font-weight:400;color:var(--gray);font-size:.78rem;margin-top:2px}
.cat-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:100px;font-size:.72rem;font-weight:600;background:var(--primary-ultra);color:var(--primary)}
.badge-pill{display:inline-block;padding:3px 9px;border-radius:100px;font-size:.7rem;font-weight:700}
.bp-hot{background:#fff0f0;color:#e05555}
.bp-new{background:#e8f5f8;color:var(--primary)}
.bp-sale{background:#fff6e8;color:var(--warning)}
.bp-none{background:var(--bg);color:var(--gray)}
.action-btns{display:flex;gap:6px}
.btn-edit,.btn-del{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.9rem;transition:var(--t)}
.btn-edit{background:var(--primary-ultra);color:var(--primary)}
.btn-edit:hover{background:var(--primary);color:#fff}
.btn-del{background:#fff0f0;color:var(--danger)}
.btn-del:hover{background:var(--danger);color:#fff}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;border-radius:var(--r);font-size:.875rem;font-weight:600;transition:var(--t);cursor:pointer;border:none}
.btn-primary{background:var(--primary);color:#fff}
.btn-primary:hover{background:var(--primary-dark);transform:translateY(-1px)}
.btn-sm{padding:7px 14px;font-size:.8rem}
.btn-outline{background:transparent;color:var(--primary);border:1.5px solid var(--primary)}
.btn-outline:hover{background:var(--primary);color:#fff}
.btn-danger{background:var(--danger);color:#fff}
.btn-danger:hover{background:#c0392b}

/* ── MODAL ── */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;display:none;align-items:center;justify-content:center;padding:20px}
.overlay.open{display:flex}
.modal{background:var(--white);border-radius:20px;width:100%;max-width:660px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.modal-header{padding:22px 28px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--white);z-index:10}
.modal-header h3{font-size:1.05rem;font-weight:700}
.modal-close{width:32px;height:32px;background:var(--bg);border-radius:50%;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:var(--t)}
.modal-close:hover{background:var(--border)}
.modal-body{padding:24px 28px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.form-row.full{grid-template-columns:1fr}
.fg{display:flex;flex-direction:column;gap:6px}
.fg label{font-size:.8rem;font-weight:600;color:var(--dark)}
.fg input,.fg select,.fg textarea{padding:10px 13px;border:1.5px solid var(--border);border-radius:8px;font-size:.875rem;outline:none;transition:var(--t)}
.fg input:focus,.fg select:focus,.fg textarea:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(30,122,143,.08)}
.fg textarea{resize:vertical;min-height:80px}
.img-preview-box{width:100%;height:140px;border:2px dashed var(--border);border-radius:var(--r);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:var(--t);overflow:hidden;position:relative;background:var(--bg)}
.img-preview-box:hover{border-color:var(--primary);background:var(--primary-ultra)}
.img-preview-box img{width:100%;height:100%;object-fit:cover}
.img-preview-box .placeholder{text-align:center;color:var(--gray);pointer-events:none}
.img-preview-box .placeholder .icon{font-size:2rem;margin-bottom:8px}
.img-preview-box .placeholder p{font-size:.8rem}
.specs-list{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
.spec-row{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:center}
.spec-row input{padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:.82rem;outline:none}
.spec-row input:focus{border-color:var(--primary)}
.btn-add-spec{background:var(--primary-ultra);color:var(--primary);border:1.5px dashed var(--primary-light);border-radius:8px;padding:7px;font-size:.8rem;font-weight:600;width:100%;transition:var(--t)}
.btn-add-spec:hover{background:var(--primary);color:#fff}
.modal-footer{padding:18px 28px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;position:sticky;bottom:0;background:var(--white)}
.form-err{background:#fff0f0;border:1px solid #fcc;border-radius:8px;padding:10px 14px;font-size:.85rem;color:var(--danger);margin-bottom:16px;display:none}

/* ── TOAST ── */
.toast-wrap{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px}
.toast{padding:13px 20px;border-radius:var(--r);color:#fff;font-size:.875rem;font-weight:500;box-shadow:var(--shadow);animation:slideIn .3s ease;display:flex;align-items:center;gap:10px;min-width:240px}
.toast.ok{background:var(--success)}
.toast.err{background:var(--danger)}
.toast.info{background:var(--dark)}
@keyframes slideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(40px)}}

/* ── EMPTY STATE ── */
.empty-state{text-align:center;padding:64px 24px}
.empty-state .icon{font-size:3.5rem;margin-bottom:16px}
.empty-state h3{font-size:1.1rem;font-weight:600;margin-bottom:8px}
.empty-state p{color:var(--gray);font-size:.875rem}

/* ── SETTINGS ── */
.settings-card{background:var(--white);border-radius:var(--r);border:1px solid var(--border);padding:28px;max-width:480px}
.settings-card h3{font-size:1rem;font-weight:700;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid var(--border)}

/* ── TABS ── */
.tabs{display:flex;gap:4px;background:var(--bg);border-radius:10px;padding:4px;margin-bottom:28px;border:1px solid var(--border)}
.tab-btn{flex:1;padding:9px 16px;border-radius:8px;font-size:.875rem;font-weight:600;background:transparent;color:var(--gray);transition:var(--t);text-align:center}
.tab-btn.active{background:var(--white);color:var(--primary);box-shadow:var(--shadow)}

/* ── RESPONSIVE ── */
@media(max-width:900px){
  .sidebar{transform:translateX(-100%)}
  .main{margin-left:0}
  .stats-grid{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:600px){
  .stats-grid{grid-template-columns:1fr 1fr}
  .form-row{grid-template-columns:1fr}
  .content{padding:20px}
}

/* ── LINK TO STOREFRONT ── */
.store-link{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;background:var(--primary-ultra);color:var(--primary);border-radius:100px;font-size:.82rem;font-weight:600;transition:var(--t)}
.store-link:hover{background:var(--primary);color:#fff}
</style>
</head>
<body>

<!-- ── LOGIN SCREEN ─────────────────────────────────────── -->
<div id="login-screen">
  <div class="login-box">
    <div class="login-logo">
      <img src="/images/logo.png" alt="Zenocart" onerror="this.style.display='none'">
      <h2>Admin Panel</h2>
      <p>Sign in to manage your store</p>
    </div>
    <div class="login-err" id="login-err"></div>
    <div class="form-group">
      <label>Username</label>
      <input type="text" id="login-user" value="admin" placeholder="admin">
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" id="login-pass" placeholder="••••••••" onkeydown="if(event.key==='Enter')doLogin()">
    </div>
    <button class="btn-login" onclick="doLogin()">Sign In →</button>
    <p style="text-align:center;font-size:.75rem;color:var(--gray);margin-top:20px">Default: admin / admin123</p>
  </div>
</div>

<!-- ── MAIN APP ─────────────────────────────────────────── -->
<div id="app">

  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <img src="/images/logo.png" alt="Zenocart">
      <span>Admin Panel</span>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-item active" onclick="showTab('dashboard')">
        <span class="icon">📊</span> Dashboard
      </div>
      <div class="nav-item" onclick="showTab('products')">
        <span class="icon">📦</span> Products
      </div>
      <div class="nav-item" onclick="showTab('add')">
        <span class="icon">➕</span> Add Product
      </div>
      <div class="nav-item" onclick="showTab('settings')">
        <span class="icon">⚙️</span> Settings
      </div>
    </nav>
    <div class="sidebar-footer">
      <button onclick="doLogout()">🚪 Sign Out</button>
    </div>
  </aside>

  <!-- Main content -->
  <div class="main">
    <div class="topbar">
      <h1 id="page-title">Dashboard</h1>
      <div class="topbar-right">
        <a href="/" target="_blank" class="store-link">🛍️ View Store</a>
        <div class="topbar-badge"><span class="dot"></span>Live</div>
      </div>
    </div>

    <div class="content">

      <!-- ── DASHBOARD ── -->
      <div id="tab-dashboard">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon teal">📦</div>
            <div><div class="stat-label">Total Products</div><div class="stat-value" id="stat-total">—</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green">🔥</div>
            <div><div class="stat-label">Hot Items</div><div class="stat-value" id="stat-hot">—</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange">🏷️</div>
            <div><div class="stat-label">On Sale</div><div class="stat-value" id="stat-sale">—</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon red">📂</div>
            <div><div class="stat-label">Categories</div><div class="stat-value" id="stat-cats">—</div></div>
          </div>
        </div>

        <div class="section-bar"><h2>Recent Products</h2>
          <button class="btn btn-primary btn-sm" onclick="showTab('add')">➕ Add Product</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Badge</th><th>Actions</th></tr></thead>
            <tbody id="recent-tbody"></tbody>
          </table>
        </div>
      </div>

      <!-- ── PRODUCTS LIST ── -->
      <div id="tab-products" style="display:none">
        <div class="section-bar">
          <h2>All Products <span id="products-count" style="font-weight:400;color:var(--gray);font-size:.875rem"></span></h2>
          <div class="search-filter">
            <input type="text" id="search-q" placeholder="🔍  Search products…" oninput="filterTable()">
            <select id="filter-cat" onchange="filterTable()">
              <option value="">All Categories</option>
              <option value="fans">Mini Fans</option>
              <option value="powerbanks">Power Banks</option>
              <option value="watches">Watches</option>
              <option value="headphones">Headphones</option>
              <option value="lamps">LED Lamps</option>
            </select>
            <button class="btn btn-primary btn-sm" onclick="showTab('add')">➕ Add Product</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Image</th><th>Name / Category</th><th>Price</th><th>Old Price</th><th>Rating</th><th>Sold</th><th>Badge</th><th>Actions</th></tr></thead>
            <tbody id="products-tbody"></tbody>
          </table>
          <div id="products-empty" class="empty-state" style="display:none">
            <div class="icon">🔍</div>
            <h3>No products found</h3>
            <p>Try a different search or category</p>
          </div>
        </div>
      </div>

      <!-- ── ADD PRODUCT ── -->
      <div id="tab-add" style="display:none">
        <div style="max-width:720px">
          <div class="form-err" id="add-err"></div>
          <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--r);padding:28px">

            <!-- Image upload -->
            <div style="margin-bottom:24px">
              <label style="font-size:.8rem;font-weight:600;color:var(--dark);display:block;margin-bottom:8px">Product Image</label>
              <div class="img-preview-box" onclick="document.getElementById('add-img-input').click()" id="add-img-box">
                <div class="placeholder"><div class="icon">🖼️</div><p>Click to upload image<br><small style="color:var(--gray-light)">JPG, PNG, WEBP · Max 5MB</small></p></div>
              </div>
              <input type="file" id="add-img-input" accept="image/*" style="display:none" onchange="previewImage(this,'add-img-box')">
            </div>

            <div class="form-row">
              <div class="fg"><label>Product Name *</label><input type="text" id="add-name" placeholder="Full product name"></div>
              <div class="fg"><label>Short Name *</label><input type="text" id="add-shortname" placeholder="Brief name for cards"></div>
            </div>
            <div class="form-row">
              <div class="fg">
                <label>Category *</label>
                <select id="add-cat" onchange="syncSlug(this,'add-slug')">
                  <option value="">— Select —</option>
                  <option value="Mini Fans">Mini Fans</option>
                  <option value="Power Banks">Power Banks</option>
                  <option value="Watches">Watches</option>
                  <option value="Headphones">Headphones</option>
                  <option value="LED Lamps">LED Lamps</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="fg"><label>Category Slug</label><input type="text" id="add-slug" placeholder="e.g. fans" readonly style="background:var(--bg)"></div>
            </div>
            <div class="form-row">
              <div class="fg"><label>Price (৳) *</label><input type="number" id="add-price" placeholder="0" min="0"></div>
              <div class="fg"><label>Original Price (৳) <small style="font-weight:400;color:var(--gray)">(optional)</small></label><input type="number" id="add-oldprice" placeholder="0" min="0"></div>
            </div>
            <div class="form-row">
              <div class="fg"><label>Rating</label><input type="number" id="add-rating" value="5.0" min="1" max="5" step="0.1"></div>
              <div class="fg"><label>Units Sold</label><input type="number" id="add-sold" value="0" min="0"></div>
            </div>
            <div class="form-row">
              <div class="fg">
                <label>Badge</label>
                <select id="add-badge">
                  <option value="">None</option>
                  <option value="hot">🔥 Hot</option>
                  <option value="new">✨ New</option>
                  <option value="sale">💸 Sale</option>
                </select>
              </div>
            </div>
            <div class="form-row full">
              <div class="fg"><label>Description *</label><textarea id="add-desc" rows="4" placeholder="Full product description…"></textarea></div>
            </div>

            <!-- Specs -->
            <div style="margin-bottom:20px">
              <label style="font-size:.8rem;font-weight:600;color:var(--dark);display:block;margin-bottom:10px">Specifications <small style="font-weight:400;color:var(--gray)">(optional)</small></label>
              <div class="specs-list" id="add-specs-list"></div>
              <button class="btn-add-spec" onclick="addSpecRow('add-specs-list')">+ Add Spec</button>
            </div>

            <div style="display:flex;gap:12px;justify-content:flex-end">
              <button class="btn btn-outline" onclick="resetAddForm()">Reset</button>
              <button class="btn btn-primary" onclick="submitProduct()">✅ Save Product</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── SETTINGS ── -->
      <div id="tab-settings" style="display:none">
        <div style="display:flex;flex-direction:column;gap:24px;max-width:480px">
          <div class="settings-card">
            <h3>🔐 Change Password</h3>
            <div class="fg" style="margin-bottom:14px"><label>New Password</label><input type="password" id="new-pass" placeholder="Enter new password"></div>
            <div class="fg" style="margin-bottom:18px"><label>Confirm Password</label><input type="password" id="conf-pass" placeholder="Confirm new password"></div>
            <button class="btn btn-primary" onclick="changePassword()">Update Password</button>
          </div>
          <div class="settings-card">
            <h3>🗂️ Data Management</h3>
            <p style="font-size:.85rem;color:var(--gray);margin-bottom:16px">Export all your products as a JSON backup file.</p>
            <button class="btn btn-outline" onclick="exportProducts()">⬇️ Export Products JSON</button>
          </div>
        </div>
      </div>

    </div><!-- /content -->
  </div><!-- /main -->
</div><!-- /app -->

<!-- ── EDIT MODAL ──────────────────────────────────────── -->
<div class="overlay" id="edit-overlay">
  <div class="modal">
    <div class="modal-header">
      <h3>✏️ Edit Product</h3>
      <button class="modal-close" onclick="closeEdit()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-err" id="edit-err"></div>
      <input type="hidden" id="edit-id">

      <div style="margin-bottom:20px">
        <label style="font-size:.8rem;font-weight:600;color:var(--dark);display:block;margin-bottom:8px">Product Image</label>
        <div class="img-preview-box" onclick="document.getElementById('edit-img-input').click()" id="edit-img-box">
          <div class="placeholder"><div class="icon">🖼️</div><p>Click to change image</p></div>
        </div>
        <input type="file" id="edit-img-input" accept="image/*" style="display:none" onchange="previewImage(this,'edit-img-box')">
      </div>

      <div class="form-row">
        <div class="fg"><label>Product Name *</label><input type="text" id="edit-name"></div>
        <div class="fg"><label>Short Name</label><input type="text" id="edit-shortname"></div>
      </div>
      <div class="form-row">
        <div class="fg">
          <label>Category</label>
          <select id="edit-cat" onchange="syncSlug(this,'edit-slug')">
            <option value="Mini Fans">Mini Fans</option>
            <option value="Power Banks">Power Banks</option>
            <option value="Watches">Watches</option>
            <option value="Headphones">Headphones</option>
            <option value="LED Lamps">LED Lamps</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="fg"><label>Category Slug</label><input type="text" id="edit-slug" readonly style="background:var(--bg)"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Price (৳) *</label><input type="number" id="edit-price" min="0"></div>
        <div class="fg"><label>Original Price (৳)</label><input type="number" id="edit-oldprice" min="0"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Rating</label><input type="number" id="edit-rating" min="1" max="5" step="0.1"></div>
        <div class="fg"><label>Units Sold</label><input type="number" id="edit-sold" min="0"></div>
      </div>
      <div class="form-row">
        <div class="fg">
          <label>Badge</label>
          <select id="edit-badge">
            <option value="">None</option>
            <option value="hot">🔥 Hot</option>
            <option value="new">✨ New</option>
            <option value="sale">💸 Sale</option>
          </select>
        </div>
      </div>
      <div class="form-row full">
        <div class="fg"><label>Description</label><textarea id="edit-desc" rows="4"></textarea></div>
      </div>
      <div>
        <label style="font-size:.8rem;font-weight:600;color:var(--dark);display:block;margin-bottom:10px">Specifications</label>
        <div class="specs-list" id="edit-specs-list"></div>
        <button class="btn-add-spec" onclick="addSpecRow('edit-specs-list')">+ Add Spec</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeEdit()">Cancel</button>
      <button class="btn btn-primary" onclick="saveEdit()">💾 Save Changes</button>
    </div>
  </div>
</div>

<!-- ── DELETE CONFIRM ─────────────────────────────────── -->
<div class="overlay" id="del-overlay">
  <div class="modal" style="max-width:400px">
    <div class="modal-header"><h3>🗑️ Delete Product</h3><button class="modal-close" onclick="closeDel()">✕</button></div>
    <div class="modal-body">
      <p style="color:var(--dark-mid)">Are you sure you want to delete <strong id="del-name"></strong>? This cannot be undone.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeDel()">Cancel</button>
      <button class="btn btn-danger" onclick="confirmDelete()">Delete</button>
    </div>
  </div>
</div>

<!-- ── TOAST ─────────────────────────────────────────── -->
<div class="toast-wrap" id="toasts"></div>

<script>
const API = '';
let allProducts = [];
let deleteTargetId = null;

// ── AUTH ─────────────────────────────────────────────────────────────────────
async function checkAuth() {
  const r = await fetch(\`\${API}/api/auth/me\`);
  const d = await r.json();
  if (d.loggedIn) showApp();
}

async function doLogin() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  const err = document.getElementById('login-err');
  err.style.display = 'none';
  try {
    const r = await fetch(\`\${API}/api/auth/login\`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username, password}), credentials:'include'
    });
    const d = await r.json();
    if (!r.ok) { err.textContent = d.error || 'Invalid credentials'; err.style.display = 'block'; return; }
    showApp();
  } catch(e) { err.textContent = 'Connection error'; err.style.display = 'block'; }
}

async function doLogout() {
  await fetch(\`\${API}/api/auth/logout\`, {method:'POST', credentials:'include'});
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  loadProducts();
}

// ── TABS ─────────────────────────────────────────────────────────────────────
function showTab(tab) {
  ['dashboard','products','add','settings'].forEach(t => {
    document.getElementById(\`tab-\${t}\`).style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.nav-item').forEach((el, i) => {
    el.classList.toggle('active', ['dashboard','products','add','settings'][i] === tab);
  });
  const titles = {dashboard:'Dashboard',products:'Products',add:'Add Product',settings:'Settings'};
  document.getElementById('page-title').textContent = titles[tab];
  if (tab === 'products') renderTable(allProducts);
  if (tab === 'dashboard') renderDashboard();
}

// ── LOAD PRODUCTS ─────────────────────────────────────────────────────────────
async function loadProducts() {
  try {
    const r = await fetch(\`\${API}/api/products\`, {credentials:'include'});
    allProducts = await r.json();
    renderDashboard();
  } catch(e) { toast('Failed to load products', 'err'); }
}

function renderDashboard() {
  document.getElementById('stat-total').textContent = allProducts.length;
  document.getElementById('stat-hot').textContent   = allProducts.filter(p => p.badge === 'hot').length;
  document.getElementById('stat-sale').textContent  = allProducts.filter(p => p.oldPrice).length;
  document.getElementById('stat-cats').textContent  = new Set(allProducts.map(p => p.categorySlug)).size;
  const tbody = document.getElementById('recent-tbody');
  const recent = [...allProducts].reverse().slice(0, 5);
  tbody.innerHTML = recent.map(p => rowHTML(p, true)).join('');
}

function renderTable(list) {
  const tbody = document.getElementById('products-tbody');
  const empty = document.getElementById('products-empty');
  document.getElementById('products-count').textContent = \`(\${list.length})\`;
  if (!list.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = list.map(p => rowHTML(p, false)).join('');
}

function rowHTML(p, compact) {
  const badgeMap = {hot:'bp-hot 🔥 Hot', new:'bp-new ✨ New', sale:'bp-sale 💸 Sale'};
  const b = p.badge ? \`<span class="badge-pill \${badgeMap[p.badge]?.split(' ')[0]}">\${badgeMap[p.badge]?.substring(badgeMap[p.badge].indexOf(' ')+1) || p.badge}</span>\` : '<span class="badge-pill bp-none">—</span>';
  const imgSrc = p.image.startsWith('http') ? p.image : \`/\${p.image}\`;
  if (compact) return \`<tr>
    <td><img class="prod-img" src="\${imgSrc}" onerror="this.src='/images/product-fan.jpg'"></td>
    <td><div class="prod-name">\${p.name}<small>\${p.category}</small></div></td>
    <td><span class="cat-badge">\${p.category}</span></td>
    <td><strong>৳\${p.price.toLocaleString()}</strong></td>
    <td>\${b}</td>
    <td><div class="action-btns">
      <button class="btn-edit" onclick="openEdit(\${p.id})" title="Edit">✏️</button>
      <button class="btn-del" onclick="openDel(\${p.id},'\${p.name.replace(/'/g,"\\\\'")}') " title="Delete">🗑️</button>
    </div></td></tr>\`;
  return \`<tr>
    <td><img class="prod-img" src="\${imgSrc}" onerror="this.src='/images/product-fan.jpg'"></td>
    <td><div class="prod-name">\${p.name}<small>\${p.category}</small></div></td>
    <td><strong>৳\${p.price.toLocaleString()}</strong></td>
    <td>\${p.oldPrice ? \`<span style="text-decoration:line-through;color:var(--gray-light)">৳\${p.oldPrice.toLocaleString()}</span>\` : '—'}</td>
    <td>\${p.rating} ⭐</td>
    <td>\${p.sold.toLocaleString()}</td>
    <td>\${b}</td>
    <td><div class="action-btns">
      <button class="btn-edit" onclick="openEdit(\${p.id})" title="Edit">✏️</button>
      <button class="btn-del" onclick="openDel(\${p.id},'\${p.name.replace(/'/g,"\\\\'")}') " title="Delete">🗑️</button>
    </div></td></tr>\`;
}

function filterTable() {
  const q   = document.getElementById('search-q').value.toLowerCase();
  const cat = document.getElementById('filter-cat').value;
  let list = allProducts;
  if (q)   list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  if (cat) list = list.filter(p => p.categorySlug === cat);
  renderTable(list);
}

// ── ADD PRODUCT ───────────────────────────────────────────────────────────────
function syncSlug(sel, targetId) {
  const slugMap = {'Mini Fans':'fans','Power Banks':'powerbanks','Watches':'watches','Headphones':'headphones','LED Lamps':'lamps','Other':'other'};
  document.getElementById(targetId).value = slugMap[sel.value] || sel.value.toLowerCase().replace(/\\s+/g,'-');
}

function previewImage(input, boxId) {
  const file = input.files[0];
  if (!file) return;
  const box = document.getElementById(boxId);
  const reader = new FileReader();
  reader.onload = e => {
    box.innerHTML = \`<img src="\${e.target.result}" style="width:100%;height:100%;object-fit:cover">\`;
  };
  reader.readAsDataURL(file);
}

function addSpecRow(listId, label='', value='') {
  const list = document.getElementById(listId);
  const row = document.createElement('div');
  row.className = 'spec-row';
  row.innerHTML = \`<input type="text" placeholder="Label (e.g. Battery)" value="\${label}">
    <input type="text" placeholder="Value (e.g. 5000mAh)" value="\${value}">
    <button onclick="this.parentElement.remove()" style="background:#fff0f0;color:var(--danger);border:none;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:.9rem">✕</button>\`;
  list.appendChild(row);
}

function getSpecs(listId) {
  const rows = document.querySelectorAll(\`#\${listId} .spec-row\`);
  return [...rows].map(r => {
    const inputs = r.querySelectorAll('input');
    return {label: inputs[0].value.trim(), value: inputs[1].value.trim()};
  }).filter(s => s.label && s.value);
}

async function submitProduct() {
  const err = document.getElementById('add-err');
  err.style.display = 'none';
  const name = document.getElementById('add-name').value.trim();
  const price = document.getElementById('add-price').value;
  const cat   = document.getElementById('add-cat').value;
  const desc  = document.getElementById('add-desc').value.trim();
  if (!name || !price || !cat || !desc) {
    err.textContent = 'Please fill in all required fields (Name, Category, Price, Description)';
    err.style.display = 'block'; return;
  }
  const fd = new FormData();
  fd.append('name',        name);
  fd.append('shortName',   document.getElementById('add-shortname').value.trim() || name);
  fd.append('category',    cat);
  fd.append('categorySlug',document.getElementById('add-slug').value);
  fd.append('price',       price);
  fd.append('oldPrice',    document.getElementById('add-oldprice').value || '');
  fd.append('rating',      document.getElementById('add-rating').value || '5');
  fd.append('sold',        document.getElementById('add-sold').value || '0');
  fd.append('badge',       document.getElementById('add-badge').value);
  fd.append('description', desc);
  fd.append('specs',       JSON.stringify(getSpecs('add-specs-list')));
  const imgFile = document.getElementById('add-img-input').files[0];
  if (imgFile) fd.append('image', imgFile);

  try {
    const r = await fetch(\`\${API}/api/admin/products\`, {method:'POST', body:fd, credentials:'include'});
    const d = await r.json();
    if (!r.ok) { err.textContent = d.error || 'Error saving product'; err.style.display='block'; return; }
    toast(\`✅ "\${d.name}" added successfully!\`, 'ok');
    await loadProducts();
    resetAddForm();
    showTab('products');
  } catch(e) { err.textContent = 'Network error'; err.style.display='block'; }
}

function resetAddForm() {
  ['add-name','add-shortname','add-price','add-oldprice','add-desc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('add-cat').value = '';
  document.getElementById('add-slug').value = '';
  document.getElementById('add-badge').value = '';
  document.getElementById('add-rating').value = '5.0';
  document.getElementById('add-sold').value = '0';
  document.getElementById('add-specs-list').innerHTML = '';
  document.getElementById('add-img-box').innerHTML = \`<div class="placeholder"><div class="icon">🖼️</div><p>Click to upload image<br><small style="color:var(--gray-light)">JPG, PNG, WEBP · Max 5MB</small></p></div>\`;
  document.getElementById('add-img-input').value = '';
  document.getElementById('add-err').style.display = 'none';
}

// ── EDIT PRODUCT ───────────────────────────────────────────────────────────────
function openEdit(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('edit-id').value       = p.id;
  document.getElementById('edit-name').value      = p.name;
  document.getElementById('edit-shortname').value = p.shortName || p.name;
  document.getElementById('edit-cat').value       = p.category;
  document.getElementById('edit-slug').value      = p.categorySlug;
  document.getElementById('edit-price').value     = p.price;
  document.getElementById('edit-oldprice').value  = p.oldPrice || '';
  document.getElementById('edit-rating').value    = p.rating;
  document.getElementById('edit-sold').value      = p.sold;
  document.getElementById('edit-badge').value     = p.badge || '';
  document.getElementById('edit-desc').value      = p.description || '';
  const imgSrc = p.image.startsWith('http') ? p.image : \`/\${p.image}\`;
  document.getElementById('edit-img-box').innerHTML = \`<img src="\${imgSrc}" onerror="this.src='/images/product-fan.jpg'" style="width:100%;height:100%;object-fit:cover">\`;
  document.getElementById('edit-img-input').value = '';
  document.getElementById('edit-err').style.display = 'none';
  const specsList = document.getElementById('edit-specs-list');
  specsList.innerHTML = '';
  (p.specs || []).forEach(s => addSpecRow('edit-specs-list', s.label, s.value));
  document.getElementById('edit-overlay').classList.add('open');
}

function closeEdit() { document.getElementById('edit-overlay').classList.remove('open'); }

async function saveEdit() {
  const err = document.getElementById('edit-err');
  err.style.display = 'none';
  const id = document.getElementById('edit-id').value;
  const name = document.getElementById('edit-name').value.trim();
  const price = document.getElementById('edit-price').value;
  if (!name || !price) { err.textContent='Name and price are required'; err.style.display='block'; return; }
  const fd = new FormData();
  fd.append('name',        name);
  fd.append('shortName',   document.getElementById('edit-shortname').value.trim() || name);
  fd.append('category',    document.getElementById('edit-cat').value);
  fd.append('categorySlug',document.getElementById('edit-slug').value);
  fd.append('price',       price);
  fd.append('oldPrice',    document.getElementById('edit-oldprice').value || '');
  fd.append('rating',      document.getElementById('edit-rating').value);
  fd.append('sold',        document.getElementById('edit-sold').value);
  fd.append('badge',       document.getElementById('edit-badge').value);
  fd.append('description', document.getElementById('edit-desc').value.trim());
  fd.append('specs',       JSON.stringify(getSpecs('edit-specs-list')));
  const imgFile = document.getElementById('edit-img-input').files[0];
  if (imgFile) fd.append('image', imgFile);
  try {
    const r = await fetch(\`\${API}/api/admin/products/\${id}\`, {method:'PUT', body:fd, credentials:'include'});
    const d = await r.json();
    if (!r.ok) { err.textContent = d.error || 'Error saving'; err.style.display='block'; return; }
    toast(\`✅ "\${d.name}" updated!\`, 'ok');
    await loadProducts();
    closeEdit();
    renderTable(allProducts);
  } catch(e) { err.textContent='Network error'; err.style.display='block'; }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
function openDel(id, name) {
  deleteTargetId = id;
  document.getElementById('del-name').textContent = name;
  document.getElementById('del-overlay').classList.add('open');
}
function closeDel() { document.getElementById('del-overlay').classList.remove('open'); deleteTargetId = null; }
async function confirmDelete() {
  if (!deleteTargetId) return;
  try {
    const r = await fetch(\`\${API}/api/admin/products/\${deleteTargetId}\`, {method:'DELETE', credentials:'include'});
    if (!r.ok) { toast('Delete failed','err'); return; }
    toast('🗑️ Product deleted', 'info');
    await loadProducts();
    renderTable(allProducts);
    closeDel();
  } catch(e) { toast('Network error','err'); }
}

// ── SETTINGS ─────────────────────────────────────────────────────────────────
async function changePassword() {
  const np = document.getElementById('new-pass').value;
  const cp = document.getElementById('conf-pass').value;
  if (!np) { toast('Enter a new password','err'); return; }
  if (np !== cp) { toast('Passwords do not match','err'); return; }
  if (np.length < 6) { toast('Password must be at least 6 characters','err'); return; }
  const r = await fetch(\`\${API}/api/auth/change-password\`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({newPassword:np}), credentials:'include'
  });
  if (r.ok) { toast('✅ Password updated!','ok'); document.getElementById('new-pass').value=''; document.getElementById('conf-pass').value=''; }
  else toast('Failed to update password','err');
}

function exportProducts() {
  const blob = new Blob([JSON.stringify(allProducts, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='zenocart-products.json'; a.click();
  URL.revokeObjectURL(url);
  toast('📁 Export downloaded!','ok');
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function toast(msg, type='info') {
  const wrap = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = \`toast \${type}\`;
  el.innerHTML = msg;
  wrap.appendChild(el);
  setTimeout(() => { el.style.animation='slideOut .3s ease forwards'; setTimeout(()=>el.remove(),300); }, 3500);
}

// ── INIT ─────────────────────────────────────────────────────────────────────
checkAuth();
document.getElementById('login-pass').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
</script>
</body>
</html>
`;


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
  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch(e) {
    console.error('writeJSON error:', e.message);
  }
}

// Seed default admin + demo products on first run
function initData() {
  // Ensure required directories exist (critical for cloud deployments like Railway)
  const dataDir    = path.dirname(DATA_FILE);
  const uploadsDir = UPLOADS;
  const publicImgDir = path.join(PUBLIC, 'images');
  [dataDir, uploadsDir, publicImgDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('📁  Created directory:', dir);
    }
  });

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

  // ── SERVE ADMIN PANEL — HTML inlined to avoid path issues on all hosts ──
  if (pathname === '/admin' || pathname === '/admin/' || pathname.startsWith('/admin/')) {
    // Try file first, fall back to inline HTML
    const adminPaths = [
      path.join(__dirname, 'admin', 'index.html'),
      path.join(__dirname, 'public', 'admin', 'index.html'),
      path.join(process.cwd(), 'admin', 'index.html'),
      path.join(process.cwd(), 'public', 'admin', 'index.html'),
    ];
    for (const file of adminPaths) {
      if (fs.existsSync(file)) return serveStatic(res, file);
    }
    // Inline fallback — guaranteed to work on any host
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(ADMIN_HTML);
  }

  // ── SERVE PUBLIC STATIC FILES ─────────────────────────────────────────────
  let filePath = path.join(PUBLIC, pathname === '/' ? 'index.html' : pathname);
  // Prevent path traversal
  if (!filePath.startsWith(PUBLIC)) { respond(res, 403, 'Forbidden'); return; }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    // For /admin directory, always serve admin index
    const dirIndex = path.join(filePath, 'index.html');
    if (fs.existsSync(dirIndex)) return serveStatic(res, dirIndex);
  }
  if (fs.existsSync(filePath)) return serveStatic(res, filePath);

  respond(res, 404, 'Not found');
});

// ── Start ─────────────────────────────────────────────────────────────────────
initData();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀  Zenocart running at  →  http://0.0.0.0:${PORT}`);
  console.log(`🔧  Admin panel          →  http://0.0.0.0:${PORT}/admin`);
  console.log(`📦  API                  →  http://0.0.0.0:${PORT}/api/products\n`);
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
