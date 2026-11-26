const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'customer-receipt-display.cjs'),'utf8').split('(async()=>{')[0];
const {c,run,document}=new Function('require','__dirname',prefix+';return {c,run,document};')(require,__dirname);
(async()=>{
 await run('init()');
 c.fixture={schemaVersion:2,revision:0,partners:[{id:'c',name:'KH thử',type:'customer'}],orders:[{id:'o',partnerId:'c',title:'Triện thọ',quantity:1,amount:300000,unit:'',created:'2026-11-08'}],payments:[],audit:[],trash:[],recovery:[],reminderEvents:[]};run('state=structuredClone(fixture)');const before=run('JSON.stringify(state)');
 const d=c.reportData('c','orders');assert.equal(c.reportSummary(d).length,1);assert.equal(c.reportSummary(d)[0][0],'TỔNG GIÁ TRỊ ĐƠN HÀNG');assert(!c.reportHTML(d).includes('Số đơn hàng'));const row=c.reportOrderRows(d)[0];assert.equal(row[2],'–');assert(!row[1].includes('Cần kiểm tra'));
 c.URL.createObjectURL=()=> 'blob:test';c.URL.revokeObjectURL=()=>{};
 const png=new Blob(['exact-png-export'],{type:'image/png'});c.reportPNG=async()=>png;
 c.previewReport('c','orders');assert(document.querySelector('[onclick^="r42CopyReport"]'));
 await c.r42PreviewReport('c');const buttons=[...document.querySelectorAll('.r42-view-footer button[onclick="r42SharePNG()"],.r42-view-footer button[onclick="r42DownloadPNG()"],.r42-view-footer button[onclick="r42CopyPNG()"]')];assert.deepEqual(buttons.map(b=>b.textContent),['Chia sẻ Zalo/SMS','Tải ảnh','Sao chép']);
 let item,writes=0,shareCalls=0,downloads=0,release,reject;
 c.isSecureContext=true;c.ClipboardItem=class{constructor(data){this.data=data;item=this}static supports(t){return t==='image/png'}};
 c.navigator.clipboard.write=()=>{writes++;return new Promise((ok,no)=>{release=ok;reject=no})};c.navigator.share=async()=>shareCalls++;c.download=async()=>{downloads++;return {requested:true}};
 let p=c.r42CopyPNG();const status=document.getElementById('r42ViewerStatus');assert.equal(writes,1);assert.strictEqual(item.data['image/png'],png);assert(!status.textContent.includes('Đã sao chép'));release();await p;assert(status.textContent.includes('Đã sao chép ảnh PNG'));
 p=c.r42CopyPNG();reject(Object.assign(Error('denied'),{name:'NotAllowedError'}));await p;assert(status.textContent.includes('Không thể ghi'));assert(!status.textContent.includes('Đã sao chép'));assert.equal(shareCalls,0);assert.equal(downloads,0);
 c.ClipboardItem.supports=()=>false;await c.r42CopyPNG();assert(status.textContent.includes('chưa hỗ trợ'));assert.equal(writes,2);assert.equal(shareCalls,0);c.ClipboardItem.supports=()=>true;
 c.isSecureContext=false;await c.r42CopyPNG();assert.equal(writes,2);c.isSecureContext=true;
 // Fresh export action accepts a promised blob and calls write before async rendering completes.
 c.r42ClosePNG();c.previewReport('c','orders');p=c.r42CopyReport('c');assert.equal(writes,3);assert.strictEqual(await item.data['image/png'],png);release();await p;assert(document.getElementById('r42ReportStatus').textContent.includes('Đã sao chép'));
 await c.r42PreviewReport('c');run("state.orders[0].amount+=1");await c.r42CopyPNG();assert.equal(writes,3);assert(document.getElementById('r42ViewerStatus').textContent.includes('Dữ liệu đã thay đổi'));run("state.orders[0].amount-=1");
 assert.equal(run('JSON.stringify(state)'),before);
 // Existing share/download command bodies are unchanged; exercise dispatch independently of reminder accounting.
 c.r42Output=fn=>fn(new File([png],'test.png',{type:'image/png'}));await c.r42SharePNG();assert.equal(shareCalls,1);await c.r42DownloadPNG();assert.equal(downloads,1);c.navigator.share=async()=>{throw Object.assign(Error('cancel'),{name:'AbortError'})};assert.equal(await c.r42SharePNG(),false);
 assert.equal(run('JSON.stringify(state)'),before);
 console.log('PASS Report Hotfix02: summary; customer report hides diagnostics; original share/download button order and dispatch; exact PNG clipboard blob and promised blob; pending/success/rejection/unsupported/insecure/stale guards; no copy fallback; state unchanged. Clipboard API mocked; physical paste needs device acceptance.');
})().catch(e=>{console.error(e);process.exit(1)});
