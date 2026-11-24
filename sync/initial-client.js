(function(root){'use strict';const C=root.TGSyncCore,D=root.TGInitialData,clone=x=>structuredClone(x),base='/api/sync/initial/';
class InitialCloud{
 constructor({engine,store,environment,onProgress=()=>{}}){Object.assign(this,{engine,store,environment,onProgress});this.busy=false;this.paused=false;}
 async status(){const r=await this.store.read();return this.engine.call(r.meta,base+'status');}
 async start(preview,backupHash){if(this.busy)throw Error('Đang khởi tạo.');this.environment(preview.snapshot);root.TGReviewSafety.fresh(preview,await this.store.read());const status=await this.status();if(status.environment!=='v24-preview')throw Error('Không đúng sổ Cloud Preview. Dừng khởi tạo.');if(!status.released)throw Error('Chờ chủ xưởng xác nhận trước khi đưa dữ liệu thật lên Cloud.');if(!status.empty||status.job)throw Error('Sổ đã đổi hoặc có phiên khởi tạo. Không ghi đè.');const r=await this.store.read(),id=root.crypto.randomUUID(),plan=await D.plan(r.main,id,backupHash);const checkpoint={manifest:plan.manifest,sourceHash:await D.hash(C.canonical(r.main)),queueHash:await D.hash(C.canonical(r.meta.outbox)),status:'uploading'};root.TGReviewSafety.fresh(preview,r);const m=clone(r.meta);m.initialUpload=checkpoint;m.bootstrapPending=true;m.serial++;await this.store.write(r.main,r.meta.serial,null,m);return this.run();}
 pause(){this.paused=true;}
 async run(){if(this.busy)throw Error('Đang khởi tạo.');this.busy=true;this.paused=false;this.engine.reviewing=true;
 try{
  const first=await this.store.read(),cp=first.meta.initialUpload;if(!cp||cp.status!=='uploading')throw Error('Không có phiên khởi tạo cần tiếp tục.');
  if(await D.hash(C.canonical(first.main))!==cp.sourceHash||await D.hash(C.canonical(first.meta.outbox))!==cp.queueHash)throw Error('Dữ liệu trên máy đã thay đổi sau khi bắt đầu. Dừng để đối chiếu; không ghi đè hoặc bỏ giao dịch mới.');
  const plan=await D.plan(first.main,cp.manifest.sessionId,cp.manifest.backupHash);if(!C.same(plan.manifest,cp.manifest))throw Error('Kế hoạch khởi tạo không còn khớp bản gốc.');
  const unchanged=async()=>{const r=await this.store.read();if(!C.same(r.main,first.main)||!C.same(r.meta.outbox,first.meta.outbox)||!C.same(r.meta.initialUpload,cp))throw Error('Dữ liệu hoặc hàng đợi đã đổi. Dừng an toàn để đối chiếu.');if(this.paused)throw Error('Đã tạm dừng. Có thể tiếp tục từ lô đã lưu.');return r;};
  let r=await unchanged();const status=await this.engine.call(r.meta,base+'status');if(status.environment!=='v24-preview'||!status.released)throw Error('Cloud Preview chưa được chủ xưởng cho phép khởi tạo.');
  const begun=await this.engine.call(r.meta,base+'begin',{method:'POST',body:{manifest:cp.manifest,ownerConfirmed:true}});let index=begun.job.nextIndex;
  if(!Number.isInteger(index)||index<0||index>plan.parts.length||!begun.job.owned||begun.job.sessionId!==cp.manifest.sessionId||begun.job.snapshotHash!==cp.manifest.snapshotHash)throw Error('Checkpoint máy chủ không hợp lệ.');
  this.onProgress(index,plan.parts.length,'Đã xác minh checkpoint.');
  while(index<plan.parts.length){r=await unchanged();const part=plan.parts[index],response=await this.engine.call(r.meta,base+'part',{method:'POST',body:{sessionId:cp.manifest.sessionId,index,hash:part.hash,content:part.content}});if(response.nextIndex!==index+1)throw Error('Checkpoint không liên tục. Dừng để kiểm tra.');index=response.nextIndex;this.onProgress(index,plan.parts.length,'Đang khởi tạo sổ Cloud…');}
  r=await unchanged();this.onProgress(index,plan.parts.length,'Đang kiểm tra toàn bộ sổ trước khi công bố…');const done=await this.engine.call(r.meta,base+'finish',{method:'POST',body:{sessionId:cp.manifest.sessionId}});
  if(done.status!=='complete'||done.sequence!==1||done.snapshotHash!==cp.manifest.snapshotHash||!C.same(done.stats,cp.manifest.stats))throw Error('Biên nhận khởi tạo không khớp. Dừng để kiểm tra.');
  const remote=await this.engine.call(r.meta,'/api/sync/snapshot');this.environment(remote);C.validate(remote.data);
  if(remote.sequence!==1||await D.hash(JSON.stringify(remote.data))!==cp.manifest.snapshotHash||!C.same(D.stats(remote.data),cp.manifest.stats)||!C.same(remote.versions,plan.versions))throw Error('Kết quả Cloud đã đổi hoặc không khớp. Dữ liệu trên máy vẫn được giữ.');
  r=await unchanged();const recordHash=await root.TGReviewSafety.recordHash(first.main),m=clone(r.meta);m.cursor=1;m.versions=clone(remote.versions);m.outbox=[];m.bootstrapPending=false;m.pairingNeedsReview=false;m.error=null;m.conflict=null;m.initialUpload={...cp,status:'complete'};m.reviewReceipt={summary:C.summary(first.main),hash:recordHash};m.serial++;
  // Metadata-only CAS. Never write the original local main, including revision/recovery.
  await this.store.write(r.main,r.meta.serial,null,m);this.onProgress(index,plan.parts.length,'PASS · Toàn bộ số lượng, hạng mục và công nợ đã khớp.');return {stats:done.stats,parts:plan.parts.length};
 }catch(e){if(e instanceof TypeError||e.name==='AbortError')throw Error('Kết nối bị gián đoạn. Checkpoint đã lưu được giữ; bấm Tiếp tục khởi tạo khi có mạng.');throw e;}finally{this.engine.reviewing=false;this.busy=false;}}
}
root.TGInitialCloud=InitialCloud;if(typeof module!=='undefined')module.exports=InitialCloud;
})(globalThis);
