# 🛒 Zenocart — Full Stack Backend

**"Shop Smart. Live Better."**  
Node.js backend with Admin Panel — zero npm dependencies required.

---

## 🚀 Quick Start (3 steps)

```bash
# 1. Enter the project folder
cd zenocart-backend

# 2. Start the server
node server.js

# 3. Open your browser
# Store    →  http://localhost:3000
# Admin    →  http://localhost:3000/admin
```

**Default admin login:**
- Username: `admin`
- Password: `admin123`

> ⚠️ Change your password immediately after first login (Settings tab in admin panel).

---

## 📁 Project Structure

```
zenocart-backend/
├── server.js          ← Main server (run this)
├── admin/
│   └── index.html     ← Admin panel UI
├── public/            ← Frontend (served automatically)
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── products.js  ← Fetches from API
│   │   ├── layout.js
│   │   └── core.js
│   ├── images/
│   └── pages/
│       ├── shop.html
│       ├── product.html
│       └── cart.html
├── uploads/           ← Uploaded product images (auto-created)
└── data/
    ├── products.json  ← Product database (auto-created)
    └── users.json     ← Admin credentials (auto-created)
```

---

## 🔧 Admin Panel Features

| Feature | Description |
|---|---|
| **Dashboard** | Stats overview + recent products |
| **Products List** | Search, filter by category, view all |
| **Add Product** | Upload image, fill details, publish |
| **Edit Product** | Change any field, swap image |
| **Delete Product** | With confirmation dialog |
| **Change Password** | Update admin password |
| **Export JSON** | Download products backup |

---

## 🌐 API Endpoints

| Method | URL | Description |
|---|---|---|
| `GET` | `/api/products` | List all products |
| `GET` | `/api/products?category=fans` | Filter by category |
| `GET` | `/api/products?q=fan` | Search products |
| `GET` | `/api/products?sort=price-low` | Sort products |
| `GET` | `/api/products/:id` | Get single product |
| `POST` | `/api/auth/login` | Admin login |
| `POST` | `/api/auth/logout` | Admin logout |
| `POST` | `/api/admin/products` | Create product (auth) |
| `PUT` | `/api/admin/products/:id` | Update product (auth) |
| `DELETE` | `/api/admin/products/:id` | Delete product (auth) |

---

## ➕ How to Add a Product

1. Go to `http://localhost:3000/admin`
2. Login with your credentials
3. Click **"Add Product"** in the sidebar
4. Fill in:
   - Product name, short name
   - Category (select from dropdown)
   - Price in BDT (৳)
   - Original/old price (optional — shows strikethrough)
   - Rating, Units Sold
   - Badge: Hot / New / Sale / None
   - Description
   - Specifications (add rows as needed)
   - Upload product image
5. Click **"Save Product"** ✅

The product appears instantly on the storefront!

---

## 🖼️ Image Upload

- Supported: JPG, PNG, WEBP, GIF
- Max size: 5MB
- Images saved to `uploads/` and served at `/images/filename`
- You can also use existing images from the `public/images/` folder

---

## 🔒 Security Notes

- Sessions use secure random tokens stored server-side
- Passwords hashed with HMAC-SHA256 + salt
- Admin routes require valid session cookie
- Change default password on first use!

---

## 🌐 Deploy Online

### Option 1 — Railway (Recommended, free tier)
1. Push to GitHub
2. Connect repo at [railway.app](https://railway.app)
3. Set start command: `node server.js`
4. Done — live URL provided automatically

### Option 2 — Render.com
1. New Web Service → connect GitHub repo
2. Build command: *(leave empty)*
3. Start command: `node server.js`
4. Free tier available

### Option 3 — VPS / Linux Server
```bash
git clone your-repo
cd zenocart-backend
node server.js
# Or with pm2 for production:
npm install -g pm2
pm2 start server.js --name zenocart
pm2 save && pm2 startup
```

---

## 🔁 Data Backup

Products are stored in `data/products.json`. Back it up regularly:
```bash
cp data/products.json data/products-backup-$(date +%Y%m%d).json
```

Or use the **Export JSON** button in Admin → Settings.
