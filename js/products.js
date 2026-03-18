// =============================================
// ZENOCART - Product Data
// =============================================

const PRODUCTS = [
  {
    id: 1,
    name: "Charging Portable Mini Fan - Bear Edition",
    shortName: "Mini USB Portable Fan",
    category: "Mini Fans",
    categorySlug: "fans",
    price: 650,
    oldPrice: 850,
    rating: 4.8,
    sold: 9400,
    badge: "hot",
    image: "images/product-fan.jpg",
    images: ["images/product-fan.jpg"],
    description: "Stay cool anywhere with this adorable bear-themed portable fan. Features USB charging, multiple speed settings, and a compact design perfect for desks, travel, or outdoor use. Ultra-quiet motor for distraction-free use.",
    specs: [
      { label: "Type", value: "USB Rechargeable" },
      { label: "Speeds", value: "3 Speed Settings" },
      { label: "Battery", value: "Built-in Li-ion" },
      { label: "Colors", value: "Pink, Yellow, Green, Dark Green" },
      { label: "Usage", value: "Handheld / Desktop" }
    ]
  },
  {
    id: 2,
    name: "20000mAh Power Bank Fast Charging with Built-in Cables",
    shortName: "20000mAh Power Bank",
    category: "Power Banks",
    categorySlug: "powerbanks",
    price: 1250,
    oldPrice: 1600,
    rating: 4.9,
    sold: 2900,
    badge: "new",
    image: "images/product-powerbank.jpg",
    images: ["images/product-powerbank.jpg"],
    description: "Never run out of power with this 20000mAh large capacity power bank. Features 20W fast charging, built-in cables (USB-C, Micro USB, Lightning), LED display, night light, and lanyard. Airport-approved design.",
    specs: [
      { label: "Capacity", value: "20000mAh" },
      { label: "Output", value: "20W Fast Charging" },
      { label: "Cables", value: "4 Built-in Cables" },
      { label: "Display", value: "LED Battery Indicator" },
      { label: "Extra", value: "Built-in Night Light" }
    ]
  },
  {
    id: 3,
    name: "Luminous Waterproof Men's Watch - Black Edition",
    shortName: "Men's Stainless Steel Watch",
    category: "Watches",
    categorySlug: "watches",
    price: 1850,
    oldPrice: 2400,
    rating: 5.0,
    sold: 951,
    badge: "sale",
    image: "images/product-watch.jpg",
    images: ["images/product-watch.jpg"],
    description: "Make a bold statement with this creative dial waterproof men's watch. Stainless steel construction, luminous hands for night visibility, and a unique rotary time display. Available in multiple colors.",
    specs: [
      { label: "Material", value: "Stainless Steel" },
      { label: "Water Resistance", value: "Yes" },
      { label: "Display", value: "Creative Rotary Dial" },
      { label: "Feature", value: "Luminous Night View" },
      { label: "Colors", value: "Black, Blue, Red, Silver" }
    ]
  },
  {
    id: 4,
    name: "Y10 Bluetooth Neckband Wireless Sports Earphone",
    shortName: "Neckband Bluetooth Earphones",
    category: "Headphones",
    categorySlug: "headphones",
    price: 890,
    oldPrice: 1100,
    rating: 5.0,
    sold: 2800,
    badge: "hot",
    image: "images/product-headphones.jpg",
    images: ["images/product-headphones.jpg", "images/product-headphones2.jpg"],
    description: "Premium sports neckband earphones with ultra-long standby life, noise reduction technology, and LED battery display. 500mAh large battery. Perfect for workouts, commute, and daily use. 3 built-in sound effects.",
    specs: [
      { label: "Battery", value: "500mAh Large Capacity" },
      { label: "Connection", value: "Bluetooth 5.0" },
      { label: "Feature", value: "Noise Reduction" },
      { label: "Display", value: "LED Battery Indicator" },
      { label: "Design", value: "Sports Neckband" }
    ]
  },
  {
    id: 5,
    name: "Y10 Pro Wireless Neckband - Ultra Clear Sound",
    shortName: "Y10 Pro Neckband Earphones",
    category: "Headphones",
    categorySlug: "headphones",
    price: 1050,
    oldPrice: 1300,
    rating: 4.8,
    sold: 1500,
    badge: "new",
    image: "images/product-headphones2.jpg",
    images: ["images/product-headphones2.jpg", "images/product-headphones.jpg"],
    description: "Step up your audio experience with the Y10 Pro neckband. Upgraded drivers, enhanced bass, and professional noise cancellation. Ideal for calls and music during active lifestyles.",
    specs: [
      { label: "Battery", value: "600mAh" },
      { label: "Connection", value: "Bluetooth 5.3" },
      { label: "Feature", value: "Active Noise Cancellation" },
      { label: "Mic", value: "Built-in HD Mic" },
      { label: "Design", value: "Magnetic Earbuds" }
    ]
  },
  {
    id: 6,
    name: "Clip-On Rechargeable LED Study Lamp - 4000K Natural Light",
    shortName: "Clip-On LED Study Lamp",
    category: "LED Lamps",
    categorySlug: "lamps",
    price: 720,
    oldPrice: 950,
    rating: 4.7,
    sold: 10900,
    badge: "hot",
    image: "images/product-lamp.jpg",
    images: ["images/product-lamp.jpg"],
    description: "Protect your eyes with this clip-on rechargeable LED study lamp. Features 4000K natural light, flexible gooseneck arm, touch-sensitive controls, and USB charging. Can be clipped on desks, shelves, or headboards.",
    specs: [
      { label: "Color Temp", value: "4000K Natural White" },
      { label: "Type", value: "Clip-On / Freestanding" },
      { label: "Charging", value: "USB Rechargeable" },
      { label: "Control", value: "Touch Sensitive" },
      { label: "Use", value: "Study / Bedside / Office" }
    ]
  },
  {
    id: 7,
    name: "Human Body Sensor Night Light - Magnetic Rechargeable",
    shortName: "Motion Sensor Night Light",
    category: "LED Lamps",
    categorySlug: "lamps",
    price: 480,
    oldPrice: 650,
    rating: 4.3,
    sold: 26600,
    badge: "hot",
    image: "images/product-lamp.jpg",
    images: ["images/product-lamp.jpg"],
    description: "Smart wireless night light that turns on when you approach and dims when you leave. Magnetic backing for easy mounting, built-in rechargeable battery, and warm ambient light. Perfect for hallways, stairs, and bedrooms.",
    specs: [
      { label: "Sensor", value: "Human Body (PIR)" },
      { label: "Mount", value: "Magnetic Adhesive" },
      { label: "Charging", value: "Built-in USB Cable" },
      { label: "Light", value: "Warm White" },
      { label: "Use", value: "Corridor / Aisle / Bedroom" }
    ]
  },
  {
    id: 8,
    name: "Portable Mini USB Fan - Pocket Edition",
    shortName: "Pocket USB Mini Fan",
    category: "Mini Fans",
    categorySlug: "fans",
    price: 420,
    oldPrice: 580,
    rating: 4.5,
    sold: 5200,
    badge: null,
    image: "images/product-fan.jpg",
    images: ["images/product-fan.jpg"],
    description: "Ultra-compact pocket-sized USB fan perfect for students, travelers, and office use. Lightweight, quiet, and rechargeable with a single USB port.",
    specs: [
      { label: "Type", value: "Pocket USB Fan" },
      { label: "Speeds", value: "2 Speed Settings" },
      { label: "Battery", value: "Built-in 1200mAh" },
      { label: "Weight", value: "Ultra-light 120g" },
      { label: "Colors", value: "Multiple Colors" }
    ]
  },
  {
    id: 9,
    name: "10000mAh Slim Power Bank with Digital Display",
    shortName: "10000mAh Slim Power Bank",
    category: "Power Banks",
    categorySlug: "powerbanks",
    price: 850,
    oldPrice: 1100,
    rating: 4.6,
    sold: 3800,
    badge: "sale",
    image: "images/product-powerbank.jpg",
    images: ["images/product-powerbank.jpg"],
    description: "Slim and lightweight 10000mAh power bank with digital display showing exact battery percentage. Features dual USB output, fast charging support, and premium design.",
    specs: [
      { label: "Capacity", value: "10000mAh" },
      { label: "Output", value: "18W Fast Charging" },
      { label: "Display", value: "Digital % Indicator" },
      { label: "Ports", value: "2x USB + 1x USB-C" },
      { label: "Weight", value: "220g" }
    ]
  },
  {
    id: 10,
    name: "Classic Round-Dial Waterproof Men's Wristwatch",
    shortName: "Men's Round Dial Watch",
    category: "Watches",
    categorySlug: "watches",
    price: 1350,
    oldPrice: 1800,
    rating: 4.7,
    sold: 720,
    badge: null,
    image: "images/product-watch.jpg",
    images: ["images/product-watch.jpg"],
    description: "Elegant classic round-dial stainless steel men's watch. Water resistant, luminous display, and precision quartz movement. A timeless accessory for every occasion.",
    specs: [
      { label: "Material", value: "Stainless Steel" },
      { label: "Movement", value: "Precision Quartz" },
      { label: "Water Resistance", value: "Yes (3ATM)" },
      { label: "Strap", value: "Metal Link Band" },
      { label: "Colors", value: "Black, Silver, Blue, Red" }
    ]
  },
  {
    id: 11,
    name: "Flexible Gooseneck LED Desk Lamp - Touch Control",
    shortName: "Gooseneck LED Desk Lamp",
    category: "LED Lamps",
    categorySlug: "lamps",
    price: 590,
    oldPrice: 780,
    rating: 4.6,
    sold: 8700,
    badge: "sale",
    image: "images/product-lamp.jpg",
    images: ["images/product-lamp.jpg"],
    description: "Flexible 360° gooseneck LED desk lamp with 3 brightness levels and touch control. USB rechargeable, eye-care light technology, and compact design ideal for any workspace.",
    specs: [
      { label: "Neck", value: "360° Flexible Gooseneck" },
      { label: "Brightness", value: "3 Adjustable Levels" },
      { label: "Control", value: "Touch Dimmer" },
      { label: "Charging", value: "USB-C" },
      { label: "Color", value: "White / Black" }
    ]
  },
  {
    id: 12,
    name: "Wireless In-Ear Bluetooth Earbuds with Charging Case",
    shortName: "True Wireless Earbuds",
    category: "Headphones",
    categorySlug: "headphones",
    price: 1450,
    oldPrice: 1900,
    rating: 4.7,
    sold: 4200,
    badge: "new",
    image: "images/product-headphones.jpg",
    images: ["images/product-headphones.jpg"],
    description: "Premium true wireless earbuds with charging case. Deep bass, crystal clear sound, instant pairing, and comfortable in-ear design. Total battery life up to 24 hours.",
    specs: [
      { label: "Connection", value: "Bluetooth 5.2" },
      { label: "Battery", value: "24 Hours Total" },
      { label: "Feature", value: "Touch Controls" },
      { label: "Case", value: "USB-C Charging Case" },
      { label: "Mic", value: "Dual Microphones" }
    ]
  }
];

const CATEGORIES = [
  { slug: "all", label: "All Products", icon: "🛍️" },
  { slug: "fans", label: "Mini Fans", icon: "🌬️" },
  { slug: "powerbanks", label: "Power Banks", icon: "🔋" },
  { slug: "watches", label: "Watches", icon: "⌚" },
  { slug: "headphones", label: "Headphones", icon: "🎧" },
  { slug: "lamps", label: "LED Lamps", icon: "💡" }
];

function formatPrice(price) {
  return "৳" + price.toLocaleString('en-BD');
}

function getStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function getBadgeHTML(badge) {
  if (!badge) return '';
  const labels = { hot: '🔥 Hot', new: '✨ New', sale: '💸 Sale' };
  return `<span class="product-badge badge-${badge}">${labels[badge]}</span>`;
}

function getSoldText(sold) {
  if (sold >= 1000) return (sold/1000).toFixed(1).replace('.0','') + 'k Sold';
  return sold + ' Sold';
}
