(function(root){'use strict';
const C=root.TGSyncCore,R=root.TGSyncReview,clone=x=>structuredClone(x);
const identity=root.TG_CLOUD_IDENTITY||{environment:'v24-preview',worker:'tungcnc-sync-v24-preview',ledger:'staging-v24-isolated'};
function environment(snapshot){if(!snapshot?.environment||Object.entries(identity).some(([k,v])=>snapshot.environment[k]!==v))throw Error('Chưa xác minh đúng sổ Cloud của ứng dụng. Dừng, dữ liệu giữ nguyên.');return true;}
function empty(snapshot){environment(snapshot);return snapshot.sequence===0&&snapshot.environment.operationCount===0&&snapshot.environment.lastOperation===null&&Object.keys(snapshot.versions).length===0&&C.isEmpty(snapshot.data);}
function fresh(preview,current){if(current.meta.serial!==preview.serial||!C.same(current.main,preview.main))throw Error('Dữ liệu đã đổi sau đối chiếu. Mở lại đối chiếu và tạo bản sao lưu mới.');}
function capacity(snapshot,target){environment(snapshot);C.validate(target);const changes=C.diff(snapshot.data,target,snapshot.versions);R.batches(snapshot.data,changes,c=>({schemaVersion:1,operationId:'00000000-0000-0000-0000-000000000000',deviceId:'00000000-0000-0000-0000-000000000000',occurredAt:'2026-11-24T00:00:00.000Z',changes:c}));return true;}
const hash=async value=>Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(C.canonical(value)))),b=>b.toString(16).padStart(2,'0')).join('');
async function backup(preview,meta,inbox){environment(preview.snapshot);C.validate(preview.main);C.validate(preview.snapshot.data);const data={app:'TungGiang-CongNo',version:2,exportedAt:new Date().toISOString(),data:clone(preview.main),quoteInbox:clone(inbox),syncReview:{snapshot:clone(preview.snapshot),cursor:meta.cursor,versions:clone(meta.versions),outbox:clone(meta.outbox),conflict:clone(meta.conflict)}};return {...data,reconciliationSHA256:await hash(data)};}
async function verifyBackup(file,expected){const {reconciliationSHA256,...payload}=file;if(typeof reconciliationSHA256!=='string'||await hash(payload)!==reconciliationSHA256||!C.same(file,expected))throw Error('File sao lưu không khớp lần đối chiếu này. Chưa gửi dữ liệu.');C.validate(file.data);C.validate(file.syncReview.snapshot.data);return true;}
root.TGReviewSafety={environment,empty,fresh,capacity,backup,verifyBackup,recordHash:s=>hash(C.records(s))};
if(typeof module!=='undefined')module.exports=root.TGReviewSafety;
})(globalThis);
