'use strict';
// Report-only models. Never distribute or mutate payments/order totals.
function reportData(pid,kind='debt'){
 const pt=partner(pid);if(!pt)return null;let d;
 if(pt.type==='customer')d=customerStatementData(pid);else{const orders=state.orders.filter(o=>o.partnerId===pid&&!o.cancelled),ids=new Set(orders.map(o=>o.id)),payments=state.payments.filter(p=>ids.has(p.orderId));d={pt,orders,payments,gross:orders.reduce((a,o)=>a+o.amount,0),received:payments.reduce((a,p)=>a+p.amount,0),remaining:orders.reduce((a,o)=>a+balance(o),0)}}
 if(d.discrepancy||![d.gross,d.received,d.remaining].every(Number.isFinite)||Math.abs(d.gross-d.received-d.remaining)>.01+Number.EPSILON*Math.max(d.gross,d.received)*8)throw Error('Số liệu không khớp. Kiểm tra dữ liệu trước khi xuất.');
 return {...d,orientation:'landscape',kind:'orders',orders:[...d.orders].sort((a,b)=>String(a.created||'').localeCompare(String(b.created||''))),payments:[...d.payments].sort((a,b)=>comparePaymentDates(a,b))};
}
function reportTitle(){return 'BẢNG THỐNG KÊ ĐƠN HÀNG'}
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
// Official customer report: read-only event blocks, never import/update timestamps.
const REPORT_HEADERS=['STT','Ngày','Nội dung','Khối lượng/ĐVT','Đơn giá','Thành tiền'];
const REPORT_COLUMNS={widths:[5,11,41,15,14,14],padding:10};
const REPORT_COLORS={navy:'#102643',ink:'#18212b',header:'#e2ecef',stripe:'#f0f5f8',paid:'#f2faeb',green:'#356c3e',line:'#a9c1ce',summary:'#edf3f6'};
function reportDay(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&excelDate(value)===value?value:'';}
function reportDisplayQuantity(x,item=false){const unit=String(x.unit||'').trim().replace(/^m2$/i,'m²').replace(/^(m dài|mét dài)$/i,'md');if(!unit)return '–';const measured=['m²','md'].includes(unit),raw=item?x.quantity:measured?x.basisQuantity:(x.quantity??x.basisQuantity),empty=raw==null||typeof raw==='string'&&!raw.trim();if(empty)return '1 '+unit;if(typeof raw==='boolean'||!Number.isFinite(Number(raw)))return '–';return new Intl.NumberFormat('vi-VN',{maximumFractionDigits:6}).format(Number(raw))+' '+unit;}
function reportDisplayPrice(x){return x.unitPrice==null||String(x.unitPrice).trim()===''||!Number.isFinite(Number(x.unitPrice))?'–':money(x.unitPrice);}
function reportNegative(amount){return '−'+money(Math.abs(amount));}
function reportSummary(d){return [['Tổng giá trị đơn hàng',money(d.gross)],['Tổng đã thanh toán',reportNegative(d.received)],['CÒN PHẢI THANH TOÁN',money(d.remaining)]];}
function reportBlocks(d){
 const blocks=d.orders.map((o,index)=>{const day=reportDay(o.created),items=o.quoteItems?.length?o.quoteItems:o.purchaseItems?.length?o.purchaseItems:null,rows=[];
  if(items){let subtotal=0;items.forEach((x,i)=>{if(x.amount==null||!Number.isFinite(Number(x.amount)))throw Error('Hạng mục thiếu thành tiền đã lưu. Kiểm tra đơn '+(o.code||o.title));subtotal+=Number(x.amount);const size=(x.sizes||[]).filter(z=>z.widthMm!==''&&z.widthMm!=null||z.heightMm!==''&&z.heightMm!=null).map(z=>[z.widthMm,z.heightMm].filter(v=>v!==''&&v!=null).join('×')+' mm'+(z.count!=null?' · SL '+z.count:'')).join('; ');rows.push({type:'order',orderId:o.id,day:i?'':day,content:[x.name||o.title,[x.core,x.finish].filter(Boolean).join(' / '),size].filter(Boolean).join('\n'),quantity:reportDisplayQuantity(x,true),price:reportDisplayPrice(x),amount:Number(x.amount)});});const adjustment=o.amount-subtotal;if(Math.abs(adjustment)>.000001)rows.push({type:'adjustment',orderId:o.id,day:'',content:'Điều chỉnh theo tổng đơn đã lưu'+(o.code?' · '+o.code:''),quantity:'–',price:'–',amount:adjustment});
  }else rows.push({type:'order',orderId:o.id,day,content:o.title||o.code||'Đơn hàng',quantity:reportDisplayQuantity(o),price:reportDisplayPrice(o),amount:o.amount});
  return {id:'order:'+o.id,day,rank:day?0:-1,order:index,type:'order',rows};});
 const groups=typeof paymentGroups==='function'?paymentGroups({...state,payments:d.payments}):d.payments.map(p=>({rows:[p]}));
 groups.forEach((g,index)=>{const p=g.rows[0],info=paymentDateInfo(p),amount=g.rows.reduce((n,x)=>n+x.amount,0);blocks.push({id:'payment:'+g.rows.map(x=>x.id).sort().join('|'),day:info.day,rank:info.rank,order:index,type:'payment',rows:[{type:'payment',day:info.day,dateLabel:info.label,content:friendlyPaymentNote(p)||'Thu tiền',quantity:'–',price:'–',amount:-amount}]});});
 return blocks.sort((a,b)=>a.rank-b.rank||a.day.localeCompare(b.day)||((a.type==='order'?0:1)-(b.type==='order'?0:1))||a.id.localeCompare(b.id,'vi'));
}
function reportRows(d){let number=0;return reportBlocks(d).flatMap(block=>block.rows.map((row,i)=>({...row,number:++number,blockId:block.id,blockStart:i===0,blockSize:block.rows.length,date:row.dateLabel||(row.day?date(row.day):(i===0?'Chưa rõ ngày':'')),cells:[String(number),row.dateLabel||(row.day?date(row.day):(i===0?'Chưa rõ ngày':'')),row.content,row.quantity,row.price,row.amount<0?reportNegative(row.amount):money(row.amount)]})));}
function reportOrderRows(d){return reportRows(d).map(r=>r.cells);}
function reportSections(d){return [{title:'',headers:REPORT_HEADERS,rows:reportOrderRows(d),widths:REPORT_COLUMNS.widths,right:[3,4,5]}];}
function reportContacts(d){return [[d.pt.type==='supplier'?'Nhà cung cấp':'Khách hàng',d.pt.name],['Điện thoại',d.pt.phone],['Địa chỉ',d.pt.address],['Ngày lập',date(today())]].filter(([,v])=>v!=null&&String(v).trim());}
function reportName(d,ext,page){return 'ThongKeDonHang_'+d.pt.name+'_'+today()+(page?'_Trang'+page:'')+'.'+ext;}
function reportHTML(d){const rows=reportRows(d),headers=reportSections(d)[0].headers;return `<article class="official-report"><b>TÙNG GIANG CNC</b><h2>${reportTitle()}</h2>${reportContacts(d).map(([k,v])=>`<p><b>${esc(k)}:</b> ${esc(v)}</p>`).join('')}<table><colgroup>${REPORT_COLUMNS.widths.map(w=>`<col style="width:${w}%">`).join('')}</colgroup><thead><tr>${headers.map((h,i)=>`<th style="text-align:${i===0?'center':i>=3?'right':'left'}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr class="${r.type==='payment'?'report-receipt':''} ${r.blockStart?'report-order-start':''}">${r.cells.map((c,i)=>`<td style="text-align:${i===0?'center':i>=3?'right':'left'}">${esc(c).replaceAll('\n','<br>')}</td>`).join('')}</tr>`).join('')}</tbody></table><div class="official-totals">${reportSummary(d).map(([k,v],i)=>`<div class="total-${i}"><b>${k}</b><strong>${v}</strong></div>`).join('')}</div></article>`;}
// Same fixed anchors and drawing operations for preview PNGs and A4 landscape PDF.
function reportLayout(d){
 const rawRows=reportRows(d);
 const w=1960,h=1600,pad=48,padding=REPORT_COLUMNS.padding,inner=w-pad*2,right=w-pad-padding,bodySize=34,lineH=44,maxRows=rawRows.length>10&&rawRows.length%10>0&&rawRows.length%10<3?8:10,bodyBottom=1210,pages=[];const cv=document.createElement('canvas'),ctx=cv.getContext('2d');if(!ctx)throw Error('Không hỗ trợ canvas');
 const widths=REPORT_COLUMNS.widths.map(p=>p/100*inner),x=[pad];for(const width of widths)x.push(x.at(-1)+width);
 const wrap=(value,width,size=bodySize,bold=false)=>{ctx.font=(bold?'600 ':'400 ')+size+'px Arial';const out=[];for(const paragraph of String(value??'').split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(ctx.measureText(line?(line+' '+word):word).width<=width){line=line?line+' '+word:word;continue}if(line){out.push(line);line=''}for(const ch of word){if(line&&ctx.measureText(line+ch).width>width){out.push(line);line=ch}else line+=ch;}}out.push(line);}return out;};
 let page,ops,y,count=0;const rect=(xx,yy,ww,hh,color)=>ops.push({kind:'rect',x:xx,y:yy,w:ww,h:hh,color});const text=(value,xx,yy,size=bodySize,bold=false,align='left',color=REPORT_COLORS.ink)=>ops.push({kind:'text',value:String(value),x:xx,y:yy,size,bold,align,color});
 function start(){ops=[];page={ops,rows:[],width:w,height:0};pages.push(page);count=0;y=pad;text('TÙNG GIANG CNC',pad+padding,y+35,36,true,'left',REPORT_COLORS.navy);y+=52;text(reportTitle(),pad+padding,y+48,50,true,'left',REPORT_COLORS.navy);y+=72;const nameLines=wrap((d.pt.type==='supplier'?'Nhà cung cấp: ':'Khách hàng: ')+d.pt.name,inner*.72,36,true);for(const value of nameLines){text(value,pad+padding,y+34,36,true);y+=44;}text('Ngày lập: '+date(today()),right,y-10,30,false,'right');const contactValues=[d.pt.phone?'Điện thoại: '+d.pt.phone:'',d.pt.address?'Địa chỉ: '+d.pt.address:''].filter(Boolean);if(contactValues.length){const parts=contactValues.map((v,i)=>({x:pad+padding+(i?inner*.28:0),lines:wrap(v,contactValues.length===2?(i?inner*.7:inner*.27):inner-padding*2,31)}));parts.forEach(part=>part.lines.forEach((line,i)=>text(line,part.x,y+31+i*40,31)));y+=Math.max(...parts.map(p=>p.lines.length))*40;}y+=20;const headers=REPORT_HEADERS;const lines=headers.map((v,i)=>wrap(v,widths[i]-padding*2,32,true)),hh=Math.max(...lines.map(v=>v.length))*38+18;rect(pad,y,inner,hh,REPORT_COLORS.header);lines.forEach((ls,i)=>ls.forEach((v,j)=>text(v,i===0?x[i]+widths[i]/2:i>=3?x[i+1]-padding:x[i]+padding,y+35+j*38,32,true,i===0?'center':i>=3?'right':'left',REPORT_COLORS.navy)));y+=hh;page.headerBottom=y;if(y>bodyBottom-62)throw Error('Thông tin khách hàng quá dài cho một trang. Kiểm tra trước khi xuất.');}
 const rows=rawRows,laid=rows.map(row=>{const cells=row.cells.map((v,i)=>wrap(v,widths[i]-padding*2));return {...row,lines:cells,height:Math.max(...cells.map(ls=>ls.length))*lineH+18};});
 start();for(let i=0;i<laid.length;i++){
  const row=laid[i],block=laid.slice(i,i+row.blockSize),blockHeight=row.blockStart?block.reduce((n,r)=>n+r.height,0):0;
  if(count&&(count>=maxRows||y+row.height>bodyBottom||row.blockStart&&row.blockSize<=maxRows&&(count+row.blockSize>maxRows||y+blockHeight>bodyBottom)&&blockHeight<bodyBottom-page.headerBottom)){page.bodyEnd=y;start();}
  let at=0,totalLines=Math.max(...row.lines.map(v=>v.length));const continuedOrder=!row.blockStart&&count===0;
  while(at<totalLines){let capacity=Math.floor((bodyBottom-y-18)/lineH);if(capacity<1){page.bodyEnd=y;start();capacity=Math.floor((bodyBottom-y-18)/lineH);}const take=Math.min(totalLines-at,capacity),height=take*lineH+18;
   if(row.type==='payment')rect(pad,y,inner,height,REPORT_COLORS.paid);else if(row.number%2===0)rect(pad,y,inner,height,REPORT_COLORS.stripe);
   const tone=row.type==='payment'?REPORT_COLORS.green:REPORT_COLORS.ink;
   row.lines.forEach((ls,col)=>{const values=ls.slice(at,at+take);values.forEach((v,j)=>text(v,col===0?x[col]+widths[col]/2:col>=3?x[col+1]-padding:x[col]+padding,y+35+j*lineH,bodySize,row.type==='payment',col===0?'center':col>=3?'right':'left',tone));});
   if((continuedOrder||at>0)&&row.type!=='payment')text('(tiếp theo)',x[2]+padding,y+height-5,22,false,'left',REPORT_COLORS.navy);
   page.rows.push({...row,continued:continuedOrder||at>0,segmentStart:at,segmentCount:take});y+=height;at+=take;count++;if(at<totalLines){page.bodyEnd=y;start();}
  }
 }
 if(!rows.length){text('Chưa có dữ liệu',pad+padding,y+40);y+=72;}
 y+=24;reportSummary(d).forEach(([label,value],i)=>{const last=i===2,height=last?86:70;rect(pad,y,inner,height,last?REPORT_COLORS.header:REPORT_COLORS.summary);text(label,pad+padding,y+(last?56:48),last?42:36,true,'left',last?REPORT_COLORS.navy:REPORT_COLORS.ink);text(value,right,y+(last?56:48),last?46:36,true,'right',i===1?REPORT_COLORS.green:last?REPORT_COLORS.navy:REPORT_COLORS.ink);y+=height;});page.hasSummary=true;page.bodyEnd=y;
 pages.forEach((p,i)=>{ops=p.ops;const bottom=(p.bodyEnd||p.headerBottom)+24;text('Tùng Giang CNC - Cảm ơn Quý khách hàng đã tin tưởng và hợp tác!',pad+padding,bottom+26,26,false,'left',REPORT_COLORS.navy);text('Trang '+(i+1)+'/'+pages.length,right,bottom+26,26,false,'right');p.height=Math.ceil(bottom+44);if(p.height>h)throw Error('Nội dung một trang vượt giới hạn. Kiểm tra tên/thông tin quá dài trước khi xuất.');});
 return {w,h,pages,amountRight:right,widths};
}
async function reportPNGs(d){const plan=reportLayout(d);const blobs=[];for(const p of plan.pages){const cv=document.createElement('canvas');cv.width=plan.w;cv.height=p.height;const c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,cv.width,cv.height);for(const op of p.ops){c.fillStyle=op.color;if(op.kind==='rect')c.fillRect(op.x,op.y,op.w,op.h);else{c.font=(op.bold?'600 ':'400 ')+op.size+'px Arial';c.textAlign=op.align;c.fillText(op.value,op.x,op.y);}}blobs.push(await new Promise((resolve,reject)=>cv.toBlob(blob=>blob?resolve(blob):reject(Error('Không tạo được PNG')),'image/png')));}return blobs;}
async function reportPNG(d){const pages=await reportPNGs(d);if(pages.length!==1)throw Error('Báo cáo có '+pages.length+' trang. Mở xem trước để xuất đủ các trang.');return pages[0];}
async function exportReportPDF(pid){try{const d=reportData(pid);if(!d)return;const plan=reportLayout(d);if(!globalThis.jspdf?.jsPDF)throw Error('Chưa tải đủ bộ xuất PDF.');const p=new jspdf.jsPDF({unit:'mm',format:'a4',orientation:'landscape',compress:true});p.addFileToVFS('TG-Regular.ttf',TG_REPORT_REGULAR_BASE64);p.addFont('TG-Regular.ttf','TG','normal');p.addFileToVFS('TG-Bold.ttf',TG_REPORT_BOLD_BASE64);p.addFont('TG-Bold.ttf','TG','bold');const scale=p.internal.pageSize.getWidth()/plan.w;plan.pages.forEach((page,i)=>{if(i)p.addPage('a4','landscape');for(const op of page.ops){if(op.kind==='rect'){p.setFillColor(op.color);p.rect(op.x*scale,op.y*scale,op.w*scale,op.h*scale,'F');}else{p.setTextColor(op.color);p.setFont('TG',op.bold?'bold':'normal');p.setFontSize(op.size*scale*72/25.4);p.text(op.value,op.x*scale,op.y*scale,{align:op.align});}}});await download(reportName(d,'pdf'),p.output('blob'),'application/pdf');}catch(e){alert('Chưa xuất PDF: '+e.message);}}
function exportReportExcel(pid){try{const d=reportData(pid);if(!d)return;const rows=[[reportTitle()],...reportContacts(d),[],reportSections(d)[0].headers,...reportOrderRows(d),[],...reportSummary(d).map(([k,v])=>[k,'','','','',v])];excelFile(reportName(d,'xlsx'),rows,{sheetName:'Thống kê',widths:[8,18,65,24,24,26],rightCells:rows.flatMap((r,i)=>[3,4,5].map(col=>[i,col]))});}catch(e){alert('Chưa xuất Excel: '+e.message);}}
statement=pid=>previewReport(pid);printStatement=pid=>exportReportPDF(pid);printSupplier=pid=>exportReportPDF(pid);exportStatementExcel=pid=>exportReportExcel(pid);
