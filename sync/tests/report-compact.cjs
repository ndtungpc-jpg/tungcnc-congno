const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'customer-receipt-display.cjs'),'utf8').split('(async()=>{')[0];
const {c,run,document}=new Function('require','__dirname',prefix+';return {c,run,document};')(require,__dirname);
const {createCanvas}=require('@napi-rs/canvas'),oldCreate=document.createElement.bind(document);let rendered=[];
document.createElement=(tag,...args)=>{if(tag!=='canvas')return oldCreate(tag,...args);const cv=createCanvas(1,1);cv.toBlob=fn=>{rendered.push({w:cv.width,h:cv.height});fn(new Blob([cv.toBuffer('image/png')],{type:'image/png'}))};return cv};
(async()=>{
 await run('init()');assert.equal(c.reportOrientation(),'landscape','new device defaults landscape');c.setReportOrientation('portrait');assert.equal(c.reportOrientation(),'portrait');c.setReportOrientation('invalid');assert.equal(c.reportOrientation(),'landscape');
 c.fixture={schemaVersion:2,revision:0,partners:[{id:'c',type:'customer',name:'Khách kiểm thử',phone:'0900000000',address:'Địa chỉ kiểm thử'}],orders:Array.from({length:40},(_,i)=>({id:'o'+i,partnerId:'c',title:'Vách kiểm thử '+i,unit:'m²',quantity:2,basisQuantity:4.698,unitPrice:1250000,amount:5872500,created:'2026-11-08'})),payments:[{id:'p',orderId:'o0',amount:1000000,date:'2026-11-20',method:'Chuyển khoản',note:'Thanh toán đợt 1'}],audit:[],trash:[],recovery:[],reminderEvents:[]};run('state=structuredClone(fixture)');const before=run('JSON.stringify(state)');
 for(const orientation of ['landscape','portrait'])for(const kind of ['orders','debt']){
  c.setReportOrientation(orientation);const base=c.reportData('c',kind);assert.equal(base.gross,40*5872500);assert.equal(base.received,1000000);assert.equal(base.remaining,40*5872500-1000000);
  let prior=0;for(const count of [1,3,40]){
   const d={...base,orders:base.orders.slice(0,count)},png=c.reportLayout(d,'png'),pdf=c.reportLayout(d);assert.equal(png.pages.length,1);assert(png.h>prior);prior=png.h;
   const rects=png.pages[0].filter(x=>x.kind==='rect'),end=Math.max(...rects.map(x=>x.y+x.h));assert.equal(png.h-end,32,'only small bottom margin');assert(!png.pages[0].some(x=>x.kind==='text'&&x.value.startsWith('Trang ')));
   if(count===1)assert(png.h<pdf.h*.8,'short image is not A4-height');if(count===40)assert(pdf.pages.length>1);
   await c.reportPNG(d);assert.equal(rendered.at(-1).h,png.h);assert.equal(rendered.at(-1).w,png.w);
  }
  const long={...base,orders:[{...base.orders[0],title:'Tên dài có dấu '.repeat(130)}]};const plan=c.reportLayout(long,'png');assert(plan.h>c.reportLayout({...base,orders:[base.orders[0]]},'png').h);assert.equal(plan.pages[0].filter(x=>x.kind==='text'&&x.value.startsWith('Tên dài')).join('').includes('undefined'),false);
  const empty={...base,pt:{type:'customer',name:'Chỉ tên'},payments:[]};assert.equal(c.reportContacts(empty).length,2);assert.equal(c.reportSections(empty).length,kind==='debt'?2:1);
 }
 assert.equal(run('JSON.stringify(state)'),before);
 c.URL.createObjectURL=()=> 'blob:test';c.URL.revokeObjectURL=()=>{};
 c.previewReport('c','orders');assert.equal(document.querySelector('[name=r42Orientation]:checked').value,'portrait');await c.r42PreviewReport('c');assert(document.querySelector('.r42-view-orientation'));assert.equal(document.querySelector('.r42-view-orientation [aria-pressed=true]').textContent,'Dọc');
 const portrait=run('r42Viewer.blob');await c.r42SwitchReportOrientation('landscape');assert.equal(document.querySelector('.r42-view-orientation [aria-pressed=true]').textContent,'Ngang');assert.equal(c.reportOrientation(),'landscape');assert.notStrictEqual(run('r42Viewer.blob'),portrait);assert.strictEqual(run('r42Viewer.blob'),await c.reportPNG(c.reportData('c','orders')));
 const file=c.r42ViewerFile();assert.equal(Buffer.compare(Buffer.from(await file.arrayBuffer()),Buffer.from(await run('r42Viewer.blob').arrayBuffer())),0,'share/download/copy file is actual preview image');
 let item;c.isSecureContext=true;c.ClipboardItem=class{constructor(data){item=data}static supports(){return true}};c.navigator.clipboard.write=async()=>{};await c.r42CopyPNG();assert.strictEqual(item['image/png'],run('r42Viewer.blob'));
 c.r42ClosePNG();c.previewReport('c','debt');assert.equal(document.querySelector('[name=r42Orientation]:checked').value,'landscape');
 // Switching rapidly or closing while rendering must not reopen old images.
 await c.r42PreviewReport('c');const real=c.reportPNG;let release;c.reportPNG=()=>new Promise(r=>release=r);const pending=c.r42SwitchReportOrientation('portrait');c.r42ClosePNG();release(portrait);await pending;assert.equal(document.getElementById('r42PNGViewer'),null);c.reportPNG=real;
 assert.equal(run('JSON.stringify(state)'),before);
 console.log('PASS compact PNG: 4 variants × 1/3/40 orders; exact 32px bottom margin; continuous image vs paginated A4; payment totals; long text/missing contacts; landscape default/persistence; in-view orientation switch; exact clipboard/view/file blob; close/race guards; state unchanged. Android device acceptance still required.');
})().catch(e=>{console.error(e);process.exit(1)});
