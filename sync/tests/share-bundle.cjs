const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'customer-receipt-display.cjs'),'utf8').split('(async()=>{')[0];
const {c,run,document}=new Function('require','__dirname',prefix+';return {c,run,document};')(require,__dirname);
(async()=>{
 await run('init()');c.URL.createObjectURL=()=> 'blob:test';c.URL.revokeObjectURL=()=>{};
 c.fixture={schemaVersion:2,revision:0,partners:[{id:'c',name:'Khách kiểm thử',type:'customer'}],orders:[{id:'o',partnerId:'c',title:'Đơn thử',amount:1000,created:'2026-11-01'}],payments:[],audit:[],trash:[],recovery:[],reminderEvents:[]};run('state=structuredClone(fixture)');const before=run('JSON.stringify(state)');
 const blobs=[new Blob(['page1'],{type:'image/png'}),new Blob(['page2'],{type:'image/png'})],qrBlob=new Blob(['QR'],{type:'image/png'});let calls=[],history=0;c.runReminderExport=async()=>{history++;throw Error('must not write reminder history')};c.navigator.share=async p=>calls.push(p);c.navigator.canShare=()=>true;
 await c.qrSaveImage('Xưởng',qrBlob);
 const open=async bs=>{c.r42OpenPNG({pid:'c',blobs:bs,blob:bs[0],snapshot:c.r42Snapshot(),fileName:'report.png'});await c.qrRefreshPickers()};
 await open([blobs[0]]);await c.r42SharePNG();assert.equal(calls.length,1);assert(calls[0].text.includes('BẢNG THỐNG KÊ'));assert.equal(calls[0].files.length,1);assert.equal(await calls[0].files[0].text(),'page1');assert(document.getElementById('qrShareStatus').textContent.includes('chưa xác nhận'));assert.equal(history,0);
 await open(blobs);c.qrPicker('report').querySelector('[data-qr-enabled]').checked=true;await c.r42SharePNG();let p=calls.at(-1);assert.equal(p.files.length,3);assert.deepEqual(await Promise.all(p.files.map(f=>f.text())),['page1','page2','QR']);assert(p.files[0].name.includes('Trang1'));assert(p.files[1].name.includes('Trang2'));assert(p.files[2].name.startsWith('QR_'));assert.equal(run('qrFlow.steps.length'),4);
 // Declined capability does not silently strip text/files. Cancel never advances or writes.
 c.navigator.canShare=()=>false;let n=calls.length;await c.r42SharePNG();assert.equal(calls.length,n);assert(document.getElementById('qrShareStatus').textContent.includes('không hỗ trợ'));assert.equal(run('qrFlow.index'),0);
 c.navigator.canShare=()=>true;c.navigator.share=async()=>{throw Object.assign(Error('cancel'),{name:'AbortError'})};await c.qrRunBundle();assert.equal(run('qrFlow.index'),0);assert(document.getElementById('qrShareStatus').textContent.includes('Đã hủy'));await c.qrRunStep('share');assert.equal(run('qrFlow.index'),0);
 // Sequential fallback keeps text then every report page then QR; each success advances.
 c.navigator.share=async p=>calls.push(p);for(let i=0;i<4;i++)await c.qrRunStep('share');const seq=calls.slice(-4);assert(seq[0].text&&!seq[0].files);assert.deepEqual(await Promise.all(seq.slice(1).map(p=>p.files[0].text())),['page1','page2','QR']);assert.equal(run('qrFlow.index'),4);
 c.r42ClosePNG();c.qrCloseFlow();await c.sendDebtReminder('c');c.currentReminderText=async()=>document.getElementById('debtReminderDraft').value;document.getElementById('debtReminderDraft').value='Tin nhắc giữ nguyên';
 await c.shareDebtReminder();p=calls.at(-1);assert.equal(p.text,'Tin nhắc giữ nguyên');assert(!p.files);
 c.qrPicker('reminder').querySelector('[data-qr-enabled]').checked=true;await c.shareDebtReminder();assert.equal(calls.at(-1).files.length,1);assert(calls.at(-1).files[0].name.startsWith('QR_'));
 document.getElementById('reminderAttachmentKind').value='orders';let generated=0;c.prepareReminderAttachment=async()=>{generated++;run('reminderAttachment={kind:"orders",blob:fixtureBlobs[0],blobs:fixtureBlobs,snapshot:reminderAttachmentState()}');return run('reminderAttachment')};c.fixtureBlobs=blobs;
 await c.shareDebtReminder();assert.equal(generated,1);p=calls.at(-1);assert.equal(p.text,'Tin nhắc giữ nguyên');assert.deepEqual(await Promise.all(p.files.map(f=>f.text())),['page1','page2','QR']);
 c.qrPicker('reminder').querySelector('[data-qr-enabled]').checked=false;await c.shareDebtReminder();assert.equal(calls.at(-1).files.length,2);assert.equal(generated,1);
 // Stale text refuses retry and retained images never mutate ledger or history.
 document.getElementById('debtReminderDraft').value='Đã sửa';n=calls.length;await c.qrRunBundle();assert.equal(calls.length,n);assert(document.getElementById('qrShareStatus').textContent.includes('đã thay đổi'));assert.equal(history,0);assert.equal(run('JSON.stringify(state)'),before);assert.equal((await c.qrRecords()).length,1);
 console.log('PASS unified share: text+1 page; all pages+QR in order; reminder text/QR/auto-prepared report; unsupported/cancel/stale safeguards; sequential fallback; no ledger/history writes; QR preserved. Android/Zalo target receipt requires physical-device acceptance.');
})().catch(e=>{console.error(e);process.exit(1)});
