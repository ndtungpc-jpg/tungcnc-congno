const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'customer-receipt-display.cjs'),'utf8').split('(async()=>{')[0];
const {c,run,document}=new Function('require','__dirname',prefix+';return {c,run,document};')(require,__dirname);
const {createCanvas}=require('@napi-rs/canvas'),oldCreate=document.createElement.bind(document);
document.createElement=(tag,...args)=>{if(tag!=='canvas')return oldCreate(tag,...args);const cv=createCanvas(1,1);cv.toBlob=fn=>fn(new Blob([cv.toBuffer('image/png')],{type:'image/png'}));return cv};
(async()=>{
 await run('init()');const source=JSON.parse(fs.readFileSync(process.argv[2])).data,orders=[10127,10128,10129,10130,10131,10132].map(line=>source.orders.find(o=>o.legacyLine===line));assert(orders.every(Boolean));
 const originalPartner=source.partners.find(p=>p.id===orders[0].partnerId);console.log('source contacts present:',Object.keys(originalPartner).filter(k=>['name','phone','address','email','zalo','website'].includes(k)));
 c.fixture={schemaVersion:2,revision:0,partners:[originalPartner],orders,payments:source.payments.filter(p=>orders.some(o=>o.id===p.orderId)),audit:[],trash:[],recovery:[],reminderEvents:[]};run('state=structuredClone(fixture)');const before=run('JSON.stringify(state)'),pid=originalPartner.id,output=path.resolve(__dirname,'../../../report-standard-artifacts');fs.mkdirSync(output,{recursive:true});
 c.jspdf=require(path.join(__dirname,'../../vendor/jspdf.umd.min.js'));
 for(const orientation of ['portrait','landscape']){
  c.setReportOrientation(orientation);assert.equal(c.reportOrientation(),orientation);
  for(const kind of ['orders','debt']){
   const d=c.reportData(pid,kind);assert.equal(d.orientation,orientation);assert.equal(d.gross,orders.reduce((a,o)=>a+o.amount,0));const rows=c.reportOrderRows(d);assert.equal(rows[0][2],'4,698 m²');assert.equal(rows[1][2],'1,6878 m²');assert.equal(rows[3][2],'–');assert.equal(rows[3][3],'–');assert(rows.every(r=>!r.join(' ').includes('Cần kiểm tra')));
   const plan=c.reportLayout(d);assert.equal(plan.pages.length,1,'six source rows fit one page '+kind+' '+orientation);assert(orientation==='portrait'?plan.w<plan.h:plan.w>plan.h);
   const texts=plan.pages.flat().filter(x=>x.kind==='text');assert(!texts.some(x=>x.value.includes('Số đơn hàng')));assert(!texts.some(x=>x.value==='II. TỔNG KẾT'));assert(texts.some(x=>x.value.includes(originalPartner.name)));assert(texts.some(x=>x.value==='TỔNG '+(kind==='orders'?'GIÁ TRỊ ĐƠN HÀNG':'CÒN PHẢI THANH TOÁN')));
   const png=await c.reportPNG(d);fs.writeFileSync(path.join(output,kind+'-'+orientation+'.png'),Buffer.from(await png.arrayBuffer()));
   let downloaded;c.download=async(name,blob)=>{downloaded=blob;return {requested:true}};await c.exportReportPDF(pid,kind);assert(downloaded);fs.writeFileSync(path.join(output,kind+'-'+orientation+'.pdf'),Buffer.from(await downloaded.arrayBuffer()));
   let sheet;c.excelFile=(name,rows)=>sheet=rows;c.exportReportExcel(pid,kind);assert(sheet.some(r=>r[2]==='4,698 m²'));assert(!sheet.some(r=>String(r[0]).includes('Số đơn hàng')));
   assert.equal(run('JSON.stringify(state)'),before);
  }
 }
 // Complete/empty contacts, long words, pagination and both shapes on synthetic inputs.
 for(const orientation of ['portrait','landscape']){
  const d={...c.reportData(pid,'debt'),orientation,pt:{type:'customer',name:'Khách thử',phone:'0900000000',address:'Địa chỉ thử '.repeat(12),email:'test@example.invalid',zalo:'0900000000',website:'example.invalid'},orders:Array.from({length:80},(_,i)=>({...orders[0],title:'Hạng mục dài '+i+' '+('Tên vách phòng thờ có nhiều chi tiết '.repeat(7))}))};
  const plan=c.reportLayout(d);assert(plan.pages.length>1);const ops=plan.pages.flat();assert(ops.some(x=>x.kind==='text'&&x.value==='Email:'));assert(ops.some(x=>x.kind==='text'&&x.value==='Địa chỉ:'));assert(ops.filter(x=>x.kind==='text'&&x.value==='Ngày').length>=plan.pages.length-1);for(const x of ops){assert(x.y>=0&&x.y<=plan.h,'vertical bounds');if(x.kind==='text'){assert(x.x>=0&&x.x<=plan.w);}}assert.equal(c.reportContacts({pt:{name:'Chỉ tên'}}).length,2);
  // No truncated characters, including long unbroken tokens.
  const long={...d,orders:[{...orders[0],title:'X'.repeat(700)}]};const text=c.reportLayout(long).pages.flat().filter(x=>x.kind==='text').map(x=>x.value).filter(x=>/^X+$/.test(x)).join('');assert.equal(text,'X'.repeat(700));
 }
 c.previewReport(pid,'orders');assert.equal(document.querySelectorAll('[name=r42Orientation]').length,2);assert.equal(document.querySelector('[name=r42Orientation]:checked').value,'landscape');assert.equal(run('JSON.stringify(state)'),before);
 fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify({source:'Backup 2026-11-23',sourceRows:[10127,10128,10129,10130,10131,10132],gross:c.reportData(pid,'orders').gross,received:c.reportData(pid,'debt').received,remaining:c.reportData(pid,'debt').remaining,physicalPhoneTest:false},null,2));
 console.log('PASS 4 source PNG/PDF templates; source totals; no warnings/count; complete/empty contacts; orientation persistence/UI; long words/multipage headers/bounds; exports and state unchanged.');
})().catch(e=>{console.error(e);process.exit(1)});
