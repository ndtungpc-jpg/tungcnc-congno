// v2.4 Access only: real RS256, Worker, SQLite and engine, no remote business data.
const fs=require('fs'),assert=require('assert/strict'),{webcrypto}=require('crypto');
const {sql,DB,worker,makeStore,makeEngine,change,network}=require('./device-pairing-harness.cjs');
const origin='https://feature-v2-4-device-pairing.tungcnc-congno.pages.dev',issuer='https://hidden-forest-3b6f.cloudflareaccess.com',aud='test-audience';
(async()=>{
 const keys=await webcrypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},false,['sign','verify']),jwk={...await webcrypto.subtle.exportKey('jwk',keys.publicKey),kid:'test-kid',alg:'RS256'};
 const {verifyAccess}=await import('../access-verify.js');const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const token=async patch=>{const p=encode({alg:'RS256',kid:'test-kid'})+'.'+encode({iss:issuer,aud:[aud],type:'app',email:'ndtung.pc@gmail.com',sub:'owner',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+2592000,...patch});return p+'.'+Buffer.from(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(p))).toString('base64url');};
 const good=await token({}),env={DB,PAIRING_ORIGIN:origin,ACCESS_AUTH_MODE:'true',ACCESS_ISSUER:issuer,ACCESS_AUD:aud,ACCESS_OWNER_EMAIL:'ndtung.pc@gmail.com',PUBLIC_INITIAL_BOOTSTRAP:'disabled'},fetcher=async u=>{assert.equal(u,issuer+'/cdn-cgi/access/certs');return Response.json({keys:[jwk]});};
 const verify=(t)=>verifyAccess(new Request(origin,{headers:{'Cf-Access-Jwt-Assertion':t}}),env,{fetcher});assert.equal((await verify(good)).email,env.ACCESS_OWNER_EMAIL);
 for(const patch of [{email:'other@gmail.com'},{aud:['wrong']},{iss:'https://wrong.cloudflareaccess.com'},{exp:1},{nbf:Date.now()/1000+600},{type:'service'},{sub:''}])await assert.rejects(verify(await token(patch)));
 await assert.rejects(verify(good.slice(0,-10)+'aaaaaaaaaa'));await assert.rejects(verify(''));
 sql.exec(fs.readFileSync('sync/schema.sql','utf8').replace(/\bsync_/g,'v24_sync_'));sql.exec(fs.readFileSync('sync/schema-pairing.sql','utf8').replace(/\bsync_/g,'v24_sync_'));
 let source=fs.readFileSync('deploy/v2.4/entry.js','utf8').replace(/^import .*;\n/gm,'').replace('export function','function').replace('export default','const entry=');const original={fetch:worker.fetch.bind(worker)};
 const entry=new Function('runtime','verifyAccess',source+';return entry;')(original,(r,e)=>verifyAccess(r,e,{fetcher}));worker.fetch=(r)=>entry.fetch(r,env);
 const originalData=sql.prepare('SELECT data FROM v24_sync_state').get().data;
 let session=good;const create=async label=>{const e=makeEngine(await makeStore(),origin),base=e.fetcher;e.fetcher=(url,opts)=>base(url,{...opts,headers:{...opts.headers,'Cf-Access-Jwt-Assertion':session}});await e.enable(label);await e.tick();return e;};
 const A=await create('S24'),B=await create('PC');for(const e of [A,B]){let r=await e.store.read();await e.metaUpdate(m=>m.bootstrapPending=true);await e.call(r.meta,'/api/access/authorize',{method:'POST',body:{}});await e.metaUpdate(m=>m.approved=true);const p=await e.preview();await e.resolve(p,{});await e.tick();}
 assert.equal(sql.prepare('SELECT data FROM v24_sync_state').get().data,originalData);
 await change(A,s=>{s.partners.push({id:'c',name:'KH GIẢ',type:'customer'});s.orders.push({id:'o',partnerId:'c',code:'GIẢ',title:'ĐƠN THỬ',amount:100000,created:'2026-11-24'});});await A.tick();await B.tick();assert.equal((await B.store.read()).main.orders.length,1);
 const before=JSON.stringify((await B.store.read()).main),cloudBefore=sql.prepare('SELECT data FROM v24_sync_state').get().data;session=await token({exp:1});await assert.rejects(B.call((await B.store.read()).meta,'/api/sync/snapshot'));assert.equal(JSON.stringify((await B.store.read()).main),before);assert.equal(sql.prepare('SELECT data FROM v24_sync_state').get().data,cloudBefore);
 session=good;const bm=(await B.store.read()).meta;await A.call((await A.store.read()).meta,'/api/access/revoke',{method:'POST',body:{deviceId:bm.deviceId}});await assert.rejects(B.call(bm,'/api/sync/snapshot'));await assert.rejects(B.call(bm,'/api/access/authorize',{method:'POST',body:{}}));assert.equal(JSON.stringify((await B.store.read()).main),before);
 const response=await entry.fetch(new Request(origin+'/api/pairing/code',{headers:{Origin:origin,'Cf-Access-Jwt-Assertion':good}}),env);assert.equal(response.status,404);const denied=await entry.fetch(new Request(origin+'/api/sync/snapshot',{headers:{Origin:origin}}),env);assert.equal(denied.status,401);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM sync_devices').get().n,0,'Original staging tables unchanged');
 console.log('PASS Access: RS256/issuer/audience/email/expiry/nbf/signature checks, two independent devices authorize, sync, expired token preserves local/cloud ledger, revoked device denied, old pairing endpoints off, original staging namespace untouched.');
})().catch(e=>{console.error(e);process.exit(1)});
