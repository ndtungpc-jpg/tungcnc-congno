// Focused first-device authorization through real Worker and signed ECDSA requests.
const assert=require('assert/strict'),crypto=require('crypto');
const {pairingEnv,sql,makeEngine,makeStore,network}=require('./device-pairing-harness.cjs');
const grant='a'.repeat(64),origin='https://preview.invalid';pairingEnv.PAIRING_ORIGIN=origin;
const setup=()=>Object.assign(pairingEnv,{ENABLE_PREVIEW_INITIAL_DEVICE:'true',INITIAL_DEVICE_ORIGIN:origin,INITIAL_DEVICE_GRANT_HASH:crypto.createHash('sha256').update(grant).digest('hex'),INITIAL_DEVICE_GRANT_EXPIRES:Date.now()+3600000});
const register=async(label,o=origin)=>{const e=makeEngine(await makeStore(),o);await e.enable(label);await e.tick();return e;};
const call=async(e,g=grant)=>e.call((await e.store.read()).meta,'/api/pairing/initialize',{method:'POST',body:{grant:g}});
(async()=>{
 const A=await register('S24'),id=(await A.store.read()).meta.deviceId,before=sql.prepare('SELECT data FROM sync_state').get().data;
 await assert.rejects(call(A));setup();await assert.rejects(call(A,'b'.repeat(64)));
 pairingEnv.INITIAL_DEVICE_GRANT_EXPIRES=0;await assert.rejects(call(A));setup();pairingEnv.INITIAL_DEVICE_ORIGIN='https://wrong.invalid';await assert.rejects(call(A));setup();
 assert.equal(sql.prepare('SELECT status FROM sync_devices WHERE id=?').get(id).status,'pending');
 const prod=await register('Production','https://tungcnc-congno.pages.dev');pairingEnv.INITIAL_DEVICE_ORIGIN='https://tungcnc-congno.pages.dev';pairingEnv.PAIRING_ORIGIN='https://tungcnc-congno.pages.dev';await assert.rejects(call(prod));pairingEnv.PAIRING_ORIGIN=origin;setup();
 // Register a competing identity; one atomic UPDATE grants exactly one device.
 const B=await register('Samsung');sql.exec('DELETE FROM sync_rates');
 const race=await Promise.allSettled([call(A),call(B)]);assert.equal(race.filter(x=>x.status==='fulfilled').length,1);assert.equal(sql.prepare("SELECT count(*) AS n FROM sync_devices WHERE status='approved'").get().n,1);
 const winner=race[0].status==='fulfilled'?A:B,loser=winner===A?B:A;
 await call(winner);await assert.rejects(call(loser));assert.equal(sql.prepare('SELECT data FROM sync_state').get().data,before);
 // Verified winner can create a code; second browser joins and persists its own identity.
 const remote=async(e,p,b)=>e.call((await e.store.read()).meta,p,{method:'POST',body:b});
 const code=(await remote(winner,'/api/pairing/code',{})).code;assert.match(code,/^\d{6}$/);await remote(loser,'/api/pairing/join',{code});await assert.rejects(remote(prod,'/api/pairing/join',{code}));
 const remembered=makeEngine(loser.store,origin),meta=(await loser.store.read()).meta;assert.equal((await remembered.call(meta,'/api/device')).status,'approved');
 await remote(winner,'/api/pairing/revoke',{deviceId:meta.deviceId});await assert.rejects(remembered.call(meta,'/api/sync/snapshot'));assert.equal(sql.prepare('SELECT data FROM sync_state').get().data,before);assert.deepEqual((await loser.store.read()).main,(await winner.store.read()).main);
 sql.prepare("UPDATE sync_devices SET status='revoked' WHERE status='approved'").run();sql.exec('DELETE FROM sync_rates');const C=await register('third');await assert.rejects(call(C));
 console.log('PASS first-device: signed owner grant; absent/wrong/expired/origin/replay checks; atomic single winner; Production origin denied; code creation/join; persistent identity; revocation; unchanged business ledger; no takeover after all devices revoked.');
})().catch(e=>{console.error(e);process.exit(1)});
