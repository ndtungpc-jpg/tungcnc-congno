import {verifyAccess} from '../../sync/access-verify.js';
import runtime from '../../sync/worker.js';
// Existing Production DB and tables, no namespace switch or data copy.
export default {async fetch(request,env){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
 if(request.headers.get('Origin')!=='https://tungcnc-congno.pages.dev'||env.PAIRING_ORIGIN!=='https://tungcnc-congno.pages.dev')return new Response(JSON.stringify({error:'Production origin only'}),{status:403,headers});
 let identity;try{identity=await verifyAccess(request,env);}catch{return new Response(JSON.stringify({error:'Cần xác minh Gmail trước khi đồng bộ.'}),{status:401,headers});}
 const path=new URL(request.url).pathname;
 if(path==='/api/access/session'&&request.method==='GET')return new Response(JSON.stringify({verified:true,email:identity.email,expiresAt:identity.expiresAt}),{headers});
 if(!/^\/api\/(devices\/register|device(?:\/revoke)?|access\/(authorize|devices|rename|revoke|presence)|sync\/(snapshot|status|pull|push))$/.test(path))return new Response(JSON.stringify({error:'Thao tác không được hỗ trợ.'}),{status:404,headers});
 const response=await runtime.fetch(request,{...env,ACCESS_AUTH_MODE:'true',ACCESS_IDENTITY:identity,PUBLIC_INITIAL_BOOTSTRAP:'disabled',INITIAL_CHUNKS_ENABLED:'false'});
 if(path==='/api/sync/snapshot'&&request.method==='GET'&&response.ok){const snapshot=await response.json(),state=await env.DB.prepare('SELECT last_op,(SELECT COUNT(*) FROM sync_operations) AS operation_count FROM sync_state WHERE id=1').first();return new Response(JSON.stringify({...snapshot,environment:{environment:'v24-production',worker:'tungcnc-sync-v23-prod',ledger:'production-existing',operationCount:state.operation_count,lastOperation:state.last_op}}),{headers});}
 return response;
}};
