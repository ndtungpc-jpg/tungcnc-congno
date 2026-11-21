'use strict';
// Exact deployment origins only. No wildcard, null/file origin or arbitrary return URL.
const TG_DIRECT_SENDERS=[location.origin,'https://test-direct-quote-bridge.tungcnc-congno.pages.dev','https://c28f411b.tungcnc-congno.pages.dev','https://baogia-tungcnc.pages.dev'];
let directConnection=null,directConfirming=false;
const receiverNonce=tgNonce(),directOpenedAt=Date.now();
function directReply(connection,type,extra={}){try{connection.source.postMessage({protocol:TG_DIRECT_PROTOCOL,type,receiverNonce,sourceNonce:connection.sourceNonce,...extra},connection.origin);}catch{}}
function directHello(){if(!ready||saving)return;if(!window.opener||directConnection||Date.now()-directOpenedAt>60000)return;for(const origin of TG_DIRECT_SENDERS)if(origin.startsWith('https://')){try{window.opener.postMessage({protocol:TG_DIRECT_PROTOCOL,type:'hello',receiverNonce},origin);}catch{}}}
window.addEventListener('message',async e=>{
 if(e.source!==window.opener||!TG_DIRECT_SENDERS.includes(e.origin)||!e.origin.startsWith('https://')||!tgMessageSafe(e.data))return;
 const m=e.data;if(m.type!=='quote'||m.receiverNonce!==receiverNonce||!/^\w{48}$/.test(m.sourceNonce||'')||directConnection)return;
 const c={source:e.source,origin:e.origin,sourceNonce:m.sourceNonce,transferId:m.payload?.transferId};directConnection=c;
 try{
  if(!ready||saving)throw Error('Ứng dụng đang tải/lưu. Hãy thử lại.');
  if(pendingQuoteTransfer||document.querySelector('#modal.open'))throw Error('Đang có biểu mẫu chưa đóng. Hãy hoàn tất rồi chuyển lại.');
  const digest=await tgQuoteDigest(m.payload);if(m.payload.transferId!=='tgq-v1-'+digest)throw Error('Mã chuyển không khớp dấu vân tay nội dung');
  const data=validateQuoteTransfer(m.payload),fp=await quoteFingerprint(data);
  const old=committed.orders.find(o=>o.quoteTransferId===data.transferId||o.quoteDirectFingerprint===digest||(data.source.quoteCode&&normalizeName(o.quoteSourceCode)===normalizeName(data.source.quoteCode)));
  if(old){directReply(c,'duplicate',{transferId:data.transferId,orderId:old.id});directConnection=null;alert('Báo giá này đã được nhập vào Công Nợ. Không tạo thêm đơn trùng. Vui lòng mở đơn đã có để đối chiếu.');return;}
  // File is an in-memory adapter; no JSON download, inbox write or accounting write.
  if(directConnection!==c||pendingQuoteTransfer||document.querySelector('#modal.open'))throw Error('Biểu mẫu đã thay đổi trong khi kết nối. Hãy chuyển lại.');
  await previewQuoteTransfer({target:{files:[new File([JSON.stringify(m.payload)],'direct-quote.json',{type:'application/json'})],value:''}});
  if(pendingQuoteTransfer?.data.transferId!==data.transferId)throw Error('Không mở được xem trước hoặc báo giá đã được nhập');
  pendingQuoteTransfer.directFingerprint=digest;c.transferId=data.transferId;directReply(c,'preview',{transferId:data.transferId});
 }catch(err){directReply(c,'error',{message:String(err.message).slice(0,300)});directConnection=null;}
});
const directOriginalConfirm=confirmQuoteTransfer;
confirmQuoteTransfer=async function(){const c=directConnection;if(!c||pendingQuoteTransfer?.data.transferId!==c.transferId)return directOriginalConfirm();directConfirming=true;try{await directOriginalConfirm();const order=committed.orders.find(o=>o.quoteTransferId===c.transferId);if(order){directReply(c,'saved',{transferId:c.transferId,orderId:order.id});directConnection=null;}else directReply(c,'error',{message:'Chưa lưu được đơn. Hãy kiểm tra lỗi tại Công Nợ.'});}finally{directConfirming=false;}};
const directOriginalQueue=queuePendingQuoteTransfer;
queuePendingQuoteTransfer=async function(){
 const c=directConnection;if(!c||pendingQuoteTransfer?.data.transferId!==c.transferId)return directOriginalQueue();
 directConfirming=true;
 try{
  const saved=await directOriginalQueue();
  if(saved){directReply(c,'queued',{transferId:c.transferId});directConnection=null;}
  return saved;
 }finally{directConfirming=false;}
};
const directOriginalClose=closeModal;
closeModal=function(...args){const result=directOriginalClose(...args);if(result!==false&&!directConfirming&&directConnection){directReply(directConnection,'cancelled',{transferId:directConnection.transferId});directConnection=null;pendingQuoteTransfer=null;}return result;};
setInterval(directHello,500);window.addEventListener('load',directHello);window.addEventListener('pagehide',()=>{if(directConnection&&!directConfirming)directReply(directConnection,'cancelled',{transferId:directConnection.transferId});});
