// Read-only projection of existing audit snapshots. Never updates audit/accounting data.
(function(root){'use strict';
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const labels={name:'Tên',type:'Loại',phone:'Số điện thoại',address:'Địa chỉ',salutation:'Xưng hô',note:'Ghi chú',code:'Mã đơn / phiếu',title:'Nội dung',partnerId:'Đối tác',orderId:'Đơn liên quan',amount:'Thành tiền',created:'Ngày tạo / nhập',due:'Hạn thanh toán',date:'Ngày thanh toán',method:'Hình thức thanh toán',cancelled:'Trạng thái',material:'Vật liệu',quantity:'Số lượng',basisQuantity:'Khối lượng',unit:'Đơn vị tính',unitPrice:'Đơn giá',widthMm:'Rộng (mm)',heightMm:'Cao (mm)',count:'Số lượng',description:'Mô tả',core:'Loại cốt',finish:'Mặt phủ',spec:'Quy cách',thickness:'Độ dày',group:'Nhóm vật tư',discount:'Giảm giá',shipping:'Vận chuyển',vatPercent:'Thuế (%)',vatAmount:'Tiền thuế',subtotal:'Tiền hàng',grandTotal:'Tổng thanh toán',summary:'Nội dung',partners:'Số đối tác',orders:'Số đơn hàng',payments:'Số thanh toán',records:'Số bản ghi'};
const containers={quoteItems:'Hạng mục',purchaseItems:'Vật tư',sizes:'Kích thước',quoteTotals:'Tổng tiền'};
const moneyKeys=new Set(['amount','unitPrice','discount','shipping','vatAmount','subtotal','grandTotal']);
const uuid=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const clean=v=>String(v??'').replace(/\s*·\s*(Phân bổ|Chi NCC)\s+[^\s]+\s*$/iu,'').replace(uuid,'').trim();
function when(v){if(!v)return 'Không rõ thời điểm';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('vi-VN'):'Không rõ thời điểm';}
function lookup(source,kind,id){if(!id)return null;const current=(source[kind]||[]).find(r=>r.id===id);if(current)return current;const removed=(source.trash||[]).find(t=>t.kind===kind&&t.record?.id===id)?.record;if(removed)return removed;for(const a of [...(source.audit||[])].reverse())if(a.kind===kind&&a.recordId===id&&(a.after||a.before))return a.after||a.before;return null;}
function project(a,source){
 const record=a.after||a.before||{},o=a.kind==='orders'?record:a.kind==='payments'?lookup(source,'orders',record.orderId):null,p=a.kind==='partners'?record:lookup(source,'partners',o?.partnerId),supplier=p?.type==='supplier';
 const kind=a.kind==='partners'?(supplier?'Nhà cung cấp':'Khách hàng'):a.kind==='orders'?(supplier?'Phiếu nhập hàng':'Đơn hàng'):a.kind==='payments'?(supplier?'Phiếu chi NCC':'Phiếu thu'):a.kind==='backup'?'Dữ liệu':'Hoạt động';
 const verb={create:'Tạo',update:'Sửa',delete:'Chuyển vào thùng rác',restore:'Khôi phục',cancel:'Hủy',import:'Nhập / khôi phục dữ liệu'}[a.action]||'Cập nhật';
 const object=[clean(p?.name),a.kind!=='partners'?clean(o?.code):'',a.kind==='orders'?clean(record.title):''].filter(Boolean).join(' · ')||clean(record.summary).replace(/JSON/gi,'dữ liệu')||'Đối tượng không còn trong sổ';
 function value(key,v){if(key==='date'&&a.kind==='payments'&&typeof root.paymentDateInfo==='function')return root.paymentDateInfo({...record,date:v}).label;if(key==='cancelled')return v?'Đã hủy':'Đang hoạt động';if(v===undefined||v===null||v==='')return 'Chưa có';if(key==='partnerId'){const pt=lookup(source,'partners',v);return clean(pt?.name)||'Đối tác không còn trong sổ';}if(key==='orderId'){const ord=lookup(source,'orders',v);return ord?[clean(ord.code),clean(ord.title)].filter(Boolean).join(' · ')||'Đơn hàng':'Đơn không còn trong sổ';}if(moneyKeys.has(key)&&(typeof v==='number'||/^-?\d+(?:\.\d+)?$/.test(String(v))))return new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v));if(['date','created','due'].includes(key)){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));return m?m[3]+'/'+m[2]+'/'+m[1]:'Chưa rõ ngày';}if(key==='cancelled')return v?'Đã hủy':'Đang hoạt động';if(key==='salutation')return ({anh_chi:'Anh/chị',anh:'Anh',chi:'Chị',chu:'Chú',co:'Cô',bac:'Bác',em:'Em',none:'Không xưng hô',auto:'Mặc định'})[v]||'Cách xưng hô khác';if(key==='type')return ({customer:'Khách hàng',supplier:'Nhà cung cấp',m2:'Mét vuông',md:'Mét dài',manual:'Nhập tay',frame:'Khung',khung:'Khung',set:'Bộ',bo:'Bộ',piece:'Cái',cai:'Cái'})[v]||clean(v);if(key==='group')return ({wood:'Ván / Gỗ',paint:'Xăng / Sơn / Dung môi',free:'Phụ kiện / Nhập tự do'})[v]||'Vật tư';if(typeof v==='boolean')return v?'Có':'Không';if(typeof v==='number'||(['quantity','basisQuantity','widthMm','heightMm','count','thickness','vatPercent'].includes(key)&&/^-?\d+(?:\.\d+)?$/.test(String(v))))return new Intl.NumberFormat('vi-VN',{maximumFractionDigits:6}).format(v);return clean(v).replace(key==='summary'?/JSON/gi:/$^/g,'dữ liệu')||'Chưa có';}
 const rows=[],editing=a.action==='update'||a.action==='cancel';
 function visit(before,after,prefix=''){
  for(const key of new Set([...Object.keys(before||{}),...Object.keys(after||{})])){
   const left=before?.[key],right=after?.[key];if(editing&&canonical(left)===canonical(right))continue;
   if(containers[key]){if(Array.isArray(left)||Array.isArray(right)){for(let i=0;i<Math.max(left?.length||0,right?.length||0);i++)visit(left?.[i],right?.[i],prefix+containers[key]+' '+(i+1)+' · ');}else visit(left,right,prefix+containers[key]+' · ');continue;}
   if(!labels[key]||typeof (right??left)==='object')continue;
   rows.push({label:prefix+labels[key],before:value(key,left),after:value(key,right)});
  }
 }
 visit(a.before,a.after);
 return {action:a.action==='import'?verb:verb+' '+kind.toLocaleLowerCase('vi-VN'),kind,object,at:when(a.at),editing,deleted:a.action==='delete',rows};
}
root.TGAuditDisplay={project};if(typeof module!=='undefined')module.exports=root.TGAuditDisplay;
})(globalThis);
