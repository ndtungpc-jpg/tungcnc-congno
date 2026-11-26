'use strict';
// Report-only models. Never distribute or mutate payments/order totals.
function reportData(pid,kind='debt'){
 const pt=partner(pid);if(!pt)return null;let d;
 if(pt.type==='customer')d=customerStatementData(pid);else{const orders=state.orders.filter(o=>o.partnerId===pid&&!o.cancelled),ids=new Set(orders.map(o=>o.id)),payments=state.payments.filter(p=>ids.has(p.orderId));d={pt,orders,payments,gross:orders.reduce((a,o)=>a+o.amount,0),received:payments.reduce((a,p)=>a+p.amount,0),remaining:orders.reduce((a,o)=>a+balance(o),0)}}
 if(d.discrepancy)throw Error('Số liệu không khớp. Kiểm tra dữ liệu trước khi xuất.');
 return {...d,orientation:reportOrientation(),style:reportReadStyle(reportOrientation()),kind:kind==='orders'?'orders':'debt',orders:[...d.orders].sort((a,b)=>String(a.created||'').localeCompare(String(b.created||''))),payments:[...d.payments].sort((a,b)=>comparePaymentDates(a,b))};
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
 const quantity=x=>String(x.unit||'').trim()?reportQuantity(x,!!items).split('\n')[0].replace(/^—$/,'–'):'–';
 const annotation=()=>''; // Customer reports omit internal diagnostics; source detail retains them.
 const price=x=>x.unitPrice==null||x.unitPrice===''?'–':money(x.unitPrice);
 if(!items)return [[date(o.created),(o.title||o.code||'Đơn hàng')+annotation(o),quantity(o),price(o),money(o.amount)]];
 // Parent amount is authoritative. Children are descriptive and are never added to gross again.
 const rows=[[date(o.created),[o.code,o.title].filter(Boolean).join(' · '),'—','—','']];
 for(const [i,x] of items.entries())rows.push(['', '  '+(i+1)+'. '+[x.name,x.core,x.finish].filter(Boolean).join(' / ')+(x.sizes?.length?'\n'+x.sizes.map(z=>[z.widthMm,z.heightMm].filter(v=>v!==''&&v!=null).join(' × ')+' mm · SL '+(z.count??1)).join('; '):'')+annotation(x),quantity(x),price(x),x.amount==null?'—':money(x.amount)]);
 rows.push(['','Tổng đơn (đã gồm điều chỉnh)','—','—',money(o.amount)]);return rows;
 });}
function reportPaymentRows(d){const groups=typeof paymentGroups==='function'?paymentGroups({...state,payments:d.payments}):d.payments.map(p=>({rows:[p]}));return groups.sort((a,b)=>comparePaymentDates(a.rows[0],b.rows[0])).map(g=>{const p=g.rows[0];return [paymentDateLabel(p),friendlyPaymentNote(p),p.method||'Chưa rõ',money(g.rows.reduce((n,p)=>n+p.amount,0))]})}
function reportSections(d){const style=reportSanitizeStyle(d.style||reportReadStyle(d.orientation),d.orientation),section=(key,title,headers,rows)=>({key,title,headers,rows,widths:style[key].widths,aligns:style[key].aligns,right:style[key].aligns.flatMap((a,i)=>a==='right'?[i]:[])});return [section('orders','I. CHI TIẾT ĐƠN HÀNG',['Ngày','Nội dung/Hạng mục','Khối lượng/ĐVT','Đơn giá','Thành tiền'],reportOrderRows(d)),...(d.kind==='debt'?[section('payments','II. LỊCH SỬ THANH TOÁN',['Ngày','Nội dung','Số tiền'],reportPaymentRows(d).map(r=>[r[0],[r[1],r[2]==='Chưa rõ'?'':r[2]].filter(Boolean).join(' · '),r[3]]))]:[])];}
function reportSummary(d){return d.kind==='debt'?[['Tổng giá trị đơn hàng',money(d.gross)],['Tổng thanh toán',money(d.received)],['TỔNG CÒN PHẢI THANH TOÁN',money(d.remaining)]]:[['TỔNG GIÁ TRỊ ĐƠN HÀNG',money(d.gross)]]}
function reportOrientation(){try{return localStorage.getItem('tg-report-orientation')==='portrait'?'portrait':'landscape'}catch{return 'landscape'}}
function setReportOrientation(value){try{localStorage.setItem('tg-report-orientation',value==='portrait'?'portrait':'landscape')}catch{}}
function reportContacts(d){return [[d.pt.type==='supplier'?'Nhà cung cấp':'Khách hàng',d.pt.name],['Điện thoại',d.pt.phone],['Địa chỉ',d.pt.address],['Email',d.pt.email],['Zalo',d.pt.zalo],['Website',d.pt.website],['Ngày lập',date(today())]].filter(([,v])=>v!=null&&String(v).trim()).map(([k,v])=>[k,String(v)]);}
function reportHTML(d){return `<div class="report-paper report-standard report-${d.orientation||'portrait'}"><b class="report-brand">TÙNG GIANG CNC</b><h2>${reportTitle(d.kind)}</h2><dl class="report-contacts">${reportContacts(d).map(([k,v])=>`<div><dt>${esc(k)}:</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${reportSections(d).map(s=>`<h3>${s.title}</h3><table><colgroup>${s.widths.map(w=>`<col style="width:${w}%">`).join('')}</colgroup><thead><tr>${s.headers.map((v,i)=>`<th class="${s.right.includes(i)?'report-numeric':''}">${esc(v)}</th>`).join('')}</tr></thead><tbody>${s.rows.length?s.rows.map(row=>'<tr>'+row.map((v,i)=>`<td class="${s.right.includes(i)?'report-numeric':''}">${esc(v).replaceAll('\n','<br>')}</td>`).join('')+'</tr>').join(''):`<tr><td colspan="${s.headers.length}">Chưa có dữ liệu</td></tr>`}</tbody></table>`).join('')}${d.kind==='debt'?'<h3>III. TỔNG KẾT</h3>':''}<div class="report-summary">${reportSummary(d).map((x,i)=>`<div class="${i===reportSummary(d).length-1?'report-total':''}"><b>${esc(x[0])}</b><strong>${esc(x[1])}</strong></div>`).join('')}</div></div>`}
let reportPreview=null;
function previewReport(pid,kind='debt'){try{const d=reportData(pid,kind);if(!d)return;reportPreview={pid,kind:d.kind};modal(d.kind==='orders'?'Bảng thống kê đơn hàng':'Bảng đối chiếu công nợ',`<div class="statement-top"><span>Không phân bổ lại thanh toán hoặc thay đổi số liệu.</span><button class="btn" aria-label="Đóng báo cáo" onclick="closeModal()">Đóng</button></div>${reportHTML(d)}<div class="statement-actions"><button class="btn" onclick="exportCustomerImage('${jsid(pid)}','${d.kind}')">Xuất PNG</button><button class="btn" onclick="exportReportExcel('${jsid(pid)}','${d.kind}')">Xuất Excel</button><button class="btn" onclick="exportReportPDF('${jsid(pid)}','${d.kind}')">Xuất PDF A4</button>${d.pt.type==='customer'?`<button class="btn" onclick="sendDebtReminder('${jsid(pid)}')">Nhắc nợ</button>`:''}</div>`);document.querySelector('.dialog')?.classList.add('statement-dialog')}catch(e){alert('Chưa mở báo cáo: '+e.message)}}
statement=pid=>previewReport(pid,'debt');
printStatement=pid=>exportReportPDF(pid,'debt');
printSupplier=pid=>exportReportPDF(pid,'debt');
exportStatementExcel=pid=>exportReportExcel(pid,'debt');
function reportName(d,ext){return (d.kind==='orders'?'ThongKeDonHang_':'DoiChieuCongNo_')+d.pt.name+'_'+today()+(d.orientation==='landscape'?'_Ngang':'_Doc')+'.'+ext}
function exportReportExcel(pid,kind){try{const d=reportData(pid,kind);if(!d)return;const rows=[[reportTitle(d.kind)],...reportContacts(d)],rightCells=[];
 for(const section of reportSections(d)){rows.push([],[section.title],section.headers);const head=rows.length-1;for(const col of section.right)rightCells.push([head,col]);for(const row of section.rows){const index=rows.length;rows.push(row);for(const col of section.right)rightCells.push([index,col]);}}
 rows.push([]);if(d.kind==='debt')rows.push(['III. TỔNG KẾT']);for(const row of reportSummary(d)){rightCells.push([rows.length,1]);rows.push(row);}
 excelFile(reportName(d,'xlsx'),rows,{sheetName:d.kind==='debt'?'Đối chiếu':'Thống kê',widths:[29,85,32,32,36],rightCells})}catch(e){alert(e.message)}}
// One drawing plan for PNG and vector PDF; only layout changes between orientations.
function reportLayout(d,format='pdf'){
 const style=reportSanitizeStyle(d.style||reportReadStyle(d.orientation),d.orientation),bodySize=style.bodySize,rowLine=Math.ceil(bodySize*1.35);
 const landscape=d.orientation==='landscape',w=landscape?2263:1600,h=landscape?1600:2263,pad=60,inner=w-2*pad,bottom=format==='png'?Infinity:h-pad-42;
 const cv=document.createElement('canvas'),ctx=cv.getContext('2d');if(!ctx)throw Error('Không hỗ trợ canvas');
 const palette={navy:'#0c2242',blue:'#225b91',section:'#edf2f7',head:'#f3f4f6',stripe:'#fafbfc',total:'#e6eff9',ink:'#151b24'};
 let ops=[],pages=[],guides=[],y=pad;
 const rect=(x,yy,width,height,color)=>ops.push({kind:'rect',x,y:yy,w:width,h:height,color});
 const text=(value,x,yy,size=34,bold=false,align='left',color=palette.ink)=>ops.push({kind:'text',value:String(value),x,y:yy,size,bold,align,color});
 const rule=yy=>rect(pad,yy,inner,3,palette.blue);
 function wrap(value,width,size=34,bold=false){
  ctx.font=(bold?'700 ':'400 ')+size+'px Arial';const out=[];
  for(const paragraph of String(value??'').split('\n')){let line='';for(const word of paragraph.split(/\s+/)){const candidate=line?line+' '+word:word;if(ctx.measureText(candidate).width<=width){line=candidate;continue}if(line){out.push(line);line=''}if(ctx.measureText(word).width<=width){line=word;continue}for(const ch of word){if(line&&ctx.measureText(line+ch).width>width){out.push(line);line=ch}else line+=ch}}out.push(line);}return out;
 }
 function page(){pages.push(ops);ops=[];y=pad;text('TÙNG GIANG CNC',pad,y+30,30,true,'left',palette.navy);y+=50;text(reportTitle(d.kind),style.titleAlign==='center'?w/2:pad,y+35,35,style.titleBold,style.titleAlign,palette.navy);y+=55;rule(y);y+=22;}
 text('TÙNG GIANG CNC',pad,y+36,36,true,'left',palette.navy);y+=64;
 for(const line of wrap(reportTitle(d.kind),inner,style.titleSize,style.titleBold)){text(line,style.titleAlign==='center'?w/2:pad,y+style.titleSize,style.titleSize,style.titleBold,style.titleAlign,palette.navy);y+=Math.ceil(style.titleSize*1.2);}rule(y);y+=30;
 const contacts=reportContacts(d);
 if(landscape){
  const left=contacts.filter(([k])=>!['Địa chỉ','Ngày lập'].includes(k)),right=contacts.filter(([k])=>['Địa chỉ','Ngày lập'].includes(k));
  const start=y;let end=y;for(const [col,rows] of [left,right].entries()){y=start;const x=pad+col*(inner*.49),width=inner*.48;for(const [key,val] of rows){const ls=wrap(val,width-250);text(key+':',x,y+35,34,true);ls.forEach((line,j)=>text(line,x+250,y+35+j*46));y+=Math.max(1,ls.length)*46+8;}end=Math.max(end,y);}y=end+22;
 }else{for(const [key,val] of contacts){const ls=wrap(val,inner-250);text(key+':',pad,y+35,34,true);ls.forEach((line,j)=>text(line,pad+250,y+35+j*46));y+=Math.max(1,ls.length)*46+8;}y+=22;}
 for(const section of reportSections(d)){
  const anchor=(x,width,i)=>section.aligns[i]==='right'?x+width-12:section.aligns[i]==='center'?x+width/2:x+12;
  const widths=section.widths.map(v=>v/100*inner),headerLines=section.headers.map((v,i)=>wrap(v,widths[i]-24,25,true)),headerHeight=Math.max(...headerLines.map(ls=>ls.length))*33+24;
  const header=()=>{rect(pad,y,inner,58,palette.section);text(section.title,pad+18,y+39,31,true,'left',palette.navy);y+=72;rect(pad,y,inner,headerHeight,palette.head);guides.push({key:section.key,y,height:headerHeight+90});let x=pad;headerLines.forEach((ls,i)=>{ls.forEach((v,j)=>text(v,anchor(x,widths[i],i),y+32+j*33,25,true,section.aligns[i]));x+=widths[i]});y+=headerHeight;};
  if(y+150>bottom)page();header();
  if(!section.rows.length){text('Chưa có dữ liệu',pad+14,y+38);y+=66;}
  for(const [ri,row] of section.rows.entries()){
   const sizes=row.map(()=>bodySize);
   const cells=row.map((v,i)=>wrap(v,widths[i]-24,sizes[i],style.bodyBold===null?i===row.length-1:style.bodyBold)),count=Math.max(...cells.map(ls=>ls.length));let at=0;
   const rowHeight=count*rowLine+24;if(y+rowHeight>bottom&&rowHeight<bottom-pad-220){page();header();}
   while(at<count){let capacity=Math.floor((bottom-y-24)/rowLine);if(capacity<1){page();header();capacity=Math.floor((bottom-y-24)/rowLine);}const take=Math.min(count-at,capacity),height=take*rowLine+24;if(ri%2)rect(pad,y,inner,height,palette.stripe);let x=pad;cells.forEach((ls,i)=>{ls.slice(at,at+take).forEach((v,j)=>text(v,anchor(x,widths[i],i),y+bodySize+7+j*rowLine,sizes[i],style.bodyBold===null?i===row.length-1:style.bodyBold,section.aligns[i]));x+=widths[i]});y+=height;at+=take;if(at<count){page();header();}}
  }y+=30;
 }
 const summary=reportSummary(d).map(([label,value],i,all)=>{const last=i===all.length-1,size=last?style.totalSize:32,bold=last?style.totalBold:true,values=wrap(value,inner*.37,size,bold),labels=wrap(label,inner*.59,last?29:27,bold),lineHeight=Math.ceil(size*1.25),height=Math.max(last?88:75,values.length*lineHeight+24,labels.length*36+26);return {last,size,bold,values,labels,lineHeight,height};});
 const summaryHeight=(d.kind==='debt'?76:0)+summary.reduce((n,r)=>n+r.height,0)+20;if(y+summaryHeight>bottom)page();
 if(d.kind==='debt'){rect(pad,y,inner,58,palette.section);text('III. TỔNG KẾT',pad+18,y+39,31,true,'left',palette.navy);y+=76;}
 for(const r of summary){if(r.last)rect(pad,y,inner,r.height,palette.total);r.labels.forEach((line,j)=>text(line,pad+18,y+43+j*36,r.last?29:27,r.bold,'left',r.last?palette.navy:palette.ink));r.values.forEach((line,j)=>text(line,w-pad-18,y+r.size+8+j*r.lineHeight,r.size,r.bold,'right',r.last?palette.navy:palette.ink));y+=r.height;}
 if(format==='png')return {w,h:Math.ceil(y+32),pages:[ops],guides};
 pages.push(ops);pages.forEach((p,i)=>p.push({kind:'text',value:pages.length>1?'Trang '+(i+1)+' / '+pages.length:'',x:w-pad,y:h-30,size:20,bold:false,align:'right',color:palette.navy}));return {w,h,pages,guides};
}
async function reportPNG(d){
 const plan=reportLayout(d,'png'),cv=document.createElement('canvas');cv.width=plan.w;cv.height=plan.h*plan.pages.length;if(cv.height>30000)throw Error('Bảng quá dài cho một ảnh. Hãy xuất PDF/Excel.');const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);
 plan.pages.forEach((page,i)=>{for(const op of page){ctx.fillStyle=op.color;if(op.kind==='rect')ctx.fillRect(op.x,op.y+i*plan.h,op.w,op.h);else{ctx.font=(op.bold?'600 ':'400 ')+op.size+'px Arial';ctx.textAlign=op.align;ctx.fillText(op.value,op.x,op.y+i*plan.h);}}});
 return new Promise((resolve,reject)=>cv.toBlob(blob=>blob?resolve(blob):reject(Error('Không tạo được PNG')),'image/png'));
}
exportCustomerImage=async(pid,kind='debt',fileName)=>{try{const d=reportData(pid,kind);if(d)await download(fileName||reportName(d,'png'),await reportPNG(d),'image/png')}catch(e){alert(e.message)}};
async function exportReportPDF(pid,kind='debt'){
 try{const d=reportData(pid,kind);if(!d)return;if(!globalThis.jspdf?.jsPDF)throw Error('Chưa tải đủ bộ xuất PDF. Tải lại hoặc kiểm tra cache PWA.');const plan=reportLayout(d),p=new jspdf.jsPDF({unit:'mm',format:'a4',orientation:d.orientation,compress:true});p.addFileToVFS('TG-Viet.ttf',TG_REPORT_REGULAR_BASE64);p.addFont('TG-Viet.ttf','TG','normal');p.addFileToVFS('TG-Bold.ttf',TG_REPORT_BOLD_BASE64);p.addFont('TG-Bold.ttf','TG','bold');p.setProperties({title:reportTitle(d.kind)+' - '+d.pt.name,author:'Tùng Giang CNC'});
 const scale=p.internal.pageSize.getWidth()/plan.w;
 plan.pages.forEach((page,i)=>{if(i)p.addPage('a4',d.orientation);for(const op of page){if(op.kind==='rect'){p.setFillColor(op.color);p.rect(op.x*scale,op.y*scale,op.w*scale,op.h*scale,'F')}else{p.setFont('TG',op.bold?'bold':'normal');p.setFontSize(op.size*scale*72/25.4);p.setTextColor(op.color);p.text(op.value,op.x*scale,op.y*scale,{align:op.align})}}});
 await download(reportName(d,'pdf'),p.output('blob'),'application/pdf');
 }catch(e){alert('Chưa xuất PDF: '+e.message)}
}
