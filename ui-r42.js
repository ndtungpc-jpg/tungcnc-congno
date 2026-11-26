'use strict';
// UI-R4.2 — display/export only. Existing payment linkage and accounting remain authoritative.
const r42PayOptions={q:'',type:'all',period:'all',method:'all',sort:'new'};
function r42PaymentSet(key,value){r42PayOptions[key]=value;const focus=key==='q';render();if(focus){const el=document.getElementById('r42PaySearch');el?.focus();el?.setSelectionRange(value.length,value.length)}}
const r42Select=(key,label,choices)=>`<select aria-label="${label}" onchange="r42PaymentSet('${key}',this.value)">${Object.entries(choices).map(([v,t])=>`<option value="${v}" ${r42PayOptions[key]===v?'selected':''}>${t}</option>`).join('')}</select>`;
// Display projection only. Editing/cancellation still use the unchanged paymentGroups checks.
function r42PaymentDisplayGroups(source=state){
 const groups=[],pending=new Map();
 for(const g of paymentGroups(source)){
  const p=g.rows[0],link=paymentLink(p),owner=source.orders.find(o=>o.id===p.orderId)?.partnerId;
  if(g.linked||!link?.explicit||!owner){groups.push(g);continue;}
  // An explicit original transaction ID is mandatory. Inconsistent owners/dates/methods stay separate.
  const key=JSON.stringify([link.id,owner,p.date,p.method,friendlyPaymentNote(p)]);
  if(!pending.has(key))pending.set(key,{...g,rows:[],displayOnly:true});
  pending.get(key).rows.push(...g.rows);
 }
 return [...groups,...pending.values()];
}
function customerPaymentsView(pid){
 const rows=r42PaymentDisplayGroups().filter(g=>g.rows.every(p=>order(p.orderId)?.partnerId===pid)).map(g=>({g,p:g.rows[0],pt:partner(pid),total:g.rows.reduce((n,p)=>n+p.amount,0),out:false})).sort((a,b)=>comparePaymentDates(b.p,a.p));
 return `<section class="panel r42-pay customer-payments"><h3>Lịch sử thu tiền (${rows.length} giao dịch)</h3><div class="r4-rows">${rows.map(r42PaymentCard).join('')||'<p>Chưa có giao dịch thu tiền.</p>'}</div></section>`;
}
function r42ToggleAllocations(id){const el=document.getElementById(id);if(el)el.open=!el.open;}
function r42PaymentCard({g,p,pt,total,out},index){
 const multiple=g.rows.length>1,detailId='r42Allocations'+index,count=new Set(g.rows.map(p=>p.orderId)).size;
 const open=multiple?`r42ToggleAllocations('${detailId}')`:`formPayment('${jsid(p.id)}')`;
 return `<article class="r42-payment"><button type="button" class="r42-payment-open" onclick="${open}" ${multiple?`aria-expanded="false" aria-controls="${detailId}"`:''}><span class="r42-direction ${out?'out':'in'}" aria-hidden="true">${out?'↑':'↓'}</span><span class="r4-body"><strong>${esc(pt?.name||'Đối tác chưa xác định')}</strong><span>${esc(paymentDateLabel(p))}${p.id==='legacy-thanhtoan-479'?'':' · '+esc(p.method||'Chưa rõ hình thức')+(String(p.id||'').startsWith('legacy-')&&p.method!=='Sổ cũ'?' · Sổ cũ':'')}</span><span>${esc(friendlyPaymentNote(p)||'Thanh toán')} · ${count} đơn${g.blocked?' · Cần đối chiếu':''}</span></span><b class="r42-amount ${out?'out':'in'}">${out?'Chi −':'Thu +'}${money(total)}</b></button><details class="r4-actions"><summary aria-label="Thao tác thanh toán ${esc(pt?.name||'')}">⋮</summary><div><button class="btn" onclick="formPayment('${jsid(p.id)}')">Xem / Sửa phân bổ</button><button class="btn danger" onclick="removePayment('${jsid(p.id)}')">${g.linked?'Hủy lần thanh toán':'Thùng rác'}</button></div></details>${multiple?`<details id="${detailId}" class="r42-allocations" ontoggle="this.closest('article').querySelector('.r42-payment-open').setAttribute('aria-expanded',this.open)"><summary>Phân bổ ${count} đơn</summary>${g.blocked?'<p class="hint">Chỉ xem tổng các phân bổ đã lưu. Cần đối chiếu liên kết trước khi sửa hoặc hủy.</p>':''}<ul>${g.rows.map(row=>{const o=order(row.orderId);return `<li><button type="button" onclick="viewOrderDetails('${jsid(row.orderId)}')"><strong>${esc(o?.code||'Chưa có mã đơn')}</strong><span>${esc(o?.title||'Đơn hàng')}</span></button><b>${money(row.amount)}</b></li>`}).join('')}</ul></details>`:''}</article>`;
}
paymentsCardsView=function(monthOnly=false){
 const opts=r42PayOptions,month=today().slice(0,7),all=r42PaymentDisplayGroups().map(g=>{const p=g.rows[0],pt=partner(order(p.orderId)?.partnerId);return {g,p,pt,total:g.rows.reduce((a,p)=>a+p.amount,0),out:pt?.type==='supplier'}}).filter(r=>!monthOnly||(!String(r.p.id).startsWith('legacy-')&&paymentDateInfo(r.p).day.slice(0,7)===month&&r.pt?.type==='customer'));
 const rows=all.filter(r=>(opts.type==='all'||(opts.type==='out'?r.out:!r.out))&&(opts.period==='all'||paymentDateInfo(r.p).day.slice(0,7)===month)&&(opts.method==='all'||r.p.method===opts.method)&&debtSearchText([r.pt?.name,r.pt?.phone,...r.g.rows.map(p=>objectTitle('payments',p)+' '+friendlyPaymentNote(p)),r.p.method].join(' ')).includes(debtSearchText(opts.q)));
 rows.sort((a,b)=>opts.sort==='high'?b.total-a.total:opts.sort==='low'?a.total-b.total:opts.sort==='az'?(a.pt?.name||'').localeCompare(b.pt?.name||'','vi'):opts.sort==='old'?comparePaymentDates(a.p,b.p):comparePaymentDates(b.p,a.p));
 return `<section class="r4-list r42-pay"><div class="r4-heading"><h2>${monthOnly?'Thu tháng '+month:'Lịch sử Thu / Chi'} (${rows.length})</h2></div><input id="r42PaySearch" class="r4-search" aria-label="Tìm Thu Chi" placeholder="Tìm khách, NCC, mã đơn, nội dung..." value="${esc(opts.q)}" oninput="r42PaymentSet('q',this.value)"><div class="r42-pay-controls">${r42Select('type','Loại giao dịch',{all:'Tất cả',in:'Thu',out:'Chi'})}${r42Select('period','Thời gian',{all:'Mọi thời gian',month:'Tháng này'})}${r42Select('sort','Sắp xếp Thu Chi',{new:'Mới nhất',old:'Cũ nhất',high:'Tiền cao–thấp',low:'Tiền thấp–cao',az:'Tên A–Z'})}</div><details class="r42-pay-extra"><summary>Lọc hình thức / Xóa lọc</summary>${r42Select('method','Hình thức',{all:'Mọi hình thức','Chuyển khoản':'Chuyển khoản','Tiền mặt':'Tiền mặt',Khác:'Khác'})}<button class="btn" onclick="Object.assign(r42PayOptions,{q:'',type:'all',period:'all',method:'all',sort:'new'});render()">Xóa bộ lọc</button></details><div class="r4-rows">${rows.map(r42PaymentCard).join('')||'<p class="r4-empty">Chưa có giao dịch phù hợp</p>'}</div></section>`;
};
