(function(root){'use strict';
const TTL=300000;
async function route({db,request,raw,device:d,origin,now,out,hash}){
 const path=new URL(request.url).pathname,post=request.method==='POST';
 if(!['/api/pairing/code','/api/pairing/join','/api/pairing/devices','/api/pairing/rename','/api/pairing/revoke','/api/pairing/presence'].includes(path))return null;
 const data=post?JSON.parse(raw||'{}'):{};
 const rate=async(key,max,period)=>{const bucket=await hash('pairing:'+key+':'+Math.floor(now/period)),r=await db.prepare('INSERT INTO sync_rates(bucket,n) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET n=n+1 RETURNING n').bind(bucket).first();return r.n<=max;};
 if(path==='/api/pairing/join'&&post){
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  if(!await rate('join-ip:'+ip,10,TTL)||!await rate('join-device:'+d.id,5,TTL))return out({error:'Nhập sai quá nhiều lần. Thử lại sau 5 phút.'},429);
  if(!/^\d{6}$/.test(data.code||''))return out({error:'Nhập đủ mã 6 số.'},400);
  const digest=await hash(origin+':'+data.code),code=await db.prepare('SELECT * FROM sync_pair_codes WHERE code_hash=?').bind(digest).first();
  if(code?.used_by===d.id&&d.status==='approved')return out({status:'approved',id:d.id}); // lost ACK, same signed identity only
  if(!code||code.used_by||code.expires_at<=now||d.status!=='pending')return out({error:'Mã không hợp lệ, đã dùng hoặc đã hết hạn.'},403);
  const results=await db.batch([
   db.prepare("UPDATE sync_pair_codes SET used_by=? WHERE code_hash=? AND used_by IS NULL AND expires_at>? AND EXISTS(SELECT 1 FROM sync_devices WHERE id=creator AND status='approved' AND origin=?) AND EXISTS(SELECT 1 FROM sync_devices WHERE id=? AND status='pending' AND origin=?)").bind(d.id,digest,now,origin,d.id,origin),
   db.prepare("UPDATE sync_devices SET status='approved' WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM sync_pair_codes c JOIN sync_devices issuer ON issuer.id=c.creator WHERE c.code_hash=? AND c.used_by=? AND c.expires_at>? AND issuer.status='approved' AND issuer.origin=?)").bind(d.id,digest,d.id,now,origin)
  ]);
  if(!results[1].meta.changes)return out({error:'Mã đã dùng, hết hạn hoặc thiết bị tạo mã đã ngắt kết nối.'},409);
  return out({status:'approved',id:d.id},201);
 }
 if(d.status!=='approved')return out({error:'Thiết bị chưa được cấp quyền.'},403);
 if(path==='/api/pairing/code'&&post){
  if(!await rate('create:'+d.id,3,60000))return out({error:'Vui lòng chờ một phút trước khi tạo mã mới.'},429);
  let code,digest;
  for(let attempt=0;attempt<6;attempt++){
   let n;do{n=crypto.getRandomValues(new Uint32Array(1))[0];}while(n>=4294000000);code=String(n%1000000).padStart(6,'0');digest=await hash(origin+':'+code);
   const results=await db.batch([
    db.prepare('UPDATE sync_pair_codes SET expires_at=? WHERE creator=? AND used_by IS NULL').bind(now,d.id),
    db.prepare('INSERT OR IGNORE INTO sync_pair_codes(code_hash,creator,expires_at,created_at) VALUES(?,?,?,?)').bind(digest,d.id,now+TTL,now)
   ]);
   if(results[1].meta.changes)return out({code,expiresAt:now+TTL,serverNow:now},201);
  }
  return out({error:'Chưa tạo được mã. Thử lại sau.'},503);
 }
 if(path==='/api/pairing/devices'&&request.method==='GET'){
  const r=await db.prepare('SELECT d.id,d.label,d.status,p.last_sync FROM sync_devices d LEFT JOIN sync_device_presence p ON p.device_id=d.id WHERE d.origin=? ORDER BY d.created_at').bind(origin).all();return out({devices:r.results,serverNow:now});
 }
 if(path==='/api/pairing/presence'&&post){await db.prepare('INSERT INTO sync_device_presence(device_id,last_sync) VALUES(?,?) ON CONFLICT(device_id) DO UPDATE SET last_sync=excluded.last_sync').bind(d.id,now).run();return out({lastSync:now});}
 if((path==='/api/pairing/rename'||path==='/api/pairing/revoke')&&post){
  if(typeof data.deviceId!=='string')return out({error:'Thiếu thiết bị.'},400);
  if(path.endsWith('/rename')){
   const label=String(data.label||'').trim();if(!label||label.length>80)return out({error:'Tên thiết bị từ 1 đến 80 ký tự.'},400);
   const r=await db.prepare("UPDATE sync_devices SET label=? WHERE id=? AND origin=? AND status='approved'").bind(label,data.deviceId,origin).run();return r.meta.changes?out({ok:true,label}):out({error:'Thiết bị không còn kết nối.'},409);
  }
  const r=await db.prepare("UPDATE sync_devices SET status='revoked' WHERE id=? AND origin=? AND status='approved'").bind(data.deviceId,origin).run();return r.meta.changes?out({ok:true}):out({error:'Thiết bị không còn kết nối.'},409);
 }
 return out({error:'Thao tác không hợp lệ.'},405);
}
root.TGDevicePairing={route,TTL};if(typeof module!=='undefined')module.exports=root.TGDevicePairing;
})(globalThis);
