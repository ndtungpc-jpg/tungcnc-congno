'use strict';
// Read-only preflight. No storage writes and no normalization of the source.
const TGBackupCheck=(()=>{
 const fields=['partners','customers','suppliers','orders','customerOrders','supplierOrders','payments','receipts','disbursements','received','disbursed','receivable','payable'];
 function summary(data){const r=integrityReport(data),s={...r.summary,customerOrders:0,supplierOrders:0,receipts:0,disbursements:0,received:0,disbursed:0};const partners=new Map((data.partners||[]).map(p=>[p.id,p]));const orders=new Map((data.orders||[]).map(o=>[o.id,o]));for(const o of data.orders||[]){const t=partners.get(o.partnerId)?.type;if(t==='customer')s.customerOrders++;if(t==='supplier')s.supplierOrders++}for(const p of data.payments||[]){const t=partners.get(orders.get(p.orderId)?.partnerId)?.type;if(t==='customer'){s.receipts++;s.received+=p.amount}if(t==='supplier'){s.disbursements++;s.disbursed+=p.amount}}return s}
 function parseBackup(input){
  if(!input||input.app!=='TungGiang-CongNo'||![1,2].includes(input.version))throw Error('Không đúng định dạng/phiên bản bản sao lưu công nợ');
  const errors=[],warnings=[];let count=0;const seen=new WeakSet();
  function inspect(data,depth,label){
   if(depth>12||++count>2000)throw Error('Quá nhiều tầng hoặc bản phục hồi; cần kiểm tra riêng, chưa cho nhập');
   if(!data||typeof data!=='object'||Array.isArray(data))throw Error(label+': thiếu dữ liệu');
   if(seen.has(data))throw Error(label+': vòng lặp dữ liệu');seen.add(data);
   if(data.schemaVersion!=null&&![1,2].includes(data.schemaVersion))throw Error(label+': schema không tương thích');
   const report=integrityReport(data);errors.push(...report.errors.map(x=>label+': '+x));warnings.push(...report.warnings.map(x=>label+': '+x));
   // Existing validation checks dates, text fields, trash records and references on a clone only.
   try{TGSafety.normalize(data)}catch(e){errors.push(label+': '+e.message)}
   for(const key of ['audit','recovery']){const ids=new Set();for(const row of data[key]||[]){if(!row||typeof row.id!=='string'||!row.id.trim()||ids.has(row.id))errors.push(label+': ID trống/trùng trong '+key);else ids.add(row.id)}}
   for(const r of data.recovery||[])inspect(r.data,depth+1,label+'/bản phục hồi '+String(r.id));
   seen.delete(data);
  }
  inspect(input.data,0,'Bản sao');
  const data=errors.length?null:TGSafety.normalize(input.data);
  return {data,summary:summary(input.data),errors:[...new Set(errors)],issues:[...new Set(warnings)],warnings:[...new Set(warnings)]};
 }
 function compare(a,b){return fields.map(field=>({field,backup:a[field],current:b[field],difference:a[field]==null||b[field]==null?null:a[field]-b[field]}))}
 async function hashFile(file){if(file.size>50*1024*1024)throw Error('Tệp lớn hơn 50 MB');const bytes=await file.arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')}
 return {parseBackup,summary,compare,hashFile};
})();
let checkedBackupHash=null;
async function inspectBackupFile(e){const file=e.target.files?.[0];if(!file)return;checkedBackupHash=null;try{
 if(file.size>50*1024*1024)throw Error('Tệp lớn hơn 50 MB');
 const hash=await TGBackupCheck.hashFile(file),parsed=TGBackupCheck.parseBackup(JSON.parse((await file.text()).replace(/^\uFEFF/,'')));
 const currentData=await readIntegritySource(),diff=TGBackupCheck.compare(parsed.summary,TGBackupCheck.summary(currentData));
 const names={partners:'Tổng đối tác',customers:'Khách hàng',suppliers:'Nhà cung cấp',orders:'Tổng đơn / phiếu nhập',customerOrders:'Đơn khách',supplierOrders:'Phiếu nhập NCC',payments:'Tổng giao dịch',receipts:'Giao dịch thu',disbursements:'Giao dịch chi',received:'Tổng đã thu',disbursed:'Tổng đã trả NCC',receivable:'Còn phải thu',payable:'Còn phải trả'};
 const value=(f,v)=>v==null?'Không xác định':['received','disbursed','receivable','payable'].includes(f)?money(v):esc(v);
 checkedBackupHash=hash;
 modal('Kiểm tra bản sao lưu · Không nhập',`<p><b>Tệp:</b> ${esc(file.name)}</p><p>SHA-256 của byte gốc: <code style="overflow-wrap:anywhere">${hash}</code></p><label class="field">SHA-256 đã lưu trước đây (nếu có)<input id="expectedBackupHash" maxlength="64" autocomplete="off"></label><button class="btn" data-integrity-readonly onclick="compareBackupHash()">Đối chiếu SHA-256</button><p id="backupHashResult" role="status"></p>${table(['Chỉ tiêu','Bản sao','Đang dùng','Chênh lệch'],diff.map(x=>`<tr><td>${names[x.field]}</td><td>${value(x.field,x.backup)}</td><td>${value(x.field,x.current)}</td><td>${value(x.field,x.difference)}</td></tr>`).join(''))}<p><b>${parsed.errors.length?'Không đủ điều kiện phục hồi':'Đã qua kiểm tra cấu trúc'}:</b> ${parsed.errors.length} lỗi · ${parsed.issues.length} cảnh báo</p>${[...parsed.errors,...parsed.issues].length?'<ul>'+[...parsed.errors,...parsed.issues].slice(0,50).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':''}<p class="hint">Chỉ đọc, không nhập hoặc sửa dữ liệu. SHA-256 không mã hóa file và không chứng minh nguồn gốc hay tính đầy đủ. Bản sao JSON chưa được mã hóa; ai có file đều có thể đọc. Chênh lệch số liệu không tự động đồng nghĩa mất dữ liệu.</p><button class="btn" data-integrity-readonly onclick="closeModal()">Đóng</button>`);
 }catch(err){alert('Không thể kiểm tra bản sao lưu: '+err.message)}finally{e.target.value=''}}
function compareBackupHash(){const expected=String(document.getElementById('expectedBackupHash')?.value||'').trim().toLowerCase();document.getElementById('backupHashResult').textContent=!/^[a-f0-9]{64}$/.test(expected)?'Nhập đúng 64 ký tự SHA-256':expected===checkedBackupHash?'KHỚP SHA-256':'KHÔNG KHỚP — không phục hồi file này';}
