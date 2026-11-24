import {verifyAccess} from '../../sync/access-verify.js';
import runtime from '../../sync/worker.js';
// Preview only. No access to the original v2.3 tables in the shared staging D1.
export function previewDB(db){return {prepare(sql){if(!/\bsync_/.test(sql))throw Error('Preview query has no isolated table');return db.prepare(sql.replace(/\bsync_/g,'v24_sync_'));},batch(statements){return db.batch(statements);}};}
export default {async fetch(request,env){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
 if(request.headers.get('Origin')!==env.PAIRING_ORIGIN)return new Response(JSON.stringify({error:'Preview origin only'}),{status:403,headers});
 let identity;try{identity=await verifyAccess(request,env);}catch{return new Response(JSON.stringify({error:'Phiên xác minh đã hết hạn hoặc không hợp lệ. Vui lòng xác minh Gmail lại.'}),{status:401,headers});}
 const path=new URL(request.url).pathname;
 if(path==='/api/access/session'&&request.method==='GET')return new Response(JSON.stringify({verified:true,email:identity.email,expiresAt:identity.expiresAt}),{headers});
 if(!/^\/api\/(devices\/register|device(?:\/revoke)?|access\/(authorize|devices|rename|revoke|presence)|sync\/(snapshot|status|pull|push))$/.test(path))return new Response(JSON.stringify({error:'Not found'}),{status:404,headers});
 return runtime.fetch(request,{...env,ACCESS_IDENTITY:identity,DB:previewDB(env.DB)});
}};
