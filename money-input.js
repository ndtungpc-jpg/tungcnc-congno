/* Presentation-only VND editor. Canonical named inputs remain raw numbers. */
'use strict';
const TGMoney={
 parse(text){const s=String(text??'').trim().replace(/\s*₫\s*$/,'').trim();if(!s)return '';if(!/^\d[\d.]*(?:,\d*)?$/.test(s))throw Error('Chỉ nhập số tiền không âm; dùng dấu phẩy cho phần lẻ');const n=Number(s.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(n)||n>Number.MAX_SAFE_INTEGER)throw Error('Số tiền quá lớn');return s.replace(/\./g,'').replace(',','.');},
 format(raw){if(raw==null||raw==='')return '';const s=String(raw);if(!/^\d+(?:\.\d*)?$/.test(s))return s;const [a,b]=s.split('.');return a.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+(b!==undefined?','+b:'')+' ₫';},
 caret(text,pos){return (text.slice(0,pos).match(/[\d,]/g)||[]).length;},
 position(text,count){if(count<=0)return 0;let n=0;for(let i=0;i<text.length;i++)if(/[\d,]/.test(text[i])&&++n===count)return i+1;return text.replace(/\s*₫$/,'').length;}
};
function enhanceMoneyInputs(){
 if(typeof HTMLInputElement==='undefined')return;
 for(const form of document.querySelectorAll('form[data-payment-entry]:not([data-entry-hint])')){form.dataset.entryHint='1';const hint=document.createElement('p');hint.className='hint';hint.textContent='Có thể chọn ngày thu/chi trong quá khứ. Ngày nhập liệu được ghi riêng khi lưu mới; thống kê tháng theo ngày thu/chi thực tế.';form.prepend(hint);}
 for(const raw of document.querySelectorAll('input[data-money]:not([data-money-ready])')){
  raw.dataset.moneyReady='1';const visible=document.createElement('input'),descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  visible.type='text';visible.inputMode=raw.step==='any'?'decimal':'numeric';visible.className='money-display';visible.dataset.moneyDisplay='1';visible.autocomplete='off';visible.spellcheck=false;visible.required=raw.required;visible.disabled=raw.disabled;visible.readOnly=raw.readOnly;
  visible.setAttribute('aria-label',raw.closest('label')?.childNodes[0]?.textContent?.trim()||'Số tiền');visible.placeholder='0 ₫';
  const minimum=raw.min,maximum=raw.max,step=raw.step;raw.required=false;raw.type='hidden';raw.after(visible);
  const paint=()=>{visible.value=TGMoney.format(descriptor.get.call(raw));visible.setCustomValidity('')};
  Object.defineProperty(raw,'value',{configurable:true,get(){return descriptor.get.call(this)},set(v){descriptor.set.call(this,v);paint()}});paint();
  const sync=()=>{if(visible.composing)return;const text=visible.value,start=TGMoney.caret(text,visible.selectionStart??text.length),end=TGMoney.caret(text,visible.selectionEnd??text.length),direction=visible.selectionDirection;try{const value=TGMoney.parse(text),n=Number(value);if(value!==''&&((minimum!==''&&n<Number(minimum))||(maximum!==''&&n>Number(maximum))||(step==='1'&&!Number.isInteger(n))))throw Error('Số tiền ngoài giới hạn hoặc không phải số nguyên');descriptor.set.call(raw,value);visible.value=TGMoney.format(value);visible.setCustomValidity('');visible.setSelectionRange(TGMoney.position(visible.value,start),TGMoney.position(visible.value,end),direction||'none');}catch(e){descriptor.set.call(raw,'');visible.setCustomValidity(e.message);}raw.dispatchEvent(new Event('input',{bubbles:true}));};
  visible.addEventListener('input',sync);visible.addEventListener('compositionstart',()=>visible.composing=true);visible.addEventListener('compositionend',()=>{visible.composing=false;sync()});
  visible.addEventListener('change',()=>{sync();raw.dispatchEvent(new Event('change',{bubbles:true}))});
  visible.addEventListener('beforeinput',e=>{if(visible.composing)return;const s=visible.value,endOfNumber=s.replace(/\s*₫$/,'').length;let a=visible.selectionStart,b=visible.selectionEnd;if(e.inputType.startsWith('insert')&&a>endOfNumber){a=endOfNumber;b=endOfNumber;visible.setSelectionRange(a,b);}if(a!==b)return;let index=-1;if(e.inputType==='deleteContentBackward'&&a>0&&!/[\d,]/.test(s[a-1])){index=a-1;while(index>=0&&!/[\d,]/.test(s[index]))index--;}else if(e.inputType==='deleteContentForward'&&a<s.length&&!/[\d,]/.test(s[a])){index=a;while(index<s.length&&!/[\d,]/.test(s[index]))index++;}if(index>=0&&index<s.length){e.preventDefault();visible.value=s.slice(0,index)+s.slice(index+1);visible.setSelectionRange(index,index);sync();}});
 }
}
if(typeof MutationObserver!=='undefined'){new MutationObserver(enhanceMoneyInputs).observe(document.body,{childList:true,subtree:true});enhanceMoneyInputs();}

function paymentBatchAllowed(orders,amount,dateValue,method){if(excelDate(dateValue)!==dateValue){alert('Ngày thu / chi không hợp lệ');return false;}let remaining=amount,duplicate=false;for(const o of orders){if(remaining<=0.001)break;const v=Math.min(remaining,balance(o));if(state.payments.some(p=>p.orderId===o.id&&p.date===dateValue&&p.amount===v&&p.method===method))duplicate=true;remaining-=v;}return !duplicate||confirm('Có giao dịch cùng đơn, ngày, số tiền và hình thức. Chỉ tiếp tục nếu đây là lần thu/chi riêng biệt.');}
