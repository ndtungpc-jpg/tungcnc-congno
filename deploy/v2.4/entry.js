import {verifyAccess} from '../../sync/access-verify.js';
import runtime from '../../sync/worker.js';
import '../../sync/initial-data.js';
import '../../sync/initial-upload.js';
// Preview only. No access to the original v2.3 tables in the shared staging D1.
export function previewDB(db){return {prepare(sql){if(!/\bsync_/.test(sql))throw Error('Preview query has no isolated table');return db.prepare(sql.replace(/\bsync_/g,'v24_sync_'));},batch(statements){return db.batch(statements);}};}
export default {async fetch(request,env){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
 if(request.headers.get('Origin')!==env.PAIRING_ORIGIN)return new Response(JSON.stringify({error:'Preview origin only'}),{status:403,headers});
 let identity;try{identity=await verifyAccess(request,env);}catch(error){const reasons={'Access required':'missing-assertion','Invalid token':'invalid-token','Invalid signature algorithm':'invalid-algorithm','Access issuer denied':'issuer','Access audience denied':'audience','Access email denied':'email','Access subject denied':'subject','Access token type denied':'token-type','Access expiration denied':'expiration','Access issued time denied':'issued-time','Access not-before denied':'not-before','Access not configured':'configuration','Access keys unavailable':'keys-unavailable','Invalid Access keys':'invalid-keys','Unknown Access key':'unknown-key','Invalid Access signature':'signature'};console.warn(JSON.stringify({event:'preview-access-denied',stage:reasons[error?.message]||'token-processing',errorType:['InvalidCharacterError','SyntaxError','TypeError','ReferenceError','DataError','OperationError'].includes(error?.name)?error.name:'Error'}));return new Response(JSON.stringify({error:'Không xác nhận được phiên giữa ứng dụng và máy chủ. Dữ liệu trên máy vẫn giữ nguyên.'}),{status:401,headers});}
 const path=new URL(request.url).pathname;
 if(path==='/api/access/session'&&request.method==='GET')return new Response(JSON.stringify({verified:true,email:identity.email,expiresAt:identity.expiresAt}),{headers});
 if(!/^\/api\/(devices\/register|device(?:\/revoke)?|access\/(authorize|devices|rename|revoke|presence)|sync\/(snapshot|status|pull|push|initial\/(?:status|begin|part|finish)))$/.test(path))return new Response(JSON.stringify({error:'Not found'}),{status:404,headers});
 const db=previewDB(env.DB),response=await runtime.fetch(request,{...env,ACCESS_IDENTITY:identity,DB:db});
 // Attest only after the normal device authorization succeeds. The binding is
 // pinned in wrangler.toml and checked against live settings before deployment.
 if(path==='/api/sync/snapshot'&&request.method==='GET'&&response.ok){
  const snapshot=await response.json(),state=await db.prepare('SELECT last_op,(SELECT COUNT(*) FROM sync_operations) AS operation_count FROM sync_state WHERE id=1').first();
  return new Response(JSON.stringify({...snapshot,environment:{environment:'v24-preview',worker:'tungcnc-sync-v24-preview',ledger:'staging-v24-isolated',operationCount:state.operation_count,lastOperation:state.last_op}}),{headers});
 }
 return response;
}};
