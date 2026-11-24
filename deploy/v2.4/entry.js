import {verifyAccess} from '../../sync/access-verify.js';
import runtime from '../../sync/worker.js';
// Preview only. No access to the original v2.3 tables in the shared staging D1.
export function previewDB(db){return {prepare(sql){if(!/\bsync_/.test(sql))throw Error('Preview query has no isolated table');return db.prepare(sql.replace(/\bsync_/g,'v24_sync_'));},batch(statements){return db.batch(statements);}};}
export default {async fetch(request,env){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
 if(request.headers.get('Origin')!==env.PAIRING_ORIGIN)return new Response(JSON.stringify({error:'Preview origin only'}),{status:403,headers});
 let identity;try{identity=await verifyAccess(request,env);}catch(error){const reasons={'Access required':'missing-assertion','Invalid token':'invalid-token','Invalid signature algorithm':'invalid-algorithm','Access issuer denied':'issuer','Access audience denied':'audience','Access email denied':'email','Access subject denied':'subject','Access token type denied':'token-type','Access expiration denied':'expiration','Access issued time denied':'issued-time','Access not-before denied':'not-before','Access not configured':'configuration','Access keys unavailable':'keys-unavailable','Invalid Access keys':'invalid-keys','Unknown Access key':'unknown-key','Invalid Access signature':'signature'};console.warn(JSON.stringify({event:'preview-access-denied',stage:reasons[error?.message]||'token-processing'}));return new Response(JSON.stringify({error:'Không xác nhận được phiên giữa ứng dụng và máy chủ. Dữ liệu trên máy vẫn giữ nguyên.'}),{status:401,headers});}
 const path=new URL(request.url).pathname;
 if(path==='/api/access/session'&&request.method==='GET')return new Response(JSON.stringify({verified:true,email:identity.email,expiresAt:identity.expiresAt}),{headers});
 if(!/^\/api\/(devices\/register|device(?:\/revoke)?|access\/(authorize|devices|rename|revoke|presence)|sync\/(snapshot|status|pull|push))$/.test(path))return new Response(JSON.stringify({error:'Not found'}),{status:404,headers});
 return runtime.fetch(request,{...env,ACCESS_IDENTITY:identity,DB:previewDB(env.DB)});
}};
