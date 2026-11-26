const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'customer-receipt-display.cjs'),'utf8').split('(async()=>{')[0];
const {c,run,document}=new Function('require','__dirname',prefix+';return {c,run,document};')(require,__dirname);
(async()=>{
 await run('init()');
 const inputs=[
 {title:'Vách 870×2700',unit:'m²',quantity:2,basisQuantity:4.698,widthMm:870,heightMm:2700,unitPrice:1250000,amount:5872500},
 {title:'Nóc 1940×870',unit:'m²',quantity:1,basisQuantity:1.6878,widthMm:1940,heightMm:870,unitPrice:1250000,amount:2109750},
 {title:'Diềm ~7md',unit:'m dài',quantity:null,basisQuantity:7,unitPrice:150000,amount:1050000},
 {title:'Triện thọ D60',unit:'',quantity:1,basisQuantity:null,unitPrice:null,amount:300000},
 {title:'Cắt CNC 6 cánh 386×413',unit:'m²',quantity:6,basisQuantity:.956508,widthMm:386,heightMm:413,unitPrice:200000,amount:191301.6}];
 if(process.argv[2]){
  const raw=JSON.parse(fs.readFileSync(process.argv[2])).data.orders;
  [10127,10128,10129,10130,10132].forEach((line,i)=>{const o=raw.find(x=>x.legacyLine===line);assert(o,'source line '+line);for(const k of ['unit','quantity','basisQuantity','unitPrice','amount'])assert.equal(o[k],inputs[i][k],line+' '+k);});
 }
 c.fixture={schemaVersion:2,revision:0,partners:[{id:'c',name:'KH kiểm thử',type:'customer'}],orders:inputs.map((x,i)=>({...x,id:'o'+i,partnerId:'c',code:'T'+i,created:'2026-11-08'})),payments:[],audit:[],trash:[],recovery:[],reminderEvents:[]};run('state=structuredClone(fixture)');
 const before=run('JSON.stringify(state)'),d=c.reportData('c','orders'),expected=['4,698 m²','1,6878 m²','7 md','1\nCần kiểm tra: Thiếu ĐVT','0,956508 m²'];
 assert.deepEqual(Array.from(c.reportOrderRows(d),r=>r[2]),expected.map(v=>v.split('\n')[0]));
 for(const [i,o] of c.fixture.orders.entries()){c.viewOrderDetails(o.id);assert(document.querySelector('#modalBody').textContent.includes(expected[i].split('\n')[0]));run('closeModal(true)');}
 assert.equal(c.reportQuantity({unit:'m²',quantity:6}), '—\nCần kiểm tra: Thiếu khối lượng tính giá');
 for(const unit of ['cái','bộ','tấm','khung'])assert.equal(c.reportQuantity({unit,quantity:3,basisQuantity:0}),'3 '+unit);
 assert.equal(c.reportQuantity({unit:'kg',type:'manual',quantity:2.75,unitPrice:100,amount:275},true),'2,75 kg');
 assert(c.reportQuantity({unit:'m²',quantity:4,basisQuantity:5,unitPrice:100,amount:400}).includes('Cần kiểm tra'));
 assert(c.reportQuantity({unit:'m²',quantity:2,basisQuantity:4,widthMm:1000,heightMm:1000}).includes('Kích thước lệch'));
 assert(c.reportQuantity({unit:'m²',basisQuantity:'oops'}).includes('Thiếu khối lượng'));
 assert.equal(c.reportQuantity({unit:'m²',quantity:4,sizes:[{widthMm:1,heightMm:1,count:99}],type:'manual'},true),'4 m²');
 const html=c.reportHTML(d);for(const value of expected)assert(html.includes(value.split('\n')[0]));assert(html.includes('[Cần kiểm tra: Thiếu ĐVT]'));
 let excelRows;c.excelFile=(name,rows)=>{excelRows=rows};c.exportReportExcel('c','orders');for(const value of expected)assert(excelRows.some(r=>r[2]===value.split('\n')[0]));
 const {createCanvas}=require('@napi-rs/canvas'),oldCreate=document.createElement.bind(document),draw=[];
 document.createElement=(tag,...args)=>{if(tag!=='canvas')return oldCreate(tag,...args);const cv=createCanvas(1,1),get=cv.getContext.bind(cv);cv.getContext=(...args)=>{const ctx=get(...args),fill=ctx.fillText.bind(ctx);ctx.fillText=(t,...xy)=>{draw.push(String(t));fill(t,...xy)};return ctx};cv.toBlob=fn=>fn(new Blob([cv.toBuffer('image/png')],{type:'image/png'}));return cv};
 const png=await c.reportPNG(d);assert(png.size>1000);for(const value of expected)assert(draw.includes(value.split('\n')[0]));assert(draw.some(x=>x.includes('Cần kiểm tra')));
 const pdfText=[],pdfCalls=[];c.jspdf=require(path.join(__dirname,'../../vendor/jspdf.umd.min.js'));const Actual=c.jspdf.jsPDF;c.jspdf={jsPDF:function(...args){const p=new Actual(...args),text=p.text.bind(p);p.text=(v,...args)=>{pdfText.push(String(v));return text(v,...args)};return p}};c.download=async(name,blob,type)=>{pdfCalls.push({name,blob,type});return {requested:true}};await c.exportReportPDF('c','orders');assert.equal(pdfCalls.length,1);assert(pdfCalls[0].blob.size>1000);for(const value of expected)assert(pdfText.includes(value.split('\n')[0]));assert(pdfText.some(x=>x.includes('Cần kiểm tra')));
 assert.equal(run('JSON.stringify(state)'),before);
 console.log('PASS: five source lines; detail/preview/Excel rows/real PNG/real PDF; measured/count/manual/missing/conflict; state byte-for-byte unchanged.');
})().catch(e=>{console.error(e);process.exit(1)});
