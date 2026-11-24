// Staging-only checkpoint storage. Parts never enter the live accounting snapshot.
(function(root){'use strict';
const C=root.TGSyncCore,D=root.TGInitialData,uuid=s=>typeof s==='string'&&/^[a-f0-9-]{36}$/.test(s),digest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const fail=(message,status=409)=>Object.assign(Error(message),{status});
async function route({db,device,raw,path,method,out,release}){try{
 const job=await db.prepare('SELECT * FROM sync_initial_jobs WHERE id=1').first();
 const state=await db.prepare('SELECT * FROM sync_state WHERE id=1').first(),ops=await db.prepare('SELECT COUNT(*) AS n FROM sync_operations').first();
 const empty=state.version===0&&state.last_op===null&&ops.n===0&&state.versions==='{}'&&C.isEmpty(JSON.parse(state.data));
 const view=j=>j?{sessionId:j.session_id,nextIndex:j.next_index,total:JSON.parse(j.manifest).parts.length,status:j.status,snapshotHash:JSON.parse(j.manifest).snapshotHash,owned:j.device_id===device.id}:null;
 if(path.endsWith('/status')&&method==='GET')return out({environment:'v24-preview',released:release==='approved',empty,job:view(job)});
 if(method!=='POST')throw fail('Thao tác khởi tạo không hợp lệ.',405);
 if(release!=='approved')throw fail('Chờ chủ xưởng xác nhận trước khi đưa dữ liệu thật lên Cloud.',403);
 const p=JSON.parse(raw);
 if(path.endsWith('/begin')){
  const m=p.manifest;if(!m||!uuid(m.sessionId)||!digest(m.snapshotHash)||!digest(m.backupHash)||!Number.isSafeInteger(m.bytes)||m.bytes<=0||m.bytes>1900000||!Array.isArray(m.parts)||!m.parts.length||m.parts.length>64||m.parts.some((x,i)=>x.index!==i||!digest(x.hash)||!Number.isSafeInteger(x.bytes)||x.bytes<=0||x.bytes>400000)||m.parts.reduce((n,x)=>n+x.bytes,0)!==m.bytes||p.ownerConfirmed!==true||!m.stats)throw fail('Kế hoạch hoặc xác nhận sao lưu không hợp lệ.',400);
  const manifest=JSON.stringify(m);if(D.bytes(manifest)>50000)throw fail('Kế hoạch khởi tạo quá lớn.',413);
  if(job){if(job.session_id===m.sessionId&&job.device_id===device.id&&job.manifest===manifest)return out({job:view(job)});throw fail('Có phiên khởi tạo khác hoặc sổ đã được khởi tạo. Không ghi đè.');}
  if(!empty)throw fail('Sổ Cloud không còn trống. Dừng, cần đối chiếu lại.');
  await db.prepare("INSERT OR IGNORE INTO sync_initial_jobs(id,session_id,device_id,manifest,status,next_index) SELECT 1,?,?,?,'uploading',0 WHERE EXISTS(SELECT 1 FROM sync_state WHERE id=1 AND version=0 AND last_op IS NULL AND data=? AND versions='{}') AND NOT EXISTS(SELECT 1 FROM sync_operations) AND EXISTS(SELECT 1 FROM sync_devices WHERE id=? AND status='approved')").bind(m.sessionId,device.id,manifest,state.data,device.id).run();
  const created=await db.prepare('SELECT * FROM sync_initial_jobs WHERE id=1').first();if(!created||created.session_id!==m.sessionId||created.manifest!==manifest||created.device_id!==device.id)throw fail('Sổ hoặc quyền đã đổi. Chưa khởi tạo.');return out({job:view(created)},201);
 }
 if(!job||job.session_id!==p.sessionId||job.device_id!==device.id)throw fail('Không tìm thấy checkpoint đúng thiết bị.');
 const manifest=JSON.parse(job.manifest);
 if(path.endsWith('/part')){
  const part=manifest.parts[p.index];if(!part||part.index!==p.index||typeof p.content!=='string'||D.bytes(p.content)!==part.bytes||p.hash!==part.hash||await D.hash(p.content)!==part.hash)throw fail('Lô dữ liệu không khớp bản gốc. Dừng để kiểm tra.',400);
  const old=await db.prepare('SELECT hash,content FROM sync_initial_parts WHERE session_id=? AND part_index=?').bind(job.session_id,p.index).first();
  if(old){if(old.hash!==p.hash||old.content!==p.content)throw fail('Lô đã nhận có nội dung khác. Không ghi đè.');return out({nextIndex:job.next_index,duplicate:true});}
  if(job.status!=='uploading'||!empty||job.next_index!==p.index)throw fail('Checkpoint hoặc sổ đã đổi. Dừng để đối chiếu.');
  const result=await db.batch([
   db.prepare("INSERT OR IGNORE INTO sync_initial_parts(session_id,part_index,hash,content) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM sync_initial_jobs WHERE id=1 AND session_id=? AND status='uploading' AND next_index=?) AND EXISTS(SELECT 1 FROM sync_state WHERE id=1 AND version=0 AND data=? AND versions='{}' AND last_op IS NULL) AND NOT EXISTS(SELECT 1 FROM sync_operations) AND EXISTS(SELECT 1 FROM sync_devices WHERE id=? AND status='approved')").bind(job.session_id,p.index,p.hash,p.content,job.session_id,p.index,state.data,device.id),
   db.prepare("UPDATE sync_initial_jobs SET next_index=next_index+1 WHERE id=1 AND session_id=? AND status='uploading' AND next_index=? AND EXISTS(SELECT 1 FROM sync_initial_parts WHERE session_id=? AND part_index=? AND hash=?)").bind(job.session_id,p.index,job.session_id,p.index,p.hash)
  ]);
  const current=await db.prepare('SELECT next_index FROM sync_initial_jobs WHERE id=1').first();if(current.next_index<=p.index)throw fail('Chưa lưu được lô hoặc quyền đã bị thu hồi.');return out({nextIndex:current.next_index,duplicate:!result[0].meta.changes});
 }
 if(path.endsWith('/finish')){
  if(job.status==='complete'){const receipt=await db.prepare('SELECT device_id,payload_hash,sequence FROM sync_operations WHERE operation_id=?').bind(job.session_id).first();if(!receipt||receipt.device_id!==device.id||receipt.payload_hash!==manifest.snapshotHash)throw fail('Biên nhận khởi tạo không khớp.');return out({status:'complete',sequence:receipt.sequence,snapshotHash:manifest.snapshotHash,stats:manifest.stats});}
  if(!empty||job.next_index!==manifest.parts.length)throw fail('Chưa nhận đủ các lô hoặc sổ đã đổi. Chưa công bố dữ liệu.');
  const rows=(await db.prepare('SELECT part_index,hash,content FROM sync_initial_parts WHERE session_id=? ORDER BY part_index').bind(job.session_id).all()).results;
  if(rows.length!==manifest.parts.length)throw fail('Thiếu lô đã lưu. Chưa công bố dữ liệu.');
  for(let i=0;i<rows.length;i++)if(rows[i].part_index!==i||rows[i].hash!==manifest.parts[i].hash||await D.hash(rows[i].content)!==rows[i].hash)throw fail('Lô đã lưu không toàn vẹn. Chưa công bố dữ liệu.');
  const text=rows.map(r=>r.content).join('');if(D.bytes(text)!==manifest.bytes||await D.hash(text)!==manifest.snapshotHash)throw fail('Dữ liệu tổng không khớp bản gốc.');
  const snapshot=JSON.parse(text);try{C.validate(snapshot);}catch(e){throw fail('Kiểm tra toàn vẹn dữ liệu chưa đạt: '+e.message,422);}if(snapshot.schemaVersion!==2||snapshot.revision!==0||!Array.isArray(snapshot.recovery)||snapshot.recovery.length||C.kinds.some(k=>!Array.isArray(snapshot[k]))||!C.same(D.stats(snapshot),manifest.stats))throw fail('Số lượng, hạng mục hoặc công nợ không khớp.');
  const versions=JSON.stringify(C.initialVersions(snapshot)),saved={schemaVersion:1,type:'initial-snapshot',operationId:job.session_id,deviceId:device.id,snapshotHash:manifest.snapshotHash,snapshot},body=JSON.stringify(saved);
  if(D.bytes(text+versions+job.session_id)>1900000||D.bytes(body+manifest.snapshotHash+device.id+job.session_id)>1900000)throw fail('Sổ vượt dung lượng lưu an toàn. Dữ liệu tạm được giữ.',413);
  const result=await db.batch([
   db.prepare("UPDATE sync_state SET version=1,data=?,versions=?,last_op=? WHERE id=1 AND version=0 AND data=? AND versions='{}' AND last_op IS NULL AND NOT EXISTS(SELECT 1 FROM sync_operations) AND EXISTS(SELECT 1 FROM sync_initial_jobs WHERE id=1 AND session_id=? AND device_id=? AND status='uploading' AND next_index=?) AND EXISTS(SELECT 1 FROM sync_devices WHERE id=? AND status='approved')").bind(text,versions,job.session_id,state.data,job.session_id,device.id,rows.length,device.id),
   db.prepare('INSERT OR IGNORE INTO sync_operations(operation_id,device_id,payload_hash,sequence,body,at) SELECT ?,?,?,1,?,? WHERE EXISTS(SELECT 1 FROM sync_state WHERE id=1 AND version=1 AND last_op=?)').bind(job.session_id,device.id,manifest.snapshotHash,body,Date.now(),job.session_id),
   db.prepare("UPDATE sync_initial_jobs SET status='complete' WHERE id=1 AND session_id=? AND EXISTS(SELECT 1 FROM sync_operations WHERE operation_id=? AND device_id=? AND payload_hash=?)").bind(job.session_id,job.session_id,device.id,manifest.snapshotHash)
  ]);
  const receipt=await db.prepare('SELECT payload_hash FROM sync_operations WHERE operation_id=?').bind(job.session_id).first();if(!receipt||receipt.payload_hash!==manifest.snapshotHash)throw fail('Sổ hoặc quyền đã đổi. Chưa công bố dữ liệu.');return out({status:'complete',sequence:1,snapshotHash:manifest.snapshotHash,stats:manifest.stats,duplicate:!result[0].meta.changes});
 }
 throw fail('Thao tác không được hỗ trợ.',404);
 }catch(e){return out({error:e.status?e.message:'Chưa hoàn tất khởi tạo. Checkpoint và dữ liệu trên máy vẫn được giữ.'},e.status||500);}}
root.TGInitialUpload={route};if(typeof module!=='undefined')module.exports=root.TGInitialUpload;
})(globalThis);
