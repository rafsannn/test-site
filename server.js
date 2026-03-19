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

// ── Init ──────────────────────────────────────────────────────────────────────
function initData() {
  [DATADIR, path.join(PUBLIC,'images')].forEach(d=>{ if(!fs.existsSync(d)){fs.mkdirSync(d,{recursive:true});console.log('📁 Created:',d);} });
  if(!fs.existsSync(USERS_FILE)){
    const salt=crypto.randomBytes(16).toString('hex');
    const hash=crypto.createHmac('sha256',salt).update('admin123').digest('hex');
    writeJSON(USERS_FILE,[{username:'admin',salt,hash,role:'admin'}]);
    console.log('✅  Admin created  →  user: admin  |  pass: admin123');
  }
  if(!USE_SUPABASE && !fs.existsSync(LOCAL_PRODUCTS)){ writeJSON(LOCAL_PRODUCTS,defaultProducts()); console.log('✅  Demo products seeded'); }
  console.log(USE_SUPABASE   ? '🗄️   Supabase: CONNECTED (persistent)' : '⚠️   Supabase: NOT configured — using local JSON (data lost on redeploy!)');
  console.log(USE_CLOUDINARY ? '🖼️   Cloudinary: CONNECTED (persistent)' : '⚠️   Cloudinary: NOT configured — images saved locally (lost on redeploy!)');
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

function defaultProducts(){return[
  {id:1,name:"Charging Portable Mini Fan - Bear Edition",short_name:"Mini USB Portable Fan",category:"Mini Fans",category_slug:"fans",price:650,old_price:850,rating:4.8,sold:9400,badge:"hot",image:"images/product-fan.jpg",images:["images/product-fan.jpg"],description:"Stay cool anywhere with this adorable bear-themed portable fan.",specs:[{label:"Type",value:"USB Rechargeable"}],created_at:new Date().toISOString()},
  {id:2,name:"20000mAh Power Bank Fast Charging with Built-in Cables",short_name:"20000mAh Power Bank",category:"Power Banks",category_slug:"powerbanks",price:1250,old_price:1600,rating:4.9,sold:2900,badge:"new",image:"images/product-powerbank.jpg",images:["images/product-powerbank.jpg"],description:"20000mAh large capacity power bank with 20W fast charging.",specs:[{label:"Capacity",value:"20000mAh"}],created_at:new Date().toISOString()},
  {id:3,name:"Luminous Waterproof Men's Watch - Black Edition",short_name:"Men's Stainless Steel Watch",category:"Watches",category_slug:"watches",price:1850,old_price:2400,rating:5.0,sold:951,badge:"sale",image:"images/product-watch.jpg",images:["images/product-watch.jpg"],description:"Stainless steel waterproof watch with luminous hands.",specs:[{label:"Material",value:"Stainless Steel"}],created_at:new Date().toISOString()},
  {id:4,name:"Y10 Bluetooth Neckband Wireless Sports Earphone",short_name:"Neckband Bluetooth Earphones",category:"Headphones",category_slug:"headphones",price:890,old_price:1100,rating:5.0,sold:2800,badge:"hot",image:"images/product-headphones.jpg",images:["images/product-headphones.jpg"],description:"Sports neckband with ultra-long battery and noise reduction.",specs:[{label:"Battery",value:"500mAh"}],created_at:new Date().toISOString()},
  {id:5,name:"Clip-On Rechargeable LED Study Lamp",short_name:"Clip-On LED Study Lamp",category:"LED Lamps",category_slug:"lamps",price:720,old_price:950,rating:4.7,sold:10900,badge:"hot",image:"images/product-lamp.jpg",images:["images/product-lamp.jpg"],description:"Eye-care clip-on LED lamp with 4000K natural light.",specs:[{label:"Color Temp",value:"4000K"}],created_at:new Date().toISOString()},
  {id:6,name:"Human Body Sensor Night Light - Magnetic Rechargeable",short_name:"Motion Sensor Night Light",category:"LED Lamps",category_slug:"lamps",price:480,old_price:650,rating:4.3,sold:26600,badge:"hot",image:"images/product-lamp.jpg",images:["images/product-lamp.jpg"],description:"Smart wireless PIR night light with magnetic mount.",specs:[{label:"Sensor",value:"PIR Human Body"}],created_at:new Date().toISOString()}
];}
