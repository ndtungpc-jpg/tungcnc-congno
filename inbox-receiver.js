// Opt-in remote quote inbox receiver. Does not alter existing local quote inbox or IndexedDB.
// Enable only after a verified Worker URL is supplied via window.TG_QUOTE_INBOX_API.
(async function(){
 const api=window.TG_QUOTE_INBOX_API;
 if(!api)return;
 const {createQuoteInbox}=await import('./inbox-client.js');
 const inbox=createQuoteInbox(api);
 let pending=[],active=null,loading=false;
 const banner=document.createElement('button');
 banner.type='button';banner.className='btn';banner.style.cssText='position:fixed;right:12px;bottom:16px;z-index:9997;box-shadow:0 3px 14px #0003;display:none';
 banner.onclick=()=>openRemoteInbox();
 document.body.appendChild(banner);
 function show(){banner.style.display=pending.length?'block':'none';banner.textContent='Báo giá chờ ('+pending.length+')';}
 async function refresh(){
  if(loading||!navigator.onLine||!ready||saving)return;
  loading=true;
  try{
   if(!inbox.authenticated){banner.style.display='block';banner.textContent='Kết nối hộp thư báo giá';return;}
   const result=await inbox.pending();pending=result.quotes||[];show();
  }catch(err){console.warn('Không tải được hộp thư báo giá',err);banner.style.display='block';banner.textContent='Hộp thư: thử lại';}
  finally{loading=false;}
 }
 async function openRemoteInbox(){
  if(!inbox.authenticated){
   const pass=prompt('Xác thực thiết bị lần đầu để mở Hộp thư báo giá:');
   if(!pass)return;
   try{await inbox.login(pass);}catch(err){alert('Không xác thực được: '+err.message);return;}
  }
  await refresh();
  if(!pending.length)return alert('Không có báo giá chờ.');
  const options=pending.map((q,i)=>(i+1)+'. '+(q.payload?.customer?.name||'Khách chưa rõ')+' — '+(q.payload?.source?.quoteCode||q.id.slice(0,15))).join('\n');
  const selected=prompt('Chọn số báo giá để xem trước:\n'+options);
  if(!selected)return;
  const index=Number(selected)-1;if(!Number.isInteger(index)||index<0||index>=pending.length)return alert('Số báo giá không hợp lệ.');
  if(document.querySelector('#modal.open')||pendingQuoteTransfer)return alert('Hãy hoàn tất biểu mẫu đang mở trước.');
  const quote=pending[index];
  try{
   await previewQuoteTransfer({target:{files:[new File([JSON.stringify(quote.payload)],'inbox-quote.json',{type:'application/json'})],value:''}});
   if(pendingQuoteTransfer?.data?.transferId!==quote.id)throw Error('Không mở được xem trước hoặc báo giá đã nhập.');
   active=quote.id;
  }catch(err){alert('Không mở được báo giá: '+err.message);}
 }
 const originalConfirm=confirmQuoteTransfer;
 confirmQuoteTransfer=async function(){
  const id=active;
  await originalConfirm();
  if(id&&committed.orders.some(o=>o.quoteTransferId===id)){
   active=null;
   try{await inbox.markImported(id);}catch(err){console.warn('Đơn đã lưu cục bộ nhưng chưa đánh dấu trên máy chủ',err);alert('Đơn đã lưu. Hộp thư chưa cập nhật trạng thái, hãy kiểm tra lại.');}
   await refresh();
  }
 };
 const originalClose=closeModal;
 closeModal=function(...args){const result=originalClose(...args);if(result!==false&&active){active=null;}return result;};
 window.addEventListener('online',refresh);
 window.addEventListener('pageshow',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 setTimeout(refresh,2000);
})();
