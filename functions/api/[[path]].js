// Same-origin API forwarding preserves the Preview's existing IndexedDB origin.
const HOST='feature-v2-4-device-pairing.tungcnc-congno.pages.dev';
const API='https://tungcnc-sync-v24-preview.ndtung-pc.workers.dev';
export async function onRequest({request}){
 const u=new URL(request.url),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Cookie'};
 if(u.hostname!==HOST)return new Response('Not found',{status:404});
 if(!/^\/api\/(devices\/register|device(?:\/revoke)?|access\/(session|authorize|devices|rename|revoke|presence)|sync\/(snapshot|status|pull|push))$/.test(u.pathname))return new Response(JSON.stringify({error:'Thao tác không được hỗ trợ.'}),{status:404,headers});
 const assertion=request.headers.get('Cf-Access-Jwt-Assertion');if(!assertion)return new Response(JSON.stringify({error:'Cần xác minh Gmail trước khi đồng bộ.'}),{status:401,headers});
 const h=new Headers({'Origin':'https://'+HOST,'Cf-Access-Jwt-Assertion':assertion,'Cookie':'CF_Authorization='+assertion});
 for(const name of ['Content-Type','X-Device-Id','X-Time','X-Nonce','X-Signature'])if(request.headers.has(name))h.set(name,request.headers.get(name));
 const result=await fetch(API+u.pathname+u.search,{method:request.method,headers:h,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual'});
 return new Response(result.body,{status:result.status,headers:{...headers,'Content-Type':result.headers.get('Content-Type')||'application/json'}});
}
