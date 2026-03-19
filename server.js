/**
 * ZENOCART - Backend Server
 * Pure Node.js — zero npm dependencies
 * Database: Supabase (PostgreSQL via REST API)
 * Images:   Cloudinary (via REST API)
 * Run: node server.js
 */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const https  = require('https');
const { URL } = require('url');

const PORT    = process.env.PORT || 3000;
const PUBLIC  = path.join(__dirname, 'public');
const DATADIR = path.join(__dirname, 'data');

// ── Env config (set on Railway dashboard) ────────────────────────────────────
const SUPABASE_URL    = (process.env.SUPABASE_URL    || '').replace(/\/$/, '');
const SUPABASE_KEY    = process.env.SUPABASE_ANON_KEY || '';
const CLOUD_NAME      = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUD_KEY       = process.env.CLOUDINARY_API_KEY    || '';
const CLOUD_SECRET    = process.env.CLOUDINARY_API_SECRET || '';

const USE_SUPABASE    = !!(SUPABASE_URL && SUPABASE_KEY);
const USE_CLOUDINARY  = !!(CLOUD_NAME && CLOUD_KEY && CLOUD_SECRET);
const LOCAL_PRODUCTS  = path.join(DATADIR, 'products.json');
const USERS_FILE      = path.join(DATADIR, 'users.json');

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

// ── Tiny HTTP fetch (no npm) ───────────────────────────────────────────────────
function fetchJSON(urlStr, opts = {}) {
  return new Promise((resolve, reject) => {
    const u    = new URL(urlStr);
    const lib  = u.protocol === 'https:' ? https : require('http');
    const body = opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : null;
    const ro   = {
      hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + (u.search || ''), method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    };
    if (body) ro.headers['Content-Length'] = Buffer.byteLength(body);
    const req = lib.request(ro, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const txt = Buffer.concat(chunks).toString();
        try { resolve({ ok: res.statusCode < 300, status: res.statusCode, data: JSON.parse(txt) }); }
        catch { resolve({ ok: res.statusCode < 300, status: res.statusCode, data: txt }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Supabase REST helpers ─────────────────────────────────────────────────────
const SB = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' });

async function sbList(filters) {
  let url = `${SUPABASE_URL}/rest/v1/products?order=id.asc`;
  if (filters.category) url += `&category_slug=eq.${encodeURIComponent(filters.category)}`;
  if (filters.q) url += `&name=ilike.*${encodeURIComponent(filters.q)}*`;
  const r = await fetchJSON(url, { headers: SB() });
  if (!r.ok) throw new Error('Supabase list error: ' + JSON.stringify(r.data));
  let list = r.data || [];
  if (filters.sort === 'price-low')  list = list.sort((a,b) => a.price - b.price);
  if (filters.sort === 'price-high') list = list.sort((a,b) => b.price - a.price);
  if (filters.sort === 'rating')     list = list.sort((a,b) => b.rating - a.rating);
  if (filters.sort === 'sold')       list = list.sort((a,b) => b.sold - a.sold);
  return list;
}
async function sbGet(id) {
  const r = await fetchJSON(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, { headers: SB() });
  return (r.ok && r.data?.length) ? r.data[0] : null;
}
async function sbCreate(p) {
  const r = await fetchJSON(`${SUPABASE_URL}/rest/v1/products`, { method:'POST', headers:SB(), body:JSON.stringify(p) });
  if (!r.ok) throw new Error('Supabase create error: ' + JSON.stringify(r.data));
  return Array.isArray(r.data) ? r.data[0] : r.data;
}
async function sbUpdate(id, p) {
  const r = await fetchJSON(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, { method:'PATCH', headers:SB(), body:JSON.stringify(p) });
  if (!r.ok) throw new Error('Supabase update error: ' + JSON.stringify(r.data));
  return Array.isArray(r.data) ? r.data[0] : r.data;
}
async function sbDelete(id) {
  const r = await fetchJSON(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, { method:'DELETE', headers:SB() });
  return r.ok;
}

// ── Local JSON fallback ───────────────────────────────────────────────────────
function readJSON(file, fb) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fb; } }
function writeJSON(file, d) {
  try { const dir = path.dirname(file); if (!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(file, JSON.stringify(d,null,2)); }
  catch(e) { console.error('writeJSON:', e.message); }
}

// ── Unified data layer ────────────────────────────────────────────────────────
async function getProducts(f={}) {
  if (USE_SUPABASE) return sbList(f);
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
  if (USE_SUPABASE) return sbGet(id);
  return readJSON(LOCAL_PRODUCTS,[]).find(p=>p.id===id)||null;
}
async function createProduct(p) {
  if (USE_SUPABASE) return sbCreate(p);
  const list=readJSON(LOCAL_PRODUCTS,[]); const maxId=list.reduce((m,x)=>Math.max(m,x.id||0),0);
  const np={...p,id:maxId+1}; list.push(np); writeJSON(LOCAL_PRODUCTS,list); return np;
}
async function updateProduct(id,p) {
  if (USE_SUPABASE) return sbUpdate(id,p);
  const list=readJSON(LOCAL_PRODUCTS,[]); const i=list.findIndex(x=>x.id===id);
  if(i===-1)return null; list[i]={...list[i],...p}; writeJSON(LOCAL_PRODUCTS,list); return list[i];
}
async function deleteProduct(id) {
  if (USE_SUPABASE) return sbDelete(id);
  const list=readJSON(LOCAL_PRODUCTS,[]); if(!list.find(p=>p.id===id))return false;
  writeJSON(LOCAL_PRODUCTS,list.filter(p=>p.id!==id)); return true;
}

// ── Cloudinary upload ─────────────────────────────────────────────────────────
async function uploadImage(buf, fileName) {
  if (!USE_CLOUDINARY) {
    const fname = `product_${Date.now()}${path.extname(fileName)||'.jpg'}`;
    fs.writeFileSync(path.join(PUBLIC,'images',fname), buf);
    return `images/${fname}`;
  }
  const ts  = Math.floor(Date.now()/1000).toString();
  const sig = crypto.createHash('sha1').update(`folder=zenocart&timestamp=${ts}${CLOUD_SECRET}`).digest('hex');
  const boundary = '----ZC' + crypto.randomBytes(8).toString('hex');
  const addField = (n,v) => `--${boundary}\r\nContent-Disposition: form-data; name="${n}"\r\n\r\n${v}\r\n`;
  const textParts = Buffer.from([
    addField('timestamp',ts), addField('api_key',CLOUD_KEY),
    addField('signature',sig), addField('folder','zenocart')
  ].join(''), 'utf8');
  const filePart  = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`, 'utf8');
  const body      = Buffer.concat([textParts, filePart, buf, Buffer.from(`\r\n--${boundary}--`, 'utf8')]);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname:'api.cloudinary.com', port:443, method:'POST',
      path:`/v1_1/${CLOUD_NAME}/image/upload`,
      headers:{'Content-Type':`multipart/form-data; boundary=${boundary}`,'Content-Length':body.length}
    }, res => {
      const chunks=[];
      res.on('data',c=>chunks.push(c));
      res.on('end',()=>{ try{const d=JSON.parse(Buffer.concat(chunks).toString()); d.secure_url?resolve(d.secure_url):reject(new Error(d.error?.message||'Cloudinary failed'));}catch(e){reject(e);} });
    });
    req.on('error',reject); req.write(body); req.end();
  });
}

// ── Multipart parser ──────────────────────────────────────────────────────────
function parseMultipart(buf, boundary) {
  const fields={}; let fileBuffer=null, fileName='';
  for (const part of buf.toString('binary').split('--'+boundary)) {
    if (!part.includes('Content-Disposition')) continue;
    const [hdrs,...rest] = part.split('\r\n\r\n');
    const body = rest.join('\r\n\r\n').replace(/\r\n$/,'');
    const nm = hdrs.match(/name="([^"]+)"/), fm = hdrs.match(/filename="([^"]+)"/);
    if (!nm) continue;
    if (fm) { fileName=fm[1]; fileBuffer=Buffer.from(body,'binary'); }
    else fields[nm[1]]=body;
  }
  return {fields,fileBuffer,fileName};
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
function buildProduct(fields, imagePath, existing={}) {
  let specs=existing.specs||[];
  try{ if(fields.specs) specs=JSON.parse(fields.specs); }catch{}
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
    description:   fields.description || existing.description || '',
    image:         imagePath           || existing.image || 'images/product-fan.jpg',
    images:        JSON.stringify([imagePath || existing.image || 'images/product-fan.jpg']),
    specs:         USE_SUPABASE ? JSON.stringify(specs) : specs,
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
  if(!USE_SUPABASE && !fs.existsSync(LOCAL_PRODUCTS)){ writeJSON(LOCAL_PRODUCTS,[]); }
  if(!fs.existsSync(CATEGORIES_FILE)){ writeJSON(CATEGORIES_FILE,DEFAULT_CATS); }
  if(!fs.existsSync(DELIVERY_FILE)){ writeJSON(DELIVERY_FILE,DEFAULT_DELIVERY); }
  if(!fs.existsSync(ORDERS_FILE)){ writeJSON(ORDERS_FILE,[]); }
  console.log(USE_SUPABASE ? 'Supabase: connected' : 'Supabase: local fallback');
  console.log(USE_CLOUDINARY ? 'Cloudinary: connected' : 'Cloudinary: local fallback');
}

// ── Router ────────────────────────────────────────────────────────────────────
const srv = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const u=new URL(req.url,`http://localhost:${PORT}`), pn=u.pathname, mt=req.method;

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
    return respond(res,200,{supabase:USE_SUPABASE,cloudinary:USE_CLOUDINARY,mode:USE_SUPABASE?'persistent':'local'});
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
    const {fields,fileBuffer,fileName}=parseMultipart(await readBody(req),bm[1]);
    let img=fields.existingImage||'images/product-fan.jpg';
    if(fileBuffer&&fileName&&fileBuffer.length>100){ try{img=await uploadImage(fileBuffer,fileName);}catch(e){console.error('Upload error:',e.message);} }
    try{
      const p=buildProduct(fields,img); p.created_at=new Date().toISOString();
      return respond(res,201,await createProduct(p));
    }catch(e){console.error(e);return respond(res,500,{error:e.message});}
  }

  if(pn.match(/^\/api\/admin\/products\/\d+$/) && mt==='PUT'){
    if(!requireAuth(req,res))return;
    const id=parseInt(pn.split('/')[4]); const ct=req.headers['content-type']||'';
    let fields={},fileBuffer=null,fileName='';
    if(ct.includes('multipart')){const bm=ct.match(/boundary=(.+)/);({fields,fileBuffer,fileName}=parseMultipart(await readBody(req),bm[1]));}
    else{fields=JSON.parse((await readBody(req)).toString()||'{}');}
    const existing=await getProduct(id); if(!existing)return respond(res,404,{error:'Not found'});
    let img=existing.image;
    if(fileBuffer&&fileName&&fileBuffer.length>100){try{img=await uploadImage(fileBuffer,fileName);}catch(e){console.error('Upload error:',e.message);}}
    try{return respond(res,200,await updateProduct(id,buildProduct(fields,img,existing))||existing);}
    catch(e){console.error(e);return respond(res,500,{error:e.message});}
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
  // GET /api/admin/backup — download a full backup as a single JSON file
  if(pn==='/api/admin/backup' && mt==='GET'){
    if(!requireAuth(req,res))return;
    try{
      const backup = {
        version: '1.0',
        created_at: new Date().toISOString(),
        products:   readJSON(LOCAL_PRODUCTS,   []),
        categories: readJSON(CATEGORIES_FILE,  DEFAULT_CATS),
        delivery:   readJSON(DELIVERY_FILE,    DEFAULT_DELIVERY),
        orders:     readJSON(ORDERS_FILE,      [])
      };
      const json = JSON.stringify(backup, null, 2);
      const buf  = Buffer.from(json, 'utf8');
      // Build a minimal ZIP in pure Node.js (no npm)
      const zipBuf = buildZip([{ name: 'zenocart-backup.json', data: buf }]);
      const filename = 'zenocart-backup-' + new Date().toISOString().slice(0,10) + '.zip';
      res.writeHead(200, {
        'Content-Type':        'application/zip',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
        'Content-Length':       zipBuf.length
      });
      return res.end(zipBuf);
    } catch(e){ console.error('Backup error:', e); return respond(res, 500, {error: e.message}); }
  }

  // POST /api/admin/restore — upload a backup ZIP and restore all data
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

      let jsonStr = '';
      // If it's a ZIP, extract the first .json file inside
      if(fileName.endsWith('.zip') || fileBuffer[0]===0x50 && fileBuffer[1]===0x4B){
        jsonStr = extractFirstJsonFromZip(fileBuffer);
        if(!jsonStr) return respond(res, 400, {error: 'No JSON found inside ZIP'});
      } else {
        // Raw JSON file
        jsonStr = fileBuffer.toString('utf8');
      }

      let backup;
      try{ backup = JSON.parse(jsonStr); }
      catch(e){ return respond(res, 400, {error: 'Invalid JSON in backup file'}); }

      if(!backup.version) return respond(res, 400, {error: 'Not a valid Zenocart backup file'});

      // Ensure data dir exists
      if(!fs.existsSync(DATADIR)) fs.mkdirSync(DATADIR, {recursive: true});

      // Restore each data store
      let restored = [];
      if(Array.isArray(backup.products)){ writeJSON(LOCAL_PRODUCTS, backup.products); restored.push(backup.products.length + ' products'); }
      if(Array.isArray(backup.categories)){ writeJSON(CATEGORIES_FILE, backup.categories); restored.push(backup.categories.length + ' categories'); }
      if(Array.isArray(backup.delivery)){ writeJSON(DELIVERY_FILE, backup.delivery); restored.push(backup.delivery.length + ' delivery areas'); }
      if(Array.isArray(backup.orders)){ writeJSON(ORDERS_FILE, backup.orders); restored.push(backup.orders.length + ' orders'); }

      return respond(res, 200, {
        ok: true,
        message: 'Restore successful! Restored: ' + restored.join(', '),
        backup_date: backup.created_at || 'unknown',
        restored
      });
    } catch(e){ console.error('Restore error:', e); return respond(res, 500, {error: e.message}); }
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

