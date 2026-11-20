'use strict';
let recoveryCandidates=[],recoveryNotes=[],recoveryScanning=false;
function recordCount(s){return ['partners','orders','payments'].reduce((n,k)=>n+(Array.isArray(s?.[k])?s[k].length:0),0)}
function recoveryCandidate(label,raw){
 if(!raw||!recordCount(raw)&&!raw.trash?.length)return;
 const candidate={label,raw:structuredClone(raw),error:''};
 try{candidate.data=TGSafety.normalize(raw)}catch(err){candidate.error=err.message}
 recoveryCandidates.push(candidate);
}
async function readExistingLegacy(name){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(name);let finished=false,connection;
  const timer=setTimeout(()=>{finished=true;connection?.close();reject(Error('Kho đang bị khóa hoặc chưa phản hồi'))},8000);
  const finish=(err,data)=>{if(finished)return;finished=true;clearTimeout(timer);connection?.close();err?reject(err):resolve(data)};
  // The list can change between enumeration and opening. Never create a missing database.
  req.onupgradeneeded=()=>{req.transaction.abort();finish(Error('Kho cũ không còn tồn tại'))};
  req.onerror=()=>finish(req.error||Error('Không mở được kho cũ'));
  req.onblocked=()=>finish(Error('Kho cũ đang bị khóa. Đóng cửa sổ ứng dụng cũ rồi thử lại.'));
  req.onsuccess=()=>{
   connection=req.result;if(finished){connection.close();return}
   if(!connection.objectStoreNames.contains(STORE)){finish(Error('Kho cũ không có danh sách dữ liệu'));return}
   const tx=connection.transaction(STORE,'readonly'),get=tx.objectStore(STORE).get('main');let raw;
   get.onsuccess=()=>raw=get.result;tx.oncomplete=()=>finish(null,raw);tx.onerror=()=>finish(tx.error||Error('Không đọc được kho cũ'));tx.onabort=()=>finish(Error('Lượt đọc bị hủy'));
  };
 });
}
async function scanLegacyData(){
 if(recoveryScanning)return;recoveryScanning=true;recoveryCandidates=[];recoveryNotes=[];current='recovery-search';render();
 try{
  recoveryCandidate('Kho hiện tại – bản đang mở',committed);
  for(const r of committed.recovery||[])recoveryCandidate('Trước lần nhập '+new Date(r.at).toLocaleString('vi-VN'),r.data);
  try{const text=localStorage.getItem(STORAGE_KEY);if(text)recoveryCandidate('Kho dự phòng của trình duyệt',JSON.parse(text))}catch(err){recoveryNotes.push('Kho dự phòng: '+err.message)}
  if(typeof indexedDB.databases!=='function')recoveryNotes.push('Trình duyệt chưa hỗ trợ liệt kê kho cũ. Hãy thử trên trình duyệt đã dùng trước đây.');
  else{
   const names=await indexedDB.databases();
   if(names.some(x=>x.name==='tunggiang-congno-v1')){
    try{const raw=await readExistingLegacy('tunggiang-congno-v1');recoveryCandidate('Kho phiên bản Web cũ (v1)',raw);if(!recordCount(raw)&&!raw?.trash?.length)recoveryNotes.push('Kho v1 có tồn tại nhưng không có bản ghi trong khóa main.')}catch(err){recoveryNotes.push('Kho v1: '+err.message)}
   }else recoveryNotes.push('Không tìm thấy kho v1 trong địa chỉ website và hồ sơ trình duyệt hiện tại.');
  }
 }catch(err){recoveryNotes.push('Chưa hoàn tất tìm kiếm: '+err.message)}
 finally{recoveryScanning=false;render()}
}
function recoverySearchView(){return `<div class="panel"><h2>Tìm dữ liệu cũ</h2><p>Chỉ đọc các kho và bản phục hồi trên địa chỉ website, trình duyệt hiện tại. Không tự nhập hoặc sửa kho gốc.</p><button class="btn" onclick="scanLegacyData()" ${recoveryScanning?'disabled':''}>${recoveryScanning?'Đang tìm…':'Tìm lại dữ liệu cũ'}</button>${table(['Nguồn','Đối tác / Đơn / Thu chi','Thao tác'],recoveryCandidates.map((c,i)=>`<tr><td>${esc(c.label)}${c.error?'<div class="red">Cần đối chiếu: '+esc(c.error)+'</div>':''}</td><td>${['partners','orders','payments'].map(k=>Array.isArray(c.raw[k])?c.raw[k].length:0).join(' / ')}</td><td><button class="smallbtn" onclick="exportRecoveryCandidate(${i})">Xuất JSON riêng</button>${c.data?`<button class="smallbtn" onclick="applyRecoveryCandidate(${i})">Xem và khôi phục</button>`:''}</td></tr>`).join(''))}<p>${recoveryScanning?'Đang đọc dữ liệu…':recoveryCandidates.length?'Hãy xuất JSON riêng và đối chiếu trước khi khôi phục.':'Chưa tìm thấy nguồn có bản ghi. Tệp sao lưu rỗng không có dữ liệu để khôi phục.'}</p>${recoveryNotes.map(n=>'<p class="hint">'+esc(n)+'</p>').join('')}<p class="hint">Nếu trước đây dùng Chrome, điện thoại, HTML offline hoặc địa chỉ website khác, cần chạy việc tìm kiếm ở đúng nơi đó. Chức năng này không đọc được kho của trình duyệt/thiết bị khác.</p></div>`}
function exportRecoveryCandidate(index){
 const c=recoveryCandidates[index];if(!c)return;
 download('TungGiang_CongNo_TimLai_'+index+'_'+today()+'.json',JSON.stringify({app:'TungGiang-CongNo',version:c.data?2:1,exportedAt:new Date().toISOString(),data:c.data||c.raw},null,2),'application/json');
 toast('Đã tạo bản JSON riêng; kho gốc được giữ nguyên');
}
async function applyRecoveryCandidate(index){
 const c=recoveryCandidates[index];if(!c?.data)return;
 // Reuse the same snapshot, validation, audit and atomic write path as JSON import.
 const text=JSON.stringify({app:'TungGiang-CongNo',version:2,data:c.data});
 await importData({target:{files:[new File([text],'KhoPhucHoi_'+index+'.json',{type:'application/json'})],value:''}});
}
