'use strict';
let pendingQuoteTransfer=null,quotePreviewSerial=0;
function quoteNumber(v,label){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>Number.MAX_SAFE_INTEGER)throw Error(label+' không hợp lệ');return v}
function quoteText(v,label,max=1000){if(v==null)return '';if(typeof v!=='string'||v.length>max)throw Error(label+' không hợp lệ');return v.trim()}
function quoteClose(a,b){return Math.abs(a-b)<=0.01+Number.EPSILON*Math.max(Math.abs(a),Math.abs(b))*8}
function validateQuoteTransfer(raw){
 if(!raw||raw.format!=='tungcnc-quote-to-debt'||raw.schemaVersion!==1)throw Error('Không đúng định dạng chuyển báo giá');
 const transferId=quoteText(raw.transferId,'Mã chuyển',200);if(!transferId)throw Error('Thiếu mã chuyển báo giá');
 const name=quoteText(raw.customer?.name,'Tên khách',300);if(!name)throw Error('Thiếu tên khách hàng');
 const phone=quoteText(raw.customer?.phone,'Điện thoại',100),sourceCode=quoteText(raw.source?.quoteCode,'Mã báo giá',200);
 const sourceDate=quoteText(raw.source?.quoteDate,'Ngày báo giá',10);if(!sourceDate||excelDate(sourceDate)!==sourceDate)throw Error('Ngày báo giá không hợp lệ');
 if(!Array.isArray(raw.items)||!raw.items.length||raw.items.length>300)throw Error('Cần từ 1 đến 300 hạng mục');
 const items=raw.items.map((x,i)=>{
  if(!x||typeof x!=='object')throw Error('Hạng mục '+(i+1)+' không hợp lệ');
  const itemName=quoteText(x.name,'Tên hạng mục',1000);if(!itemName)throw Error('Hạng mục thiếu tên');
  const quantity=quoteNumber(x.quantity,'Khối lượng'),unitPrice=quoteNumber(x.unitPrice,'Đơn giá'),amount=quoteNumber(x.amount,'Thành tiền');
  if(!quoteClose(quantity*unitPrice,amount))throw Error('Thành tiền hạng mục '+(i+1)+' không khớp khối lượng × đơn giá');
  const sizes=x.sizes??[];if(!Array.isArray(sizes)||sizes.length>1000)throw Error('Kích thước hạng mục không hợp lệ');
  const dimensions=sizes.map(z=>{if(!z||typeof z!=='object')throw Error('Kích thước không hợp lệ');const read=(v,k)=>{if(v==null||v==='')return '';if(typeof v==='string'&&!/^\d+(\.\d+)?$/.test(v.trim()))throw Error(k+' không hợp lệ');return quoteNumber(Number(v),k)};return {widthMm:read(z.widthMm,'Rộng'),heightMm:read(z.heightMm,'Cao'),count:quoteNumber(z.count,'Số lượng'),description:quoteText(z.description,'Mô tả kích thước',2000)}});
  return {index:i+1,name:itemName,core:quoteText(x.core,'Cốt',300),finish:quoteText(x.finish,'Mặt phủ',300),type:quoteText(x.type,'Loại',100),unit:quoteText(x.unit,'ĐVT',30),quantity,unitPrice,amount,sizes:dimensions};
 });
 const t={};for(const k of ['subtotal','discount','shipping','vatPercent','vatAmount','grandTotal'])t[k]=quoteNumber(raw.totals?.[k],k);
 if(t.vatPercent>100||t.discount>t.subtotal)throw Error('Giảm giá hoặc VAT không hợp lệ');
 const subtotal=items.reduce((n,x)=>n+x.amount,0),base=t.subtotal-t.discount+t.shipping;
 if(!Number.isSafeInteger(Math.round(subtotal))||!Number.isSafeInteger(Math.round(t.grandTotal)))throw Error('Số tiền quá lớn');
 if(!quoteClose(subtotal,t.subtotal)||!quoteClose(base*t.vatPercent/100,t.vatAmount)||!quoteClose(base+t.vatAmount,t.grandTotal))throw Error('Tổng tiền không khớp; hãy xuất lại báo giá');
 if(raw.payment?.paid!=null&&quoteNumber(raw.payment.paid,'Tiền đã trả')!==0)throw Error('Tệp có tiền đã trả. Hãy xuất tệp chuyển với tiền đã trả bằng 0 và ghi nhận riêng qua Thu khách.');
 return {format:raw.format,schemaVersion:1,transferId,source:{app:'BaoGiaNhanh',quoteCode:sourceCode,quoteDate:sourceDate},customer:{name,phone},items,totals:t,note:quoteText(raw.note,'Ghi chú',10000)};
}
async function quoteFingerprint(d){
 const content=JSON.stringify({source:d.source,items:d.items,totals:d.totals});
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
function quoteAlreadyImported(d,fingerprint,partnerId=''){
 const code=normalizeName(d.source.quoteCode),customer=normalizeName(d.customer.name);
 return state.orders.some(o=>o.quoteTransferId===d.transferId||((partnerId?o.partnerId===partnerId:normalizeName(partner(o.partnerId)?.name||'')===customer)&&((code&&normalizeName(o.quoteSourceCode)===code)||o.quoteContentFingerprint===fingerprint)));
}
async function previewQuoteTransfer(e){
 const serial=++quotePreviewSerial,file=e.target.files?.[0];e.target.value='';pendingQuoteTransfer=null;if(!file)return;
 try{
  if(!ready||saving)throw Error('Đang tải hoặc lưu dữ liệu, vui lòng thử lại');
  if(file.size>2*1024*1024)throw Error('Tệp vượt quá 2 MB');
  const d=validateQuoteTransfer(JSON.parse(await file.text())),fingerprint=await quoteFingerprint(d);if(serial!==quotePreviewSerial)return;
  if(quoteAlreadyImported(d,fingerprint))throw Error('Báo giá này đã được nhập (trùng mã chuyển, mã báo giá hoặc nội dung).');
  const customers=state.partners.filter(p=>p.type==='customer'),matches=customers.filter(p=>normalizeName(p.name)===normalizeName(d.customer.name));
  const choices=[...customers].sort((a,b)=>a.name.localeCompare(b.name,'vi')).map(p=>`<option value="${esc(p.id)}" ${matches.length===1&&matches[0].id===p.id?'selected':''}>${esc(p.name)}</option>`).join('');
  const rows=d.items.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}<div class="muted">${esc([x.core,x.finish].filter(Boolean).join(' / '))}</div></td><td>${x.sizes.map(z=>esc([z.widthMm?z.widthMm+' mm':'',z.heightMm?z.heightMm+' mm':'',z.count+' chiếc',z.description].filter(Boolean).join(' × '))).join('<br>')}</td><td>${esc(new Intl.NumberFormat('vi-VN',{maximumFractionDigits:6}).format(x.quantity)+' '+x.unit)}</td><td>${money(x.unitPrice)}</td><td>${money(x.amount)}</td></tr>`).join('');
  pendingQuoteTransfer={data:d,fingerprint,snapshot:JSON.stringify(state)};
  modal('Xem trước báo giá chuyển công nợ',`<p><b>Khách:</b> ${esc(d.customer.name)} · <b>Mã BG:</b> ${esc(d.source.quoteCode||'Không có')} · <b>Ngày:</b> ${date(d.source.quoteDate)}</p><label class="field">Ghép khách hàng<select id="quoteTransferPartner"><option value="">Tạo khách mới: ${esc(d.customer.name)}</option>${choices}</select></label>${table(['STT','Hạng mục / Vật liệu','Kích thước','Khối lượng/ĐVT','Đơn giá','Thành tiền'],rows)}<p>Tiền hàng: <b>${money(d.totals.subtotal)}</b> · Giảm: ${money(d.totals.discount)} · Vận chuyển: ${money(d.totals.shipping)} · VAT (${d.totals.vatPercent}%): ${money(d.totals.vatAmount)}</p><p><b>Tổng tạo công nợ: ${money(Math.round(d.totals.grandTotal))}</b></p><p class="hint">Tạo một đơn tổng hợp, lưu đầy đủ chi tiết hạng mục và bản phục hồi trước nhập. Không ghi nhận tiền cọc; dùng Thu khách để ghi nhận sau.</p><div class="actions"><button class="btn primary" onclick="confirmQuoteTransfer()">Xác nhận tạo đơn</button><button class="btn" onclick="pendingQuoteTransfer=null;closeModal()">Hủy</button></div>`);
 }catch(err){if(serial===quotePreviewSerial){pendingQuoteTransfer=null;alert('Không thể nhập báo giá: '+err.message)}}
}
async function confirmQuoteTransfer(){
 const pending=pendingQuoteTransfer;if(!pending||saving||!ready)return;
 if(JSON.stringify(state)!==pending.snapshot){pendingQuoteTransfer=null;alert('Dữ liệu đã thay đổi sau khi xem trước. Hãy chọn lại tệp báo giá.');return}
 const before=structuredClone(state);
 try{
  const d=validateQuoteTransfer(pending.data),chosen=document.getElementById('quoteTransferPartner')?.value||'';
  if(chosen&&!state.partners.some(p=>p.id===chosen&&p.type==='customer'))throw Error('Khách hàng được chọn không còn tồn tại');
  if(quoteAlreadyImported(d,pending.fingerprint,chosen))throw Error('Báo giá đã được nhập; không tạo đơn trùng');
  const now=new Date().toISOString(),batchId=id(),snapshot=structuredClone(before);delete snapshot.recovery;
  state.recovery.push({id:batchId,at:now,data:snapshot,source:'quote-transfer',summary:'Trước khi nhập báo giá '+(d.source.quoteCode||d.transferId)});
  let pid=chosen;if(!pid){pid=id();state.partners.push({id:pid,name:d.customer.name,type:'customer',phone:d.customer.phone,note:'Tạo từ Báo Giá Nhanh'})}
  const details=d.items.map((x,i)=>`${i+1}. ${x.name} | ${[x.core,x.finish].filter(Boolean).join(' / ')} | ${x.quantity} ${x.unit} × ${money(x.unitPrice)} = ${money(x.amount)}\n${x.sizes.map(z=>[z.widthMm?z.widthMm+' mm':'',z.heightMm?z.heightMm+' mm':'',z.count+' chiếc',z.description].filter(Boolean).join(' × ')).join('; ')}`).join('\n');
  const note=['Nguồn: Báo Giá Nhanh',d.source.quoteCode?'Mã báo giá: '+d.source.quoteCode:'',details,`Giảm giá: ${money(d.totals.discount)}; Vận chuyển: ${money(d.totals.shipping)}; VAT (${d.totals.vatPercent}%): ${money(d.totals.vatAmount)}`,d.note].filter(Boolean).join('\n');
  state.orders.push({id:id(),partnerId:pid,code:'BG-'+Date.now().toString(36).toUpperCase()+'-'+id().slice(0,8),title:'Báo giá '+d.source.quoteCode+' · '+d.items.map(x=>x.name).slice(0,2).join(', '),amount:Math.round(d.totals.grandTotal),created:d.source.quoteDate,due:'',note,quoteTransferId:d.transferId,quoteSourceCode:d.source.quoteCode,quoteContentFingerprint:pending.fingerprint,quoteItems:structuredClone(d.items),quoteTotals:structuredClone(d.totals),quoteImportedAt:now,updatedAt:now});
  pendingQuoteTransfer=null;closeModal();if(await commit('quote-transfer'))toast('Đã nhập báo giá; đã lưu bản phục hồi trước nhập');else state=before;
 }catch(err){state=before;alert('Chưa nhập báo giá; dữ liệu cũ được giữ nguyên. '+err.message)}
}
