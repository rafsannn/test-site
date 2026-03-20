/**
 * ZENOCART - Backend Server
 * Pure Node.js — zero npm dependencies
 * Storage: Local JSON files (use Backup & Restore to persist across redeploys)
 * Run: node server.js
 */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT    = process.env.PORT || 3000;
const PUBLIC  = path.join(__dirname, 'public');
const DATADIR = path.join(__dirname, 'data');

// ── Data files (all local — use Backup & Restore to persist across redeploys)
const LOCAL_PRODUCTS  = path.join(DATADIR, 'products.json');
const USERS_FILE      = path.join(DATADIR, 'users.json');
const SETTINGS_FILE   = path.join(DATADIR, 'settings.json');
const DEFAULT_SETTINGS = {
  whatsapp:       '',
  storeName:      'Zenocart',
  fbPage:         'zenocart.bd',
  heroPill:       '',
  offerBadgeMain: '',
  offerBadgeSub:  '',
  maintenance:    false
};

// ── Sessions ──────────────────────────────────────────────────────────────────
const sessions = {};
function makeSession() {
  const id = crypto.randomBytes(24).toString('hex');
  sessions[id] = { loggedIn: false, created: Date.now() };
  return id;
}
function getSession(req) {
  const c = (req.headers.cookie || '').split(';').find(c => c.trim().startsWith('zc_sid='));
  if (!c) return null;
  const sid = c.split('=')[1]?.trim();
  return sessions[sid] ? { sid, data: sessions[sid] } : null;
}
function requireAuth(req, res) {
  const s = getSession(req);
  if (!s || !s.data.loggedIn) { respond(res, 401, { error: 'Unauthorized' }); return false; }
  return true;
}

// ── JSON helpers ─────────────────────────────────────────────────────────────
function readJSON(file, fb) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fb; } }
function writeJSON(file, d) {
  try { const dir = path.dirname(file); if (!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(file, JSON.stringify(d,null,2)); }
  catch(e) { console.error('writeJSON:', e.message); }
}

// ── Product CRUD (local JSON) ─────────────────────────────────────────────────
async function getProducts(f={}) {
  let list = readJSON(LOCAL_PRODUCTS, []);
  if (f.category) list = list.filter(p => (p.category_slug||p.categorySlug) === f.category);
  if (f.q) { const q=f.q.toLowerCase(); list=list.filter(p=>p.name.toLowerCase().includes(q)); }
  if (f.sort==='price-low')  list.sort((a,b)=>a.price-b.price);
  if (f.sort==='price-high') list.sort((a,b)=>b.price-a.price);
  if (f.sort==='rating')     list.sort((a,b)=>b.rating-a.rating);
  if (f.sort==='sold')       list.sort((a,b)=>b.sold-a.sold);
  return list;
}
async function getProduct(id) {
  return readJSON(LOCAL_PRODUCTS,[]).find(p=>p.id===id)||null;
}
async function createProduct(p) {
  const list=readJSON(LOCAL_PRODUCTS,[]); const maxId=list.reduce((m,x)=>Math.max(m,x.id||0),0);
  const np={...p,id:maxId+1}; list.push(np); writeJSON(LOCAL_PRODUCTS,list); return np;
}
async function updateProduct(id,p) {
  const list=readJSON(LOCAL_PRODUCTS,[]); const i=list.findIndex(x=>x.id===id);
  if(i===-1)return null; list[i]={...list[i],...p}; writeJSON(LOCAL_PRODUCTS,list); return list[i];
}
async function deleteProduct(id) {
  const list=readJSON(LOCAL_PRODUCTS,[]); if(!list.find(p=>p.id===id))return false;
  writeJSON(LOCAL_PRODUCTS,list.filter(p=>p.id!==id)); return true;
}

// ── Image upload (local filesystem) ──────────────────────────────────────────
async function uploadImage(buf, fileName) {
  const fname = 'product_' + Date.now() + (path.extname(fileName)||'.jpg');
  fs.writeFileSync(path.join(PUBLIC,'images',fname), buf);
  return 'images/' + fname;
}

// ── Multipart parser (supports multiple files) ───────────────────────────────
function parseMultipart(buf, boundary) {
  const fields={}; let fileBuffer=null, fileName='';
  const files=[]; // all uploaded files
  for (const part of buf.toString('binary').split('--'+boundary)) {
    if (!part.includes('Content-Disposition')) continue;
    const [hdrs,...rest] = part.split('\r\n\r\n');
    const body = rest.join('\r\n\r\n').replace(/\r\n$/,'');
    const nm = hdrs.match(/name="([^"]+)"/), fm = hdrs.match(/filename="([^"]+)"/);
    if (!nm) continue;
    if (fm) {
      const fb = Buffer.from(body,'binary');
      files.push({name:fm[1], data:fb});
      if(!fileBuffer){ fileBuffer=fb; fileName=fm[1]; } // first file = main
    }
    else fields[nm[1]]=body;
  }
  return {fields, fileBuffer, fileName, files};
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((res,rej)=>{ const c=[]; req.on('data',d=>c.push(d)); req.on('end',()=>res(Buffer.concat(c))); req.on('error',rej); });
}
function respond(res,status,body,hdrs={}) {
  const isObj=typeof body==='object';
  res.writeHead(status,{'Content-Type':isObj?'application/json':'text/plain',...hdrs});
  res.end(isObj?JSON.stringify(body):String(body));
}
const MIME={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp'};
function serveStatic(res,fp) {
  const mime=MIME[path.extname(fp).toLowerCase()]||'application/octet-stream';
  fs.readFile(fp,(err,data)=>{ if(err){respond(res,404,'Not found');return;} res.writeHead(200,{'Content-Type':mime}); res.end(data); });
}

// ── Build product object from form fields ─────────────────────────────────────
function buildProduct(fields, imagePath, existing={}, newImages=[]) {
  let specs=existing.specs||[];
  try{ if(fields.specs) specs=JSON.parse(fields.specs); }catch{}
  let reviews=existing.reviews||[];
  try{ if(fields.reviews) reviews=JSON.parse(fields.reviews); }catch{}
  let variants=existing.variants||[];
  try{ if(fields.variants) variants=JSON.parse(fields.variants); }catch{}

  // Image list: start from kept existing images, then add new uploads
  let keptImages=existing.images||[];
  try{ if(fields.keptImages) keptImages=JSON.parse(fields.keptImages); }catch{}
  const finalImages = newImages.length>0 ? [...keptImages, ...newImages] : (keptImages.length>0 ? keptImages : (imagePath?[imagePath]:[]));
  const mainImage   = finalImages[0] || imagePath || existing.image || '';

  return {
    name:          fields.name         || existing.name        || 'New Product',
    short_name:    fields.shortName    || existing.short_name  || fields.name || 'Product',
    category:      fields.category     || existing.category    || 'General',
    category_slug: fields.categorySlug || existing.category_slug || 'general',
    price:         parseFloat(fields.price)   || existing.price   || 0,
    old_price:     fields.oldPrice ? parseFloat(fields.oldPrice) : (existing.old_price||null),
    rating:        parseFloat(fields.rating)  || existing.rating  || 5.0,
    sold:          parseInt(fields.sold)      || existing.sold    || 0,
    badge:         fields.badge!==undefined ? (fields.badge||null) : (existing.badge||null),
    in_stock:      fields.in_stock!==undefined ? (fields.in_stock==='true'||fields.in_stock===true) : (existing.in_stock!==false),
    stock_count:   fields.stock_count!==undefined ? (parseInt(fields.stock_count)||0) : (existing.stock_count||0),
    meta_desc:     fields.meta_desc    || existing.meta_desc   || '',
    description:   fields.description || existing.description || '',
    fb_link:       fields.fb_link !== undefined ? (fields.fb_link || '') : (existing.fb_link || ''),
    image:         mainImage,
    images:        finalImages,
    specs:         specs,
    variants:      variants,
    reviews:       reviews,
    updated_at:    new Date().toISOString()
  };
}

// ── Extra data files
const CATEGORIES_FILE = path.join(DATADIR,'categories.json');
const DELIVERY_FILE   = path.join(DATADIR,'delivery.json');
const ORDERS_FILE     = path.join(DATADIR,'orders.json');
const DEFAULT_CATS    = [
  {id:1,name:'Mini Fans',slug:'fans',icon:'\u{1F32C}\uFE0F',active:true},
  {id:2,name:'Power Banks',slug:'powerbanks',icon:'\uD83D\uDD0B',active:true},
  {id:3,name:'Watches',slug:'watches',icon:'\u231A',active:true},
  {id:4,name:'Headphones',slug:'headphones',icon:'\uD83C\uDFA7',active:true},
  {id:5,name:'LED Lamps',slug:'lamps',icon:'\uD83D\uDCA1',active:true}
];
const DEFAULT_DELIVERY = [
  {id:1,area:'Dhaka City',price:60,active:true},
  {id:2,area:'Dhaka District',price:80,active:true},
  {id:3,area:'Chittagong City',price:80,active:true},
  {id:4,area:'Chittagong District',price:100,active:true},
  {id:5,area:'Sylhet',price:100,active:true},
  {id:6,area:'Rajshahi',price:100,active:true},
  {id:7,area:'Khulna',price:100,active:true},
  {id:8,area:'Barisal',price:110,active:true},
  {id:9,area:'Rangpur',price:110,active:true},
  {id:10,area:'Mymensingh',price:100,active:true}
];

// ── Init ──────────────────────────────────────────────────────────────────────
function initData() {
  [DATADIR, path.join(PUBLIC,'images')].forEach(d=>{ if(!fs.existsSync(d)){fs.mkdirSync(d,{recursive:true});console.log('Created:',d);} });
  if(!fs.existsSync(USERS_FILE)){
    const salt=crypto.randomBytes(16).toString('hex');
    const hash=crypto.createHmac('sha256',salt).update('admin123').digest('hex');
    writeJSON(USERS_FILE,[{username:'admin',salt,hash,role:'admin'}]);
    console.log('Admin created: admin / admin123');
  }
  if(!fs.existsSync(LOCAL_PRODUCTS))  { writeJSON(LOCAL_PRODUCTS,[]); }
  if(!fs.existsSync(SETTINGS_FILE))   { writeJSON(SETTINGS_FILE, DEFAULT_SETTINGS); }
  if(!fs.existsSync(CATEGORIES_FILE)){ writeJSON(CATEGORIES_FILE,DEFAULT_CATS); }
  if(!fs.existsSync(DELIVERY_FILE))  { writeJSON(DELIVERY_FILE,DEFAULT_DELIVERY); }
  if(!fs.existsSync(ORDERS_FILE))    { writeJSON(ORDERS_FILE,[]); }
  console.log('Storage: local JSON + Backup/Restore');
}

// ── Router ────────────────────────────────────────────────────────────────────
const srv = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const u=new URL(req.url,`http://localhost:${PORT}`), pn=u.pathname, mt=req.method;

  // ── Maintenance mode intercept ────────────────────────────────────────────
  const isAdminPath   = pn.startsWith('/admin') || pn.startsWith('/api/admin') || pn.startsWith('/api/auth');
  const isApiSettings = pn==='/api/settings';
  const settings      = readJSON(SETTINGS_FILE, DEFAULT_SETTINGS);
  const previewBypass = u.searchParams.get('preview') === 'zenocart_admin';
  if(settings.maintenance && !isAdminPath && !previewBypass){
    // Allow settings API so frontend can detect maintenance
    if(isApiSettings){ return respond(res,200,settings); }
    // Block all other HTML page requests with maintenance page
    if(!pn.startsWith('/api') && !pn.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|webp)$/)){
      const html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zenocart — Down for Maintenance</title><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Plus Jakarta Sans',sans-serif;background:#000;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;-webkit-font-smoothing:antialiased}.bg{position:fixed;inset:0;background:radial-gradient(ellipse 80% 70% at 20% 40%,rgba(0,80,200,.4) 0%,transparent 60%),radial-gradient(ellipse 60% 60% at 80% 20%,rgba(90,20,180,.25) 0%,transparent 55%),radial-gradient(ellipse 50% 80% at 60% 80%,rgba(0,160,140,.18) 0%,transparent 55%);pointer-events:none}.card{position:relative;z-index:1;text-align:center;padding:52px 40px;background:rgba(255,255,255,.06);backdrop-filter:blur(40px) saturate(180%);-webkit-backdrop-filter:blur(40px) saturate(180%);border:1px solid rgba(255,255,255,.12);border-radius:28px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.15)}.icon{font-size:3.5rem;margin-bottom:20px;animation:float 3s ease-in-out infinite}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}h1{font-size:1.75rem;font-weight:800;letter-spacing:-.03em;margin-bottom:10px}p{color:rgba(255,255,255,.6);font-size:.95rem;line-height:1.7;margin-bottom:28px}.badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,159,10,.12);border:1px solid rgba(255,159,10,.3);border-radius:980px;padding:7px 18px;font-size:.8rem;font-weight:600;color:#FF9F0A;letter-spacing:.04em;text-transform:uppercase}.dot{width:7px;height:7px;background:#FF9F0A;border-radius:50%;animation:pulse 1.5s infinite}@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.4)}}</style></head><body><div class="bg"></div><div class="card"><div class="icon">🔧</div><h1>Back Soon</h1><p>We're making some improvements to give you a better experience. Zenocart will be back online shortly.</p><div class="badge"><span class="dot"></span>Down for Maintenance</div></div></body></html>`;
      res.writeHead(503,{'Content-Type':'text/html'}); return res.end(html);
    }
  }

  // Public API
  if(pn==='/api/products' && mt==='GET'){
    try{ return respond(res,200,await getProducts({category:u.searchParams.get('category'),q:u.searchParams.get('q'),sort:u.searchParams.get('sort')})); }
    catch(e){ console.error(e); return respond(res,500,{error:e.message}); }
  }
  if(pn.match(/^\/api\/products\/\d+$/) && mt==='GET'){
    try{ const p=await getProduct(parseInt(pn.split('/')[3])); return p?respond(res,200,p):respond(res,404,{error:'Not found'}); }
    catch(e){ return respond(res,500,{error:e.message}); }
  }
  if(pn==='/api/config' && mt==='GET'){
    return respond(res,200,{mode:'local',storage:'json+backup'});
  }

  // Auth
  if(pn==='/api/auth/login' && mt==='POST'){
    const b=JSON.parse((await readBody(req)).toString()||'{}');
    const users=readJSON(USERS_FILE,[]); const user=users.find(u=>u.username===b.username);
    if(!user)return respond(res,401,{error:'Invalid credentials'});
    const hash=crypto.createHmac('sha256',user.salt).update(b.password).digest('hex');
    if(hash!==user.hash)return respond(res,401,{error:'Invalid credentials'});
    const sid=makeSession(); sessions[sid].loggedIn=true; sessions[sid].username=user.username;
    return respond(res,200,{ok:true,username:user.username},{'Set-Cookie':`zc_sid=${sid}; HttpOnly; Path=/; SameSite=Lax`});
  }
  if(pn==='/api/auth/logout' && mt==='POST'){
    const s=getSession(req); if(s)delete sessions[s.sid]; return respond(res,200,{ok:true});
  }
  if(pn==='/api/auth/me' && mt==='GET'){
    const s=getSession(req); return respond(res,200,{loggedIn:!!(s&&s.data.loggedIn)});
  }
  if(pn==='/api/auth/change-password' && mt==='POST'){
    if(!requireAuth(req,res))return;
    const b=JSON.parse((await readBody(req)).toString()||'{}');
    if(!b.newPassword)return respond(res,400,{error:'Missing newPassword'});
    const users=readJSON(USERS_FILE,[]); const user=users.find(u=>u.role==='admin');
    user.salt=crypto.randomBytes(16).toString('hex');
    user.hash=crypto.createHmac('sha256',user.salt).update(b.newPassword).digest('hex');
    writeJSON(USERS_FILE,users); return respond(res,200,{ok:true});
  }

  // Admin CRUD
  if(pn==='/api/admin/products' && mt==='POST'){
    if(!requireAuth(req,res))return;
    const ct=req.headers['content-type']||''; const bm=ct.match(/boundary=(.+)/);
    if(!bm)return respond(res,400,{error:'Expected multipart'});
    const parsed=parseMultipart(await readBody(req),bm[1]);
    const {fields,files}=parsed;
    const newImgs=[];
    for(const f of (files||[])){
      if(f.data&&f.data.length>100){
        try{ newImgs.push(await uploadImage(f.data,f.name)); }
        catch(e){ console.error('Upload error:',e.message); }
      }
    }
    try{
      const p=buildProduct(fields,'',{},newImgs); p.created_at=new Date().toISOString();
      return respond(res,201,await createProduct(p));
    }catch(e){console.error(e);return respond(res,500,{error:e.message});}
  }

  if(pn.match(/^\/api\/admin\/products\/\d+$/) && mt==='PUT'){
    if(!requireAuth(req,res))return;
    const id=parseInt(pn.split('/')[4]); const ct=req.headers['content-type']||'';
    let fields={}, files=[];
    if(ct.includes('multipart')){
      const bm=ct.match(/boundary=(.+)/);
      const parsed=parseMultipart(await readBody(req),bm[1]);
      fields=parsed.fields; files=parsed.files||[];
    } else { fields=JSON.parse((await readBody(req)).toString()||'{}'); }
    const existing=await getProduct(id); if(!existing)return respond(res,404,{error:'Not found'});
    const newImgs=[];
    for(const f of files){
      if(f.data&&f.data.length>100){
        try{ newImgs.push(await uploadImage(f.data,f.name)); }
        catch(e){ console.error('Upload error:',e.message); }
      }
    }
    try{
      const updated=buildProduct(fields,'',existing,newImgs);
      return respond(res,200,await updateProduct(id,updated)||existing);
    }catch(e){console.error(e);return respond(res,500,{error:e.message});}
  }

  if(pn.match(/^\/api\/admin\/products\/\d+$/) && mt==='DELETE'){
    if(!requireAuth(req,res))return;
    const id=parseInt(pn.split('/')[4]);
    try{const ok=await deleteProduct(id);return ok?respond(res,200,{ok:true}):respond(res,404,{error:'Not found'});}
    catch(e){return respond(res,500,{error:e.message});}
  }

  // ── CATEGORIES API ────────────────────────────────────────────────────────
  if(pn==='/api/categories' && mt==='GET'){
    const cats = readJSON(CATEGORIES_FILE, DEFAULT_CATS);
    const all = pn.includes('all'); // admin wants all; public wants active only
    return respond(res,200, cats);
  }
  if(pn==='/api/admin/categories' && mt==='GET'){
    if(!requireAuth(req,res))return;
    return respond(res,200,readJSON(CATEGORIES_FILE,DEFAULT_CATS));
  }
  if(pn==='/api/admin/categories' && mt==='POST'){
    if(!requireAuth(req,res))return;
    const b=JSON.parse((await readBody(req)).toString()||'{}');
    if(!b.name||!b.slug)return respond(res,400,{error:'name and slug required'});
    const cats=readJSON(CATEGORIES_FILE,DEFAULT_CATS);
    const maxId=cats.reduce((m,c)=>Math.max(m,c.id||0),0);
    const nc={id:maxId+1,name:b.name,slug:b.slug,icon:b.icon||'📦',active:b.active!==false};
    cats.push(nc); writeJSON(CATEGORIES_FILE,cats);
    return respond(res,201,nc);
  }
  if(pn.match(/^\/api\/admin\/categories\/\d+$/) && mt==='PUT'){
    if(!requireAuth(req,res))return;
    const id=parseInt(pn.split('/')[4]);
    const b=JSON.parse((await readBody(req)).toString()||'{}');
    const cats=readJSON(CATEGORIES_FILE,DEFAULT_CATS);
    const i=cats.findIndex(c=>c.id===id); if(i===-1)return respond(res,404,{error:'Not found'});
    cats[i]={...cats[i],...b,id}; writeJSON(CATEGORIES_FILE,cats);
    return respond(res,200,cats[i]);
  }
  if(pn.match(/^\/api\/admin\/categories\/\d+$/) && mt==='DELETE'){
    if(!requireAuth(req,res))return;
    const id=parseInt(pn.split('/')[4]);
    let cats=readJSON(CATEGORIES_FILE,DEFAULT_CATS);
    if(!cats.find(c=>c.id===id))return respond(res,404,{error:'Not found'});
    writeJSON(CATEGORIES_FILE,cats.filter(c=>c.id!==id));
    return respond(res,200,{ok:true});
  }

  // ── DELIVERY API ───────────────────────────────────────────────────────────
  if(pn==='/api/delivery' && mt==='GET'){
    return respond(res,200,readJSON(DELIVERY_FILE,DEFAULT_DELIVERY).filter(d=>d.active));
  }
  if(pn==='/api/admin/delivery' && mt==='GET'){
    if(!requireAuth(req,res))return;
    return respond(res,200,readJSON(DELIVERY_FILE,DEFAULT_DELIVERY));
  }
  if(pn==='/api/admin/delivery' && mt==='POST'){
    if(!requireAuth(req,res))return;
    const b=JSON.parse((await readBody(req)).toString()||'{}');
    if(!b.area)return respond(res,400,{error:'area required'});
    const list=readJSON(DELIVERY_FILE,DEFAULT_DELIVERY);
    const maxId=list.reduce((m,d)=>Math.max(m,d.id||0),0);
    const nd={id:maxId+1,area:b.area,price:parseInt(b.price)||0,active:b.active!==false};
    list.push(nd); writeJSON(DELIVERY_FILE,list);
    return respond(res,201,nd);
  }
  if(pn.match(/^\/api\/admin\/delivery\/\d+$/) && mt==='PUT'){
    if(!requireAuth(req,res))return;
    const id=parseInt(pn.split('/')[4]);
    const b=JSON.parse((await readBody(req)).toString()||'{}');
    const list=readJSON(DELIVERY_FILE,DEFAULT_DELIVERY);
    const i=list.findIndex(d=>d.id===id); if(i===-1)return respond(res,404,{error:'Not found'});
    list[i]={...list[i],...b,id}; writeJSON(DELIVERY_FILE,list);
    return respond(res,200,list[i]);
  }
  if(pn.match(/^\/api\/admin\/delivery\/\d+$/) && mt==='DELETE'){
    if(!requireAuth(req,res))return;
    const id=parseInt(pn.split('/')[4]);
    let list=readJSON(DELIVERY_FILE,DEFAULT_DELIVERY);
    if(!list.find(d=>d.id===id))return respond(res,404,{error:'Not found'});
    writeJSON(DELIVERY_FILE,list.filter(d=>d.id!==id));
    return respond(res,200,{ok:true});
  }

  // ── ORDERS API ─────────────────────────────────────────────────────────────
  if(pn==='/api/orders' && mt==='POST'){
    const b=JSON.parse((await readBody(req)).toString()||'{}');
    if(!b.name||!b.phone||!b.whatsapp||!b.address)return respond(res,400,{error:'Missing required fields'});
    const orders=readJSON(ORDERS_FILE,[]);
    const maxId=orders.reduce((m,o)=>Math.max(m,o.id||0),0);
    const order={
      id:maxId+1, name:b.name, phone:b.phone, whatsapp:b.whatsapp,
      address:b.address, area:b.area||'', notes:b.notes||'',
      items:b.items||[], subtotal:b.subtotal||0,
      delivery_charge:b.delivery_charge||0, total:b.total||0,
      payment:b.payment||'cod', status:'pending',
      created_at:new Date().toISOString()
    };
    orders.push(order); writeJSON(ORDERS_FILE,orders);
    return respond(res,201,{ok:true,orderId:order.id});
  }
  if(pn==='/api/admin/orders' && mt==='GET'){
    if(!requireAuth(req,res))return;
    const orders=readJSON(ORDERS_FILE,[]);
    return respond(res,200,[...orders].reverse()); // newest first
  }
  if(pn.match(/^\/api\/admin\/orders\/\d+\/status$/) && mt==='PUT'){
    if(!requireAuth(req,res))return;
    const id=parseInt(pn.split('/')[4]);
    const b=JSON.parse((await readBody(req)).toString()||'{}');
    const orders=readJSON(ORDERS_FILE,[]);
    const i=orders.findIndex(o=>o.id===id); if(i===-1)return respond(res,404,{error:'Not found'});
    orders[i].status=b.status||orders[i].status;
    orders[i].updated_at=new Date().toISOString();
    writeJSON(ORDERS_FILE,orders);
    return respond(res,200,orders[i]);
  }
  if(pn.match(/^\/api\/admin\/orders\/\d+$/) && mt==='DELETE'){
    if(!requireAuth(req,res))return;
    const id=parseInt(pn.split('/')[4]);
    let orders=readJSON(ORDERS_FILE,[]);
    if(!orders.find(o=>o.id===id))return respond(res,404,{error:'Not found'});
    writeJSON(ORDERS_FILE,orders.filter(o=>o.id!==id));
    return respond(res,200,{ok:true});
  }


  // ── BACKUP API ─────────────────────────────────────────────────────────────
  // GET /api/admin/backup — ZIP containing data JSON + all product images
  if(pn==='/api/admin/backup' && mt==='GET'){
    if(!requireAuth(req,res))return;
    try{
      const backup = {
        version: '2.0',
        created_at: new Date().toISOString(),
        products:   readJSON(LOCAL_PRODUCTS,   []),
        categories: readJSON(CATEGORIES_FILE,  DEFAULT_CATS),
        delivery:   readJSON(DELIVERY_FILE,    DEFAULT_DELIVERY),
        orders:     readJSON(ORDERS_FILE,      []),
        settings:   readJSON(SETTINGS_FILE,    DEFAULT_SETTINGS)
      };
      const zipFiles = [];

      // 1. Add the data JSON
      zipFiles.push({ name: 'zenocart-backup.json', data: Buffer.from(JSON.stringify(backup, null, 2), 'utf8') });

      // 2. Collect unique image paths from products
      const imagePaths = new Set();
      backup.products.forEach(p => {
        const imgs = typeof p.images === 'string' ? JSON.parse(p.images || '[]') : (p.images || []);
        [p.image, ...imgs].forEach(img => { if(img && typeof img === 'string') imagePaths.add(img); });
      });

      // 3. Add each image file to the ZIP (skip external URLs & missing files)
      let imageCount = 0;
      for (const imgPath of imagePaths) {
        if (imgPath.startsWith('http')) continue; // External URL — already hosted elsewhere, skip
        // Try both /public/images/ and /uploads/
        const candidates = [
          path.join(PUBLIC, imgPath),
          path.join(PUBLIC, 'images', path.basename(imgPath)),
          path.join(__dirname, 'uploads', path.basename(imgPath)),
          path.join(process.cwd(), imgPath)
        ];
        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            try {
              const imgData = fs.readFileSync(candidate);
              // Store as images/filename inside zip
              zipFiles.push({ name: 'images/' + path.basename(imgPath), data: imgData });
              imageCount++;
            } catch(e) { /* skip unreadable */ }
            break;
          }
        }
      }

      const zipBuf  = buildZip(zipFiles);
      const filename = 'zenocart-backup-' + new Date().toISOString().slice(0,10) + '.zip';
      console.log('Backup created: ' + backup.products.length + ' products, ' + imageCount + ' images');
      res.writeHead(200, {
        'Content-Type':        'application/zip',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
        'Content-Length':       zipBuf.length
      });
      return res.end(zipBuf);
    } catch(e){ console.error('Backup error:', e); return respond(res, 500, {error: e.message}); }
  }

  // POST /api/admin/restore — upload backup ZIP, restore data + images
  if(pn==='/api/admin/restore' && mt==='POST'){
    if(!requireAuth(req,res))return;
    try{
      const ct = req.headers['content-type'] || '';
      const bm = ct.match(/boundary=(.+)/);
      if(!bm) return respond(res, 400, {error: 'Expected multipart'});
      const rawBuf = await readBody(req);
      const { fileBuffer, fileName } = parseMultipart(rawBuf, bm[1]);
      if(!fileBuffer || fileBuffer.length < 10)
        return respond(res, 400, {error: 'No file received'});

      // Ensure directories exist
      if(!fs.existsSync(DATADIR)) fs.mkdirSync(DATADIR, {recursive: true});
      const imgDir = path.join(PUBLIC, 'images');
      if(!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, {recursive: true});

      let backup = null;
      let restoredImages = 0;

      const isZip = fileName.endsWith('.zip') ||
                    (fileBuffer[0]===0x50 && fileBuffer[1]===0x4B &&
                     fileBuffer[2]===0x03 && fileBuffer[3]===0x04);

      if(isZip){
        // Extract ALL files from ZIP
        const allFiles = extractAllFilesFromZip(fileBuffer);

        for(const { name, data } of allFiles){
          if(name === 'zenocart-backup.json' || name.endsWith('/zenocart-backup.json')){
            try{ backup = JSON.parse(data.toString('utf8')); }catch(e){}
          } else if(name.startsWith('images/') && data.length > 0){
            // Restore image file
            const imgName = path.basename(name);
            const dest    = path.join(imgDir, imgName);
            try{ fs.writeFileSync(dest, data); restoredImages++; }catch(e){ console.error('Image restore error:', imgName, e.message); }
          }
        }
        if(!backup){
          // Fallback: try old single-JSON method
          const jsonStr = extractFirstJsonFromZip(fileBuffer);
          if(jsonStr) try{ backup = JSON.parse(jsonStr); }catch(e){}
        }
      } else {
        // Raw JSON file
        try{ backup = JSON.parse(fileBuffer.toString('utf8')); }catch(e){}
      }

      if(!backup) return respond(res, 400, {error: 'Could not read backup data from file'});
      if(!backup.version) return respond(res, 400, {error: 'Not a valid Zenocart backup file'});

      // Restore each data store
      const restored = [];
      if(Array.isArray(backup.products)){
        writeJSON(LOCAL_PRODUCTS, backup.products);
        restored.push(backup.products.length + ' products');
      }
      if(Array.isArray(backup.categories)){
        writeJSON(CATEGORIES_FILE, backup.categories);
        restored.push(backup.categories.length + ' categories');
      }
      if(Array.isArray(backup.delivery)){
        writeJSON(DELIVERY_FILE, backup.delivery);
        restored.push(backup.delivery.length + ' delivery areas');
      }
      if(Array.isArray(backup.orders)){
        writeJSON(ORDERS_FILE, backup.orders);
        restored.push(backup.orders.length + ' orders');
      }
      if(backup.settings && typeof backup.settings === 'object'){
        writeJSON(SETTINGS_FILE, {...DEFAULT_SETTINGS, ...backup.settings});
        restored.push('settings');
      }
      if(restoredImages > 0) restored.push(restoredImages + ' images');

      console.log('Restore complete:', restored.join(', '));
      return respond(res, 200, {
        ok: true,
        message: 'Restore successful! Restored: ' + restored.join(', '),
        backup_date: backup.created_at || 'unknown',
        restored
      });
    } catch(e){ console.error('Restore error:', e); return respond(res, 500, {error: e.message}); }
  }

  // ── SETTINGS API ─────────────────────────────────────────────────────────
  if(pn==='/api/settings' && mt==='GET'){
    return respond(res,200,readJSON(SETTINGS_FILE, DEFAULT_SETTINGS));
  }
  if(pn==='/api/admin/maintenance' && mt==='PUT'){
    if(!requireAuth(req,res))return;
    const b=JSON.parse((await readBody(req)).toString()||'{}');
    const current=readJSON(SETTINGS_FILE, DEFAULT_SETTINGS);
    current.maintenance = !!b.maintenance;
    writeJSON(SETTINGS_FILE, current);
    return respond(res,200,{maintenance:current.maintenance});
  }

  if(pn==='/api/admin/settings' && mt==='PUT'){
    if(!requireAuth(req,res))return;
    const b=JSON.parse((await readBody(req)).toString()||'{}');
    const current=readJSON(SETTINGS_FILE, DEFAULT_SETTINGS);
    const updated={...current,...b};
    writeJSON(SETTINGS_FILE, updated);
    return respond(res,200,updated);
  }

  // ── SITEMAP ────────────────────────────────────────────────────────────────
  if(pn==='/sitemap.xml' && mt==='GET'){
    const prods = readJSON(LOCAL_PRODUCTS,[]);
    const base  = 'https://test-site-production-0fe0.up.railway.app';
    const urls  = [
      `<url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      `<url><loc>${base}/pages/shop.html</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`,
      ...prods.map(p=>`<url><loc>${base}/pages/product.html?id=${p.id}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`)
    ].join('\n  ');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${urls}\n</urlset>`;
    res.writeHead(200,{'Content-Type':'application/xml'}); return res.end(xml);
  }

  // ── REVIEWS API ─────────────────────────────────────────────────────────────
  if(pn.match(/^\/api\/products\/\d+\/reviews$/) && mt==='POST'){
    const id=parseInt(pn.split('/')[3]);
    const b=JSON.parse((await readBody(req)).toString()||'{}');
    if(!b.name||!b.rating||!b.comment) return respond(res,400,{error:'name, rating, comment required'});
    const list=readJSON(LOCAL_PRODUCTS,[]);
    const i=list.findIndex(p=>p.id===id); if(i===-1) return respond(res,404,{error:'Not found'});
    if(!list[i].reviews) list[i].reviews=[];
    const review={id:Date.now(),name:b.name,rating:Math.min(5,Math.max(1,parseInt(b.rating))),comment:b.comment,date:new Date().toISOString()};
    list[i].reviews.push(review);
    // Recalculate average rating
    const avg=list[i].reviews.reduce((s,r)=>s+r.rating,0)/list[i].reviews.length;
    list[i].rating=Math.round(avg*10)/10;
    writeJSON(LOCAL_PRODUCTS,list);
    return respond(res,201,review);
  }
  if(pn.match(/^\/api\/admin\/products\/\d+\/reviews\/\d+$/) && mt==='DELETE'){
    if(!requireAuth(req,res))return;
    const parts=pn.split('/'); const pid=parseInt(parts[4]); const rid=parseInt(parts[6]);
    const list=readJSON(LOCAL_PRODUCTS,[]);
    const i=list.findIndex(p=>p.id===pid); if(i===-1) return respond(res,404,{error:'Not found'});
    list[i].reviews=(list[i].reviews||[]).filter(r=>r.id!==rid);
    writeJSON(LOCAL_PRODUCTS,list);
    return respond(res,200,{ok:true});
  }

  // ── ORDER NOTES API ─────────────────────────────────────────────────────────
  if(pn.match(/^\/api\/admin\/orders\/\d+\/notes$/) && mt==='PUT'){
    if(!requireAuth(req,res))return;
    const id=parseInt(pn.split('/')[4]);
    const b=JSON.parse((await readBody(req)).toString()||'{}');
    const orders=readJSON(ORDERS_FILE,[]);
    const i=orders.findIndex(o=>o.id===id); if(i===-1) return respond(res,404,{error:'Not found'});
    orders[i].admin_notes=b.notes||'';
    orders[i].updated_at=new Date().toISOString();
    writeJSON(ORDERS_FILE,orders);
    return respond(res,200,orders[i]);
  }

  // Admin panel
  if(pn==='/admin'||pn==='/admin/'||pn.startsWith('/admin/')){
    for(const fp of [path.join(__dirname,'admin','index.html'),path.join(__dirname,'public','admin','index.html'),path.join(process.cwd(),'admin','index.html'),path.join(process.cwd(),'public','admin','index.html')]){
      if(fs.existsSync(fp))return serveStatic(res,fp);
    }
    return respond(res,404,'Admin not found');
  }

  // Static files
  let fp=path.join(PUBLIC,pn==='/'?'index.html':pn);
  if(!fp.startsWith(PUBLIC)){respond(res,403,'Forbidden');return;}
  if(fs.existsSync(fp)&&fs.statSync(fp).isDirectory())fp=path.join(fp,'index.html');
  if(fs.existsSync(fp))return serveStatic(res,fp);
  respond(res,404,'Not found');
});

initData();
srv.listen(PORT,'0.0.0.0',()=>{
  console.log(`\n🚀  Zenocart  →  http://0.0.0.0:${PORT}`);
  console.log(`🔧  Admin     →  http://0.0.0.0:${PORT}/admin`);
  console.log(`📦  API       →  http://0.0.0.0:${PORT}/api/products\n`);
});

function defaultProducts(){ return []; } // No demo products — add real ones via admin panel

// ── Pure-Node ZIP builder (no npm) ──────────────────────────────────────────
// Builds a minimal ZIP archive containing an array of {name, data} entries.
// Uses STORE (no compression) for simplicity and zero dependencies.
function buildZip(files) {
  const zlib = require('zlib');
  const parts = [];
  const centralDir = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes  = Buffer.from(file.name, 'utf8');
    const data       = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, 'utf8');
    const crc        = crc32(data);
    const now        = new Date();
    const dosDate    = ((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
    const dosTime    = (now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);

    // Local file header
    const lfh = Buffer.alloc(30 + nameBytes.length);
    lfh.writeUInt32LE(0x04034b50, 0);  // signature
    lfh.writeUInt16LE(20, 4);           // version needed
    lfh.writeUInt16LE(0, 6);            // flags
    lfh.writeUInt16LE(0, 8);            // compression (STORE)
    lfh.writeUInt16LE(dosTime, 10);
    lfh.writeUInt16LE(dosDate, 12);
    lfh.writeInt32LE(crc, 14);
    lfh.writeUInt32LE(data.length, 18); // compressed size
    lfh.writeUInt32LE(data.length, 22); // uncompressed size
    lfh.writeUInt16LE(nameBytes.length, 26);
    lfh.writeUInt16LE(0, 28);           // extra field length
    nameBytes.copy(lfh, 30);

    // Central directory entry
    const cde = Buffer.alloc(46 + nameBytes.length);
    cde.writeUInt32LE(0x02014b50, 0);  // signature
    cde.writeUInt16LE(20, 4);           // version made by
    cde.writeUInt16LE(20, 6);           // version needed
    cde.writeUInt16LE(0, 8);            // flags
    cde.writeUInt16LE(0, 10);           // compression
    cde.writeUInt16LE(dosTime, 12);
    cde.writeUInt16LE(dosDate, 14);
    cde.writeInt32LE(crc, 16);
    cde.writeUInt32LE(data.length, 20);
    cde.writeUInt32LE(data.length, 24);
    cde.writeUInt16LE(nameBytes.length, 28);
    cde.writeUInt16LE(0, 30);           // extra length
    cde.writeUInt16LE(0, 32);           // comment length
    cde.writeUInt16LE(0, 34);           // disk start
    cde.writeUInt16LE(0, 36);           // internal attrs
    cde.writeUInt32LE(0, 38);           // external attrs
    cde.writeUInt32LE(offset, 42);      // local header offset
    nameBytes.copy(cde, 46);

    parts.push(lfh, data);
    centralDir.push(cde);
    offset += lfh.length + data.length;
  }

  const cdBuf   = Buffer.concat(centralDir);
  const eocd    = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4);           // disk number
  eocd.writeUInt16LE(0, 6);           // disk with CD
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);          // comment length

  return Buffer.concat([...parts, cdBuf, eocd]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) | 0;
}

// ── ZIP reader — extract ALL files from a ZIP buffer ───────────────────────
function extractAllFilesFromZip(buf) {
  const files = [];
  let pos = 0;
  while (pos < buf.length - 30) {
    // Local file header signature: PK\x03\x04
    if (buf[pos]===0x50 && buf[pos+1]===0x4B && buf[pos+2]===0x03 && buf[pos+3]===0x04) {
      const compMethod = buf.readUInt16LE(pos + 8);
      const compSize   = buf.readUInt32LE(pos + 18);
      const uncompSize = buf.readUInt32LE(pos + 22);
      const nameLen    = buf.readUInt16LE(pos + 26);
      const extraLen   = buf.readUInt16LE(pos + 28);
      const name       = buf.slice(pos + 30, pos + 30 + nameLen).toString('utf8');
      const dataStart  = pos + 30 + nameLen + extraLen;
      const dataEnd    = dataStart + compSize;

      if (compSize > 0 && dataEnd <= buf.length && !name.endsWith('/')) {
        const compData = buf.slice(dataStart, dataEnd);
        let fileData   = compData;
        if (compMethod === 8) {  // DEFLATE
          try {
            const zlib = require('zlib');
            fileData = zlib.inflateRawSync(compData);
          } catch(e) { fileData = compData; }
        }
        files.push({ name, data: fileData });
      }
      // Move to next entry
      pos = dataEnd > pos + 1 ? dataEnd : pos + 1;
    } else {
      pos++;
    }
  }
  return files;
}

// ── Minimal ZIP reader — extract first .json file content ───────────────────
function extractFirstJsonFromZip(buf) {
  // Scan for local file headers (PK)
  let pos = 0;
  while (pos < buf.length - 30) {
    if (buf[pos]===0x50 && buf[pos+1]===0x4B && buf[pos+2]===0x03 && buf[pos+3]===0x04) {
      const compMethod   = buf.readUInt16LE(pos + 8);
      const compSize     = buf.readUInt32LE(pos + 18);
      const nameLen      = buf.readUInt16LE(pos + 26);
      const extraLen     = buf.readUInt16LE(pos + 28);
      const name         = buf.slice(pos + 30, pos + 30 + nameLen).toString('utf8');
      const dataStart    = pos + 30 + nameLen + extraLen;
      const dataEnd      = dataStart + compSize;

      if (name.endsWith('.json') && compSize > 0 && dataEnd <= buf.length) {
        const fileData = buf.slice(dataStart, dataEnd);
        // compMethod 0 = STORE (no compression), 8 = DEFLATE
        if (compMethod === 0) return fileData.toString('utf8');
        if (compMethod === 8) {
          try {
            const zlib = require('zlib');
            return zlib.inflateRawSync(fileData).toString('utf8');
          } catch(e) { return fileData.toString('utf8'); }
        }
      }
      pos = dataEnd > pos ? dataEnd : pos + 1;
    } else {
      pos++;
    }
  }
  return null;
}

