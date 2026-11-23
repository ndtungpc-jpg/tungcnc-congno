// Only a per-device random credential is persisted; no password/shared signing secret.
export function createQuoteInbox(apiUrl){
 const base=String(apiUrl||'').replace(/\/$/,'');if(base!=='https://tungcnc-quote-inbox-prod.ndtung-pc.workers.dev')throw Error('Untrusted inbox endpoint');
 const key='tg_quote_inbox_device_v2:'+base;let device=null;try{device=JSON.parse(localStorage.getItem(key)||'null')}catch{}
 if(device&&!/^[a-f0-9]{64}$/.test(device.token||''))device=null;
 async function call(path,{method='GET',body}={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{const r=await fetch(base+path,{method,headers:{Accept:'application/json',...(body!==undefined?{'Content-Type':'application/json'}:{}),...(device?{Authorization:'Bearer '+device.token}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'omit',signal:controller.signal});const data=await r.json().catch(()=>({error:'Invalid server response'}));if(!r.ok)throw Object.assign(Error(data.error||('HTTP '+r.status)),{status:r.status});return data;}finally{clearTimeout(timer)}
 }
 return {
  get authenticated(){return Boolean(device)},
  async enroll(label){if(!device){const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');device={token};try{localStorage.setItem(key,JSON.stringify(device));}catch(e){device=null;throw Error('Không lưu được quyền thiết bị; chưa đăng ký.')}}return call('/api/devices/register',{method:'POST',body:{token:device.token,label}})},
  async status(){return call('/api/device')},
  async logout(){await call('/api/device/revoke',{method:'POST',body:{}});localStorage.removeItem(key);device=null;},
  send:payload=>call('/api/quotes',{method:'POST',body:payload}),pending:()=>call('/api/quotes'),
  claim:id=>call('/api/quotes/'+encodeURIComponent(id)+'/claim',{method:'POST',body:{}}),
  markImported:(id,orderId)=>call('/api/quotes/'+encodeURIComponent(id),{method:'PATCH',body:{status:'imported',orderId}}),
  dismiss:id=>call('/api/quotes/'+encodeURIComponent(id),{method:'PATCH',body:{status:'dismissed'}})
 };
}
