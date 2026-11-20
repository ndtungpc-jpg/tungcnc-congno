'use strict';
// Pure inspection: never normalizes, migrates, repairs or writes accounting records.
function integrityReport(source){
 const s=source===undefined?state:source,errors=[],warnings=[];
 const report=(summary)=>({app:'TungGiang-CongNo-Integrity',version:'2.1.4',checkedAt:new Date().toISOString(),storageMode:typeof storageMode==='string'?storageMode:'unknown',revision:Number.isSafeInteger(s?.revision)?s.revision:null,summary,errors,warnings,readOnly:true});
 const summary={partners:0,customers:0,suppliers:0,orders:0,payments:0,trash:0,recovery:0,audit:0,receivable:0,payable:0,orderAmount:0,paidAmount:0,complete:true};
 if(!s||typeof s!=='object'||Array.isArray(s)){errors.push('Kho dữ liệu không phải đối tượng hợp lệ');summary.complete=false;return report(summary)}
 const rows={},maps={};
 const numeric=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=Number.MAX_SAFE_INTEGER;
 const close=(a,b)=>Math.abs(a-b)<=0.01+Number.EPSILON*Math.max(Math.abs(a),Math.abs(b))*8;
 const moneyValue=(x,label,positive=false)=>{if(!numeric(x)||(positive&&x===0)){errors.push(label+': số tiền không hợp lệ');summary.complete=false;return false}return true};
 for(const kind of ['partners','orders','payments']){
  if(!Array.isArray(s[kind])){errors.push('Thiếu hoặc sai danh sách '+kind);summary.complete=false;rows[kind]=[]}else rows[kind]=s[kind];
  summary[kind]=rows[kind].length;maps[kind]=new Map();
  rows[kind].forEach((r,i)=>{const label=kind+'['+i+']';if(!r||typeof r!=='object'||Array.isArray(r)){errors.push(label+': bản ghi không hợp lệ');summary.complete=false;return}if(typeof r.id!=='string'||!r.id.trim()){errors.push(label+': thiếu ID');summary.complete=false;return}if(maps[kind].has(r.id)){errors.push(label+': ID trùng '+r.id);summary.complete=false}else maps[kind].set(r.id,r)});
 }
 for(const k of ['trash','recovery','audit']){if(s[k]!=null&&!Array.isArray(s[k])){errors.push('Sai danh sách '+k);summary.complete=false}else summary[k]=s[k]?.length||0}
 for(const [i,p]of rows.partners.entries()){if(!p||typeof p!=='object')continue;if(!['customer','supplier'].includes(p.type)||typeof p.name!=='string'||!p.name.trim()){errors.push('partners['+i+']: thiếu tên hoặc loại đối tác');summary.complete=false}else summary[p.type==='customer'?'customers':'suppliers']++}
 const paid=new Map();
 rows.payments.forEach((p,i)=>{if(!p||typeof p!=='object')return;const label='payments['+i+']';if(!maps.orders.has(p.orderId)){errors.push(label+': thiếu liên kết đơn hàng');summary.complete=false}if(moneyValue(p.amount,label,true)){paid.set(p.orderId,(paid.get(p.orderId)||0)+p.amount);summary.paidAmount+=p.amount}});
 const codes=new Set();
 rows.orders.forEach((o,i)=>{
  if(!o||typeof o!=='object')return;const label='orders['+i+']',p=maps.partners.get(o.partnerId);
  if(!p){errors.push(label+': thiếu liên kết khách/NCC');summary.complete=false}
  const valid=moneyValue(o.amount,label);if(valid)summary.orderAmount+=o.amount;
  const code=String(o.code||'').trim().toLocaleLowerCase('vi');if(code){if(codes.has(code))warnings.push(label+': mã đơn trùng '+code);codes.add(code)}
  const collected=paid.get(o.id)||0;if(valid&&collected>o.amount+0.001)errors.push(label+': thanh toán vượt giá trị đơn');if(o.cancelled&&collected>0)errors.push(label+': đơn đã hủy còn thanh toán');
  if(valid&&p&&!o.cancelled){const debt=o.amount-collected;if(p.type==='customer')summary.receivable+=debt;else if(p.type==='supplier')summary.payable+=debt}
  if(o.quoteItems!=null&&!Array.isArray(o.quoteItems)){errors.push(label+': danh sách hạng mục không hợp lệ');return}
  if(Array.isArray(o.quoteItems)){
   if(!o.quoteItems.length)warnings.push(label+': danh sách hạng mục rỗng');let subtotal=0,allAmounts=true;
   o.quoteItems.forEach((x,j)=>{
    const itemLabel=label+' hạng mục '+(j+1);if(!x||typeof x!=='object'){errors.push(itemLabel+': hạng mục không hợp lệ');allAmounts=false;return}
    if(typeof x.name!=='string'||!x.name.trim())warnings.push(itemLabel+': thiếu tên');
    for(const k of ['quantity','unitPrice','amount'])if(!numeric(x[k])){errors.push(itemLabel+': '+k+' không hợp lệ');if(k==='amount')allAmounts=false}
    if(numeric(x.amount))subtotal+=x.amount;
    if(numeric(x.quantity)&&numeric(x.unitPrice)&&numeric(x.amount)&&!close(x.quantity*x.unitPrice,x.amount))errors.push(itemLabel+': thành tiền không khớp khối lượng × đơn giá');
    if(!Array.isArray(x.sizes)||!x.sizes.length){warnings.push(itemLabel+': thiếu dữ liệu kích thước');return}
    let quantity=0,validSizes=true;const known=['m2','meter','frame','set','piece','manual'].includes(x.type);if(!known)warnings.push(itemLabel+': loại tính giá chưa nhận diện');
    x.sizes.forEach((z,k)=>{const sizeLabel=itemLabel+' kích thước '+(k+1);if(!z||typeof z!=='object'){warnings.push(sizeLabel+': dữ liệu không hợp lệ');validSizes=false;return}const read=v=>(typeof v==='number'||typeof v==='string')&&String(v).trim()!==''&&numeric(Number(v))?Number(v):null;
     const n=read(z.count),w=read(z.widthMm),h=read(z.heightMm);if(n===null||n<=0){warnings.push(sizeLabel+': thiếu hoặc sai số lượng');validSizes=false}
     if(['m2','meter','frame'].includes(x.type)&&(w===null||w<=0)){warnings.push(sizeLabel+': thiếu hoặc sai rộng/dài');validSizes=false}
     if(['m2','frame'].includes(x.type)&&(h===null||h<=0)){warnings.push(sizeLabel+': thiếu hoặc sai chiều cao');validSizes=false}
     if(n!==null)quantity+=x.type==='m2'?(w||0)*(h||0)/1e6*n:x.type==='meter'?(w||0)/1000*n:n;
    });
    if(known&&validSizes&&numeric(x.quantity)&&!close(quantity,x.quantity))errors.push(itemLabel+': khối lượng không khớp kích thước');
   });
   const t=o.quoteTotals;if(!t||typeof t!=='object')warnings.push(label+': thiếu tổng tiền chi tiết');else{
    const fields=['subtotal','discount','shipping','vatPercent','vatAmount','grandTotal'];const good=fields.every(k=>numeric(t[k]));if(!good)errors.push(label+': tổng tiền chi tiết không hợp lệ');else{
     if(t.discount>t.subtotal||t.vatPercent>100)errors.push(label+': giảm giá/VAT không hợp lệ');
     if(allAmounts&&!close(subtotal,t.subtotal))errors.push(label+': tổng hạng mục không khớp tiền hàng');
     const base=t.subtotal-t.discount+t.shipping;if(!close(base*t.vatPercent/100,t.vatAmount)||!close(base+t.vatAmount,t.grandTotal))errors.push(label+': giảm giá/vận chuyển/VAT không khớp');
     if(valid&&Math.round(t.grandTotal)!==o.amount)errors.push(label+': tổng chi tiết không khớp giá trị đơn');
    }
   }
  }
 });
 if(!Number.isFinite(summary.receivable)||!Number.isFinite(summary.payable)||Math.abs(summary.orderAmount)>Number.MAX_SAFE_INTEGER||Math.abs(summary.paidAmount)>Number.MAX_SAFE_INTEGER){errors.push('Tổng tiền vượt miền tính toán an toàn');summary.complete=false}
 if(!summary.complete){warnings.push('Dữ liệu có lỗi cấu trúc hoặc số tiền; tổng công nợ không đủ tin cậy để đối chiếu');summary.receivable=null;summary.payable=null}
 return report(summary);
}
async function readIntegritySource(){
 if(db)return new Promise((resolve,reject)=>{try{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get('main');r.onsuccess=()=>resolve(r.result??state);r.onerror=()=>reject(r.error);tx.onabort=()=>reject(tx.error||Error('Không đọc được kho dữ liệu'))}catch(e){reject(e)}});
 if(typeof storageMode!=='undefined'&&storageMode==='localstorage'){const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):state}
 return state;
}
async function currentIntegrityReport(){try{return integrityReport(await readIntegritySource())}catch(err){const r=integrityReport(null);r.errors.unshift('Không đọc được kho dữ liệu: '+err.message);return r}}
async function showIntegrityReport(){
 const r=await currentIntegrityReport(),s=r.summary,amount=v=>v===null?'Chưa thể xác định':money(v);
 modal('Đối soát dữ liệu · Chỉ đọc',`<p>Kho: ${esc(r.storageMode)} · Lần ghi: ${esc(r.revision??'Không rõ')}</p><p>Khách/NCC: <b>${s.partners}</b> · Đơn: <b>${s.orders}</b> · Thu/chi: <b>${s.payments}</b></p><p>Phải thu: <b>${amount(s.receivable)}</b> · Phải trả: <b>${amount(s.payable)}</b></p><p>Lỗi: <b>${r.errors.length}</b> · Cảnh báo: <b>${r.warnings.length}</b></p>${r.errors.length?'<h3>Lỗi cần đối chiếu</h3><ul>'+r.errors.slice(0,100).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':''}${r.warnings.length?'<h3>Cảnh báo</h3><ul>'+r.warnings.slice(0,100).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':''}<p class="hint">Chỉ đọc: không tự sửa, không xóa và không chuyển đổi dữ liệu. Báo cáo không thay thế bản sao lưu JSON.</p><div class="actions"><button class="btn" data-integrity-readonly onclick="exportIntegrityReport()">Tải báo cáo</button><button class="btn" data-integrity-readonly onclick="closeModal()">Đóng</button></div>`);
}
async function exportIntegrityReport(){download('TungGiang_DoiSoat_v2.1.4_'+today()+'.json',JSON.stringify(await currentIntegrityReport(),null,2),'application/json')}
