'use strict';
// Report-only models. Never distribute or mutate payments/order totals.
function reportData(pid,kind='debt'){
 const pt=partner(pid);if(!pt)return null;let d;
 if(pt.type==='customer')d=customerStatementData(pid);else{const orders=state.orders.filter(o=>o.partnerId===pid&&!o.cancelled),ids=new Set(orders.map(o=>o.id)),payments=state.payments.filter(p=>ids.has(p.orderId));d={pt,orders,payments,gross:orders.reduce((a,o)=>a+o.amount,0),received:payments.reduce((a,p)=>a+p.amount,0),remaining:orders.reduce((a,o)=>a+balance(o),0)}}
 if(d.discrepancy)throw Error('Số liệu không khớp. Kiểm tra dữ liệu trước khi xuất.');
 return {...d,kind:kind==='orders'?'orders':'debt',orders:[...d.orders].sort((a,b)=>String(a.created||'').localeCompare(String(b.created||''))),payments:[...d.payments].sort((a,b)=>comparePaymentDates(a,b))};
}
function reportTitle(kind){return kind==='orders'?'BẢNG THỐNG KÊ ĐƠN HÀNG':'BẢNG ĐỐI CHIẾU CÔNG NỢ'}
// Read-only billing projection. Product counts never replace a stored billing basis.
function reportQuantity(x,item=false){
 const valid=v=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))&&Number(v)>=0;
 const unit=String(x.unit||'').trim().replace(/^m2$/i,'m²').replace(/^(m dài|mét dài)$/i,'md');
 const measured=['m²','md'].includes(unit),manual=x.type==='manual';
 const q=item?x.quantity:measured?x.basisQuantity:(manual?x.quantity:(x.quantity??x.basisQuantity));
 const warnings=[];
 if(!unit)warnings.push('Thiếu ĐVT');
 if(item&&valid(x.basisQuantity)&&valid(x.quantity)&&Math.abs(Number(x.quantity)-Number(x.basisQuantity))>0.000001)warnings.push('Hai khối lượng đã lưu mâu thuẫn');
 const typeUnit={m2:'m²',meter:'md',piece:'cái',set:'bộ',frame:'khung'}[x.type];
 if(typeUnit&&unit.toLocaleLowerCase('vi')!==typeUnit)warnings.push('Loại tính giá lệch ĐVT đã lưu');
 if(!valid(q))warnings.push('Thiếu khối lượng tính giá');
 if(valid(q)&&valid(x.unitPrice)&&valid(x.amount)&&Math.abs(Number(q)*Number(x.unitPrice)-Number(x.amount))>1)warnings.push('Khối lượng × đơn giá lệch thành tiền');
 if(!manual&&measured&&valid(q)){
  const sizes=item?x.sizes:[{widthMm:x.widthMm,heightMm:x.heightMm,count:x.quantity}];
  if(Array.isArray(sizes)&&sizes.length&&sizes.every(z=>valid(z.widthMm)&&valid(z.count)&&(unit==='md'||valid(z.heightMm)))){
   const calculated=sizes.reduce((n,z)=>n+Number(z.widthMm)*(unit==='md'?1/1000:Number(z.heightMm)/1e6)*Number(z.count),0);
   if(Math.abs(calculated-Number(q))>0.000001)warnings.push('Kích thước lệch khối lượng đã lưu');
  }
 }
 const value=valid(q)?new Intl.NumberFormat('vi-VN',{maximumFractionDigits:6}).format(Number(q))+(unit?' '+unit:''):'—';
 return value+(warnings.length?'\nCần kiểm tra: '+warnings.join('; '):'');
}
function reportOrderRows(d){return d.orders.flatMap(o=>{
 const items=o.quoteItems?.length?o.quoteItems:o.purchaseItems?.length?o.purchaseItems:null;
 const quantity=x=>reportQuantity(x,!!items).split('\n')[0];
 const annotation=x=>{const warning=reportQuantity(x,!!items).split('\n').slice(1).join('; ');return warning?'\n['+warning+']':''};
 const price=x=>x.unitPrice==null||x.unitPrice===''?'—':money(x.unitPrice);
 if(!items)return [[date(o.created),(o.title||o.code||'Đơn hàng')+annotation(o),quantity(o),price(o),money(o.amount)]];
 // Parent amount is authoritative. Children are descriptive and are never added to gross again.
 const rows=[[date(o.created),[o.code,o.title].filter(Boolean).join(' · '),'—','—','']];
 for(const [i,x] of items.entries())rows.push(['', '  '+(i+1)+'. '+[x.name,x.core,x.finish].filter(Boolean).join(' / ')+(x.sizes?.length?'\n'+x.sizes.map(z=>[z.widthMm,z.heightMm].filter(v=>v!==''&&v!=null).join(' × ')+' mm · SL '+(z.count??1)).join('; '):'')+annotation(x),quantity(x),price(x),x.amount==null?'—':money(x.amount)]);
 rows.push(['','Tổng đơn (đã gồm điều chỉnh)','—','—',money(o.amount)]);return rows;
 });}
function reportPaymentRows(d){const groups=typeof paymentGroups==='function'?paymentGroups({...state,payments:d.payments}):d.payments.map(p=>({rows:[p]}));return groups.sort((a,b)=>comparePaymentDates(a.rows[0],b.rows[0])).map(g=>{const p=g.rows[0];return [paymentDateLabel(p),friendlyPaymentNote(p),p.method||'Chưa rõ',money(g.rows.reduce((n,p)=>n+p.amount,0))]})}
function reportSections(d){return [{title:'I. Chi tiết đơn hàng',headers:['Ngày','Nội dung/Hạng mục','Khối lượng/ĐVT','Đơn giá','Thành tiền'],rows:reportOrderRows(d),widths:[22,65,31,29,35],right:[2,3,4]},...(d.kind==='debt'?[{title:'II. Lịch sử thanh toán',headers:['Ngày','Nội dung','Hình thức','Số tiền'],rows:reportPaymentRows(d),widths:[27,86,32,37],right:[3]}]:[])]}
function reportSummary(d){return d.kind==='debt'?[['Tổng đơn hàng',money(d.gross)],['Tổng thanh toán',money(d.received)],['TỔNG CÒN PHẢI THANH TOÁN',money(d.remaining)]]:[['TỔNG GIÁ TRỊ ĐƠN HÀNG',money(d.gross)]]}
function reportHTML(d){return `<div class="report-paper"><h2>${reportTitle(d.kind)}</h2><p>${esc(d.pt.name)} · Ngày lập ${date(today())}</p>${reportSections(d).map(s=>`<h3>${s.title}</h3>${table(s.headers,s.rows.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x).replaceAll('\n','<br>')+'</td>').join('')+'</tr>').join(''))}`).join('')}<h3>${d.kind==='debt'?'III. Tổng kết':'II. Tổng kết'}</h3>${reportSummary(d).map((x,i)=>`<p class="${i===reportSummary(d).length-1?'report-total':''}">${esc(x[0])}: <b>${esc(x[1])}</b></p>`).join('')}</div>`}
let reportPreview=null;
function previewReport(pid,kind='debt'){try{const d=reportData(pid,kind);if(!d)return;reportPreview={pid,kind:d.kind};modal(d.kind==='orders'?'Bảng thống kê đơn hàng':'Bảng đối chiếu công nợ',`<div class="statement-top"><span>Không phân bổ lại thanh toán hoặc thay đổi số liệu.</span><button class="btn" aria-label="Đóng báo cáo" onclick="closeModal()">Đóng</button></div>${reportHTML(d)}<div class="statement-actions"><button class="btn" onclick="exportCustomerImage('${jsid(pid)}','${d.kind}')">Xuất PNG</button><button class="btn" onclick="exportReportExcel('${jsid(pid)}','${d.kind}')">Xuất Excel</button><button class="btn" onclick="exportReportPDF('${jsid(pid)}','${d.kind}')">Xuất PDF A4</button>${d.pt.type==='customer'?`<button class="btn" onclick="sendDebtReminder('${jsid(pid)}')">Nhắc nợ</button>`:''}</div>`);document.querySelector('.dialog')?.classList.add('statement-dialog')}catch(e){alert('Chưa mở báo cáo: '+e.message)}}
statement=pid=>previewReport(pid,'debt');
printStatement=pid=>exportReportPDF(pid,'debt');
printSupplier=pid=>exportReportPDF(pid,'debt');
exportStatementExcel=pid=>exportReportExcel(pid,'debt');
function reportName(d,ext){return (d.kind==='orders'?'ThongKeDonHang_':'DoiChieuCongNo_')+d.pt.name+'_'+today()+'.'+ext}
function exportReportExcel(pid,kind){try{const d=reportData(pid,kind);if(!d)return;const rows=[[reportTitle(d.kind)],['Đối tác',d.pt.name],['Ngày lập',today()]],rightCells=[];
 for(const section of reportSections(d)){rows.push([],[section.title],section.headers);const head=rows.length-1;for(const col of section.right)rightCells.push([head,col]);for(const row of section.rows){const index=rows.length;rows.push(row);for(const col of section.right)rightCells.push([index,col]);}}
 rows.push([],[d.kind==='debt'?'III. Tổng kết':'II. Tổng kết']);for(const row of reportSummary(d)){rightCells.push([rows.length,1]);rows.push(row);}
 excelFile(reportName(d,'xlsx'),rows,{sheetName:d.kind==='debt'?'Đối chiếu':'Thống kê',widths:[29,85,32,32,36],rightCells})}catch(e){alert(e.message)}}
async function reportPNG(d){
 const cv=document.createElement('canvas'),w=2000,pad=65,inner=w-pad*2;cv.width=w;const c=cv.getContext('2d');if(!c)throw Error('Không hỗ trợ canvas');const size=30,lineH=39;
 const wrap=(v,width,bold=false)=>{c.font=(bold?'700 ':'400 ')+size+'px Arial';const out=[];let line='';for(const ch of String(v??'')){if(ch==='\n'){out.push(line);line=''}else if(line&&c.measureText(line+ch).width>width){out.push(line);line=ch}else line+=ch}out.push(line);return out};
 const sections=reportSections(d).map(s=>{const widths=s.widths.map(x=>x/s.widths.reduce((a,v)=>a+v,0)*inner),rows=s.rows.map(row=>{const cells=row.map((x,i)=>s.right.includes(i)&&i!==2?[String(x??'')]:wrap(x,widths[i]-28));return {cells,h:Math.max(88,...cells.map(x=>x.length*lineH+28))}});return {...s,widths,rows}});const nameLines=wrap('Đối tác: '+d.pt.name,inner),h=240+nameLines.length*lineH+sections.reduce((a,s)=>a+180+(s.rows.length?s.rows.reduce((a,r)=>a+r.h,0):90),0)+reportSummary(d).length*85+100;if(h>30000)throw Error('Bảng quá dài cho một ảnh. Hãy xuất PDF/Excel.');cv.height=h;c.fillStyle='#ffffff';c.fillRect(0,0,w,h);let y=65;
 const text=(t,x,yy,n=30,bold=false,align='left',maxWidth=Infinity)=>{c.fillStyle='#111111';c.font=(bold?'700 ':'400 ')+n+'px Arial';while(c.measureText(String(t)).width>maxWidth&&n>1){n-=.25;c.font=(bold?'700 ':'400 ')+n+'px Arial'}c.textAlign=align;c.fillText(String(t),x,yy);c.textAlign='left'};
 text('TÙNG GIANG CNC',pad,y,38,true);y+=68;text(reportTitle(d.kind),pad,y,44,true);y+=58;for(const t of nameLines){text(t,pad,y);y+=lineH}text('Ngày lập: '+date(today()),pad,y+12);y+=42;
 for(const s of sections){y+=65;text(s.title.toLocaleUpperCase('vi'),pad,y,34,true);y+=25;c.fillStyle='#eef1f4';c.fillRect(pad,y,inner,78);let x=pad;s.headers.forEach((t,i)=>{const head=wrap(t,s.widths[i]-28,true);head.forEach((v,j)=>text(v,s.right.includes(i)?x+s.widths[i]-14:x+14,y+30+j*28,24,true,s.right.includes(i)?'right':'left')); x+=s.widths[i]});y+=78;if(!s.rows.length){text('Chưa có dữ liệu',pad+14,y+50);y+=90}for(const [ri,r] of s.rows.entries()){if(ri%2){c.fillStyle='#f8f9fa';c.fillRect(pad,y,inner,r.h)}x=pad;r.cells.forEach((lines,i)=>{lines.forEach((line,j)=>text(line,s.right.includes(i)?x+s.widths[i]-14:x+14,y+40+j*lineH,size,i===r.cells.length-1,s.right.includes(i)?'right':'left',s.widths[i]-28));x+=s.widths[i]});y+=r.h;c.strokeStyle='#d1d5db';c.beginPath();c.moveTo(pad,y);c.lineTo(w-pad,y);c.stroke()}}
 y+=65;text(d.kind==='debt'?'III. TỔNG KẾT':'II. TỔNG KẾT',pad,y,34,true);for(const [i,[label,value]] of reportSummary(d).entries()){y+=80;text(label,pad,y,i===reportSummary(d).length-1?34:30,true);text(value,w-pad-14,y,i===reportSummary(d).length-1?48:36,true,'right',inner*.48)}
 return new Promise((resolve,reject)=>cv.toBlob(b=>b?resolve(b):reject(Error('Không tạo được PNG')),'image/png'));
}
exportCustomerImage=async(pid,kind='debt',fileName)=>{try{const d=reportData(pid,kind);if(d)await download(fileName||reportName(d,'png'),await reportPNG(d),'image/png')}catch(e){alert(e.message)}};
async function exportReportPDF(pid,kind='debt'){
 try{const d=reportData(pid,kind);if(!d)return;if(!globalThis.jspdf?.jsPDF)throw Error('Chưa tải đủ bộ xuất PDF. Tải lại hoặc kiểm tra cache PWA.');const p=new jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});p.addFileToVFS('TG-Viet.ttf',TG_PDF_FONT_BASE64);p.addFont('TG-Viet.ttf','TG','normal');p.setFont('TG');p.setTextColor(0,0,0);p.setFillColor(255,255,255);p.setProperties({title:reportTitle(d.kind)+' - '+d.pt.name,author:'Tùng Giang CNC'});
 const margin=14,usable=182,bottom=280;let y=18;const lines=(s,width,size=10)=>{p.setFontSize(size);return p.splitTextToSize(String(s??''),width)};const line=(t,x,yy,size=10,align='left',maxWidth=Infinity)=>{p.setFontSize(size);while(p.getTextWidth(String(t))>maxWidth&&size>1){size-=.25;p.setFontSize(size)}p.text(String(t),x,yy,{align})};const page=()=>{p.addPage('a4','portrait');y=18};
 line('TÙNG GIANG CNC',margin,y,12);y+=9;line(reportTitle(d.kind),margin,y,14);y+=9;for(const t of lines('Đối tác: '+d.pt.name,usable)){line(t,margin,y);y+=5}line('Ngày lập: '+date(today()),margin,y);y+=9;
 for(const s of reportSections(d)){
  const header=()=>{if(y>bottom-20)page();line(s.title,margin,y,11);y+=5;let x=margin;p.setDrawColor(180);p.setLineWidth(.15);const widths=s.widths.map(v=>v/s.widths.reduce((a,b)=>a+b,0)*usable);s.headers.forEach((t,i)=>{line(t,s.right.includes(i)?x+widths[i]-1:x+1,y+5,9,s.right.includes(i)?'right':'left',widths[i]-2);x+=widths[i]});p.line(margin,y+8,196,y+8);y+=11;return widths};let widths=header();if(!s.rows.length){line('Chưa có dữ liệu',margin,y+4);y+=12}
  for(const row of s.rows){const cells=row.map((v,i)=>s.right.includes(i)&&i!==2?[String(v??'')]:lines(v,widths[i]-3)),count=Math.max(...cells.map(v=>v.length));let at=0;while(at<count){if(y>bottom-7){page();widths=header()}const capacity=Math.max(1,Math.floor((bottom-y-3)/5)),take=Math.min(count-at,capacity);for(let j=0;j<take;j++){let x=margin;cells.forEach((ls,i)=>{if(ls[at+j])line(ls[at+j],s.right.includes(i)?x+widths[i]-1:x+1,y+4+j*5,10,s.right.includes(i)?'right':'left',widths[i]-3);x+=widths[i]})}y+=take*5+3;p.line(margin,y-1,196,y-1);at+=take;if(at<count){page();widths=header()}}}y+=5;
 }
 if(y>bottom-40)page();line(d.kind==='debt'?'III. Tổng kết':'II. Tổng kết',margin,y,11);y+=10;for(const [i,[label,value]] of reportSummary(d).entries()){const last=i===reportSummary(d).length-1;if(y>bottom-16)page();line(label,margin,y,last?10.5:10);line(value,195,y,last?13:11,'right',80);y+=10}
 const pages=p.getNumberOfPages();for(let i=1;i<=pages;i++){p.setPage(i);p.setFontSize(8);p.text('Trang '+i+' / '+pages,196,290,{align:'right'})}await download(reportName(d,'pdf'),p.output('blob'),'application/pdf');
 }catch(e){alert('Chưa xuất PDF: '+e.message)}
}
