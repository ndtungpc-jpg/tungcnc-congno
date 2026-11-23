// Tests only temporary SQLite/IndexedDB copies. No network or deployment.
const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),assert=require('assert'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tg-v23-production-')),out=path.join(tmp,'bundle');
cp.execFileSync('python',['scripts/prepare-v23-production.py','--out',out],{cwd:root,stdio:'pipe'});
const read=p=>fs.readFileSync(path.join(out,p),'utf8'),manifest=JSON.parse(read('manifest.json'));
for(const [p,sha]of Object.entries(manifest.files)){assert.equal(require('crypto').createHash('sha256').update(fs.readFileSync(path.join(out,p))).digest('hex'),sha);if(/\.(js|html)$|_headers$/.test(p))assert(!/https:\/\/(?:feature-|v23-[bc]-|tungcnc-(?:sync-v23-(?:staging|legacy-acceptance|bootstrap-rehearsal)|quote-inbox-staging))/.test(read(p)),p);}
assert.equal(manifest.requiresWorkersPaid,true);assert.equal(manifest.workerCpuMs,1000);for(const kind of ['sync','quote-inbox'])assert(read('workers/'+kind+'/wrangler.toml').includes('[limits]\ncpu_ms = 1000'));
for(const [base,sw]of [['pages','sw.js'],['pages/bao-gia','sw.js']]){const match=read(base+'/'+sw).match(/const ASSETS=(\[[^;]+?\])/);for(const asset of vm.runInNewContext(match[1])){const p=asset.replace(/^\.\//,'').replace(/^\//,'')||'index.html';assert(fs.existsSync(path.join(out,base,p)),`Missing cached asset ${base}/${p}`)}}
assert(!read('pages/direct-receiver.js').includes('c28f411b'));
for(const p of ['index.html','manifest.webmanifest']){if(p==='index.html'){assert(read('pages/'+p).includes("DBNAME='tunggiang-congno-v2',STORE='state'"));assert(read('pages/'+p).includes('indexedDB.open(DBNAME,1)'));}else assert.equal(read('pages/'+p),fs.readFileSync(path.join(root,p),'utf8'));}
console.log('PASS artifact hashes, exact Production endpoints, CSP, all PWA cached assets, unchanged DB identity/schema and manifest');
(async()=>{
 for(const kind of ['sync','quote-inbox']){
  let calls=0;const context={Response,Set,runtime:{async fetch(){calls++;return new Response('ok')}}};vm.createContext(context);vm.runInContext(read('workers/'+kind+'/entry.js').replace("import runtime from './worker.js';",'').replace('export default','globalThis.entry='),context);
  const url='https://worker.test/api',request=(origin,method)=>new Request(url,{method,headers:{Origin:origin}});
  assert.equal((await context.entry.fetch(request('https://v23-c-tungcnc.pages.dev','POST'),{RELEASE_WRITES:'enabled'})).status,403);
  assert.equal((await context.entry.fetch(request('https://tungcnc-congno.pages.dev','POST'),{})).status,503);assert.equal(calls,0);
  await context.entry.fetch(request('https://tungcnc-congno.pages.dev','OPTIONS'),{});await context.entry.fetch(request('https://tungcnc-congno.pages.dev','GET'),{});assert.equal(calls,2);
  await context.entry.fetch(request('https://tungcnc-congno.pages.dev','POST'),{RELEASE_WRITES:'enabled'});assert.equal(calls,3);
 }
 console.log('PASS default/missing write gate fails closed with 503; staging origins rejected; read/preflight retained; explicit enable delegates');
 // Run existing inbox end-to-end suite against generated Production handler, including bare sender hostname.
 let inbox=fs.readFileSync(path.join(root,'quote-inbox/tests/worker.cjs'),'utf8').replace("fs.readFileSync('quote-inbox/worker.js','utf8')",`fs.readFileSync(${JSON.stringify(path.join(out,'workers/quote-inbox/worker.js'))},'utf8')`).replaceAll('https://feature-quote-inbox-async-20.baogia-tungcnc.pages.dev','https://baogia-tungcnc.pages.dev').replaceAll('https://feature-quote-inbox-async-20.tungcnc-congno.pages.dev','https://tungcnc-congno.pages.dev');
 const inboxFile=path.join(root,'quote-inbox/tests/.production-generated.cjs');try{fs.writeFileSync(inboxFile,inbox);cp.execFileSync(process.execPath,[inboxFile],{cwd:root,stdio:'inherit'});}finally{fs.rmSync(inboxFile,{force:true})}
 // Isolated complete app runtime fixture; modified tests exercise generated Production environment.
 const fixture=path.join(tmp,'fixture');fs.mkdirSync(path.join(fixture,'sync/tests'),{recursive:true});
 for(const p of ['sync/safety.js','sync/core.js','sync/reconcile.js','sync/engine.js','sync/worker.js','reminder-history.js']){fs.copyFileSync(path.join(out,'pages',p),path.join(fixture,p));}
 fs.copyFileSync(path.join(out,'workers/sync/schema.sql'),path.join(fixture,'sync/schema.sql'));fs.writeFileSync(path.join(fixture,'sync/initial-guard.sql'),'-- already included in schema\n');
 fs.symlinkSync(path.join(root,'sync/node_modules'),path.join(fixture,'sync/node_modules'),'dir');
 let test=fs.readFileSync(path.join(root,'sync/tests/initial-bootstrap.cjs'),'utf8').replaceAll('https://feature-v2-3-sync-foundation.tungcnc-congno.pages.dev','https://tungcnc-congno.pages.dev').replaceAll('legacy-acceptance-v23','production-v23').replace('const sql=new DatabaseSync', 'let sql=new DatabaseSync');
 test=test.replace("const worker=ctx.worker,origin=","const runtime=ctx.worker,gateCtx={Response,Set,runtime};vm.createContext(gateCtx);vm.runInContext("+JSON.stringify(read('workers/sync/entry.js').replace("import runtime from './worker.js';",'').replace('export default','globalThis.entry='))+",gateCtx);const worker=gateCtx.entry,origin=");
 test=test.replace("INITIAL_BOOTSTRAP_TARGET:'production-v23'","INITIAL_BOOTSTRAP_TARGET:'production-v23',RELEASE_WRITES:network.blockWrites?'blocked':'enabled'");
 test=test.replace("network.online=false;await A.tick();assert.equal(cloud().orders.length,0);","const beforeBlocked=await stores[0].read();network.blockWrites=true;await A.tick();const blocked=await stores[0].read();assert.deepEqual(blocked.main,beforeBlocked.main);assert.deepEqual(blocked.meta.bootstrapJob,beforeBlocked.meta.bootstrapJob);assert.equal(blocked.meta.cursor,beforeBlocked.meta.cursor);assert(blocked.meta.error);assert.equal(cloud().orders.length,0);network.blockWrites=false;console.log('PASS actual Production write gate 503 preserves durable snapshot job, main and cursor; no false ACK');network.online=false;await A.tick();assert.equal(cloud().orders.length,0);");
 const marker='// Two-way transactions only on isolated in-memory COPY, not the real source file.';
 test=test.replace(marker,`const backupTables=['sync_devices','sync_nonces','sync_rates','sync_state','sync_operations','sync_initial_guard'];
 const backupRows=Object.fromEntries(backupTables.map(t=>[t,sql.prepare('SELECT * FROM '+t).all()]));
 ${marker}`);
 const after='// Snapshot conflict on a nonempty device preserves all local data for explicit review.';
 test=test.replace(after,`// Restore baseline into a NEW database; replay journal delta through signed handler.
 const expectedRecovered=C.initialSnapshot(cloud()),expectedVersions=sql.prepare('SELECT versions FROM sync_state').get().versions;
 const delta=sql.prepare('SELECT body FROM sync_operations WHERE sequence>1 ORDER BY sequence').all().map(x=>JSON.parse(x.body));
 const originalDb=sql;sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync('sync/schema.sql','utf8'));
 for(const table of backupTables){if(table==='sync_state'||table==='sync_initial_guard'){const row=backupRows[table][0];const keys=Object.keys(row);sql.prepare('UPDATE '+table+' SET '+keys.map(k=>k+'=?').join(',')+' WHERE id=1').run(...keys.map(k=>row[k]));continue;}
 for(const row of backupRows[table]){const keys=Object.keys(row);sql.prepare('INSERT INTO '+table+'('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').run(...keys.map(k=>row[k]));}}
 for(const saved of delta){let source;for(const candidate of [A,B,D]){if((await candidate.store.read()).meta.deviceId===saved.deviceId)source=candidate;}assert(source);const op={...saved,changes:saved.changes.map(({version,...c})=>c)};await source.call((await source.store.read()).meta,'/api/sync/push',{method:'POST',body:op});const again=await source.call((await source.store.read()).meta,'/api/sync/push',{method:'POST',body:op});assert.equal(again.status,'duplicate');}
 assert.deepEqual(C.initialSnapshot(cloud()),expectedRecovered);assert.equal(sql.prepare('SELECT versions FROM sync_state').get().versions,expectedVersions);assert.equal(sql.prepare('SELECT count(*) n FROM sync_operations').get().n,3);assert.equal(originalDb.prepare('SELECT count(*) n FROM sync_operations').get().n,3);
 console.log('PASS restore into NEW database plus post-backup signed transaction replay, exact IDs/values/history/versions; retry no duplicates; original database retained');
 ${after}`);
 fs.writeFileSync(path.join(fixture,'sync/tests/initial-bootstrap.cjs'),test);
 cp.execFileSync(process.execPath,[path.join(fixture,'sync/tests/initial-bootstrap.cjs')],{cwd:fixture,env:process.env,stdio:'inherit'});
 console.log('PASS generated Production runtime bootstrap, two-way COPY, write freeze/retry and new-transaction restore; no remote writes');
 console.log(JSON.stringify({bundle:out,zip:out+'.zip',sourceCommit:manifest.sourceCommit}));
})().catch(e=>{console.error(e);process.exitCode=1});
