/* Dark V1: presentation only; existing accounting, dates and commands stay authoritative. */
(function(root){'use strict';
const svg=path=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
const icons={search:svg('<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>'),plus:svg('<path d="M12 3v18M3 12h18"/>'),upload:svg('<path d="M12 17V3m-5 5 5-5 5 5M4 15v6h16v-6"/>'),wallet:svg('<path d="M3 7h18v14H3zM4 7V3h14v4M15 12h6v5h-6z"/>'),send:svg('<path d="m2 10 20-8-8 20-3-9-9-3Zm9 3L22 2"/>'),bell:svg('<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3Zm5 4h4"/>')};
root.darkV1Search=()=>{tab('customers');uiR4Set('search',true);document.getElementById('r4Search')?.focus();};
let version='';
function header(){const h=document.querySelector('body > header');if(!h)return;
 let brand=h.querySelector('.dark-v1-brand');if(!brand){brand=document.createElement('div');brand.className='dark-v1-brand';brand.innerHTML='<img src="/icons/quan-ly-cong-no-192.png" alt="Logo TG"><div><b>TÙNG GIANG CNC</b><small>Sổ công nợ</small></div>';h.querySelector(':scope > div')?.replaceWith(brand);}
 brand.querySelector('small').textContent='Sổ công nợ'+(version?' · v'+version:'');
 let actions=h.querySelector('.dark-v1-header-actions');if(!actions){actions=document.createElement('div');actions.className='dark-v1-header-actions';actions.innerHTML='<button type="button" class="dark-v1-header-button" aria-label="Tìm kiếm khách hàng" onclick="darkV1Search()">'+icons.search+'</button><button type="button" class="dark-v1-header-button" aria-label="Thông báo báo giá" onclick="tab(\'quote-inbox\')">'+icons.bell+'<span id="quoteInboxCount"></span></button>';h.appendChild(actions);}
 const sync=document.getElementById('headerSync');if(sync&&sync.parentElement!==actions)actions.appendChild(sync);
 const count=quoteInboxPendingCount(),badge=document.getElementById('quoteInboxCount');badge.textContent=count===null?'!':count||'';badge.hidden=count===0;
}
function dashboard(){document.body.classList.toggle('dark-v1-home',current==='dashboard');header();if(current!=='dashboard')return;
 const home=document.querySelector('.pilot-dashboard');if(!home)return;home.querySelector('.pilot-heading')?.remove();home.querySelector('.pilot-primary-actions')?.remove();home.querySelector('.pilot-footnote')?.remove();
 const stats=home.querySelector('.pilot-stats');if(stats&&!home.querySelector('.dark-v1-quick'))stats.insertAdjacentHTML('afterend','<section class="panel dark-v1-quick"><h2><span aria-hidden="true">ϟ</span> Thao tác nhanh</h2><div>'+[['Tạo đơn','showCreateOrderMenu()',icons.plus],['Nhập hàng','formSupplierOrder()',icons.upload],['Thu tiền','formMultiPayment()',icons.wallet],['Nhắc nợ',"tab(\'debt-center\')",icons.send]].map(([label,action,icon])=>'<button type="button" onclick="'+action+'">'+icon+'<span>'+label+'</span></button>').join('')+'</div></section>');
}
const beforeRender=render;render=function(...args){const result=beforeRender(...args);dashboard();return result;};
const beforeSync=root.updateSyncHeader;root.updateSyncHeader=function(...args){beforeSync?.(...args);header();};header();
if(typeof fetch==='function')fetch('/version.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(v=>{if(v&&/^\d+\.\d+\.\d+(?:[-.][\w.-]+)?$/.test(v.version)){version=v.version;header();}}).catch(()=>{});
})(globalThis);
