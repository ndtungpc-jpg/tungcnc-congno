export function onRequest({request}){
 if(new URL(request.url).hostname!=='feature-v2-4-device-pairing.tungcnc-congno.pages.dev')return new Response('Not found',{status:404});
 if(!request.headers.get('Cf-Access-Jwt-Assertion'))return new Response('Cần xác minh Gmail.',{status:401,headers:{'Cache-Control':'no-store'}});
 return Response.redirect(new URL('/',request.url).href,303);
}
