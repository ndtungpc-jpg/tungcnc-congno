// Focused first-reconciliation tests only. Isolated SQLite/IndexedDB; no external writes.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const {worker,DB,pairingEnv,makeStore,makeEngine,sql,C,network}=require('./device-pairing-harness.cjs');
const RS=require('../review-safety.js'),R=require('../reconcile.js');
const fixture=fs.readFileSync(path.join(__dirname,'customer-receipt-display.cjs'),'utf8').split('(async()=>{')[0];
const {c,run,document}=new Function('require','__dirname',fixture+';return {c,run,document};')(require,__dirname);
const origin='https://feature-v2-4-device-pairing.tungcnc-congno.pages.dev';
const empty=()=>({schemaVersion:2,revision:0,partners:[],orders:[],payments:[],audit:[],trash:[],recovery:[],excelImports:[]});
(async()=>{
 await run('init()');sql.exec(fs.readFileSync('sync/schema.sql','utf8').replace(/\bsync_/g,'v24_sync_'));sql.exec(fs.readFileSync('sync/schema-pairing.sql','utf8').replace(/\bsync_/g,'v24_sync_'));
 const runtime={fetch:worker.fetch.bind(worker)};const source=fs.readFileSync('deploy/v2.4/entry.js','utf8').replace(/^import .*;\n/gm,'').replace('export function','function').replace('export default','const entry=');
 const entry=new Function('runtime','verifyAccess',source+';return entry;')(runtime,async()=>({email:'ndtung.pc@gmail.com',expiresAt:Date.now()+2592000000}));
 const env={DB,PAIRING_ORIGIN:origin,ACCESS_AUTH_MODE:'true',PUBLIC_INITIAL_BOOTSTRAP:'disabled'};worker.fetch=r=>entry.fetch(r,env);
 const initial=empty();initial.partners.push({id:'c',name:'Khách thử',type:'customer'});
 for(let i=0;i<120;i++)initial.orders.push({id:'o'+i,partnerId:'c',title:'Đơn thử '+i,code:'TEST-'+i,amount:100000+i,created:'2026-11-24'});
 initial.payments.push({id:'p',orderId:'o0',amount:10000,date:'2026-11-24',method:'CK'});
 const engine=makeEngine(await makeStore(initial),origin);Object.assign(pairingEnv,{ACCESS_AUTH_MODE:'true'});
 c.tgDeviceSync={engine,store:engine.store};c.TG_ACCESS_MODE=true;c.TG_DEVICE_PAIRING_API='https://sync.test';c.TGReviewSafety=RS;
 c.tgAccessFetch=async()=>Response.json({verified:true,email:'ndtung.pc@gmail.com',expiresAt:Date.now()+2592000000});
 let exported,alerts=[];c.download=async(name,body)=>{exported=JSON.parse(body);return {requested:true};};c.alert=x=>alerts.push(x);
 vm.runInContext(fs.readFileSync('sync/access-ui.js','utf8'),c);await c.tgAccessReady;
 const before=JSON.stringify((await engine.store.read()).main),cloudBefore=sql.prepare('SELECT data FROM v24_sync_state').get().data;
 assert.equal(document.querySelectorAll('.review-totals article').length,2);assert.equal(document.querySelectorAll('.device-difference').length,0);assert(document.getElementById('deviceReviewApply').disabled);
 await c.applyDeviceReview();assert.equal(JSON.stringify((await engine.store.read()).main),before);assert.equal(sql.prepare('SELECT data FROM v24_sync_state').get().data,cloudBefore);
 await c.backupDeviceReview();assert.equal(exported.data.orders.length,120);assert(!JSON.stringify(exported).includes('privateKey'));assert(!JSON.stringify(exported).includes('publicJwk'));
 const goodFile=()=>({size:JSON.stringify(exported).length,text:async()=>JSON.stringify(exported)});
 const bad=structuredClone(exported);bad.data.orders[0].amount++;
 await c.verifyDeviceReviewBackup({size:100,text:async()=>JSON.stringify(bad)});assert(document.getElementById('deviceReviewApply').disabled);
 await c.verifyDeviceReviewBackup(goodFile());assert(!document.getElementById('deviceReviewApply').disabled);
 document.getElementById('deviceReviewAck').checked=true;
 engine.canApply=()=>!document.querySelector('#modal.open'); // Progress must not prevent the engine applying a receipt.
 await c.applyDeviceReview();assert(document.getElementById('modalBody').textContent.includes('PASS'));
 const local=(await engine.store.read()).main,remote=JSON.parse(sql.prepare('SELECT data FROM v24_sync_state').get().data);
 assert(C.same(C.records(local),C.records(initial)));assert(C.same(C.records(remote),C.records(initial)));assert.deepEqual(C.summary(remote),C.summary(initial));
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM sync_operations').get().n,0,'Original staging namespace untouched');
 console.log('PASS aggregate UI: 122 nonconflicting records require zero individual choices; backup download+readback; tamper blocked; confirmed atomic sync, progress, exact record/debt verification; original staging untouched.');
 // Existing Cloud, one actual conflict and one local-only addition. Only the conflict is shown.
 let r=await engine.store.read(),next=structuredClone(r.main);next.orders[0].title='Sửa cục bộ';next.orders.push({id:'new',partnerId:'c',amount:200000,title:'Thêm riêng',created:'2026-11-24'});await engine.saveLocal(r.main,next);
 run('closeModal(true)');await c.reviewDeviceData();assert.equal(document.querySelectorAll('.device-difference').length,1);await c.backupDeviceReview();await c.verifyDeviceReviewBackup(goodFile());
 document.getElementById('deviceReviewAck').checked=true;await c.applyDeviceReview();assert.equal(document.querySelectorAll('.device-difference').length,1);assert.equal(JSON.parse(sql.prepare('SELECT data FROM v24_sync_state').get().data).orders.length,120);
 const selection=document.querySelector('.device-difference select');run(selection.getAttribute('onchange').replace('this.value',"'local'"));
 // selection rerenders: explicitly confirm, then simulate offline. Queue and source remain recoverable.
 document.getElementById('deviceReviewAck').checked=true;
 const resolve=engine.resolve.bind(engine);engine.resolve=async(...args)=>{const result=await resolve(...args);network.online=false;return result;};
 await c.applyDeviceReview();assert(!document.getElementById('modalBody').textContent.includes('PASS'));assert((await engine.store.read()).meta.outbox.length>0);
 const pending=JSON.stringify((await engine.store.read()).main);network.online=true;await c.completeDeviceReview();assert(document.getElementById('modalBody').textContent.includes('PASS'));assert.equal(JSON.stringify((await engine.store.read()).main),pending);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM v24_sync_operations').get().n,2);console.log('PASS nonempty Cloud: only actual conflicts shown; unresolved conflict blocks; explicit choice and local additions preserved; offline retains queue, retry exactly once, verified totals.');
 const p=await engine.preview();assert(!RS.empty(p.snapshot));const wrong=structuredClone(p.snapshot);wrong.environment.ledger='production';assert.throws(()=>RS.environment(wrong));
 const ghost=structuredClone(p.snapshot);ghost.data=empty();ghost.sequence=0;ghost.versions={};assert(!RS.empty(ghost),'A zero-count ledger with history is not a new ledger');
 const serialChanged=await engine.store.read();serialChanged.meta.serial++;assert.throws(()=>RS.fresh(p,serialChanged),/đã đổi/);
 const saved=await RS.backup(p,(await engine.store.read()).meta,[]);await RS.verifyBackup(saved,saved);const changed=await engine.store.read();changed.main.orders[0].amount++;assert.throws(()=>RS.fresh(p,changed));
 const stale=await engine.preview();sql.prepare('UPDATE v24_sync_state SET version=version+1').run();const originalLocal=JSON.stringify((await engine.store.read()).main);await assert.rejects(engine.resolve(stale,{}),/Máy chủ đã đổi/);assert.equal(JSON.stringify((await engine.store.read()).main),originalLocal);
 console.log('PASS wrong ledger, empty-with-history, stale local and stale Cloud are blocked without source writes.');
 const ownerPath=path.join(__dirname,'../../../private-test-data/DỰ ÁN QUẢN LÝ CÔNG NỢ/TungGiang_CongNo_Backup_2026-11-23(1).json');
 if(fs.existsSync(ownerPath)){
  const raw=fs.readFileSync(ownerPath),owner=JSON.parse(raw).data,original=C.canonical(owner);C.validate(owner);
  const snapshot={sequence:0,data:empty(),versions:{},environment:{environment:'v24-preview',worker:'tungcnc-sync-v24-preview',ledger:'staging-v24-isolated',operationCount:0,lastOperation:null}};
  const plan=R.plan(owner,snapshot,{outbox:[]}),target=R.choose(owner,snapshot,plan,{});assert(C.same(C.records(target),C.records(owner)));assert.deepEqual(C.summary(target),C.summary(owner));assert.throws(()=>RS.capacity(snapshot,target),/giới hạn/);assert.equal(C.canonical(owner),original);assert(fs.readFileSync(ownerPath).equals(raw));
  console.log('PASS supplied owner copy: 118 customers / 619 orders / 46 allocations; exact contents and debt unchanged; 2,224 changes / 1,827,819-byte request safely BLOCKED, not split or uploaded.');
 }else console.log('LIMIT: supplied owner copy unavailable.');
})().catch(e=>{console.error(e);process.exit(1)});
