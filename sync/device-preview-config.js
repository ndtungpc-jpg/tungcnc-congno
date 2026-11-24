// v2.4 isolated acceptance only. Never route Production to the preview D1.
if(location.hostname==='feature-v2-4-device-pairing.tungcnc-congno.pages.dev')window.TG_DEVICE_PAIRING_API='https://tungcnc-sync-v24-preview.ndtung-pc.workers.dev';

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
