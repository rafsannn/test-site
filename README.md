# 🛒 Zenocart - Online Marketplace

**"Shop Smart. Live Better."**

A fully responsive, production-ready e-commerce website for Zenocart — your trusted online marketplace for electronics and gadgets in Bangladesh.

---

## 🚀 How to Run Locally

### Option 1: Open Directly (Simplest)
1. Extract / download the `zenocart` folder
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge)
3. That's it! ✅

> ⚠️ **Note:** Some browsers may block local assets if you double-click the file. Use Option 2 for the best experience.

### Option 2: Use VS Code Live Server (Recommended)
1. Install [VS Code](https://code.visualstudio.com/)
2. Install the **Live Server** extension
3. Right-click `index.html` → "Open with Live Server"
4. Browser opens at `http://127.0.0.1:5500`

### Option 3: Python Local Server
```bash
cd zenocart
python -m http.server 8080
# Visit: http://localhost:8080
```

### Option 4: Node.js
```bash
cd zenocart
npx serve .
# Visit the URL shown in terminal
```

---

## 📁 Project Structure

```
zenocart/
├── index.html              ← Home Page
├── pages/
│   ├── shop.html           ← Shop / All Products Page
│   ├── product.html        ← Product Detail Page
│   └── cart.html           ← Cart & Checkout Page
├── css/
│   └── style.css           ← All styles (responsive, animations)
├── js/
│   ├── products.js         ← Product database & helper functions
│   ├── layout.js           ← Shared navbar & footer
│   └── core.js             ← Cart, wishlist, toast, search logic
└── images/
    ├── logo.png            ← Your Zenocart logo
    ├── cover.png           ← Hero banner image
    ├── product-fan.jpg
    ├── product-powerbank.jpg
    ├── product-watch.jpg
    ├── product-headphones.jpg
    ├── product-headphones2.jpg
    └── product-lamp.jpg
```

---

## ✨ Features

| Feature | Status |
|---|---|
| Responsive design (mobile, tablet, desktop) | ✅ |
| Product listing with grid | ✅ |
| Category filtering (sidebar) | ✅ |
| Price range filter | ✅ |
| Sort by: featured, price, rating, bestselling | ✅ |
| Product detail page | ✅ |
| Add to cart | ✅ |
| Qty increase/decrease/remove | ✅ |
| Wishlist with slide-out drawer | ✅ |
| Search bar with live dropdown | ✅ |
| Cart persists across pages (localStorage) | ✅ |
| Checkout form with Facebook redirect | ✅ |
| "Order via Facebook" button | ✅ |
| Toast notifications | ✅ |
| Hero banner with Eid offer | ✅ |
| Smooth animations | ✅ |
| SEO meta tags | ✅ |

---

## 🎨 Design

- **Colors:** Teal/steel-blue gradient matching Zenocart logo (`#1e7a8f` primary)
- **Fonts:** Playfair Display (headings) + DM Sans (body)
- **Style:** Minimal & clean, conversion-focused

---

## 📦 How to Add New Products

Open `js/products.js` and add to the `PRODUCTS` array:

```javascript
{
  id: 13,                              // unique ID
  name: "Full Product Name",
  shortName: "Short Name",
  category: "LED Lamps",               // display category
  categorySlug: "lamps",              // fans | powerbanks | watches | headphones | lamps
  price: 750,                          // in BDT
  oldPrice: 1000,                      // original price (optional, for strikethrough)
  rating: 4.5,
  sold: 1200,
  badge: "new",                        // "hot" | "new" | "sale" | null
  image: "images/my-product.jpg",
  images: ["images/my-product.jpg"],   // array for gallery
  description: "Full product description...",
  specs: [
    { label: "Feature", value: "Value" }
  ]
}
```

---

## 🔗 Facebook Integration

- **Facebook Page:** [facebook.com/zenocart.bd](https://facebook.com/zenocart.bd)
- When customers click "Order via Facebook", they're redirected to your FB page
- Checkout form builds a pre-filled message sent via Messenger

To update the Facebook link, search for `zenocart.bd` in:
- `js/layout.js`
- `pages/cart.html`
- `pages/product.html`
- `index.html`

---

## 🌐 Deploy Online (Free)

### GitHub Pages
1. Create GitHub account → New repository → Upload all files
2. Go to Settings → Pages → Source: main branch
3. Your site: `https://yourusername.github.io/zenocart`

### Netlify (Recommended - drag & drop!)
1. Go to [netlify.com](https://netlify.com)
2. Drag the `zenocart` folder to the deploy area
3. Done! You get a free HTTPS URL instantly

---

## 📞 Support

For questions, message Zenocart on Facebook: [facebook.com/zenocart.bd](https://facebook.com/zenocart.bd)
