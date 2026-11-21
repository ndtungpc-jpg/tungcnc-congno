// Staging-only asynchronous inbox. Device approval is performed by the account owner in D1.
const ORIGINS=new Set(['https://feature-v2-3-sync-foundation.baogia-tungcnc.pages.dev','https://feature-v2-3-sync-foundation.tungcnc-congno.pages.dev','https://feature-quote-inbox-async-20.baogia-tungcnc.pages.dev','https://feature-quote-inbox-async-20.tungcnc-congno.pages.dev']);
const enc=new TextEncoder();
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const digest=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(v))),b=>b.toString(16).padStart(2,'0')).join('');
const validId=v=>typeof v==='string'&&/^tgq-v1-[a-f0-9]{64}$/.test(v);
function validate(p){
 if(p?.format!=='tungcnc-quote-to-debt'||p.schemaVersion!==1||!validId(p.transferId)||!p.customer?.name?.trim()||!p.source?.quoteCode?.trim()||!/^\d{4}-\d\d-\d\d$/.test(p.source.quoteDate)||!Array.isArray(p.items)||!p.items.length||p.items.length>300)throw Error('Invalid quote');
 const num=v=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>Number.MAX_SAFE_INTEGER)throw Error('Invalid number');return v};
 const close=(a,b)=>Math.abs(a-b)<=0.01+Number.EPSILON*Math.max(a,b)*8;
 let subtotal=0;for(const x of p.items){if(typeof x.name!=='string'||!x.name.trim()||!['m2','meter','frame','set','piece','manual'].includes(x.type)||!Array.isArray(x.sizes)||!x.sizes.length||x.sizes.length>1000)throw Error('Invalid item');for(const s of x.sizes){num(s.count);for(const k of ['widthMm','heightMm'])if(s[k]!==''&&s[k]!=null)num(Number(s[k]));}num(x.quantity);num(x.unitPrice);num(x.amount);const qty=x.sizes.reduce((a,z)=>a+(x.type==='m2'?Number(z.widthMm)*Number(z.heightMm)/1e6*z.count:x.type==='meter'?Number(z.widthMm)/1000*z.count:z.count),0);if(!close(qty,x.quantity))throw Error('Quantity mismatch');if(!close(x.quantity*x.unitPrice,x.amount))throw Error('Item total mismatch');subtotal+=x.amount;}
 const t=p.totals;for(const k of ['subtotal','discount','shipping','vatPercent','vatAmount','grandTotal'])num(t?.[k]);const base=t.subtotal-t.discount+t.shipping;if(t.discount>t.subtotal||t.vatPercent>100||!close(subtotal,t.subtotal)||!close(base*t.vatPercent/100,t.vatAmount)||!close(base+t.vatAmount,t.grandTotal)||p.payment?.paid>0)throw Error('Total mismatch');
}
export default {async fetch(request,env){
 const origin=request.headers.get('Origin');const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 const out=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers});
 if(!ORIGINS.has(origin))return out({error:'Origin not allowed'},403);
 Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, PATCH, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(!env.DB)return out({error:'Server not configured'},503);
 const url=new URL(request.url),path=url.pathname;const now=Date.now();
 async function body(){const raw=await request.text();if(enc.encode(raw).length>250000)throw Object.assign(Error('Payload too large'),{status:413});return JSON.parse(raw);}
 try{
 if(path==='/api/devices/register'&&request.method==='POST'){
  const p=await body();if(!/^[a-f0-9]{64}$/.test(p.token||'')||typeof p.label!=='string'||p.label.length>80)return out({error:'Invalid enrollment'},400);
  const hash=await digest(p.token),existing=await env.DB.prepare('SELECT id,status FROM inbox_devices WHERE token_hash=? AND origin=?').bind(hash,origin).first();if(existing)return out(existing);
  const bucket=await digest((request.headers.get('CF-Connecting-IP')||'unknown')+':'+Math.floor(now/3600000));const rate=await env.DB.prepare('INSERT INTO inbox_rates(bucket,n) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET n=n+1 RETURNING n').bind(bucket).first();if(rate.n>12)return out({error:'Enrollment rate limited'},429);
  const id=crypto.randomUUID(),role=origin.includes('.baogia-tungcnc.')?'sender':'receiver';
  await env.DB.prepare("INSERT INTO inbox_devices(id,token_hash,label,origin,role,status,expires_at) VALUES(?,?,?,?,?,'pending',?)").bind(id,hash,p.label,origin,role,now+90*86400000).run();return out({id,status:'pending'},201);
 }
 const bearer=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');if(!/^[a-f0-9]{64}$/.test(bearer))return out({error:'Device authentication required'},401);
 const device=await env.DB.prepare('SELECT id,status,role,expires_at FROM inbox_devices WHERE token_hash=? AND origin=?').bind(await digest(bearer),origin).first();
 if(!device||device.status==='revoked'||device.expires_at<=now)return out({error:'Device revoked or expired'},401);
 if(path==='/api/device'&&request.method==='GET')return out({id:device.id,status:device.status,role:device.role,expiresAt:device.expires_at});
 if(path==='/api/device/revoke'&&request.method==='POST'){await env.DB.prepare("UPDATE inbox_devices SET status='revoked' WHERE id=?").bind(device.id).run();return out({status:'revoked'});}
 if(device.status!=='approved')return out({error:'Device awaits owner approval'},403);
 const receiver=device.role==='receiver';
 if(path==='/api/quotes'&&request.method==='GET'){
  if(!receiver)return out({error:'Receiver permission required'},403);const rows=await env.DB.prepare("SELECT q.*,c.device_id AS claimed_device FROM quote_inbox q LEFT JOIN inbox_claims c ON c.quote_id=q.id WHERE q.status='pending' ORDER BY q.created_at DESC LIMIT 200").all();return out({quotes:rows.results.map(r=>({id:r.id,payload:JSON.parse(r.payload),status:r.status,claimedByMe:r.claimed_device===device.id,claimed:!!r.claimed_device,created_at:r.created_at}))});
 }
 if(path==='/api/quotes'&&request.method==='POST'){
  if(receiver)return out({error:'Sender permission required'},403);const p=await body();validate(p);const fingerprint=await digest(canonical({source:p.source,customer:p.customer,items:p.items,totals:p.totals,note:p.note||''}));if(p.transferId!=='tgq-v1-'+fingerprint)return out({error:'Quote integrity mismatch'},400);
  const r=await env.DB.prepare('INSERT OR IGNORE INTO quote_inbox(id,payload,fingerprint) VALUES(?,?,?)').bind(p.transferId,JSON.stringify(p),fingerprint).run();const saved=await env.DB.prepare('SELECT status FROM quote_inbox WHERE id=?').bind(p.transferId).first();return out({id:p.transferId,status:saved.status,duplicate:r.meta.changes===0},r.meta.changes?201:200);
 }
 const match=path.match(/^\/api\/quotes\/(tgq-v1-[a-f0-9]{64})(\/claim)?$/);
 if(match){if(!receiver)return out({error:'Receiver permission required'},403);const q=await env.DB.prepare('SELECT status,payload FROM quote_inbox WHERE id=?').bind(match[1]).first();if(!q)return out({error:'Not found'},404);
 if(match[2]&&request.method==='POST'){
  if(q.status!=='pending')return out({error:'Quote already finalized'},409);const p=JSON.parse(q.payload);const key=String(p.source.quoteCode).normalize('NFC').trim().toLocaleLowerCase('vi');
  await env.DB.prepare("INSERT OR IGNORE INTO inbox_claims(quote_id,quote_key,device_id) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM quote_inbox WHERE id=? AND status='pending')").bind(match[1],key,device.id,match[1]).run();const claim=await env.DB.prepare('SELECT device_id FROM inbox_claims WHERE quote_id=?').bind(match[1]).first();if(claim?.device_id!==device.id)return out({error:'Quote/code claimed elsewhere; reconcile original device, do not reimport'},409);return out({id:match[1],claimed:true});
 }
 if(!match[2]&&request.method==='PATCH'){
  const p=await body();if(!['imported','dismissed'].includes(p.status))return out({error:'Invalid status'},400);if(q.status!== 'pending')return q.status===p.status?out({id:match[1],status:q.status,duplicate:true}):out({error:'Conflicting status'},409);
  if(p.status==='imported'&&(typeof p.orderId!=='string'||!p.orderId||p.orderId.length>200))return out({error:'Order receipt required'},400);
  const claim=await env.DB.prepare('SELECT device_id FROM inbox_claims WHERE quote_id=?').bind(match[1]).first();if((p.status==='imported'&&!claim)||claim&&claim.device_id!==device.id)return out({error:'Quote claimed elsewhere'},409);
  // Atomic conditional update: a concurrent claim cannot be dismissed by another device.
  const r=await env.DB.prepare("UPDATE quote_inbox SET status=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status='pending' AND NOT EXISTS(SELECT 1 FROM inbox_claims WHERE quote_id=? AND device_id<>?)").bind(p.status,match[1],match[1],device.id).run();if(!r.meta.changes)return out({error:'Concurrent status conflict'},409);return out({id:match[1],status:p.status});
 }
 }
 return out({error:'Not found'},404);
 }catch(e){return out({error:e instanceof SyntaxError?'Invalid JSON':e.status?e.message:'Request rejected'},e.status||((e instanceof SyntaxError||/Invalid|mismatch/.test(e.message))?400:500));}
}};
