// Read-only comparison of private before/after exports. No database mutation.
const fs=require('fs'),assert=require('assert'),crypto=require('crypto');
const C=require('../sync/core.js');
const [beforePath,afterPath]=process.argv.slice(2);if(!beforePath||!afterPath)throw Error('Usage: node scripts/audit-v23-test-deletion.cjs before.json after.json');
const read=p=>{const bytes=fs.readFileSync(p),raw=JSON.parse(bytes);return {bytes,raw,data:raw.data||raw}},hash=v=>crypto.createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:C.canonical(v)).digest('hex');
const a=read(beforePath),b=read(afterPath),old=a.data,next=b.data,id='90adbc6d-904e-4490-ac18-13812306aaa3';
const original=old.partners.filter(p=>p.id===id);assert.equal(original.length,1);assert.equal(original[0].name,'TEST');assert.equal(old.partners.length,119);assert.equal(next.partners.length,118);
assert.deepStrictEqual(next.partners,old.partners.filter(p=>p.id!==id));assert.deepStrictEqual(next.orders,old.orders);assert.deepStrictEqual(next.payments,old.payments);
assert.equal(old.orders.filter(o=>o.partnerId===id).length,0);
const addedTrash=next.trash.filter(t=>!old.trash.some(x=>x.id===t.id)),addedAudit=next.audit.filter(t=>!old.audit.some(x=>x.id===t.id));
assert.equal(addedTrash.length,1);assert.equal(addedAudit.length,1);const t=addedTrash[0],audit=addedAudit[0];assert.equal(t.kind,'partners');assert.deepStrictEqual(t.record,original[0]);assert.equal(audit.action,'delete');assert.equal(audit.kind,'partners');assert.equal(audit.recordId,id);assert.deepStrictEqual(audit.before,original[0]);assert.equal(audit.after,null);
assert.deepStrictEqual(next.trash.filter(x=>x.id!==t.id),old.trash);assert.deepStrictEqual(next.audit.filter(x=>x.id!==audit.id),old.audit);
assert.equal(next.revision,old.revision+1);for(const k of new Set([...Object.keys(old),...Object.keys(next)]))if(!['partners','audit','trash','revision'].includes(k))assert.deepStrictEqual(next[k],old[k],k);
const sa=C.summary(old),sb=C.summary(next);for(const k of Object.keys(sa))if(k!=='customers')assert.equal(sb[k],sa[k],k);
assert.equal(hash(C.records(next)),'fef2d33ef5bfd3336ef022f1e76a6d9fa79874ddb6b5fa15622a9efc91e8c3bd');assert.equal(b.raw.syncReview.cursor,2);assert.equal(b.raw.syncReview.outbox.length,0);assert(!b.raw.syncReview.conflict);
const result={status:'PASS',scope:'119-customer independent historical backup versus accepted PC export; not a fresh Production export',ownerConfirmation:'2026-11-23: deliberate TEST deletion confirmed by workshop owner',beforeFileSha256:hash(a.bytes),afterFileSha256:hash(b.bytes),deletedPartnerId:id,trashId:t.id,auditId:audit.id,deletedAt:t.deletedAt,auditAt:audit.at,remainingPartners:118,orders:619,payments:46,unchangedExistingAudit:old.audit.length,unchangedExistingTrash:old.trash.length,unchangedOtherRootFields:true,revisionChange:[old.revision,next.revision],noOrdersLinkedToDeletedTest:true,ordersHash:hash(next.orders),paymentsHash:hash(next.payments),remainingPartnersHash:hash(next.partners),recordsHash:hash(C.records(next)),summary:sb,queue:0,cursor:2,conflict:false,productionDataChanged:false};
assert.equal(hash(fs.readFileSync(beforePath)),result.beforeFileSha256);assert.equal(hash(fs.readFileSync(afterPath)),result.afterFileSha256);console.log(JSON.stringify(result,null,2));
