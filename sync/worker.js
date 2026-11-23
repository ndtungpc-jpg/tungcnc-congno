import './safety.js';import '../reminder-history.js';import './core.js';import './pairing.js';
const C=globalThis.TGSyncCore,ORIGINS=new Set(["https://tungcnc-congno.pages.dev"]);
const enc=new TextEncoder(),hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
// Initial bootstrap only, isolated D1, no partial business state or chunk uploads.
async function limitedRequest(request){if(!request.body)return '';const reader=request.body.getReader(),parts=[];let n=0;try{for(;;){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>1000000){reader.cancel().catch(()=>{});throw Object.assign(Error('Giao dịch vượt 1.000.000 byte; giữ nguyên hàng đợi'),{status:413});}parts.push(value);}}finally{reader.releaseLock();}const all=new Uint8Array(n);let at=0;for(const p of parts){all.set(p,at);at+=p.length;}return new TextDecoder('utf-8',{fatal:true}).decode(all);}
async function unpackInitial(base64){
 if(typeof base64!=='string'||base64.length>800000||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))throw Error('Snapshot nén không hợp lệ hoặc quá lớn');
 const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();let n=0;const parts=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>1900000){reader.cancel().catch(()=>{});throw Error('Snapshot giải nén vượt giới hạn an toàn dòng D1 1.900.000 byte');}parts.push(value);}}finally{reader.releaseLock();}
 const all=new Uint8Array(n);let at=0;for(const p of parts){all.set(p,at);at+=p.length;}return new TextDecoder('utf-8',{fatal:true}).decode(all);
}
// Request-local structural sharing: validate() reads only, and no reference escapes the request.
// Keep full validation and the existing snapshot+receipt CAS transaction.
function applyServer(state,changes){
 const next={...state},groups=new Map();
 for(const c of changes){const list=groups.get(c.kind)||[];list.push(c);groups.set(c.kind,list);}
 for(const [kind,list]of groups){const ids=new Set(list.map(c=>c.id));next[kind]=(state[kind]||[]).filter(r=>!ids.has(C.rid(r)));for(const c of list)if(c.payload!==null)next[kind].push(c.payload);}
 return next;
}
function summaryServer(s){
 const result={customers:0,suppliers:0,orders:s.orders.length,payments:s.payments.length,receivable:0,payable:0,received:0,disbursed:0},partners=new Map(s.partners.map(x=>[x.id,x])),paid=new Map();
 // Preserve payment order within each order and order order in the final sums (no reassociation).
 for(const p of s.payments)paid.set(p.orderId,(paid.get(p.orderId)||0)+p.amount);
 for(const p of s.partners)result[p.type==='customer'?'customers':'suppliers']++;
 for(const o of s.orders){const n=paid.get(o.id)||0,customer=partners.get(o.partnerId)?.type==='customer';result[customer?'received':'disbursed']+=n;if(!o.cancelled)result[customer?'receivable':'payable']+=o.amount-n;}
 return result;
}
// Project only fields read by validators. Unchanged rows were validated on entry;
// changed payloads remain complete and undergo all existing validators together.
const VALIDATION_FIELDS={partners:['id','type','name'],orders:['id','partnerId','amount','code','cancelled','quoteTransferId','quoteDirectFingerprint','quoteSourceCode'],payments:['id','orderId','amount','date','method','paymentGroupId','paymentGroupSize'],audit:['id','at','action'],excelImports:['id','sha256']};
const jsonValue=(value,path)=>`json(${value} -> '${path}')`;
const objectFields=(value,fields)=>`json((SELECT json_group_object(f.key,json(${value} -> ('$.'||f.key))) FROM json_each(${value}) f WHERE f.key IN (${fields.map(k=>"'"+k+"'").join(',')})))`;
function validationSql(){
 const args=["'schemaVersion'","2","'revision'","0","'recovery'","json('[]')"];
 for(const kind of C.kinds){let expr;
  if(['audit','trash','excelImports'].includes(kind))expr="'[]'"; // Independent unchanged history has no business cross-references; new payloads are validated in full.
  else if(VALIDATION_FIELDS[kind])expr=`(SELECT json_group_array(${objectFields('r.value',VALIDATION_FIELDS[kind])}) FROM json_each(data,'$.${kind}') r)`;
  else if(kind==='trash')expr=`(SELECT json_group_array(json_object('id',${jsonValue('r.value','$.id')},'kind',${jsonValue('r.value','$.kind')},'deletedAt',${jsonValue('r.value','$.deletedAt')},'record',${objectFields("(r.value -> '$.record')",['id','type','name','amount'])})) FROM json_each(data,'$.trash') r)`;
  else expr=`COALESCE(data -> '$.${kind}','[]')`;
  args.push(`'${kind}'`,`json(${expr})`);
 }
 return `SELECT version,(SELECT json_group_object(v.key,v.value) FROM json_each(versions) v WHERE v.key IN (SELECT value FROM json_each(?))) AS versions,json_type(data,'$.partners')='array' AND json_type(data,'$.orders')='array' AND json_type(data,'$.payments')='array' AND json_type(data,'$.audit')='array' AND json_type(data,'$.trash')='array' AND json_type(data,'$.recovery')='array' AS valid_shape,json_object(${args.join(',')}) AS validation FROM sync_state WHERE id=1`;
}
const VALIDATION_SQL=validationSql();
const sqlRecordId=value=>`CASE WHEN json_type(${value},'$.id')='text' AND length(json_extract(${value},'$.id'))>0 THEN json_extract(${value},'$.id') ELSE json_extract(${value},'$.sha256') END`;
function deltaSql(kinds,appendChanges=null){
 const args=[];
 for(const kind of kinds){const rebuilt=`(SELECT json_group_array(json(value)) FROM (
 SELECT r.value AS value,0 AS branch,CAST(r.key AS INTEGER) AS position FROM json_each(s.data,'$.${kind}') r
 WHERE ${sqlRecordId('r.value')} NOT IN (SELECT json_extract(c.value,'$.id') FROM json_each(input.op,'$.changes') c WHERE json_extract(c.value,'$.kind')='${kind}')
 UNION ALL
 SELECT json_extract(c.value,'$.payload') AS value,1 AS branch,CAST(c.key AS INTEGER) AS position FROM json_each(input.op,'$.changes') c WHERE json_extract(c.value,'$.kind')='${kind}' AND json_type(c.value,'$.payload')!='null'
 ORDER BY branch,position))`;args.push(`'$.${kind}'`,`json(${rebuilt})`);}
 const dataExpr=appendChanges?`json(jsonb_insert(jsonb(s.data),${appendChanges.flatMap((c,i)=>["'$."+c.kind+"[#]'",`jsonb(json_extract(input.op,'$.changes[${i}].payload'))`]).join(',')}))`:`json_set(s.data,${args.join(',')})`;
 return `WITH input(op,patch) AS (VALUES(?,?)),candidate AS MATERIALIZED (SELECT ${dataExpr} AS data,json_patch(s.versions,input.patch) AS versions FROM sync_state s,input WHERE s.id=1 AND s.version=?)
 UPDATE sync_state SET version=?,data=(SELECT data FROM candidate),versions=(SELECT versions FROM candidate),last_op=? WHERE id=1 AND version=? AND EXISTS(SELECT 1 FROM candidate WHERE length(CAST(data AS BLOB))<=5000000 AND length(CAST(data AS BLOB))+length(CAST(versions AS BLOB))+length(?)<=1900000)`;
}
function unhex(s){if(typeof s!=='string'||!/^([a-f0-9]{2})+$/.test(s))throw Error('Signature invalid');return Uint8Array.from(s.match(/../g),x=>parseInt(x,16))}
export default {async fetch(request,env){const origin=request.headers.get('Origin'),url=new URL(request.url);const h={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'},out=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:h}),rawOut=text=>new Response(text,{headers:h});if(!ORIGINS.has(origin)&&origin!==env.PAIRING_ORIGIN)return out({error:'Origin not allowed'},403);Object.assign(h,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Device-Id, X-Time, X-Nonce, X-Signature'});if(request.method==='OPTIONS')return new Response(null,{status:204,headers:h});
try{
 const raw=await limitedRequest(request);if(enc.encode(raw).length>1000000)return out({error:'Giao dịch vượt 1.000.000 byte; giữ nguyên hàng đợi, không chia nhỏ'},413);const now=Date.now();
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
 if(env.ENABLE_DEVICE_PAIRING==='true'){const result=await globalThis.TGDevicePairing.route({db:env.DB,request,raw,device:d,origin,now,out,hash,initialDevice:env.ENABLE_PREVIEW_INITIAL_DEVICE==='true'&&origin===env.PAIRING_ORIGIN&&!ORIGINS.has(origin)?{origin:env.INITIAL_DEVICE_ORIGIN,hash:env.INITIAL_DEVICE_GRANT_HASH,expires:Number(env.INITIAL_DEVICE_GRANT_EXPIRES)}:null});if(result)return result;}
 if(d.status!=='approved')return out({error:'Device awaits owner approval'},403);
 if(env.PUBLIC_INITIAL_BOOTSTRAP==='disabled'&&['/api/sync/bootstrap/status','/api/sync/bootstrap'].includes(url.pathname))return out({error:'Khởi tạo lần đầu chỉ qua kế hoạch owner-admin đã duyệt; không gửi snapshot lớn qua Worker Free'},403);
 if(url.pathname==='/api/sync/bootstrap/status'&&request.method==='GET'){
 if(env.INITIAL_BOOTSTRAP_TARGET!=='production-v23')return out({error:'Khởi tạo snapshot không được bật trên kho này'},403);
 const s=await env.DB.prepare('SELECT version,data FROM sync_state WHERE id=1').first(),ops=await env.DB.prepare('SELECT count(*) AS n FROM sync_operations').first(),guard=await env.DB.prepare('SELECT target,owner_device_id,snapshot_hash,backup_ref,used_operation FROM sync_initial_guard WHERE id=1').first();
 return out({target:env.INITIAL_BOOTSTRAP_TARGET,sequence:s.version,empty:s.version===0&&ops.n===0&&C.isEmpty(JSON.parse(s.data)),grant:guard?{target:guard.target,deviceId:guard.owner_device_id,hash:guard.snapshot_hash,backupConfirmed:!!guard.backup_ref,usedOperation:guard.used_operation}:null});
 }
 if(url.pathname==='/api/sync/bootstrap'&&request.method==='POST'){
 if(env.INITIAL_BOOTSTRAP_TARGET!=='production-v23')return out({error:'Chỉ khởi tạo trên D1 nghiệm thu riêng'},403);
 const p=JSON.parse(raw);if(p.schemaVersion!==1||p.deviceId!==d.id||!/^([a-f0-9-]{36})$/.test(p.operationId||'')||p.expectedSequence!==0||p.ownerConfirmed!==true||p.backupConfirmed!==true||p.encoding!=='gzip-base64'||!/^([a-f0-9]{64})$/.test(p.snapshotHash||''))return out({error:'Thiếu xác nhận chủ xưởng / sao lưu / định danh snapshot'},400);
 let text,snapshot;try{text=await unpackInitial(p.compressed);if(await hash(text)!==p.snapshotHash)return out({error:'Hash snapshot không khớp; chưa ghi dữ liệu'},400);snapshot=JSON.parse(text);C.validate(snapshot);if(!C.same(snapshot,C.initialSnapshot(snapshot)))return out({error:'Snapshot không đúng phạm vi đồng bộ; bản phục hồi cục bộ không gửi'},400);}catch(e){return out({error:e.message},400);}
 const digest=await hash(C.canonical(p)),old=await env.DB.prepare('SELECT device_id,payload_hash,sequence FROM sync_operations WHERE operation_id=?').bind(p.operationId).first();
 if(old)return old.device_id===d.id&&old.payload_hash===digest?out({status:'duplicate',sequence:old.sequence,snapshotHash:p.snapshotHash}):out({error:'Operation ID collision'},409);
 const guard=await env.DB.prepare('SELECT * FROM sync_initial_guard WHERE id=1').first();
 if(!guard||guard.target!==env.INITIAL_BOOTSTRAP_TARGET||guard.owner_device_id!==d.id||guard.snapshot_hash!==p.snapshotHash||!guard.backup_ref||guard.used_operation)return out({error:'Chưa có duyệt đúng thiết bị/hash và bản sao lưu trên kho nghiệm thu'},403);
 const row=await env.DB.prepare('SELECT * FROM sync_state WHERE id=1').first(),ops=await env.DB.prepare('SELECT count(*) AS n FROM sync_operations').first();if(row.version!==0||row.last_op||ops.n!==0||!C.isEmpty(JSON.parse(row.data)))return out({error:'D1 đích không trống; dừng, không ghi đè'},409);
 const versions=C.initialVersions(snapshot),vtext=JSON.stringify(versions),saved={schemaVersion:1,type:'initial-snapshot',operationId:p.operationId,deviceId:d.id,snapshotHash:p.snapshotHash,snapshot},body=JSON.stringify(saved);
 // SQLite row includes all text columns; 100 kB headroom below D1's 2 MB limit.
 if(enc.encode(text).length>5000000||enc.encode(text+vtext+p.operationId).length>1900000||enc.encode(body+digest+d.id+p.operationId).length>1900000)return out({error:'Snapshot/versions/biên nhận vượt giới hạn dòng D1 an toàn; giữ nguyên kho'},413);
 const result=await env.DB.batch([
 env.DB.prepare("UPDATE sync_state SET version=1,data=?,versions=?,last_op=? WHERE id=1 AND version=0 AND last_op IS NULL AND data=? AND versions=? AND NOT EXISTS(SELECT 1 FROM sync_operations) AND EXISTS(SELECT 1 FROM sync_initial_guard WHERE id=1 AND target=? AND owner_device_id=? AND snapshot_hash=? AND backup_ref=? AND used_operation IS NULL) AND EXISTS(SELECT 1 FROM sync_devices WHERE id=? AND status='approved')").bind(text,vtext,p.operationId,row.data,row.versions,env.INITIAL_BOOTSTRAP_TARGET,d.id,p.snapshotHash,guard.backup_ref,d.id),
 env.DB.prepare('INSERT INTO sync_operations(operation_id,device_id,payload_hash,sequence,body,at) SELECT ?,?,?,1,?,? WHERE EXISTS(SELECT 1 FROM sync_state WHERE id=1 AND version=1 AND last_op=?) AND NOT EXISTS(SELECT 1 FROM sync_operations WHERE operation_id=?)').bind(p.operationId,d.id,digest,body,now,p.operationId,p.operationId),
 env.DB.prepare('UPDATE sync_initial_guard SET used_operation=? WHERE id=1 AND used_operation IS NULL AND EXISTS(SELECT 1 FROM sync_operations WHERE operation_id=?)').bind(p.operationId,p.operationId)
 ]);
 if(result[0].meta.changes)return out({status:'accepted',sequence:1,snapshotHash:p.snapshotHash},201);
 const done=await env.DB.prepare('SELECT device_id,payload_hash,sequence FROM sync_operations WHERE operation_id=?').bind(p.operationId).first();if(done&&done.device_id===d.id&&done.payload_hash===digest)return out({status:'duplicate',sequence:done.sequence,snapshotHash:p.snapshotHash});return out({error:'D1 hoặc quyền đã đổi; xem trước lại, chưa ghi đè'},409);
 }
 if(url.pathname==='/api/sync/snapshot'&&request.method==='GET'){const s=await env.DB.prepare('SELECT version,data,versions FROM sync_state WHERE id=1').first();return rawOut('{\"sequence\":'+s.version+',\"data\":'+s.data+',\"versions\":'+s.versions+'}');}
 if(url.pathname==='/api/sync/status'&&request.method==='GET'){const s=await env.DB.prepare('SELECT version,data FROM sync_state WHERE id=1').first();return out({schemaVersion:1,sequence:s.version,summary:summaryServer(JSON.parse(s.data))});}
 if(url.pathname==='/api/sync/pull'&&request.method==='GET'){
 const after=Number(url.searchParams.get('after')||0);if(!Number.isSafeInteger(after)||after<0)return out({error:'Invalid cursor'},400);const head=await env.DB.prepare('SELECT version FROM sync_state WHERE id=1').first();if(after>head.version)return out({status:'conflict',error:'Máy chủ có cursor cũ hơn thiết bị; dừng và đối soát phục hồi, không tự bỏ dữ liệu',sequence:head.version,clientCursor:after},409);const rows=await env.DB.prepare('SELECT sequence,body FROM sync_operations WHERE sequence>? ORDER BY sequence LIMIT 30').bind(after).all();return rawOut('{\"operations\":['+rows.results.map(x=>x.body.slice(0,-1)+',\"sequence\":'+x.sequence+'}').join(',')+'],\"hasMore\":'+(rows.results.length===30)+'}');}
 if(url.pathname==='/api/sync/push'&&request.method==='POST'){
 const op=JSON.parse(raw);if(['type','snapshot','versions','bootstrapMode','target','backupRef'].some(k=>Object.hasOwn(op,k)))return out({error:'Reserved bootstrap fields in delta'},400);if(op.schemaVersion!==1||op.deviceId!==d.id||typeof op.operationId!=='string'||!/^[a-f0-9-]{36}$/.test(op.operationId)||!Array.isArray(op.changes)||!op.changes.length||op.changes.length>2000)return out({error:'Invalid operation'},400);const digest=await hash(C.canonical(op));
 const old=await env.DB.prepare('SELECT device_id,payload_hash,sequence FROM sync_operations WHERE operation_id=?').bind(op.operationId).first();if(old)return old.device_id===d.id&&old.payload_hash===digest?out({status:'duplicate',sequence:old.sequence}):out({error:'Operation ID collision'},409);
 for(let attempt=0;attempt<4;attempt++){
 const row=await env.DB.prepare(VALIDATION_SQL).bind(JSON.stringify(op.changes.map(c=>C.key(c.kind,c.id)))).first();if(!row.valid_shape)return out({error:'Kho máy chủ không hợp lệ; giữ nguyên dữ liệu'},500);const state=JSON.parse(row.validation),versions=JSON.parse(row.versions),seen=new Set();
 for(const c of op.changes){if(!C.kinds.includes(c.kind)||typeof c.id!=='string'||!c.id||c.id.length>250||!Number.isSafeInteger(c.baseVersion)||c.baseVersion<0||c.payload!==null&&(typeof c.payload!=='object'||Array.isArray(c.payload)||C.rid(c.payload)!==c.id))return out({error:'Invalid record'},400);const k=C.key(c.kind,c.id);if(seen.has(k))return out({error:'Duplicate record in transaction'},400);seen.add(k);if((versions[k]||0)!==c.baseVersion){const full=await env.DB.prepare(`SELECT r.value AS record FROM sync_state,json_each(data,'$.${c.kind}') r WHERE sync_state.id=1 AND ${sqlRecordId('r.value')}=? LIMIT 1`).bind(c.id).first();return out({status:'conflict',error:'Record version conflict',sequence:row.version,record:{kind:c.kind,id:c.id,version:versions[k]||0,server:full?JSON.parse(full.record):null,local:c.payload}},409);}}
 let next;try{next=C.validate(applyServer(state,op.changes));}catch(e){return out({status:'conflict',error:e.message,summary:C.summary(state)},409);}const appendOnly=op.changes.length<=15&&op.changes.every(c=>c.payload!==null&&!(versions[C.key(c.kind,c.id)]||0)&&['partners','orders','payments','audit','trash'].includes(c.kind));for(const c of op.changes)versions[C.key(c.kind,c.id)]=(versions[C.key(c.kind,c.id)]||0)+1;
 const saved={...op,changes:op.changes.map(c=>({...c,version:versions[C.key(c.kind,c.id)]}))};if(enc.encode(JSON.stringify(saved)+digest+d.id+op.operationId).length>1900000)return out({error:'Biên nhận vượt giới hạn dòng D1 an toàn; giữ nguyên hàng đợi'},413);
 const result=await env.DB.batch([env.DB.prepare(deltaSql([...new Set(op.changes.map(c=>c.kind))],appendOnly?op.changes:null)).bind(raw,JSON.stringify(versions),row.version,row.version+1,op.operationId,row.version,op.operationId),env.DB.prepare('INSERT INTO sync_operations(operation_id,device_id,payload_hash,sequence,body,at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sync_state WHERE id=1 AND version=? AND last_op=?)').bind(op.operationId,d.id,digest,row.version+1,JSON.stringify(saved),now,row.version+1,op.operationId)]);
 if(result[0].meta.changes)return out({status:'accepted',sequence:row.version+1},201);
 const concurrent=await env.DB.prepare('SELECT payload_hash,sequence FROM sync_operations WHERE operation_id=?').bind(op.operationId).first();if(concurrent)return concurrent.payload_hash===digest?out({status:'duplicate',sequence:concurrent.sequence}):out({error:'Operation ID collision'},409);
 const current=await env.DB.prepare('SELECT version FROM sync_state WHERE id=1').first();if(current.version===row.version)return out({error:'Snapshot hoặc dòng D1 vượt giới hạn an toàn; giữ nguyên dữ liệu và hàng đợi'},413);
 }
 return out({error:'Concurrent write; retry same operation'},503);
 }
 return out({error:'Not found'},404);
}catch(e){return out({error:e.status===413?e.message:e instanceof SyntaxError?'Invalid JSON':'Request failed'},e.status===413?413:e instanceof SyntaxError?400:500);}
}};
