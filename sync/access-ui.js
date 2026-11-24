(function(root){'use strict';
if(!root.TG_ACCESS_MODE)return;
let activeTab='devices',loading=false,review=null,choices={},page=0,presenceAt=0,verified=false,expiresAt=0;
const ctx=()=>root.tgDeviceSync;
const summary=s=>`<p>Khách ${s.customers} · NCC ${s.suppliers} · Đơn ${s.orders} · Thanh toán ${s.payments}</p><p>Phải thu <b>${money(s.receivable)}</b> · Phải trả <b>${money(s.payable)}</b></p>`;
const comparison=record=>record?`<p>${[record.name,record.code,record.title,record.date,record.note].filter(Boolean).map(esc).join(' · ')}${typeof record.amount==='number'?' · '+money(record.amount):''}</p>`:'<p>Không có bản ghi</p>';
const message=e=>e.status===401?(root.TG_ACCESS_SESSION_SEEN?'Phiên xác minh không còn hợp lệ. Vui lòng xác minh Gmail lại.':'Vui lòng xác minh Gmail để bắt đầu sử dụng trên thiết bị này.'):e.message||'Chưa kết nối được máy chủ. Dữ liệu trên máy vẫn giữ nguyên.';
const time=t=>t?new Date(t).toLocaleString('vi-VN'):'Chưa đồng bộ';
const call=async(path,body)=>{const {meta}=await ctx().store.read();return ctx().engine.call(meta,path,body===undefined?{}:{method:'POST',body});};
root.showAccessGate=function(text='Xác minh Gmail để sử dụng sổ công nợ trên thiết bị này.'){
 verified=false;let gate=document.getElementById('tgAccessGate');if(!gate){gate=document.createElement('section');gate.id='tgAccessGate';document.body.appendChild(gate);}
 gate.innerHTML=`<div class="access-card"><img src="/icons/quan-ly-cong-no-192.png" alt="Logo TG"><h1>TÙNG GIANG CNC</h1><p class="access-subtitle">Quản lý công nợ</p><h2>Xác minh tài khoản</h2><p role="status">${esc(text)}</p><a class="access-login" href="/auth">Xác minh bằng Gmail</a><small>Chỉ cho phép tài khoản chủ xưởng<br>ndtung.pc@gmail.com</small><p class="access-note">Dữ liệu trên thiết bị được giữ nguyên.</p></div>`;
};
function hideGate(){document.getElementById('tgAccessGate')?.remove();}
const oldMore=moreView;moreView=()=>oldMore().replace('</div></div>','<button class="btn device-menu" onclick="showDeviceManager()"><span><b>Thiết bị & Đồng bộ</b><small>Phiên xác minh và quản lý thiết bị</small></span><span>›</span></button></div></div>');
const update=root.updateSyncHeader;root.updateSyncHeader=function(...args){update?.(...args);const b=document.getElementById('headerSync');if(b)b.onclick=()=>showDeviceManager();const [label,m]=args;if(label==='Đã đồng bộ'&&m?.approved&&Date.now()-presenceAt>60000){presenceAt=Date.now();ctx()?.engine.call(m,'/api/access/presence',{method:'POST',body:{}}).catch(()=>{});}};
root.showDeviceManager=async function(tab=activeTab){activeTab=tab;if(!verified)return showAccessGate('Xác minh Gmail để tiếp tục đồng bộ.');try{const {main,meta}=await ctx().store.read(),r=await call('/api/access/devices');modal('Thiết bị & Đồng bộ',`<section class="device-screen"><div class="device-tabs" role="tablist"><button class="btn ${tab==='devices'?'selected':''}" role="tab" aria-selected="${tab==='devices'}" onclick="showDeviceManager('devices')">Thiết bị của tôi</button><button class="btn ${tab==='sync'?'selected':''}" role="tab" aria-selected="${tab==='sync'}" onclick="showDeviceManager('sync')">Đồng bộ</button></div>${tab==='devices'?`<div class="device-list">${r.devices.filter(d=>d.status!=='pending').map(d=>`<article class="device-card"><div class="device-card-copy"><b>${esc(d.label)}${d.id===meta.deviceId?' · Máy này':''}</b><p>${d.status==='approved'?'Đã xác minh':'Đã ngắt kết nối'}</p><small>Lần đồng bộ: ${time(d.last_sync)}</small></div>${d.status==='approved'?`<details><summary aria-label="Tùy chọn ${esc(d.label)}">⋮</summary><button class="btn" onclick="renameSyncDevice('${jsid(d.id)}')">Đổi tên</button><button class="btn danger" onclick="disconnectSyncDevice('${jsid(d.id)}')">Ngắt kết nối</button></details>`:''}</article>`).join('')}</div><p>Thiết bị mới mở ứng dụng và xác minh bằng cùng Gmail chủ xưởng.</p>`:`<p>${navigator.onLine===false?'Ngoại tuyến · dữ liệu trên máy vẫn được giữ':meta.bootstrapPending||meta.conflict?'Cần đối chiếu trước khi đồng bộ':meta.error?'Chưa đồng bộ xong. Dữ liệu trên máy vẫn giữ nguyên.':(meta.outbox?.length||0)+' thay đổi đang chờ gửi'}</p>${summary(TGSyncCore.summary(main))}<button class="btn primary device-main" onclick="syncDevicesNow()">Đồng bộ ngay</button>${meta.reviewReceipt?'<button class="btn device-main" onclick="completeDeviceReview()">Kiểm tra kết quả đối chiếu</button>':''}${meta.bootstrapPending||meta.conflict?'<button class="btn device-main" onclick="reviewDeviceData()">Đối chiếu dữ liệu</button>':''}`}<p class="muted">Phiên xác minh có hiệu lực đến ${time(expiresAt)}</p><button class="btn" onclick="logoutAccess()">Đăng xuất thiết bị này</button><button class="btn" onclick="closeModal()">Đóng</button></section>`);}catch(e){alert(message(e));}};
root.renameSyncDevice=async id=>{const label=prompt('Tên thiết bị mới:');if(!label?.trim())return;try{await call('/api/access/rename',{deviceId:id,label:label.trim()});if((await ctx().store.read()).meta.deviceId===id)await ctx().engine.metaUpdate(m=>m.label=label.trim());await showDeviceManager();}catch(e){alert(message(e));}};
root.disconnectSyncDevice=async id=>{if(!confirm('Ngắt kết nối thiết bị này? Dữ liệu trên thiết bị vẫn giữ nguyên.'))return;try{const own=(await ctx().store.read()).meta.deviceId===id;await call('/api/access/revoke',{deviceId:id});if(own){await ctx().engine.metaUpdate(m=>{m.approved=false;m.error='Thiết bị đã bị thu hồi';});closeModal(true);return showAccessGate('Thiết bị đã bị thu hồi. Dữ liệu trên máy vẫn giữ nguyên.');}await showDeviceManager();}catch(e){alert(message(e));}};
root.logoutAccess=()=>{location.href='/cdn-cgi/access/logout';};
root.syncDevicesNow=async()=>{if((await ctx().store.read()).meta.initialUpload?.status==='uploading')return showInitialPaused();await ctx().engine.tick();return showDeviceManager('sync');};
async function waitForStore(){for(let i=0;i<100;i++){try{return await ctx().store.read();}catch{await new Promise(resolve=>setTimeout(resolve,100));}}throw Error('Chưa mở được kho dữ liệu trên máy. Dữ liệu chưa thay đổi.');}
root.verifyAccessSession=async function(){if(loading)return;loading=true;try{
 const response=await root.tgAccessFetch(root.TG_DEVICE_PAIRING_API+'/api/access/session');if(!response.ok)throw Error('Chưa xác minh được phiên.');const session=await response.json();if(!session.verified||session.email!=='ndtung.pc@gmail.com'||!Number.isFinite(session.expiresAt)||session.expiresAt<=Date.now())throw Error('Phiên không hợp lệ.');
 root.TG_ACCESS_SESSION_SEEN=true;expiresAt=session.expiresAt;let r=await waitForStore();const {engine,store}=ctx();engine.reviewing=true;
 if(!r.meta?.enabled)await engine.enable(/Android/i.test(navigator.userAgent)?'S24 Ultra':'PC Xưởng');
 r=await store.read();if(!r.meta.approved)await engine.metaUpdate(m=>{m.bootstrapPending=true;m.pairingNeedsReview=true;});
 r=await store.read();if(!r.meta.registered){await engine.call(r.meta,'/api/devices/register',{method:'POST',body:{id:r.meta.deviceId,label:r.meta.label,publicJwk:r.meta.publicJwk}});await engine.metaUpdate(m=>m.registered=true);}
 await call('/api/access/authorize',{});await engine.metaUpdate(m=>{m.approved=true;m.error=null;});verified=true;hideGate();
 r=await store.read();if(r.meta.initialUpload?.status==='uploading')showInitialPaused();else if(r.meta.bootstrapPending)await reviewDeviceData(true);else {engine.reviewing=false;await engine.tick();}
 }catch(e){showAccessGate(message(e));}finally{if(ctx())ctx().engine.reviewing=false;loading=false;}};
const RS=root.TGReviewSafety,cloudLabel=root.TG_CLOUD_IDENTITY?.environment==='v24-production'?'Cloud chính thức':'Cloud Preview';
let reviewBackup=null,backupVerified=false,applyingReview=false,initialStatus=null,initialClient=null;
root.reviewDeviceData=async function(){
 const {engine}=ctx();if(applyingReview)return;
 try{review=await engine.preview();RS.environment(review.snapshot);choices={};page=0;reviewBackup=null;backupVerified=false;initialStatus=RS.empty(review.snapshot)?await call('/api/sync/initial/status'):null;renderReview();}
 catch(e){review=null;engine.reviewing=false;alert(message(e));}
};
function reviewTarget(){return TGSyncReview.choose(review.main,review.snapshot,review.review,choices);}
function reviewWarnings(target){return TGSyncReview.warnings(target);}
function reviewLimits(target){try{if(initialStatus&&RS.empty(review.snapshot)){TGSyncCore.validate(target);return '';}RS.capacity(review.snapshot,target);return '';}catch(e){return /vượt.*giới hạn|Snapshot vượt/.test(e.message)?'Sổ này vượt giới hạn gửi an toàn hiện tại. Chưa gửi dữ liệu; giữ nguyên bản gốc và bản sao lưu.':e.message;}}
function renderReview(){
 const conflicts=review.review.rows.filter(r=>r.conflict),start=page*10,empty=RS.empty(review.snapshot),unresolved=conflicts.filter(r=>!choices[r.key]).length;
 const target=unresolved?null:reviewTarget(),limit=target?reviewLimits(target):'',pendingApproval=empty&&initialStatus&&!initialStatus.released;let warnings=[];if(target)warnings=reviewWarnings(target);
 modal('Đối chiếu trước đồng bộ',`<section class="device-screen"><p><b>${cloudLabel} đã xác minh</b> · ${empty?'Sổ Cloud trống, chưa có lịch sử đồng bộ.':'Sổ Cloud đã có dữ liệu hoặc lịch sử. Không coi là sổ mới.'}</p>
 <div class="review-totals"><article><h3>Thiết bị này</h3>${summary(review.review.localSummary)}</article><article><h3>${cloudLabel}</h3>${summary(review.review.remoteSummary)}</article></div>
 <p>${review.review.rows.length-conflicts.length} khác biệt không xung đột được đối chiếu theo lô, giữ các bản ghi riêng. ${conflicts.length} xung đột cần chọn bản giữ.</p>
 ${conflicts.slice(start,start+10).map((r,j)=>{const i=review.review.rows.indexOf(r),record=r.local||r.remote;return `<label class="field device-difference"><b>${esc(record?.name||record?.title||record?.code||kindLabel[r.kind]||'Bản ghi')}</b><details><summary>So sánh nội dung</summary><b>Trên máy này</b>${comparison(r.local)}<b>Trên Cloud</b>${comparison(r.remote)}</details><select aria-label="Lựa chọn xung đột ${start+j+1}" onchange="chooseDeviceRecord(${i},this.value)"><option value="">Chưa chọn</option><option value="local" ${choices[r.key]==='local'?'selected':''}>Giữ bản trên máy này${r.local?'':' (không có bản ghi)'}</option><option value="remote" ${choices[r.key]==='remote'?'selected':''}>Giữ bản trên Cloud${r.remote?'':' (không có bản ghi)'}</option></select></label>`}).join('')}
 <div class="device-actions">${page?'<button class="btn" onclick="deviceReviewPage(-1)">Trang trước</button>':''}${start+10<conflicts.length?'<button class="btn" onclick="deviceReviewPage(1)">Trang sau</button>':''}</div>
 ${!unresolved?`<h3>Dự kiến sau đối chiếu</h3>${summary(TGSyncCore.summary(target))}`:''}
 ${warnings.length?`<details><summary>${warnings.length} nhóm nghi trùng cần kiểm tra</summary>${warnings.map(w=>`<p><b>${esc(w.kind)}</b>: ${w.ids.map(id=>{const r=target[w.kind.startsWith('Đối tác')?'partners':w.kind.startsWith('Đơn')?'orders':'payments'].find(r=>r.id===id);return esc([r?.name||r?.code||r?.title||'Thanh toán',r?.date,typeof r?.amount==='number'?money(r.amount):''].filter(Boolean).join(' · '));}).join('; ')}</p>`).join('')}</details><label><input id="deviceDuplicateAck" type="checkbox"> Tôi đã kiểm tra các nhóm nghi trùng; giữ riêng các giao dịch.</label>`:''}
 <p>${backupVerified?'Đã đọc kiểm tra file sao lưu, nội dung khớp hai phía.':'Bước 1: Tải bản sao lưu hai phía. Bước 2: Chọn lại file vừa lưu để kiểm tra.'}</p>
 <button class="btn device-main" onclick="backupDeviceReview()">Tải bản sao lưu an toàn</button>${reviewBackup?'<label class="field">Kiểm tra file sao lưu vừa lưu<input type="file" accept=".json,application/json" onchange="verifyDeviceReviewBackup(this.files[0])"></label>':''}
 ${limit?'<p role="alert">'+esc(limit)+'</p>':''}${pendingApproval?'<p role="status">Luồng khởi tạo theo lô đã sẵn sàng. Chờ chủ xưởng xác nhận trước khi đưa dữ liệu thật lên Cloud.</p>':''}
 <label><input type="checkbox" id="deviceReviewAck"> Tôi xác nhận đúng sổ ${cloudLabel} và các lựa chọn; bản sao lưu đã lưu an toàn.</label>
 <button id="deviceReviewApply" class="btn primary device-main" ${!backupVerified||unresolved||limit||pendingApproval?'disabled':''} onclick="applyDeviceReview()">${empty?'Khởi tạo sổ Cloud từ thiết bị này':'Áp dụng đối chiếu theo lô'}</button><button class="btn" onclick="cancelDeviceReview()">Hủy · Giữ nguyên</button></section>`);
}
root.chooseDeviceRecord=(i,value)=>{if(!['local','remote',''].includes(value))return;choices[review.review.rows[i].key]=value;renderReview();};
root.deviceReviewPage=step=>{page+=step;renderReview();};

root.backupDeviceReview=async()=>{try{if(!review)return;const r=await ctx().store.read();RS.fresh(review,r);const inbox=typeof readQuoteInbox==='function'?readQuoteInbox():[];reviewBackup=await RS.backup(review,r.meta,inbox);backupVerified=false;const result=await download('TungGiang_Backup_DoiSoat_'+today()+'.json',JSON.stringify(reviewBackup,null,2),'application/json');if(!result?.requested)reviewBackup=null;renderReview();}catch(e){alert(message(e));}};
root.verifyDeviceReviewBackup=async file=>{try{backupVerified=false;if(!file||!reviewBackup)return alert('Hãy tải bản sao lưu của lần đối chiếu này trước.');if(file.size>50000000)throw Error('File sao lưu quá lớn.');const data=JSON.parse((await file.text()).replace(/^\uFEFF/,''));await RS.verifyBackup(data,reviewBackup);RS.fresh(review,await ctx().store.read());backupVerified=true;renderReview();}catch(e){renderReview();alert(message(e));}};
function reviewProgress(value,text){let el=document.getElementById('tgReviewProgress');if(!el){el=document.createElement('section');el.id='tgReviewProgress';el.className='review-progress';document.body.appendChild(el);}el.innerHTML=`<p role="status">${esc(text)}</p><progress aria-label="Tiến trình đồng bộ" max="4" value="${value}"></progress><p>Giữ ứng dụng mở trong khi gửi và đối chiếu kết quả.</p>`;}
root.applyDeviceReview=async()=>{
 if(!review||applyingReview)return;
 if(!backupVerified||!document.getElementById('deviceReviewAck')?.checked)return alert('Cần kiểm tra file sao lưu và xác nhận đúng sổ trước khi tiếp tục.');
 try{
  const target=reviewTarget();RS.environment(review.snapshot);const initial=RS.empty(review.snapshot)&&!!initialStatus;if(!initial)RS.capacity(review.snapshot,target);const warnings=reviewWarnings(target);if(warnings.length&&!document.getElementById('deviceDuplicateAck')?.checked)throw Error('Cần kiểm tra các nhóm nghi trùng trước khi áp dụng.');
  RS.fresh(review,await ctx().store.read());await RS.verifyBackup(reviewBackup,reviewBackup);
  const s=TGSyncCore.summary(target);if(!confirm('Chỉ đồng bộ với '+cloudLabel+'. Sau đối chiếu: '+s.customers+' khách, '+s.orders+' đơn, '+s.payments+' thanh toán; phải thu '+money(s.receivable)+', phải trả '+money(s.payable)+'. Đã giữ bản sao lưu hai phía. Xác nhận tiếp tục?'))return;
  if(initial){if(!initialStatus.released)throw Error('Chờ chủ xưởng xác nhận trước khi đưa dữ liệu thật lên Cloud.');applyingReview=true;closeModal(true);await getInitialClient().start(review,reviewBackup.reconciliationSHA256);review=null;return showInitialResult();}const expected=await RS.recordHash(target);applyingReview=true;closeModal(true);
  await ctx().engine.resolve(review,choices,{acknowledgeDuplicates:warnings.length>0});review=null;
  await ctx().engine.metaUpdate(m=>{m.pairingNeedsReview=false;m.reviewReceipt={summary:s,hash:expected};});
  reviewProgress(2,'Đã kiểm tra bản sao lưu và chuẩn bị dữ liệu an toàn.');
  await completeDeviceReview();
 }catch(e){document.getElementById('tgReviewProgress')?.remove();const r=await ctx().store.read();if(r.meta.initialUpload?.status==='uploading')showInitialError(e);else alert(message(e));}finally{applyingReview=false;}
};
root.completeDeviceReview=async function(){
 try{
  const {engine,store}=ctx();closeModal(true);reviewProgress(2,'Đang gửi và nhận dữ liệu…');await engine.tick();reviewProgress(3,'Đang kiểm tra số lượng và công nợ hai phía…');
  const r=await store.read(),receipt=r.meta.reviewReceipt;if(!receipt?.hash)throw Error('Chưa có biên nhận đối chiếu để kiểm tra.');
  if(r.meta.error||r.meta.conflict||r.meta.outbox.length)throw Error('Chưa đồng bộ xong. Bản sao lưu và hàng đợi vẫn được giữ.');
  const remote=await engine.call(r.meta,'/api/sync/snapshot');RS.environment(remote);TGSyncCore.validate(remote.data);
  const localHash=await RS.recordHash(r.main),remoteHash=await RS.recordHash(remote.data),localSummary=TGSyncCore.summary(r.main),remoteSummary=TGSyncCore.summary(remote.data);
  const pass=localHash===receipt.hash&&remoteHash===receipt.hash&&TGSyncCore.same(localSummary,receipt.summary)&&TGSyncCore.same(remoteSummary,receipt.summary);
  document.getElementById('tgReviewProgress')?.remove();modal('Kết quả đối chiếu',`<p role="status"><b>${pass?'PASS · Số lượng, công nợ và nội dung từng bản ghi khớp hai phía.':'Chưa khớp kết quả dự kiến. Dừng để đối chiếu; không tự ghi đè.'}</b></p><progress max="4" value="4" aria-label="Tiến trình đồng bộ"></progress><h3>Dự kiến sau lựa chọn</h3>${summary(receipt.summary)}<div class="review-totals"><article><h3>Thiết bị này</h3>${summary(localSummary)}</article><article><h3>${cloudLabel}</h3>${summary(remoteSummary)}</article></div><button class="btn" onclick="closeModal(true)">Đóng</button>`);
 }catch(e){document.getElementById('tgReviewProgress')?.remove();modal('Đồng bộ chưa hoàn tất',`<p role="alert">${esc(message(e))}</p><p>Dữ liệu và bản sao lưu vẫn được giữ. Không cần chọn lại hàng trăm bản ghi.</p><button class="btn primary" onclick="completeDeviceReview()">Thử gửi và kiểm tra lại</button><button class="btn" onclick="closeModal(true)">Đóng</button>`);}
};

function getInitialClient(){if(!initialClient)initialClient=new root.TGInitialCloud({...ctx(),environment:RS.environment,onProgress:(n,total,text)=>{reviewProgress(n,text+' · '+n+'/'+total+' lô');const el=document.querySelector('#tgReviewProgress progress');if(el)el.max=total;const box=document.getElementById('tgReviewProgress');if(box&&!document.getElementById('pauseInitialCloud')){const b=document.createElement('button');b.id='pauseInitialCloud';b.className='btn';b.textContent='Tạm dừng an toàn';b.onclick=()=>initialClient.pause();box.appendChild(b);}}});return initialClient;}
function showInitialPaused(){modal('Khởi tạo sổ Cloud',`<p>Có phiên khởi tạo chưa hoàn tất. Các lô đã nhận được giữ; dữ liệu trên máy không thay đổi.</p><button class="btn primary" onclick="resumeInitialCloud()">Tiếp tục khởi tạo</button><button class="btn" onclick="closeModal(true)">Đóng</button>`);}
function showInitialError(e){document.getElementById('tgReviewProgress')?.remove();modal('Khởi tạo đang tạm dừng',`<p role="alert">${esc(message(e))}</p><p>Không xóa dữ liệu hoặc tự bắt đầu lại.</p><button class="btn primary" onclick="resumeInitialCloud()">Tiếp tục khởi tạo</button><button class="btn" onclick="closeModal(true)">Đóng</button>`);}
async function showInitialResult(){document.getElementById('tgReviewProgress')?.remove();const r=await ctx().store.read(),stats=root.TGInitialData.stats(r.main);modal('Khởi tạo sổ Cloud hoàn tất',`<p role="status">PASS · Toàn bộ bản ghi, hạng mục, kích thước và công nợ đã khớp với Cloud Preview.</p>${summary(stats.summary)}<p>${stats.items} hạng mục · ${stats.sizes} dòng kích thước. Dữ liệu gốc trên thiết bị được giữ nguyên.</p><button class="btn" onclick="closeModal(true)">Đóng</button>`);}
root.resumeInitialCloud=async()=>{if(applyingReview)return;applyingReview=true;closeModal(true);try{await getInitialClient().run();await showInitialResult();}catch(e){showInitialError(e);}finally{applyingReview=false;}};

root.cancelDeviceReview=()=>{if(applyingReview)return;ctx().engine.reviewing=false;review=null;reviewBackup=null;backupVerified=false;closeModal(true);};

showAccessGate('Đang kiểm tra phiên xác minh…');
root.tgAccessReady=root.verifyAccessSession();
root.addEventListener?.('pageshow',()=>root.verifyAccessSession());
root.addEventListener?.('online',()=>root.verifyAccessSession());
setInterval(()=>{if(verified&&Date.now()>=expiresAt)showAccessGate('Phiên đã hết hạn. Xác minh Gmail lại trước khi đồng bộ.');},30000);
})(globalThis);
