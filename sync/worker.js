import './safety.js';import '../reminder-history.js';import './core.js';
const C=globalThis.TGSyncCore,ORIGINS=new Set(['https://feature-v2-3-sync-foundation.tungcnc-congno.pages.dev','https://v23-b-tungcnc.pages.dev','https://v23-c-tungcnc.pages.dev']);
const enc=new TextEncoder(),hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
function unhex(s){if(typeof s!=='string'||!/^([a-f0-9]{2})+$/.test(s))throw Error('Signature invalid');return Uint8Array.from(s.match(/../g),x=>parseInt(x,16))}
export default {async fetch(request,env){const origin=request.headers.get('Origin'),url=new URL(request.url);const h={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'},out=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:h});if(!ORIGINS.has(origin))return out({error:'Origin not allowed'},403);Object.assign(h,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Device-Id, X-Time, X-Nonce, X-Signature'});if(request.method==='OPTIONS')return new Response(null,{status:204,headers:h});
try{
 const raw=await request.text();if(enc.encode(raw).length>1000000)return out({error:'Giao dịch vượt 1.000.000 byte; giữ nguyên hàng đợi, không chia nhỏ'},413);const now=Date.now();
 if(url.pathname==='/api/devices/register'&&request.method==='POST'){
 const p=JSON.parse(raw);if(typeof p.id!=='string'||!/^[a-f0-9-]{36}$/.test(p.id)||typeof p.label!=='string'||p.label.length>80||p.publicJwk?.kty!=='EC'||p.publicJwk?.crv!=='P-256'||p.publicJwk.d)return out({error:'Invalid device'},400);await crypto.subtle.importKey('jwk',p.publicJwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 const existing=await env.DB.prepare('SELECT public_jwk,origin,status FROM sync_devices WHERE id=?').bind(p.id).first();if(existing)return C.same(JSON.parse(existing.public_jwk),p.publicJwk)&&existing.origin===origin?out({id:p.id,status:existing.status}):out({error:'Device identity collision'},409);
 const bucket=await hash((request.headers.get('CF-Connecting-IP')||'unknown')+':'+Math.floor(now/3600000));const rate=await env.DB.prepare('INSERT INTO sync_rates(bucket,n) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET n=n+1 RETURNING n').bind(bucket).first();if(rate.n>12)return out({error:'Registration rate limited'},429);
 await env.DB.prepare("INSERT INTO sync_devices(id,public_jwk,origin,label,status,created_at) VALUES(?,?,?,?,'pending',?)").bind(p.id,JSON.stringify(p.publicJwk),origin,p.label,now).run();return out({id:p.id,status:'pending'},201);
 }
 const deviceId=request.headers.get('X-Device-Id'),time=request.headers.get('X-Time'),nonce=request.headers.get('X-Nonce'),sig=request.headers.get('X-Signature');
 if(!deviceId||!/^\d{13}$/.test(time||'')||Math.abs(now-Number(time))>120000||!/^([a-f0-9]{48})$/.test(nonce||''))return out({error:'Device authentication required'},401);
 const d=await env.DB.prepare('SELECT * FROM sync_devices WHERE id=? AND origin=?').bind(deviceId,origin).first();if(!d||d.status==='revoked')return out({error:'Device revoked or unknown'},401);
 const key=await crypto.subtle.importKey('jwk',JSON.parse(d.public_jwk),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);const message=[request.method,url.pathname+url.search,time,nonce,await hash(raw)].join('\n');if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,unhex(sig),enc.encode(message)))return out({error:'Invalid device signature'},401);
 const inserted=await env.DB.prepare('INSERT OR IGNORE INTO sync_nonces(device_id,nonce,at) VALUES(?,?,?)').bind(deviceId,nonce,now).run();if(!inserted.meta.changes)return out({error:'Replayed request'},401);
 if(url.pathname==='/api/device'&&request.method==='GET')return out({id:d.id,status:d.status});
 if(url.pathname==='/api/device/revoke'&&request.method==='POST'){await env.DB.prepare("UPDATE sync_devices SET status='revoked' WHERE id=?").bind(d.id).run();return out({status:'revoked'});}
 if(d.status!=='approved')return out({error:'Device awaits owner approval'},403);
 if(url.pathname==='/api/sync/snapshot'&&request.method==='GET'){const s=await env.DB.prepare('SELECT version,data,versions FROM sync_state WHERE id=1').first();return out({sequence:s.version,data:JSON.parse(s.data),versions:JSON.parse(s.versions)});}
 if(url.pathname==='/api/sync/status'&&request.method==='GET'){const s=await env.DB.prepare('SELECT version,data FROM sync_state WHERE id=1').first();return out({schemaVersion:1,sequence:s.version,summary:C.summary(JSON.parse(s.data))});}
 if(url.pathname==='/api/sync/pull'&&request.method==='GET'){
 const after=Number(url.searchParams.get('after')||0);if(!Number.isSafeInteger(after)||after<0)return out({error:'Invalid cursor'},400);const rows=await env.DB.prepare('SELECT sequence,body FROM sync_operations WHERE sequence>? ORDER BY sequence LIMIT 30').bind(after).all();return out({operations:rows.results.map(x=>({sequence:x.sequence,...JSON.parse(x.body)})),hasMore:rows.results.length===30});}
 if(url.pathname==='/api/sync/push'&&request.method==='POST'){
 const op=JSON.parse(raw);if(op.schemaVersion!==1||op.deviceId!==d.id||typeof op.operationId!=='string'||!/^[a-f0-9-]{36}$/.test(op.operationId)||!Array.isArray(op.changes)||!op.changes.length||op.changes.length>2000)return out({error:'Invalid operation'},400);const digest=await hash(C.canonical(op));
 const old=await env.DB.prepare('SELECT device_id,payload_hash,sequence FROM sync_operations WHERE operation_id=?').bind(op.operationId).first();if(old)return old.device_id===d.id&&old.payload_hash===digest?out({status:'duplicate',sequence:old.sequence}):out({error:'Operation ID collision'},409);
 for(let attempt=0;attempt<4;attempt++){
 const row=await env.DB.prepare('SELECT * FROM sync_state WHERE id=1').first(),state=JSON.parse(row.data),versions=JSON.parse(row.versions),seen=new Set();
 for(const c of op.changes){if(!C.kinds.includes(c.kind)||typeof c.id!=='string'||!c.id||c.id.length>250||!Number.isSafeInteger(c.baseVersion)||c.baseVersion<0||c.payload!==null&&(typeof c.payload!=='object'||Array.isArray(c.payload)||C.rid(c.payload)!==c.id))return out({error:'Invalid record'},400);const k=C.key(c.kind,c.id);if(seen.has(k))return out({error:'Duplicate record in transaction'},400);seen.add(k);if((versions[k]||0)!==c.baseVersion)return out({status:'conflict',error:'Record version conflict',sequence:row.version,record:{kind:c.kind,id:c.id,version:versions[k]||0,server:C.records(state)[k]??null,local:c.payload}},409);}
 let next;try{next=C.validate(C.apply(state,op.changes));}catch(e){return out({status:'conflict',error:e.message,summary:C.summary(state)},409);}for(const c of op.changes)versions[C.key(c.kind,c.id)]=(versions[C.key(c.kind,c.id)]||0)+1;
 const data=JSON.stringify(next);if(enc.encode(data).length>5000000)return out({error:'Snapshot vượt 5.000.000 byte; giữ nguyên dữ liệu và hàng đợi'},413);
 const saved={...op,changes:op.changes.map(c=>({...c,version:versions[C.key(c.kind,c.id)]}))};
 const result=await env.DB.batch([env.DB.prepare('UPDATE sync_state SET version=?,data=?,versions=?,last_op=? WHERE id=1 AND version=?').bind(row.version+1,data,JSON.stringify(versions),op.operationId,row.version),env.DB.prepare('INSERT INTO sync_operations(operation_id,device_id,payload_hash,sequence,body,at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sync_state WHERE id=1 AND version=? AND last_op=?)').bind(op.operationId,d.id,digest,row.version+1,JSON.stringify(saved),now,row.version+1,op.operationId)]);
 if(result[0].meta.changes)return out({status:'accepted',sequence:row.version+1},201);
 const concurrent=await env.DB.prepare('SELECT payload_hash,sequence FROM sync_operations WHERE operation_id=?').bind(op.operationId).first();if(concurrent)return concurrent.payload_hash===digest?out({status:'duplicate',sequence:concurrent.sequence}):out({error:'Operation ID collision'},409);
 }
 return out({error:'Concurrent write; retry same operation'},503);
 }
 return out({error:'Not found'},404);
}catch(e){return out({error:e instanceof SyntaxError?'Invalid JSON':'Request failed'},e instanceof SyntaxError?400:500);}
}};
