(function(root){
'use strict';
// Minimal SpreadsheetML snapshot exporter. Text uses UTF-8 inline strings;
// amounts use numeric cells. No formulas, external links, or network requests.
const enc=new TextEncoder(),ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
function xml(v){return String(v??'').replace(/_x[\da-f]{4}_/gi,m=>'_x005F_'+m.slice(1)).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\r]/g,c=>'_x'+c.charCodeAt(0).toString(16).padStart(4,'0').toUpperCase()+'_').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
function col(i){let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s}
function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
function header(length,fields){const b=new Uint8Array(length),v=new DataView(b.buffer);for(const [offset,value,size] of fields)size===2?v.setUint16(offset,value,true):v.setUint32(offset,value,true);return b}
function zip(entries){
 const local=[],central=[];let offset=0,centralSize=0;
 for(const [name,contents] of entries){
  const n=enc.encode(name),data=enc.encode(contents),crc=crc32(data);
  const l=header(30,[[0,0x04034b50,4],[4,20,2],[6,0x800,2],[12,33,2],[14,crc,4],[18,data.length,4],[22,data.length,4],[26,n.length,2]]);
  const c=header(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x800,2],[14,33,2],[16,crc,4],[20,data.length,4],[24,data.length,4],[28,n.length,2],[42,offset,4]]);
  local.push(l,n,data);central.push(c,n);offset+=l.length+n.length+data.length;centralSize+=c.length+n.length;
 }
 const end=header(22,[[0,0x06054b50,4],[8,entries.length,2],[10,entries.length,2],[12,centralSize,4],[16,offset,4]]);
 const result=new Uint8Array(offset+centralSize+end.length);let at=0;for(const part of [...local,...central,end]){result.set(part,at);at+=part.length}return result;
}
const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${ns}"><numFmts count="3"><numFmt numFmtId="164" formatCode="#,##0"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/><numFmt numFmtId="166" formatCode="#,##0.000000"/></numFmts><fonts count="3"><font><sz val="11"/><color rgb="FF172435"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FF102B45"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF102B45"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF5"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="2" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
function worksheet(spec){
 const rows=spec.rows;if(!Array.isArray(rows)||!rows.length||rows.length>1048576)throw Error('Số dòng Excel không hợp lệ');
 const count=rows.reduce((n,r)=>Math.max(n,r.length),0);if(count<1||count>16384)throw Error('Số cột Excel không hợp lệ');
 const head=spec.headerRow||1,dates=new Set(spec.dateColumns||[]),totals=new Set(spec.totalRows||[]);
 const body=rows.map((r,i)=>{
  const cells=r.map((value,j)=>{
   const ref=col(j)+(i+1);let date=false,v=value;
   if(i+1>head&&dates.has(j)&&typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)){
    const ms=Date.parse(v+'T00:00:00Z');if(Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===v){v=(ms-Date.UTC(1899,11,30))/86400000;date=true}
   }
   const numeric=typeof v==='number';if(numeric&&!Number.isFinite(v))throw Error('Số tiền Excel không hợp lệ');
   const style=i+1===head?1:totals.has(i+1)?numeric?6:5:date?3:numeric?(spec.decimalColumns||[]).includes(j)&&!Number.isInteger(v)?7:2:0;
   if(v==null||v==='')return '<c r="'+ref+'" s="'+style+'"/>';
   if(numeric)return '<c r="'+ref+'" s="'+style+'" t="n"><v>'+v+'</v></c>';
   if(typeof v==='boolean')return '<c r="'+ref+'" s="'+style+'" t="b"><v>'+(v?1:0)+'</v></c>';
   if(String(v).length>32767)throw Error('Nội dung một ô dài hơn giới hạn Excel');
   return '<c r="'+ref+'" s="'+style+'" t="inlineStr"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>';
  }).join('');
  return '<row r="'+(i+1)+'" ht="'+(i+1===head?32:36)+'" customHeight="1">'+cells+'</row>';
 }).join('');
 const pane=spec.freezeRows===0?'':'<pane ySplit="'+head+'" topLeftCell="A'+(head+1)+'" activePane="bottomLeft" state="frozen"/>';
 const widths=Array.from({length:count},(_,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+Math.max(8,Math.min(100,Number(spec.widths?.[i])||22))+'" customWidth="1"/>').join('');
 const merge=spec.mergeRows?.length?'<mergeCells count="'+spec.mergeRows.length+'">'+spec.mergeRows.map(n=>'<mergeCell ref="A'+n+':'+col(count-1)+n+'"/>').join('')+'</mergeCells>':'';
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="'+ns+'"><dimension ref="A1:'+col(count-1)+rows.length+'"/><sheetViews><sheetView showGridLines="0" workbookViewId="0">'+pane+'</sheetView></sheetViews><sheetFormatPr defaultRowHeight="36"/><cols>'+widths+'</cols><sheetData>'+body+'</sheetData>'+(spec.autoFilter?'<autoFilter ref="A'+head+':'+col(count-1)+(spec.filterLastRow||rows.length)+'"/>':'')+merge+'<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>';
}
function encode(sheets){
 if(!Array.isArray(sheets)||!sheets.length)throw Error('Chưa có trang tính');
 const names=new Set();for(const s of sheets){if(typeof s.name!=='string'||!s.name||s.name.length>31||/[\\/?*\[\]:]/.test(s.name)||names.has(s.name.toLowerCase()))throw Error('Tên trang Excel không hợp lệ');names.add(s.name.toLowerCase())}
 const files=[['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>'],['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],['xl/workbook.xml','<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="'+ns+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>'<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>'],['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],['xl/styles.xml',styles]];
 sheets.forEach((s,i)=>files.push(['xl/worksheets/sheet'+(i+1)+'.xml',worksheet(s)]));return zip(files);
}
root.TGExcel={encode,mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
if(typeof module!=='undefined')module.exports=root.TGExcel;
})(globalThis);
