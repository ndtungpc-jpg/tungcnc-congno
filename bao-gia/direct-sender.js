'use strict';
// Preview target only. Production origin must be configured with its exact sender allowlist before release.
const DEBT_TARGET_ORIGIN='https://tungcnc-congno.pages.dev';
let directSendSession=null;
function directSendStatus(text,urgent=false){const el=document.getElementById('directTransferStatus');if(el){el.textContent=text;el.style.fontWeight=urgent?'700':'';el.style.color=urgent?'#a62f45':'';if(urgent)el.scrollIntoView({block:'center',behavior:'smooth'});}if(urgent)alert(text);}
function endDirectSession(s){if(directSendSession!==s)return;clearTimeout(s.timer);directSendSession=null;}
async function startDirectTransfer(){
 if(directSendSession)return directSendStatus('Đang chờ lần chuyển trước. Hãy xác nhận hoặc hủy tại Công Nợ.');
 if(location.protocol!=='https:'||!crypto.subtle)return directSendStatus('Bản file/offline chưa có nguồn HTTPS xác thực. Dùng Xuất JSON dự phòng; không có dữ liệu nào được gửi.',true);
 let payload;try{payload=buildDebtTransfer();}catch(e){return directSendStatus(e.message,true);}
 const s={sourceNonce:tgNonce(),popup:null,payload:null,receiverNonce:null,origin:DEBT_TARGET_ORIGIN,sent:false};directSendSession=s;
 // Open synchronously in the click handler so mobile popup blockers can permit it.
 s.popup=window.open(DEBT_TARGET_ORIGIN+'/','_blank');if(!s.popup){endDirectSession(s);return directSendStatus('Trình duyệt chặn cửa sổ mới. Cho phép mở cửa sổ hoặc dùng JSON dự phòng.',true);}
 directSendStatus('Đang kết nối Công Nợ Preview. Chưa tạo đơn hoặc công nợ.');
 s.timer=setTimeout(()=>{if(directSendSession===s){directSendStatus('Chưa nhận được xác nhận lưu. Kiểm tra tab Công Nợ hoặc dùng JSON dự phòng; chưa đánh dấu đã chuyển.');endDirectSession(s);}},120000);
 try{payload.transferId='tgq-v1-'+await tgQuoteDigest(payload);s.payload=payload;sendDirectPayload(s);}catch(e){directSendStatus('Không chuẩn bị được dữ liệu: '+e.message,true);endDirectSession(s);}
}
function sendDirectPayload(s){if(directSendSession!==s||s.sent||!s.payload||!s.receiverNonce)return;s.sent=true;s.popup.postMessage({protocol:TG_DIRECT_PROTOCOL,type:'quote',receiverNonce:s.receiverNonce,sourceNonce:s.sourceNonce,payload:s.payload},s.origin);}
window.addEventListener('message',e=>{
 const s=directSendSession;if(!s||e.source!==s.popup||e.origin!==s.origin||!tgMessageSafe(e.data))return;const m=e.data;
 if(m.type==='hello'&&/^\w{48}$/.test(m.receiverNonce||'')){if(s.receiverNonce&&s.receiverNonce!==m.receiverNonce)return;s.receiverNonce=m.receiverNonce;sendDirectPayload(s);return;}
 if(m.sourceNonce!==s.sourceNonce||m.receiverNonce!==s.receiverNonce)return;
 if(m.type==='preview')return directSendStatus('Đã mở xem trước tại Công Nợ. Chưa tạo đơn; hãy chọn khách và xác nhận ở tab đó.');
 if(m.type==='saved'&&m.transferId===s.payload?.transferId&&typeof m.orderId==='string'&&m.orderId){
  try{const key='tungcnc_debt_receipts_v1',raw=localStorage.getItem(key),receipts=raw?JSON.parse(raw):{};if(!receipts||Array.isArray(receipts)||typeof receipts!=='object')throw Error('Kho kết quả cũ không đọc được');receipts[m.transferId]={orderId:m.orderId,confirmedAt:new Date().toISOString(),receiverOrigin:s.origin};localStorage.setItem(key,JSON.stringify(receipts));directSendStatus('Công Nợ đã xác nhận lưu đơn cho phiên bản báo giá vừa gửi.');}catch{directSendStatus('Công Nợ đã xác nhận lưu đơn, nhưng chưa lưu được kết quả trên thiết bị này. Không chuyển lại để tạo đơn mới.');}endDirectSession(s);return;
 }
 if(m.type==='queued'&&m.transferId===s.payload?.transferId){directSendStatus('Đã lưu báo giá vào danh sách chờ của Công Nợ Preview. Chưa tạo đơn hoặc phát sinh công nợ.',true);endDirectSession(s);return;}
 if(m.type==='duplicate'){directSendStatus('Báo giá đã có trong Công Nợ. Hệ thống đã chặn tạo đơn trùng; mở đơn cũ để đối chiếu.',true);endDirectSession(s);return;}
 if(m.type==='cancelled'){directSendStatus('Đã hủy xem trước. Chưa xác nhận tạo đơn.');endDirectSession(s);return;}
 if(m.type==='error'){directSendStatus('Công Nợ chưa xác nhận lưu: '+String(m.message||'Lỗi kết nối').slice(0,300));endDirectSession(s);}
});
