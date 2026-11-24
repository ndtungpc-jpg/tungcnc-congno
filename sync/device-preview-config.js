// Exact host routing. Production always keeps its existing Production ledger.
const tgCloudTargets={
 'feature-v2-4-device-pairing.tungcnc-congno.pages.dev':{api:'https://tungcnc-sync-v24-preview.ndtung-pc.workers.dev',environment:'v24-preview',worker:'tungcnc-sync-v24-preview',ledger:'staging-v24-isolated'},
 'tungcnc-congno.pages.dev':{api:'https://tungcnc-sync-v23-prod.ndtung-pc.workers.dev',environment:'v24-production',worker:'tungcnc-sync-v23-prod',ledger:'production-existing'}
};
if(tgCloudTargets[location.hostname]){const {api,...identity}=tgCloudTargets[location.hostname];window.TG_DEVICE_PAIRING_API=api;window.TG_CLOUD_IDENTITY=Object.freeze(identity);}

if(window.TG_DEVICE_PAIRING_API){
 window.TG_ACCESS_MODE=true;
 window.tgAccessFetch=async(url,options={})=>{
  const u=new URL(url,location.origin);
  if(u.origin!==window.TG_DEVICE_PAIRING_API)throw Error('Địa chỉ đồng bộ không hợp lệ.');
  const response=await fetch(u.pathname+u.search,{...options,credentials:'same-origin',redirect:'manual'});
  if(response.type==='opaqueredirect'||response.status===401||response.status===403){window.showAccessGate?.(window.TG_ACCESS_SESSION_SEEN?'Phiên xác minh không còn hợp lệ. Xác minh Gmail lại để tiếp tục đồng bộ.':'Vui lòng xác minh Gmail để bắt đầu sử dụng trên thiết bị này.');throw Object.assign(Error('Cần xác minh Gmail lại trước khi đồng bộ. Dữ liệu trên máy vẫn giữ nguyên.'),{status:401});}
  return response;
 };
}
