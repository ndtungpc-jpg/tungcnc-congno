'use strict';
let pendingBackupRestore=null;
async function importData(e){const file=e.target.files?.[0];if(!file)return;pendingBackupRestore=null;try{
 if(file.size>50*1024*1024)throw Error('Tệp lớn hơn 50 MB');const value=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
 if(value.app==='TungGiang-CongNo-Details')return await importOrderDetails(value);
 const parsed=TGBackupCheck.parseBackup(value);if(parsed.errors.length)throw Error(parsed.errors.slice(0,20).join('; '));
 if(!recordCount(parsed.data)&&!parsed.data.trash.length&&!parsed.data.recovery.some(r=>recordCount(r.data)||r.data.trash?.length))throw Error('Bản sao không chứa dữ liệu công nợ hoặc phục hồi');
 const hash=await TGBackupCheck.hashFile(file),durable=await readIntegritySource(),now=TGBackupCheck.summary(durable),diff=TGBackupCheck.compare(parsed.summary,now);
 pendingBackupRestore={file,hash,snapshot:JSON.stringify(committed)};
 const names={partners:'Tổng đối tác',customers:'Khách hàng',suppliers:'Nhà cung cấp',orders:'Đơn / phiếu nhập',customerOrders:'Đơn khách',supplierOrders:'Phiếu nhập NCC',payments:'Giao dịch',receipts:'Lần thu',disbursements:'Lần chi',received:'Đã thu',disbursed:'Đã trả NCC',receivable:'Phải thu',payable:'Phải trả'};
 const fmt=(k,v)=>v==null?'Không xác định':['received','disbursed','receivable','payable'].includes(k)?money(v):esc(v);
 modal('Xem trước phục hồi · Chưa ghi dữ liệu',`<p><b>Tệp:</b> ${esc(file.name)}</p><p>SHA-256: <code>${hash}</code></p>${table(['Chỉ tiêu','Bản sao','Hiện tại','Chênh lệch'],diff.map(x=>`<tr><td>${names[x.field]}</td><td>${fmt(x.field,x.backup)}</td><td>${fmt(x.field,x.current)}</td><td>${fmt(x.field,x.difference)}</td></tr>`).join(''))}<p>Nhật ký: ${parsed.data.audit.length} · Thùng rác: ${parsed.data.trash.length} · Bản phục hồi: ${parsed.data.recovery.length} · Thùng rác: ${parsed.data.trash.length} · Bản phục hồi: ${parsed.data.recovery.length}</p>${parsed.issues.length?'<p>Cảnh báo: '+parsed.issues.slice(0,20).map(esc).join('; ')+'</p>':''}<div class="warn">Xác nhận sẽ thay kho công nợ đang hoạt động bằng bản sao này, không cộng gộp. Dữ liệu trước nhập được giữ làm bản phục hồi trong cùng lần ghi. Hãy tải bản sao hiện tại trước khi tiếp tục.</div><div class="menu-grid"><button class="btn" onclick="exportData()">Sao lưu kho hiện tại trước</button><button class="btn primary" onclick="confirmBackupRestore()">Xác nhận phục hồi dữ liệu</button><button class="btn" onclick="pendingBackupRestore=null;closeModal(true)">Hủy · giữ dữ liệu hiện tại</button></div>`);
 }catch(err){alert('Không thể xem trước phục hồi: '+err.message)}finally{e.target.value=''}}
async function confirmBackupRestore(){const pending=pendingBackupRestore;if(!pending||saving||!ready)return;try{
 if(JSON.stringify(committed)!==pending.snapshot||JSON.stringify(state)!==JSON.stringify(committed))throw Error('Dữ liệu đã thay đổi sau xem trước. Chọn lại file để đối chiếu.');
 if(await TGBackupCheck.hashFile(pending.file)!==pending.hash)throw Error('File không còn khớp SHA-256');
 await applyBackupFile({target:{files:[pending.file],value:''}});
 }catch(err){alert('Chưa phục hồi: '+err.message)}}
