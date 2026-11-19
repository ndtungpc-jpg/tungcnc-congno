(function(root){
'use strict';
const clone=x=>structuredClone(x), kinds=['partners','orders','payments'];
function normalize(raw){
 if(!raw||!kinds.every(k=>Array.isArray(raw[k])))throw Error('Thiếu danh sách đối tác, đơn hoặc giao dịch');
 const s=clone(raw);
 if(s.schemaVersion>2)throw Error('Dữ liệu thuộc phiên bản mới hơn');
 s.schemaVersion=2;s.revision=Number.isSafeInteger(s.revision)?s.revision:0;
 s.trash=s.trash||[];s.audit=s.audit||[];s.recovery=s.recovery||[];
 validate(s);return s;
}
function validate(s){
 for(const k of ['trash','audit','recovery'])if(!Array.isArray(s[k]))throw Error('Sai định dạng '+k);
 const maps={};
 for(const k of kinds){
  if(!Array.isArray(s[k]))throw Error('Sai danh sách '+k);
  maps[k]=new Map();
  for(const r of s[k]){
   if(!r||typeof r.id!=='string'||!r.id||maps[k].has(r.id))throw Error('Mã trống hoặc trùng trong '+k);
   maps[k].set(r.id,r);
   if(k==='partners'&&(!['customer','supplier'].includes(r.type)||typeof r.name!=='string'||!r.name.trim()))throw Error('Đối tác không hợp lệ');
   if(k!=='partners'&&(typeof r.amount!=='number'||!Number.isFinite(r.amount)||r.amount<0||(k==='payments'&&r.amount===0)))throw Error('Số tiền không hợp lệ');
   for(const f of ['date','created','due'])if(r[f]&&(!/^\d{4}-\d{2}-\d{2}$/.test(r[f])||new Date(r[f]).toISOString().slice(0,10)!==r[f]))throw Error('Ngày không hợp lệ');
   for(const f of ['code','title','phone','note','method'])if(r[f]!=null&&typeof r[f]!=='string')throw Error('Trường văn bản không hợp lệ: '+f);
  }
 }
 for(const o of s.orders)if(!maps.partners.has(o.partnerId))throw Error('Đơn mất liên kết đối tác: '+o.id);
 for(const p of s.payments)if(!maps.orders.has(p.orderId))throw Error('Giao dịch mất liên kết đơn: '+p.id);
 const tids=new Set();
 for(const t of s.trash){
  if(!t||typeof t.id!=='string'||tids.has(t.id)||!kinds.includes(t.kind)||!t.record||typeof t.record.id!=='string'||typeof t.deletedAt!=='string')throw Error('Thùng rác không hợp lệ');
  const r=t.record;
  if(t.kind==='partners'&&(!['customer','supplier'].includes(r.type)||typeof r.name!=='string'||!r.name.trim()))throw Error('Đối tác trong thùng rác không hợp lệ');
  if(t.kind!=='partners'&&(typeof r.amount!=='number'||!Number.isFinite(r.amount)||r.amount<0||(t.kind==='payments'&&r.amount===0)))throw Error('Số tiền trong thùng rác không hợp lệ');
  tids.add(t.id);
 }
 for(const a of s.audit)if(!a||typeof a.id!=='string'||typeof a.at!=='string'||typeof a.action!=='string')throw Error('Nhật ký không hợp lệ');
 for(const r of s.recovery)if(!r||!r.data||!kinds.every(k=>Array.isArray(r.data[k])))throw Error('Bản phục hồi không hợp lệ');
 return s;
}
function issues(s){
 const result=[];
 for(const o of s.orders){const sum=s.payments.filter(p=>p.orderId===o.id).reduce((a,p)=>a+p.amount,0);
  if(sum>o.amount+0.000001)result.push('Thanh toán vượt giá trị đơn '+(o.code||o.id));
  if(o.cancelled&&sum>0)result.push('Đơn đã hủy còn thanh toán '+(o.code||o.id));
 }
 const codes=new Set();for(const o of s.orders){if(o.code&&codes.has(o.code))result.push('Trùng mã đơn '+o.code);codes.add(o.code)}
 return result;
}
function trash(s,kind,rid,meta){
 const r=s[kind].find(x=>x.id===rid);if(!r)throw Error('Không tìm thấy bản ghi');
 if(kind==='partners'&&s.orders.some(o=>o.partnerId===rid))throw Error('Đối tác còn đơn hàng. Xử lý đơn trước.');
 if(kind==='orders'&&s.payments.some(p=>p.orderId===rid))throw Error('Đơn còn giao dịch. Chuyển giao dịch vào thùng rác trước.');
 s.trash.push({id:meta.id,kind,record:clone(r),deletedAt:meta.at,reason:meta.reason||'',device:meta.device});
 s[kind]=s[kind].filter(x=>x.id!==rid);
}
function restore(s,tid){
 const t=s.trash.find(x=>x.id===tid);if(!t)throw Error('Không tìm thấy trong thùng rác');
 const r=t.record;
 if(s[t.kind].some(x=>x.id===r.id))throw Error('Đã có bản ghi cùng mã, không thể khôi phục trùng');
 if(t.kind==='orders'){
  if(!s.partners.some(p=>p.id===r.partnerId))throw Error('Khôi phục đối tác trước');
  if(r.code&&s.orders.some(o=>o.code===r.code))throw Error('Mã đơn đã được sử dụng');
 }
 if(t.kind==='payments'){
  const o=s.orders.find(o=>o.id===r.orderId);if(!o)throw Error('Khôi phục đơn hàng trước');
  if(o.cancelled)throw Error('Không khôi phục thanh toán vào đơn đã hủy');
  const sum=s.payments.filter(p=>p.orderId===o.id).reduce((a,p)=>a+p.amount,0);
  if(sum+r.amount>o.amount+0.000001)throw Error('Khôi phục sẽ gây thanh toán vượt công nợ');
 }
 const candidate=clone(s);candidate[t.kind].push(clone(r));candidate.trash=candidate.trash.filter(x=>x.id!==tid);validate(candidate);
 s[t.kind]=candidate[t.kind];s.trash=candidate.trash;
}
function changes(before,after,meta){
 const out=[];
 for(const k of kinds){const old=new Map(before[k].map(r=>[r.id,r])),next=new Map(after[k].map(r=>[r.id,r]));
  for(const rid of new Set([...old.keys(),...next.keys()])){
   const b=old.get(rid)||null,a=next.get(rid)||null;if(JSON.stringify(b)===JSON.stringify(a))continue;
   let action=!b?'create':!a?'delete':(!b.cancelled&&a.cancelled)?'cancel':'update';
   if(!b&&before.trash.some(t=>t.kind===k&&t.record.id===rid))action='restore';
   out.push({id:meta.id(),at:meta.at,device:meta.device,action,kind:k,recordId:rid,before:clone(b),after:clone(a)});
  }
 }return out;
}
root.TGSafety={normalize,validate,issues,trash,restore,changes};
if(typeof module!=='undefined')module.exports=root.TGSafety;
})(globalThis);
