(function(root){'use strict';
const C=root.TGSyncCore,bytes=s=>new TextEncoder().encode(s).length;
const hash=async s=>Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
function stats(s){return {summary:C.summary(s),records:Object.fromEntries(C.kinds.map(k=>[k,(s[k]||[]).length])),items:s.orders.reduce((n,o)=>n+['quoteItems','purchaseItems'].reduce((n,k)=>n+(o[k]||[]).length,0),0),sizes:s.orders.reduce((n,o)=>n+['quoteItems','purchaseItems'].reduce((n,k)=>n+(o[k]||[]).reduce((n,x)=>n+(x.sizes||[]).length,0),0),0)};}
async function plan(main,sessionId,backupHash){const snapshot=C.initialSnapshot(main),text=JSON.stringify(snapshot),versions=C.initialVersions(snapshot),parts=[];
 if(bytes(text+JSON.stringify(versions)+sessionId)>1900000)throw Error('Sổ vượt dung lượng khởi tạo an toàn. Dữ liệu trên máy chưa thay đổi.');
 for(let i=0;i<text.length;){let end=Math.min(i+80000,text.length);if(end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;const content=text.slice(i,end);parts.push({index:parts.length,content,hash:await hash(content),bytes:bytes(content)});i=end;}
 const manifest={sessionId,snapshotHash:await hash(text),backupHash,bytes:bytes(text),stats:stats(snapshot),parts:parts.map(({index,hash,bytes})=>({index,hash,bytes}))};return {snapshot,text,versions,parts,manifest};}
root.TGInitialData={bytes,hash,stats,plan};if(typeof module!=='undefined')module.exports=root.TGInitialData;
})(globalThis);
