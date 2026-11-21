// Shared inbox client for both independent PWAs. No credentials persisted to disk.
// Configure API_URL only after Worker and D1 are deployed and tested.
export function createQuoteInbox(apiUrl) {
  const base=String(apiUrl||'').replace(/\/$/,'');
  if(!/^https:\/\//.test(base)) throw Error('Inbox requires HTTPS');
  const tokenKey='tg_quote_inbox_session_v1';
  let sessionToken=null;
  try { const stored=JSON.parse(localStorage.getItem(tokenKey)||'null'); if(stored&&stored.expiresAt>Date.now()&&typeof stored.token==='string')sessionToken=stored.token; } catch {}
  async function call(path,{method='GET',body}={}) {
    const headers={'Accept':'application/json'};
    if(body!==undefined)headers['Content-Type']='application/json';
    if(sessionToken)headers.Authorization='Bearer '+sessionToken;
    const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
    const data=await response.json().catch(()=>({error:'Invalid server response'}));
    if(response.status===401&&path!=='/api/session'){sessionToken=null;try{localStorage.removeItem(tokenKey);}catch{}}
    if(!response.ok)throw Error(data.error||('HTTP '+response.status));
    return data;
  }
  return {
    get authenticated(){return Boolean(sessionToken);},
    async login(password){const result=await call('/api/session',{method:'POST',body:{password}});sessionToken=result.token;try{localStorage.setItem(tokenKey,JSON.stringify({token:sessionToken,expiresAt:Date.now()+result.expiresIn*1000}));}catch{}return true;},
    logout(){sessionToken=null;try{localStorage.removeItem(tokenKey);}catch{}},
    async send(payload){if(!payload||typeof payload.transferId!=='string')throw Error('Invalid quote');return call('/api/quotes',{method:'POST',body:payload});},
    async pending(){return call('/api/quotes?status=pending');},
    async markImported(id){return call('/api/quotes/'+encodeURIComponent(id),{method:'PATCH',body:{status:'imported'}});},
    async dismiss(id){return call('/api/quotes/'+encodeURIComponent(id),{method:'PATCH',body:{status:'dismissed'}});}
  };
}
