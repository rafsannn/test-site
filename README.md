# 🛒 Zenocart — Full Stack

**"Shop Smart. Live Better."**
Node.js backend with Admin Panel — zero npm dependencies.

## 🚀 Quick Start

```bash
cd zenocart-backend
node server.js
# Store → http://localhost:3000
# Admin → http://localhost:3000/admin
```

Default login: `admin` / `admin123`

## 📁 Structure

```
zenocart-backend/
├── server.js          ← Main server
├── admin/index.html   ← Admin panel
├── public/            ← Frontend
└── data/              ← Auto-created: products.json, orders.json, etc.
```

## 💾 Backup & Restore

All data is stored in local JSON files.
Go to Admin → Backup & Restore to download/upload backups before/after redeployments.

## 🌐 Deploy on Railway

Push to GitHub → connect repo on railway.app → done.
