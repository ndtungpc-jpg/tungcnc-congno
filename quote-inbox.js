'use strict';
// Inbox uses its own localStorage key. Queuing or changing its status never writes accounting state.
const QUOTE_INBOX_KEY='tungcnc_quote_inbox_v215';
let inboxWritesPending=0;
function readQuoteInbox(){
 const raw=localStorage.getItem(QUOTE_INBOX_KEY);if(!raw)return [];
 let rows;try{rows=JSON.parse(raw)}catch{throw Error('Hộp thư có dữ liệu không đọc được; đã giữ nguyên, không tự đặt lại')}
 if(!Array.isArray(rows)||rows.some(x=>!x||!x.data||typeof x.data.transferId!=='string'||!['pending','later','rejected','accepted'].includes(x.status)))throw Error('Định dạng hộp thư không hợp lệ; không ghi đè dữ liệu cũ');
 if(new Set(rows.map(x=>x.data.transferId)).size!==rows.length)throw Error('Hộp thư có ID trùng; dữ liệu được giữ nguyên để đối chiếu');
 return rows;
}
function inboxSameCustomer(a,b){return normalizeName(a.customer?.name)===normalizeName(b.customer?.name)}
function inboxSameQuote(a,b){return a.data.transferId===b.data.transferId||(inboxSameCustomer(a.data,b.data)&&((a.fingerprint&&b.fingerprint&&a.fingerprint===b.fingerprint)||(a.data.source?.quoteCode&&normalizeName(a.data.source.quoteCode)===normalizeName(b.data.source?.quoteCode))))}
function inboxHasOrder(entry){return state.orders.some(o=>o.quoteTransferId===entry.data.transferId||(normalizeName(partner(o.partnerId)?.name)===normalizeName(entry.data.customer?.name)&&((entry.data.source?.quoteCode&&normalizeName(o.quoteSourceCode)===normalizeName(entry.data.source.quoteCode))||(entry.fingerprint&&o.quoteContentFingerprint===entry.fingerprint))))}
async function mutateQuoteInbox(change){
 if(!navigator.locks)throw Error('Hộp thư cần Chrome hỗ trợ khóa lưu trên HTTPS; hãy giữ tệp JSON gốc và thử lại bằng Chrome mới');
 inboxWritesPending++;try{await navigator.locks.request(QUOTE_INBOX_KEY,()=>{const rows=readQuoteInbox();change(rows);if(rows.length>500)throw Error('Hộp thư vượt 500 báo giá');localStorage.setItem(QUOTE_INBOX_KEY,JSON.stringify(rows))});updateQuoteInboxBadge()}finally{inboxWritesPending--}
}
function updateQuoteInboxBadge(){
 const el=document.getElementById('quoteInboxCount');if(!el)return;
 try{const n=readQuoteInbox().filter(x=>x.status==='pending'&&!inboxHasOrder(x)).length;el.textContent=n?'('+n+')':'';el.title='Báo giá được thêm qua tệp JSON trên thiết bị này'}catch(err){el.textContent='!';el.title=err.message}
}
async function addQuoteToInbox(input){
 const data=validateQuoteTransfer(input),fingerprint=await quoteFingerprint(data);
 if(quoteAlreadyImported(data,fingerprint))throw Error('Báo giá đã được tiếp nhận thành đơn');
 const entry={data,fingerprint,status:'pending',receivedAt:new Date().toISOString()};
 await mutateQuoteInbox(rows=>{if(rows.some(x=>inboxSameQuote(x,entry)))throw Error('Báo giá đã có trong hộp thư; hãy xem trạng thái của báo giá cũ');rows.push(entry)});
 tab('quote-inbox');toast('Đã lưu báo giá chờ; chưa tạo đơn công nợ');
}
async function queueQuoteFile(e){
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 try{
  if(file.size>16*1024*1024)throw Error('Tệp vượt 16 MB');
  const data=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
  if(data?.format==='tungcnc-quote-inbox')return await restoreQuoteInbox(data);
  if(file.size>2*1024*1024)throw Error('Tệp báo giá vượt 2 MB');
  await addQuoteToInbox(data);
 }catch(err){alert('Chưa thêm vào hộp thư: '+err.message)}
}
function quoteInboxView(){
 try{
  const rows=readQuoteInbox(),pending=rows.filter(x=>x.status==='pending'&&!inboxHasOrder(x)),processed=rows.filter(x=>!pending.includes(x));
  const actions=x=>`<button class="smallbtn" onclick="previewQueuedQuote('${jsid(x.data.transferId)}')">Xem / Tiếp nhận</button><button class="smallbtn" onclick="postponeQueuedQuote('${jsid(x.data.transferId)}')">Để sau</button><button class="smallbtn danger" onclick="rejectQueuedQuote('${jsid(x.data.transferId)}')">Từ chối</button>`;
  const cells=entries=>entries.map(x=>`<tr><td>${esc(x.data.customer?.name||'')}</td><td>${esc(x.data.source?.quoteCode||'Không có mã')}</td><td>${money(x.data.totals?.grandTotal||0)}</td><td>${actions(x)}</td></tr>`).join('');
  const status=x=>inboxHasOrder(x)?'Đã tiếp nhận':x.status==='later'?'Để sau':x.status==='rejected'?'Từ chối':x.status==='accepted'?'Đã tiếp nhận trước đây; chưa tìm thấy đơn hiện tại':'Chờ tiếp nhận';
  return `<div class="panel"><div class="split"><h2> Báo giá chờ tiếp nhận (${pending.length})</h2><button class="btn primary" onclick="document.getElementById('quoteInboxFile').click()">+ Thêm file báo giá JSON</button></div><p class="hint">Tại Báo Giá Nhanh, chọn Chuyển sang công nợ để xuất JSON, rồi thêm tệp tại đây. Chưa có tự đồng bộ giữa hai ứng dụng hoặc thiết bị. Chỉ tạo công nợ sau khi xác nhận tiếp nhận.</p>${table(['Khách hàng','Mã báo giá','Tổng tiền','Thao tác'],cells(pending))}<details><summary>Đã xử lý / Để sau (${processed.length})</summary>${table(['Khách hàng','Mã báo giá','Trạng thái','Thao tác'],processed.map(x=>`<tr><td>${esc(x.data.customer?.name||'')}</td><td>${esc(x.data.source?.quoteCode||'')}</td><td>${esc(status(x))}</td><td>${!inboxHasOrder(x)?`<button class="smallbtn" onclick="restoreQueuedQuote('${jsid(x.data.transferId)}')">Đưa lại vào chờ</button>`:''}</td></tr>`).join(''))}</details><div class="actions" style="margin-top:12px"><button class="btn" onclick="exportQuoteInbox()">Sao lưu hộp thư JSON</button></div><p class="hint">Hộp thư lưu riêng trên thiết bị. Giữ tệp báo giá gốc hoặc sao lưu hộp thư; để phục hồi, thêm tệp sao lưu bằng nút bên trên. Bản sao công nợ không bao gồm các báo giá chưa tiếp nhận.</p></div>`;
 }catch(err){return `<div class="panel warn">${esc(err.message)}. Dữ liệu hộp thư đang được giữ nguyên. Công nợ không bị thay đổi.</div>`}
}
async function previewQueuedQuote(transferId){
 try{const entry=readQuoteInbox().find(x=>x.data.transferId===transferId);if(!entry)throw Error('Không tìm thấy báo giá');if(entry.status!=='pending')throw Error('Hãy đưa báo giá lại vào chờ trước khi tiếp nhận');if(inboxHasOrder(entry))throw Error('Báo giá đã có đơn công nợ');await previewQuoteTransfer({target:{files:[new File([JSON.stringify(entry.data)],'bao-gia.json',{type:'application/json'})],value:''}})}catch(err){alert('Không mở được báo giá: '+err.message)}
}
async function setQueuedQuoteStatus(transferId,status){
 try{await mutateQuoteInbox(rows=>{const x=rows.find(x=>x.data.transferId===transferId);if(!x)throw Error('Không tìm thấy báo giá');if(inboxHasOrder(x))throw Error('Báo giá đã có đơn công nợ');x.status=status;x.updatedAt=new Date().toISOString()});render()}catch(err){alert('Chưa lưu trạng thái: '+err.message)}
}
async function postponeQueuedQuote(id){await setQueuedQuoteStatus(id,'later')}
async function restoreQueuedQuote(id){await setQueuedQuoteStatus(id,'pending')}
async function rejectQueuedQuote(id){if(confirm('Từ chối báo giá này? Báo giá được giữ trong danh sách đã xử lý; không xóa dữ liệu và không tạo công nợ.'))await setQueuedQuoteStatus(id,'rejected')}
async function markQuoteAccepted(transferId){
 try{if(!readQuoteInbox().some(x=>x.data.transferId===transferId))return;await mutateQuoteInbox(rows=>{const x=rows.find(x=>x.data.transferId===transferId);if(x){x.status='accepted';x.updatedAt=new Date().toISOString()}});if(current==='quote-inbox')render()}catch(err){alert('Đơn công nợ đã lưu, nhưng chưa cập nhật được hộp thư: '+err.message+'. Không tiếp nhận lại báo giá; hãy kiểm tra Đơn hàng.')}
}
function exportQuoteInbox(){try{download('TungGiang_HopThuBaoGia_'+today()+'.json',JSON.stringify({format:'tungcnc-quote-inbox',version:1,exportedAt:new Date().toISOString(),rows:readQuoteInbox()},null,2),'application/json')}catch(err){alert('Chưa sao lưu hộp thư: '+err.message)}}
async function restoreQuoteInbox(backup){
 if(backup.version!==1||!Array.isArray(backup.rows)||backup.rows.length>500)throw Error('Bản sao hộp thư không hợp lệ');
 const prepared=[];for(const row of backup.rows){if(!row||!['pending','later','rejected','accepted'].includes(row.status))throw Error('Trạng thái báo giá không hợp lệ');const data=validateQuoteTransfer(row.data);prepared.push({data,fingerprint:await quoteFingerprint(data),status:row.status,receivedAt:typeof row.receivedAt==='string'?row.receivedAt:new Date().toISOString()})}
 if(!confirm('Bổ sung '+prepared.length+' báo giá từ bản sao hộp thư? Mục đã có được giữ nguyên; chưa tạo công nợ.'))return;
 let added=0;await mutateQuoteInbox(rows=>{for(const entry of prepared)if(!rows.some(x=>inboxSameQuote(x,entry))){rows.push(entry);added++}});tab('quote-inbox');toast('Đã bổ sung '+added+' báo giá; chưa tạo công nợ');
}
window.addEventListener('storage',e=>{if(e.key===QUOTE_INBOX_KEY&&ready){updateQuoteInboxBadge();if(current==='quote-inbox')render()}});
function formQuickOrder(){
 modal('Tạo đơn nhanh',`<form onsubmit="submitQuickOrder(event)"><div class="fields"><label class="field wide">Tên khách hàng<input name="customerName" id="quickCustomer" required oninput="suggestPartners('quickCustomer','quickSuggest','customer')"><span id="quickSuggest" class="suggest"></span></label><label class="field wide">Nội dung<input name="title" required></label><label class="field">Số tiền (VNĐ)<input data-money name="amount" type="number" min="0" step="1" required></label></div><p class="hint">Tự ghi ngày hôm nay; có thể sửa đơn hoặc ghi nhận thu tiền sau.</p>${foot()}</form>`);
}
async function submitQuickOrder(e){
 e.preventDefault();if(!ready||saving)return;const before=structuredClone(state);
 try{const f=new FormData(e.target),name=String(f.get('customerName')||'').trim(),title=String(f.get('title')||'').trim(),amount=Number(f.get('amount'));if(!name||!title||!String(f.get('amount')||'').trim()||!Number.isSafeInteger(amount)||amount<0)throw Error('Kiểm tra tên khách, nội dung và số tiền');const p=getOrCreatePartner(name,'customer');state.orders.push({id:id(),partnerId:p.id,code:'TG-'+Date.now().toString(36).toUpperCase()+'-'+id().slice(0,8),title,amount,created:today(),due:'',note:'',updatedAt:new Date().toISOString()});if(await commit())closeModal(true);else state=before}catch(err){state=before;alert('Chưa tạo đơn nhanh; dữ liệu cũ được giữ nguyên. '+err.message)}
}

function assertQueuedQuoteAcceptable(transferId){if(inboxWritesPending)throw Error('Đang lưu trạng thái hộp thư. Hãy thử lại sau.');const x=readQuoteInbox().find(x=>x.data.transferId===transferId);if(x&&(x.status!=='pending'||inboxHasOrder(x)))throw Error('Báo giá đã đổi trạng thái. Hãy mở lại từ hộp thư trước khi tiếp nhận')}
