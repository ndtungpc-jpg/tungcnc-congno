// Quote inbox API: dedicated D1 database, no mutation of accounting IndexedDB.
// Required bindings: DB (D1), INBOX_PASSWORD_SHA256 (secret), SESSION_SIGNING_KEY (secret).
const ORIGINS = new Set(['https://baogia-tungcnc.pages.dev','https://tungcnc-congno.pages.dev']);
const enc = new TextEncoder();
function hex(bytes){return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function digest(value){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))));}
function b64(bytes){return btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\\+/g,'-').replace(/\\//g,'_');}
async function sign(body,key){const k=await crypto.subtle.importKey('raw',enc.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(body))));}
async function token(key){const body=b64(enc.encode(JSON.stringify({exp:Date.now()+12*3600_000,scope:'inbox'})));return body+'.'+await sign(body,key);}
async function validToken(value,key){if(!value||!key)return false;const [body,signature,...rest]=value.split('.');if(!body||!signature||rest.length)return false;const expected=await sign(body,key);if(signature.length!==expected.length)return false;let mismatch=0;for(let i=0;i<signature.length;i++)mismatch|=signature.charCodeAt(i)^expected.charCodeAt(i);if(mismatch)return false;try{const json=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.replace(/-/g,'+').replace(/_/g,'/')),x=>x.charCodeAt(0))));return json.scope==='inbox'&&Number.isFinite(json.exp)&&json.exp>Date.now();}catch{return false;}}
function response(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});}
export default {async fetch(request,env){
 const origin=request.headers.get('Origin');if(!ORIGINS.has(origin))return response({error:'Origin not allowed'},403);
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, PATCH, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Vary':'Origin'};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 const out=(data,status=200)=>response(data,status,headers);
 if(!env.DB||!env.INBOX_PASSWORD_SHA256||!env.SESSION_SIGNING_KEY)return out({error:'Server not configured'},503);
 const url=new URL(request.url),path=url.pathname;
 try{
  if(path==='/api/session'&&request.method==='POST'){
   const body=await request.json();if(typeof body.password!=='string'||body.password.length>256)return out({error:'Invalid credentials'},401);
   const hash=await digest(body.password);const expected=env.INBOX_PASSWORD_SHA256.toLowerCase();if(hash.length!==expected.length)return out({error:'Invalid credentials'},401);
   let diff=0;for(let i=0;i<hash.length;i++)diff|=hash.charCodeAt(i)^expected.charCodeAt(i);
   return diff?out({error:'Invalid credentials'},401):out({token:await token(env.SESSION_SIGNING_KEY),expiresIn:43200});
  }
  if(!await validToken((request.headers.get('Authorization')||'').replace(/^Bearer /i,''),env.SESSION_SIGNING_KEY))return out({error:'Unauthorized'},401);
  if(path==='/api/quotes'&&request.method==='GET'){
   const status=url.searchParams.get('status')||'pending';if(!['pending','imported','dismissed'].includes(status))return out({error:'Invalid status'},400);
   const rows=await env.DB.prepare('SELECT id,payload,status,created_at,updated_at FROM quote_inbox WHERE status=? ORDER BY created_at DESC LIMIT 200').bind(status).all();
   return out({quotes:rows.results.map(r=>({...r,payload:JSON.parse(r.payload)}))});
  }
  if(path==='/api/quotes'&&request.method==='POST'){
   if(Number(request.headers.get('Content-Length')||0)>250000)return out({error:'Payload too large'},413);
   const raw=await request.text();if(raw.length>250000)return out({error:'Payload too large'},413);
   const payload=JSON.parse(raw);const id=payload?.transferId;
   if(typeof id!=='string'||!/^tgq-v1-[a-f0-9]{64}$/.test(id)||!Array.isArray(payload.items)||payload.items.length>500)return out({error:'Invalid quote'},400);
   const fingerprint=await digest(raw);
   const inserted=await env.DB.prepare('INSERT OR IGNORE INTO quote_inbox(id,payload,fingerprint) VALUES(?,?,?)').bind(id,raw,fingerprint).run();
   if(inserted.meta.changes===0){const existing=await env.DB.prepare('SELECT fingerprint,status FROM quote_inbox WHERE id=?').bind(id).first();if(existing.fingerprint!==fingerprint)return out({error:'Transfer ID collision'},409);return out({id,status:existing.status,duplicate:true});}
   return out({id,status:'pending',duplicate:false},201);
  }
  const match=path.match(/^\\/api\\/quotes\\/(tgq-v1-[a-f0-9]{64})$/);
  if(match&&request.method==='PATCH'){
   const body=await request.json();if(!['imported','dismissed'].includes(body.status))return out({error:'Invalid status'},400);
   const result=await env.DB.prepare("UPDATE quote_inbox SET status=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status='pending'").bind(body.status,match[1]).run();
   return result.meta.changes?out({id:match[1],status:body.status}):out({error:'Not pending or not found'},409);
  }
  return out({error:'Not found'},404);
 }catch(e){return out({error:e instanceof SyntaxError?'Invalid JSON':'Request failed'},e instanceof SyntaxError?400:500);}
}};
