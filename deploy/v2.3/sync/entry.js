import runtime from './worker.js';
const origins=new Set(["https://tungcnc-congno.pages.dev"]);
export default {async fetch(request,env,ctx){
 const origin=request.headers.get('Origin');
 if(!origins.has(origin))return new Response(JSON.stringify({error:'Origin not allowed'}),{status:403,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(!['GET','HEAD','OPTIONS'].includes(request.method)&&env.RELEASE_WRITES!=='enabled')return new Response(JSON.stringify({error:'Production đang khóa ghi; giữ nguyên hàng đợi và thử lại sau xác nhận chủ xưởng'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin','Retry-After':'60'}});
 return runtime.fetch(request,env,ctx);
}};
