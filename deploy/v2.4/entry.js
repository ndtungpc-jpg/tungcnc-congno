import runtime from '../../sync/worker.js';
// Preview only. No access to the original v2.3 tables in the shared staging D1.
export function previewDB(db){return {prepare(sql){if(!/\bsync_/.test(sql))throw Error('Preview query has no isolated table');return db.prepare(sql.replace(/\bsync_/g,'v24_sync_'));},batch(statements){return db.batch(statements);}};}
export default {async fetch(request,env){if(request.headers.get('Origin')!==env.PAIRING_ORIGIN)return new Response(JSON.stringify({error:'Preview origin only'}),{status:403,headers:{'Content-Type':'application/json'}});return runtime.fetch(request,{...env,DB:previewDB(env.DB)});}};
