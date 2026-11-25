/* UI only: preserve original allocation/save commands and existing navigation. */
(function(root){'use strict';
const field=()=>document.querySelector('form.hot02-receipt');
const originalOrders=showMultiOrders;
showMultiOrders=function(...args){
 const form=field(),pid=document.getElementById('multiCustomer')?.value;
 if(form){if(form._hot03Partner!==pid){form._hot03Partner=pid;form._hot03Manual=false;form._hot03Picked=new Set();}else if(form._hot03Manual)form._hot03Picked=new Set([...form.querySelectorAll('[name=allocOrder]:checked')].map(e=>e.value));}
 const result=originalOrders(...args);if(!form)return result;
 const box=document.getElementById('multiOrders'),inputs=[...box.querySelectorAll('[name=allocOrder]')];
 const rows=inputs.map(input=>({input,o:order(input.value)})).filter(r=>r.o);
 box.innerHTML='<section class="hot03-allocation"><p class="hot03-auto"></p><details class="hot03-specific"><summary>Chọn đơn thanh toán cụ thể</summary><label class="hot03-mode"><input type="checkbox" id="hot03Manual" onchange="hot03SetManual(this.checked)"> Chọn đơn thủ công</label><div class="hot03-cards"></div></details><div class="hot03-estimate" role="status"></div></section>';
 const cards=box.querySelector('.hot03-cards');
 for(const {input,o} of rows){input.checked=!form._hot03Manual||form._hot03Picked.has(o.id);input.setAttribute('onchange','hot03AllocationChanged()');const card=document.createElement('label');card.className='hot03-order';const content=document.createElement('span');content.innerHTML='<b>'+esc(o.title||o.code||'Đơn hàng')+'</b><small></small><strong>Còn nợ: '+money(balance(o))+'</strong><small class="hot03-line-estimate"></small>';content.querySelector('small').textContent=/^\d{4}-\d{2}-\d{2}$/.test(o.created||'')&&Number.isFinite(Date.parse(o.created+'T00:00:00Z'))?'Ngày đơn gốc: '+date(o.created):'Chưa rõ ngày đơn gốc';card.append(input,content);cards.appendChild(card);}
 box.querySelector('#hot03Manual').checked=!!form._hot03Manual;box.querySelector('.hot03-specific').open=!!form._hot03Manual;hot03AllocationChanged(false);return result;
};
root.hot03SetManual=function(manual){const form=field();if(!form)return;form._hot03Manual=!!manual;form._hot03Picked=new Set();for(const input of form.querySelectorAll('[name=allocOrder]'))input.checked=!manual;modalHasUnsavedInput=true;hot03AllocationChanged(false);};
root.hot03AllocationChanged=function(dirty=true){const form=field();if(!form)return;if(dirty)modalHasUnsavedInput=true;const box=form.querySelector('#multiOrders'),manual=!!form._hot03Manual,amount=Number(form.querySelector('#multiAmount').value)||0;const cards=box.querySelector('.hot03-cards');if(!cards)return;cards.hidden=!manual;let left=Math.max(0,amount),available=0,allocated=0,count=0;
 for(const input of cards.querySelectorAll('[name=allocOrder]')){if(!manual)input.checked=true;const o=order(input.value),due=balance(o);let value=0;if(input.checked){available+=due;value=Math.min(left,due);left-=value;allocated+=value;if(value>0)count++;}input.closest('.hot03-order').querySelector('.hot03-line-estimate').textContent='Dự kiến phân bổ: '+money(value);}
 form._hot03Picked=new Set([...cards.querySelectorAll('[name=allocOrder]:checked')].map(e=>e.value));box.querySelector('.hot03-auto').textContent=manual?'Đang chọn đơn thủ công. Phân bổ vẫn theo thứ tự đơn cũ nhất.':'Tự động phân bổ vào đơn cũ nhất còn nợ. Không cần chọn đơn.';
 box.querySelector('.hot03-estimate').innerHTML='<span>Tổng nợ '+(manual?'đã chọn':'còn lại')+': <b>'+money(available)+'</b></span><span>Dự kiến phân bổ: <b>'+money(allocated)+'</b> · '+count+' đơn</span><span>Tiền chưa phân bổ: <b>'+money(left)+'</b></span><span>Nợ còn lại '+(manual?'các đơn đã chọn':'sau thu')+': <b>'+money(Math.max(0,available-allocated))+'</b></span>'+(left>0?'<p class="hot03-warning">Số tiền vượt tổng nợ '+(manual?'các đơn đã chọn':'của khách')+': '+money(left)+'. Chưa thể lưu; hãy điều chỉnh số tiền hoặc chọn đơn.</p>':manual&&!cards.querySelector('[name=allocOrder]:checked')?'<p class="hot03-warning">Chọn ít nhất một đơn để thanh toán, hoặc tắt chế độ thủ công.</p>':'');
};
const priorDraft=activeDraftSnapshot;activeDraftSnapshot=function(){const snapshot=priorDraft(),form=field();if(snapshot&&form)snapshot.hot03={partner:form.querySelector('#multiCustomer').value,query:form.querySelector('#hot02CustomerSearch').value,amount:form.querySelector('#multiAmount').value,manual:!!form._hot03Manual,picked:[...form.querySelectorAll('[name=allocOrder]:checked')].map(e=>e.value)};return snapshot;};
const priorRestore=restoreWorkingSession;restoreWorkingSession=async function(snapshot=readWorkingSession()){const result=await priorRestore(snapshot),form=field();if(result&&form){const saved=snapshot?.dialog?.hot03;if(saved){form.querySelector('#multiCustomer').value=saved.partner;form.querySelector('#hot02CustomerSearch').value=saved.query;form.querySelector('#multiAmount').value=saved.amount;showMultiOrders();hot03SetManual(!!saved.manual);if(saved.manual){for(const input of form.querySelectorAll('[name=allocOrder]'))input.checked=saved.picked.includes(input.value);form.querySelector('.hot03-specific').open=true;hot03AllocationChanged(false);}modalHasUnsavedInput=!!snapshot.dialog.dirty;}else{sessionStale=true;form.insertAdjacentHTML('afterbegin','<p class="session-warning">Bản nháp thu tiền dùng giao diện cũ. Đóng rồi mở lại để đối chiếu trước khi lưu. Dữ liệu chưa thay đổi.</p>');}}return result;};
/* Use the browser's history as the single navigation stack. No ledger data in history. */
if(!root.history?.pushState||!root.addEventListener)return;
const h=root.history,session=String(Date.now())+'-'+Math.random().toString(36).slice(2);let seq=0,entry=null,applying=false,queued=false,reverting=false;
const modalOpen=()=>!!document.querySelector('#modal.open');
const suggestionsOpen=()=>!!document.querySelector('#hot02CustomerSuggestions:not([hidden])');
const route=()=>({route:current,partner:selectedCustomer||null,filter:filter||''});
const key=v=>v.route+'|'+(v.partner||'');
function write(kind,depth,replace=false){const value={session,seq:++seq,kind,depth,...route()};if(replace)h.replaceState({...h.state,tgPreviewNav:value},'');else h.pushState({...h.state,tgPreviewNav:value},'');entry=value;}
function seed(){if(!entry)write('route',0,true);}
function navigate(){if(applying)return;seed();if(key(entry)!==key(route()))write('route',0);}
const navTab=tab,navCustomer=openCustomer,navSupplier=openSupplier;
function canLeave(){return !modalOpen()||closeModal()!==false;}
tab=function(...args){if(!applying&&!canLeave())return false;const r=navTab(...args);navigate();return r;};
openCustomer=function(...args){if(!applying&&!canLeave())return false;const r=navCustomer(...args);navigate();return r;};
openSupplier=function(...args){if(!applying&&!canLeave())return false;const r=navSupplier(...args);navigate();return r;};
const navRender=render;render=function(...args){const r=navRender(...args);if(!applying){seed();}return r;};
const navModal=modal;modal=function(...args){const r=navModal(...args);if(!applying){seed();if(entry.kind==='route')write('modal',1);else if(entry.kind==='suggestions')collapse();}return r;};
const navClose=closeModal;
function collapse(){if(applying||queued)return;queued=true;queueMicrotask(()=>{queued=false;if(applying||!entry)return;const depth=modalOpen()?(suggestionsOpen()?2:1):0;if(depth<entry.depth)h.go(depth-entry.depth);});}
closeModal=function(...args){const r=navClose(...args);if(r!==false)collapse();return r;};
const closeSuggestions=root.hot02CloseSuggestions;
root.hot02CloseSuggestions=function(...args){const r=closeSuggestions(...args);collapse();return r;};
for(const name of ['hot02CustomerFocus','hot02CustomerTyping','hot02ClearCustomer']){const fn=root[name];root[name]=function(...args){const r=fn(...args);if(!applying&&suggestionsOpen()){seed();if(entry.kind==='modal')write('suggestions',2);}return r;};}
root.addEventListener('popstate',e=>{const target=e.state?.tgPreviewNav;if(!entry||!target||target.session!==session)return;if(reverting){reverting=false;entry=target;return;}const prior=entry;
 if(target.seq>prior.seq){entry=target;if(target.kind!=='route'&&!modalOpen())write('route',0,true);return;}
 applying=true;
 try{
  if(suggestionsOpen())closeSuggestions();
  if(target.kind==='route'&&modalOpen()&&navClose()===false){reverting=true;h.go(1);return;}
  if(key(target)!==key(route())){navTab(target.route);if(target.route==='customer-detail'&&target.partner)navCustomer(target.partner);else if(target.route==='supplier-detail'&&target.partner)navSupplier(target.partner);filter=target.filter||'';const explicit=sessionNavExplicit;sessionNavExplicit=true;try{render();}finally{sessionNavExplicit=explicit;}}
  entry=target;
 }finally{applying=false;}
});
})(globalThis);
