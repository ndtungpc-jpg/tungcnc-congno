/* Overview V1.1: DOM presentation only; original totals, chronology and commands retained. */
(function(root){'use strict';
const svg=p=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
const icons={search:svg('<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>'),bell:svg('<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3Zm5 4h4"/>'),order:svg('<path d="M5 2h9l5 5v15H5zM14 2v6h5M12 11v7m-3-3h6"/>'),box:svg('<path d="m3 7 9-5 9 5v10l-9 5-9-5V7Zm0 0 9 5 9-5M12 12v10M7 5l10 5"/>'),money:svg('<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>')};
let version='';
root.overviewV11Search=()=>{tab('customers');uiR4Set('search',true);document.getElementById('r4Search')?.focus();};
function decorate(){const h=document.querySelector('body>header');if(!h)return;
 let brand=h.querySelector('.ov11-brand');if(!brand){brand=document.createElement('div');brand.className='ov11-brand';brand.innerHTML='<img src="/icons/quan-ly-cong-no-192.png?v=tg-logo-20261127" alt="Logo TG"><div><b>TÙNG GIANG CNC</b><small>Sổ công nợ</small></div>';h.querySelector(':scope>div')?.replaceWith(brand);}
 brand.querySelector('small').textContent='Sổ công nợ'+(version?' · v'+version:'')+' · Đồng bộ dữ liệu';
 let actions=h.querySelector('.ov11-header-actions');if(!actions){actions=document.createElement('div');actions.className='ov11-header-actions';actions.innerHTML='<button class="ov11-header-button" type="button" aria-label="Tìm kiếm khách hàng" onclick="overviewV11Search()">'+icons.search+'</button><button class="ov11-header-button" type="button" aria-label="Thông báo báo giá" onclick="tab(\'quote-inbox\')">'+icons.bell+'<span id="quoteInboxCount" aria-live="polite"></span></button>';h.appendChild(actions);}
 const sync=document.getElementById('headerSync');if(sync&&sync.parentElement!==actions)actions.appendChild(sync);
 const count=quoteInboxPendingCount(),badge=actions.querySelector('#quoteInboxCount');if(badge){badge.textContent=count===null?'!':count||'';badge.hidden=count===0;}
 if(current!=='dashboard')return;
 const home=document.querySelector('.pilot-dashboard');if(!home)return;home.querySelector('.pilot-heading')?.remove();home.querySelector('.pilot-primary-actions')?.remove();
 const recent=home.querySelector('.recent-orders');if(!recent)return;[...recent.querySelector('.recent-order-list').children].slice(3).forEach(e=>e.remove());
 if(!home.querySelector('.ov11-quick'))recent.insertAdjacentHTML('afterend','<div class="ov11-quick" role="group" aria-label="Thao tác nhanh">'+[['Tạo đơn','showCreateOrderMenu()',icons.order],['Nhập hàng','formSupplierOrder()',icons.box],['Thu tiền','formMultiPayment()',icons.money],['Nhắc nợ',"tab(\'debt-center\')",icons.bell]].map(([text,action,icon])=>'<button type="button" onclick="'+action+'">'+icon+'<span>'+text+'</span></button>').join('')+'</div>');
}
const oldRender=render;render=function(...args){const result=oldRender(...args);decorate();return result;};
const oldSync=root.updateSyncHeader;root.updateSyncHeader=function(...args){oldSync?.(...args);decorate();};decorate();
if(typeof fetch==='function')fetch('/version.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(info=>{if(info&&/^\d+\.\d+\.\d+(?:[-.][\w.-]+)?$/.test(info.version)){version=info.version;decorate();}}).catch(()=>{});
})(globalThis);
