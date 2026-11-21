// Shared inbox client for both independent PWAs. No credentials persisted to disk.
// Configure API_URL only after Worker and D1 are deployed and tested.
export function createQuoteInbox(apiUrl) {
  const base=String(apiUrl||'').replace(/\/$/,'');
  if(!/^https:\/\//.test(base)) throw Error('Inbox requires HTTPS');
  let sessionToken=null;
  async function call(path,{method='GET',body}={}) {
    const headers={'Accept':'application/json'};
    if(body!==undefined)headers['Content-Type']='application/json';
    if(sessionToken)headers.Authorization='Bearer '+sessionToken;
    const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
    const data=await response.json().catch(()=>({error:'Invalid server response'}));
    if(!response.ok)throw Error(data.error||('HTTP '+response.status));
    return data;
  }
  return {
    get authenticated(){return Boolean(sessionToken);},
    async login(password){const result=await call('/api/session',{method:'POST',body:{password}});sessionToken=result.token;return true;},
    logout(){sessionToken=null;},
    async send(payload){if(!payload||typeof payload.transferId!=='string')throw Error('Invalid quote');return call('/api/quotes',{method:'POST',body:payload});},
    async pending(){return call('/api/quotes?status=pending');},
    async markImported(id){return call('/api/quotes/'+encodeURIComponent(id),{method:'PATCH',body:{status:'imported'}});},
    async dismiss(id){return call('/api/quotes/'+encodeURIComponent(id),{method:'PATCH',body:{status:'dismissed'}});}
  };
}
