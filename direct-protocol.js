'use strict';
const TG_DIRECT_PROTOCOL='tunggiang-direct-quote-v1';
function tgCanonical(v){if(Array.isArray(v))return '['+v.map(tgCanonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+tgCanonical(v[k])).join(',')+'}';return JSON.stringify(v);}
async function tgQuoteDigest(d){const content=tgCanonical({source:d.source,customer:d.customer,items:d.items,totals:d.totals,note:d.note||''});const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');}
function tgNonce(){const b=crypto.getRandomValues(new Uint8Array(24));return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');}
function tgMessageSafe(d){try{return d&&typeof d==='object'&&d.protocol===TG_DIRECT_PROTOCOL&&JSON.stringify(d).length<=2*1024*1024;}catch{return false;}}
