const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert'),{JSDOM}=require('jsdom'),{IDBFactory}=require('fake-indexeddb');
const root=path.resolve(__dirname,'../..'),html=fs.readFileSync(root+'/index.html','utf8'),dom=new JSDOM(html,{url:'https://ui-test.invalid/'}),document=dom.window.document,local=new Map();
let copies=0,shares=0,exportCount=0,stamp=new Date().toISOString();
const c={console,structuredClone,crypto:require('crypto').webcrypto,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,DataView,Blob,File,Response,DecompressionStream,Date,Intl,URL,atob,btoa,document,indexedDB:new IDBFactory(),setTimeout(){},setInterval(){},clearTimeout(){},location:{protocol:'http:',hostname:'ui-test.invalid',origin:'https://ui-test.invalid'},window:{addEventListener(){},scrollY:0,scrollTo(){}},navigator:{clipboard:{writeText:async()=>copies++},share:async()=>shares++,canShare:()=>true},localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)},confirm:()=>true,alert(){}};vm.createContext(c);
for(const m of html.matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){if(m[1]?.includes('vendor/'))continue;const code=m[1]?fs.readFileSync(root+'/'+m[1].replace(/^\.\//,''),'utf8'):m[2].replace(/init\(\)\.then[\s\S]*$/,'');vm.runInContext(code,c);}
const run=s=>vm.runInContext(s,c),flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
 await run('init()');c.fixture={schemaVersion:2,revision:0,partners:[{id:'c1',name:'Khách An rất dài để thử xuống dòng an toàn',phone:'0900000001',type:'customer'},{id:'c2',name:'Bình',phone:'0900000002',type:'customer'},{id:'s1',name:'Nhà cung cấp Ván',type:'supplier'}],orders:[{id:'o1',partnerId:'c1',code:'O1',title:'Vách CNC tên dài & <ký tự>',amount:12500000,created:'2026-01-01',due:'2026-01-02'},{id:'o2',partnerId:'c2',code:'O2',title:'Đã thanh toán',amount:1000000,created:'2026-01-02'},{id:'os',partnerId:'s1',code:'NCC',title:'Nhập ván',amount:2500000,created:'2026-01-03'}],payments:[{id:'p',orderId:'o2',amount:1000000,date:'2026-01-02'}],audit:[],trash:[],recovery:[],reminderEvents:[{id:'e',kind:'export',partnerId:'c1',type:'copy',at:new Date().toISOString()}]};await run('state=TGSafety.normalize(fixture);commit()');const before=run('JSON.stringify(state)');
 for(const route of ['customers','suppliers','orders','collections','supplier-debts','debt-center','overdue']){run("tab('"+route+"')");assert(document.querySelector('.r4-list'),route);assert(document.querySelector('[aria-label="Sắp xếp"]'));assert(document.querySelector('.r4-filter'));assert(!document.querySelector('#overdueMenuLink'));}
 run("tab('customers')");assert.equal(document.querySelectorAll('.r4-row').length,2);c.uiR4Set('q','khach an');assert.equal(document.querySelectorAll('.r4-row').length,1);c.uiR4Set('debt','paid');assert.equal(document.querySelectorAll('.r4-row').length,0);c.uiR4Clear();c.uiR4Set('reminded','yes');assert.equal(document.querySelectorAll('.r4-row').length,1);assert(document.querySelector('.reminder-badge').textContent.includes('Đã nhắc'));
 c.uiR4Clear();c.uiR4Set('sort','debtAsc');assert(document.querySelector('.r4-row').textContent.includes('Bình'));assert(document.querySelector('.r4-actions').innerHTML.includes('formPartner'));assert(document.querySelector('.r4-actions').innerHTML.includes('removePartner'));
 c.uiR4DebtTab('all');assert.equal(document.querySelectorAll('.r4-row').length,1);c.uiR4DebtTab('overdue');assert.equal(document.querySelectorAll('.r4-row').length,1);assert(document.querySelector('.r4-debt-tabs').textContent.includes('Quá hạn'));assert(!document.querySelector('#overdueMenuLink'));
 run("tab('orders')");assert.equal(document.querySelectorAll('.r4-row').length,3);assert(document.querySelector('.r4-open').getAttribute('onclick').includes('viewOrderDetails'));run("tab('dashboard')");assert.equal(document.querySelectorAll('.pilot-stats>button').length,4);assert.equal(document.querySelectorAll('.r4-recent .r4-row').length,2);assert(!document.querySelector('#headerSync').style.position.includes('fixed'));
 assert.equal(run('JSON.stringify(state)'),before);
 const {createCanvas}=require('@napi-rs/canvas'),oldCreate=document.createElement.bind(document);let pngCount=0;const drawCalls=[];
 document.createElement=function(tag,...args){if(tag!=='canvas')return oldCreate(tag,...args);const cv=createCanvas(1,1),get=cv.getContext.bind(cv);cv.getContext=(...args)=>{const ctx=get(...args),fill=ctx.fillText.bind(ctx);ctx.fillText=(t,x,y)=>{drawCalls.push({text:String(t),x,y,align:ctx.textAlign,font:ctx.font});fill(t,x,y)};return ctx};cv.toBlob=fn=>{pngCount++;fn(new Blob([cv.toBuffer('image/png')],{type:'image/png'}))};return cv};
 const d=run("reportData('c1','debt')");const b1=await c.reportPNG(d),b2=await c.reportPNG(d);assert.strictEqual(b1,b2);assert.equal(pngCount,1);assert(b1.size>1000);assert.equal(c.reportSections(d)[0].headers.join('|'),'Ngày|Nội dung/Hạng mục|Khối lượng/ĐVT|Đơn giá|Thành tiền');
 const detail={...d,orders:[{id:'detail',code:'D',title:'Chi tiết',amount:4301000,created:'2026-01-01',quoteItems:[{name:'Vách',quantity:3.5,unit:'m²',unitPrice:1000000,amount:3500000},{name:'Nẹp',quantity:2,unit:'md',unitPrice:200000,amount:400000}],quoteTotals:{subtotal:3900000,discount:100000,shipping:110000,vatAmount:391000}}],gross:4301000};
 const rows=c.reportOrderRows(detail);assert.equal(rows.length,4);assert.equal(rows[0][4],'');assert.equal(rows[1][2],'3,5 m²');assert.equal(rows[1][3],run('money(1000000)'));assert.equal(rows[3][4],run('money(4301000)'));assert.equal(c.reportSummary(detail)[0][1],run('money(4301000)'));await c.reportPNG(detail);assert.equal(pngCount,2);assert(drawCalls.some(x=>x.text==='3,5 m²'&&x.align==='right'));assert(drawCalls.filter(x=>x.text===run('money(1000000)')).every(x=>x.align==='right'));assert(drawCalls.filter(x=>x.text==='01/01/2026').every(x=>x.align==='left'));fs.writeFileSync('/tmp/ui-r421-export.png',Buffer.from(await b1.arrayBuffer()));c.exportReportExcel('c1','debt');const book=run('activeFileSave.bytes');fs.writeFileSync('/tmp/ui-r421-report.xlsx',Buffer.from(book));run('finishFileSave(false)');c.jspdf=require(root+'/vendor/jspdf.umd.min.js');const pdfJob=c.exportReportPDF('c1','debt');await flush();const pdfBlob=run('activeFileSave.bytes');fs.writeFileSync('/tmp/ui-r421-report.pdf',Buffer.from(await pdfBlob.arrayBuffer()));run('finishFileSave(false)');await pdfJob;console.log('PASS R4.2.1: real canvas right numeric/left dates, XLSX exported for XML alignment verification');
 run("tab('payments')");assert(document.querySelector('.r42-payment'));assert(document.querySelector('[aria-label="Loại giao dịch"]'));c.r42PaymentSet('q','binh');assert.equal(document.querySelectorAll('.r42-payment').length,1);c.r42PaymentSet('type','out');assert.equal(document.querySelectorAll('.r42-payment').length,0);c.r42PaymentSet('type','all');c.r42PaymentSet('q','');assert.equal(run('JSON.stringify(state)'),before);
 run("previewReport('c1','debt')");assert(document.querySelector('[name=r42Kind]:checked'));assert(document.querySelector('#r42ReportName'));console.log('PASS UI-R4.2 real canvas PNG/cache identity, report hierarchy/combined unit/unit price/authoritative total, payment search+type filter, no state writes');
 // Real PNG previews: reminders and both existing report entry points, no history writes.
 const previewBefore=run('JSON.stringify(state)');
 await run("sendDebtReminder('c1')");
 for(const kind of ['debt','orders']){
  document.getElementById('reminderAttachmentKind').value=kind;
  await run('previewReminderAttachment()');
  assert(document.querySelector('#r42PNGViewer'),'reminder preview button did not open viewer');
  assert(run('r42Viewer.blob.size')>1000);
  assert.strictEqual(run('r42Viewer.blob'),run('reminderAttachment.blob'));
  run('r42ClosePNG()');assert(document.querySelector('#modal.open'));
 }
 assert.equal(run('JSON.stringify(state)'),previewBefore,'preview wrote history/accounting');
 for(const kind of ['debt','orders']){run("previewReport('c1','"+kind+"')");await run("r42PreviewReport('c1')");assert(document.querySelector('#r42PNGViewer'));run('r42ClosePNG()');}
 assert.equal(run('JSON.stringify(state)'),previewBefore);
 // Independent output actions and cancellation: creating/closing a preview is read-only.
 await run("sendDebtReminder('c1')");await run('previewReminderAttachment()');
 const realDownload=c.download;c.confirmReminderRepeat=async()=>true;
 c.download=async()=>({requested:false});await run('r42DownloadPNG()');assert.equal(run('JSON.stringify(state)'),previewBefore);
 c.download=async()=>({requested:true});await run('r42DownloadPNG()');assert.equal(run('state.reminderEvents.length'),2);
 await run('r42SharePNG()');assert.equal(shares,1);assert.equal(run('state.reminderEvents.length'),3);
 c.navigator.share=async()=>{throw Object.assign(Error('cancel'),{name:'AbortError'})};await run('r42SharePNG()');assert.equal(run('state.reminderEvents.length'),3);c.download=realDownload;
 run('r42ClosePNG()');
 // Do not reopen a viewer when asynchronous generation finishes after closing/replacing modal.
 const realPNG=c.reportPNG;let resolvePNG;c.reportPNG=()=>new Promise(r=>resolvePNG=r);
 await run("sendDebtReminder('c1')");const pendingPreview=run('previewReminderAttachment()');run('closeModal(true)');resolvePNG(b1);await pendingPreview;assert(!document.querySelector('#r42PNGViewer'));
 await run("sendDebtReminder('c1')");const replaced=run('previewReminderAttachment()');run("previewReport('c1','debt')");resolvePNG(b1);await replaced;assert(!document.querySelector('#r42PNGViewer'));c.reportPNG=realPNG;
 // Dates: no audit/import/update fallback, stable ascending/descending, no invented missing dates.
 assert.equal(c.paymentDateLabel({id:'legacy-thanhtoan-479',date:'2026-11-19'}),'Thu trước năm 2022 · Sổ cũ');
 assert.equal(c.paymentDateInfo({id:'unknown',enteredAt:'2026-11-24',updatedAt:'2026-11-24'}).day,'');
 assert.equal(c.paymentDateInfo({id:'invalid',date:'2026-02-30'}).day,'');
 const dates=[{id:'new',date:'2026-11-22'},{id:'old',date:'2022-01-01',updatedAt:'2026-11-24'},{id:'legacy-thanhtoan-479',date:'2026-11-19'},{id:'unknown'}];
 assert.equal([...dates].sort(c.comparePaymentDates)[0].id,'legacy-thanhtoan-479');assert.equal([...dates].sort((a,b)=>c.comparePaymentDates(b,a)).at(-1).id,'legacy-thanhtoan-479');
 // Optional owner-provided backup stays outside the repository and never touches a server/IndexedDB.
 if(process.env.TG_TEST_BACKUP){
  const backup=JSON.parse(fs.readFileSync(process.env.TG_TEST_BACKUP,'utf8'));c.ownerData=backup.data;
  run('state=structuredClone(ownerData)');const original=run('JSON.stringify(state)'),summary=run('TGSyncCore.summary(state)');
  run("Object.assign(r42PayOptions,{q:'',type:'all',period:'all',method:'all',sort:'new'});tab('payments')");
  assert(document.querySelectorAll('.r42-payment-open').item(document.querySelectorAll('.r42-payment-open').length-1).textContent.includes('Thu trước năm 2022 · Sổ cũ'));
  c.r42PaymentSet('sort','old');assert(document.querySelector('.r42-payment-open').textContent.includes('Thu trước năm 2022 · Sổ cũ'));
  c.r42PaymentSet('period','month');assert(!document.querySelector('#content').textContent.includes('Thu trước năm 2022'));c.r42PaymentSet('period','all');
  c.r42PaymentSet('q','nam duong');assert([...document.querySelectorAll('.r42-payment-open')].some(el=>el.textContent.includes(run("date('2026-02-16')"))));
  const datesBefore=run("JSON.stringify(state.payments.filter(p=>['legacy-kh-0001','legacy-kh-0002'].includes(order(p.orderId)?.partnerId)))");
  for(const pid of ['legacy-kh-0001','legacy-kh-0002']){for(const kind of ['debt','orders']){run("previewReport('"+pid+"','"+kind+"')");await run("r42PreviewReport('"+pid+"')");assert(document.querySelector('#r42PNGViewer'));run('r42ClosePNG()');}}
  assert.equal(run('JSON.stringify(state)'),original);assert.deepEqual(run('TGSyncCore.summary(state)'),summary);assert.equal(run("JSON.stringify(state.payments.filter(p=>['legacy-kh-0001','legacy-kh-0002'].includes(order(p.orderId)?.partnerId)))"),datesBefore);
  console.log('PASS OWNER BACKUP before=after '+JSON.stringify(summary));run('state=TGSafety.normalize(fixture)');
 }
 console.log('PASS stabilization: reminder/report PNGs, stale modal completion, independent download/share/cancel, preview read-only, historical/unknown date order');
 run("tab('dashboard')");
assert(document.querySelector('.r4-recent').textContent.includes('12.500.000'));console.log('PASS AUTOMATED UI-R4 DOM: seven routes, sort/filter/search combinations, reset, debt tabs, compact rows, business action routes, four stats/recent orders; no accounting writes. Not physical Android.');
})().catch(e=>{console.error(e);process.exit(1)});
